# Birch AI — Claude Instructions

## Docs map — что читать под задачу

`CLAUDE.md` грузится в контекст всегда. Специализированные знания вынесены в отдельные файлы — **перед соответствующей работой открой нужный**:

| Задача | Читать |
|---|---|
| Сборка блоков в Webflow через Data-API MCP | `docs/webflow-mcp.md` |
| Сборка embed-кода для Webflow | `EMBED-ISSUES.md` |
| Работа в Figma через `use_figma` | `docs/figma-mcp.md` |
| Вёрстка / анимация dev-страницы (раскладка, мобилка, scroll, Debug Panel, ревью-артефакт) | `docs/dev-pages.md` |
| Что осознанно отложено и почему (перед оценкой задачи — свериться) | `docs/tech-debt.md` |

Индекс для людей — `docs/README.md`.

## Meta rules

- **CLAUDE.md updates** — whenever a global pattern or rule is established (e.g. a new CSS convention, a layout approach, a naming rule), always ask the user: "Should I add this to CLAUDE.md for future pages?" before ending the task.
- **Git branch** — always create a feature branch at the start of every session before making any changes. Use the format `feature/<short-description>`. Never work directly on `main`.
- **Слияние в `main` — только через pull request** — репозиторий общий, и вся история слияний здесь идёт через PR (`Merge pull request #4…#7`). Даже если сказано «слей в main», это значит **оформить PR**, а не сделать `git push origin HEAD:main`. Порядок: `git push origin <ветка>` → `gh pr create --base main` → слияние после ревью. Прямой push в `main` — только если это сказано отдельно и явно. Правило появилось после того, как 40 коммитов уехали в `main` fast-forward'ом без ревью: откатывать не стали, потому что переписывать общую историю хуже.
- **Code comments in English only** — все комментарии в коде (JS, CSS, HTML, embed-сниппеты, custom-code для Webflow) писать только на английском, независимо от языка общения. Объяснения и обсуждение в чате — на языке пользователя, но то, что попадает в код (и потенциально в прод/Webflow), — по-английски.
- **Сетап-инструкции для сторонних продуктов — только со сверкой** — никогда не писать по памяти инструкции по подключению к чужим продуктам (ChatGPT, Claude, Cursor, Perplexity…): их UI, пути в меню и транспорты меняются очень быстро. Всегда сверяться с актуальной документацией (web-поиск/официальные доки) и **явно помечать, что не проверено первоисточником**, чтобы это ушло в фактчек. Реальный кейс: рекомендация эндпоинта `/sse/` оказалась устаревшей — актуален Streamable HTTP (`/mcp`), а HTTP+SSE deprecated.
- **Не обещать в копирайте интерфейс, которого нет** — в текстах мокапов не ссылаться на элементы, которых в интерфейсе не существует (напр. «your cleanup list» читается как раскрывающийся список или кнопка). Либо элемент реально есть, либо формулировка меняется на вердикт/вопрос.
- **`meta-description` кейса — про клиента от третьего лица, не цитата** — писать утверждение о том, что клиент получил: «By automating stricter decisions in creative testing, Velrio can test twice as many creatives with the same budget». **Не** использовать конструкцию «Имя says “цитата”»: это сниппет в выдаче, и он должен сообщать результат, а не тратить символы на атрибуцию и кавычки. Цитата для этого уже есть в поле `quote-1-text` и выводится на самой странице. В существующих кейсах схема разнобойная (на 18.08.2026: 8 кейсов с «says», 4 через `How …`, 4 дословным заголовком, 4 произвольные) — норма именно эта, остальное наследие переноса. Название компании в тексте обязательно: сниппет должен работать в отрыве от заголовка.

