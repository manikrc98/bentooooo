import { ADD_CARD, REMOVE_CARD, RESIZE_CARD, UPDATE_CARD_CONTENT, REORDER_CARDS, MOVE_CARD_TO_SECTION } from '../../store/cardStore.js'
import { formatBento } from '../../utils/bentoDimensions.js'

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
      return { error: `Section index ${sectionIndex} out of range. There are ${state.sections.length} sections.` }
    }
    return { section }
  }
  return { error: 'Either sectionTitle or sectionIndex must be provided.' }
}

/**
 * Resolve a card within a section by title (caption), index, or description.
 */
function resolveCard(section, { cardIndex, cardTitle }) {
  if (cardIndex != null) {
    const card = section.cards[cardIndex]
    if (!card) {
      return { error: `Card index ${cardIndex} out of range in section "${section.title}". It has ${section.cards.length} cards.` }
    }
    return { card }
  }
  if (cardTitle != null) {
    const lower = cardTitle.toLowerCase()
    const card = section.cards.find(c =>
      c.content.title?.toLowerCase().includes(lower) ||
      c.content.text?.toLowerCase().includes(lower)
    )
    if (!card) {
      return { error: `No card found matching "${cardTitle}" in section "${section.title}".` }
    }
    return { card }
  }
  return { error: 'Either cardIndex or cardTitle must be provided.' }
}

