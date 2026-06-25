# /figma-sync

Syncs a new or updated Figma design decision into the local design system files.

**Figma file key:** `1tkZCzPxmdkHToeE32cUIz`
**Design system root:** `design-system/`

## How to invoke

```
/figma-sync color "Accent/Teal"          ← add new color
/figma-sync text-style "Label Small"     ← add new text style
/figma-sync component "Tooltip"          ← add new component
/figma-sync update color "Primary"       ← update existing color value
/figma-sync update text-style "H1"       ← update existing text style values
/figma-sync update component "Button"    ← update existing component styles
/figma-sync all                          ← full sync: detect all changes automatically
```

If no argument is given, ask the user:
- "What changed in Figma? (color / text style / component)"
- "Is this new or an update to an existing one?"

---

## Step 1 — Fetch from Figma

Use the Figma MCP tool to get the exact values for what was added.

- For **colors/variables**: fetch local variables from the file, find the matching variable by name, get its value.
- For **text styles**: fetch local text styles, find by name, get fontSize, lineHeight, letterSpacing, fontWeight.
- For **components**: fetch the component node, inspect its properties and children to understand structure and states.

Always confirm the fetched values with the user before making any file changes.

---

## Step 2 — Make file changes based on type

Determine whether this is **new** or an **update**, then follow the matching path.

---

### COLOR or VARIABLE — new

1. Add a CSS custom property to `design-system/tokens.css` under the appropriate comment group:
   ```css
   --color-[name]: #XXXXXX;
   ```
   Use kebab-case. Follow existing naming (`--color-accent-teal`, `--color-bg-*`, etc.).

2. Add a swatch to the correct section in `design-system/styleguide.html`:
   - Accent colors → "Colors — Accent"
   - Background/text → "Colors — Background & Text"
   - Primary → "Colors — Primary"

   Match the existing swatch HTML format exactly.

### COLOR or VARIABLE — update

1. Find the existing `--color-[name]` in `design-system/tokens.css` and update the value.
2. The styleguide swatch updates automatically via `var()` — no HTML change needed.

---

### TEXT STYLE — new

1. Add token vars to `design-system/tokens.css` under `/* ---- Typography ---- */`:
   ```css
   --text-[name]-size: Xrem;   /* Xpx */
   --text-[name]-lh:   X.X;
   --text-[name]-ls:   Xem;
   ```

2. Add a `.t-[name]` utility class to `design-system/tokens.css`.
   Use `font-weight: 600` for DemiBold. Add `text-transform: uppercase` if uppercase in Figma.

3. Add a row to the **Typography — Desktop Scale** table in `design-system/styleguide.html`.

### TEXT STYLE — update

1. Update the `--text-[name]-size/lh/ls` values in `design-system/tokens.css`.
2. The utility class and styleguide row update automatically via `var()` — no HTML change needed unless the style name itself changed.

---

### COMPONENT — new

1. Create `design-system/components/[name].css`:
   - Header comment block
   - All CSS using only `var(--…)` token references — no hardcoded values
   - Styles for all states visible in Figma (default, hover, disabled, open/closed, etc.)

2. Add a `<link>` tag in `design-system/styleguide.html` after the existing component links:
   ```html
   <link rel="stylesheet" href="./components/[name].css" />
   ```

3. Add a section to the **Components tab** in `design-system/styleguide.html`:
   - Add anchor link in `<nav id="anchors-components">`
   - Add `<section class="sg-section">` with `id="s-[name]"` on the `.sg-section-label`
   - Show all component states
   - Add a spec table listing the tokens used

### COMPONENT — update

1. Update `design-system/components/[name].css` with the changed styles.
2. If the visual output in the styleguide changes (new states, renamed classes), update the relevant HTML in `design-system/styleguide.html` too.
3. No need to touch the `<link>` tag or anchor nav.

---

---

## `/figma-sync all` — Full automatic sync

When the user runs `/figma-sync all`, perform a full diff between Figma and the local code. Follow these steps in order:

### A — Fetch everything from Figma

Use the Figma MCP tool to fetch:
- All local variables (colors, spacing, etc.)
- All local text styles
- All published components

### B — Diff colors and text styles (automatic)

**Colors:**
1. Read all `--color-*` variables from `design-system/tokens.css`
2. Compare against Figma variables — find any that are new or have changed values
3. Apply all changes silently (add new tokens, update changed values)
4. Report a summary: "Updated 2 colors, added 1 new color"

**Text styles:**
1. Read all `--text-*` variables from `design-system/tokens.css`
2. Compare against Figma text styles — find new or changed styles
3. Apply all changes silently (add tokens + utility classes + styleguide rows for new; update values for changed)
4. Report a summary: "Updated H2 line-height, added Label Small"

If nothing changed, say so — don't touch any files.

### C — Review components (always ask before changing)

For each component in Figma:
1. Check if a corresponding `design-system/components/[name].css` exists
2. If **no file exists** → it's new. Show the user:
   - Component name
   - States visible in Figma (default, hover, disabled, etc.)
   - Key visual properties (colors, radius, spacing, typography)
   - Ask: "Should I create this component?"
3. If **file exists** → fetch the Figma component and summarize what it looks like now:
   - List key properties (background, border, radius, font, states)
   - Ask: "Does this match your current CSS, or should I update it?"
4. Only make changes after explicit user confirmation per component.

### D — Report full summary

After all changes are applied, show a table:

| Type | Name | Action |
|------|------|--------|
| Color | --color-accent-teal | Added |
| Text style | --text-label-sm | Added |
| Text style | --text-h2-size | Updated (3.8rem → 4rem) |
| Component | Tooltip | Created |
| Component | Button | Skipped (no changes confirmed) |

Remind the user to review and commit when ready.

---

## Step 3 — Report what changed

After making all file changes, tell the user:
- Which files were modified
- What was added or updated (token name, class name, file created)
- Remind them to review and commit when ready
