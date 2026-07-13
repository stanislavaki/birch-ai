# Birch AI — Claude Instructions

## Meta rules

- **CLAUDE.md updates** — whenever a global pattern or rule is established (e.g. a new CSS convention, a layout approach, a naming rule), always ask the user: "Should I add this to CLAUDE.md for future pages?" before ending the task.
- **Git branch** — always create a feature branch at the start of every session before making any changes. Use the format `feature/<short-description>`. Never work directly on `main`.
- **Embed файлы — папка `embed/`** — все embed-версии страниц хранятся в папке `embed/`. Именование: `embed/<page-name>-embed.html` (например `embed/ai-promo-embed.html`). Никогда не класть embed-файлы в корень проекта.

- **Embeds каталог — `embeds.html`** — все embed-файлы документируются в `embeds.html` в корне проекта. Страница организована по названиям Webflow-страниц с заголовками. При создании нового embed — добавлять карточку туда: название блока, путь к файлу, дата последнего коммита.

- **Синхронизация dev-страница ↔ embed** — если блок существует и в dev-странице (например `manage.html`), и в embed-версии (`embed/<...>-embed.html`), любую правку блока вносить **сразу в оба файла** в рамках одного изменения. Иначе embed отстаёт от dev-страницы и на реальном Webflow всплывают уже «починенные» баги. Перед коммитом правки блока — проверить grep'ом, что то же значение/фикс есть в обоих (CSS-значения, позиции, JS-логика). Особенно легко забыть про мелкие мобильные отступы и точечные CSS-твики.

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

- **Три рабочих файла и кросс-навигация** — `pages.html` (обзор сверстанных страниц), `embeds.html` (каталог embed-кодов для копирования в Webflow), `debug/webflow-sim.html` (превью embed-блоков в Webflow-окружении). В каждом файле держать одинаковый nav-блок вверху со ссылками на все три. Текущий файл — обычная ссылка (без target), остальные два — `target="_blank"`.

- **Webflow page-level custom code — DOMContentLoaded** — в отличие от embed-блоков (вставляются в тело страницы через Embed-элемент), custom code заданный в настройках страницы (Page Settings → Custom Code) вставляется Webflow в `<head>`, где DOM ещё не готов. Любой такой скрипт, обращающийся к DOM (`querySelectorAll` и т.д.), оборачивать в `document.addEventListener('DOMContentLoaded', function() { ... })`. Иначе селекторы вернут пустой список и скрипт не сработает.

- **Симулятор (`debug/webflow-sim.html`) — больше не обязательный шаг** — раньше требовался, потому что локальные dev-страницы не воспроизводили Webflow fluid font-size точно. Теперь `design-system/webflow-env.css` даёт точное совпадение с реальным Webflow (см. «Webflow embed — root font-size синхронизирован» ниже, подтверждено тестом в самом Webflow 09.07.2026) — можно проверять embed прямо в dev-странице (например `manage.html`) или сразу в реальном Webflow. Файл всё ещё в репозитории, но заводить в него новый блок при каждом embed больше не обязательно.

- **preview_screenshot — артефакт после скролла с fixed-навбаром** — `position: fixed` навбар с `backdrop-filter: blur` ломает `preview_screenshot` после программного `window.scrollTo()` / `scrollIntoView()`: скриншот рендерится чёрным или с артефактами блюра. Это баг превью-тула, не вёрстки. Скрытие навбара (`document.querySelector('.sim-nav').style.display = 'none'`) не помогает. **Надёжный обходной путь — Chrome MCP**: загрузить инструменты через `ToolSearch("select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool")`, открыть страницу через `navigate`, скроллить через `javascript_tool`, снять через `computer { action: "screenshot" }`.

- **pbcopy после embed-файла** — всегда показывать команду для копирования embed-кода в буфер обмена после того как embed-файл готов:
  ```
  pbcopy < "путь/к/файлу.html"
  ```

- **Webflow embed — root font-size синхронизирован, коэффициент и pinning не нужны** — `design-system/webflow-env.css` теперь побайтово повторяет формулу fluid `font-size` реального Webflow-сайта (точные значения и обе точки разрыва — см. комментарий в `webflow-env.css`; подтверждено тестом в самом Webflow 09.07.2026). Раз local и real дают одинаковый root font-size на любой ширине, `rem`-значения в embed резолвятся идентично в обеих средах. Из этого следует:
  - **Коэффициент 0.9 для десктопных rem-токенов не нужен** — использовать те же значения, что в local, без умножения.
  - **`font-size: 16px`-пиннинг на внутреннем контейнере карточки не нужен** — не задавать его вообще, пусть `rem` резолвится от реального root font-size Webflow напрямую.
  - Если формула fluid font-size на реальном Webflow снова изменится — в первую очередь обновить `webflow-env.css`, иначе расхождение между local и embed вернётся и коэффициент/pinning придётся возвращать.

