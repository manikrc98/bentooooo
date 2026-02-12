// ── Action Types ─────────────────────────────────────────────────────────────
export const SET_MODE = 'SET_MODE'
export const SELECT_CARD = 'SELECT_CARD'
export const DESELECT_CARD = 'DESELECT_CARD'
export const ADD_CARD = 'ADD_CARD'
export const REMOVE_CARD = 'REMOVE_CARD'
export const RESIZE_CARD = 'RESIZE_CARD'
export const UPDATE_CARD_CONTENT = 'UPDATE_CARD_CONTENT'
export const SAVE = 'SAVE'
export const LOAD_STATE = 'LOAD_STATE'
export const SET_GRID_CONFIG = 'SET_GRID_CONFIG'

// ── Default card content ─────────────────────────────────────────────────────
const COLORS = ['#fde2e4', '#d3e4cd', '#dde1f8', '#fce8c3', '#c9e8f5', '#f5e6d3']
let colorIndex = 0
function nextColor() {
  return COLORS[colorIndex++ % COLORS.length]
}

function makeCard(bento = '1x1') {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    bento,
    content: {
      imageUrl: '',
      title: '',
      bgColor: nextColor(),
      textColor: '#374151',
      linkUrl: '',
    },
  }
}

// ── Initial State ─────────────────────────────────────────────────────────────
export const initialState = {
  mode: 'edit',
  selectedCardId: null,
  isDirty: false,
  gridConfig: {
    columns: 4,
    cellGap: 8,
    aspectRatio: 1,
  },
  cards: [],
  lastSaved: null,
}

// ── Reducer ───────────────────────────────────────────────────────────────────
export function reducer(state, action) {
  switch (action.type) {

    case SET_MODE:
      return {
        ...state,
        mode: action.payload,
        selectedCardId: null, // deselect on mode switch
      }

    case SELECT_CARD:
      return { ...state, selectedCardId: action.payload }

    case DESELECT_CARD:
      return { ...state, selectedCardId: null }

    case ADD_CARD:
      return {
        ...state,
        cards: [...state.cards, makeCard('1x1')],
        isDirty: true,
      }

    case REMOVE_CARD:
      return {
        ...state,
        cards: state.cards.filter(c => c.id !== action.payload),
        selectedCardId: state.selectedCardId === action.payload ? null : state.selectedCardId,
        isDirty: true,
      }

    case RESIZE_CARD:
      return {
        ...state,
        cards: state.cards.map(c =>
          c.id === action.payload.id ? { ...c, bento: action.payload.bento } : c
        ),
        isDirty: true,
      }

    case UPDATE_CARD_CONTENT:
      return {
        ...state,
        cards: state.cards.map(c =>
          c.id === action.payload.id
            ? { ...c, content: { ...c.content, ...action.payload.updates } }
            : c
        ),
        isDirty: true,
      }

    case SAVE:
      return { ...state, isDirty: false, lastSaved: new Date().toISOString() }

    case LOAD_STATE:
      return {
        ...state,
        cards: action.payload.cards ?? state.cards,
        gridConfig: action.payload.gridConfig ?? state.gridConfig,
        isDirty: false,
        lastSaved: action.payload.savedAt ?? null,
      }

    case SET_GRID_CONFIG:
      return {
        ...state,
        gridConfig: { ...state.gridConfig, ...action.payload },
        isDirty: true,
      }

    default:
      return state
  }
}