- **Текстовый бюджет — замерять по существующему макету** — перед написанием копирайта в карточку сначала **замерить вместимость по уже отрисованному эталону** (сколько текста влезает без мельчения шрифта), и писать под этот бюджет. Пример: карточка чата = заголовок + 3–4 однострочных ряда + 1 финальная строка-вывод.
- **Docs map — держать в актуальности (обязательный шаг завершения)** — знания живут в профильных файлах, а не свалкой в CLAUDE.md: подтверждённое глобальное правило класть в нужный док (Webflow-MCP → `docs/webflow-mcp.md`, embed → `EMBED-ISSUES.md`, Figma → `docs/figma-mcp.md`, вёрстка/анимация dev → `docs/dev-pages.md`). **Инвариант: каждый файл `docs/*.md` и каждый вынесенный корневой `*.md`-раздел ОБЯЗАН иметь строку в таблице «Docs map» выше и в `docs/README.md`.** Поэтому:
  1. Создал новый md-файл (или новый крупный раздел) → **в том же изменении** добавь строку про него в «Docs map» и в `docs/README.md`. Не «потом».
  2. **Перед завершением любой задачи, где менялась структура доков, свериться**, что каждый существующий `docs/*.md` присутствует в «Docs map» (быстрая проверка: `ls docs/*.md` ↔ строки таблицы). Рассинхрон = баг: файла, которого нет в карте, я в следующей сессии не открою — он для меня невидим (в контекст автоматически грузится только `CLAUDE.md`).
  3. Что-то важное выяснилось по ходу (как работает анимация, высота блока, поведение элемента) — фиксировать сразу в нужный файл, а не переоткрывать в следующей сессии.
- **Всё, что решается нативно, решать нативно** — если задачу можно закрыть средствами самого инструмента (класс или комбо-класс в Webflow, настройка элемента, существующий вариант стиля), делать так, а не подкладывать кастомный CSS/JS. Кастом-код — крайняя мера, когда нативного пути нет (например, стилизация детей рич-текста, куда класс не повесить). Причина не в чистоте ради чистоты: **кастомный код страницы не выполняется ни на холсте Designer, ни в Webflow Preview** — он виден только на опубликованном сайте. То есть правка, сделанная кастом-кодом, для дизайнера в Webflow невидима: он смотрит превью, не находит её и чинит второй раз, после чего одно и то же живёт в двух местах. Прежде чем писать правило в кастом-код, проверить: нет ли уже готового класса или его варианта, который делает нужное. Реальный кейс: отступ ряда в карточке компании закрывался существующим вариантом класса, а был продублирован правилом в `<head>`.

- **Универсальные решения** — если для задачи есть более универсальный или гибкий подход (например `min()`, `clamp()`, относительные единицы вместо фиксированных), сначала предложи варианты с объяснением, не применяй сразу.
- **Нумерация вопросов в брифинге** — все уточняющие вопросы перед версткой нумеровать (1, 2, 3…), чтобы пользователь мог отвечать в формате «1 — ответ, 2 — ответ».
- **Брифинг перед версткой** — когда пользователь присылает новый блок или страницу для верстки, сначала открой макет через Figma MCP и задай все уточняющие вопросы. Не приступай к верстке пока не получены ответы. Вопросы по категориям:
  - **Layout**: что диктует высоту блока — какой элемент главный? Как колонки связаны по высоте?
  - **Адаптив**: есть ли таблетный/мобильный макет в Figma? Что меняется в layout? Мобайл — это адаптив CSS или отдельный JS-режим с другой логикой (например, скролл → свайп)? Если второе — это отдельная задача, которую нужно планировать с самого начала. В коде сразу закладывать паттерн `initX() / destroyX()` с guard-переменными, не добавлять его потом.
  - **Анимация**: есть ли анимация, как триггерится (скролл/клик/авто), меняется ли высота блока между состояниями? Если на мобайле анимация принципиально другая — зафиксировать это в брифинге и не пытаться переиспользовать десктопную систему.
  - **Контент**: динамический или статичный, сколько состояний?
  - **Неясности**: любые значения или поведения которые не очевидны из макета
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

