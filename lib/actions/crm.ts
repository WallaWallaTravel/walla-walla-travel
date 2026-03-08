'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  CreateContactSchema,
  UpdateContactSchema,
  CreateDealSchema,
  UpdateDealSchema,
  DealActionSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  SnoozeTaskSchema,
  CreateActivitySchema,
  type CreateContactInput,
  type UpdateContactInput,
  type CreateDealInput,
  type UpdateDealInput,
  type DealActionInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type SnoozeTaskInput,
  type CreateActivityInput,
} from '@/lib/schemas/crm'

// ============================================================================
// SHARED TYPES
// ============================================================================

export type CrmActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string | Record<string, string[]>
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }
  return session
}

// ============================================================================
// CONTACT MUTATIONS
// ============================================================================

export async function createContact(
  input: CreateContactInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = CreateContactSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Check for duplicate email
    const existing = await prisma.crm_contacts.findUnique({
      where: { email: v.email.toLowerCase() },
      select: { id: true },
    })

    if (existing) {
      return { success: false, error: 'A contact with this email already exists' }
    }

    const contact = await prisma.crm_contacts.create({
      data: {
        email: v.email.toLowerCase(),
        name: v.name,
        phone: v.phone,
        company: v.company,
        contact_type: v.contact_type,
        lifecycle_stage: v.lifecycle_stage,
        lead_temperature: v.lead_temperature,
        source: v.source,
        source_detail: v.source_detail,
        preferred_wineries: v.preferred_wineries ?? [],
        dietary_restrictions: v.dietary_restrictions,
        accessibility_needs: v.accessibility_needs,
        notes: v.notes,
        email_marketing_consent: v.email_marketing_consent,
        sms_marketing_consent: v.sms_marketing_consent,
        assigned_to: v.assigned_to,
        brand_id: v.brand_id,
      },
    })

    // Log activity
    await prisma.crm_activities.create({
      data: {
        contact_id: contact.id,
        activity_type: 'system',
        subject: 'Contact created',
        performed_by: parseInt(session.user.id!),
        source_type: 'manual',
      },
    })

    return { success: true, data: { id: contact.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create contact'
    return { success: false, error: message }
  }
}

export async function updateContact(
  contactId: number,
  input: UpdateContactInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpdateContactSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Build update data — only include defined fields
    const updateData: Record<string, unknown> = { updated_at: new Date() }

    if (v.email !== undefined) updateData.email = v.email.toLowerCase()
    if (v.name !== undefined) updateData.name = v.name
    if (v.phone !== undefined) updateData.phone = v.phone
    if (v.company !== undefined) updateData.company = v.company
    if (v.contact_type !== undefined) updateData.contact_type = v.contact_type
    if (v.lifecycle_stage !== undefined) updateData.lifecycle_stage = v.lifecycle_stage
    if (v.lead_score !== undefined) updateData.lead_score = v.lead_score
    if (v.lead_temperature !== undefined) updateData.lead_temperature = v.lead_temperature
    if (v.source !== undefined) updateData.source = v.source
    if (v.source_detail !== undefined) updateData.source_detail = v.source_detail
    if (v.preferred_wineries !== undefined) updateData.preferred_wineries = v.preferred_wineries
    if (v.dietary_restrictions !== undefined) updateData.dietary_restrictions = v.dietary_restrictions
    if (v.accessibility_needs !== undefined) updateData.accessibility_needs = v.accessibility_needs
    if (v.notes !== undefined) updateData.notes = v.notes
    if (v.email_marketing_consent !== undefined) updateData.email_marketing_consent = v.email_marketing_consent
    if (v.sms_marketing_consent !== undefined) updateData.sms_marketing_consent = v.sms_marketing_consent
    if (v.assigned_to !== undefined) updateData.assigned_to = v.assigned_to
    if (v.next_follow_up_at !== undefined) {
      updateData.next_follow_up_at = v.next_follow_up_at ? new Date(v.next_follow_up_at) : null
    }

    const contact = await prisma.crm_contacts.update({
      where: { id: contactId },
      data: updateData,
      select: { id: true },
    })

    return { success: true, data: { id: contact.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update contact'
    return { success: false, error: message }
  }
}

export async function deleteContact(
  contactId: number
): Promise<CrmActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    // Check for active deals
    const activeDeals = await prisma.crm_deals.count({
      where: {
        contact_id: contactId,
        won_at: null,
        lost_at: null,
      },
    })

    if (activeDeals > 0) {
      return {
        success: false,
        error: 'Cannot delete contact with active deals. Close or reassign deals first.',
      }
    }

    // Soft delete — mark as lost
    await prisma.crm_contacts.update({
      where: { id: contactId },
      data: {
        lifecycle_stage: 'lost',
        updated_at: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete contact'
    return { success: false, error: message }
  }
}

// ============================================================================
// DEAL MUTATIONS
// ============================================================================

export async function createDeal(
  input: CreateDealInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = CreateDealSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // Verify contact exists
    const contact = await prisma.crm_contacts.findUnique({
      where: { id: v.contact_id },
      select: { id: true },
    })
    if (!contact) {
      return { success: false, error: 'Contact not found' }
    }

    // Verify stage exists
    const stage = await prisma.crm_pipeline_stages.findUnique({
      where: { id: v.stage_id },
      select: { id: true },
    })
    if (!stage) {
      return { success: false, error: 'Pipeline stage not found' }
    }

    const deal = await prisma.crm_deals.create({
      data: {
        contact_id: v.contact_id,
        stage_id: v.stage_id,
        title: v.title,
        deal_type_id: v.deal_type_id,
        brand: v.brand,
        brand_id: v.brand_id,
        description: v.description,
        party_size: v.party_size,
        expected_tour_date: v.expected_tour_date ? new Date(v.expected_tour_date) : undefined,
        expected_close_date: v.expected_close_date ? new Date(v.expected_close_date) : undefined,
        estimated_value: v.estimated_value,
        assigned_to: v.assigned_to,
        consultation_id: v.consultation_id,
        corporate_request_id: v.corporate_request_id,
        trip_proposal_id: v.trip_proposal_id,
      },
    })

    // Update contact lifecycle stage to 'opportunity' if currently lead/qualified
    await prisma.crm_contacts.updateMany({
      where: {
        id: v.contact_id,
        lifecycle_stage: { in: ['lead', 'qualified'] },
      },
      data: {
        lifecycle_stage: 'opportunity',
        updated_at: new Date(),
      },
    })

    // Log activity
    await prisma.crm_activities.create({
      data: {
        contact_id: v.contact_id,
        deal_id: deal.id,
        activity_type: 'system',
        subject: `Deal created: ${v.title}`,
        performed_by: parseInt(session.user.id!),
        source_type: 'manual',
      },
    })

    return { success: true, data: { id: deal.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create deal'
    return { success: false, error: message }
  }
}

export async function updateDeal(
  dealId: number,
  input: UpdateDealInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpdateDealSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    const updateData: Record<string, unknown> = { updated_at: new Date() }

    if (v.stage_id !== undefined) {
      updateData.stage_id = v.stage_id
      updateData.stage_changed_at = new Date()
    }
    if (v.deal_type_id !== undefined) updateData.deal_type_id = v.deal_type_id
    if (v.brand !== undefined) updateData.brand = v.brand
    if (v.title !== undefined) updateData.title = v.title
    if (v.description !== undefined) updateData.description = v.description
    if (v.party_size !== undefined) updateData.party_size = v.party_size
    if (v.expected_tour_date !== undefined) {
      updateData.expected_tour_date = v.expected_tour_date ? new Date(v.expected_tour_date) : null
    }
    if (v.expected_close_date !== undefined) {
      updateData.expected_close_date = v.expected_close_date ? new Date(v.expected_close_date) : null
    }
    if (v.estimated_value !== undefined) updateData.estimated_value = v.estimated_value
    if (v.actual_value !== undefined) updateData.actual_value = v.actual_value
    if (v.assigned_to !== undefined) updateData.assigned_to = v.assigned_to
    if (v.lost_reason !== undefined) updateData.lost_reason = v.lost_reason

    const deal = await prisma.crm_deals.update({
      where: { id: dealId },
      data: updateData,
      select: { id: true },
    })

    return { success: true, data: { id: deal.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update deal'
    return { success: false, error: message }
  }
}

export async function winOrLoseDeal(
  dealId: number,
  input: DealActionInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = DealActionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { action, actual_value, lost_reason } = parsed.data

  try {
    // Get current deal to find its pipeline template
    const currentDeal = await prisma.crm_deals.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        contact_id: true,
        crm_pipeline_stages: {
          select: { template_id: true },
        },
      },
    })

    if (!currentDeal) {
      return { success: false, error: 'Deal not found' }
    }

    const templateId = currentDeal.crm_pipeline_stages.template_id

    if (action === 'win') {
      // Find won stage
      const wonStage = await prisma.crm_pipeline_stages.findFirst({
        where: {
          template_id: templateId,
          is_won: true,
        },
        select: { id: true },
      })

      if (!wonStage) {
        return { success: false, error: 'No won stage found for this pipeline' }
      }

      await prisma.crm_deals.update({
        where: { id: dealId },
        data: {
          stage_id: wonStage.id,
          won_at: new Date(),
          actual_value: actual_value ?? undefined,
          stage_changed_at: new Date(),
          updated_at: new Date(),
        },
      })

      // Update contact lifecycle to customer
      await prisma.crm_contacts.update({
        where: { id: currentDeal.contact_id },
        data: {
          lifecycle_stage: 'customer',
          updated_at: new Date(),
        },
      })

      // Log activity
      await prisma.crm_activities.create({
        data: {
          contact_id: currentDeal.contact_id,
          deal_id: dealId,
          activity_type: 'system',
          subject: 'Deal won',
          performed_by: parseInt(session.user.id!),
          source_type: 'manual',
        },
      })
    } else {
      // action === 'lose'
      const lostStage = await prisma.crm_pipeline_stages.findFirst({
        where: {
          template_id: templateId,
          is_lost: true,
        },
        select: { id: true },
      })

      if (!lostStage) {
        return { success: false, error: 'No lost stage found for this pipeline' }
      }

      await prisma.crm_deals.update({
        where: { id: dealId },
        data: {
          stage_id: lostStage.id,
          lost_at: new Date(),
          lost_reason: lost_reason,
          stage_changed_at: new Date(),
          updated_at: new Date(),
        },
      })

      // Log activity
      await prisma.crm_activities.create({
        data: {
          contact_id: currentDeal.contact_id,
          deal_id: dealId,
          activity_type: 'system',
          subject: 'Deal lost',
          body: lost_reason,
          performed_by: parseInt(session.user.id!),
          source_type: 'manual',
        },
      })
    }

    return { success: true, data: { id: dealId } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update deal'
    return { success: false, error: message }
  }
}

// ============================================================================
// TASK MUTATIONS
// ============================================================================

export async function createTask(
  input: CreateTaskInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = CreateTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    // If deal_id is provided but not contact_id, get contact_id from deal
    let contactId = v.contact_id
    if (v.deal_id && !contactId) {
      const deal = await prisma.crm_deals.findUnique({
        where: { id: v.deal_id },
        select: { contact_id: true },
      })
      if (deal) {
        contactId = deal.contact_id
      }
    }

    const task = await prisma.crm_tasks.create({
      data: {
        title: v.title,
        due_date: new Date(v.due_date),
        assigned_to: v.assigned_to,
        created_by: parseInt(session.user.id!),
        contact_id: contactId,
        deal_id: v.deal_id,
        description: v.description,
        task_type: v.task_type,
        priority: v.priority,
        due_time: v.due_time ? new Date(`1970-01-01T${v.due_time}`) : undefined,
        reminder_at: v.reminder_at ? new Date(v.reminder_at) : undefined,
      },
    })

    // Update contact's next_follow_up_at
    if (contactId) {
      await updateContactFollowUpDate(contactId)
    }

    return { success: true, data: { id: task.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create task'
    return { success: false, error: message }
  }
}

export async function updateTask(
  taskId: number,
  input: UpdateTaskInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpdateTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    const updateData: Record<string, unknown> = { updated_at: new Date() }

    if (v.status !== undefined) {
      updateData.status = v.status
      if (v.status === 'completed') {
        updateData.completed_at = new Date()
        updateData.completed_by = parseInt(session.user.id!)
        if (v.completion_notes) {
          updateData.completion_notes = v.completion_notes
        }
      }
    }

    if (v.title !== undefined) updateData.title = v.title
    if (v.description !== undefined) updateData.description = v.description
    if (v.task_type !== undefined) updateData.task_type = v.task_type
    if (v.priority !== undefined) updateData.priority = v.priority
    if (v.due_date !== undefined) updateData.due_date = new Date(v.due_date)
    if (v.due_time !== undefined) {
      updateData.due_time = v.due_time ? new Date(`1970-01-01T${v.due_time}`) : null
    }
    if (v.reminder_at !== undefined) {
      updateData.reminder_at = v.reminder_at ? new Date(v.reminder_at) : null
    }
    if (v.assigned_to !== undefined) updateData.assigned_to = v.assigned_to

    const task = await prisma.crm_tasks.update({
      where: { id: taskId },
      data: updateData,
      select: { id: true, contact_id: true },
    })

    // Update contact's next_follow_up_at
    if (task.contact_id) {
      await updateContactFollowUpDate(task.contact_id)
    }

    return { success: true, data: { id: task.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update task'
    return { success: false, error: message }
  }
}

export async function completeTask(
  taskId: number,
  completionNotes?: string
): Promise<CrmActionResult<{ id: number }>> {
  return updateTask(taskId, {
    status: 'completed',
    completion_notes: completionNotes,
  })
}

export async function snoozeTask(
  taskId: number,
  input: SnoozeTaskInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = SnoozeTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { new_due_date, new_due_time } = parsed.data

  try {
    const updateData: Record<string, unknown> = {
      due_date: new Date(new_due_date),
      updated_at: new Date(),
    }

    if (new_due_time) {
      updateData.due_time = new Date(`1970-01-01T${new_due_time}`)
    }

    const task = await prisma.crm_tasks.update({
      where: { id: taskId },
      data: updateData,
      select: { id: true, contact_id: true },
    })

    // Update contact's next_follow_up_at
    if (task.contact_id) {
      await updateContactFollowUpDate(task.contact_id)
    }

    return { success: true, data: { id: task.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to snooze task'
    return { success: false, error: message }
  }
}

export async function deleteTask(
  taskId: number
): Promise<CrmActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    // Get task to find contact_id for follow-up update
    const task = await prisma.crm_tasks.findUnique({
      where: { id: taskId },
      select: { contact_id: true },
    })

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    await prisma.crm_tasks.delete({
      where: { id: taskId },
    })

    // Update contact's next_follow_up_at
    if (task.contact_id) {
      await updateContactFollowUpDate(task.contact_id)
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete task'
    return { success: false, error: message }
  }
}

// ============================================================================
// ACTIVITY MUTATIONS
// ============================================================================

export async function createActivity(
  input: CreateActivityInput
): Promise<CrmActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = CreateActivitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const v = parsed.data

  try {
    const activity = await prisma.crm_activities.create({
      data: {
        contact_id: v.contact_id,
        deal_id: v.deal_id,
        activity_type: v.activity_type,
        subject: v.subject,
        body: v.body,
        call_duration_minutes: v.call_duration_minutes,
        call_outcome: v.call_outcome,
        email_direction: v.email_direction,
        email_status: v.email_status,
        performed_by: parseInt(session.user.id!),
        source_type: v.source_type ?? 'manual',
        source_id: v.source_id,
      },
    })

    // Update contact's last_contacted_at for communication activities
    if (v.contact_id && ['call', 'email', 'meeting', 'sms'].includes(v.activity_type)) {
      await prisma.crm_contacts.update({
        where: { id: v.contact_id },
        data: { last_contacted_at: new Date() },
      })
    }

    return { success: true, data: { id: activity.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create activity'
    return { success: false, error: message }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function updateContactFollowUpDate(contactId: number): Promise<void> {
  // Find the earliest pending/in_progress task for this contact
  const earliestTask = await prisma.crm_tasks.findFirst({
    where: {
      contact_id: contactId,
      status: { in: ['pending', 'in_progress'] },
    },
    orderBy: { due_date: 'asc' },
    select: { due_date: true },
  })

  await prisma.crm_contacts.update({
    where: { id: contactId },
    data: {
      next_follow_up_at: earliestTask?.due_date ?? null,
    },
  })
}
