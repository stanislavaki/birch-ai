# Review artifact — build tooling

Turns `use-cases.html` into a single self-contained page with a **comment
layer**, published as a private claude.ai Artifact so a marketer can leave
feedback on any block and export it.

This folder is **dev tooling only** — none of it ships to Webflow.

## Files

| File | Purpose |
|------|---------|
| `build_review.py` | Bundler — inlines CSS, embeds the brand font + SVGs as data URIs, strips external links (blocked by the artifact CSP), drops the html/head/body wrappers, and injects the comment layer. |
| `cmtx.css` | Comment-layer styles (per-block buttons, side drawer, bottom bar). |
| `cmtx.js` | Comment-layer logic (attach to any block, store in `localStorage`, remember the reviewer's name, export `.md`). |

## Rebuild after the page content changes

```bash
python3 review/build_review.py
```

Outputs (both **gitignored** — regenerated on demand):

- `use-cases-review.html` — the fragment to publish as an Artifact.
- `use-cases-review-test.html` — same, wrapped in a doctype for a faithful
  local preview (standards mode, matching the artifact runtime). Serve it over
  HTTP, e.g. `python3 -m http.server 8643`, then open
  `http://localhost:8643/use-cases-review-test.html`.

## Publish / update the artifact

Publishing is done from Claude (the `Artifact` tool), not from the shell.
Republish `use-cases-review.html` to keep the **same URL**; declare the
`downloads` capability so the export button works:

- capability: `{ "downloads": true }`
- current URL: `https://claude.ai/code/artifact/6e3a9053-45a0-4247-a523-7df0671ccf49`

## How the comment layer works

- Every product card, section banner, use-case card, prompt, and the hero
  title/subtitle gets a 💬 button (hover to reveal; a count shows once it has
  comments).
- Comments live in `localStorage` (per reviewer, per browser) — there is **no
  shared backend** (artifact runtime capabilities are `downloads` + `mcp`
  only). The reviewer exports a `.md` and sends it back.
- The name field defaults to **Аноним** and is remembered as soon as it's typed.
- Export uses `window.claude.downloads.save` in the artifact, with a Blob
  download fallback for local preview.
