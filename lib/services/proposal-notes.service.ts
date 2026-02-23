/**
 * Proposal Notes Service
 *
 * @module lib/services/proposal-notes.service
 * @description Service layer for proposal notes/communication system.
 * Handles creating notes, querying with filters, tracking read state,
 * and marking notes as read for both client and staff audiences.
 */

import { BaseService } from './base.service';
import {
  ProposalNote,
  CreateNoteInput,
  NoteFilter,
  CreateNoteSchema,
} from '@/lib/types/proposal-notes';

class ProposalNotesService extends BaseService {
  protected get serviceName() {
    return 'ProposalNotesService';
  }

  /**
   * Create a note on a proposal
   */
  async createNote(
    proposalId: number,
    input: CreateNoteInput
  ): Promise<ProposalNote> {
    // Validate the common fields
    const validated = CreateNoteSchema.parse({
      author_name: input.author_name,
      content: input.content,
      context_type: input.context_type,
      context_id: input.context_id,
    });

    const data: Record<string, unknown> = {
      trip_proposal_id: proposalId,
      author_type: input.author_type,
      author_name: validated.author_name,
      content: validated.content,
      is_read: false,
    };

    if (validated.context_type) {
      data.context_type = validated.context_type;
    }

    if (validated.context_id) {
      data.context_id = validated.context_id;
    }

    this.log('Creating note', {
      proposalId,
      authorType: input.author_type,
      contextType: validated.context_type,
    });

    return this.insert<ProposalNote>('proposal_notes', data);
  }

  /**
   * Get notes for a proposal, optionally filtered by context
   */
  async getNotes(filter: NoteFilter): Promise<ProposalNote[]> {
    const conditions: string[] = ['trip_proposal_id = $1'];
    const params: unknown[] = [filter.trip_proposal_id];

    if (filter.general_only) {
      conditions.push('context_type IS NULL');
    } else {
      if (filter.context_type) {
        params.push(filter.context_type);
        conditions.push(`context_type = $${params.length}`);
      }

      if (filter.context_id !== undefined) {
        params.push(filter.context_id);
        conditions.push(`context_id = $${params.length}`);
      }
    }

    const where = conditions.join(' AND ');

    return this.findWhere<ProposalNote>(
      'proposal_notes',
      where,
      params,
      '*',
      'created_at ASC'
    );
  }

  /**
   * Get unread count for a proposal.
   * If forAuthorType is provided, counts unread notes FROM that author type
   * (i.e., notes the *other* party hasn't read yet).
   */
  async getUnreadCount(
    proposalId: number,
    forAuthorType?: 'client' | 'staff'
  ): Promise<number> {
    const conditions: string[] = [
      'trip_proposal_id = $1',
      'is_read = false',
    ];
    const params: unknown[] = [proposalId];

    if (forAuthorType) {
      params.push(forAuthorType);
      conditions.push(`author_type = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const sql = `SELECT COUNT(*) as count FROM proposal_notes WHERE ${where}`;

    return this.queryCount(sql, params);
  }

  /**
   * Mark all notes as read for a given proposal by author type.
   * When the client views, staff notes get marked read. When staff views, client notes get marked read.
   */
  async markAsRead(
    proposalId: number,
    authorType: 'client' | 'staff'
  ): Promise<void> {
    const sql = `
      UPDATE proposal_notes
      SET is_read = true
      WHERE trip_proposal_id = $1
        AND author_type = $2
        AND is_read = false
    `;

    await this.query(sql, [proposalId, authorType]);

    this.log('Marked notes as read', { proposalId, authorType });
  }

  /**
   * Mark a specific note as read
   */
  async markNoteAsRead(noteId: number): Promise<void> {
    const sql = `
      UPDATE proposal_notes
      SET is_read = true
      WHERE id = $1 AND is_read = false
    `;

    await this.query(sql, [noteId]);

    this.log('Marked note as read', { noteId });
  }
}

export const proposalNotesService = new ProposalNotesService();