- **Webflow embed — именование классов** — Webflow имеет глобальные стили для распространённых имён классов (`.container`, `.section`, `.btn`, `.hero`, `.row`, `.col` и др.). В embed-файлах добавлять суффикс `-e` ко всем классам которые могут конфликтовать: `.container-e`, `.btn-e`, `.hero-e` и т.д. Local-версию не трогать.

- **Webflow embed — горизонтальные паддинги** — горизонтальный padding на секции и внешнем контейнере приходит из Webflow. Внутренний `.container-e` в embed не должен иметь `padding-inline` — иначе будет двойной отступ.

- **Webflow embed — фон** — `background-color` на секции не задавать в embed. Фон приходит из Webflow (задаётся на секции или странице). В embed ставить только `/* no background — comes from Webflow */`.

- **Webflow embed — спецсимволы и emoji** — Webflow нарушает кодировку UTF-8 символов вне ASCII при сохранении embed-кода. Все emoji, тире и спецсимволы в видимом HTML-контенте и JS-строках заменять на HTML entities: `🟢` → `&#x1F7E2;`, `🔴` → `&#x1F534;`, `–` → `&ndash;`, `—` → `&mdash;`, `ï` → `&iuml;`. CSS-комментарии безопасны — там символы не рендерятся.

- **Webflow embed — padding** — паддинги на accordion и step могут быть сброшены глобальным reset-ом Webflow. Задавать их с `!important`: `padding: var(--xxx-pad) !important`.

- **Webflow embed — sticky scroll JS** — три обязательных правила для sticky-блоков в embed:
  1. **`offsetTop` ненадёжен** — Webflow оборачивает embed в позиционированные контейнеры, поэтому `section.offsetTop` даёт смещение относительно родителя, а не документа. Для программного скролла всегда использовать `section.getBoundingClientRect().top + window.pageYOffset`.
  2. **`scroll-behavior: smooth`** — Webflow включает его глобально. Перед программным `window.scrollTo()` отключать: `document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important')` и восстанавливать в `requestAnimationFrame`.
  3. **`scrollProgress()`** — для анимации по скроллу всегда использовать `getBoundingClientRect().top` (viewport-relative), а не `offsetTop`. Это работает корректно внутри любого контейнера.

- **Webflow embed — высота нав бара в sticky** — для sticky-блока в embed всегда учитывать высоту Webflow-навигации:
  ```css
  .xxx-e__sticky {
    top: var(--nav-height, 0px);
    height: calc(100vh - var(--nav-height, 0px));
  }
  ```
  `--nav-height` — CSS-переменная, которую Webflow задаёт на `:root` в формате `em` (например `6.5em`). Важно: sticky-обёртка не должна наследовать наш `font-size: 16px` (он только на внутреннем контейнере), иначе `em` посчитается неправильно. Фоллбек `0px` нужен чтобы блок работал в локальной dev-среде где переменной нет.

- **Webflow embed — `--nav-height` в JS** — Webflow задаёт `--nav-height: 6.5em` на `:root`. При конвертации в px умножать на реальный root font-size, не на хардкоженные 16:
  ```js
  var el = document.documentElement;
  var rootFs = parseFloat(getComputedStyle(el).fontSize);
  var raw = getComputedStyle(el).getPropertyValue('--nav-height').trim();
  var navH = raw ? parseFloat(raw) * rootFs : 6.5 * rootFs;
  ```

- **Webflow embed — токены контейнеров в `px`** — `--container-lg`, `--container-md`, `--container-sm` задавать в `px`, не `rem`. Иначе fluid font-size (19.2px на 1600px+, см. правило про root font-size выше) растягивает их до ~1920px вместо 1600px. Пример: `--container-lg: 1600px`. Это видно уже в локальной dev-среде — `webflow-env.css` теперь точно повторяет реальный Webflow, так что баг проявится и там, не только после вставки в embed.

