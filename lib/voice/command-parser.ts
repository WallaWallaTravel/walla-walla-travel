/**
 * Voice Command Parser
 * Parses natural language commands for inspection voice interface
 */

export type InspectionCommand =
  | { type: 'PASS'; confidence: number }
  | { type: 'FAIL'; confidence: number; note?: string }
  | { type: 'NOTE'; text: string }
  | { type: 'REPEAT' }
  | { type: 'SKIP' }
  | { type: 'CANCEL' }
  | { type: 'HELP' }
  | { type: 'UNKNOWN'; original: string }

// Command patterns (lowercase for case-insensitive matching)
const COMMAND_PATTERNS = {
  PASS: ['pass', 'good', 'ok', 'okay', 'yes', 'fine', 'clear', 'approved', 'looks good', 'all good'],
  FAIL: ['fail', 'no', 'not good', 'problem', 'issue', 'bad', 'broken', 'needs repair', 'defect'],
  REPEAT: ['repeat', 'say again', 'what', 'pardon', 'come again', 'didn\'t hear'],
  SKIP: ['skip', 'next', 'pass over', 'move on'],
  CANCEL: ['cancel', 'stop', 'exit', 'quit', 'end', 'abort'],
  HELP: ['help', 'commands', 'what can i say'],
}

// Note prefixes
const NOTE_PREFIXES = ['note', 'note:', 'add note', 'comment', 'comment:']

/**
 * Parse voice transcript into inspection command
 */
export function parseCommand(transcript: string, confidence: number = 1.0): InspectionCommand {
  const text = transcript.toLowerCase().trim()

  // Check for note
  for (const prefix of NOTE_PREFIXES) {
    if (text.startsWith(prefix)) {
      const noteText = text.substring(prefix.length).trim()
      if (noteText) {
        return { type: 'NOTE', text: noteText }
      }
    }
  }

  // Check for fail with note (e.g., "fail crack in windshield")
  const failMatch = matchCommand(text, COMMAND_PATTERNS.FAIL)
  if (failMatch.matched && failMatch.remaining) {
    return {
      type: 'FAIL',
      confidence,
      note: failMatch.remaining.trim(),
    }
  }

  // Check other commands
  if (matchCommand(text, COMMAND_PATTERNS.PASS).matched) {
    return { type: 'PASS', confidence }
  }

  if (matchCommand(text, COMMAND_PATTERNS.FAIL).matched) {
    return { type: 'FAIL', confidence }
  }

  if (matchCommand(text, COMMAND_PATTERNS.REPEAT).matched) {
    return { type: 'REPEAT' }
  }

  if (matchCommand(text, COMMAND_PATTERNS.SKIP).matched) {
    return { type: 'SKIP' }
  }

  if (matchCommand(text, COMMAND_PATTERNS.CANCEL).matched) {
    return { type: 'CANCEL' }
  }

  if (matchCommand(text, COMMAND_PATTERNS.HELP).matched) {
    return { type: 'HELP' }
  }

  // Unknown command
  return { type: 'UNKNOWN', original: transcript }
}

/**
 * Check if text matches any pattern in the list
 * Returns the match and any remaining text
 */
function matchCommand(
  text: string,
  patterns: string[]
): { matched: boolean; pattern?: string; remaining?: string } {
  for (const pattern of patterns) {
    if (text === pattern) {
      return { matched: true, pattern }
    }

    // Check if text starts with pattern (for "fail [note]" case)
    if (text.startsWith(pattern + ' ')) {
      return {
        matched: true,
        pattern,
        remaining: text.substring(pattern.length + 1),
      }
    }

    // Fuzzy match (allow some similarity)
    if (fuzzyMatch(text, pattern)) {
      return { matched: true, pattern }
    }
  }

  return { matched: false }
}

/**
 * Simple fuzzy matching (Levenshtein-based)
 * Returns true if similarity is above threshold
 */
function fuzzyMatch(text: string, pattern: string, threshold: number = 0.8): boolean {
  // For very short strings, require exact match
  if (pattern.length < 3) {
    return text === pattern
  }

  const distance = levenshteinDistance(text, pattern)
  const maxLength = Math.max(text.length, pattern.length)
  const similarity = 1 - distance / maxLength

  return similarity >= threshold
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  // Create a matrix
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill in the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Get help text for available commands
 */
export function getHelpText(): string {
  return `
Available voice commands:

• Pass: Say "pass", "good", "ok", or "yes"
• Fail: Say "fail", "no", or "problem"
• Add Note: Say "fail [description]" or "note [text]"
• Repeat: Say "repeat" or "say again"
• Skip: Say "skip" or "next"
• Cancel: Say "cancel", "stop", or "exit"
• Help: Say "help" or "commands"

Examples:
- "Pass"
- "Fail - crack in windshield"
- "Note: needs oil change soon"
- "Repeat"
  `.trim()
}

/**
 * Validate command confidence
 */
export function isConfidentCommand(command: InspectionCommand, minConfidence: number = 0.7): boolean {
  if (command.type === 'PASS' || command.type === 'FAIL') {
    return command.confidence >= minConfidence
  }
  // Other commands don't need confidence check
  return true
}

/**
 * Format command for display
 */
export function formatCommandDisplay(command: InspectionCommand): string {
  switch (command.type) {
    case 'PASS':
      return `✓ Pass (${Math.round(command.confidence * 100)}%)`
    case 'FAIL':
      return command.note
        ? `✗ Fail: ${command.note} (${Math.round(command.confidence * 100)}%)`
        : `✗ Fail (${Math.round(command.confidence * 100)}%)`
    case 'NOTE':
      return `📝 Note: ${command.text}`
    case 'REPEAT':
      return '🔁 Repeat'
    case 'SKIP':
      return '⏭️ Skip'
    case 'CANCEL':
      return '🛑 Cancel'
    case 'HELP':
      return '❓ Help'
    case 'UNKNOWN':
      return `❓ Unknown: "${command.original}"`
  }
}

