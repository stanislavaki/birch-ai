"""Build a self-contained review artifact for the new menu.

Output: review/menu/menu-artifact.html — an HTML FRAGMENT (no doctype/head/body)
per the Artifact contract. The live menu prototype is embedded as a full HTML
document template instantiated into three srcdoc iframes (desktop + two phones).
Background pages are full-page JPEG screenshots (CSP forbids external requests).
"""
import base64, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__)) + '/../..'

def b64(path, mime):
    with open(os.path.join(ROOT, path), 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())

font = b64('fonts/TT_Commons_Pro_Variable.woff2', 'font/woff2')
imgs = {
    'desk_dark': b64('review/menu/bg_desk_dark.jpg', 'image/jpeg'),
    'desk_light': b64('review/menu/bg_desk_light.jpg', 'image/jpeg'),
    'mob_dark': b64('review/menu/bg_mob_dark.jpg', 'image/jpeg'),
    'mob_light': b64('review/menu/bg_mob_light.jpg', 'image/jpeg'),
}

tpl = open(os.path.join(ROOT, 'menu.html')).read()

def rep(old, new, must=True):
    global tpl
    if must:
        assert old in tpl, 'NOT FOUND: ' + old[:80]
    tpl = tpl.replace(old, new, 1)

# 1) self-contained head: font + fluid root font-size + resets instead of links
rep('<link rel="stylesheet" href="design-system/tokens.css">\n<link rel="stylesheet" href="design-system/webflow-env.css">',
"""<style>
@font-face {
  font-family: "TT Commons Pro Variable";
  src: url(%s) format("woff2");
  font-weight: 100 900;
  font-style: normal;
}
html { font-size: 16px; }
@media (min-width: 768px)  { html { font-size: calc(12.5px + 3.5 * ((100vw - 768px) / 223)); } }
@media (min-width: 992px)  { html { font-size: calc(12.67px + 3.33 * ((100vw - 992px) / 288)); } }
@media (min-width: 1280px) { html { font-size: calc(16px + 3.2 * ((100vw - 1280px) / 320)); } }
@media (min-width: 1600px) { html { font-size: 19.2px; } }
*, *::before, *::after { box-sizing: border-box; }
* { font-style: normal; font-weight: 600; font-stretch: 100%%; font-variation-settings: "ital" 0, "slnt" 0; }
body { margin: 0; font-family: "TT Commons Pro Variable", Arial, sans-serif; }
:root { --font: "TT Commons Pro Variable", Arial, sans-serif; --color-bg: #0D0D12; }
</style>""" % font)

# 2) background: scrollable screenshot instead of the live iframe
rep(""".mock-frame {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  z-index: 1;             /* under the menu (1000) */
  background: var(--color-bg);
}""",
""".mock-bg { display: block; width: 100%; }""")

rep('<iframe class="mock-frame" src="use-cases.html" title="Page behind the menu"></iframe>',
    '<img class="mock-bg" id="mock-bg" alt="">')

# 3) JS: no live iframe to manage
rep("""/* hide the background page's own sim navbar so only the new menu shows */
document.querySelector('.mock-frame').addEventListener('load', function () {
  try {
    var doc = this.contentDocument;
    var st = doc.createElement('style');
    st.textContent = '.sim-nav { display: none !important; }';
    doc.head.appendChild(st);
  } catch (e) { /* cross-origin guard; same-origin in dev */ }
});

""", "")

rep("""  var sel = document.getElementById(light ? 'dev-bg-light' : 'dev-bg-dark');
  var src = bgSrc || sel.value;
  sel.value = src;
  var frame = document.querySelector('.mock-frame');
  if (frame.getAttribute('src') !== src) frame.src = src;
}""",
"""  var bg = window.MENU_BG || {};
  document.getElementById('mock-bg').src = bg[light ? 'light' : 'dark'] || '';
}""")

