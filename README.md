# The 420 Lobby — Money & Food Hacks

A fast Astro + Tailwind CSS guide hub built for Vercel. Methods use Astro content collections, while the private Lobby Control Center manages the public website without requiring Termux or manual Git edits.

## Included

- Responsive phone, small-phone, tablet, laptop, short-screen, and wide-desktop layouts
- Compact tablet navigation rail and full desktop sidebar on the public site
- Full-width private Control Center application shell
- Mobile navigation drawer with safe-area support
- Shared page registry that exposes Home, Guide Library, published guides, and the Owner Control Center on desktop, tablet, and mobile
- Dynamic custom categories shared by the method editor, public filters, navigation, cards, and guide pages
- Client-side keyword search and category filters
- Markdown guide pages with code blocks, overflow-safe tables, and generated table of contents
- The 420 Lobby branding, SEO metadata, social preview, and persistent Discord CTAs
- Private Lobby Control Center with live preview, local drafts, undo/redo, and guarded publishing
- Fast live method status controls for pausing, expiring, verifying, and extending deals
- Build-time conflict, navigation, category, and layout regression audit

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

The normal workflow is:

```text
/control-center → Methods → New Method
```

The dedicated picker groups methods into Active, Expiring Soon, Paused, and Expired. The editor manages title, description, category, badge, keywords, featured/draft state, sort order, Markdown content, and expiration controls.

Methods are stored in `src/content/hacks/` with the Astro Markdown content collection.

### Add a custom category while creating a method

From the method editor:

```text
Category → Add custom category → Create and select
```

Enter the full label, short label, description, icon, and accent. Saving the method commits the new category, the method, and its live-status registration together. Vercel therefore never receives a guide that references a missing category.

### Manage all categories

From the owner editor:

```text
/control-center → Categories
```

Every category can be renamed, described, styled, reordered, shown, or hidden. Custom categories use safe lowercase slug keys generated from their labels. Hidden categories remain available to older methods so archived organization changes cannot break guide pages.

The starter categories are:

- `cashback-loops`
- `food-hacks`
- `retail-deals`

They are defaults, not the only allowed categories.

## Public and owner navigation

Navigation is centralized in:

```text
src/navigation.ts
```

The public desktop/tablet sidebar and mobile drawer automatically expose:

- Home
- Guide Library / All Hacks
- Every visible category, including custom categories
- Every managed, published guide page
- The private Owner Control Center entry point

Paused and expired guide buttons are hidden through `/api/deal-status`. The Control Center keeps all eight owner sections visible across phone, tablet, laptop, and desktop layouts, and includes shortcuts back to the live site and guide library.

The build audit verifies that public navigation, mobile navigation, Control Center sections, dynamic categories, and the shared registry remain connected. New managed guides and categories therefore do not require separate sidebar or mobile-menu edits.

## Lobby Control Center

The private website editor is available at:

```text
/control-center
```

The legacy `/deal-desk` address permanently redirects to `/control-center`, so there is only one editor route and one set of loaded styles/scripts.

### Editable website areas

- Methods and live method status
- Homepage hero, terminal, buttons, trust strip, library copy, and section visibility
- Community name, product name, brand mark, and tagline
- Desktop and mobile navigation labels
- Category creation, labels, descriptions, icons, accents, visibility, and order
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
- Protection against one tab/device overwriting a newer publish from another
- Preservation of categories created from the method editor during concurrent settings publishing
- Stale-draft preservation instead of silently replacing newer public settings
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
4. Future Control Center publishes and `main` branch pushes create automatic production deployments.

Status-only commits can skip a full rebuild. Method content, category, and website-setting changes trigger the normal production build.

## Build and audit commands

```bash
npm run audit
npm run check
npm run build
npm run preview
```

`npm run check` and `npm run build` automatically run the site audit first. The audit rejects obsolete Deal Desk imports, fixed three-category schemas, unsafe category keys, unsupported category icons/accents, non-atomic category saves, duplicate modal ownership, unbalanced CSS, mismatched Control Center tabs/panels, disconnected public or owner navigation, invalid settings structure, browser-script syntax errors, and missing draft/concurrency safeguards.

The production site is generated in `dist/`.
