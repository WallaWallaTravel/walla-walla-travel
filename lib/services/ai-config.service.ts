/**
 * AI Config Service
 *
 * @module lib/services/ai-config.service
 * @description Fetches AI chat configuration from the database including
 * system prompts, partner notes, global knowledge, examples, and blocklist.
 * This configuration is injected into the AI chat context to tune behavior.
 *
 * @features
 * - Fetch active system prompt
 * - Get partner-specific notes
 * - Get global knowledge (events, seasonal info)
 * - Get example Q&A pairs
 * - Get blocklist items
 * - CRUD operations for admin interface
 */

import { BaseService } from './base.service';

// ============================================================================
// Types
// ============================================================================

export type AIConfigType =
  | 'system_prompt'
  | 'partner_note'
  | 'global_knowledge'
  | 'example'
  | 'blocklist';

export interface AIConfig {
  id: number;
  config_type: AIConfigType;
  key: string | null;
  value: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

export interface AIConfigContext {
  systemPrompt: string | null;
  partnerNotes: Map<string, string>;
  globalKnowledge: Array<{ key: string; value: string }>;
  examples: Array<{ key: string; value: string }>;
  blocklist: string[];
}

export interface CreateConfigInput {
  config_type: AIConfigType;
  key?: string;
  value: string;
  is_active?: boolean;
  priority?: number;
  created_by?: number;
}

export interface UpdateConfigInput {
  key?: string;
  value?: string;
  is_active?: boolean;
  priority?: number;
}

// ============================================================================
// Service
// ============================================================================

class AIConfigService extends BaseService {
  protected get serviceName(): string {
    return 'AIConfigService';
  }

  /**
   * Get the active system prompt
   * Returns the highest priority active system prompt
   */
  async getSystemPrompt(): Promise<string | null> {
    const config = await this.queryOne<AIConfig>(
      `SELECT * FROM ai_chat_config
       WHERE config_type = 'system_prompt'
         AND is_active = true
       ORDER BY priority DESC
       LIMIT 1`
    );

    return config?.value || null;
  }

  /**
   * Get partner notes for specific partners
   * @param partnerIds - Array of partner IDs to get notes for
   */
  async getPartnerNotes(partnerIds: string[]): Promise<Map<string, string>> {
    if (partnerIds.length === 0) return new Map();

    const notes = await this.queryMany<AIConfig>(
      `SELECT * FROM ai_chat_config
       WHERE config_type = 'partner_note'
         AND is_active = true
         AND key = ANY($1)
       ORDER BY priority DESC`,
      [partnerIds]
    );

    const noteMap = new Map<string, string>();
    for (const note of notes) {
      if (note.key && !noteMap.has(note.key)) {
        noteMap.set(note.key, note.value);
      }
    }

    return noteMap;
  }

  /**
   * Get all active global knowledge entries
   */
  async getGlobalKnowledge(): Promise<Array<{ key: string; value: string }>> {
    const knowledge = await this.queryMany<AIConfig>(
      `SELECT * FROM ai_chat_config
       WHERE config_type = 'global_knowledge'
         AND is_active = true
       ORDER BY priority DESC`
    );

    return knowledge.map((k) => ({
      key: k.key || 'general',
      value: k.value,
    }));
  }

  /**
   * Get example Q&A pairs
   */
  async getExamples(): Promise<Array<{ key: string; value: string }>> {
    const examples = await this.queryMany<AIConfig>(
      `SELECT * FROM ai_chat_config
       WHERE config_type = 'example'
         AND is_active = true
       ORDER BY priority DESC`
    );

    return examples.map((e) => ({
      key: e.key || 'example',
      value: e.value,
    }));
  }

  /**
   * Get blocklist items
   */
  async getBlocklist(): Promise<string[]> {
    const blocked = await this.queryMany<AIConfig>(
      `SELECT * FROM ai_chat_config
       WHERE config_type = 'blocklist'
         AND is_active = true
       ORDER BY priority DESC`
    );

    return blocked.map((b) => b.value);
  }

