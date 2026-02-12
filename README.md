# BentoBuilder

A visual bento grid layout builder built with React. Design, customize, and export responsive grid-based card layouts through an intuitive drag-and-click interface.

![React](https://img.shields.io/badge/React-18.3-blue) ![Vite](https://img.shields.io/badge/Vite-6.0-purple) ![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-cyan)

## What is BentoBuilder?

BentoBuilder lets you visually create bento-style grid layouts — the kind you see on modern dashboards, portfolios, and landing pages. You add cards to a responsive grid, customize their size, color, images, captions, and links, then export the result as a standalone HTML file.

## Features

- **Visual Grid Editor** — Add and arrange cards on a responsive bento grid
- **Card Customization** — Set background colors, images, captions, and clickable links per card
- **9 Size Presets** — Resize cards from 1x1 up to 4x2 using the floating tray
- **Edit / Preview Toggle** — Switch between editing and previewing your final layout
- **Responsive Layout** — Grid automatically adapts column count based on container width (min 160px/column)
- **Dynamic Add Buttons** — Empty grid cells show "+" buttons in edit mode for easy card placement
- **LocalStorage Persistence** — Your layout is saved locally and restored on next visit
- **HTML Export** — Download your layout as a self-contained HTML file (includes BentoGrid via CDN)
- **Image Upload** — Upload local images as card backgrounds with automatic gradient overlay for text readability

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3 |
| Grid Engine | [@bentogrid/core](https://www.npmjs.com/package/@bentogrid/core) |
| Icons | [Lucide React](https://lucide.dev/) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repo-url>
cd bentooooo
npm install
```

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173` with hot module replacement.

### Build

```bash
npm run build
```

Outputs production-ready files to `dist/`.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── main.jsx                  # React entry point
├── App.jsx                   # Root component, state provider
├── index.css                 # Tailwind directives & custom styles
├── components/
│   ├── TopBar.jsx            # Header: mode toggle, save, export
│   ├── BentoCanvas.jsx       # Main grid container
│   ├── BentoCard.jsx         # Individual card (image, caption, link)
│   ├── FloatingTray.jsx      # Bottom editing tray (size, image, link, delete)
│   └── AddCardButton.jsx     # "+" button for empty grid cells
├── hooks/
│   ├── useBentoGrid.js       # BentoGrid layout engine integration
│   ├── useCardSelection.js   # Click-outside & escape-key deselection
│   └── usePersistence.js     # localStorage save/load & HTML export
├── store/
│   └── cardStore.js          # Reducer-based state management
└── utils/
    ├── bentoDimensions.js    # Parse/format/clamp bento size strings
    └── exportLayout.js       # Generate & download standalone HTML
```

## Architecture

### State Management

The app uses a React `useReducer`-based store (no external state library). State shape:

```js
{
  mode: 'edit' | 'preview',
  selectedCardId: string | null,
  isDirty: boolean,
  gridConfig: { columns: 4, cellGap: 8, aspectRatio: 1 },
  cards: [{ id, bento, content: { imageUrl, title, bgColor, textColor, linkUrl } }],
  lastSaved: string | null
}
```

**Actions:** `SET_MODE`, `SELECT_CARD`, `DESELECT_CARD`, `ADD_CARD`, `REMOVE_CARD`, `RESIZE_CARD`, `UPDATE_CARD_CONTENT`, `SAVE`, `LOAD_STATE`, `SET_GRID_CONFIG`

### Grid Engine

The layout is powered by `@bentogrid/core`, which calculates CSS Grid positions for arbitrarily-sized cards. The `useBentoGrid` hook:

1. Creates a BentoGrid instance targeting the grid container
2. Recalculates layout whenever cards or grid config change
3. Uses `ResizeObserver` to dynamically adjust column count based on available width
4. Injects filler elements and add-card buttons into empty cells

### Responsive Behavior

- Container width is divided by a minimum column width (160px) to determine column count
- Cards with dimensions exceeding available columns are automatically clamped (e.g., a 3x2 card in a 2-column layout renders as 2x2)
- Layout recalculates on window resize via `ResizeObserver`

### Persistence

- **Save:** Stores `cards` and `gridConfig` to localStorage under key `bento_builder_state_v2`
- **Load:** Restores state on app mount; fails gracefully on corrupt data
- **Export:** Generates a self-contained HTML file embedding the BentoGrid CDN script, card data, and inline styles

## How It Works

### Edit Mode

1. Click **"+"** buttons in empty grid cells to add cards (each new card gets a color from a rotating 6-color pastel palette)
2. Click a card to select it — a blue ring appears and the **floating tray** slides up from the bottom
3. From the floating tray, you can:
   - **Delete** the card
   - **Upload an image** as the card background
   - **Add a link URL** for the card
   - **Resize** using 9 preset dimensions (1x1 through 4x2)
4. Click directly on a card's caption area to edit the title text
5. Click outside or press **Escape** to deselect

### Preview Mode

- Cards render in their final form with no editing controls
- Cards with a `linkUrl` become clickable `<a>` tags
- Captions display as rounded badges at the bottom of each card

### Saving & Exporting

- The **Save** button in the top bar persists your layout to localStorage (button highlights blue when there are unsaved changes)
- The **Export** button downloads a portable `.html` file you can open in any browser or host anywhere

## Card Properties

| Property | Description | Default |
|----------|-------------|---------|
| `bento` | Grid size as `"colsxrows"` (e.g., `"2x3"`) | `"1x1"` |
| `bgColor` | Background color (hex) | Rotating pastel palette |
| `textColor` | Caption text color (hex) | `#374151` |
| `imageUrl` | Background image (blob URL from upload) | Empty |
| `title` | Caption text | Empty |
| `linkUrl` | Click-through URL (preview mode) | Empty |

## License

Private project.
