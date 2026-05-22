/* ══════════════════════════════════════════════════════════════
   Birch Debug Panel  v2.0
   Reusable scroll-animation debug panel.
   Drop panel.css + panel.js into any dev HTML, never in embeds.

   Single-block usage (backward-compatible):
     DebugPanel.init({
       getP, getPws, pRange, tracks, sliders, onCopy
     });

   Multi-block usage:
     DebugPanel.init({
       blocks: [
         { label: 'Promo', getP, pRange, tracks, sliders, onCopy },
         { label: 'Vision', getP, pRange, tracks, sliders, onCopy },
       ]
     });
══════════════════════════════════════════════════════════════ */

const DebugPanel = (function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────── */
  function remap(p, lo, hi) {
    return Math.max(0, Math.min(1, (p - lo) / (hi - lo)));
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

  function solidColor(col) {
    return (typeof col === 'string' && col.length === 9) ? col.slice(0, 7) : col;
  }

  /* ── HTML skeleton ───────────────────────────────────────── */
  function injectHTML() {
    const el = document.createElement('div');
    el.id = 'dbg';
    el.innerHTML = `
      <div id="dbg-header">
        <div id="dbg-tabs"></div>
        <span class="title">▸ Debug</span>
        <span style="color:#555;font-size:10px">p:&nbsp;<span id="dbg-pval" style="color:#04DE00">0.00</span>&nbsp;·&nbsp;click to toggle</span>
      </div>
      <div id="dbg-body">
        <div id="tl-grid">
          <div id="tl-labels"><div class="tl-label-cell ruler"></div></div>
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

    /* Normalise single-block and multi-block API */
    const blocks = cfg.blocks || [cfg];

    /* ── DOM refs ─────────────────────────────────────────── */
    const labelsEl   = document.getElementById('tl-labels');
    const rowsEl     = document.getElementById('tl-rows');
    const ruler      = document.getElementById('tl-ruler');
    const cursor     = document.getElementById('tl-cursor');
    const presticky  = document.getElementById('tl-presticky');
    const pval       = document.getElementById('dbg-pval');
    const tlGrid     = document.getElementById('tl-grid');
    const bezSection = document.getElementById('bez-section');
    const lerpSection = document.getElementById('lerp-section');
    const editRow    = document.getElementById('tl-edit');
    const editLabel  = document.getElementById('tl-edit-label');
    const inpS       = document.getElementById('tl-inp-s');
    const inpE       = document.getElementById('tl-inp-e');
    const inpDur     = document.getElementById('tl-inp-dur');
    const lblS       = document.getElementById('tl-lbl-s');
    const lblE       = document.getElementById('tl-lbl-e');
    const lblDur     = document.getElementById('tl-lbl-dur');
    const editNote   = document.getElementById('tl-edit-note');

    /* ── Mutable per-block state ─────────────────────────── */
    let activeBlock     = blocks[0];
    let activeGetP      = () => (activeBlock.getP ? activeBlock.getP() : 0) || 0;
    let activeTracks    = [];
    let activeBezTracks = [];
    let selTrack        = null;
    let editTrack       = null;
    let P_MIN = -1, P_MAX = 1, P_RANGE = 2;
    let _selectEditTrack = () => {};

    /* ── Coordinate helpers (read mutable P_MIN/P_MAX) ────── */
    function toX(p)   { return ((p - P_MIN) / P_RANGE * 100).toFixed(2) + '%'; }
    function toPct(d) { return (d / P_RANGE * 100).toFixed(2) + '%'; }
    function xToP(clientX, rowEl) {
      const r = rowEl.getBoundingClientRect();
      return P_MIN + (clientX - r.left) / r.width * P_RANGE;
    }

    function updateRange(block) {
      const range = block.pRange || [-1, 1];
      P_MIN = range[0]; P_MAX = range[1]; P_RANGE = P_MAX - P_MIN;
    }

    /* ── Ruler ────────────────────────────────────────────── */
    function buildRuler() {
      ruler.innerHTML = '';
      presticky.style.width = P_MIN < 0 ? toX(0) : '0%';
      const step = P_RANGE <= 1 ? 0.25 : 0.5;
      let p = P_MIN;
      while (p <= P_MAX + 0.001) {
        const t = document.createElement('div');
        t.className = 'tl-tick' + (r2(p) === 0 ? ' zero' : '');
        t.style.left = toX(p);
        t.textContent = r2(p) === 0 ? '0' : r2(p);
        ruler.appendChild(t);
        p = r2(p + step);
      }
    }

    /* ── Block tab buttons ────────────────────────────────── */
    if (blocks.length > 1) {
      const tabsEl = document.getElementById('dbg-tabs');
      blocks.forEach((block, i) => {
        const btn = document.createElement('button');
        btn.textContent = block.label || ('Block ' + i);
        btn.className = 'dbg-tab' + (i === 0 ? ' active' : '');
        btn.addEventListener('click', e => {
          e.stopPropagation();
          document.querySelectorAll('.dbg-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          loadBlock(block);
        });
        tabsEl.appendChild(btn);
      });
    }

    /* ── Bezier editor (built once, shared) ───────────────── */
    const bezSvgEl    = document.getElementById('bez-svg');
    const bezInputsEl = document.getElementById('bez-inputs');
    const NS = 'http://www.w3.org/2000/svg';

    function mkSVG(tag, attrs) {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
      return el;
    }

    [0, 25, 50, 75, 100].forEach(v => {
      bezSvgEl.appendChild(mkSVG('line', { x1: v, y1: 0,   x2: v,   y2: 100, stroke: '#1e1e1e', 'stroke-width': 0.5 }));
      bezSvgEl.appendChild(mkSVG('line', { x1: 0, y1: v,   x2: 100, y2: v,   stroke: '#1e1e1e', 'stroke-width': 0.5 }));
    });
    bezSvgEl.appendChild(mkSVG('line', { x1: 0, y1: 100, x2: 100, y2: 0,   stroke: '#2e2e2e', 'stroke-width': 0.5, 'stroke-dasharray': '3 3' }));
    bezSvgEl.appendChild(mkSVG('rect', { x: 0, y: 0, width: 100, height: 100, fill: 'none', stroke: '#2a2a2a', 'stroke-width': 0.5 }));

    const bezTan1  = mkSVG('line',   { stroke: '#333', 'stroke-width': 1 });
    const bezTan2  = mkSVG('line',   { stroke: '#333', 'stroke-width': 1 });
    const bezCurve = mkSVG('path',   { fill: 'none', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
    const bezP0    = mkSVG('circle', { cx: 0,   cy: 100, r: 3,   fill: '#555' });
    const bezP3    = mkSVG('circle', { cx: 100, cy: 0,   r: 3,   fill: '#555' });
    const bezH1    = mkSVG('circle', { r: 5.5, fill: '#1a1a1a', 'stroke-width': 1.5, cursor: 'grab' });
    const bezH2    = mkSVG('circle', { r: 5.5, fill: '#1a1a1a', 'stroke-width': 1.5, cursor: 'grab' });
    const bezIndic = mkSVG('circle', { r: 4,   fill: '#fff', opacity: 0.9, 'pointer-events': 'none' });
    [bezTan1, bezTan2, bezCurve, bezP0, bezP3, bezH1, bezH2, bezIndic].forEach(el => bezSvgEl.appendChild(el));

    const toSvg   = (bx, by) => ({ x: bx * 100,  y: (1 - by) * 100 });
    const fromSvg = (sx, sy) => ({ x: sx / 100,   y: 1 - sy / 100  });

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
        const bt = activeBezTracks.find(t => t.key === selTrack);
        if (!isNaN(v) && bt && bt.setEase) {
          const e = [...bt.ease()]; e[i] = Math.round(v * 100) / 100; bt.setEase(e);
        }
        renderBez();
      });
      row.appendChild(lbl); row.appendChild(inp);
      bezInputsEl.appendChild(row);
      bezInps[pn] = inp;
    });

    function renderBez() {
      const bt = activeBezTracks.find(t => t.key === selTrack);
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
    }

    function mkDrag(hdl, xi, yi) {
      hdl.addEventListener('mousedown', ev => {
        ev.preventDefault(); hdl.style.cursor = 'grabbing';
        const move = e => {
          const rc = bezSvgEl.getBoundingClientRect();
          const sx = (e.clientX - rc.left)  / rc.width  * 130 - 15;
          const sy = (e.clientY - rc.top)   / rc.height * 130 - 15;
          const b  = fromSvg(sx, sy);
          const bt = activeBezTracks.find(t => t.key === selTrack);
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

    /* ── Edit row helpers ─────────────────────────────────── */
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
      activeTracks.forEach(t => { if (t._labelEl) t._labelEl.classList.remove('selected'); });
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
      if (track.ease) {
        selTrack = track.key;
        bezSection.classList.remove('bez-inactive');
        renderBez();
      } else {
        selTrack = null;
        bezSection.classList.add('bez-inactive');
      }
    }

    _selectEditTrack = selectEditTrack;

    inpS.addEventListener('change', () => {
      if (!editTrack) return;
      const v = parseFloat(inpS.value);
      if (isNaN(v)) return;
      const dur = editTrack.getE() - editTrack.getS();
      editTrack.setS(r2(v)); editTrack.setE(r2(v + dur));
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

    /* ── Build tracks section ─────────────────────────────── */
    function buildTracksSection(block) {
      /* Clear previous track labels and rows */
      Array.from(labelsEl.querySelectorAll('.tl-label-cell:not(.ruler)')).forEach(el => el.remove());
      Array.from(rowsEl.querySelectorAll('.tl-track-row')).forEach(el => el.remove());
      editTrack = null;
      editRow.classList.remove('visible');

      const tracks = block.tracks || [];
      activeTracks    = tracks;
      activeBezTracks = tracks.filter(t => t.ease);
      selTrack        = activeBezTracks.length > 0 ? activeBezTracks[0].key : null;

      if (tracks.length === 0) {
        tlGrid.style.display   = 'none';
        editRow.style.display  = 'none';
        bezSection.style.display = 'none';
        return;
      }

      tlGrid.style.display  = '';
      editRow.style.display = '';

      /* Update coordinate system and ruler for this block */
      updateRange(block);
      buildRuler();

      /* Hide bezier if no bezier tracks */
      if (activeBezTracks.length === 0) {
        bezSection.style.display = 'none';
      } else {
        bezSection.style.display = '';
        bezSection.classList.remove('bez-inactive');
      }

      tracks.forEach(track => {
        const lc = document.createElement('div');
        lc.className = 'tl-label-cell clickable';
        lc.textContent = track.label;
        lc.addEventListener('click', () => _selectEditTrack(track));
        track._labelEl = lc;
        labelsEl.appendChild(lc);

        const row    = document.createElement('div');
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

      selectEditTrack(tracks[0]);
      if (activeBezTracks.length > 0) renderBez();
    }

    /* ── Build sliders section ────────────────────────────── */
    function buildSlidersSection(block) {
      lerpSection.innerHTML = '';
      (block.sliders || []).forEach(sl => {
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
    }

    /* ── Load a block ─────────────────────────────────────── */
    function loadBlock(block) {
      activeBlock = block;
      activeGetP  = () => (block.getP ? block.getP() : 0) || 0;
      buildTracksSection(block);
      buildSlidersSection(block);
    }

    /* Initial load */
    updateRange(blocks[0]);
    buildRuler();
    loadBlock(blocks[0]);

    /* ── rAF loop ─────────────────────────────────────────── */
    (function loop() {
      const p = activeGetP();
      if (tlGrid.style.display !== 'none') {
        cursor.style.left = toX(p);
      }
      pval.textContent = p.toFixed(2);
      activeTracks.forEach(t => t._sync && t._sync());

      if (bezIndic && selTrack) {
        const bt = activeBezTracks.find(t => t.key === selTrack);
        if (bt && bt.inP && bt.ease) {
          const inP  = Math.max(0, Math.min(1, bt.inP(p)));
          const outP = evalBez(bt.ease(), inP);
          bezIndic.setAttribute('cx', inP * 100);
          bezIndic.setAttribute('cy', (1 - outP) * 100);
        }
      }
      requestAnimationFrame(loop);
    })();

    /* ── Toggle + Copy ────────────────────────────────────── */
    document.getElementById('dbg-header').addEventListener('click', () =>
      document.getElementById('dbg').classList.toggle('collapsed'));

    document.getElementById('dbg-copy').addEventListener('click', () => {
      const out = activeBlock.onCopy ? activeBlock.onCopy() : '';
      if (out) { console.log(out); navigator.clipboard.writeText(out).catch(() => {}); }
      const btn = document.getElementById('dbg-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy final values'; }, 1500);
    });
  }

  return { init, remap };
})();