- **Webflow embed — хардкод px в JS** — любые числа в пикселях в JS (например `96` = 6rem × 16px) заменять на `N * remPx`, где `remPx` читается из реального font-size документа:
  ```js
  var remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  var offset = 6 * remPx; // вместо 96
  ```
  Вычислять `remPx` до первого использования в функции.

- **Webflow embed — `overflow-x: clip` ненадёжен** — в контексте Webflow `overflow-x: clip` может не работать. Использовать `overflow: hidden` для обрезки выходящего за края контента (например staircase-анимации в герое).

- **Webflow embed — шрифт** — если шрифт уже загружен на Webflow-сайте, в embed ничего делать не нужно: браузер найдёт его по имени через `font-family`. Fallback-шрифты в стеке подхватятся автоматически если что-то пойдёт не так.

- **Универсальные решения** — если для задачи есть более универсальный или гибкий подход (например `min()`, `clamp()`, относительные единицы вместо фиксированных), сначала предложи варианты с объяснением, не применяй сразу.

- **Дефолтная dev-среда — `design-system/webflow-env.css`** — при создании новой страницы (или dev/test-страницы) подключать `design-system/webflow-env.css` вместо ручного копирования fluid font-size / nav / reset кода. Файл даёт единый Webflow-подобный контекст без необходимости сверяться с симулятором:
  - fluid font-size формулы — точная копия текущего кода реального Webflow (подтверждено 09.07.2026). Точные формулы по брейкпоинтам и комментарий про два скачка вниз на 768px и 992px (особенность реального сайта, не баг) — см. `design-system/webflow-env.css`.
  - `--nav-height: 6.5em` на `:root`
  - global reset для variable fonts в Safari
  - тёмный фон страницы, `@font-face` TT Commons Pro Variable
  - `.section`/`.container` обёртка (паддинги как на реальном сайте), `.container { max-width: 80rem }` — **в rem**, точное значение реального Webflow-контейнера (`.container.centered.u-w-100` = `80rem` fluid, подтверждено против live-сайта bir.ch/manage-upd 13.07.2026: контейнер = 1280px @ root16 и 1536px @ root19.2, т.е. 80rem на обеих ширинах). **Не 90rem** — старое значение делало каждый dev-блок ~10rem (~192px) шире задеплоенного сайта. `padding-inline: 1.5rem` (= 28.8px @ root19.2) тоже совпадает с live. Это dev-инструмент, не финальный embed; для самого embed контейнерные токены задавать в `px`, см. «Webflow embed — токены контейнеров в `px`» выше. Примечание: `tokens.css` `.container` = `--container-lg` (100rem) — на dev-страницах перебивается `webflow-env.css` (80rem, грузится позже); если понадобится, дизайн-систему можно свести к 80rem отдельно.

  Nav-меню (HTML-разметка `.sim-nav`) — отдельный partial `design-system/webflow-env-nav.html`, вставляется сразу после `<body>`. Первая секция страницы должна получить дополнительный `padding-top` под высоту нава, например `padding-top: calc(<исходный паддинг> + var(--nav-height));`.

- **Нумерация вопросов в брифинге** — все уточняющие вопросы перед версткой нумеровать (1, 2, 3…), чтобы пользователь мог отвечать в формате «1 — ответ, 2 — ответ».

- **Брифинг перед версткой** — когда пользователь присылает новый блок или страницу для верстки, сначала открой макет через Figma MCP и задай все уточняющие вопросы. Не приступай к верстке пока не получены ответы. Вопросы по категориям:
  - **Layout**: что диктует высоту блока — какой элемент главный? Как колонки связаны по высоте?
  - **Адаптив**: есть ли таблетный/мобильный макет в Figma? Что меняется в layout? Мобайл — это адаптив CSS или отдельный JS-режим с другой логикой (например, скролл → свайп)? Если второе — это отдельная задача, которую нужно планировать с самого начала. В коде сразу закладывать паттерн `initX() / destroyX()` с guard-переменными, не добавлять его потом.
  - **Анимация**: есть ли анимация, как триггерится (скролл/клик/авто), меняется ли высота блока между состояниями? Если на мобайле анимация принципиально другая — зафиксировать это в брифинге и не пытаться переиспользовать десктопную систему.
  - **Контент**: динамический или статичный, сколько состояний?
  - **Неясности**: любые значения или поведения которые не очевидны из макета

