/**
 * CRM Task Automation Service
 *
 * @module lib/services/crm-task-automation.service
 * @description Automatically creates CRM tasks based on trigger events.
 * Uses task templates defined in crm_task_templates table.
 *
 * @features
 * - Auto-create follow-up tasks on proposal sent
 * - Auto-create post-tour check-in tasks
 * - Auto-create corporate inquiry follow-up tasks
 * - Auto-create pre-tour info tasks (before tour date)
 * - Configurable task templates via database
 */

import { BaseService } from './base.service';
import type { CrmTask } from '@/types/crm';

// ============================================================================
// Types
// ============================================================================

export type TriggerEvent =
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'tour_completed'
  | 'corporate_request'
  | 'booking_created'
  | 'new_lead'
  | 'annual_reengagement';

interface TaskTemplate {
  id: number;
  trigger_event: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  days_from_trigger: number;
  is_active: boolean;
}

export interface CreateAutoTaskParams {
  triggerEvent: TriggerEvent;
  contactId: number;
  dealId?: number;
  referenceDate?: Date; // For date-based triggers (e.g., tour_date for booking_created)
  context?: {
    customerName?: string;
    proposalNumber?: string;
    bookingNumber?: string;
    companyName?: string;
  };
}

// ============================================================================
// Service
// ============================================================================

class CrmTaskAutomationService extends BaseService {
  protected get serviceName(): string {
    return 'CrmTaskAutomationService';
  }

  /**
   * Create an auto-task based on a trigger event
   * Uses task templates from the database
   */
  async createAutoTask(params: CreateAutoTaskParams): Promise<CrmTask | null> {
    const { triggerEvent, contactId, dealId, referenceDate, context } = params;

    this.log('Creating auto-task', { triggerEvent, contactId, dealId });

    // Get the task template for this trigger
    const template = await this.queryOne<TaskTemplate>(
      `SELECT * FROM crm_task_templates
       WHERE trigger_event = $1 AND is_active = true`,
      [triggerEvent]
    );

    if (!template) {
      this.log('No active template found for trigger', { triggerEvent });
      return null;
    }

    // Calculate due date
    const dueDate = this.calculateDueDate(
      template.days_from_trigger,
      referenceDate
    );

    // Interpolate context into title and description
    const title = this.interpolateContext(template.title, context);
    const description = template.description
      ? this.interpolateContext(template.description, context)
      : null;

    // Check if a similar task already exists (prevent duplicates)
    const existingTask = await this.queryOne<{ id: number }>(
      `SELECT id FROM crm_tasks
       WHERE contact_id = $1
         AND title = $2
         AND due_date = $3
         AND status IN ('pending', 'in_progress')`,
      [contactId, title, dueDate]
    );

    if (existingTask) {
      this.log('Similar task already exists, skipping', { taskId: existingTask.id });
      return null;
    }

    // Create the task
    const task = await this.queryOne<CrmTask>(
      `INSERT INTO crm_tasks (
        contact_id, deal_id, title, description, task_type,
        priority, due_date, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
      RETURNING *`,
      [
        contactId,
        dealId || null,
        title,
        description,
        template.task_type,
        template.priority,
        dueDate,
      ]
    );

    this.log('Auto-task created', {
      taskId: task?.id,
      title: task?.title,
      dueDate,
    });

    return task;
  }

  /**
   * Create auto-task for proposal sent event
   */
  async onProposalSent(params: {
    contactId: number;
    dealId?: number;
    proposalNumber: string;
    customerName: string;
  }): Promise<CrmTask | null> {
    return this.createAutoTask({
      triggerEvent: 'proposal_sent',
      contactId: params.contactId,
      dealId: params.dealId,
      context: {
        customerName: params.customerName,
        proposalNumber: params.proposalNumber,
      },
    });
  }

  /**
   * Create auto-task for proposal viewed event
   */
  async onProposalViewed(params: {
    contactId: number;
    dealId?: number;
    proposalNumber?: string;
    customerName?: string;
  }): Promise<CrmTask | null> {
    return this.createAutoTask({
      triggerEvent: 'proposal_viewed',
      contactId: params.contactId,
      dealId: params.dealId,
      context: {
        customerName: params.customerName,
        proposalNumber: params.proposalNumber,
      },
    });
  }

  /**
   * Create auto-task for tour completed event
   */
  async onTourCompleted(params: {
    contactId: number;
    dealId?: number;
    bookingNumber: string;
    customerName: string;
  }): Promise<CrmTask | null> {
    return this.createAutoTask({
      triggerEvent: 'tour_completed',
      contactId: params.contactId,
      dealId: params.dealId,
      context: {
        customerName: params.customerName,
        bookingNumber: params.bookingNumber,
      },
    });
  }

  /**
   * Create auto-task for corporate request event
   */
  async onCorporateRequest(params: {
    contactId: number;
    dealId?: number;
    companyName: string;
    contactName: string;
  }): Promise<CrmTask | null> {
    return this.createAutoTask({
      triggerEvent: 'corporate_request',
      contactId: params.contactId,
      dealId: params.dealId,
      context: {
        companyName: params.companyName,
        customerName: params.contactName,
      },
    });
  }

  /**
   * Create auto-task for booking created event
   * Note: days_from_trigger is negative for pre-tour tasks
   */
  async onBookingCreated(params: {
    contactId: number;
    dealId?: number;
    bookingNumber: string;
    customerName: string;
    tourDate: Date;
  }): Promise<CrmTask | null> {
    return this.createAutoTask({
      triggerEvent: 'booking_created',
      contactId: params.contactId,
      dealId: params.dealId,
      referenceDate: params.tourDate, // Use tour date as reference
      context: {
        customerName: params.customerName,
        bookingNumber: params.bookingNumber,
      },
    });
  }

