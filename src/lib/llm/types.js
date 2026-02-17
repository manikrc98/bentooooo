/**
 * Common type definitions for the LLM provider abstraction layer.
 * All providers translate to/from these shapes.
 */

/**
 * @typedef {'system'|'user'|'assistant'|'tool'} MessageRole
 */

/**
 * @typedef {Object} LLMMessage
 * @property {MessageRole} role
 * @property {string} content
 * @property {ToolCall[]} [toolCalls] - present on assistant messages with tool calls
 * @property {string} [toolCallId] - present on tool result messages
 * @property {string} [toolName] - present on tool result messages
 */

/**
 * @typedef {Object} ToolCall
 * @property {string} id
 * @property {string} name
 * @property {Object} arguments - parsed JSON arguments
 */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name
 * @property {string} description
 * @property {Object} parameters - JSON Schema object
 */

/**
 * @typedef {Object} LLMResponse
 * @property {string} content - text response (may be empty if only tool calls)
 * @property {ToolCall[]} toolCalls
 * @property {'stop'|'tool_calls'} finishReason
 */

export class LLMError extends Error {
  /**
   * @param {string} message
   * @param {{ provider: string, statusCode?: number, isRateLimit?: boolean, isAuthError?: boolean }} details
   */
  constructor(message, { provider, statusCode, isRateLimit = false, isAuthError = false }) {
    super(message)
    this.name = 'LLMError'
    this.provider = provider
    this.statusCode = statusCode
    this.isRateLimit = isRateLimit
    this.isAuthError = isAuthError
  }
}
