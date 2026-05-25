# Birch AI — Claude Instructions

## Meta rules

- **CLAUDE.md updates** — whenever a global pattern or rule is established (e.g. a new CSS convention, a layout approach, a naming rule), always ask the user: "Should I add this to CLAUDE.md for future pages?" before ending the task.

- **Универсальные решения** — если для задачи есть более универсальный или гибкий подход (например `min()`, `clamp()`, относительные единицы вместо фиксированных), сначала предложи варианты с объяснением, не применяй сразу.

- **Нумерация вопросов в брифинге** — все уточняющие вопросы перед версткой нумеровать (1, 2, 3…), чтобы пользователь мог отвечать в формате «1 — ответ, 2 — ответ».

- **Брифинг перед версткой** — когда пользователь присылает новый блок или страницу для верстки, сначала открой макет через Figma MCP и задай все уточняющие вопросы. Не приступай к верстке пока не получены ответы. Вопросы по категориям:
  - **Layout**: что диктует высоту блока — какой элемент главный? Как колонки связаны по высоте?
  - **Адаптив**: есть ли таблетный/мобильный макет в Figma? Что меняется в layout?
  - **Анимация**: есть ли анимация, как триггерится (скролл/клик/авто), меняется ли высота блока между состояниями?
  - **Контент**: динамический или статичный, сколько состояний?
  - **Неясности**: любые значения или поведения которые не очевидны из макета

- **Кнопка dashed → dotted** — стиль `dashed` в Figma для кнопок соответствует `border-style: dotted` в CSS. В Figma нет отдельного dotted-варианта, поэтому всегда используем `dotted` в коде для `.btn-stroke`.

- **Стили перед версткой** — после брифинга по layout/анимации, но до написания кода, пройтись по стилям блока и уточнить:
  - Все ли типографические стили покрыты токенами и утилитарными классами? Если нет — нужно ли добавить через `/figma-sync`?
  - Все ли цвета, радиусы, отступы есть в `tokens.css`? Если нет — захардкодить или добавить токен?
  - Все ли компоненты (кнопки, карточки и т.д.) берутся из `design-system/components/`? Если стиль отличается — это новый вариант компонента или отдельный?
  - Есть ли значения в макете которые не на токенах — обсудить как с ними поступить прежде чем писать CSS

## Design system

All UI work in this project uses the Birch Design System located in `design-system/`.

### Rules for building pages and components

- **Tokens only** — use CSS custom properties from `design-system/tokens.css` exclusively. Never hardcode colors, font sizes, spacing, border-radius, or any other value that exists as a token.
- **Type classes** — always apply utility classes (`.t-h1`, `.t-h2`, `.t-para-xl`, etc.) directly on HTML elements instead of repeating font-size/line-height/letter-spacing in component CSS. This ensures a single source of truth: changing a token in `tokens.css` propagates everywhere.
- **No px** — never use `px` units in CSS or inline styles. Use `rem` for all fixed sizes (spacing, radius, font sizes), `%` for widths relative to a parent container, and `vw`/`vh` for viewport-relative sizes. Convert Figma px values: divide by 16 for rem (e.g. 24px → 1.5rem). For elements inside a fixed-width container, express widths as `elementPx / containerPx * 100%`.
- **JS animations** — never hardcode pixel offsets in animation scripts. Compute them from the rendered element size (e.g. `el.offsetWidth * ratio`) so they scale when the container resizes.
- **Component classes only** — use classes from `design-system/components/` for any UI pattern that has a component file. Don't rewrite styles that are already defined there.
- **No new values** — if a value you need doesn't exist in `tokens.css`, ask the user before inventing one. The right answer is usually to add it to Figma first, then sync it with `/figma-sync`.
- **Styleguide is the reference** — check `design-system/styleguide.html` to see all available tokens, utility classes, and components before writing any CSS.
- **Grid** — always use the 12-column grid system from `tokens.css` for layout. Use `.container` to center content, `.grid` for column layouts, and `.col-{n}` span helpers. Use `--gap-main`, `--pad-horizontal`, and `--pad-gutter` tokens for spacing — never hardcode gutters or margins. On mobile (≤767px) the grid collapses to a single column automatically. The default `.container` caps at `1600px` (`--container-lg`); use `.container-sm` (1024px) or target `--container-md` (1280px) for narrower sections.
- **Fluid scaling with clamp()** — visual containers should scale across screen widths using `clamp(min, preferred, max)` rather than a single fixed width. The preferred value should be a `vw` unit calibrated to the designed width (e.g. if the design is 1280px and the container is 1120px wide, use `87.5vw`). Always pair with `max-width: calc(100vw - 3rem)` as overflow protection on small screens. Use `aspect-ratio` instead of a fixed height so the container grows proportionally. Example: `width: clamp(56.25rem, 87.5vw, 90rem); max-width: calc(100vw - 3rem); aspect-ratio: 16 / 10;`

- **Subgrid для выравнивания строк карточек** — когда несколько карточек в ряду должны выравнивать внутренние строки (заголовок, медиа, описание) друг относительно друга, использовать CSS Subgrid. На родительском `.grid` задать `grid-template-rows: auto 1fr auto` (по числу строк внутри карточки). На каждой карточке: `grid-row: span 3; display: grid; grid-template-rows: subgrid`. Тогда браузер выравнивает соответствующие строки всех карточек по высоте самой высокой. Применять только на десктопе (`min-width: 768px`) — на мобилке карточки одна под другой, subgrid не нужен.

