'use server'

import { prisma } from '@/lib/prisma'
import {
  ContactFormSchema,
  type ContactFormData,
} from '@/lib/schemas/public'
import { logger } from '@/lib/logger'
import { crmSyncService } from '@/lib/services/crm-sync.service'
import { crmTaskAutomationService } from '@/lib/services/crm-task-automation.service'
import { sendEmail } from '@/lib/email'
import { COMPANY_INFO } from '@/lib/config/company'

// ============================================================================
// CONTACT FORM SUBMISSION (Server Action)
// ============================================================================

type ContactResult =
  | { success: true; message: string }
  | { success: false; error: string }

/**
 * Submit a contact form inquiry
 * Creates a CRM contact, logs activity, stores inquiry, sends notifications
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactResult> {
  // Validate input
  const parsed = ContactFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const formData = parsed.data
  const isFullPlanning = formData.service === 'full-planning'

  try {
    logger.info('[Contact] New inquiry received via Server Action', {
      email: formData.email,
      name: formData.name,
      isFullPlanning,
    })

    // 1. Create or update CRM contact using Prisma raw query
    // (crm_contacts may not be in the Prisma schema as a full model)
    const existingContact = await prisma.$queryRawUnsafe<
      Array<{ id: number; email: string; name: string }>
    >(
      `SELECT id, email, name FROM crm_contacts WHERE LOWER(email) = LOWER($1)`,
      formData.email
    )

    let contactId: number

    if (existingContact.length === 0) {
      // Create new CRM contact as a lead
      const newContact = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
        `INSERT INTO crm_contacts (
          email, name, phone, contact_type, lifecycle_stage,
          lead_temperature, source, source_detail,
          notes, brand_id, created_at, updated_at
        ) VALUES ($1, $2, $3, 'individual', 'lead', 'warm', 'website_contact', $4, $5, 1, NOW(), NOW())
        RETURNING id`,
        formData.email,
        formData.name,
        formData.phone || null,
        isFullPlanning ? 'full_planning_inquiry' : 'contact_form',
        formData.message
      )

      contactId = newContact[0].id
      logger.info('[Contact] Created new CRM contact', { contactId })
    } else {
      contactId = existingContact[0].id

      // Update existing contact
      await prisma.$queryRawUnsafe(
        `UPDATE crm_contacts
         SET
           name = COALESCE(NULLIF($1, ''), name),
           phone = COALESCE($2, phone),
           notes = COALESCE(notes || E'\\n\\n---\\n', '') || $3,
           last_contacted_at = NOW(),
           updated_at = NOW()
         WHERE id = $4`,
        formData.name,
        formData.phone || null,
        `[Contact Form ${new Date().toISOString()}]\n${formData.message}`,
        contactId
      )

      logger.info('[Contact] Updated existing CRM contact', { contactId })
    }

    // 2. Log CRM activity
    await crmSyncService.logActivity({
      contactId,
      activityType: 'note',
      subject: isFullPlanning ? 'Full Planning Inquiry' : 'Contact Form Submission',
      body: formatInquiryDetails(formData),
    })

    // 3. Create a follow-up task
    await crmTaskAutomationService.onNewLead({
      contactId,
      customerName: formData.name,
      source: 'website_contact',
    })

    // 4. Store in contact_inquiries using Prisma
    await prisma.contact_inquiries.create({
      data: {
        crm_contact_id: contactId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        dates: formData.dates || null,
        group_size: formData.groupSize || null,
        message: formData.message,
        inquiry_type: isFullPlanning ? 'full_planning' : 'general',
      },
    })

    // 5. Send notifications (async, don't block response)
    sendInternalNotification(formData, contactId, isFullPlanning).catch(err => {
      logger.error('[Contact] Failed to send internal notification', { error: err })
    })

    sendConfirmationEmail(formData).catch(err => {
      logger.error('[Contact] Failed to send confirmation email', { error: err })
    })

    return {
      success: true,
      message: 'Thank you for your inquiry! We will be in touch within 24 hours.',
    }
  } catch (error) {
    logger.error('[Contact] Server Action error', { error })
    return {
      success: false,
      error: 'Something went wrong. Please try again or call us directly.',
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatInquiryDetails(data: ContactFormData): string {
  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
  ]

  if (data.phone) lines.push(`Phone: ${data.phone}`)
  if (data.dates) lines.push(`Dates: ${data.dates}`)
  if (data.groupSize) lines.push(`Group Size: ${data.groupSize}`)
  if (data.service) lines.push(`Service: ${data.service}`)

  lines.push('', 'Message:', data.message)

  return lines.join('\n')
}

async function sendInternalNotification(
  data: ContactFormData,
  contactId: number,
  isFullPlanning: boolean
): Promise<void> {
  const subject = isFullPlanning
    ? `New Full Planning Inquiry from ${data.name}`
    : `New Contact Form Submission from ${data.name}`

  const html = `
    <h2>${isFullPlanning ? 'Full Planning Inquiry' : 'Contact Form Submission'}</h2>
    <p><strong>From:</strong> ${data.name} (${data.email})</p>
    ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
    ${data.dates ? `<p><strong>Dates:</strong> ${data.dates}</p>` : ''}
    ${data.groupSize ? `<p><strong>Group Size:</strong> ${data.groupSize}</p>` : ''}
    <p><strong>Message:</strong></p>
    <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #8B1538;">
      ${data.message.replace(/\n/g, '<br>')}
    </blockquote>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/crm/contacts/${contactId}">View in CRM</a></p>
  `

  await sendEmail({
    to: COMPANY_INFO.email.general,
    subject,
    html,
    text: formatInquiryDetails(data),
  })
}

async function sendConfirmationEmail(data: ContactFormData): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #8B1538; background: linear-gradient(135deg, #8B1538 0%, #722F37 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">Thank You!</h1>
        <p style="margin: 10px 0 0 0; color: #d9d9d9;">We've Received Your Inquiry</p>
      </div>

      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
        <p>Hi ${data.name},</p>

        <p>Thank you for reaching out to Walla Walla Travel! We've received your inquiry and a member of our team will be in touch within 24 hours.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B1538;">
          <h3 style="margin-top: 0; color: #1f2937;">Your Inquiry Summary</h3>
          ${data.dates ? `<p><strong>Dates:</strong> ${data.dates}</p>` : ''}
          ${data.groupSize ? `<p><strong>Group Size:</strong> ${data.groupSize}</p>` : ''}
          <p><strong>Message:</strong> ${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}</p>
        </div>

        <p>In the meantime, feel free to explore our resources:</p>
        <ul>
          <li><a href="https://wallawalla.travel/wineries" style="color: #8B1538;">Browse our winery directory</a></li>
          <li><a href="https://wallawalla.travel/experiences" style="color: #8B1538;">Explore wine country experiences</a></li>
        </ul>

        <p>If you have any urgent questions, don't hesitate to call us at <a href="tel:+15092008000" style="color: #8B1538;">(509) 200-8000</a>.</p>

        <p>Cheers!<br>The Walla Walla Travel Team</p>
      </div>
    </div>
  `

  await sendEmail({
    to: data.email,
    subject: "We've Received Your Inquiry - Walla Walla Travel",
    html,
    text: `Hi ${data.name},\n\nThank you for reaching out to Walla Walla Travel! We've received your inquiry and will be in touch within 24 hours.\n\nCheers!\nThe Walla Walla Travel Team`,
  })
}
