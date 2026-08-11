# Dev-страницы — вёрстка, раскладка, анимация

## Dev-среда, превью, рабочие файлы

- **Дефолтная dev-среда — `design-system/webflow-env.css`** — при создании новой страницы (или dev/test-страницы) подключать `design-system/webflow-env.css` вместо ручного копирования fluid font-size / nav / reset кода. Файл даёт единый Webflow-подобный контекст без необходимости сверяться с симулятором:
  - fluid font-size формулы — точная копия текущего кода реального Webflow (подтверждено 09.07.2026). Точные формулы по брейкпоинтам и комментарий про два скачка вниз на 768px и 992px (особенность реального сайта, не баг) — см. `design-system/webflow-env.css`.
  - `--nav-height: 6.5em` на `:root`
  - global reset для variable fonts в Safari
  - тёмный фон страницы, `@font-face` TT Commons Pro Variable
  - `.section`/`.container` обёртка (паддинги как на реальном сайте), `.container { max-width: 80rem }` — **в rem**, точное значение реального Webflow-контейнера (`.container.centered.u-w-100` = `80rem` fluid, подтверждено против live-сайта bir.ch/manage-upd 13.07.2026: контейнер = 1280px @ root16 и 1536px @ root19.2, т.е. 80rem на обеих ширинах). **Не 90rem** — старое значение делало каждый dev-блок ~10rem (~192px) шире задеплоенного сайта. `padding-inline: 1.5rem` (= 28.8px @ root19.2) тоже совпадает с live. Это dev-инструмент, не финальный embed; для самого embed контейнерные токены задавать в `px`, см. «Webflow embed — токены контейнеров в `px`» выше. Примечание: `tokens.css` `.container` = `--container-lg` (100rem) — на dev-страницах перебивается `webflow-env.css` (80rem, грузится позже); если понадобится, дизайн-систему можно свести к 80rem отдельно.

  Nav-меню (HTML-разметка `.sim-nav`) — отдельный partial `design-system/webflow-env-nav.html`, вставляется сразу после `<body>`. Первая секция страницы должна получить дополнительный `padding-top` под высоту нава, например `padding-top: calc(<исходный паддинг> + var(--nav-height));`.

- **Директория страниц — `pages.html`** — при создании новой сверстанной страницы всегда добавлять карточку в `pages.html` в корне проекта: название, статичный скриншот-превью, ссылка "открыть →". Это единый обзор для дизайнера всех когда-либо сверстанных страниц.

- **Генерация статичных превью — Playwright (Python)** — в проекте нет Puppeteer/Node headless браузера, используем `python3 -m playwright`:
  ```python
  from playwright.sync_api import sync_playwright
  with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(url, wait_until='networkidle')
    page.screenshot(path='images/pages/<name>.jpg', type='jpeg', quality=85,
                     clip={'x':0,'y':0,'width':1440,'height':900})
  ```
  Скриншоты хранить в `images/pages/<slug>.jpg`. Снимать первый экран страницы (viewport 1440×900).

- **Утилитарные страницы — общая шапка `design-system/utility-header.{css,js}`** — навигация по внутренним страницам (`pages`, `embeds`, `map`, `styleguide`, `tokens-comparison`) собрана в один компонент: `utility-header.js` инжектит sticky-шапку, определяет активный пункт по имени файла, а глубину текущей страницы (сколько `../` подставить в ссылки) считает из `location.pathname` — **не** из `src` скрипта: `document.currentScript.src` абсолютный и глубину страницы не отражает. Ровно эта ловушка ломала ссылки на страницах в `design-system/` (резолвились как `design-system/pages.html`). Новую утилитарную страницу подключать так: `<link>` на `tokens.css` и `utility-header.css` в `<head>`, `<script src=".../utility-header.js">` перед `</body>`; список пунктов — в массиве `ITEMS` внутри JS. `debug/webflow-sim.html` в шапку **не** входит — у него свой `position: fixed` навбар Webflow, который её перекрывает.

