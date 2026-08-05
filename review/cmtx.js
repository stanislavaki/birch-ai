/* ============================================================
   REVIEW COMMENTS LAYER — artifact build only.
   Attach comments to any block, persist in localStorage, export via
   window.claude.downloads (falls back to a Blob download when opened
   outside the artifact runtime, e.g. local preview).
   ============================================================ */
(function () {
  'use strict';

  var LS = 'uc-review-comments-v1';
  var state = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(LS)) || { name: '', threads: {} }; }
    catch (e) { return { name: '', threads: {} }; }
  }
  function persist() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }
  function txt(el) { return el ? el.textContent.trim().replace(/\s+/g, ' ') : ''; }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ── collect commentable blocks (product cards, banners, cards, prompts) ── */
  var defs = [], byId = {};
  function reg(node, id, label) {
    if (!node || byId[id]) return;
    node.setAttribute('data-cmt', id);
    var d = { el: node, id: id, label: label };
    defs.push(d); byId[id] = d;
  }
  var hero = document.querySelector('.uc-hero');
  if (hero) {
    reg(hero.querySelector('h1'), 'hero-title', 'Заголовок: ' + txt(hero.querySelector('h1')));
    reg(hero.querySelector('.uc-hero__sub'), 'hero-desc', 'Подзаголовок страницы');
  }
  document.querySelectorAll('.uc-pcard').forEach(function (n, i) {
    reg(n, 'pcard-' + i, 'Продукт: ' + txt(n.querySelector('.uc-pcard__title')));
  });
  document.querySelectorAll('.uc-wf').forEach(function (sec) {
    reg(sec.querySelector('.uc-banner'), sec.id + '-banner', 'Секция: ' + txt(sec.querySelector('.uc-banner__title')));
  });
  document.querySelectorAll('.uc-card').forEach(function (n) {
    var h = txt(n.querySelector('h3')) || '—';
    var cid = n.id || ('card-' + defs.length);
    reg(n, cid, 'Карточка: ' + h);
    n.querySelectorAll('.uc-prompt').forEach(function (p, j) {
      reg(p, cid + '-prompt-' + (j + 1), 'Промпт · ' + h);
    });
  });

  /* ── per-block buttons ── */
  defs.forEach(function (d) {
    var b = el('button', 'cmtx-btn');
    b.type = 'button';
    b.setAttribute('aria-label', 'Комментарии: ' + d.label);
    b.innerHTML = '<span class="cmtx-btn__ic">&#128172;</span><span class="cmtx-btn__n"></span>';
    b.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); open(d.id); });
    d.el.appendChild(b);
    d.btn = b;
  });

  /* ── drawer ── */
  var drawer = el('aside', 'cmtx-drawer');
  drawer.innerHTML =
    '<div class="cmtx-drawer__head">' +
      '<div class="cmtx-drawer__kicker">Комментарий к блоку</div>' +
      '<h2 class="cmtx-drawer__title" id="cmtxTitle"></h2>' +
      '<button class="cmtx-drawer__close" type="button" aria-label="Закрыть">&times;</button>' +
    '</div>' +
    '<div class="cmtx-list" id="cmtxList"></div>' +
    '<form class="cmtx-form" id="cmtxForm">' +
      '<textarea id="cmtxText" placeholder="Ваш комментарий…" required></textarea>' +
      '<div class="cmtx-form__row">' +
        '<input id="cmtxName" type="text" placeholder="Аноним" autocomplete="name" />' +
        '<button class="cmtx-send" type="submit">Отправить</button>' +
      '</div>' +
    '</form>';
  document.body.appendChild(drawer);

  var listEl = drawer.querySelector('#cmtxList');
  var titleEl = drawer.querySelector('#cmtxTitle');
  var nameEl = drawer.querySelector('#cmtxName');
  var textEl = drawer.querySelector('#cmtxText');
  var current = null;

  // remember the reviewer's name as soon as they type it (persists across
  // blocks and reloads), and prefill it everywhere
  nameEl.addEventListener('input', function () { state.name = nameEl.value.trim(); persist(); });

  drawer.querySelector('.cmtx-drawer__close').addEventListener('click', close);
  drawer.querySelector('#cmtxForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = textEl.value.trim();
    if (!t || !current) return;
    state.name = nameEl.value.trim();
    var th = state.threads[current.id] || (state.threads[current.id] = { label: current.label, items: [] });
    th.label = current.label;
    th.items.push({ n: state.name || 'Аноним', t: t, ts: Date.now() });
    persist();
    textEl.value = '';
    render();
    refreshCounts();
  });

  function open(id) {
    current = byId[id];
    if (!current) return;
    defs.forEach(function (d) { d.el.classList.toggle('cmtx-sel', d === current); });
    titleEl.textContent = current.label;
    nameEl.value = state.name || '';
    render();
    drawer.classList.add('open');
    setTimeout(function () { textEl.focus(); }, 220);
  }
  function close() {
    drawer.classList.remove('open');
    if (current) current.el.classList.remove('cmtx-sel');
    current = null;
  }
  function fmt(ts) {
    var d = new Date(ts);
    var M = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return d.getDate() + ' ' + M[d.getMonth()] + ', ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function render() {
    var th = current && state.threads[current.id];
    var items = (th && th.items) || [];
    if (!items.length) { listEl.innerHTML = '<div class="cmtx-empty">Пока нет комментариев.<br>Оставьте первый.</div>'; return; }
    listEl.innerHTML = items.map(function (it, i) {
      return '<div class="cmtx-item">' +
        '<div class="cmtx-item__meta"><b>' + esc(it.n) + '</b>' +
          '<span>' + fmt(it.ts) + ' <button class="cmtx-item__del" data-i="' + i + '" type="button">удалить</button></span></div>' +
        '<div class="cmtx-item__text">' + esc(it.t) + '</div></div>';
    }).join('');
    listEl.querySelectorAll('.cmtx-item__del').forEach(function (b) {
      b.addEventListener('click', function () {
        items.splice(+b.getAttribute('data-i'), 1);
        if (!items.length) delete state.threads[current.id];
        persist(); render(); refreshCounts();
      });
    });
    listEl.scrollTop = listEl.scrollHeight;
  }

  /* ── counts on buttons + bar ── */
  function total() { var n = 0; for (var k in state.threads) n += (state.threads[k].items || []).length; return n; }
  function refreshCounts() {
    defs.forEach(function (d) {
      var th = state.threads[d.id];
      var c = th ? th.items.length : 0;
      d.btn.classList.toggle('has', c > 0);
      d.btn.querySelector('.cmtx-btn__n').textContent = c > 0 ? c : '';
    });
    var t = total();
    countEl.innerHTML = '<span class="cmtx-bar__dot"></span>' + t + ' ' + plural(t, ['комментарий', 'комментария', 'комментариев']);
    dlBtn.disabled = t === 0;
  }
  function plural(n, f) { var m = n % 100; if (m >= 11 && m <= 14) return f[2]; var d = n % 10; return d === 1 ? f[0] : (d >= 2 && d <= 4 ? f[1] : f[2]); }

  /* ── bottom bar ── */
  var bar = el('div', 'cmtx-bar');
  bar.innerHTML =
    '<span class="cmtx-bar__count" id="cmtxCount"></span>' +
    '<span class="cmtx-bar__hint">наведи на блок и нажми &#128172;</span>' +
    '<button class="cmtx-bar__dl" id="cmtxDl" type="button">Скачать</button>';
  document.body.appendChild(bar);
  var countEl = bar.querySelector('#cmtxCount');
  var dlBtn = bar.querySelector('#cmtxDl');

  dlBtn.addEventListener('click', download);

  function buildExport() {
    var lines = ['Bïrch — Use cases · комментарии ревью', 'Экспортировано: ' + new Date().toLocaleString('ru-RU'), ''];
    // preserve on-page order
    defs.forEach(function (d) {
      var th = state.threads[d.id];
      if (!th || !th.items.length) return;
      lines.push('## ' + th.label);
      th.items.forEach(function (it) {
        lines.push('- [' + it.n + ', ' + fmt(it.ts) + '] ' + it.t.replace(/\n/g, ' '));
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  function download() {
    if (total() === 0) return;
    var content = buildExport();
    var fname = 'use-cases-комментарии.md';
    var dl = window.claude && window.claude.downloads;
    if (dl && typeof dl.save === 'function') {
      dl.save({ filename: fname, data: content }).catch(function (err) {
        if (err && err.code === 'declined') return;
        blobFallback(content, fname);
      });
    } else {
      blobFallback(content, fname);
    }
  }
  function blobFallback(content, fname) {
    try {
      var blob = new Blob([content], { type: 'text/markdown' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fname;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) {}
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });

  refreshCounts();
})();