export const cardPlugins = [
  {
    name: 'add_card',
    description: 'Adds a new card to a section. Specify the section by title or index. Optionally set bento size (e.g., "2x2") and content type.',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section to add the card to' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
        width: { type: 'integer', description: 'Card width in grid columns (1-4). Default: 1', default: 1 },
        height: { type: 'integer', description: 'Card height in grid rows (1-4). Default: 1', default: 1 },
      },
    },
    execute(args, { state, dispatch }) {
      const result = resolveSection(state, args)
      if (result.error) return { success: false, error: result.error }
      const bento = formatBento(args.width || 1, args.height || 1)
      const id = crypto.randomUUID()
      dispatch({ type: ADD_CARD, payload: { sectionId: result.section.id, id, bento } })
      return { success: true, message: `Added ${bento} card to section "${result.section.title}"`, cardIndex: result.section.cards.length }
    },
  },

  {
    name: 'remove_card',
    description: 'Removes a card from a section. Identify the card by index (0-based) or by matching title/text content.',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section containing the card' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
        cardIndex: { type: 'integer', description: 'Index of the card within the section (0-based)' },
        cardTitle: { type: 'string', description: 'Title or text content to match the card' },
      },
    },
    execute(args, { state, dispatch }) {
      const sectionResult = resolveSection(state, args)
      if (sectionResult.error) return { success: false, error: sectionResult.error }
      const cardResult = resolveCard(sectionResult.section, args)
      if (cardResult.error) return { success: false, error: cardResult.error }
      dispatch({ type: REMOVE_CARD, payload: cardResult.card.id })
      return { success: true, message: `Removed card from section "${sectionResult.section.title}"` }
    },
  },

  {
    name: 'resize_card',
    description: 'Resizes a card. Specify width (columns) and height (rows), each 1-4.',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section containing the card' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
        cardIndex: { type: 'integer', description: 'Index of the card (0-based)' },
        cardTitle: { type: 'string', description: 'Title or text content to match the card' },
        width: { type: 'integer', description: 'New width in columns (1-4)' },
        height: { type: 'integer', description: 'New height in rows (1-4)' },
      },
      required: ['width', 'height'],
    },
    execute(args, { state, dispatch }) {
      const sectionResult = resolveSection(state, args)
      if (sectionResult.error) return { success: false, error: sectionResult.error }
      const cardResult = resolveCard(sectionResult.section, args)
      if (cardResult.error) return { success: false, error: cardResult.error }
      const bento = formatBento(args.width, args.height)
      dispatch({ type: RESIZE_CARD, payload: { id: cardResult.card.id, bento } })
      return { success: true, message: `Resized card to ${bento}` }
    },
  },

  {
    name: 'update_card_caption',
    description: 'Updates only the caption text on an image or video card. Does not change the card type or other properties.',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
        cardIndex: { type: 'integer', description: 'Index of the card (0-based)' },
        cardTitle: { type: 'string', description: 'Title/caption to match the card' },
        caption: { type: 'string', description: 'New caption text to display on the card' },
      },
      required: ['caption'],
    },
    execute(args, { state, dispatch }) {
      const sectionResult = resolveSection(state, args)
      if (sectionResult.error) return { success: false, error: sectionResult.error }
      const cardResult = resolveCard(sectionResult.section, args)
      if (cardResult.error) return { success: false, error: cardResult.error }

      dispatch({ type: UPDATE_CARD_CONTENT, payload: { id: cardResult.card.id, updates: { title: args.caption } } })
      return { success: true, message: `Updated caption to "${args.caption}"` }
    },
  },

  {
    name: 'update_card_text',
    description: 'Updates a card\'s text content, title/caption, and colors. The card type will be set to "text" automatically.',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
        cardIndex: { type: 'integer', description: 'Index of the card (0-based)' },
        cardTitle: { type: 'string', description: 'Title/text to match the card' },
        text: { type: 'string', description: 'Main text content for the card' },
        title: { type: 'string', description: 'Caption/title text displayed on the card' },
        bgColor: { type: 'string', description: 'Background color as hex (e.g., "#fde2e4")' },
        textColor: { type: 'string', description: 'Text color as hex (e.g., "#374151")' },
      },
    },
    execute(args, { state, dispatch }) {
      const sectionResult = resolveSection(state, args)
      if (sectionResult.error) return { success: false, error: sectionResult.error }
      const cardResult = resolveCard(sectionResult.section, args)
      if (cardResult.error) return { success: false, error: cardResult.error }

      const updates = { type: 'text' }
      if (args.text != null) updates.text = args.text
      if (args.title != null) updates.title = args.title
      if (args.bgColor != null) updates.bgColor = args.bgColor
      if (args.textColor != null) updates.textColor = args.textColor

      dispatch({ type: UPDATE_CARD_CONTENT, payload: { id: cardResult.card.id, updates } })
      return { success: true, message: `Updated card content` }
    },
  },

  {
    name: 'update_card_link',
    description: 'Sets or updates the click-through link URL on a card.',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
        cardIndex: { type: 'integer', description: 'Index of the card (0-based)' },
        cardTitle: { type: 'string', description: 'Title/text to match the card' },
        linkUrl: { type: 'string', description: 'The URL to link the card to' },
      },
      required: ['linkUrl'],
    },
    execute(args, { state, dispatch }) {
      const sectionResult = resolveSection(state, args)
      if (sectionResult.error) return { success: false, error: sectionResult.error }
      const cardResult = resolveCard(sectionResult.section, args)
      if (cardResult.error) return { success: false, error: cardResult.error }
      dispatch({ type: UPDATE_CARD_CONTENT, payload: { id: cardResult.card.id, updates: { linkUrl: args.linkUrl } } })
      return { success: true, message: `Set link URL on card` }
    },
  },

  {
    name: 'list_cards',
    description: 'Lists all cards in a section (or all sections if no section specified). Returns card details including type, size, title, text, and link.',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section to list cards from. If omitted, lists all cards.' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
      },
    },
    execute(args, { state }) {
      const sections = args.sectionTitle != null || args.sectionIndex != null
        ? (() => {
            const result = resolveSection(state, args)
            return result.error ? null : [result.section]
          })()
        : state.sections

      if (!sections) {
        const result = resolveSection(state, args)
        return { success: false, error: result.error }
      }

      const data = sections.map(s => ({
        sectionTitle: s.title,
        cards: s.cards.map((c, i) => ({
          index: i,
          bento: c.bento,
          type: c.content.type,
          title: c.content.title || null,
          text: c.content.text || null,
          linkUrl: c.content.linkUrl || null,
          bgColor: c.content.bgColor,
        })),
      }))

      return { success: true, sections: data }
    },
  },

  {
    name: 'move_card',
    description: 'Moves a card to a different position within the same section. Specify the section and provide fromIndex and toIndex (0-based).',
    parameters: {
      type: 'object',
      properties: {
        sectionTitle: { type: 'string', description: 'Title of the section containing the card' },
        sectionIndex: { type: 'integer', description: 'Index of the section (0-based)' },
        fromIndex: { type: 'integer', description: 'Current position of the card (0-based)' },
        toIndex: { type: 'integer', description: 'Target position for the card (0-based)' },
      },
      required: ['fromIndex', 'toIndex'],
    },
    execute(args, { state, dispatch }) {
      const sectionResult = resolveSection(state, args)
      if (sectionResult.error) return { success: false, error: sectionResult.error }

      const { fromIndex, toIndex } = args
      const section = sectionResult.section
      const cardCount = section.cards.length

      if (fromIndex < 0 || fromIndex >= cardCount) {
        const fromPos = fromIndex + 1 // Convert to 1-based for user-friendly message
        return { success: false, error: `Invalid source position ${fromPos}. The "${section.title}" section only has ${cardCount} card${cardCount === 1 ? '' : 's'} (valid positions are 1 to ${cardCount}).` }
      }
      if (toIndex < 0 || toIndex >= cardCount) {
        const toPos = toIndex + 1 // Convert to 1-based for user-friendly message
        return { success: false, error: `Invalid target position ${toPos}. The "${section.title}" section only has ${cardCount} card${cardCount === 1 ? '' : 's'} (valid positions are 1 to ${cardCount}).` }
      }

      dispatch({ type: REORDER_CARDS, payload: { sectionId: section.id, fromIndex, toIndex } })
      const fromPos = fromIndex + 1
      const toPos = toIndex + 1
      return { success: true, message: `Moved card from position ${fromPos} to position ${toPos} in section "${section.title}"` }
    },
  },

  {
    name: 'move_card_to_section',
    description: 'Moves a card from one section to another. Optionally specify the position in the target section.',
    parameters: {
      type: 'object',
      properties: {
        cardIndex: { type: 'integer', description: 'Index of the card to move (0-based)' },
        cardTitle: { type: 'string', description: 'Title or text to match the card' },
        fromSectionTitle: { type: 'string', description: 'Title of the section the card is in' },
        fromSectionIndex: { type: 'integer', description: 'Index of the source section (0-based)' },
        toSectionTitle: { type: 'string', description: 'Title of the target section' },
        toSectionIndex: { type: 'integer', description: 'Index of the target section (0-based)' },
        toIndex: { type: 'integer', description: 'Position in target section (0-based). If omitted, card goes to the end.' },
      },
    },
    execute(args, { state, dispatch }) {
      // Resolve source section
      const fromSectionResult = resolveSection(state, {
        sectionTitle: args.fromSectionTitle,
        sectionIndex: args.fromSectionIndex,
      })
      if (fromSectionResult.error) return { success: false, error: `Source: ${fromSectionResult.error}` }

      // Resolve target section
      const toSectionResult = resolveSection(state, {
        sectionTitle: args.toSectionTitle,
        sectionIndex: args.toSectionIndex,
      })
      if (toSectionResult.error) return { success: false, error: `Target: ${toSectionResult.error}` }

      // Resolve card
      const cardResult = resolveCard(fromSectionResult.section, {
        cardIndex: args.cardIndex,
        cardTitle: args.cardTitle,
      })
      if (cardResult.error) return { success: false, error: cardResult.error }

      // Validate toIndex if provided
      if (args.toIndex != null) {
        const targetCardCount = toSectionResult.section.cards.length
        if (args.toIndex < 0 || args.toIndex > targetCardCount) {
          const toPos = args.toIndex + 1 // Convert to 1-based for user-friendly message
          return { success: false, error: `Invalid target position ${toPos}. The "${toSectionResult.section.title}" section only has ${targetCardCount} card${targetCardCount === 1 ? '' : 's'} (valid positions are 1 to ${targetCardCount + 1}).` }
        }
      }

      dispatch({
        type: MOVE_CARD_TO_SECTION,
        payload: {
          cardId: cardResult.card.id,
          fromSectionId: fromSectionResult.section.id,
          toSectionId: toSectionResult.section.id,
          toIndex: args.toIndex,
        },
      })

      return {
        success: true,
        message: `Moved card from section "${fromSectionResult.section.title}" to section "${toSectionResult.section.title}"`,
      }
    },
  },
]