  /**
   * Get full AI context (all active config combined)
   * This is used to build the AI system prompt
   */
  async getFullContext(): Promise<AIConfigContext> {
    const [systemPrompt, globalKnowledge, examples, blocklist] = await Promise.all([
      this.getSystemPrompt(),
      this.getGlobalKnowledge(),
      this.getExamples(),
      this.getBlocklist(),
    ]);

    return {
      systemPrompt,
      partnerNotes: new Map(), // Partner notes are fetched separately with IDs
      globalKnowledge,
      examples,
      blocklist,
    };
  }

  /**
   * Format context for AI system prompt injection
   */
  formatForSystemPrompt(context: AIConfigContext): string {
    const sections: string[] = [];

    // Add global knowledge
    if (context.globalKnowledge.length > 0) {
      sections.push('## LOCAL KNOWLEDGE\n');
      for (const knowledge of context.globalKnowledge) {
        sections.push(`**${knowledge.key}**: ${knowledge.value}\n`);
      }
    }

    // Add examples section
    if (context.examples.length > 0) {
      sections.push('\n## RESPONSE EXAMPLES\n');
      for (const example of context.examples) {
        sections.push(`${example.value}\n`);
      }
    }

    // Add blocklist
    if (context.blocklist.length > 0) {
      sections.push('\n## NEVER RECOMMEND\n');
      sections.push(context.blocklist.join(', '));
    }

    return sections.join('\n');
  }

  // ============================================================================
  // Admin CRUD Operations
  // ============================================================================

  /**
   * Get all config entries (for admin)
   */
  async getAllConfig(type?: AIConfigType): Promise<AIConfig[]> {
    let query = `SELECT * FROM ai_chat_config`;
    const params: unknown[] = [];

    if (type) {
      query += ` WHERE config_type = $1`;
      params.push(type);
    }

    query += ` ORDER BY config_type, priority DESC, created_at DESC`;

    return this.queryMany<AIConfig>(query, params);
  }

  /**
   * Get single config by ID
   */
  async getConfigById(id: number): Promise<AIConfig | null> {
    return this.queryOne<AIConfig>(
      `SELECT * FROM ai_chat_config WHERE id = $1`,
      [id]
    );
  }

  /**
   * Create new config entry
   */
  async createConfig(input: CreateConfigInput): Promise<AIConfig> {
    const config = await this.queryOne<AIConfig>(
      `INSERT INTO ai_chat_config (config_type, key, value, is_active, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.config_type,
        input.key || null,
        input.value,
        input.is_active ?? true,
        input.priority ?? 0,
        input.created_by || null,
      ]
    );

    if (!config) {
      throw new Error('Failed to create AI config');
    }

    this.log('Created AI config', { type: input.config_type, key: input.key });
    return config;
  }

  /**
   * Update config entry
   */
  async updateConfig(id: number, input: UpdateConfigInput): Promise<AIConfig | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (input.key !== undefined) {
      setClauses.push(`key = $${paramIndex++}`);
      params.push(input.key);
    }

    if (input.value !== undefined) {
      setClauses.push(`value = $${paramIndex++}`);
      params.push(input.value);
    }

    if (input.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      params.push(input.is_active);
    }

    if (input.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      params.push(input.priority);
    }

    params.push(id);

    const config = await this.queryOne<AIConfig>(
      `UPDATE ai_chat_config
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    this.log('Updated AI config', { id });
    return config;
  }

  /**
   * Delete config entry
   */
  async deleteConfig(id: number): Promise<boolean> {
    const result = await this.query(
      `DELETE FROM ai_chat_config WHERE id = $1`,
      [id]
    );

    this.log('Deleted AI config', { id });
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Toggle config active status
   */
  async toggleActive(id: number): Promise<AIConfig | null> {
    const config = await this.queryOne<AIConfig>(
      `UPDATE ai_chat_config
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    this.log('Toggled AI config active', { id, isActive: config?.is_active });
    return config;
  }
}

export const aiConfigService = new AIConfigService();
