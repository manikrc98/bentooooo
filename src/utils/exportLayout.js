const CDN = 'https://cdn.jsdelivr.net/npm/@bentogrid/core@1.1.1/BentoGrid.min.js'

/**
 * Generate a self-contained HTML file from the current layout.
 * The result works with zero build steps — just open in a browser.
 */
export function generateExportHTML(cards, gridConfig) {
  const { columns, cellGap, aspectRatio } = gridConfig

  const cardsHTML = cards
    .map(({ bento, content }) => {
      const bg = content.imageUrl
        ? `background-image:url('${content.imageUrl}');background-size:cover;background-position:center;`
        : `background-color:${content.bgColor};`
      const title = content.title
        ? `<p style="font-weight:600;font-size:1rem;color:${content.textColor}">${escapeHTML(content.title)}</p>`
        : ''
      const body = content.body
        ? `<p style="font-size:0.875rem;opacity:0.75;color:${content.textColor}">${escapeHTML(content.body)}</p>`
        : ''
      return `  <div data-bento="${bento}" style="${bg}border-radius:16px;padding:20px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;">
    ${title}
    ${body}
  </div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bento Layout</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; min-height: 100vh; padding: 32px; font-family: system-ui, sans-serif; }
    #grid { max-width: 900px; margin: 0 auto; }
    #grid > * { border-radius: 16px; }
  </style>
</head>
<body>
  <div id="grid" class="bentogrid">
${cardsHTML}
  </div>
  <script src="${CDN}"></script>
  <script>
    new BentoGrid({
      target: '#grid',
      columns: ${columns},
      cellGap: ${cellGap},
      aspectRatio: ${aspectRatio},
    });
  </script>
</body>
</html>`
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Trigger a browser download of the generated HTML
 */
export function downloadHTML(cards, gridConfig) {
  const html = generateExportHTML(cards, gridConfig)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'bento-layout.html'
  a.click()
  URL.revokeObjectURL(url)
}
