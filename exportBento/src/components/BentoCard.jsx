import { clampBento } from '../utils/bentoDimensions.js'

export default function BentoCard({ card, maxColumns }) {
  const { bento, content } = card
  const { imageUrl, title, bgColor, textColor, linkUrl } = content

  const Tag = linkUrl ? 'a' : 'div'
  const linkProps = linkUrl
    ? { href: linkUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Tag
      data-bento={clampBento(bento, maxColumns)}
      {...linkProps}
      className="bento-card block relative rounded-2xl overflow-hidden"
      style={{
        backgroundColor: bgColor,
        backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {imageUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      )}

      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <span
            className="inline-block text-sm font-medium px-2.5 py-1 rounded-full backdrop-blur-sm bg-white/90 shadow-sm"
            style={{ color: textColor }}
          >
            {title}
          </span>
        </div>
      )}
    </Tag>
  )
}