- **Подключение `tokens.css` к странице с собственными стилями — две ловушки** — обе всплыли на утилитарных страницах и обе молчаливые:
  1. **Имя класса `.grid` занято.** В `tokens.css` это 12-колоночная layout-утилита. Любой свой `.grid` на странице с подключённым `tokens.css` схлопнется в 12 столбцов. Свои сетки называть иначе (`.page-grid`, `.families` и т.п.).
  2. **Тема через класс на `body`.** `utility-header.js` вешает на `body` класс `.u-page`; он **тему-нейтрален** (только шрифт `var(--font)` и отступ под шапку), тему — фон и цвет текста — задаёт **сама страница** своими правилами. Тёмная страница пишет `body { background: var(--color-bg); color: var(--color-text) }` (или `html { background: … }`), светлая — свои светлые значения. Если `.u-page` начнёт красить `body`, класс (0,1,0) перебьёт тег `body` (0,0,1) и сломает страницу противоположной темы.

- **Три рабочих файла и кросс-навигация** — `pages.html` (обзор сверстанных страниц), `embeds.html` (каталог embed-кодов для копирования в Webflow), `debug/webflow-sim.html` (превью embed-блоков в Webflow-окружении). В каждом файле держать одинаковый nav-блок вверху со ссылками на все три. Текущий файл — обычная ссылка (без target), остальные два — `target="_blank"`. **Заметка:** для обзорных страниц эту навигацию заменил общий компонент `utility-header` (см. выше); симулятор из неё исключён.

- **preview_screenshot — артефакт после скролла с fixed-навбаром** — `position: fixed` навбар с `backdrop-filter: blur` ломает `preview_screenshot` после программного `window.scrollTo()` / `scrollIntoView()`: скриншот рендерится чёрным или с артефактами блюра. Это баг превью-тула, не вёрстки. Скрытие навбара (`document.querySelector('.sim-nav').style.display = 'none'`) не помогает. **Надёжный обходной путь — Chrome MCP**: загрузить инструменты через `ToolSearch("select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool")`, открыть страницу через `navigate`, скроллить через `javascript_tool`, снять через `computer { action: "screenshot" }`.

## Раскладка и мобилка

- **Media queries — каскад брейкпоинтов** — диапазонные запросы (`min-width AND max-width`) использовать только когда стиль нужен **исключительно** на одном брейкпоинте и не должен применяться ниже. Если стиль должен работать на данном брейкпоинте и всех меньших — использовать только `max-width` без нижней границы: `@media (max-width: 991px)` покрывает планшет и мобилку автоматически. Это предотвращает ситуацию когда правило «не доходит» до меньших брейкпоинтов и его приходится дублировать.

- **Мобилка — это вертикальный поток, а не «адаптив десктопного absolute-макета»** — если на десктопе блок построен на `position: absolute` + JS-позиционировании (sticky-scroll композиция, наложения, вылеты за края), на мобилке **не переносить эту систему**. Мобильную версию верстать с нуля как обычный вертикальный flow: `position: relative`/`static`, элементы стопкой (block/flex-column), высота контейнеров приходит от контента (не хардкодить `height`), горизонтальные вылеты убираются. Absolute+JS оставлять строго под десктопную композицию, которая этого требует. Признак что свернул не туда: начал считать `padding-top`-распорки, `margin-top: -Nrem` или `calc(nav-height + …)` офсеты, чтобы «подвинуть» элемент под другой — в потоке это не нужно, элементы и так стоят друг за другом. Именно эти хаки на мобилке почти всегда потом переделываются.

