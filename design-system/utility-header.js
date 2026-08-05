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

  /* Depth is derived from the current page's own path — how many folders deep
     it sits below the project root — so links resolve from any sub-folder.
     (document.currentScript.src is absolute, so it cannot tell us the depth.) */
  var segs = location.pathname.split('/').filter(Boolean);
  var depth = Math.max(0, segs.length - 1);       /* folders above the file */
  var root = depth ? new Array(depth + 1).join('../') : '';

  var here = segs.slice(-2).join('/');
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