- **Заголовки — `text-wrap: balance`** — на все заголовки по умолчанию задавать `text-wrap: balance` (браузер сам выравнивает длину строк, без «длинная строка + одно слово»; работает до ~6 строк, пересчитывается на ресайзе, деградирует безопасно в старых браузерах). Для длинных абзацев/body — `text-wrap: pretty` (убирает «сироту»). Ручной `<br class="…">` со скрытием на брейкпоинте — только для арт-дирекшн-переноса строго после конкретного слова; для «просто разложи красиво» `balance` избавляет от `<br>` совсем (один класс работает на всех размерах). В Webflow: **Typography → Text Wrap → Balance/Pretty** (если контрол есть), иначе через MCP `data_style_tool` (принимает `text-wrap` как обычное свойство) или custom-code `<style>`.
- **No px** — never use `px` units in CSS or inline styles. Use `rem` for all fixed sizes (spacing, radius, font sizes), `%` for widths relative to a parent container, and `vw`/`vh` for viewport-relative sizes. Convert Figma px values: divide by 16 for rem (e.g. 24px → 1.5rem). For elements inside a fixed-width container, express widths as `elementPx / containerPx * 100%`.
- **JS animations** — never hardcode pixel offsets in animation scripts. Compute them from the rendered element size (e.g. `el.offsetWidth * ratio`) so they scale when the container resizes.
- **Component classes only** — use classes from `design-system/components/` for any UI pattern that has a component file. Don't rewrite styles that are already defined there.
- **No new values** — if a value you need doesn't exist in `tokens.css`, ask the user before inventing one. The right answer is usually to add it to Figma first, then sync it with `/figma-sync`.
- **Styleguide is the reference** — check `design-system/styleguide.html` to see all available tokens, utility classes, and components before writing any CSS.
- **Grid** — always use the 12-column grid system from `tokens.css` for layout. Use `.container` to center content, `.grid` for column layouts, and `.col-{n}` span helpers. Use `--gap-main`, `--pad-horizontal`, and `--pad-gutter` tokens for spacing — never hardcode gutters or margins. On mobile (≤767px) the grid collapses to a single column automatically. The default `.container` caps at `1600px` (`--container-lg`); use `.container-sm` (1024px) or target `--container-md` (1280px) for narrower sections.
- **Fluid scaling with clamp()** — visual containers should scale across screen widths using `clamp(min, preferred, max)` rather than a single fixed width. The preferred value should be a `vw` unit calibrated to the designed width (e.g. if the design is 1280px and the container is 1120px wide, use `87.5vw`). Always pair with `max-width: calc(100vw - 3rem)` as overflow protection on small screens. Use `aspect-ratio` instead of a fixed height so the container grows proportionally. Example: `width: clamp(56.25rem, 87.5vw, 90rem); max-width: calc(100vw - 3rem); aspect-ratio: 16 / 10;`

- **Высота блока — из контента, а не из макета** — у секции в Figma всегда есть конкретная высота (напр. 550px), но это **следствие** раскладки, а не заданный размер. Верстать высоту как контент + вертикальные паддинги; фикс-высоту ставить только там, где она осознанно нужна (клип overflow, sticky-трек). Иначе на другом брейкпоинте композиция перестраивается, а высота остаётся от десктопа — и появляется мёртвое пространство либо обрезка. Родственный случай: если на брейкпоинте прячется **содержимое** секции, гасить **саму секцию** (`display: none`), иначе её вертикальные паддинги остаются в потоке пустой дырой.

- **Переносы строк в flex-композициях — через zero-height разделители, а не дублированием разметки** — когда группировка элементов отличается между брейкпоинтами (напр. на десктопе два ряда пилюль, на мобилке шесть строк с другой разбивкой), не дублировать набор элементов под каждый брейкпоинт. Один набор в `flex-wrap: wrap` + невидимые разделители `flex-basis: 100%; height: 0`, которые показываются/прячутся по брейкпоинту. Даёт точный контроль над разбивкой без завязки на ширину контейнера и без двух копий контента, которые разъезжаются при правках.

- **Shared pill/chip text tokens** — for word-pill hero compositions (e.g. `ai-promo.html`, `manage.html`), drive the pill font-size from the shared tokens in `tokens.css` — `--text-pill-size` (desktop) / `--text-pill-size-mobile` (mobile) — instead of a local `clamp()` per file. Every pill/flag/icon dimension and staircase offset in these compositions is expressed in `em` relative to this token, so pointing a new page at the same token keeps its kegl in sync with existing pages automatically, and rescaling the composition later is a one-line token change.

