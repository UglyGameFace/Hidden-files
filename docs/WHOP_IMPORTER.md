# Whop → SniperPlug importer

The Whop importer lives inside the password-protected Control Center under **Methods**. It uses Whop OAuth and the official Forum Posts API. It never asks for or stores a Whop password.

## Whop app setup

Create or select a Whop app and register this exact production redirect URI:

```text
https://YOUR-SNIPERPLUG-DOMAIN/api/whop-oauth-callback
```

Request only these OAuth scopes:

```text
openid profile email forum:read
```

Add these private Vercel environment variables:

```env
WHOP_CLIENT_ID=app_xxxxxxxxxxxxx
WHOP_TOKEN_SECRET=use-a-separate-high-entropy-secret
WHOP_REDIRECT_URI=https://YOUR-SNIPERPLUG-DOMAIN/api/whop-oauth-callback
WHOP_OAUTH_SCOPES=openid profile email forum:read
```

`WHOP_TOKEN_SECRET` encrypts the access and refresh tokens stored in the secure, HttpOnly browser session cookie. Never prefix any Whop secret with `PUBLIC_`.

## Owner workflow

1. Unlock `/control-center`.
2. Open **Methods → Import from Whop**.
3. Press **Continue with Whop** and authorize the app on Whop.
4. Paste the exact forum experience ID or a URL containing an ID such as `exp_xxxxxxxxxxxxxx`.
5. Approve or disapprove the exact group source.
6. Approve, disapprove, preview, or undo each post decision.
7. Select a category from the live SniperPlug category registry.
8. Confirm that the posts are owned by you or that you have explicit republication permission.
9. Import the approved posts.

Black Box and Hidden Files appear as the built-in source suggestions. Their exact experience IDs still require one-time approval. Additional groups can be added later through the same explicit source-approval screen.

## Safety rules

- Source approvals are keyed to exact Whop `exp_...` IDs.
- A disapproved or unknown source cannot be scanned or imported through either the UI or a crafted API request.
- Post decisions are reversible before import.
- The browser submits only approved post IDs. The server re-fetches the authoritative posts directly from Whop before saving.
- Every imported post enters SniperPlug as a hidden draft and is never featured automatically.
- Existing imports are updated by Whop source ID and fingerprint instead of duplicated.
- Unicode, emoji, punctuation, paragraphs, Markdown hard breaks, lists, tables, links, blockquotes, and fenced code are checked through the shared formatting-integrity boundary.
- Ambiguous corruption, unsafe publishable HTML, dangerous links, and malformed code fences are blocked for review rather than guessed at.

## Data files

```text
src/data/whop-sources.json   exact approved/disapproved source IDs
src/data/whop-imports.json   source-to-guide deduplication records
src/content/hacks/*.md       imported hidden guide drafts
```

Source-only approval commits skip a Vercel rebuild. Guide imports still trigger the normal site build because they create or update content files.

## Deployment architecture

All Whop browser routes are rewritten to one Vercel Function:

```text
/api/whop?action=...
```

The public compatibility paths remain stable, including `/api/whop-oauth-callback`. Consolidating the actions keeps the Hobby deployment below its direct-function limit without combining the internal OAuth, source-policy, discovery, and import service modules.
