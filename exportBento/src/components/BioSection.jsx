export default function BioSection({ bio }) {
  if (!bio) return null

  return (
    <div className="bio-sidebar shrink-0 w-64 sticky top-0 self-start">
      {/* Avatar */}
      {bio.avatar && (
        <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100">
          <img src={bio.avatar} alt="Avatar" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Name */}
      {bio.name && (
        <h2 className="mt-4 text-2xl font-bold text-zinc-800">{bio.name}</h2>
      )}

      {/* Description */}
      {bio.description && (
        <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{bio.description}</p>
      )}

      {/* Content blocks */}
      {bio.blocks?.length > 0 && (
        <div className="mt-6 space-y-5">
          {bio.blocks.map(block => (
            <div key={block.id}>
              {block.heading && (
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{block.heading}</h3>
              )}
              {block.body && (
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{block.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
