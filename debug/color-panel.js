/* ============================================================
   COLOR PANEL — debug-only color tuner for CSS custom properties
   Usage:
     ColorPanel.init({
       knobs: [ { label: 'Card bg', cssVar: '--uc-card-bg' }, ... ],
       palette: ['#FFE243', ...],   // optional, defaults to design-system colors
     });
   Each knob edits one CSS variable live on :root.
   "copy" puts the full :root override block into the clipboard.
   Never include in Webflow embeds.
   ============================================================ */

var ColorPanel = (function () {
  'use strict';

  /* Design-system palette (tokens.css) + neutrals used on light pages */
  var DEFAULT_PALETTE = [
    '#FFE243', /* primary */
    '#FF4747', '#04DE00', '#FF21A6', '#1877F2',
    '#59DBFF', '#FF7700', '#5B45CD', '#4450F2',
    '#0D0D12', '#2A2A2A', '#909090',
    '#FFFFFF', '#F7F7F7', '#F0F0F0', '#E8E8E8', '#DDDDDD', '#000000'
  ];

  var _knobs = [];
  var _root = document.documentElement;

  function readVar(cssVar) {
    return getComputedStyle(_root).getPropertyValue(cssVar).trim();
  }

  function setVar(knob, value) {
    _root.style.setProperty(knob.cssVar, value);
    knob.chip.style.background = value;
    knob.hexval.textContent = value;
    if (knob.hexInput !== document.activeElement) knob.hexInput.value = value;
    /* Sync native picker only with valid 6-digit hex (its only accepted format) */
    if (/^#[0-9a-f]{6}$/i.test(value)) knob.picker.value = value;
  }

  function buildRow(knob, palette) {
    var row = document.createElement('div');
    row.className = 'cpanel__row';

    var head = document.createElement('div');
    head.className = 'cpanel__rowhead';
    head.innerHTML =
      '<span class="cpanel__label">' + knob.label + '</span>' +
      '<span class="cpanel__hexval"></span>' +
      '<span class="cpanel__chip"></span>';
    row.appendChild(head);

    var editor = document.createElement('div');
    editor.className = 'cpanel__editor';

    var sw = document.createElement('div');
    sw.className = 'cpanel__swatches';
    palette.forEach(function (hex) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cpanel__sw';
      b.style.background = hex;
      b.title = hex;
      b.addEventListener('click', function () { setVar(knob, hex); });
      sw.appendChild(b);
    });
    editor.appendChild(sw);

    var inputs = document.createElement('div');
    inputs.className = 'cpanel__inputs';
    inputs.innerHTML =
      '<input class="cpanel__picker" type="color" />' +
      '<input class="cpanel__hex" type="text" spellcheck="false" />';
    editor.appendChild(inputs);
    row.appendChild(editor);

    knob.chip = head.querySelector('.cpanel__chip');
    knob.hexval = head.querySelector('.cpanel__hexval');
    knob.picker = inputs.querySelector('.cpanel__picker');
    knob.hexInput = inputs.querySelector('.cpanel__hex');

    head.addEventListener('click', function () {
      var open = row.classList.contains('is-open');
      row.parentElement.querySelectorAll('.cpanel__row').forEach(function (r) {
        r.classList.remove('is-open');
      });
      if (!open) row.classList.add('is-open');
    });
    knob.picker.addEventListener('input', function () { setVar(knob, knob.picker.value); });
    knob.hexInput.addEventListener('input', function () {
      var v = knob.hexInput.value.trim();
      if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) setVar(knob, v);
    });

    setVar(knob, readVar(knob.cssVar) || '#ffffff');
    return row;
  }

  function configString() {
    var lines = _knobs.map(function (k) {
      return '  ' + k.cssVar + ': ' + readVar(k.cssVar) + ';';
    });
    return ':root {\n' + lines.join('\n') + '\n}';
  }

  function init(opts) {
    var palette = opts.palette || DEFAULT_PALETTE;
    _knobs = opts.knobs.map(function (k) { return { label: k.label, cssVar: k.cssVar }; });

    var panel = document.createElement('aside');
    panel.className = 'cpanel';
    panel.innerHTML =
      '<div class="cpanel__head">' +
      '<span class="cpanel__title">&#127912; Colors</span>' +
      '<span class="cpanel__actions">' +
      '<button class="cpanel__btn" type="button" data-act="copy">copy</button>' +
      '<button class="cpanel__btn" type="button" data-act="fold">&ndash;</button>' +
      '</span></div>' +
      '<div class="cpanel__body"></div>';

    var body = panel.querySelector('.cpanel__body');
    _knobs.forEach(function (knob) { body.appendChild(buildRow(knob, palette)); });

    panel.querySelector('[data-act="fold"]').addEventListener('click', function (e) {
      e.stopPropagation();
      panel.classList.toggle('is-collapsed');
    });
    panel.querySelector('[data-act="copy"]').addEventListener('click', function (e) {
      e.stopPropagation();
      var btn = e.target;
      var out = configString();
      console.log(out);
      navigator.clipboard.writeText(out).catch(function () {});
      btn.textContent = 'copied!';
      btn.classList.add('is-done');
      setTimeout(function () {
        btn.textContent = 'copy';
        btn.classList.remove('is-done');
      }, 1400);
    });

    document.body.appendChild(panel);
  }

  return { init: init };
})();
