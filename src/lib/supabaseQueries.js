import { supabase } from './supabase.js'

// ── LOAD ──────────────────────────────────────────────────────────────────────

export async function loadProfileByUsername(username) {
  // 1. Get profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, grid_columns, grid_cell_gap, grid_aspect_ratio')
    .eq('username', username)
    .single()

  if (error || !profile) return { profile: null, profileData: null }

  // 2. Parallel fetch: bio + sections
  const [bioResult, sectionsResult] = await Promise.all([
    supabase.from('bios').select('*').eq('profile_id', profile.id).maybeSingle(),
    supabase.from('sections').select('*').eq('profile_id', profile.id).order('sort_order'),
  ])

  const bio = bioResult.data
  const sections = sectionsResult.data || []
  const sectionIds = sections.map(s => s.id)

  // 3. Parallel fetch: bio_blocks + cards
  const [blocksResult, cardsResult] = await Promise.all([
    bio
      ? supabase.from('bio_blocks').select('*').eq('bio_id', bio.id).order('sort_order')
      : Promise.resolve({ data: [] }),
    sectionIds.length > 0
      ? supabase.from('cards').select('*').in('section_id', sectionIds).order('sort_order')
      : Promise.resolve({ data: [] }),
  ])

  // 4. Group cards by section
  const cardsBySection = {}
  for (const card of cardsResult.data || []) {
    if (!cardsBySection[card.section_id]) cardsBySection[card.section_id] = []
    cardsBySection[card.section_id].push({
      id: card.id,
      bento: card.bento,
      content: {
        type: card.content_type,
        imageUrl: card.image_url,
        videoUrl: card.video_url,
        text: card.text_body,
        title: card.title,
        bgColor: card.bg_color,
        textColor: card.text_color,
        linkUrl: card.link_url,
        manualFontSize: card.manual_font_size ?? null,
        mediaScale: card.media_scale ?? 1,
        mediaOffsetX: card.media_offset_x ?? 0,
        mediaOffsetY: card.media_offset_y ?? 0,
      },
    })
  }

  // 5. Assemble into reducer-compatible shape
  const profileData = {
    sections: sections.map(s => ({
      id: s.id,
      title: s.title,
      cards: cardsBySection[s.id] || [],
    })),
    bio: bio
      ? {
          avatar: bio.avatar_url,
          name: bio.name,
          description: bio.description,
          blocks: (blocksResult.data || []).map(b => ({
            id: b.id,
            heading: b.heading,
            body: b.body,
            links: b.links || [],
            formatting: b.formatting || [],
          })),
        }
      : null,
    gridConfig: {
      columns: profile.grid_columns,
      cellGap: profile.grid_cell_gap,
      aspectRatio: profile.grid_aspect_ratio,
    },
  }

  return { profile, profileData }
}

// ── SAVE ──────────────────────────────────────────────────────────────────────

