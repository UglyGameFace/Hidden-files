# The 420 Lobby — Money & Food Hacks

A fast, static Astro + Tailwind CSS guide hub built for Vercel. It uses Astro content collections, so adding a guide is as simple as adding a Markdown file.

## Included

- Responsive phone, tablet, laptop, and wide-desktop layouts
- Compact tablet navigation rail and full desktop sidebar
- Mobile navigation drawer
- Client-side keyword search and category filters
- Markdown guide pages with code blocks and generated table of contents
- The 420 Lobby branding, SEO metadata, social preview, and persistent Discord CTAs
- Fully static output with very little browser JavaScript

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL Astro prints in the terminal.

## Add your permanent Discord invite

Create `.env.local` locally:

```env
PUBLIC_DISCORD_INVITE_URL=https://discord.gg/YOUR-PERMANENT-CODE
PUBLIC_SITE_URL=http://localhost:4321
```

In Vercel, add the same values under **Project → Settings → Environment Variables**. Use your unlimited-use Discord invite for `PUBLIC_DISCORD_INVITE_URL`.

## Add a guide

Create a new `.md` file inside `src/content/hacks/`:

```md
---
title: "Your Guide Title"
description: "One clear sentence used on the guide card and in search results."
category: "food-hacks"
featured: false
badge: "New"
keywords: ["restaurant", "coupon", "pickup"]
published: 2026-07-10
updated: 2026-07-12
readTime: "6 min"
order: 10
---

## First section

Write the guide in Markdown.

```text
Code blocks are supported.
```
```

Allowed categories:

- `cashback-loops`
- `food-hacks`
- `retail-deals`

Set `draft: true` to keep a guide out of production.

## Deploy to Vercel

1. Upload this folder to a new GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Vercel should detect Astro automatically.
4. Add the two public environment variables above.
5. Deploy. Future Git pushes will create automatic deployments.

No Vercel adapter is required for this fully static version.

## Build commands

```bash
npm run check
npm run build
npm run preview
```

The production site is generated in `dist/`.