rep("""document.getElementById('dev-bg-dark').addEventListener('change', function () { setTheme(false, this.value); });
document.getElementById('dev-bg-light').addEventListener('change', function () { setTheme(true, this.value); });
""", "")

rep("""  <label class="dev-only-dark">background:
    <select id="dev-bg-dark">
      <option value="ai-promo.html">ai-promo</option>
      <option value="manage.html">manage</option>
    </select>
  </label>
  <label class="dev-only-light">background:
    <select id="dev-bg-light">
      <option value="use-cases.html">prompts</option>
    </select>
  </label>
""", "")

rep("""/* the host page has no scroll of its own: forward wheel to the iframe so
   the background can be scrolled from anywhere (over the pill included) */
window.addEventListener('wheel', function (e) {
  var frame = document.querySelector('.mock-frame');
  if (frame && frame.contentWindow) frame.contentWindow.scrollBy(0, e.deltaY);
}, { passive: true });

""", "")

# 4) config comes from the wrapper, not URL params
rep("""/* tooling params: ?theme=light&sheet=glass|glass2|theme&open=1&nopanel=1 */
(function () {
  var q = new URLSearchParams(location.search);
  if (q.get('theme') === 'light') setTheme(true);
  if (q.get('nopanel')) document.body.classList.add('dev-hidden');
  if (q.get('panel') === 'min') document.getElementById('dev-panel').classList.add('is-min');
  if (q.get('open') && matchMedia('(max-width: 767px)').matches) {
    setTimeout(function () { if (window.__nav2mOpen) window.__nav2mOpen(); }, 300);
  }
})();""",
"""/* wrapper-injected config */
(function () {
  var cfg = window.MENU_CFG || {};
  if (cfg.theme === 'light') setTheme(true);
  if (cfg.panelMin) {
    document.getElementById('dev-panel').classList.add('is-min');
    document.getElementById('dev-fold').innerHTML = '+';
  }
  if (cfg.open && matchMedia('(max-width: 767px)').matches) {
    setTimeout(function () { if (window.__nav2mOpen) window.__nav2mOpen(); }, 400);
  }
})();""")

# 5) config injection point before the main script
rep('\n<script>\n', '\n<script>/*__CFG__*/</script>\n<script>\n')

assert '__CFG__' in tpl and 'mock-frame' not in tpl

# ---- wrapper fragment ----
def cfg_js(theme, open_, bg_dark, bg_light):
    return ('window.MENU_CFG=' + json.dumps({'theme': theme, 'open': open_, 'panelMin': True})
            + ';window.MENU_BG=' + json.dumps({'dark': imgs[bg_dark], 'light': imgs[bg_light]}) + ';')