- **Сброс десктопных offset/position в мобильном media query** — десктопные значения `position`, `margin`, `top/left/right/bottom`, `transform`-смещения протекают в мобилку, если их явно не сбросить. При переходе блока в мобильный flow в `@media (max-width: 767px)` явно перекрывать всё что задавалось на десктопе для позиционирования: `position: static/relative`, `inset: auto` (или `top/left/right/bottom: auto`), `margin: 0`. Не рассчитывать что «оно само» — CSS-каскад тянет десктопное правило вниз.

- **Replaced elements в сложных layout'ах** — `<img>` внутри `<picture>` — это replaced element, он не растягивается через `inset`/`right/bottom` как обычный блок. Картинка ведёт себя иначе чем div. На мобайле всегда явно уточнять в брифинге как она должна себя вести (обрезается, заполняет ширину, привязана к углу) — и явно переопределять `display`, `width`, `height` в мобильном media query, не рассчитывать что браузер догадается.

- **`overflow: hidden` обрезает повёрнутый/`transform`-контент** — не ставить `overflow: hidden` на контейнер рефлекторно: если внутри есть повёрнутые (`rotate`) или вылезающие декоративные элементы (персонажи, флаги, бейджи), он отрежет их углы. Ставить только когда обрезка осознанно нужна. Если цель была спрятать элемент до анимации — он обычно уже скрыт через `opacity: 0`, и `overflow` избыточен.

- **Кнопка dashed → dotted** — стиль `dashed` в Figma для кнопок соответствует `border-style: dotted` в CSS. В Figma нет отдельного dotted-варианта, поэтому всегда используем `dotted` в коде для `.btn-stroke`. Это же соответствие (Figma dashed = CSS dotted) распространяется и на рамки карточек/фреймов, не только на кнопки.

- **Пунктир/штрих-рамка не должна сдвигать контент — `outline`, а не `border`** — толстая `border` (напр. 3px пунктир у roadmap-карточки) съедает layout: контент уезжает внутрь на толщину рамки и перестаёт совпадать по левому краю с соседними карточками (у которых рамки нет). Рисовать такую рамку через `outline` + отрицательный `outline-offset` (`outline: 3px dotted …; outline-offset: -3px`) — `outline` не занимает места в боксе, поэтому бейджи/заголовок/текст остаются выровнены с соседями, а offset уводит рамку внутрь под `border-radius`. Признак, что свернул не туда: начал компенсировать сдвиг паддингом/маргином, чтобы «вернуть» выравнивание.

## Анимация и скролл

- **Статика перед анимацией** — сначала добиться правильного вида на всех брейкпоинтах без переходов и анимаций — только потом добавлять `transition`, `transform`, LERP и т.д. Нельзя отлаживать layout и анимацию одновременно: непонятно что именно сломано.

- **Анимация `width`/layout ломает пунктирные обводки соседей** — CSS-переход `width` перекладывает соседние элементы на **субпиксельные** позиции, и `border: dotted` перерисовывается каждый кадр: точки «ползут». Перерисовка самой обводки (SVG/background) не спасает — любой рисунок растрируется заново при смене субпиксельной фазы. Лечение: анимировать ширину не CSS-переходом, а через `requestAnimationFrame`, округляя каждый кадр до **чётного целого** пикселя (центрирование делит ширину пополам, поэтому нечётная снова даёт `.5px`). Тогда фаза постоянна и пунктир стоит. Ещё надёжнее — не анимировать layout вовсе, только `transform`. Диагностика: сэмплить `getBoundingClientRect().left` соседа во время перехода — важна не целочисленность, а **постоянство дробной части**.

- **Перелёт (overshoot) не должен жить внутри `overflow: hidden`** — если элемент проскакивает за конечную позицию, клип съедает именно ту часть, ради которой перелёт и делался. Для «подброса поверх» варианты позиционировать `absolute` в слоте без клипа и поднимать `z-index`; перед этим проверить всю цепочку предков на `overflow` — достаточно одного клипящего родителя, чтобы эффект пропал.

