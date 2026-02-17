import { LLMError } from './types.js'
import { getTokenCounter, estimateTokens, countConversationTokens } from './tokenCounter.js'

const API_URL = 'https://models.inference.ai.azure.com/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

/**
 * Translate common messages to GitHub Models format (OpenAI-compatible).
 */
function toGitHubMessages(messages) {
  return messages.map(msg => {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: msg.toolCallId,
        content: msg.content,
      }
    }
    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      return {
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      }
    }
    return { role: msg.role, content: msg.content }
  })
}

/**
 * Translate tool definitions to GitHub Models format (OpenAI-compatible).
 */
function toGitHubTools(tools) {
  if (!tools?.length) return undefined
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

/**
 * Parse GitHub Models response into common format.
 */
function parseResponse(data) {
  const choice = data.choices[0]
  const msg = choice.message
  const toolCalls = (msg.tool_calls || []).map(tc => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments),
  }))

  return {
    content: msg.content || '',
    toolCalls,
    finishReason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
  }
}

export function createGitHubModelsProvider(apiKey) {
  return {
    id: 'github',
    name: 'GitHub Models',

    async chat(messages, tools, options = {}) {
      const model = options.model || DEFAULT_MODEL
      const counter = getTokenCounter()

      // Estimate input tokens
      const estimatedInputTokens = countConversationTokens(messages)

      // Check limits before making request
      const { allowed, warnings } = counter.checkLimits(model, estimatedInputTokens, 1000)
      if (warnings.length > 0) {
        console.warn(`[GitHub Models] Usage warnings for ${model}:`, warnings)
      }

      const body = {
        model,
        messages: toGitHubMessages(messages),
      }
      const gitHubTools = toGitHubTools(tools)
      if (gitHubTools) body.tools = gitHubTools

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new LLMError(
          err.error?.message || `GitHub Models API error: ${res.status}`,
          {
            provider: 'github',
            statusCode: res.status,
            isRateLimit: res.status === 429,
            isAuthError: res.status === 401,
          }
        )
      }

      // Track usage after successful response
      const response = await res.json()
      const parsedResponse = parseResponse(response)

      // Record usage in counter
      counter.recordRequest(model)
      counter.recordInput(model, estimatedInputTokens)

      // Estimate output tokens from response
      const estimatedOutputTokens = estimateTokens(parsedResponse.content)
      counter.recordOutput(model, estimatedOutputTokens)

      // Add usage stats to response metadata
      parsedResponse._metadata = {
        model,
        tokensUsed: {
          input: estimatedInputTokens,
          output: estimatedOutputTokens,
        },
        usageStats: counter.getDailyUsage(model),
      }

      return parsedResponse
    },

    async validateKey() {
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
          }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          console.error('GitHub Models validation error:', res.status, errData)
        }
        return res.ok
      } catch (error) {
        console.error('GitHub Models API validation error:', error)
        return false
      }
    },
  }
}
