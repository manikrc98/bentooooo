import { SET_BIO, CLEAR_BIO } from '../../store/cardStore.js'

export const bioPlugins = [
  {
    name: 'set_bio_info',
    description: 'Sets or updates the bio name and/or description. If bio does not exist, it will be created.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Display name' },
        description: { type: 'string', description: 'Short bio description' },
      },
    },
    execute(args, { state, dispatch }) {
      const updates = {}
      if (args.name != null) updates.name = args.name
      if (args.description != null) updates.description = args.description
      // Initialize blocks array if bio doesn't exist yet
      if (!state.bio) {
        updates.avatar = ''
        updates.blocks = updates.blocks || []
      }
      dispatch({ type: SET_BIO, payload: updates })
      return { success: true, message: `Updated bio info` }
    },
  },

  {
    name: 'add_bio_block',
    description: 'Adds a new content block (heading + body text) to the bio section.',
    parameters: {
      type: 'object',
      properties: {
        heading: { type: 'string', description: 'Block heading' },
        body: { type: 'string', description: 'Block body text' },
      },
      required: ['heading', 'body'],
    },
    execute(args, { state, dispatch }) {
      const currentBlocks = state.bio?.blocks || []
      const newBlock = { id: crypto.randomUUID(), heading: args.heading, body: args.body }
      dispatch({
        type: SET_BIO,
        payload: {
          blocks: [...currentBlocks, newBlock],
          // Ensure bio exists with defaults if it's new
          ...(!state.bio ? { avatar: '', name: '', description: '' } : {}),
        },
      })
      return { success: true, message: `Added bio block "${args.heading}"` }
    },
  },

  {
    name: 'update_bio_block',
    description: 'Updates an existing bio block by index. Can update heading and/or body.',
    parameters: {
      type: 'object',
      properties: {
        blockIndex: { type: 'integer', description: 'Index of the block to update (0-based)' },
        heading: { type: 'string', description: 'New heading (optional)' },
        body: { type: 'string', description: 'New body text (optional)' },
      },
      required: ['blockIndex'],
    },
    execute(args, { state, dispatch }) {
      const blocks = state.bio?.blocks || []
      if (args.blockIndex < 0 || args.blockIndex >= blocks.length) {
        return { success: false, error: `Block index ${args.blockIndex} out of range. Bio has ${blocks.length} blocks.` }
      }
      const updated = blocks.map((b, i) => {
        if (i !== args.blockIndex) return b
        return {
          ...b,
          ...(args.heading != null ? { heading: args.heading } : {}),
          ...(args.body != null ? { body: args.body } : {}),
        }
      })
      dispatch({ type: SET_BIO, payload: { blocks: updated } })
      return { success: true, message: `Updated bio block at index ${args.blockIndex}` }
    },
  },

  {
    name: 'remove_bio_block',
    description: 'Removes a bio block by index.',
    parameters: {
      type: 'object',
      properties: {
        blockIndex: { type: 'integer', description: 'Index of the block to remove (0-based)' },
      },
      required: ['blockIndex'],
    },
    execute(args, { state, dispatch }) {
      const blocks = state.bio?.blocks || []
      if (args.blockIndex < 0 || args.blockIndex >= blocks.length) {
        return { success: false, error: `Block index ${args.blockIndex} out of range. Bio has ${blocks.length} blocks.` }
      }
      dispatch({ type: SET_BIO, payload: { blocks: blocks.filter((_, i) => i !== args.blockIndex) } })
      return { success: true, message: `Removed bio block at index ${args.blockIndex}` }
    },
  },

  {
    name: 'clear_bio',
    description: 'Removes the entire bio section from the portfolio.',
    parameters: { type: 'object', properties: {} },
    execute(_args, { dispatch }) {
      dispatch({ type: CLEAR_BIO })
      return { success: true, message: 'Cleared bio section' }
    },
  },

  {
    name: 'get_bio',
    description: 'Returns the current bio information (name, description, blocks).',
    parameters: { type: 'object', properties: {} },
    execute(_args, { state }) {
      if (!state.bio) return { success: true, bio: null, message: 'No bio section exists yet.' }
      return {
        success: true,
        bio: {
          name: state.bio.name || '',
          description: state.bio.description || '',
          hasAvatar: !!state.bio.avatar,
          blocks: (state.bio.blocks || []).map((b, i) => ({
            index: i,
            heading: b.heading,
            body: b.body,
          })),
        },
      }
    },
  },
]
