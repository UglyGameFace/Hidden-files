# Whop → The 420 Lobby Hacks importer

The Whop importer lives inside the password-protected Control Center under **Methods** on `https://the-420-lobby-hacks.vercel.app/`. It uses Whop OAuth and official Whop APIs. It never asks for or stores a Whop password.

## Whop app setup

Create or select a Whop app and register this exact production redirect URI:

```text
https://the-420-lobby-hacks.vercel.app/api/whop-oauth-callback
```

Request these OAuth scopes:

```text
openid profile email forum:read member:basic:read member:email:read
```

`member:basic:read` and `member:email:read` are required by Whop's membership-list endpoint, which is used only to identify the companies the connected account has joined. The importer discards membership user/email fields server-side and returns only sanitized group, product-count, forum, and approval metadata to the browser.

Add these private Vercel environment variables:

```env
WHOP_CLIENT_ID=app_xxxxxxxxxxxxx
WHOP_TOKEN_SECRET=use-a-separate-high-entropy-secret
WHOP_REDIRECT_URI=https://the-420-lobby-hacks.vercel.app/api/whop-oauth-callback
WHOP_OAUTH_SCOPES=openid profile email forum:read member:basic:read member:email:read
```

`WHOP_TOKEN_SECRET` encrypts the access and refresh tokens stored in the secure, HttpOnly browser session cookie. Never prefix any Whop secret with `PUBLIC_`.

## Owner workflow

1. Unlock `/control-center`.
2. Open **Methods → Import from Whop**.
3. Press **Continue with Whop** and authorize the app on Whop.
4. The importer automatically lists joined groups and every readable forum experience.
5. Select one forum, a whole group, every Black Box and Hidden Files forum, or any combination.
6. Use **Approve Selected**, **Disapprove Selected**, group-level **Approve All / Disapprove All**, or individual forum controls.
7. Press **Review posts** on an approved forum.
8. Approve, disapprove, preview, undo, approve all ready, disapprove all, or reset post choices.
9. Select a category from the live The 420 Lobby Hacks category registry.
10. Confirm that the posts are owned by you or that you have explicit republication permission.
11. Import the approved posts.

The `exp_...` input remains available only inside **Advanced fallback** when Whop cannot list a specific forum automatically.

Black Box and Hidden Files are recognized and prioritized automatically. Additional joined groups remain available and still require explicit approval before their posts can be scanned or imported.

## Safety rules

- Source approvals are keyed to exact Whop `exp_...` IDs even though the owner does not need to find or paste them manually.
- Bulk source decisions are written atomically in one registry commit.
- A disapproved or unknown source cannot be scanned or imported through either the UI or a crafted API request.
- Post decisions are reversible before import.
- The browser submits only approved source and post IDs. The server re-fetches authoritative Whop data before saving.
- Every imported post enters The 420 Lobby Hacks as a hidden draft and is never featured automatically.
- Existing imports are updated by Whop source ID and fingerprint instead of duplicated.
- Unicode, emoji, punctuation, paragraphs, Markdown hard breaks, lists, tables, links, blockquotes, and fenced code are checked through the shared formatting-integrity boundary.
- Ambiguous corruption, unsafe publishable HTML, dangerous links, and malformed code fences are blocked for review rather than guessed at.
- Membership email data returned by Whop is discarded and never persisted in the source registry or sent to the browser.

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

The public compatibility paths remain stable, including `/api/whop-oauth-callback` and `/api/whop-sources`. Consolidating the actions keeps the Hobby deployment below its direct-function limit without combining the internal OAuth, membership/forum discovery, source-policy, post discovery, attachment-verification, and import service modules.