  /**
   * Create auto-task for new lead event
   */
  async onNewLead(params: {
    contactId: number;
    customerName: string;
    source?: string;
  }): Promise<CrmTask | null> {
    return this.createAutoTask({
      triggerEvent: 'new_lead',
      contactId: params.contactId,
      context: {
        customerName: params.customerName,
      },
    });
  }

  /**
   * Create auto-task for annual re-engagement
   */
  async onAnnualReengagement(params: {
    contactId: number;
    customerName: string;
  }): Promise<CrmTask | null> {
    return this.createAutoTask({
      triggerEvent: 'annual_reengagement',
      contactId: params.contactId,
      context: {
        customerName: params.customerName,
      },
    });
  }

  /**
   * Process annual re-engagement for customers whose last booking was ~1 year ago
   * Should be called by a cron job daily
   */
  async processAnnualReengagement(): Promise<{
    processed: number;
    tasksCreated: number;
    errors: number;
  }> {
    this.log('Processing annual re-engagement');

    // Find contacts who:
    // 1. Are customers or repeat customers
    // 2. Had their last booking approximately 1 year ago (355-375 days)
    // 3. Haven't been contacted for re-engagement in the last 330 days
    const contacts = await this.queryMany<{
      id: number;
      name: string;
      email: string;
      last_booking_date: string;
    }>(
      `SELECT id, name, email, last_booking_date
       FROM crm_contacts
       WHERE lifecycle_stage IN ('customer', 'repeat_customer')
         AND last_booking_date IS NOT NULL
         AND last_booking_date >= CURRENT_DATE - INTERVAL '375 days'
         AND last_booking_date <= CURRENT_DATE - INTERVAL '355 days'
         AND (last_reengagement_at IS NULL OR last_reengagement_at < CURRENT_DATE - INTERVAL '330 days')
       ORDER BY last_booking_date ASC
       LIMIT 50` // Process in batches to avoid overwhelming
    );

    let processed = 0;
    let tasksCreated = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        const task = await this.onAnnualReengagement({
          contactId: contact.id,
          customerName: contact.name,
        });

        if (task) {
          tasksCreated++;

          // Update last_reengagement_at to prevent duplicate tasks
          await this.query(
            `UPDATE crm_contacts SET last_reengagement_at = NOW() WHERE id = $1`,
            [contact.id]
          );
        }

        processed++;
      } catch (error) {
        this.log('Error processing annual re-engagement', { contactId: contact.id, error });
        errors++;
      }
    }

    this.log('Annual re-engagement processing complete', {
      processed,
      tasksCreated,
      errors,
    });

    return { processed, tasksCreated, errors };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Calculate due date based on days_from_trigger
   * Positive days = after today/reference date
   * Negative days = before reference date (for date-based events)
   */
  private calculateDueDate(
    daysFromTrigger: number,
    referenceDate?: Date
  ): string {
    const baseDate = referenceDate || new Date();
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + daysFromTrigger);

    // Ensure due date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return today.toISOString().split('T')[0];
    }

    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Interpolate context variables into a template string
   * Supports {{customerName}}, {{proposalNumber}}, {{bookingNumber}}, {{companyName}}
   */
  private interpolateContext(
    template: string,
    context?: CreateAutoTaskParams['context']
  ): string {
    if (!context) return template;

    let result = template;

    if (context.customerName) {
      result = result.replace(/\{\{customerName\}\}/g, context.customerName);
    }
    if (context.proposalNumber) {
      result = result.replace(/\{\{proposalNumber\}\}/g, context.proposalNumber);
    }
    if (context.bookingNumber) {
      result = result.replace(/\{\{bookingNumber\}\}/g, context.bookingNumber);
    }
    if (context.companyName) {
      result = result.replace(/\{\{companyName\}\}/g, context.companyName);
    }

    return result;
  }

  /**
   * Get all task templates
   */
  async getTaskTemplates(): Promise<TaskTemplate[]> {
    const result = await this.query<TaskTemplate>(
      `SELECT * FROM crm_task_templates ORDER BY trigger_event`
    );
    return result.rows;
  }

  /**
   * Update a task template
   */
  async updateTaskTemplate(
    id: number,
    updates: Partial<Pick<TaskTemplate, 'title' | 'description' | 'task_type' | 'priority' | 'days_from_trigger' | 'is_active'>>
  ): Promise<TaskTemplate | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    if (updates.title !== undefined) {
      paramCount++;
      fields.push(`title = $${paramCount}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      paramCount++;
      fields.push(`description = $${paramCount}`);
      values.push(updates.description);
    }
    if (updates.task_type !== undefined) {
      paramCount++;
      fields.push(`task_type = $${paramCount}`);
      values.push(updates.task_type);
    }
    if (updates.priority !== undefined) {
      paramCount++;
      fields.push(`priority = $${paramCount}`);
      values.push(updates.priority);
    }
    if (updates.days_from_trigger !== undefined) {
      paramCount++;
      fields.push(`days_from_trigger = $${paramCount}`);
      values.push(updates.days_from_trigger);
    }
    if (updates.is_active !== undefined) {
      paramCount++;
      fields.push(`is_active = $${paramCount}`);
      values.push(updates.is_active);
    }

    if (fields.length === 0) return null;

    paramCount++;
    values.push(id);

    return this.queryOne<TaskTemplate>(
      `UPDATE crm_task_templates SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
  }
}

// Export singleton instance
export const crmTaskAutomationService = new CrmTaskAutomationService();