export async function saveProfile(profileUserId, state) {
  const { sections, bio, gridConfig } = state

  // 1. Update grid config on profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      grid_columns: gridConfig.columns,
      grid_cell_gap: gridConfig.cellGap,
      grid_aspect_ratio: gridConfig.aspectRatio,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileUserId)
  if (profileError) throw new Error(`[profiles.update] ${profileError.message}`)

  // 2. Fetch current DB state for diffing
  const [currentSectionsRes, currentBioRes] = await Promise.all([
    supabase.from('sections').select('id').eq('profile_id', profileUserId),
    supabase.from('bios').select('id').eq('profile_id', profileUserId).maybeSingle(),
  ])

  const currentSectionIds = new Set((currentSectionsRes.data || []).map(s => s.id))
  const stateSectionIds = new Set(sections.map(s => s.id))

  // 3. Delete removed sections (CASCADE deletes their cards)
  const sectionsToDelete = [...currentSectionIds].filter(id => !stateSectionIds.has(id))
  if (sectionsToDelete.length > 0) {
    const { error: delSecErr } = await supabase.from('sections').delete().in('id', sectionsToDelete)
    if (delSecErr) throw new Error(`[sections.delete] ${delSecErr.message}`)
  }

  // 4. Upsert sections
  if (sections.length > 0) {
    const sectionRows = sections.map((s, i) => ({
      id: s.id,
      profile_id: profileUserId,
      title: s.title,
      sort_order: i,
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('sections').upsert(sectionRows, { onConflict: 'id' })
    if (error) throw new Error(`[sections.upsert] ${error.message}`)
  }

  // 5. Diff cards within surviving sections
  let currentCardIds = new Set()
  if (sections.length > 0) {
    const sIds = sections.map(s => s.id)
    const { data: currentCards } = await supabase
      .from('cards')
      .select('id')
      .in('section_id', sIds)
    currentCardIds = new Set((currentCards || []).map(c => c.id))
  }

  const stateCardIds = new Set(sections.flatMap(s => s.cards.map(c => c.id)))
  const cardsToDelete = [...currentCardIds].filter(id => !stateCardIds.has(id))
  if (cardsToDelete.length > 0) {
    const { error: delCardErr } = await supabase.from('cards').delete().in('id', cardsToDelete)
    if (delCardErr) throw new Error(`[cards.delete] ${delCardErr.message}`)
  }

  // 6. Upsert all cards
  const cardRows = sections.flatMap(section =>
    section.cards.map((card, ci) => ({
      id: card.id,
      section_id: section.id,
      bento: card.bento,
      sort_order: ci,
      content_type: card.content.type,
      image_url: card.content.imageUrl,
      video_url: card.content.videoUrl,
      text_body: card.content.text,
      title: card.content.title,
      bg_color: card.content.bgColor,
      text_color: card.content.textColor,
      link_url: card.content.linkUrl,
      manual_font_size: card.content.manualFontSize ?? null,
      media_scale: card.content.mediaScale ?? 1,
      media_offset_x: card.content.mediaOffsetX ?? 0,
      media_offset_y: card.content.mediaOffsetY ?? 0,
      updated_at: new Date().toISOString(),
    }))
  )
  if (cardRows.length > 0) {
    const { error } = await supabase.from('cards').upsert(cardRows, { onConflict: 'id' })
    if (error) throw new Error(`[cards.upsert] ${error.message}`)
  }

  // 7. Handle bio
  if (bio === null) {
    if (currentBioRes.data) {
      const { error: delBioErr } = await supabase.from('bios').delete().eq('profile_id', profileUserId)
      if (delBioErr) throw new Error(`[bios.delete] ${delBioErr.message}`)
    }
  } else {
    const bioRow = {
      profile_id: profileUserId,
      avatar_url: bio.avatar,
      name: bio.name,
      description: bio.description,
      updated_at: new Date().toISOString(),
    }

    let bioId
    if (currentBioRes.data) {
      bioId = currentBioRes.data.id
      const { error: updateBioErr } = await supabase.from('bios').update(bioRow).eq('id', bioId)
      if (updateBioErr) throw new Error(`[bios.update] ${updateBioErr.message}`)
    } else {
      const { data: newBio, error } = await supabase
        .from('bios')
        .insert(bioRow)
        .select('id')
        .single()
      if (error) throw new Error(`[bios.insert] ${error.message}`)
      bioId = newBio.id
    }

    // Diff bio blocks
    const { data: currentBlocks } = await supabase
      .from('bio_blocks')
      .select('id')
      .eq('bio_id', bioId)
    const currentBlockIds = new Set((currentBlocks || []).map(b => b.id))
    const stateBlockIds = new Set((bio.blocks || []).map(b => b.id))

    const blocksToDelete = [...currentBlockIds].filter(id => !stateBlockIds.has(id))
    if (blocksToDelete.length > 0) {
      const { error: delBlockErr } = await supabase.from('bio_blocks').delete().in('id', blocksToDelete)
      if (delBlockErr) throw new Error(`[bio_blocks.delete] ${delBlockErr.message}`)
    }

    if (bio.blocks && bio.blocks.length > 0) {
      const blockRows = bio.blocks.map((block, i) => ({
        id: block.id,
        bio_id: bioId,
        heading: block.heading,
        body: block.body,
        sort_order: i,
        links: block.links || [],
        formatting: block.formatting || [],
      }))
      const { error } = await supabase
        .from('bio_blocks')
        .upsert(blockRows, { onConflict: 'id' })
      if (error) throw new Error(`[bio_blocks.upsert] ${error.message}`)
    }
  }
}
