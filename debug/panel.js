/* ══════════════════════════════════════════════════════════════
   Birch Debug Panel  v1.3
   Reusable scroll-animation debug panel.
   Drop panel.css + panel.js into any dev HTML, never in embeds.

   Usage:
     DebugPanel.init({
       getP:    () => window._dbgP,       // current scroll progress
       getPws:  () => window._dbgPws,     // optional second lerp channel
       pRange:  [-1, 1],                  // optional, default [-1, 1]
       tracks:  [ ...trackDefs ],
       sliders: [ ...sliderDefs ],
       onCopy:  () => stringToCopy,
     });

   Track definition:
     { key, label, color,
       getS, setS,        // timeline bar start
       getE, setE,        // timeline bar end
       ease,              // () => [x1,y1,x2,y2]  — omit for no bezier tab
       setEase,           // ([x1,y1,x2,y2]) => void
       inP,               // p => 0-1  — for live bezier indicator
       bodyDrag,          // boolean, default true
     }

   Slider definition:
     { label, get, set, min, max, step, fmt }
══════════════════════════════════════════════════════════════ */

const DebugPanel = (function () {
  'use strict';

  /* ── Internal helpers ────────────────────────────────────── */
  function remap(p, lo, hi) {
    return Math.max(0, Math.min(1, (p - lo) / (hi - lo)));
  }

  function makeBezier(x1, y1, x2, y2) {
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let t = p, lo = 0, hi = 1;
      for (let i = 0; i < 14; i++) {
        const bx = 3*(1-t)*(1-t)*t*x1 + 3*(1-t)*t*t*x2 + t*t*t;
        if (Math.abs(bx - p) < 0.0001) break;
        if (bx < p) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return 3*(1-t)*(1-t)*t*y1 + 3*(1-t)*t*t*y2 + t*t*t;
    };
  }

  function evalBez(e, inP) {
    if (inP <= 0) return 0;
    if (inP >= 1) return 1;
    const [x1, y1, x2, y2] = e;
    let t = inP, lo = 0, hi = 1;
    for (let i = 0; i < 14; i++) {
      const bx = 3*(1-t)*(1-t)*t*x1 + 3*(1-t)*t*t*x2 + t*t*t;
      if (Math.abs(bx - inP) < 0.0001) break;
      if (bx < inP) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return 3*(1-t)*(1-t)*t*y1 + 3*(1-t)*t*t*y2 + t*t*t;
  }

  function r2(v) { return Math.round(v * 100) / 100; }

  /* Strip alpha from 8-char hex so SVG stroke isn't transparent */
  function solidColor(col) {
    return (typeof col === 'string' && col.length === 9) ? col.slice(0, 7) : col;
  }

  /* ── HTML injection ──────────────────────────────────────── */
  function injectHTML() {
    const el = document.createElement('div');
    el.id = 'dbg';
    el.innerHTML = `
      <div id="dbg-header">
        <span class="title">▸ Timeline</span>
        <span style="color:#555;font-size:10px">p:&nbsp;<span id="dbg-pval" style="color:#04DE00">0.00</span>&nbsp;·&nbsp;click to toggle</span>
      </div>
      <div id="dbg-body">
        <div id="tl-grid">
          <div id="tl-labels"></div>
          <div id="tl-rows">
            <div id="tl-presticky"></div>
            <div id="tl-cursor"></div>
            <div id="tl-ruler"></div>
          </div>
        </div>
        <div id="tl-edit">
          <span id="tl-edit-label" style="color:#333">—</span>
          <span class="tl-edit-field">
            <span class="tl-edit-lbl" id="tl-lbl-s">s</span>
            <input type="number" class="tl-edit-inp" id="tl-inp-s" step="0.01" />
          </span>
          <span class="tl-edit-field">
            <span class="tl-edit-lbl" id="tl-lbl-e">e</span>
            <input type="number" class="tl-edit-inp" id="tl-inp-e" step="0.01" />
          </span>
          <span class="tl-edit-field">
            <span class="tl-edit-lbl" id="tl-lbl-dur">dur</span>
            <input type="number" class="tl-edit-inp" id="tl-inp-dur" step="0.01" />
          </span>
          <span id="tl-edit-note"></span>
        </div>
        <div id="bez-section">
          <div id="bez-row">
            <svg id="bez-svg" width="130" height="130" viewBox="-15 -15 130 130"></svg>
            <div id="bez-inputs"></div>
          </div>
        </div>
        <div id="lerp-section"></div>
        <button id="dbg-copy">Copy final values</button>
      </div>`;
    document.body.appendChild(el);
  }

  /* ── Main init ───────────────────────────────────────────── */
  function init(cfg) {
    injectHTML();

    const P_MIN   = (cfg.pRange || [-1, 1])[0];
    const P_MAX   = (cfg.pRange || [-1, 1])[1];
    const P_RANGE = P_MAX - P_MIN;

    const toX   = p   => ((p - P_MIN) / P_RANGE * 100).toFixed(2) + '%';
    const toPct = dur => (dur / P_RANGE * 100).toFixed(2) + '%';
    const xToP  = (clientX, rowEl) => {
      const r = rowEl.getBoundingClientRect();
      return P_MIN + (clientX - r.left) / r.width * P_RANGE;
    };

    const labelsEl = document.getElementById('tl-labels');
    const rowsEl   = document.getElementById('tl-rows');
    const ruler    = document.getElementById('tl-ruler');
    const cursor   = document.getElementById('tl-cursor');
    const pval     = document.getElementById('dbg-pval');

    /* Ruler ticks */
    labelsEl.insertAdjacentHTML('beforeend', '<div class="tl-label-cell ruler"></div>');
    [-1, -0.5, 0, 0.5, 1].forEach(p => {
      const t = document.createElement('div');
      t.className = 'tl-tick' + (p === 0 ? ' zero' : '');
      t.style.left = toX(p);
      t.textContent = p === 0 ? '0 sticky' : p;
      ruler.appendChild(t);
    });

    /* Pre-sticky shading width reflects actual P range */
    const presticky = document.getElementById('tl-presticky');
    presticky.style.width = toX(0);

    /* ── Timeline track rows ────────────────────────────────── */
    /* Both selectBezTab and selectEditTrack are defined after their sections.
       Use late-binding references so drag handlers can call them. */
    let _selectEditTrack = () => {};

    const tracks = cfg.tracks || [];
    tracks.forEach(track => {
      const lc = document.createElement('div');
      lc.className = 'tl-label-cell clickable';
      lc.textContent = track.label;
      lc.addEventListener('click', () => {
        _selectEditTrack(track);
      });
      track._labelEl = lc;
      labelsEl.appendChild(lc);

      const row = document.createElement('div');
      row.className = 'tl-track-row';
      const bar    = document.createElement('div');
      bar.className = 'tl-bar';
      const inner  = document.createElement('div');
      inner.className = 'tl-bar-inner';
      inner.style.background = track.color;
      const handle = document.createElement('div');
      handle.className = 'tl-bar-handle';
      bar.appendChild(inner); bar.appendChild(handle);
      row.appendChild(bar); rowsEl.appendChild(row);

      function syncBar() {
        bar.style.left  = toX(track.getS());
        bar.style.width = toPct(track.getE() - track.getS());
      }
      track._sync = syncBar;
      syncBar();

      if (track.bodyDrag !== false) {
        inner.addEventListener('mousedown', e => {
          e.preventDefault();
          _selectEditTrack(track);
          const s0 = track.getS(), dur = track.getE() - track.getS(), x0 = e.clientX;
          const move = ev => {
            const dx = (ev.clientX - x0) / row.getBoundingClientRect().width * P_RANGE;
            const ns = Math.max(P_MIN, Math.min(P_MAX - dur, s0 + dx));
            track.setS(r2(ns)); track.setE(r2(ns + dur)); syncBar();
          };
          const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
          addEventListener('mousemove', move); addEventListener('mouseup', up);
        });
      }

      handle.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        _selectEditTrack(track);
        const move = ev => {
          track.setE(r2(Math.min(P_MAX, Math.max(track.getS() + 0.01, xToP(ev.clientX, row)))));
          syncBar();
        };
        const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
        addEventListener('mousemove', move); addEventListener('mouseup', up);
      });
    });

    /* ── Bezier editor ──────────────────────────────────────── */
    const bezTracks = tracks.filter(t => t.ease);
    let selTrack    = bezTracks.length > 0 ? bezTracks[0].key : null;

    const bezSection  = document.getElementById('bez-section');
    const bezSvgEl    = document.getElementById('bez-svg');
    const bezInputsEl = document.getElementById('bez-inputs');
    const NS          = 'http://www.w3.org/2000/svg';

    let bezIndic = null;       // live indicator dot
    let renderBez = () => {};  // filled in below

    if (bezTracks.length === 0) {
      bezSection.style.display = 'none';
    } else {
      function mkSVG(tag, attrs) {
        const el = document.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
        return el;
      }

      /* Static: grid + diagonal + border */
      [0, 25, 50, 75, 100].forEach(v => {
        bezSvgEl.appendChild(mkSVG('line', { x1: v, y1: 0,   x2: v,   y2: 100, stroke: '#1e1e1e', 'stroke-width': 0.5 }));
        bezSvgEl.appendChild(mkSVG('line', { x1: 0, y1: v,   x2: 100, y2: v,   stroke: '#1e1e1e', 'stroke-width': 0.5 }));
      });
      bezSvgEl.appendChild(mkSVG('line', { x1: 0, y1: 100, x2: 100, y2: 0, stroke: '#2e2e2e', 'stroke-width': 0.5, 'stroke-dasharray': '3 3' }));
      bezSvgEl.appendChild(mkSVG('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'none', stroke: '#2a2a2a', 'stroke-width': 0.5 }));

      const bezTan1  = mkSVG('line',   { stroke: '#333', 'stroke-width': 1 });
      const bezTan2  = mkSVG('line',   { stroke: '#333', 'stroke-width': 1 });
      const bezCurve = mkSVG('path',   { fill: 'none', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
      const bezP0    = mkSVG('circle', { cx: 0,   cy: 100, r: 3,   fill: '#555' });
      const bezP3    = mkSVG('circle', { cx: 100, cy: 0,   r: 3,   fill: '#555' });
      const bezH1    = mkSVG('circle', { r: 5.5, fill: '#1a1a1a', 'stroke-width': 1.5, cursor: 'grab' });
      const bezH2    = mkSVG('circle', { r: 5.5, fill: '#1a1a1a', 'stroke-width': 1.5, cursor: 'grab' });
      bezIndic       = mkSVG('circle', { r: 4,   fill: '#fff', opacity: 0.9, 'pointer-events': 'none' });
      [bezTan1, bezTan2, bezCurve, bezP0, bezP3, bezH1, bezH2, bezIndic].forEach(el => bezSvgEl.appendChild(el));

      const toSvg   = (bx, by) => ({ x: bx * 100,  y: (1 - by) * 100 });
      const fromSvg = (sx, sy) => ({ x: sx / 100,   y: 1 - sy / 100 });

      /* Inputs x1 y1 x2 y2 */
      const PNAMES = ['x1', 'y1', 'x2', 'y2'];
      const bezInps = {};
      PNAMES.forEach((pn, i) => {
        const row = document.createElement('div');
        row.className = 'bez-inp-row';
        const lbl = document.createElement('span');
        lbl.className = 'bez-inp-lbl'; lbl.textContent = pn + ':';
        const inp = document.createElement('input');
        inp.type = 'number'; inp.step = '0.01'; inp.className = 'bez-inp';
        inp.addEventListener('change', () => {
          const v  = parseFloat(inp.value);
          const bt = bezTracks.find(t => t.key === selTrack);
          if (!isNaN(v) && bt && bt.setEase) {
            const e = [...bt.ease()]; e[i] = Math.round(v * 100) / 100; bt.setEase(e);
          }
          renderBez();
        });
        row.appendChild(lbl); row.appendChild(inp);
        bezInputsEl.appendChild(row);
        bezInps[pn] = inp;
      });

      renderBez = function () {
        const bt = bezTracks.find(t => t.key === selTrack);
        if (!bt) return;
        const [x1, y1, x2, y2] = bt.ease();
        const col = solidColor(bt.color);

        bezCurve.setAttribute('stroke', col);
        bezH1.setAttribute('stroke', col); bezH2.setAttribute('stroke', col);

        const p1 = toSvg(x1, y1), p2 = toSvg(x2, y2);
        bezTan1.setAttribute('x1', 0);    bezTan1.setAttribute('y1', 100);
        bezTan1.setAttribute('x2', p1.x); bezTan1.setAttribute('y2', p1.y);
        bezTan2.setAttribute('x1', 100);  bezTan2.setAttribute('y1', 0);
        bezTan2.setAttribute('x2', p2.x); bezTan2.setAttribute('y2', p2.y);
        bezCurve.setAttribute('d', `M 0,100 C ${p1.x},${p1.y} ${p2.x},${p2.y} 100,0`);
        bezH1.setAttribute('cx', p1.x); bezH1.setAttribute('cy', p1.y);
        bezH2.setAttribute('cx', p2.x); bezH2.setAttribute('cy', p2.y);
        bezInps.x1.value = x1; bezInps.y1.value = y1;
        bezInps.x2.value = x2; bezInps.y2.value = y2;
      };

      /* Drag handles */
      function mkDrag(hdl, xi, yi) {
        hdl.addEventListener('mousedown', ev => {
          ev.preventDefault(); hdl.style.cursor = 'grabbing';
          const move = e => {
            const rc = bezSvgEl.getBoundingClientRect();
            const sx = (e.clientX - rc.left)  / rc.width  * 130 - 15;
            const sy = (e.clientY - rc.top)   / rc.height * 130 - 15;
            const b  = fromSvg(sx, sy);
            const bt = bezTracks.find(t => t.key === selTrack);
            if (bt && bt.setEase) {
              const ea = [...bt.ease()];
              ea[xi] = Math.round(Math.max(0, Math.min(1, b.x)) * 100) / 100;
              ea[yi] = Math.round(b.y * 100) / 100;
              bt.setEase(ea); renderBez();
            }
          };
          const up = () => { hdl.style.cursor = 'grab'; removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
          addEventListener('mousemove', move); addEventListener('mouseup', up);
        });
      }
      mkDrag(bezH1, 0, 1); mkDrag(bezH2, 2, 3);
      renderBez();
    }

    /* ── Timeline quick-edit inputs ────────────────────────────── */
    const editLabel = document.getElementById('tl-edit-label');
    const inpS      = document.getElementById('tl-inp-s');
    const inpE      = document.getElementById('tl-inp-e');
    const inpDur    = document.getElementById('tl-inp-dur');
    const lblS      = document.getElementById('tl-lbl-s');
    const lblE      = document.getElementById('tl-lbl-e');
    const lblDur    = document.getElementById('tl-lbl-dur');
    const editNote  = document.getElementById('tl-edit-note');
    const editRow   = document.getElementById('tl-edit');
    let editTrack   = null;

    function setFieldReadonly(inp, lbl, readonly, hint) {
      inp.disabled = !!readonly;
      lbl.classList.toggle('tl-edit-lbl--locked', !!readonly);
      inp.title = (readonly && hint) ? hint : '';
      lbl.title = (readonly && hint) ? hint : '';
    }

    function syncEditInputs() {
      if (!editTrack) return;
      inpS.value   = r2(editTrack.getS());
      inpE.value   = r2(editTrack.getE());
      inpDur.value = r2(editTrack.getE() - editTrack.getS());
    }

    function selectEditTrack(track) {
      tracks.forEach(t => { if (t._labelEl) t._labelEl.classList.remove('selected'); });
      editTrack = track;
      track._labelEl && track._labelEl.classList.add('selected');
      editLabel.textContent = track.label;
      editLabel.style.color = solidColor(track.color);

      setFieldReadonly(inpS,   lblS,   track.readonlyS, track.hintS || 'locked');
      setFieldReadonly(inpE,   lblE,   track.readonlyE, track.hintE || 'locked');
      setFieldReadonly(inpDur, lblDur, !!(track.readonlyS && track.readonlyE), null);

      editNote.textContent = track.note || '';
      editRow.classList.add('visible');
      syncEditInputs();

      /* Sync bezier section */
      if (track.ease) {
        selTrack = track.key;
        bezSection.classList.remove('bez-inactive');
        renderBez();
      } else {
        selTrack = null;
        bezSection.classList.add('bez-inactive');
      }
    }

    inpS.addEventListener('change', () => {
      if (!editTrack) return;
      const v = parseFloat(inpS.value);
      if (isNaN(v)) return;
      const dur = editTrack.getE() - editTrack.getS();
      editTrack.setS(r2(v));
      editTrack.setE(r2(v + dur));
      syncEditInputs();
    });

    inpE.addEventListener('change', () => {
      if (!editTrack) return;
      const v = parseFloat(inpE.value);
      if (isNaN(v)) return;
      editTrack.setE(r2(v));
      syncEditInputs();
    });

    inpDur.addEventListener('change', () => {
      if (!editTrack) return;
      const v = parseFloat(inpDur.value);
      if (isNaN(v) || v <= 0) return;
      editTrack.setE(r2(editTrack.getS() + v));
      syncEditInputs();
    });

    /* Wire up the late-binding reference */
    _selectEditTrack = selectEditTrack;

    /* Auto-select first track */
    if (tracks.length > 0) selectEditTrack(tracks[0]);


    /* ── Sliders ────────────────────────────────────────────── */
    const lerpSection = document.getElementById('lerp-section');
    (cfg.sliders || []).forEach(sl => {
      const row = document.createElement('div');
      row.className = 'lerp-row';
      const lbl = document.createElement('span');
      lbl.className = 'lerp-lbl'; lbl.textContent = sl.label;
      const inp = document.createElement('input');
      inp.type = 'range'; inp.className = 'lerp-range';
      inp.min = sl.min; inp.max = sl.max; inp.step = sl.step || 0.01;
      const val = document.createElement('span');
      val.className = 'lerp-val';
      const fmt = sl.fmt || (v => v.toFixed(2));
      const sync = () => { inp.value = sl.get(); val.textContent = fmt(sl.get()); };
      sync();
      inp.addEventListener('input', () => { const v = parseFloat(inp.value); sl.set(v); val.textContent = fmt(v); });
      setInterval(sync, 500);
      row.appendChild(lbl); row.appendChild(inp); row.appendChild(val);
      lerpSection.appendChild(row);
    });

    /* ── rAF loop ───────────────────────────────────────────── */
    (function loop() {
      const p = cfg.getP() || 0;
      cursor.style.left = toX(p);
      pval.textContent  = p.toFixed(2);
      tracks.forEach(t => t._sync && t._sync());

      /* Live dot on bezier curve */
      if (bezIndic && selTrack) {
        const bt = bezTracks.find(t => t.key === selTrack);
        if (bt && bt.inP && bt.ease) {
          const inP  = Math.max(0, Math.min(1, bt.inP(p)));
          const outP = evalBez(bt.ease(), inP);
          bezIndic.setAttribute('cx', inP * 100);
          bezIndic.setAttribute('cy', (1 - outP) * 100);
        }
      }

      requestAnimationFrame(loop);
    })();

    /* ── Toggle + Copy ──────────────────────────────────────── */
    document.getElementById('dbg-header').addEventListener('click', () =>
      document.getElementById('dbg').classList.toggle('collapsed'));

    document.getElementById('dbg-copy').addEventListener('click', () => {
      const out = cfg.onCopy ? cfg.onCopy() : '';
      if (out) { console.log(out); navigator.clipboard.writeText(out).catch(() => {}); }
      const btn = document.getElementById('dbg-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy final values'; }, 1500);
    });
  }

  return { init, remap };
})();