- **JS height measurement — fonts.ready** — любой JS который фиксирует высоту блока через `offsetHeight` (например, чтобы предотвратить layout jumps при динамическом контенте) должен запускаться дважды: сразу (`sizeBox()`) и после загрузки шрифтов (`document.fonts.ready.then(sizeBox)`). Иначе измерение идёт по системному шрифту, а после загрузки TT Commons Pro метрики меняются и высота оказывается неверной. Дополнительно: на блок добавлять `contain: layout` (изменения внутри не выходят наружу) и `overflow-anchor: none` (отключить scroll anchoring который компенсирует height-скачки скроллом).

- **em-единицы для интерактивных элементов** — padding и border-radius пилюль (pill), тегов и аналогичных элементов задавать в `em`, а не `rem`. Тогда они масштабируются автоматически вместе с `font-size` родителя (например с `--ps` на мобилке). Пример: `padding: 0.058em 0.462em 0.154em; border-radius: 0.308em;`. Конвертация: делим Figma px на значение font-size элемента в px.

### File structure

```
design-system/
  tokens.css               ← all design tokens (colors, type, spacing, radius, grid)
  components/
    button.css             ← .btn, .btn-default, .btn-stroke, .btn-l/m/s
    card-accordion.css     ← .card-accordion, .card-accordion__body, etc.
  styleguide.html          ← living visual reference
fonts/
  TT_Commons_Pro_Variable.woff2
```

### Adding to the design system

Use the `/figma-sync` skill whenever something new is created or changed in Figma.

**figma-sync conversion rules:**
- All Figma px values → `rem` (divide by 16). Example: Figma `spacing/24` = `1.5rem`.
- Widths/heights that are fractions of a parent frame → `%` of parent.
- Never output raw `px` values into `tokens.css` or component CSS.



```
/figma-sync all                          ← detect and sync all changes
/figma-sync color "Accent/Teal"          ← add a specific new color
/figma-sync text-style "Label Small"     ← add a specific new text style
/figma-sync component "Tooltip"          ← add a specific new component
/figma-sync update color "Primary"       ← update an existing token
```

### Figma source

File key: `1tkZCzPxmdkHToeE32cUIz`

---

## Debug Panel for scroll-driven animations

Reusable debug panel for tuning animations. Lives in `debug/` — **never include in Webflow embeds**.

### File structure
```
debug/
  panel.js    ← DebugPanel module (timeline, bezier editor, sliders, copy)
  panel.css   ← all panel styles
```

### How to add to a new dev page
```html
<head>
  <link rel="stylesheet" href="debug/panel.css" />
</head>
<body>
  <!-- animation HTML -->

  <script src="debug/panel.js"></script>
  <script>
  DebugPanel.init({
    getP:    () => window._dbgP,      // current lerp-smoothed progress (-1..1)
    getPws:  () => window._dbgPws,    // optional second lerp channel
    pRange:  [-1, 1],                 // optional, default [-1, 1]
    tracks:  [ ...trackDefs ],        // see track shape below
    sliders: [ ...sliderDefs ],       // LERP, scroll length, etc.
    onCopy:  () => stringToCopy,      // formats and returns the config string
  });
  </script>
</body>
```

### Track shape
```js
{
  key:       'entry',         // unique key, matches C.eases key if bezier is used
  label:     'Entry',         // shown in timeline label column
  color:     '#59DBFF',       // hex (8-char alpha hex ok for timeline, stripped for SVG)
  getS:      () => C.start,   // timeline bar start → p value
  getE:      () => C.end,     // timeline bar end → p value
  setS:      v  => C.start = v,
  setE:      v  => C.end   = v,
  ease:      () => C.eases.entry,     // omit → bezier section dims when this track selected
  setEase:   e  => C.eases.entry = e,
  inP:       p  => remap(p, C.start, C.end), // 0-1 for live bezier dot; omit if no bezier
  bodyDrag:  true,            // false → resize handle only, no body drag
  readonlyS: false,           // true → s input disabled + tooltip shown
  readonlyE: false,           // true → e input disabled
  hintS:     'locked to …',  // tooltip text shown on disabled s field
  hintE:     'locked to …',  // tooltip text shown on disabled e field
  note:      '',              // short hint shown in edit row (e.g. 'opacity only')
}
```

**Bezier editor** follows the selected track automatically — no separate tab switching needed. When a track has no `ease`, the editor dims (`opacity: 0.25`, non-interactive).

### Slider shape
```js
{ label: 'LERP', get: () => window.LERP, set: v => window.LERP = v,
  min: 0.01, max: 0.5, step: 0.01, fmt: v => v.toFixed(2) }
```

### Main script requirements
The animation script must expose:
- `window._dbgP`   — current lerp progress (set in rAF loop)
- `window._dbgPws` — second lerp channel (if used)
- `remap(p, lo, hi)` — global function (used in `inP` callbacks)

### Scroll lerp — snap on first frame
Never initialise `currentP = 0`. The browser restores scroll position **after** script execution, so lerp starts from 0 and animates to the real position, causing a visible jump on reload.

Always snap in the first rAF frame:

```js
let targetP   = 0;
let currentP  = 0;
let _rafReady = false;

(function loop() {
  targetP = scrollProgress();          // read every frame — no scroll listener needed
  if (!_rafReady) {
    currentP  = targetP;               // snap: skip lerp on first frame
    _rafReady = true;
  }
  currentP += (targetP - currentP) * window.LERP;
  window._dbgP = currentP;
  tick(currentP);
  requestAnimationFrame(loop);
})();
```

The same pattern applies to every additional lerp channel (e.g. `currentPws`).
Remove the `scroll` event listener — `targetP` is read every rAF frame, which is sufficient.