- **Mobile clamp() calibration — anchor at the narrowest width, no plateau** — for mobile fluid tokens like `--text-pill-size-mobile`, calibrate the `vw` coefficient so the design-base value is reached at the **narrowest realistic mobile width (320px)**, not at the Figma mobile frame width (e.g. 402px). Formula: `vw = base_px / 320 * 100`. Let it scale continuously up to the 767px breakpoint ceiling — don't add a separate `max` unless the resulting size at 767px visually overshoots (verify in browser first). Anchoring at the Figma frame width instead causes the value to hit its cap early and stay flat for the rest of the mobile range, which reads as static/non-scalable.

- **Subgrid для выравнивания строк карточек** — когда несколько карточек в ряду должны выравнивать внутренние строки (заголовок, медиа, описание) друг относительно друга, использовать CSS Subgrid. На родительском `.grid` задать `grid-template-rows: auto 1fr auto` (по числу строк внутри карточки). На каждой карточке: `grid-row: span 3; display: grid; grid-template-rows: subgrid`. Тогда браузер выравнивает соответствующие строки всех карточек по высоте самой высокой. Применять только на десктопе (`min-width: 768px`) — на мобилке карточки одна под другой, subgrid не нужен.

- **JS height measurement — fonts.ready** — любой JS который фиксирует высоту блока через `offsetHeight` (например, чтобы предотвратить layout jumps при динамическом контенте) должен запускаться дважды: сразу (`sizeBox()`) и после загрузки шрифтов (`document.fonts.ready.then(sizeBox)`). Иначе измерение идёт по системному шрифту, а после загрузки TT Commons Pro метрики меняются и высота оказывается неверной. Дополнительно: на блок добавлять `contain: layout` (изменения внутри не выходят наружу) и `overflow-anchor: none` (отключить scroll anchoring который компенсирует height-скачки скроллом).

- **em-единицы для интерактивных элементов** — padding и border-radius пилюль (pill), тегов и аналогичных элементов задавать в `em`, а не `rem`. Тогда они масштабируются автоматически вместе с `font-size` родителя (например с `--ps` на мобилке). Пример: `padding: 0.058em 0.462em 0.154em; border-radius: 0.308em;`. Конвертация: делим Figma px на значение font-size элемента в px.

- **Паддинг карточек — 32px на десктопе → 24px на мобилке** — у всех карточек внутренний padding на десктопе `--space-md` (2rem = 32px), а на мобилке (`@media (max-width: 767px)`) он опускается до `--space` (1.5rem = 24px). Правило общее для всех карточек (product-карточки, кейс-карточки и т.п.), задавать через токены, не литералами. Пример: `.uc-card { padding: var(--space-md); }` на десктопе и `.uc-card { padding: var(--space); }` в мобильном media query. Баннеры/чипы со своим паддингом сюда не относятся — только карточки.

- **Оптическое центрирование текста по вертикали — больше верхнего паддинга** — caps-heavy текст (бейджи/чипы вроде `META MCP`, крупные дисплей-заголовки) оптически сидит высоко: у капители нет нижних выносных, «масса» глифов в верхней части строки, и при симметричном паддинге текст читается смещённым вверх. Давать чуть больше верхнего паддинга, чем нижнего (наш бейдж: `padding: 0.62em 0.6em 0.38em` вместо `.45/.55`; баннер-заголовок получил отдельный `padding-top`). Направление правки всегда одно — вниз; величину подбирать глазами/замером (у линии текста меряется не `line-box`, а расстояние от края чипа до видимой массы). То же и для serif-цитат — им обычно нужен небольшой `padding-top` (см. `--wf`-цитаты в use-cases).

- **Ряд чипов/бейджей — `align-items: center`** — flex-ряд по умолчанию `align-items: stretch`, поэтому более низкий чип (напр. жёлтая пилюля `IN ROADMAP` с меньшим паддингом) растягивается до высоты самого высокого соседа, а его `align-items: baseline`-текст оседает к низу и выглядит нецентрованным по вертикали. Ставить `align-items: center` на контейнер ряда — тогда каждый чип своей естественной высоты и по центру, а не тянется. Диагностика: внешние боксы чипов совпадают по верх/низ (stretch «выровнял»), а текст внутри — нет.

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
