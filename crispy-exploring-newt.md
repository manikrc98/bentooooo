# Supabase Integration Plan: Multi-User Bento Builder

## Context
The bento builder currently saves everything to the local filesystem via a Vite dev server API plugin (`server/apiPlugin.js` → `exportBento/src/data.json` + `exportBento/public/assets/`). We're replacing this with Supabase to enable:
- **Multi-user**: Each Google account gets their own portfolio at `app.com/:username`
- **Cloud persistence**: JSON config in Supabase DB, assets in Supabase Storage
- **Public portfolios**: Anyone can view; only the owner can edit after logging in
- **GitHub Pages deployment**: Fully static, no server-side code

---

## Implementation Steps

### 1. Install Dependencies
```
npm install @supabase/supabase-js react-router-dom
```

### 2. Supabase Project Setup (Manual — Dashboard + SQL Editor)
- Create Supabase project, enable Google OAuth provider
- Set redirect URL to the GitHub Pages URL
- Create `profiles` table:
  - `id` (UUID, FK to auth.users), `username` (TEXT, UNIQUE), `config` (JSONB), `updated_at`
  - RLS: public SELECT, owner-only INSERT/UPDATE
- Create `bento-assets` storage bucket (public reads, owner-only uploads by folder path `{user_id}/...`)
- Create trigger `handle_new_user()` to auto-create a profile row on signup (username derived from email)
- SQL provided in implementation

### 3. Supabase Client Config
- **New**: `src/lib/supabase.js` — `createClient()` with env vars
- **New**: `.env.local` + `.env.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### 4. Auth Context
- **New**: `src/contexts/AuthContext.jsx`
- Provides `{ user, profile, loading, signInWithGoogle, signOut }` via React context
- Listens to `supabase.auth.onAuthStateChange`, fetches profile row on login

### 5. Routing
- **Modify**: `src/main.jsx` — Add `AuthProvider` wrapper + `react-router-dom` router
  - `/` → `LandingPage` (sign in CTA, redirects to `/:username` if logged in)
  - `/:username` → `ProfilePage` (loads profile from Supabase, determines ownership, renders App)
- **New**: `src/pages/LandingPage.jsx` — Simple hero + Google sign-in button
- **New**: `src/pages/ProfilePage.jsx` — Fetches profile by username, passes `profileData`, `isOwner` to App

### 6. Rewrite Persistence Hook
- **Modify**: `src/hooks/usePersistence.js`
  - **Load**: Hydrate state from `profileData.config` (passed as prop) instead of `/api/load`
  - **Save (Publish)**:
    1. Collect blob URLs from state (reuse existing `collectBlobUrls`)
    2. Upload each blob directly to Supabase Storage (`bento-assets/{userId}/...`)
    3. Replace blob URLs with Supabase public URLs in config
    4. Write config to `profiles` table via `supabase.from('profiles').update()`
  - Remove `blobToBase64` — upload blobs directly (no base64 conversion needed)

### 7. Refactor App.jsx for Auth + Ownership
- **Modify**: `src/App.jsx`
  - Accept `profileData`, `isOwner`, `username` props from ProfilePage
  - Compute `effectiveMode = isOwner ? mode : 'preview'` and pass everywhere
  - Pass `isOwner` to TopBar for conditional button rendering
  - Gate FloatingTray on `isOwner`
  - Pass auth callbacks to TopBar

### 8. Update TopBar with Auth UI
- **Modify**: `src/components/TopBar.jsx`
  - Add `isOwner`, `user`, `onSignIn`, `onSignOut`, `username` props
  - Show username slug next to logo (`/ username`)
  - Show mode toggle + Reset + Publish buttons **only when `isOwner`**
  - Rename "Save" → "Publish"
  - Add small sign-in button (top-right) when logged out
  - Add avatar + sign-out button when logged in

### 9. Guard Edit UI in Child Components
- **Modify**: `src/components/BentoCanvas.jsx` — Pass `effectiveMode` (not raw `mode`) to children
- **Modify**: `src/components/BioSection.jsx` — Same; hide "Add bio" CTA for non-owners
- **Modify**: `src/components/SectionGrid.jsx` / `SectionHeader.jsx` — Hide add/delete/edit controls

The key insight: since existing components already check `mode === 'edit'`, we just pass `effectiveMode` which is forced to `'preview'` for non-owners. Minimal changes needed.

### 10. Image Compression (Storage Optimization)
- **New**: `src/utils/imageCompression.js` — Canvas-based resize (max 1200px) + WebP conversion
- **Modify**: `src/components/FloatingTray.jsx` — Compress images before `URL.createObjectURL`
- **Modify**: `src/components/BioSection.jsx` — Same for avatar upload
- Videos are not compressed (pass through as-is)

### 11. Cleanup
- **Delete**: `server/apiPlugin.js` — No longer needed
- **Delete**: `exportBento/` — Entire directory (replaced by Supabase)
- **Modify**: `vite.config.js` — Remove `apiPlugin` import/usage, add `base` for GitHub Pages

### 12. GitHub Pages Deployment
- **New**: `.github/workflows/deploy.yml` — Build + copy `404.html` + deploy to Pages
- **Modify**: `package.json` — Update build script: `"build": "vite build && cp dist/index.html dist/404.html"`
- **Modify**: `vite.config.js` — Set `base: '/<repo-name>/'`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as GitHub repo secrets

---

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| New | `src/lib/supabase.js` | Supabase client singleton |
| New | `src/contexts/AuthContext.jsx` | Auth provider + useAuth hook |
| New | `src/pages/LandingPage.jsx` | Landing page with sign-in |
| New | `src/pages/ProfilePage.jsx` | Profile loader + ownership check |
| New | `src/utils/imageCompression.js` | Client-side image optimization |
| New | `.env.local`, `.env.example` | Supabase env vars |
| New | `.github/workflows/deploy.yml` | GitHub Pages CI/CD |
| Modify | `src/main.jsx` | Add AuthProvider + Router |
| Modify | `src/App.jsx` | Accept props, gate on isOwner |
| Modify | `src/hooks/usePersistence.js` | Supabase Storage + DB persistence |
| Modify | `src/components/TopBar.jsx` | Auth buttons, conditional edit UI |
| Modify | `src/components/BentoCanvas.jsx` | Pass effectiveMode |
| Modify | `src/components/BioSection.jsx` | Gate edit UI on ownership |
| Modify | `vite.config.js` | Remove apiPlugin, add base |
| Modify | `package.json` | New deps, build script |
| Delete | `server/apiPlugin.js` | Replaced by Supabase |
| Delete | `exportBento/` | Replaced by Supabase |

---

## Verification
1. **Local dev**: Run `npm run dev`, sign in with Google, create a bento, publish — verify config appears in Supabase dashboard (profiles table + storage bucket)
2. **Multi-user**: Sign in with a different Google account, verify separate profile created
3. **Public view**: Open `/:username` in incognito — verify read-only view loads, no edit UI visible
4. **Auth flow**: Click sign-in button as visitor, log in, verify edit mode activates if viewing own profile
5. **Asset persistence**: Upload images/videos, publish, refresh page — verify assets load from Supabase Storage URLs
6. **GitHub Pages**: Push to main, verify GitHub Actions deploys, test OAuth redirect works on deployed URL
