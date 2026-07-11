# The 420 Lobby — Money & Food Hacks

A fast Astro + Tailwind CSS guide hub built for Vercel. Methods use Astro content collections, while the private Lobby Control Center manages the public website without requiring Termux or manual Git edits.

## Included

- Responsive phone, tablet, laptop, and wide-desktop layouts
- Compact tablet navigation rail and full desktop sidebar
- Mobile navigation drawer
- Client-side keyword search and category filters
- Markdown guide pages with code blocks and generated table of contents
- The 420 Lobby branding, SEO metadata, social preview, and persistent Discord CTAs
- Private Lobby Control Center with live preview, local drafts, undo/redo, and guarded publishing
- Fast live method status controls for pausing, expiring, verifying, and extending deals

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL Astro prints in the terminal.

## Public environment variables

Create `.env.local` locally:

```env
PUBLIC_DISCORD_INVITE_URL=https://discord.gg/YOUR-PERMANENT-CODE
PUBLIC_SITE_URL=http://localhost:4321
```

The Discord invite can also be set from the Lobby Control Center. When the Control Center invite field is blank, the site falls back to `PUBLIC_DISCORD_INVITE_URL`.

## Add or edit methods

The normal workflow is now:

```text
/control-center → Methods → New Method
```

The dedicated picker groups methods into Active, Expiring Soon, Paused, and Expired. The editor manages title, description, category, badge, keywords, featured/draft state, sort order, Markdown content, and expiration controls.

Methods are stored in `src/content/hacks/` with the existing Markdown content collection. Allowed stable category keys are:

- `cashback-loops`
- `food-hacks`
- `retail-deals`

## Lobby Control Center

The private website editor is available at both:

```text
/control-center
/deal-desk
```

`/deal-desk` remains available as a compatibility route, but the interface is now the complete Lobby Control Center.

### Editable website areas

- Methods and live method status
- Homepage hero, terminal, buttons, trust strip, library copy, and section visibility
- Community name, product name, brand mark, and tagline
- Desktop and mobile navigation labels
- Category labels, descriptions, visibility, and order
- Permanent Discord invite and every Discord CTA
- Footer content
- SEO title, description, and share-image path
- Tested accent-color and page-density presets

### Draft and publishing workflow

Website settings are stored in:

```text
src/data/site-settings.json
```

The Control Center provides:

- Instant phone, tablet, and desktop preview
- Automatic local draft recovery
- Undo and redo
- Discard unpublished changes
- Explicit confirmation before publishing
- Server-side validation so unsafe or malformed settings cannot break the site

Publishing updates the settings file through a secure Vercel Function and starts the normal Vercel rebuild. The current public site stays online during deployment.

### Changes that remain immediate

The following method actions update `src/data/deal-status.json` and affect the public site without waiting for a full rebuild:

- Verify now
- Extend by 1, 6, or 24 hours
- Set a custom expiration
- Clear an expiration timer
- Pause
- Expire now
- Reactivate by verifying or extending

Status-only commits skip the full Vercel build. The public library and guide pages read the latest status through `/api/deal-status`.

## Required private Vercel variables

Add these under **Project → Settings → Environment Variables**:

```env
DEAL_DESK_PASSWORD=use-a-long-private-password
DEAL_DESK_SESSION_SECRET=use-a-separate-random-secret
GITHUB_TOKEN=your-fine-grained-github-token
```

The GitHub token should be fine-grained, limited to this repository, and grant only:

```text
Repository permissions → Contents → Read and write
```

Vercel normally supplies the repository owner and name. These optional variables can override detection after a repository rename:

```env
GITHUB_REPO_OWNER=UglyGameFace
GITHUB_REPO_NAME=Hidden-files
GITHUB_BRANCH=main
```

Never put the password, session secret, or GitHub token in a `PUBLIC_` variable. Variables prefixed with `PUBLIC_` are exposed to browser code.

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Add the public and private variables above.
3. Deploy.
4. Future Control Center publishes and Git pushes create automatic deployments.

## Build commands

```bash
npm run check
npm run build
npm run preview
```

The production site is generated in `dist/`.