- **Media queries — каскад брейкпоинтов** — диапазонные запросы (`min-width AND max-width`) использовать только когда стиль нужен **исключительно** на одном брейкпоинте и не должен применяться ниже. Если стиль должен работать на данном брейкпоинте и всех меньших — использовать только `max-width` без нижней границы: `@media (max-width: 991px)` покрывает планшет и мобилку автоматически. Это предотвращает ситуацию когда правило «не доходит» до меньших брейкпоинтов и его приходится дублировать.

- **Мобилка — это вертикальный поток, а не «адаптив десктопного absolute-макета»** — если на десктопе блок построен на `position: absolute` + JS-позиционировании (sticky-scroll композиция, наложения, вылеты за края), на мобилке **не переносить эту систему**. Мобильную версию верстать с нуля как обычный вертикальный flow: `position: relative`/`static`, элементы стопкой (block/flex-column), высота контейнеров приходит от контента (не хардкодить `height`), горизонтальные вылеты убираются. Absolute+JS оставлять строго под десктопную композицию, которая этого требует. Признак что свернул не туда: начал считать `padding-top`-распорки, `margin-top: -Nrem` или `calc(nav-height + …)` офсеты, чтобы «подвинуть» элемент под другой — в потоке это не нужно, элементы и так стоят друг за другом. Именно эти хаки на мобилке почти всегда потом переделываются.

- **Сброс десктопных offset/position в мобильном media query** — десктопные значения `position`, `margin`, `top/left/right/bottom`, `transform`-смещения протекают в мобилку, если их явно не сбросить. При переходе блока в мобильный flow в `@media (max-width: 767px)` явно перекрывать всё что задавалось на десктопе для позиционирования: `position: static/relative`, `inset: auto` (или `top/left/right/bottom: auto`), `margin: 0`. Не рассчитывать что «оно само» — CSS-каскад тянет десктопное правило вниз.

- **`overflow: hidden` обрезает повёрнутый/`transform`-контент** — не ставить `overflow: hidden` на контейнер рефлекторно: если внутри есть повёрнутые (`rotate`) или вылезающие декоративные элементы (персонажи, флаги, бейджи), он отрежет их углы. Ставить только когда обрезка осознанно нужна. Если цель была спрятать элемент до анимации — он обычно уже скрыт через `opacity: 0`, и `overflow` избыточен.

- **Статика перед анимацией** — сначала добиться правильного вида на всех брейкпоинтах без переходов и анимаций — только потом добавлять `transition`, `transform`, LERP и т.д. Нельзя отлаживать layout и анимацию одновременно: непонятно что именно сломано.

- **Replaced elements в сложных layout'ах** — `<img>` внутри `<picture>` — это replaced element, он не растягивается через `inset`/`right/bottom` как обычный блок. Картинка ведёт себя иначе чем div. На мобайле всегда явно уточнять в брифинге как она должна себя вести (обрезается, заполняет ширину, привязана к углу) — и явно переопределять `display`, `width`, `height` в мобильном media query, не рассчитывать что браузер догадается.

- **Фиксировать решения сразу** — если в процессе работы выясняется что-то важное (как работает анимация, какова высота блока, как ведёт себя элемент) — сразу записывать в CLAUDE.md. Иначе в следующей сессии придётся заново к этому приходить.

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

- **Shared pill/chip text tokens** — for word-pill hero compositions (e.g. `ai-promo.html`, `manage.html`), drive the pill font-size from the shared tokens in `tokens.css` — `--text-pill-size` (desktop) / `--text-pill-size-mobile` (mobile) — instead of a local `clamp()` per file. Every pill/flag/icon dimension and staircase offset in these compositions is expressed in `em` relative to this token, so pointing a new page at the same token keeps its kegl in sync with existing pages automatically, and rescaling the composition later is a one-line token change.

- **Mobile clamp() calibration — anchor at the narrowest width, no plateau** — for mobile fluid tokens like `--text-pill-size-mobile`, calibrate the `vw` coefficient so the design-base value is reached at the **narrowest realistic mobile width (320px)**, not at the Figma mobile frame width (e.g. 402px). Formula: `vw = base_px / 320 * 100`. Let it scale continuously up to the 767px breakpoint ceiling — don't add a separate `max` unless the resulting size at 767px visually overshoots (verify in browser first). Anchoring at the Figma frame width instead causes the value to hit its cap early and stay flat for the rest of the mobile range, which reads as static/non-scalable.

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
