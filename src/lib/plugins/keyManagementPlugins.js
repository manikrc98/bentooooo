import * as llmKeyStore from '../llmKeyStore.js'
import { createProvider, getProviderList } from '../llm/provider.js'

export const keyManagementPlugins = [
  {
    name: 'set_api_key',
    description: 'Sets (or updates) an API key for an LLM provider. The key is validated before saving. Supported providers: openai, gemini, anthropic.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['openai', 'gemini', 'anthropic'],
          description: 'The LLM provider (openai, gemini, or anthropic)',
        },
        apiKey: { type: 'string', description: 'The API key to set' },
      },
      required: ['provider', 'apiKey'],
    },
    async execute(args, { userId }) {
      if (!userId) return { success: false, error: 'You must be signed in to manage API keys.' }

      try {
        // Validate the key first
        const provider = createProvider(args.provider, args.apiKey)
        const valid = await provider.validateKey()
        if (!valid) {
          return { success: false, error: `The ${args.provider} API key is invalid. Please check the key and try again.` }
        }

        await llmKeyStore.setKey(userId, args.provider, args.apiKey)
        return { success: true, message: `${args.provider} API key has been saved and validated successfully.` }
      } catch (err) {
        return { success: false, error: `Failed to set key: ${err.message}` }
      }
    },
  },

  {
    name: 'remove_api_key',
    description: 'Removes an API key for an LLM provider.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['openai', 'gemini', 'anthropic'],
          description: 'The provider whose key to remove',
        },
      },
      required: ['provider'],
    },
    async execute(args, { userId }) {
      if (!userId) return { success: false, error: 'You must be signed in to manage API keys.' }
      try {
        await llmKeyStore.removeKey(userId, args.provider)
        return { success: true, message: `Removed ${args.provider} API key.` }
      } catch (err) {
        return { success: false, error: `Failed to remove key: ${err.message}` }
      }
    },
  },

  {
    name: 'list_configured_providers',
    description: 'Lists which LLM providers have API keys configured. Does not reveal the actual key values.',
    parameters: { type: 'object', properties: {} },
    async execute(_args, { userId }) {
      if (!userId) return { success: false, error: 'You must be signed in to view API keys.' }
      try {
        const configured = await llmKeyStore.getConfiguredProviders(userId)
        const all = getProviderList()
        return {
          success: true,
          providers: all.map(p => ({
            id: p.id,
            label: p.label,
            configured: configured.includes(p.id),
          })),
        }
      } catch (err) {
        return { success: false, error: `Failed to list providers: ${err.message}` }
      }
    },
  },
]
