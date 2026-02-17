import { sectionPlugins } from './sectionPlugins.js'
import { cardPlugins } from './cardPlugins.js'
import { bioPlugins } from './bioPlugins.js'
import { keyManagementPlugins } from './keyManagementPlugins.js'

const allPlugins = [
  ...sectionPlugins,
  ...cardPlugins,
  ...bioPlugins,
  ...keyManagementPlugins,
]

const pluginMap = new Map(allPlugins.map(p => [p.name, p]))

/**
 * Get all registered plugins.
 */
export function getAllPlugins() {
  return allPlugins
}

/**
 * Get a specific plugin by name.
 */
export function getPlugin(name) {
  return pluginMap.get(name)
}

/**
 * Get tool definitions formatted for LLM function calling.
 * @returns {Array<{ name: string, description: string, parameters: object }>}
 */
export function getToolDefinitions() {
  return allPlugins.map(p => ({
    name: p.name,
    description: p.description,
    parameters: p.parameters,
  }))
}