wrapper = """<style>
* { box-sizing: border-box; }
body {
  margin: 0; background: #000;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}
.mbar {
  height: 3.25rem;
  display: flex; align-items: center; gap: 1.25rem;
  padding: 0 1.25rem;
  color: #fff; font-size: 0.8125rem;
  background: #161618;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: relative; z-index: 100;
}
.mbar .title { font-weight: 600; letter-spacing: -0.01em; margin-right: 0.5rem; }
.seg { display: inline-flex; padding: 0.125rem; background: rgba(118, 118, 128, 0.24); border-radius: 0.5625rem; }
.mtab {
  font: inherit; font-weight: 500;
  padding: 0.3rem 1rem; cursor: pointer;
  background: transparent; color: rgba(255, 255, 255, 0.72);
  border: none; border-radius: 0.4375rem;
  transition: background-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
}
.mtab.is-on { background: #636366; color: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3); }
.mtab:not(.is-on):hover { color: #fff; }
.mtab--sm { padding: 0.25rem 0.8rem; font-size: 0.75rem; }
.mbar .hint { color: #98989D; margin-left: auto; font-size: 0.75rem; }
.mview { display: none; height: calc(100vh - 3.25rem); }
.mview.is-on { display: flex; }
.mview--desktop iframe { width: 100%; height: 100%; border: none; }
.mview--mobile { justify-content: center; gap: 1.5rem; padding: 1.5rem; }
.mview--mobile iframe { width: 390px; height: 100%; border: 1px solid #333; border-radius: 0.75rem; background: #111; }
.mlbl {
  position: absolute; top: 0.5rem; left: 0.625rem; z-index: 10;
  background: #1C1C1E; color: #fff; font-weight: 600;
  padding: 0.15rem 0.6rem; border-radius: 62.4375rem; font-size: 0.6875rem;
  letter-spacing: 0.02em; text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.mph { position: relative; }
</style>
<div class="mbar">
  <span class="title">Birch — новое меню</span>
  <span class="seg">
    <button type="button" class="mtab is-on" data-view="desktop">Десктоп</button>
    <button type="button" class="mtab" data-view="mobile">Мобилка</button>
  </span>
  <span class="seg" id="theme-tabs">
    <button type="button" class="mtab mtab--sm is-on" data-th="dark">Тёмная</button>
    <button type="button" class="mtab mtab--sm" data-th="light">Светлая</button>
  </span>
  <span class="hint" id="hint">всё живое — ховеры, клики и скролл работают; «menu dev» в углу разворачивает настройки</span>
</div>
<div class="mview mview--desktop is-on" id="view-desktop">
  <iframe id="dd"></iframe>
</div>
<div class="mview mview--mobile" id="view-mobile">
  <div class="mph"><span class="mlbl">dark</span><iframe id="md"></iframe></div>
  <div class="mph"><span class="mlbl">light</span><iframe id="ml"></iframe></div>
</div>
<script>
var TPL = __TPL__;
function mount(id, cfg) {
  var f = document.getElementById(id);
  f.srcdoc = TPL.replace('/*__CFG__*/', cfg);
}
mount('dd', __CFG_DESK__);
mount('md', __CFG_MOB_DARK__);
mount('ml', __CFG_MOB_LIGHT__);

document.querySelectorAll('.mtab[data-view]').forEach(function (t) {
  t.addEventListener('click', function () {
    document.querySelectorAll('.mtab[data-view]').forEach(function (x) { x.classList.toggle('is-on', x === t); });
    var desktop = t.getAttribute('data-view') === 'desktop';
    document.getElementById('view-desktop').classList.toggle('is-on', desktop);
    document.getElementById('view-mobile').classList.toggle('is-on', !desktop);
    document.getElementById('theme-tabs').style.visibility = desktop ? 'visible' : 'hidden';
    document.getElementById('hint').textContent = desktop
      ? 'всё живое — ховеры, клики и скролл работают; «menu dev» в углу разворачивает настройки'
      : 'слева тёмная тема, справа светлая; меню открыто, всё кликабельно';
  });
});
document.querySelectorAll('.mtab[data-th]').forEach(function (t) {
  t.addEventListener('click', function () {
    document.querySelectorAll('.mtab[data-th]').forEach(function (x) { x.classList.toggle('is-on', x === t); });
    var w = document.getElementById('dd').contentWindow;
    if (w && w.setTheme) w.setTheme(t.getAttribute('data-th') === 'light');
  });
});
</script>
"""
# escape closing tags so the JSON literal can live inside a <script> block
wrapper = wrapper.replace('__TPL__', json.dumps(tpl).replace('</', '<\\/'))
wrapper = wrapper.replace('__CFG_DESK__', json.dumps(cfg_js('dark', False, 'desk_dark', 'desk_light')))
wrapper = wrapper.replace('__CFG_MOB_DARK__', json.dumps(cfg_js('dark', True, 'mob_dark', 'mob_light')))
wrapper = wrapper.replace('__CFG_MOB_LIGHT__', json.dumps(cfg_js('light', True, 'mob_dark', 'mob_light')))

out = os.path.join(ROOT, 'review/menu/menu-artifact.html')
open(out, 'w').write(wrapper)
print('written', out, len(wrapper) // 1024, 'KB')
