/* ══════════════════════════════════════════════════════════════
   Geometry panel — dev only, never in a Webflow embed.

   Tunes a scene built on "y = y0 + (H - base) * k": per-group k
   sliders, forced canvas heights for the corridor checkpoints, and
   a live readout of what the current viewport actually produces.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root   = document.documentElement;
  var canvas = document.querySelector('.hs__canvas');
  var track  = document.getElementById('hs');
  var bar    = document.querySelector('.hs__bar');
  var card   = document.getElementById('card');
  if (!canvas) return;

  var BASE = 364;
var FLOOR = 364;
  /* Positions now come straight from the authored keyframes, so there
     are no coefficients left to tune — only checkpoints to inspect. */
  var GROUPS = [];
  var CHECKPOINTS = [364, 455, 550];

  /* ── Panel chrome ──────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent = [
    '#geo{position:fixed;right:1rem;bottom:1rem;z-index:3000;width:19rem;',
    'background:#0f0f14ee;border:1px solid #2a2a36;border-radius:.5rem;',
    'font:11px/1.35 ui-monospace,Menlo,monospace;color:#c8c8d4;padding:.75rem;backdrop-filter:blur(8px)}',
    '#geo h4{margin:0 0 .5rem;font-size:11px;color:#fff;letter-spacing:.04em}',
    '#geo .row{display:flex;justify-content:space-between;gap:.5rem;padding:.1rem 0}',
    '#geo .row b{color:#fff;font-weight:600}',
    '#geo .warn b{color:#FF7700}',
    '#geo hr{border:0;border-top:1px solid #2a2a36;margin:.6rem 0}',
    '#geo label{display:block;margin:.45rem 0 .1rem;color:#8f8fa3}',
    '#geo input[type=range]{width:100%;accent-color:#04DE00}',
    '#geo .btns{display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.35rem}',
    '#geo button{flex:1;min-width:3rem;background:#1c1c26;border:1px solid #2f2f3d;color:#c8c8d4;',
    'border-radius:.25rem;padding:.3rem .2rem;cursor:pointer;font:inherit}',
    '#geo button.on{background:#04DE00;border-color:#04DE00;color:#000}',
    '#geo .toggles{display:flex;gap:.5rem;margin-top:.5rem}',
    '#geo h4{cursor:pointer;user-select:none}',
    '#geo h4::after{content:"▾";float:right;color:#8f8fa3}',
    '#geo.is-collapsed{width:auto;padding:.5rem .75rem}',
    '#geo.is-collapsed h4{margin:0}',
    '#geo.is-collapsed h4::after{content:"▸"}',
    '#geo.is-collapsed > :not(h4){display:none}'
  ].join('');
  document.head.appendChild(css);

  var el = document.createElement('div');
  el.id = 'geo';
  el.innerHTML =
    '<h4>SCENE GEOMETRY</h4>' +
    '<div class="row"><span>viewport</span><b id="g-vp">—</b></div>' +
    '<div class="row"><span>root</span><b id="g-root">—</b></div>' +
    '<div class="row"><span>контейнер</span><b id="g-cw">—</b></div>' +
    '<div class="row"><span>масштаб по ширине</span><b id="g-uw">—</b></div>' +
    '<div class="row"><span>масштаб сцены</span><b id="g-u">—</b></div>' +
    '<div class="row"><span>canvas</span><b id="g-ch">—</b></div>' +
    '<div class="row" id="g-hd-row"><span>высота сцены</span><b id="g-hd">—</b></div>' +
    '<div class="row"><span>рул от центра</span><b id="g-cx">—</b></div>' +
    '<div class="row"><span>слайд</span><b id="g-slide">—</b></div>' +
    '<div class="row"><span>прогресс</span><b id="g-p">—</b></div>' +
    '<div class="row"><span>шаг (blend)</span><b id="g-t">—</b></div>' +
    '<hr>' +
    '<label>экранов скролла на шаг — <b id="g-tps-out">1</b></label>' +
    '<input id="g-tps" type="range" min="0.3" max="2.5" step="0.1" value="1">' +
    '<div class="row"><span>трек всего</span><b id="g-track">—</b></div>' +
    '<hr><div id="g-sliders"></div><hr>' +
    '<label>высота canvas (единицы макета)</label>' +
    '<div class="btns" id="g-cps"></div>' +
    '<div class="toggles">' +
      '<button id="g-guides">линия 364</button>' +
      '<button id="g-core">core</button>' +
      '<button id="g-copy">copy</button>' +
    '</div>';
  document.body.appendChild(el);

  /* collapsed by default — expand by clicking the title; remembered per browser */
  var KEY = 'hs-geo-open';
  var open = false;
  try { open = localStorage.getItem(KEY) === '1'; } catch (e) {}
  el.classList.toggle('is-collapsed', !open);
  el.querySelector('h4').addEventListener('click', function () {
    open = !open;
    el.classList.toggle('is-collapsed', !open);
    try { localStorage.setItem(KEY, open ? '1' : '0'); } catch (e) {}
  });

  var tps = document.getElementById('g-tps');
  tps.addEventListener('input', function () {
    track.style.setProperty('--track-per-step', tps.value);
    document.getElementById('g-tps-out').textContent = tps.value;
    if (window.__hsApply) window.__hsApply();
    render();
  });

  var slidersEl = document.getElementById('g-sliders');
  GROUPS.forEach(function (g) {
    var v = getComputedStyle(root).getPropertyValue(g.key).trim();
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<label>' + g.label + ' — <b data-out>' + v + '</b></label>' +
      '<input type="range" min="0" max="1" step="0.01" value="' + parseFloat(v) + '">';
    var input = wrap.querySelector('input');
    var out   = wrap.querySelector('[data-out]');
    input.addEventListener('input', function () {
      root.style.setProperty(g.key, input.value);
      out.textContent = input.value;
      render();
    });
    slidersEl.appendChild(wrap);
  });

  var cpsEl  = document.getElementById('g-cps');
  var forced = null;
  function setForced(v) {
    forced = v;
    document.body.classList.toggle('is-forced', v !== null);
    if (v !== null) root.style.setProperty('--canvas-force', v);
    [].forEach.call(cpsEl.children, function (b) {
      b.classList.toggle('on', b.dataset.v === String(v));
    });
    render();
  }
  CHECKPOINTS.concat(['auto']).forEach(function (v) {
    var b = document.createElement('button');
    b.textContent = v;
    b.dataset.v = v === 'auto' ? 'null' : String(v);
    b.addEventListener('click', function () { setForced(v === 'auto' ? null : v); });
    cpsEl.appendChild(b);
  });

  function toggle(id, cls) {
    var btn = document.getElementById(id);
    btn.addEventListener('click', function () {
      btn.classList.toggle('on', document.body.classList.toggle(cls));
      render();
    });
  }
  toggle('g-guides', 'is-guides');
  toggle('g-core',   'is-core');

  document.getElementById('g-copy').addEventListener('click', function () {
    var cfg = GROUPS.map(function (g) {
      return '  ' + g.key + ': ' + getComputedStyle(root).getPropertyValue(g.key).trim() + ';';
    }).join('\n');
    navigator.clipboard.writeText(':root {\n' + cfg + '\n}');
    this.textContent = 'ok';
    setTimeout(function () { document.getElementById('g-copy').textContent = 'copy'; }, 900);
  });

  /* ── Readout ───────────────────────────────────────────── */
  var coreBox = document.getElementById('coreBox');

  function render() {
    var rootPx = parseFloat(getComputedStyle(root).fontSize);
    var cw  = card.getBoundingClientRect().width;
    var ch  = canvas.getBoundingClientRect().height;
    var uw  = cw / 1232;
    var u   = uw;   /* width-driven only */
    var hd  = ch / u;
    var max = parseFloat(getComputedStyle(root).getPropertyValue('--scene-max'));

    var state = forced !== null      ? 'forced'
              : hd <= 365            ? 'пол'
              : hd >= max - 0.5      ? 'потолок'
              :                        'свободно';

    set('g-vp',   Math.round(innerWidth) + '×' + Math.round(innerHeight));
    set('g-root', rootPx.toFixed(2) + 'px');
    set('g-cw',   Math.round(cw) + 'px');
    set('g-uw',   uw.toFixed(3) + '×');
    set('g-u',    u.toFixed(3) + '×');
    set('g-ch',   Math.round(ch) + 'px');
    set('g-hd',   Math.round(hd) + '  (' + state + ')');
    var rc = canvas.querySelector('[data-core]');
    if (rc) {
      var rr = rc.getBoundingClientRect(), cc = canvas.getBoundingClientRect();
      set('g-cx', Math.round((rr.left + rr.width / 2) - (cc.left + cc.width / 2)) + 'px');
    }
    var hdRow = document.getElementById('g-hd-row');
    if (hdRow) hdRow.classList.toggle('warn', state !== 'свободно');

    var hs = window.__hs || { p: 0, index: 0 };
    set('g-slide', '0' + ((hs.slide || 0) + 1) + '  ·  шаг ' + ((hs.step || 0) + 1) + '/' + (hs.steps || 1));
    set('g-p', hs.p.toFixed(3));
    set('g-t', (hs.t || 0).toFixed(2));
    set('g-track', Math.round(track.offsetHeight) + 'px  ·  ' +
        (track.offsetHeight / innerHeight).toFixed(1) + ' экрана');

    /* core bbox = union of the fragments that must stay visible */
    var cr = canvas.getBoundingClientRect();
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    [].forEach.call(canvas.querySelectorAll('[data-core]'), function (f) {
      var r = f.getBoundingClientRect();
      x1 = Math.min(x1, r.left);  y1 = Math.min(y1, r.top);
      x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
    });
    if (x1 < Infinity) {
      coreBox.style.left   = (x1 - cr.left) + 'px';
      coreBox.style.top    = (y1 - cr.top)  + 'px';
      coreBox.style.width  = (x2 - x1) + 'px';
      coreBox.style.height = (y2 - y1) + 'px';
    }
  }
  /* null-safe: the panel may be removed from the DOM (screenshots) while scroll listeners still fire */
  function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  new ResizeObserver(render).observe(canvas);
  addEventListener('scroll', render, { passive: true });
})();
