import { getPlugin, getToolDefinitions } from '../plugins/registry.js'
import { buildSystemPrompt } from './systemPrompt.js'
import { smartChat } from '../llm/smartChatWrapper.js'

// Reduced from 10 to 5 to be conservative with API calls, especially for free tier users
const MAX_TOOL_ITERATIONS = 5

/**
 * Run the chat orchestration loop.
 *
 * @param {string} userMessage - the user's message text
 * @param {Array} chatHistory - existing conversation history (LLMMessage[])
 * @param {{ state: Object, dispatch: Function, provider: Object, userId: string, model?: string }} context
 * @returns {Promise<{ assistantMessage: string, updatedHistory: Array }>}
 */
export async function sendMessage(userMessage, chatHistory, { state, dispatch, provider, userId, model }) {
  const tools = getToolDefinitions()

  // Use smart chat wrapper to optimize messages and select best model
  const { messages: optimizedMessages, model: selectedModel } = await smartChat(
    userMessage,
    chatHistory,
    provider,
    { model } // Pass forced model if provided, otherwise auto-select
  )

  // Replace system prompt with state-aware version (smart chat uses generic one)
  const messages = [
    { role: 'system', content: buildSystemPrompt(state) },
    ...optimizedMessages.slice(1), // Keep optimized messages (skip generic system prompt)
  ]

  // Track messages added during this turn for history
  const newMessages = [{ role: 'user', content: userMessage }]

  let iterations = 0

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++

    const response = await provider.chat(messages, tools, { model: selectedModel })

    if (response.finishReason === 'stop' || response.toolCalls.length === 0) {
      // Final response — no more tool calls
      const assistantMsg = { role: 'assistant', content: response.content }
      newMessages.push(assistantMsg)
      messages.push(assistantMsg)
      break
    }

    // LLM wants to call tools
    const assistantMsg = {
      role: 'assistant',
      content: response.content || '',
      toolCalls: response.toolCalls,
    }
    newMessages.push(assistantMsg)
    messages.push(assistantMsg)

    // Execute each tool call
    for (const toolCall of response.toolCalls) {
      const plugin = getPlugin(toolCall.name)
      let result

      if (!plugin) {
        result = { success: false, error: `Unknown tool: ${toolCall.name}` }
      } else {
        try {
          result = await plugin.execute(toolCall.arguments, { state, dispatch, userId })
        } catch (err) {
          result = { success: false, error: `Tool execution error: ${err.message}` }
        }
      }

      const toolMsg = {
        role: 'tool',
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        content: JSON.stringify(result),
      }
      newMessages.push(toolMsg)
      messages.push(toolMsg)
    }

    // After tool execution, rebuild system prompt with updated state
    // (since dispatch may have changed the state)
    messages[0] = { role: 'system', content: buildSystemPrompt(state) }
  }

  // If we hit the iteration limit, force a final message
  if (iterations >= MAX_TOOL_ITERATIONS) {
    const finalMsg = {
      role: 'assistant',
      content: newMessages[newMessages.length - 1]?.role === 'assistant'
        ? newMessages[newMessages.length - 1].content
        : 'I reached the maximum number of actions for this request. Here\'s what I\'ve done so far — please check the preview and let me know if you need anything else.',
    }
    if (newMessages[newMessages.length - 1]?.role !== 'assistant') {
      newMessages.push(finalMsg)
    }
  }

  // Build the final assistant text from the last assistant message
  const lastAssistant = [...newMessages].reverse().find(m => m.role === 'assistant')
  const assistantText = lastAssistant?.content || 'Done.'

  return {
    assistantMessage: assistantText,
    updatedHistory: [...chatHistory, ...newMessages],
  }
}
