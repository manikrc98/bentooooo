import { ADD_SECTION, REMOVE_SECTION, UPDATE_SECTION_TITLE, REORDER_SECTIONS } from '../../store/cardStore.js'

/**
 * Resolve a section from state by title (case-insensitive) or index.
 */
function resolveSection(state, { sectionTitle, sectionIndex }) {
  if (sectionTitle != null) {
    const lower = sectionTitle.toLowerCase()
    const section = state.sections.find(s => s.title.toLowerCase() === lower)
    if (!section) {
      const titles = state.sections.map(s => `"${s.title}"`).join(', ')
      return { error: `No section found with title "${sectionTitle}". Available sections: ${titles || 'none'}` }
    }
    return { section }
  }
  if (sectionIndex != null) {
    const section = state.sections[sectionIndex]
    if (!section) {
      return { error: `Section index ${sectionIndex} out of range. There are ${state.sections.length} sections (0-indexed).` }
    }
    return { section }
  }
  return { error: 'Either sectionTitle or sectionIndex must be provided.' }
}

export const sectionPlugins = [
  {
    name: 'create_section',
    description: 'Creates a new section in the portfolio with the given title.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title for the new section' },
      },
      required: ['title'],
    },
    execute(args, { dispatch }) {
      dispatch({ type: ADD_SECTION, payload: { title: args.title } })
      return { success: true, message: `Created section "${args.title}"` }
    },
  },

  {
    name: 'delete_section',
    description: 'Deletes a section from the portfolio. Identify it by title or index (0-based).',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section to delete' },
        sectionIndex: { type: 'integer', description: 'Index of the section to delete (0-based)' },
      },
    },
    execute(args, { state, dispatch }) {
      const result = resolveSection(state, args)
      if (result.error) return { success: false, error: result.error }
      dispatch({ type: REMOVE_SECTION, payload: result.section.id })
      return { success: true, message: `Deleted section "${result.section.title}"` }
    },
  },

  {
    name: 'rename_section',
    description: 'Renames a section. Identify it by current title or index (0-based).',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Current title of the section' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
        newTitle: { type: 'string', description: 'The new title for the section' },
      },
      required: ['newTitle'],
    },
    execute(args, { state, dispatch }) {
      const result = resolveSection(state, args)
      if (result.error) return { success: false, error: result.error }
      dispatch({ type: UPDATE_SECTION_TITLE, payload: { id: result.section.id, title: args.newTitle } })
      return { success: true, message: `Renamed section "${result.section.title}" to "${args.newTitle}"` }
    },
  },

  {
    name: 'reorder_section',
    description: 'Move a section to a different position. Provide fromIndex and toIndex (0-based).',
    parameters: {
      type: 'object',
      properties: {
        fromIndex: { type: 'integer', description: 'Current position index (0-based)' },
        toIndex: { type: 'integer', description: 'Target position index (0-based)' },
      },
      required: ['fromIndex', 'toIndex'],
    },
    execute(args, { state, dispatch }) {
      const { fromIndex, toIndex } = args
      if (fromIndex < 0 || fromIndex >= state.sections.length) {
        return { success: false, error: `fromIndex ${fromIndex} out of range.` }
      }
      if (toIndex < 0 || toIndex >= state.sections.length) {
        return { success: false, error: `toIndex ${toIndex} out of range.` }
      }
      dispatch({ type: REORDER_SECTIONS, payload: { fromIndex, toIndex } })
      return { success: true, message: `Moved section from position ${fromIndex} to ${toIndex}` }
    },
  },

  {
    name: 'list_sections',
    description: 'Lists all sections in the portfolio with their titles and card counts.',
    parameters: { type: 'object', properties: {} },
    execute(_args, { state }) {
      const sections = state.sections.map((s, i) => ({
        index: i,
        title: s.title,
        cardCount: s.cards.length,
      }))
      return { success: true, sections }
    },
  },
]