- **CSS `scroll-behavior: smooth` глушит `scrollTo({behavior: 'smooth'})`** — обратная сторона предыдущего правила: если на странице задан `html { scroll-behavior: smooth }` (наши dev-страницы; embed-контекст), программный `window.scrollTo({top, behavior: 'smooth'})` может **молча не выполниться** — без ошибки в консоли, страница просто не двигается (подтверждено на use-cases.html: обработчик срабатывал, координата считалась верно, скролла не было). Для плавного программного скролла при включённом CSS-smooth использовать **`el.scrollIntoView({block: 'start'})`** — он едет через CSS-механизм и анимируется сам; офсет под фикс-шапку задавать не вычитанием пикселей, а `scroll-margin-top` на целевом элементе. `scrollTo` с ручной координатой оставлять только там, где CSS-smooth отключён (см. правило выше). **Уточнение (замерено на живом bir.ch, 08.2026): на нативных Webflow-страницах computed `scroll-behavior` = `auto`** — CSS-smooth там нет, плавный скролл к якорям делает **jQuery-обработчик Webflow** (см. следующее правило). «Webflow включает глобально» относится к embed-страницам, где это было замерено ранее — на новой странице проверять `getComputedStyle(document.documentElement).scrollBehavior`, а не верить заметке. Отдельная ловушка диагностики: smooth-анимации скролла **замирают, пока окно браузера не в фокусе** — при проверке через автоматизацию (js-tool в фоновой вкладке/окне) кажется, что скролл «не работает», хотя у живого пользователя всё едет; встроенный Browser-пейн Claude Code вдобавок **не гоняет `requestAnimationFrame`** — любая rAF-анимация в нём стоит на месте, проверять в реальном Chrome (claude-in-chrome MCP).

- **Pointer Events для свайпа/тапа в каруселях** — вместо `touchstart/touchend + click` использовать единый `pointerdown/pointerup/pointercancel`. Работает для мыши, тача и стилуса без дублирования событий и без `passive`/`preventDefault` костылей. Обязательные детали:
  - `el.setPointerCapture(e.pointerId)` в `pointerdown` — события не теряются если палец вышел за край элемента
  - `touch-action: pan-y` на элементе в CSS — браузер обрабатывает вертикальный скролл, горизонталь перехватывает наш JS
  - `user-select: none` на элементе — предотвращает выделение текста при свайпе
  - `pointercancel` — чистый сброс состояния если браузер перехватил жест (например передал скролл)
  ```js
  el.addEventListener('pointerdown', function(e) {
    startX = e.clientX; startY = e.clientY; _down = true;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointerup', function(e) {
    if (!_down) return; _down = false;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { /* свайп */ }
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { /* тап/клик */ }
  });
  el.addEventListener('pointercancel', function() { _down = false; });
  ```

- **IntersectionObserver для автопереключения каруселей** — таймер и анимация индикаторов не должны стартовать при инициализации, только когда блок виден на экране. Паттерн:
  - В `initX()` сразу добавлять паузу-класс на индикаторы (`--paused`)
  - Observer при `isIntersecting`: снять паузу → `updateDots(idx)` (рестарт анимации) → `startTimer()`
  - Observer при выходе из viewport: добавить паузу → `stopTimer()`
  - Хранить observer в переменной `_observer`, в `destroyX()` вызывать `_observer.disconnect()`
  - Порог `threshold: 0.1` — таймер стартует когда блок на 10% появился на экране

## Шаринг dev-страницы как Claude Artifact (ревью)

Готовую dev-страницу можно отдать на ревью (например, маркетологу) отдельной приватной ссылкой-артефактом claude.ai — со слоем комментариев к любому блоку. Тулинг воспроизводим и лежит в `review/` (`build_review.py` + `cmtx.{css,js}` + README); **это dev-инструмент, в Webflow не идёт**. Реальный кейс — ревью-версия `use-cases.html`. Ключевые грабли и ограничения:

