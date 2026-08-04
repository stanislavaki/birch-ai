/* ============================================================
   UTILITY HEADER — one nav for every internal navigation page.

   Include on any utility page (see utility-header.css for the pair):
     <script src="design-system/utility-header.js"></script>

   The script works out its own depth from its src, so a page in
   embed/ or debug/ needs no extra configuration — it just uses ../
   The active item is matched against the current filename.
   ============================================================ */

(function () {
  'use strict';

  var ITEMS = [
    { file: 'pages.html',                            label: 'Pages' },
    { file: 'embeds.html',                           label: 'Embeds' },
    { file: 'map.html',                              label: 'Map' },
    { file: 'design-system/styleguide.html',         label: 'Styleguide' },
    { file: 'design-system/tokens-comparison.html',  label: 'Tokens' }
  ];

  /* depth is derived from this script's own src, so pages in sub-folders
     do not have to declare where the root is */
  var src = (document.currentScript && document.currentScript.src) || '';
  var root = src.indexOf('../') > -1 ? '../' : '';

  var here = location.pathname.split('/').filter(Boolean).slice(-2).join('/');
  function isActive(file) {
    var tail = file.split('/').pop();
    return here === file || here.split('/').pop() === tail;
  }

  var head = document.createElement('header');
  head.className = 'u-head';

  var brand = document.createElement('span');
  brand.className = 'u-head__brand';
  brand.textContent = 'Bïrch — internal';
  head.appendChild(brand);

  var nav = document.createElement('nav');
  nav.className = 'u-head__nav';
  ITEMS.forEach(function (it) {
    var a = document.createElement('a');
    a.className = 'u-head__link' + (isActive(it.file) ? ' is-active' : '');
    a.href = root + it.file;
    a.textContent = it.label;
    nav.appendChild(a);
  });
  head.appendChild(nav);

  document.body.classList.add('u-page');
  document.body.insertBefore(head, document.body.firstChild);
})();
