/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   Block logic \u2014 the part that ships. The debug panel only reads
   from here and writes --track-per-step.

   The scene is continuous: STEPS is one list running through every
   slide, and a fragment simply has a keyframe in each. Slides are
   ranges of that list \u2014 crossing a boundary swaps the top bar and
   the card colour, nothing else.

   CSS blends exactly two keyframes at a time (--x/--y/--w against
   --x2/--y2/--w2, mixed by --t). This script decides which two, and
   writes them. Keeping the table here rather than in 12 custom
   properties per tag is what makes adding a step cheap; step 0 stays
   inline in the markup so the scene is still correct without JS.
   \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
(function () {
  'use strict';

  document.querySelectorAll('.home-slides-e:not([data-hse-ready])').forEach(function (embedRoot) {
    embedRoot.setAttribute('data-hse-ready', '');

  var track  = embedRoot;
  var sticky = track.querySelector('.hse-hs__sticky');
  var card   = track.querySelector('#hse-card');
  var canvas = track.querySelector('#hse-canvas');
  var bars   = [].slice.call(track.querySelectorAll('.hse-hs__bar'));
  var root   = document.documentElement;
  if (!sticky || !card || !canvas) return;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rootFontPx() {
    return parseFloat(getComputedStyle(root).fontSize) || 16;
  }

  function fallbackNavHeightPx() {
    var raw = getComputedStyle(root).getPropertyValue('--nav-height').trim();
    var value = parseFloat(raw);
    if (!isFinite(value)) return 0;
    if (/px$/i.test(raw)) return value;
    return value * rootFontPx();
  }

  function chromeHeightPx() {
    var bottom = 0;
    [].slice.call(document.querySelectorAll('.nav2, .nav2m, [data-hs-chrome]')).forEach(function (el) {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position !== 'fixed') return;
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    });
    var height = Math.max(0, bottom || fallbackNavHeightPx());
    track.style.setProperty('--hs-chrome-h', height + 'px');
    return height;
  }

  /* Responsive collages are ordinary horizontal scrollers on touch screens.
     Mouse dragging and arrow keys make the same interaction available on
     laptops without introducing a carousel or transitions between scenes. */
  var responsiveScrollers = [].slice.call(track.querySelectorAll('[data-hsm-drag]'));
  responsiveScrollers.forEach(function (scroller) {
    var dragging = false;
    var startX = 0;
    var startScroll = 0;
    var userMoved = false;
    var lastMax = 0;

    scroller._hsmPosition = function () {
      var max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      if (!max) return;
      var ratio = userMoved && lastMax ? scroller.scrollLeft / lastMax : parseFloat(scroller.dataset.hsmStart || '0');
      scroller.scrollLeft = Math.max(0, Math.min(max, max * ratio));
      lastMax = max;
    };

    function markMoved() {
      userMoved = true;
      scroller.classList.add('has-moved');
    }

    scroller.addEventListener('dragstart', function (event) {
      event.preventDefault();
    });

    scroller.addEventListener('pointerdown', function (event) {
      markMoved();
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startScroll = scroller.scrollLeft;
      scroller.classList.add('hse-is-dragging');
      scroller.setPointerCapture(event.pointerId);
    });

    scroller.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      scroller.scrollLeft = startScroll - (event.clientX - startX);
      event.preventDefault();
    });

    function stopDragging(event) {
      if (!dragging) return;
      dragging = false;
      scroller.classList.remove('hse-is-dragging');
      if (event && scroller.hasPointerCapture(event.pointerId)) {
        scroller.releasePointerCapture(event.pointerId);
      }
    }

    scroller.addEventListener('pointerup', stopDragging);
    scroller.addEventListener('pointercancel', stopDragging);
    scroller.addEventListener('touchstart', markMoved, { passive: true });
    scroller.addEventListener('wheel', markMoved, { passive: true });
    scroller.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      markMoved();
      scroller.scrollBy({
        left: (event.key === 'ArrowLeft' ? -1 : 1) * scroller.clientWidth * 0.6,
        behavior: 'smooth'
      });
      event.preventDefault();
    });
    requestAnimationFrame(scroller._hsmPosition);
  });

  /* Which slide each step belongs to. */
  var STEPS = [
    { slide: 0 },   /* 0 \u2014 the collage */
    { slide: 0 },   /* 1 \u2014 scatter, the rules stack out */
    { slide: 1, slideAt: 0.22 },   /* 2 \u2014 the stack folds into "Your automated rules"; colour and bar switch as the fold starts */
    { slide: 1, len: 1.8 },   /* 3 \u2014 geometry holds still; the chat story plays here on its own clock */
    { slide: 1 },   /* 4 \u2014 the routine: chat moves aside, the rule takes shape */
    { slide: 2 },   /* 5 \u2014 MCP: the creatives regroup on the left, the phone arrives */
    { slide: 2, len: 1.8 }   /* 6 \u2014 geometry holds; the phone story plays here */
  ];

  /* Keyframes per fragment, one entry per step. Anything omitted is
     inherited from that fragment's previous step, so a step only
     records what actually changes.
       x, y, w \u2014 design units of the 1232-wide frame
       d       \u2014 [dx, dy, dw, dh] toward h550
       o       \u2014 opacity */
  var K = {
    /* Background \u2014 scatters at step 1, one fragment after another and late
       into the segment, so the stack is already out while the surroundings
       are still leaving and the bare screen never has to be waited through. Slide 02 does
       not move it between h364 and h550, hence the zeroed deltas. */
    'schedule-cal':       [{x:37,   y:15,  w:364.5,  d:[0,37,0]},      {x:-395, y:146, e:[0.46,0.89]}, {d:[0,0,0]}],
    'actions':            [{x:56,   y:169, w:175.02, d:[0,37,0]},   {x:-376, y:300, o:0, e:[0.40,0.83]}, {d:[0,0,0]}],
    'platform-google-ads':[{x:11,   y:75,  w:62.5,   d:[0,21.375,31.25]},       {x:-300, y:78, e:[0.52,0.95]},  {d:[0,0,0]}],
    'integrations':       [{x:560,  y:293, w:372,    d:[-73,147.3,186]}, {x:881,  y:620, w:359.857, d:[0,0,0], e:[0.64,1.00]}],   /* leaves downward with the scatter */
    'ad-account':         [{x:155,  y:226, w:260.25, d:[0,172,0]},          {x:-320, y:273, e:[0.34,0.78]}, {d:[0,0,0]}],
    'schedule-section':   [{x:999,  y:0,   w:337.5,  d:[0,58,0]},        {x:1274, y:0, e:[0.37,0.80]},   {d:[0,0,0]}],
    'frequency-popover':  [{x:1089, y:89,  w:180,    d:[0,58,0]},   {x:1394, y:89, e:[0.43,0.86]},  {d:[0,0,0]}],
    'filter':             [{x:921,  y:240, w:614.25, d:[0,111,0]}, {x:1429, y:213, e:[0.49,0.92]}, {d:[0,0,0]}],
    'platform-tiktok':    [{x:1013, y:207, w:62.5,   d:[-5.625,75.375,31.25]},  {x:1400, y:205, e:[0.61,1.00]}, {d:[0,0,0]}],
    'platform-meta':      [{x:851,  y:15,  w:62.5,   d:[-15.625,56.375,31.25]},     {x:1330, y:21, e:[0.55,0.97]},  {d:[0,0,0]}],
    'platform-snapchat':  [{x:444,  y:281, w:62.5,   d:[-15.625,117.375,31.25]}, {x:-160, y:210, e:[0.58,1.00]}, {d:[0,0,0]}],

    /* The closing window. Wider than the canvas until step 2, so it is
       invisible as a frame and clips nothing. */
    'rules-frame':        [{x:-200, y:-100, w:1632, h:800, d:[0,0,0]}, {}, {x:29, y:39, w:276, h:275, d:[0,35,0], arm:0.22, auto:{delay:0, rate:0.075}}, {}, {x:-340, auto:{delay:0,   dur:700}, after:'story', ease:'in'}],   /* leaves left, first, once the story is told */
    'rules-face':         [{o:0}, {o:0}, {o:1}],

    /* The three cards are children of the window, so their coordinates
       are measured from it \u2014 hence the +200/+100 of the open window on
       the first two steps. The step-2 numbers are Figma's own child
       coordinates, which are already frame-relative: checked against the
       exported card, where Pause starts at x\u224891 / y\u224862 inside 276\u00d7275. */
    /* The stack cards start exactly behind the front card (same box, lower
       z) and slide out \u2014 no fade, the front card is what hides them. */
    'rule-card-pause':    [{x:443, y:138, w:747, d:[0,93,0]},
                           {x:528.45, y:120.75, w:575.45, e:[0.10,0.52]},
                           {x:86.756, y:62,     w:492.737, d:[0,0,0], arm:0.22, auto:{delay:120, rate:0.075}}],
    'rule-card-increase': [{x:443, y:138, w:747, d:[0,93,0]},
                           {x:492.35, y:162.45, w:646.7, e:[0.14,0.56]},
                           {x:55.844, y:103,    w:553.746, d:[0,0,0], arm:0.22, auto:{delay:60,  rate:0.075}}],
    'rule-card':          [{x:443, y:138, w:747, d:[0,93,0]},
                           {x:461,  y:208.76, w:709.65, e:[0.18,0.60]},
                           {x:29,   y:147,     w:607.65, d:[0,0,0], arm:0.22, auto:{delay:0,   rate:0.075}}],

    /* Slide 02. They arrive together for now \u2014 lighting them one by one
       is the chat's job, and the chat is not wired yet. */
    'business-context':   [{x:226, y:114, w:194.25, h:225.75, d:[0,66,0]}, {}, {}, {}, {x:-260, auto:{delay:150, dur:700}, after:'story', ease:'in'}],
    'meta-ads-library':   [{x:48,  y:199, w:336.44, h:255.53, d:[0,83,0]}, {}, {}, {}, {x:-420, auto:{delay:300, dur:700}, after:'story', ease:'in'}],

    /* Step 4 \u2014 the routine. Everything arrives in place; the chat slides
       left to make room for it. Both h550 frames move the whole group by
       the same 69, the folder by 75. */
    /* Entrances start 40 units low and rise into place while they fade. */
    /* The creatives sit inside the folder (its box, scaled down) and fly
       out one after another \u2014 staggered windows inside the same segment. */
    /* Bounding boxes from the group's design context (metadata puts the
       rotated ones 200+ units too far right); the cards themselves are
       209\u00d7210 / 200\u00d7258 / 200\u00d7200 turned \u22129.74\u00b0 / +9.26\u00b0 / +26.39\u00b0, so
       each unrotated box is placed on its bbox centre and rotated there.
       bboxes: juice 723/176, cherry 810/42, jar 957/2. */
    /* A stack that fans out, as one continuous timed motion: armed when the
       routine segment is half way, the pile rises from under the canvas onto
       the juice card's spot (leg 1, dur), and the cards on top peel off it
       while the rise is still settling (leg 2, delay counted from arming).
       Juice is the bottom of the pile and arrives at its final angle. */
    'ad-1':               [{x:723,  y:640, w:209.24, r:-9.74, d:[0,69,0]}, {}, {}, {}, {x:739.3, y:192.2, r:-9.74, via:{x:739.3, y:192.2, r:-9.74, delay:650, rate:0.10}, auto:{delay:1450, dur:10}, arm:0.5},
                           /* slide 03: same cards, smaller, regrouped on the left \u2014 angles untouched */
                           {x:109.7, y:151.6, w:163.03, d:[0,71.5,0], arm:0.05, auto:{delay:0,   rate:0.09}}],
    'ad-3':               [{x:731,  y:640, w:199.94, r:-6,    d:[0,69,0]}, {}, {}, {}, {x:991,   y:36,    r:26.39, via:{x:745, y:186, r:-6, delay:650, rate:0.10}, auto:{delay:1650, dur:750}, arm:0.5},
                           {x:318.5, y:80.8,  w:155.78, d:[0,71.5,0], arm:0.05, auto:{delay:140, rate:0.09}}],
    'ad-2':               [{x:739,  y:640, w:199.94, r:-3,    d:[0,69,0]}, {}, {}, {}, {x:829.5, y:56.4,  r:9.26,  via:{x:751, y:180, r:-3, delay:650, rate:0.10}, auto:{delay:1400, dur:750}, arm:0.5},
                           {x:222.5, y:96.7,  w:155.78, d:[0,71.5,0], arm:0.05, auto:{delay:280, rate:0.09}}],
    /* The routine arrives on a clock once the segment is half way (the chat
       has settled by then): trigger, then routine, then the folder \u2014 each
       a lerp toward its place \u2014 and the stack rises after them. */
    'trigger':            [{x:434+800, y:95,   w:371,    d:[0,69,0]}, {}, {}, {}, {x:434, arm:0.5, auto:{delay:0,   rate:0.11}}, {x:1400, arm:0.02, auto:{delay:0,   rate:0.10}}],
    'routine':            [{x:881+500, y:108,  w:271,    d:[0,69,0]}, {}, {}, {}, {x:881, arm:0.5, auto:{delay:220, rate:0.11}}, {x:1500, arm:0.02, auto:{delay:120, rate:0.10}}],
    'folder':             [{x:997+400, y:277, w:137, r:0, d:[0,75,0]}, {}, {}, {}, {x:997, r:-11.93, arm:0.5, auto:{delay:420, rate:0.11}}, {x:1500, arm:0.02, auto:{delay:240, rate:0.10}}],
    'chat':               [{x:452, y:620, w:300, h:352, d:[0,56,0,48]}, {}, {y:19, arm:0.22, auto:{delay:700, rate:0.09}}, {}, {x:103, e:[0.32,0.55], ease:'out'}, {x:-520, arm:0.02, auto:{delay:0, rate:0.10}}],

    /* Slide 03 \u2014 MCP. Chips fly in from the left one after another, the
       phone from the right; the logo pops in the reference rhythm and the
       dotted line draws itself to the phone once it has landed. */
    'birch-mcp':          [{x:383,  y:156,   w:293, o:1,      d:[0,71.5,0]}, {}, {}, {}, {}, {pop:{delay:420},  arm:0.05}],
    'phone':              [{x:1300, y:24,    w:242, h:526,    d:[0,71.5,0]}, {}, {}, {}, {}, {x:836, arm:0.05, auto:{delay:100, rate:0.09}}],
    'mcp-line':           [{x:684,  y:189,   w:134, h:2,      d:[0,71.5,0]}, {}, {}, {}, {}, {pop:{delay:1000}, arm:0.05}],
    /* the action chips are in place from the start and light up one by one */
    'chip-duplicate':     [{x:114.2, y:46.7,  w:209, r:-18.6,  d:[0,71.5,0]}, {}, {}, {}, {}, {pop:{delay:1100}, arm:0.05}],
    'chip-scale':         [{x:53.7,  y:182.3, w:55,  r:10.78,  d:[0,71.5,0]}, {}, {}, {}, {}, {pop:{delay:1240}, arm:0.05}],
    'chip-notify':        [{x:65.8,  y:265.9, w:164, r:-0.19,  d:[0,71.5,0]}, {}, {}, {}, {}, {pop:{delay:1380}, arm:0.05}],
    'chip-set-budget':    [{x:148.2, y:317.1, w:228, r:-14.55, d:[0,71.5,0]}, {}, {}, {}, {}, {pop:{delay:1520}, arm:0.05}],
    'chip-time':          [{x:495.7, y:49.3,  w:55,  r:10.78,  d:[0,71.5,0]}, {}, {}, {}, {}, {pop:{delay:1660}, arm:0.05}]
  };

  /* Flatten the inheritance once, so lookup during scroll is a plain read. */
  var FRAGS = {};
  Object.keys(K).forEach(function (id) {
    var el = card.querySelector('[data-frag="' + id + '"]');
    if (!el) return;
    var out = [], prev = { x:0, y:0, w:0, d:[0,0,0], o:1 };
    for (var i = 0; i < STEPS.length; i++) {
      var raw = K[id][i] || {};
      prev = {
        /* window inside the arriving segment and the curve applied to it \u2014
           per keyframe, not inherited: a stagger belongs to one entrance */
        e: raw.e || null, ease: raw.ease || null, via: raw.via || null, auto: raw.auto || null, after: raw.after || null, arm: raw.arm, pop: raw.pop || null,
        x: raw.x !== undefined ? raw.x : prev.x,
        h: raw.h !== undefined ? raw.h : prev.h,
        r: raw.r !== undefined ? raw.r : prev.r,
        y: raw.y !== undefined ? raw.y : prev.y,
        w: raw.w !== undefined ? raw.w : prev.w,
        d: raw.d || prev.d,
        o: raw.o !== undefined ? raw.o : prev.o
      };
      out.push(prev);
    }
    FRAGS[id] = { el: el, k: out };
    out.forEach(function (kf, i) { if (kf.pop) FRAGS[id].popStep = i; });
  });

  /* segment lengths in screens (default 1) \u2014 the track and the mapping
     from progress to segment both follow them */
  var LEN = STEPS.slice(1).map(function (st) { return st.len || 1; });
  var TOTAL = LEN.reduce(function (a, b) { return a + b; }, 0);
  var CUM = [0]; LEN.forEach(function (l) { CUM.push(CUM[CUM.length - 1] + l); });
  track.style.setProperty('--steps', TOTAL);

  /* All slides share one top-bar height, otherwise the canvas \u2014 and with
     it the whole scene \u2014 would jump on every slide change. Measured
     twice: once now and once the real font metrics are in, because the
     fallback font wraps the paragraph differently (dev-pages.md). */
  function lockBarHeight() {
    if (getComputedStyle(sticky).display === 'none') return;
    var cs = getComputedStyle(track), rootPx = rootFontPx();
    track.style.setProperty('--bar-h', '0rem');
    var tallest = bars.reduce(function (m, b) { return Math.max(m, b.offsetHeight); }, 0);
    track.style.setProperty('--bar-h', (tallest / rootPx) + 'rem');

    /* Bottom gap: whatever room is left under the minimum card, capped. */
    var navH  = chromeHeightPx();
    var gapMax = parseFloat(cs.getPropertyValue('--slide-gap-max')) * rootPx;
    var u = card.getBoundingClientRect().width / 1232;
    /* Everything above the canvas, measured rather than re-derived: the card
       has no padding of its own, so the canvas's offset inside it IS the head
       block plus --slide-split. Reading the DOM instead of parsing --head-cost
       keeps this honest if the head's padding ever changes, and keeps the
       number out of reach of a calc() the script cannot evaluate. */
    var minCard = canvas.offsetTop + 364 * u;
    var room = innerHeight - navH - minCard;
    /* Never write a value that is not a number: --slide-gap-bottom feeds the
       canvas height clamp, and one poisoned token there makes the whole
       declaration invalid \u2014 which under container-type: size is a canvas of
       zero height and no scene at all. */
    if (!isFinite(room)) return;
    track.style.setProperty('--slide-gap-bottom', (Math.max(0, Math.min(gapMax, room)) / rootPx) + 'rem');
  }

  /* 0 at the moment the card pins, 1 when the track runs out. */
  function progress() {
    var navH = chromeHeightPx();
    var span = track.offsetHeight - sticky.offsetHeight;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, (navH - track.getBoundingClientRect().top) / span));
  }

  /* Rest at both ends of every transition \u2014 otherwise a step would start
     changing the instant the previous one arrived, and nothing would ever
     read as a state. A keyframe may narrow or shift its own window (e:)
     and pick a curve (ease:), which is how a group staggers. */
  var EASE_FROM = 0.25, EASE_TO = 0.75;
  var EASES = {
    smooth: function (t) { return t * t * (3 - 2 * t); },
    out:    function (t) { return 1 - Math.pow(1 - t, 3); },
    in:     function (t) { return t * t * t; },
    back:   function (t) { var c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  };
  function curve(k, local) {
    var w = (k && k.e) || [EASE_FROM, EASE_TO];
    var t = Math.min(1, Math.max(0, (local - w[0]) / (w[1] - w[0])));
    return EASES[(k && k.ease) || 'smooth'](t);
  }
  function smoothstep(a, b, x) { return curve(null, a === EASE_FROM ? x : (x - a) / (b - a) * (EASE_TO - EASE_FROM) + EASE_FROM); }

  /* Viscosity: the scene follows the scroll with a little lag, so a flick
     of the wheel reads as motion rather than as a cut. Position stays the
     source of truth \u2014 this only delays arriving at it. */
  var shownP = null, targetP = 0, raf = null;
  var LAG = reduceMotion ? 1 : 0.10;
  var autoLive = false;
  function follow() {
    raf = null;
    if (shownP === null) shownP = targetP;
    var diff = targetP - shownP;
    if (Math.abs(diff) < 0.00025) {
      shownP = targetP; autoLive = false; render(shownP);
      if (autoLive) raf = requestAnimationFrame(follow);   /* a timed piece is still playing */
      return;
    }
    shownP += diff * LAG;
    render(shownP);
    raf = requestAnimationFrame(follow);
  }

  var wrote = -1;
  function writePair(a) {
    if (a === wrote) return;
    wrote = a;
    var b = Math.min(STEPS.length - 1, a + 1);
    Object.keys(FRAGS).forEach(function (id) {
      var f = FRAGS[id], ka = f.k[a], kb = f.k[b], st = f.el.style;
      st.setProperty('--x',  ka.x);  st.setProperty('--y',  ka.y);  st.setProperty('--w',  ka.w);
      st.setProperty('--x2', kb.x);  st.setProperty('--y2', kb.y);  st.setProperty('--w2', kb.w);
      st.setProperty('--h',  ka.h);  st.setProperty('--h2', kb.h);
      st.setProperty('--dh', ka.d[3] || 0); st.setProperty('--dh2', kb.d[3] || 0);
      st.setProperty('--r',  ka.r || 0);    st.setProperty('--r2', kb.r || 0);
      st.setProperty('--dx', ka.d[0]); st.setProperty('--dy', ka.d[1]); st.setProperty('--dw', ka.d[2]);
      st.setProperty('--dx2', kb.d[0]); st.setProperty('--dy2', kb.d[1]); st.setProperty('--dw2', kb.d[2]);
      st.setProperty('--o1', ka.o); st.setProperty('--o2', kb.o);
    });
  }

  /* Where each slide starts and ends on the track, in screens. */
  var SLIDE_RANGE = [];
  (function () {
    var first = {};
    STEPS.forEach(function (st, i) { if (first[st.slide] === undefined) first[st.slide] = i; });
    Object.keys(first).forEach(function (sl) {
      var i0 = first[sl], i1 = STEPS.length - 1;
      for (var j = i0 + 1; j < STEPS.length; j++) if (STEPS[j].slide !== +sl) { i1 = j; break; }
      SLIDE_RANGE[+sl] = [CUM[i0], CUM[Math.min(i1, CUM.length - 1)]];
    });
  })();
  var dots = [].slice.call(track.querySelectorAll('.hse-hs__dot'));
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      /* a slide not built yet (no steps) scrolls to the end of the track */
      var r = SLIDE_RANGE[+d.dataset.slide] || [TOTAL, TOTAL], span = track.offsetHeight - sticky.offsetHeight;
      var navH = chromeHeightPx();
      var trackTop = track.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: trackTop - navH + span * (r[0] / TOTAL) + 1, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* Continuity across steps. A timed motion (lerp) that has not settled
     when the reader crosses into the next step is not cut: the lerp stays
     on the fragment and keeps chasing whatever the scroll now says its
     place is, at its own rate, until it is within 0.3 units. Only then
     does the fragment go back to plain blending. Scrolling back works the
     same way \u2014 the piece glides back instead of snapping. */
  function chase(f, tgt, rate) {
    var now = performance.now(), L = f.lerp;
    var dt = Math.min(3, (now - L.t) / (1000 / 60)); L.t = now;
    var k = 1 - Math.pow(1 - rate, dt);
    L.x += (tgt.x - L.x) * k; L.y += (tgt.y - L.y) * k; L.r += ((tgt.r || 0) - L.r) * k;
    if (tgt.w !== undefined) L.w += (tgt.w - L.w) * k;
    if (tgt.h !== undefined && L.h !== undefined) L.h += (tgt.h - L.h) * k;
    /* the height-corridor deltas travel with the piece too: on a tall
       viewport a step boundary otherwise moves it by the delta at once */
    var d = tgt.d || [0, 0, 0];
    L.dx += (d[0] - L.dx) * k; L.dy += (d[1] - L.dy) * k; L.dw += (d[2] - L.dw) * k; L.dh += ((d[3] || 0) - L.dh) * k;
    return Math.abs(tgt.x - L.x) + Math.abs(tgt.y - L.y) + Math.abs((tgt.r || 0) - L.r) + (tgt.w !== undefined ? Math.abs(tgt.w - L.w) : 0)
         + Math.abs(d[0] - L.dx) + Math.abs(d[1] - L.dy) + Math.abs(d[2] - L.dw);
  }
  function startLerp(f, from, rate) {
    /* start from where the piece is on screen (its last written spot), so
       re-entering a timed step from either side never teleports it */
    var c = f.cur || from;
    if (!f.lerp) f.lerp = { x: c.x, y: c.y, w: c.w, h: c.h !== undefined ? c.h : from.h, r: c.r || 0,
                            dx: c.d[0], dy: c.d[1], dw: c.d[2], dh: c.d[3] || 0, t: performance.now() };
    f.rate = rate;
  }
  /* the clock of a timed step: fresh when the reader arrives from before
     it, already run out when they come back from after it */
  function clockFor(f, a) { return f.lastA !== undefined && f.lastA > a ? -1e9 : performance.now(); }
  function writeLerp(st, L) {
    st.setProperty('--x',  L.x); st.setProperty('--y',  L.y); st.setProperty('--r',  L.r); st.setProperty('--w', L.w);
    st.setProperty('--x2', L.x); st.setProperty('--y2', L.y); st.setProperty('--r2', L.r); st.setProperty('--w2', L.w);
    if (L.h !== undefined) { st.setProperty('--h', L.h); st.setProperty('--h2', L.h); }
    if (L.dx !== undefined) {
      st.setProperty('--dx', L.dx); st.setProperty('--dy', L.dy); st.setProperty('--dw', L.dw); st.setProperty('--dh', L.dh);
      st.setProperty('--dx2', L.dx); st.setProperty('--dy2', L.dy); st.setProperty('--dw2', L.dw); st.setProperty('--dh2', L.dh);
    }
  }
  /* a fragment with a leftover lerp glides to `tgt`; true while still gliding */
  function settle(f, st, tgt) {
    if (!f.lerp) return false;
    var gap = chase(f, tgt, f.rate || 0.1);
    writeLerp(st, f.lerp);
    if (gap > 0.3) { autoLive = true; return true; }
    f.lerp = null; wrote = -1;   /* back to the pair the scroll dictates */
    return true;
  }
  function blendAt(ka, kb, tt) {
    var da = ka.d, db = kb.d;
    return { x: ka.x + (kb.x - ka.x) * tt, y: ka.y + (kb.y - ka.y) * tt, w: ka.w + (kb.w - ka.w) * tt,
             h: ka.h !== undefined && kb.h !== undefined ? ka.h + (kb.h - ka.h) * tt : ka.h,
             r: (ka.r || 0) + ((kb.r || 0) - (ka.r || 0)) * tt,
             d: [0, 1, 2, 3].map(function (i) { return (da[i] || 0) + ((db[i] || 0) - (da[i] || 0)) * tt; }) };
  }

  var slide = -1;
  function apply() {
    targetP = progress();
    /* the entrance runs on its own clock; leaving the first state cuts it
       short rather than letting pieces stay hidden into the next step */
    if (introRunning && targetP > 0.02) introFinish();
    if (!raf) raf = requestAnimationFrame(follow);
  }
  function render(p) {
    /* progress \u2192 segment index + local progress, honouring segment lengths */
    var pos = Math.min(TOTAL - 0.000001, p * TOTAL), a = 0;
    while (a < LEN.length - 1 && pos >= CUM[a + 1]) a++;
    var local = (pos - CUM[a]) / LEN[a];
    var q = a + local;
    var t    = curve(null, local);

    writePair(a);
    card.style.setProperty('--t', t.toFixed(4));
    /* each fragment gets its own t: same segment, own window and curve */
    autoLive = false;
    var b = Math.min(STEPS.length - 1, a + 1);
    Object.keys(FRAGS).forEach(function (id) {
      var f = FRAGS[id], kb = f.k[b], tt = curve(kb, local), st = f.el.style;
      if (kb.pop) {
        /* a class, not a blend: armed at `arm`, the element steps in after pop.delay */
        var armedP = local >= (kb.arm !== undefined ? kb.arm : 0.02);
        if (!armedP) { f.popAt = null; f.el.classList.remove('hse-is-in'); }
        else {
          if (!f.popAt) f.popAt = performance.now();
          var on = performance.now() - f.popAt >= kb.pop.delay;
          f.el.classList.toggle('hse-is-in', on);
          if (!on) autoLive = true;
        }
      }
      if (kb.auto && !kb.via && kb.auto.rate) {
        /* timed lerp toward the keyframe: armed at `arm` of the segment,
           parked until auto.delay, then chasing x / y / r exponentially */
        var ka0 = f.k[a], armedL = local >= (kb.arm !== undefined ? kb.arm : 0.02) && (!kb.after || GATES[kb.after]);
        if (!armedL) {
          /* not yet (or no longer) armed: a leftover lerp glides back to its resting spot */
          f.autoStart = null;
          if (!settle(f, st, ka0)) { writeLerp(st, { x: ka0.x, y: ka0.y, w: ka0.w, h: ka0.h, r: ka0.r || 0, dx: ka0.d[0], dy: ka0.d[1], dw: ka0.d[2], dh: ka0.d[3] || 0 }); }
        } else {
          if (!f.autoStart) f.autoStart = clockFor(f, a);
          startLerp(f, ka0, kb.auto.rate);   /* no-op when a lerp is already in flight */
          var elL = performance.now() - f.autoStart;
          var tgtL = elL >= kb.auto.delay ? kb : ka0;
          var gapL = chase(f, { x: tgtL.x, y: tgtL.y, r: tgtL.r, w: tgtL.w !== undefined ? tgtL.w : ka0.w, h: tgtL.h !== undefined ? tgtL.h : ka0.h, d: tgtL.d }, kb.auto.rate);
          if (gapL > 0.3 || elL < kb.auto.delay) autoLive = true;
          writeLerp(st, f.lerp);
        }
        tt = 0;
      } else if (kb.auto && !kb.via) {
        /* plays on its own clock from the moment the segment is entered \u2014
           and, when it names a gate, not before that gate opens */
        var armed = local > 0.02 && (!kb.after || GATES[kb.after]);
        if (!armed) { f.autoStart = null; tt = 0; }
        else {
          if (!f.autoStart) f.autoStart = clockFor(f, a);
          var el2 = performance.now() - f.autoStart - kb.auto.delay;
          tt = EASES[kb.ease || 'out'](Math.min(1, Math.max(0, el2 / kb.auto.dur)));
          if (el2 < kb.auto.dur) autoLive = true;
        }
      } else if (kb.via && kb.via.rate) {
        /* Timed two-leg flight driven by a lerp: the target is the pile
           (via) from the moment the segment is armed, and the final spot
           once auto.delay has passed; x, y and rotation chase the current
           target exponentially (rate per frame at 60 fps). Velocity never
           drops to zero between the legs, so rise and peel read as one
           motion. Scrolling back re-parks the card instantly. */
        var ka = f.k[a], armedV = local >= (kb.arm !== undefined ? kb.arm : 0.5);
        if (!armedV) {
          f.autoStart = null;
          if (!settle(f, st, ka)) { writeLerp(st, { x: ka.x, y: ka.y, w: ka.w, r: ka.r || 0, dx: ka.d[0], dy: ka.d[1], dw: ka.d[2], dh: ka.d[3] || 0 }); }
        } else {
          var rate = kb.via.rate || 0.12;
          if (!f.autoStart) f.autoStart = clockFor(f, a);
          startLerp(f, ka, rate);
          var elV = performance.now() - f.autoStart;
          /* before via.delay the card stays parked; then it chases the pile, then the final spot */
          var tgt = elV < (kb.via.delay || 0) ? ka : (elV >= kb.auto.delay ? kb : kb.via);
          var gapV = chase(f, { x: tgt.x, y: tgt.y, r: tgt.r, w: tgt.w !== undefined ? tgt.w : ka.w, d: tgt.d || kb.d }, rate);
          if (gapV > 0.3 || elV < kb.auto.delay) autoLive = true;
          writeLerp(st, f.lerp);
        }
        tt = 0;
      } else if (kb.via) {
        /* leg 1: previous \u2192 via on the via's own window (the pile arrives
           together); leg 2: via \u2192 final \u2014 on the keyframe's window, or on
           its own clock when the keyframe says auto. */
        var ka = f.k[a], t1 = curve(kb.via, local), leg1 = t1 < 1;
        var from = leg1 ? ka : kb.via, to = leg1 ? kb.via : kb;
        st.setProperty('--x',  from.x !== undefined ? from.x : ka.x); st.setProperty('--y',  from.y !== undefined ? from.y : ka.y);
        st.setProperty('--r',  from.r || 0);
        st.setProperty('--x2', to.x !== undefined ? to.x : kb.x);    st.setProperty('--y2', to.y !== undefined ? to.y : kb.y);
        st.setProperty('--r2', to.r || 0);
        if (leg1) { tt = t1; f.autoStart = null; }
        else if (kb.auto) {
          if (!f.autoStart) f.autoStart = performance.now();
          var el = performance.now() - f.autoStart - kb.auto.delay;
          tt = EASES[kb.ease || 'out'](Math.min(1, Math.max(0, el / kb.auto.dur)));
          if (el < kb.auto.dur) autoLive = true;
        } else { tt = curve(kb, local); }
      }
      /* any other branch: a lerp left over from a timed step glides to where
         the blend puts the fragment now, then hands over to the blend */
      if (!kb.auto && !kb.via) f.autoStart = null;   /* a timed step re-entered later starts its clock afresh */
      if (!((kb.auto && !kb.via && kb.auto.rate) || (kb.via && kb.via.rate))) {
        /* crossing a step boundary must never teleport a piece: if where the
           scroll now puts it is not where it was drawn, it glides there */
        if (!f.lerp && f.cur && f.lastA !== undefined && f.lastA !== a) {
          var want = blendAt(f.k[a], kb, tt);
          if (Math.abs(want.x - f.cur.x) + Math.abs(want.y - f.cur.y) + Math.abs(want.w - f.cur.w) > 2) startLerp(f, want, 0.12);
        }
        if (f.lerp && settle(f, st, blendAt(f.k[a], kb, tt))) tt = 0;
      }
      /* a popped piece is a matter of position, not only of its timer: past
         its step it is simply in (a reload deep in the track included) */
      if (f.popStep !== undefined && !kb.pop) {
        if (a >= f.popStep) f.el.classList.add('hse-is-in');
        else if (a < f.popStep - 1) { f.el.classList.remove('hse-is-in'); f.popAt = null; }
      }
      st.setProperty('--t', tt.toFixed(4));
      f.cur = f.lerp ? { x: f.lerp.x, y: f.lerp.y, w: f.lerp.w, h: f.lerp.h, r: f.lerp.r, d: [f.lerp.dx, f.lerp.dy, f.lerp.dw, f.lerp.dh] }
                     : blendAt(f.k[a], kb, tt);
      f.lastA = a;
    });

    driveChat(a, local);
    drivePhone(a, local);

    /* the rules frame counts as closed from 90% of its closing leg onward */
    var closing = FRAGS['rules-frame'];
    if (closing) {
      closing.el.classList.toggle('hse-is-closed', closing.lerp ? (a >= 1 && closing.lerp.w < 420) : a > 1);
      /* the blue fill follows the frame's own closing, not the scroll: while
         the frame is lerping, its progress (1632 \u2192 276 wide) is the fill's --t */
      var face = FRAGS['rules-face'];
      if (face && (a === 1 || (a === 2 && closing.lerp))) {
        var prog = closing.lerp ? Math.min(1, Math.max(0, (1632 - closing.lerp.w) / (1632 - 276))) : 0;
        face.el.style.setProperty('--t', prog.toFixed(4));
      }
      closing.el.classList.toggle('hse-is-stacked', a > 0 || local > 0.03);
    }

    /* the slide (card colour, bar, pager) normally switches mid-segment; a
       step may pin it to a point of its own \u2014 e.g. the moment a timed
       morph starts, so the new colour is there when its pieces form */
    var nx = Math.min(STEPS.length - 1, a + 1), at = STEPS[nx].slideAt;
    var si = STEPS[at !== undefined ? (local >= at ? nx : a) : (t < 0.5 ? a : nx)].slide;
    if (si !== slide) {
      var forwardSlide = si > slide;
      slide = si;
      bars.forEach(function (b, n) {
        b.classList.toggle('hse-is-active', n === si);
        b.toggleAttribute('inert', n !== si);
        b.setAttribute('aria-hidden', n === si ? 'false' : 'true');
      });
      /* one write, both blocks read it \u2014 see --slide-bg on .hse-hs__card */
      card.style.setProperty('--slide-bg', bars[si].dataset.bg);
      dots.forEach(function (d, n) {
        d.classList.toggle('hse-is-active', n === si);
        if (n === si) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }
    /* the active capsule fills with progress through its own slide;
       slides already passed read full, slides ahead read empty */
    var r = SLIDE_RANGE[si] || [0, TOTAL];
    var fill = Math.min(1, Math.max(0, (pos - r[0]) / Math.max(0.0001, r[1] - r[0])));
    dots.forEach(function (d, n) { d.style.setProperty('--fill', n < si ? 1 : n > si ? 0 : fill.toFixed(3)); });
  }

  lockBarHeight();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockBarHeight);
  new ResizeObserver(lockBarHeight).observe(track);

  /* \u2500\u2500 Chat \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
     Hybrid, as agreed: scroll picks the beat, time types the letters.
     Scrubbing forward or back lands on a state that is fully defined by
     position, so a fast reader is never left mid-sentence and a reader
     who goes back sees the same thing twice. */
  var Q  = 'How healthy is my setup?';
  var A1 = 'Gap found \u2014 a creative is about to hit fatigue.';
  var A2 = 'UGC runs longest in your vertical \u2014 median 41 days.';
  var BEATS = [0.05, 0.08, 0.30, 0.50, 0.70];   /* \u2192 six states */

  var ch = {
    bubble: track.querySelector('#hse-bubble'),
    resp:   track.querySelector('#hse-response'),
    tools:  track.querySelector('#hse-tools'),
    tool:   [],
    used:   track.querySelector('#hse-used'),
    usedRow:track.querySelector('#hse-used-row'),
    a:      track.querySelector('#hse-answer-a'),
    b:      track.querySelector('#hse-answer-b'),
    typed:  track.querySelector('#hse-typed'),
    hint:   track.querySelector('#hse-placeholder'),
    send:   track.querySelector('#hse-send')
  };
  ch.tool = [].slice.call(ch.tools.querySelectorAll('.hse-hs__tool'));
  var LIT = { rules: card.querySelector('[data-frag="rules-frame"]') };
  ['business-context', 'meta-ads-library'].forEach(function (id) {
    LIT[id] = card.querySelector('[data-frag="' + id + '"]');
  });

  var timers = [];
  function stopTyping() { timers.forEach(clearInterval); timers = []; }
  function type(el, text, then) {
    var i = 0;
    el.textContent = '';
    var t = setInterval(function () {
      el.textContent = text.slice(0, ++i);
      if (el === ch.typed) ch.hint.style.display = 'none';
      if (i >= text.length) { clearInterval(t); if (then) then(); }
    }, 14);
    timers.push(t);
  }

  var state = -1;
  var hurry = false;   /* set by driveChat for the current frame */
  var GATES = { story: false };
  var litAt = null;
  function hurried() { return hurry; }
  function setState(n) {
    if (n === state) return;
    var forward = n > state;
    stopTyping();
    state = n;
    /* the gate the scene waits on opens 1.7 s after the last card was called,
       so a hurried story still lets Meta Ads Library fly in before anything leaves */
    if (n === 4) litAt = performance.now();
    if (n < 4) { litAt = null; GATES.story = false; }

    ch.bubble.classList.toggle('hse-is-visible', n >= 1);
    ch.resp.classList.toggle('hse-is-visible', n >= 1);
    ch.tool.forEach(function (el, i) {
      el.classList.toggle('hse-is-on', n >= 2 + i);
      el.classList.toggle('hse-is-live', n === 2 + i);
    });
    ch.tools.classList.toggle('hse-is-done', n >= 5);
    ch.used.style.display = ch.usedRow.style.display = n < 5 ? 'none' : '';
    ch.send.disabled = n !== 0;

    /* the ring sits on whichever source is being read; entities stay once risen */
    LIT.rules.classList.toggle('hse-is-lit', n === 2);
    LIT['business-context'].style.setProperty('--lit', n >= 3 ? 1 : 0);
    LIT['business-context'].classList.toggle('hse-is-lit', n === 3);
    LIT['meta-ads-library'].style.setProperty('--lit', n >= 4 ? 1 : 0);
    LIT['meta-ads-library'].classList.toggle('hse-is-lit', n === 4);

    ch.hint.style.display = (n < 0 || (n === 0 && forward)) ? '' : 'none';
    if (n === 0) {
      /* only animate when the reader arrives here, not when scrubbing back
         past it \u2014 going backwards should show the finished line, not replay */
      if (forward && !hurried()) { type(ch.typed, Q); } else { ch.typed.textContent = Q; }
    } else {
      ch.typed.textContent = '';
    }

    if (n >= 5) {
      if (forward && !hurried()) { type(ch.a, A1, function () { type(ch.b, A2); }); }
      else { ch.a.textContent = A1; ch.b.textContent = A2; }
    } else {
      ch.a.textContent = ch.b.textContent = '';
    }
  }

  /* The chat lives in the segment where the scene holds still. Once it is
     on stage the story plays on its own clock \u2014 the same rule as the fan:
     scroll starts it and may only hurry it, never hold it. Scrolling back
     before the chat resets it. */
  var CHAT_SEG = 2;
  var STORY = [0, 600, 950, 1900, 2850, 3800];   /* ms at which each state begins \u2014 350 ms breath, then a step */
  var storyStart = null;
  function driveChat(a, local) {
    var cp = a < CHAT_SEG ? -1 : (a > CHAT_SEG ? 1 : local);
    if (cp < 0) { storyStart = null; setState(-1); return; }
    if (storyStart === null) storyStart = performance.now();
    var elapsed = performance.now() - storyStart;
    /* reader already past the segment: finish now rather than make them wait */
    hurry = cp >= 0.9;
    if (hurry) elapsed = Infinity;
    var n = 0;
    while (n < STORY.length - 1 && elapsed >= STORY[n + 1]) n++;
    if (n > state + 1) { for (var i = state + 1; i < n; i++) setState(i); }   /* never skip a beat's side effects */
    setState(n);
    GATES.story = state >= 5 && litAt !== null && performance.now() - litAt >= 1700;
    if (elapsed < STORY[STORY.length - 1] + 2500) autoLive = true;         /* keep frames coming while it plays */
    if (!GATES.story) autoLive = true;                                      /* something may be waiting on the story */
  }

  function createResponsiveChat(root) {
    if (!root) return null;
    var chat = {
      bubble: root.querySelector('[data-hsm-chat-bubble]'),
      response: root.querySelector('[data-hsm-chat-response]'),
      tools: root.querySelector('[data-hsm-chat-tools]'),
      tool: [].slice.call(root.querySelectorAll('.hse-hs__tool')),
      used: root.querySelector('[data-hsm-chat-used]'),
      usedRow: root.querySelector('[data-hsm-chat-used-row]'),
      a: root.querySelector('[data-hsm-chat-answer-a]'),
      b: root.querySelector('[data-hsm-chat-answer-b]'),
      placeholder: root.querySelector('[data-hsm-chat-placeholder]'),
      typed: root.querySelector('[data-hsm-chat-typed]'),
      cursor: root.querySelector('[data-hsm-chat-cursor]'),
      send: root.querySelector('[data-hsm-chat-send]')
    };
    if (!chat.bubble || !chat.response || !chat.tools || !chat.a || !chat.b || !chat.typed) return null;

    var running = false;
    var timeouts = [];
    var intervals = [];

    function later(ms, fn) { timeouts.push(setTimeout(fn, ms)); }
    function clearTimers() {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      timeouts = [];
      intervals = [];
    }
    function typeText(el, text, done) {
      var i = 0;
      el.textContent = '';
      var timer = setInterval(function () {
        el.textContent = text.slice(0, ++i);
        if (i >= text.length) {
          clearInterval(timer);
          if (done) done();
        }
      }, 14);
      intervals.push(timer);
    }
    function resetVisual() {
      chat.bubble.classList.remove('hse-is-visible');
      chat.response.classList.remove('hse-is-visible');
      chat.tools.classList.remove('hse-is-done');
      chat.tool.forEach(function (tool) { tool.classList.remove('hse-is-on', 'hse-is-live'); });
      chat.used.hidden = true;
      chat.usedRow.hidden = true;
      chat.a.textContent = '';
      chat.b.textContent = '';
      chat.placeholder.style.display = '';
      chat.typed.textContent = '';
      chat.cursor.classList.remove('hse-is-blinking');
      chat.send.classList.remove('hse-is-active');
      chat.send.disabled = true;
    }
    function showTool(index) {
      chat.tool.forEach(function (tool, i) {
        tool.classList.toggle('hse-is-on', i <= index);
        tool.classList.toggle('hse-is-live', i === index);
      });
    }
    function finalAnswer(done) {
      chat.tool.forEach(function (tool) { tool.classList.remove('hse-is-live'); });
      chat.tools.classList.add('hse-is-done');
      chat.used.hidden = false;
      chat.usedRow.hidden = false;
      typeText(chat.a, A1, function () { typeText(chat.b, A2, done); });
    }
    function cycle() {
      if (!running) return;
      clearTimers();
      resetVisual();
      later(350, function () {
        if (!running) return;
        chat.placeholder.style.display = 'none';
        chat.cursor.classList.add('hse-is-blinking');
        chat.send.disabled = false;
        chat.send.classList.add('hse-is-active');
        typeText(chat.typed, Q, function () {
          later(250, function () {
            if (!running) return;
            chat.cursor.classList.remove('hse-is-blinking');
            chat.send.classList.remove('hse-is-active');
            chat.send.disabled = true;
            chat.typed.textContent = '';
            chat.bubble.classList.add('hse-is-visible');
            chat.response.classList.add('hse-is-visible');
            showTool(0);
            later(850, function () {
              showTool(1);
              later(850, function () {
                showTool(2);
                later(900, function () {
                  finalAnswer(function () { later(2500, cycle); });
                });
              });
            });
          });
        });
      });
    }
    function start() {
      if (running) return;
      running = true;
      cycle();
    }
    function stop() {
      running = false;
      clearTimers();
      resetVisual();
    }
    function finish() {
      stop();
      chat.placeholder.style.display = 'none';
      chat.bubble.classList.add('hse-is-visible');
      chat.response.classList.add('hse-is-visible');
      chat.tools.classList.add('hse-is-done');
      chat.used.hidden = false;
      chat.usedRow.hidden = false;
      chat.a.textContent = A1;
      chat.b.textContent = A2;
    }

    resetVisual();
    return { finish: finish, start: start, stop: stop };
  }

  var responsiveChatRoot = track.querySelector('[data-hsm-chat]');
  var responsiveChat = createResponsiveChat(responsiveChatRoot);
  if (responsiveChat) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      responsiveChat.finish();
    } else {
      var responsiveChatObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) responsiveChat.start();
          else responsiveChat.stop();
        });
      }, { threshold: [0, 0.2] });
      responsiveChatObserver.observe(responsiveChatRoot);
    }
  }

  /* \u2500\u2500 Phone (slide 03) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
     The screenshot stays; the message area, the typed text and the tap
     plates are DOM laid over it. Key rectangles are measured off the
     screenshot in its own units (242 wide): four rows, pitch ~31. */
  var PHQ = 'How did the weekly UGC launch go?';
  var PHA = 'Weekly UGC launch \u2014 Q4. Ran Sunday 03:00 (your time). 6 ads live. No gaps found in your current setup.';
  function createPhone(root) {
    if (!root) return null;
    var ph = {
      greet: root.querySelector('.hse-hs__ph-greet'),
      q: root.querySelector('.hse-hs__ph-q'),
      a: root.querySelector('.hse-hs__ph-a'),
      typed: root.querySelector('.hse-hs__ph-typed-text'),
      scroll: root.querySelector('.hse-hs__ph-scroll'),
      keys: root.querySelector('.hse-hs__ph-keys')
    };
    if (!ph.greet || !ph.q || !ph.a || !ph.typed || !ph.scroll || !ph.keys) return null;

    var keymap = {};
    var timers = [];
    var state = -1;
    var rows = [
      { y: 5,  h: 25, keys: 'qwertyuiop', x0: 12.1, pitch: 22.17, w: 18.4 },
      { y: 36, h: 25, keys: 'asdfghjkl',  x0: 22.9, pitch: 22.17, w: 18.6 },
      { y: 68, h: 25, keys: 'zxcvbnm',    x0: 45.4, pitch: 22.17, w: 18.4 }
    ];

    function addKey(ch, x, y, w, h) {
      var key = document.createElement('div');
      key.className = 'hse-hs__ph-key';
      key.style.left = 'calc(' + x + ' * var(--u))';
      key.style.top = 'calc(' + y + ' * var(--u))';
      key.style.width = 'calc(' + w + ' * var(--u))';
      key.style.height = 'calc(' + h + ' * var(--u))';
      ph.keys.appendChild(key);
      keymap[ch] = key;
    }

    rows.forEach(function (row) {
      row.keys.split('').forEach(function (ch, i) {
        addKey(ch, row.x0 + i * row.pitch, row.y, row.w, row.h);
      });
    });
    addKey('shift', 12.1, 68, 25, 25);
    addKey('del', 204.9, 68, 25, 25);
    addKey('123', 12.5, 99, 23.3, 25);
    addKey(' ', 67.5, 99, 107, 25);
    addKey('ret', 178.7, 99, 51, 25);
    var send = document.createElement('div');
    send.className = 'hse-hs__ph-send';
    root.appendChild(send);
    keymap.send = send;

    function stop() { timers.forEach(clearTimeout); timers = []; }
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function tap(ch, ms) {
      var key = keymap[ch];
      if (!key) return;
      key.classList.add('hse-is-down');
      at(ms || 90, function () { key.classList.remove('hse-is-down'); });
    }
    function reset() {
      stop();
      state = -1;
      Object.keys(keymap).forEach(function (key) { keymap[key].classList.remove('hse-is-down'); });
      ph.greet.classList.remove('hse-is-gone');
      ph.q.classList.remove('hse-is-in');
      ph.a.classList.remove('hse-is-in');
      ph.q.innerHTML = '';
      ph.a.textContent = '';
      ph.typed.textContent = '';
      ph.scroll.style.translate = '';
    }
    function finish() {
      reset();
      state = 2;
      ph.greet.classList.add('hse-is-gone');
      ph.q.innerHTML = '<span></span>';
      ph.q.firstChild.textContent = PHQ;
      ph.q.classList.add('hse-is-in');
      ph.a.textContent = PHA;
      ph.a.classList.add('hse-is-in');
    }
    function play() {
      if (state === 1) return;
      reset();
      state = 1;
      var t = 350;
      var per = 50;
      PHQ.split('').forEach(function (ch, i) {
        var lower = ch.toLowerCase();
        var upper = ch !== lower;
        if (upper) at(t, function () { tap('shift', 110); });
        if (ch === '?') at(t, function () { tap('123', 110); });
        at(t + (upper ? 40 : 0), function () {
          tap(lower in keymap ? lower : ' ', 90);
          ph.typed.textContent = PHQ.slice(0, i + 1);
          var over = ph.scroll.offsetWidth - ph.scroll.parentNode.clientWidth;
          ph.scroll.style.translate = (over > 0 ? -over : 0) + 'px 0';
        });
        t += per + (ch === ' ' ? 20 : 0);
      });
      t += 220;
      at(t, function () {
        tap('send', 140);
        ph.greet.classList.add('hse-is-gone');
        ph.q.innerHTML = '<span></span>';
        ph.q.firstChild.textContent = PHQ;
        ph.q.classList.add('hse-is-in');
        ph.typed.textContent = '';
        ph.scroll.style.translate = '';
      });
      t += 450;
      var words = PHA.split(' ');
      words.forEach(function (word, i) {
        at(t + i * 60, function () {
          ph.a.textContent = words.slice(0, i + 1).join(' ');
          ph.a.classList.add('hse-is-in');
        });
      });
    }

    reset();
    return {
      finish: finish,
      isActive: function () { return state !== -1; },
      play: play,
      reset: reset
    };
  }

  var phone = createPhone(card.querySelector('[data-frag="phone"]'));
  /* segment 5 is the phone's hold: play once it has arrived, reset when scrolled back before it */
  var PHONE_SEG = 5;
  function drivePhone(a, local) {
    if (!phone) return;
    if (a < PHONE_SEG - 1 || (a === PHONE_SEG - 1 && local < 0.6)) {
      if (phone.isActive()) phone.reset();
      return;
    }
    if (!phone.isActive()) phone.play();
  }

  var responsivePhoneRoot = track.querySelector('[data-hsm-phone]');
  var responsivePhone = createPhone(responsivePhoneRoot);
  if (responsivePhone) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      responsivePhone.finish();
    } else {
      var responsivePhoneObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) responsivePhone.play();
          else if (responsivePhone.isActive()) responsivePhone.reset();
        });
      }, { threshold: [0, 0.2] });
      responsivePhoneObserver.observe(responsivePhoneRoot);
    }
  }

  /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
     FIRST STATE \u2014 the collage assembles

     The workspace builds around the edges: the left cluster, then the
     right one, then the bar and the platform badges that sit on top of
     them \u2014 and the rule constructor lands in the middle last, because it
     is what the slide is about. Order is identity, so it is written out
     here rather than derived from z-index or from distance to the centre,
     both of which put the constructor in the middle of the sequence.

     The three rule cards are one entry: they are stacked on the same spot
     and only the top one (Duplicate) is ever seen, so if they stepped in
     one by one the card underneath would show through first.

     Timing is the block's reference rhythm \u2014 a hard 120 ms step per piece
     (in the CSS), 90 ms between them, and one 350 ms breath before the
     constructor so it reads as the point rather than the twelfth item.

     The markers are set from here, not in the markup: without JS nothing
     is hidden and the inline step 0 renders as the finished collage.
     \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
  var INTRO = {
    at:     220,   /* ms \u2014 beat of silence once the block is in view */
    step:    90,   /* ms \u2014 gap between pieces */
    /* A held beat before the constructor, not a pause: at 350 it read as a
       separate event bolted onto the end. One step's worth on top of the
       regular gap is enough to mark it as the last thing to land, and the
       pieces before it are still settling when it does. */
    breath: 100,
    order: [
      'schedule-cal', 'actions', 'ad-account',
      'schedule-section', 'frequency-popover', 'filter',
      'integrations',
      'platform-google-ads', 'platform-meta', 'platform-tiktok', 'platform-snapchat',
      ['rule-card-pause', 'rule-card-increase', 'rule-card']
    ]
  };

  var introRunning = false, introEls = [], introTimers = [];

  /* How long a piece takes to finish growing \u2014 read from the stylesheet so
     --intro-settle stays the only place the number lives. */
  function introSettle() {
    var v = getComputedStyle(card).getPropertyValue('--intro-settle').trim();
    var n = parseFloat(v);
    if (!n) return 420;
    return /ms$/.test(v) ? n : n * 1000;
  }

  function introFor(entry) {
    return (Array.isArray(entry) ? entry : [entry]).map(function (id) {
      return card.querySelector('[data-frag="' + id + '"]');
    }).filter(Boolean);
  }

  function introFinish() {
    introTimers.forEach(clearTimeout); introTimers = [];
    /* let whatever is still hidden play its own 120 ms step rather than
       blinking on, then drop every trace of the entrance */
    introEls.forEach(function (el) { el.classList.add('hse-is-in'); });
    introRunning = false;
    setTimeout(function () {
      card.classList.remove('hse-is-intro');
      introEls.forEach(function (el) { el.removeAttribute('data-intro'); el.classList.remove('hse-is-in'); });
      introEls = [];
    }, introSettle() + 60);
  }

  function introPlay() {
    if (introRunning || !introEls.length) return;
    introRunning = true;
    var last = INTRO.order.length - 1;
    INTRO.order.forEach(function (entry, i) {
      var at = INTRO.at + i * INTRO.step + (i === last ? INTRO.breath : 0);
      introFor(entry).forEach(function (el) {
        introTimers.push(setTimeout(function () { el.classList.add('hse-is-in'); }, at));
      });
      if (i === last) introTimers.push(setTimeout(introFinish, at + introSettle() + 60));
    });
  }

  /* Park every piece in its hidden state, transitions off for the one frame
     that takes. Without that the pieces animate OUT before stepping back in:
     `transition` also runs in reverse, and the collage is already on screen
     both on a replay and on any load where step 0 has painted. Two reflows,
     the same pattern as the hero page \u2014 one to commit the reset, one to
     commit the re-enabled transitions. */
  function introArm() {
    introTimers.forEach(clearTimeout); introTimers = [];
    introRunning = false; introEls = [];

    card.classList.add('hse-no-anim');
    card.classList.remove('hse-is-intro');
    INTRO.order.forEach(function (entry) {
      introFor(entry).forEach(function (el) {
        el.classList.remove('hse-is-in');
        el.setAttribute('data-intro', '');
        introEls.push(el);
      });
    });
    card.classList.add('hse-is-intro');
    void card.offsetWidth;
    card.classList.remove('hse-no-anim');
    void card.offsetWidth;
  }

  /* Replay without a reload \u2014 the entrance plays once per page, and tuning
     INTRO by eye is impossible otherwise. Same hook the hero page exposes. */

  function introInit() {
    /* Past the first state already \u2014 a reload deep in the track \u2014 or motion
       turned down: the collage is simply there, the same rule the pop
       elements follow beyond their own step. */
    if (progress() > 0.001) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    introArm();
    if (!introEls.length) { card.classList.remove('hse-is-intro'); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.disconnect(); introPlay(); }
      });
    }, { threshold: 0.25 });
    io.observe(card);
  }

  window.addEventListener('scroll', apply, { passive: true });
  window.addEventListener('resize', function () {
    chromeHeightPx();
    responsiveScrollers.forEach(function (scroller) { scroller._hsmPosition(); });
    shownP = null;
    lockBarHeight();
    apply();
  });
  introInit();
  apply();
  });
})();