- **Самодостаточность (строгий CSP).** Внешние хосты заблокированы: `<link>` на CSS, Google Fonts, картинки, `fetch`/XHR/WebSocket — ничего не грузится. Инлайнить весь CSS/JS, встраивать шрифты и SVG как data-URI, срезать внешние ссылки. Шрифт встраивать **один раз**: у нас два `@font-face` на один и тот же woff2 (в `tokens.css` и `webflow-env.css`) — дубль убрать, иначе 856 КБ base64 вставятся дважды (имена семейств матчатся регистронезависимо, так что достаточно оставить один).
- **Фрагмент, не документ.** Artifact сам оборачивает контент в `<!doctype><head></head><body>` — свои `<!DOCTYPE>/<html>/<head>/<body>` НЕ писать; публиковать фрагмент (`<style>…</style>` + тело + `<script>`), а не полный HTML. Для локальной проверки в standards mode собирать отдельную обёрнутую копию (`build_review.py` делает обе). Открытый напрямую фрагмент рендерится в quirks mode и врёт — та же грабля, что с embed.
- **Возможности рантайма — только `downloads` и `mcp`.** Общего хранилища (shared state) «комментарии видны всем live» **нет** — не изобретать. Комментарии живут в `localStorage` каждого ревьюера, выгрузка — через `window.claude.downloads.save({filename, data})` (расширения `txt/json/md`) с blob-фолбэком для локали. Перед вызовом проверять `window.claude.downloads`; ошибку `declined` не ретраить. Перед объявлением возможностей грузить скилл `artifact-capabilities` (он — источник правды по доступному набору).
- **z-index.** Оверлеи (панель/бар комментариев) поднимать выше фикс-навбара сайта: `.sim-nav` = `z-index: 1000`, панель — 3000.
- **Обновление — тот же URL.** Republish того же `file_path` в этой же сессии сохраняет URL; `capabilities` при redeploy можно опустить — предыдущее объявление (`downloads`) переносится. Собранные `use-cases-review*.html` (~1 МБ) — build-выход, в `.gitignore`.

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

### Scroll/IO-триггерная анимация входа — снап при reload-in-view
Та же корневая проблема (браузер восстанавливает скролл **после** выполнения скрипта), но для **class-триггерной** entrance-анимации (карточка выезжает при `.--visible`, которую вешает scroll-листенер или `IntersectionObserver`). При перезагрузке на середине секции триггер срабатывает, когда блок уже в зоне видимости, и проигрывает анимацию заново — элемент «подлетает» рассинхронно со скроллом.

Правило: анимация входа должна различать «загружен уже в зоне видимости» (**снап**, без анимации) и «доскроллил живьём» (**анимация**). Надёжный сигнал различия — **реальный жест пользователя**. Восстановление скролла и программные `scrollTo` не генерят `wheel`/`touchmove`/`keydown`/`pointerdown`, поэтому:

```js
var armed = false; // «пользователь реально начал скроллить»
['wheel','touchmove','keydown','pointerdown'].forEach(function (ev) {
  window.addEventListener(ev, function () { armed = true; }, { once: true, passive: true });
});
// в триггере (scroll-листенер ИЛИ IntersectionObserver-колбэк):
if (armed) showEl();   // добавить .--visible → CSS-анимация
else       snapEl();   // добавить .--instant → transform: …translateY(0), animation: none
```

Класс `--instant` задаёт финальный `transform` и `animation: none` (иначе элемент упадёт в базовый off-screen `transform`). Почему жест, а не `requestAnimationFrame`-задержка или таймер: rAF/таймеры гонятся с восстановлением скролла и с таймингом колбэка `IntersectionObserver` (IO-колбэк может прийти позже 2 кадров) — именно из-за этой гонки элемент и подлетает. Жест-gate детерминирован. Известный компромисс: перетаскивание скроллбара мышью не даёт `wheel`/`touch` → в этом редком кейсе будет снап вместо анимации (приемлемо).
