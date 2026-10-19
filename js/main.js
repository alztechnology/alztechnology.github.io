/* ALZ Technology - homepage scripts (no dependencies) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= Node-network canvas ================= */
  function initNetwork() {
    var canvas = document.getElementById('network');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var nodes = [], w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), raf = null, visible = true;

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(70, Math.max(24, (w * h) / 16000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({ x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
          r: Math.random() * 1.6 + 1, t: Math.random() });
      }
      if (reduceMotion) draw();
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var maxD = Math.min(150, w / 5), maxD2 = maxD * maxD;
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            var o = (1 - d2 / maxD2) * .35;
            var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            g.addColorStop(0, 'rgba(30,155,255,' + o + ')');
            g.addColorStop(1, 'rgba(25,211,197,' + o + ')');
            ctx.strokeStyle = g; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (var k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        ctx.fillStyle = n.t > .5 ? 'rgba(25,211,197,.85)' : 'rgba(30,155,255,.85)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    function step() {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      draw();
      raf = visible ? requestAnimationFrame(step) : null;
    }
    resize();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    if (reduceMotion) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(step);
      }).observe(canvas);
    }
    raf = requestAnimationFrame(step);
  }

  /* ================= Crypto market board ================= */
  var COINS = ['bitcoin', 'ethereum', 'ripple', 'stellar', 'hedera-hashgraph', 'cardano', 'xdce-crowd-sale', 'solana', 'dogecoin', 'vechain'];
  var API = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' + COINS.join(',') +
            '&sparkline=true&price_change_percentage=24h';
  var CACHE_KEY = 'alz_market_cache_v1';
  var REFRESH_MS = 60000;
  var prev = {};   // id -> last shown price
  var rendered = false;

  function fmtPrice(p) {
    if (p == null || isNaN(p)) return '–';
    var d = p >= 1000 ? 2 : p >= 1 ? 2 : p >= 0.1 ? 4 : p >= 0.01 ? 5 : 6;
    return '$' + p.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtCap(n) {
    if (n == null || isNaN(n)) return '–';
    var u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    for (var i = 0; i < u.length; i++) if (n >= u[i][0]) return '$' + (n / u[i][0]).toFixed(2) + u[i][1];
    return '$' + n.toFixed(0);
  }
  function fmtPct(p) {
    if (p == null || isNaN(p)) return '–';
    return (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p).toFixed(2) + '%';
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function sortByList(data) {
    return data.slice().sort(function (a, b) { return COINS.indexOf(a.id) - COINS.indexOf(b.id); });
  }

  function drawSpark(canvas, prices, up) {
    if (!canvas || !prices || prices.length < 2) return;
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(r.width, 100), h = Math.max(r.height, 30);
    canvas.width = w * dpr; canvas.height = h * dpr;
    var c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    // downsample to ~60 points
    var step = Math.max(1, Math.floor(prices.length / 60)), pts = [];
    for (var i = 0; i < prices.length; i += step) pts.push(prices[i]);
    pts.push(prices[prices.length - 1]);
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts), rng = (max - min) || 1, pad = 3;
    var col = up ? '34,211,154' : '255,92,122';
    c.beginPath();
    for (var k = 0; k < pts.length; k++) {
      var x = (k / (pts.length - 1)) * w, y = pad + (1 - (pts[k] - min) / rng) * (h - pad * 2);
      k ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = 'rgb(' + col + ')'; c.lineWidth = 1.6; c.lineJoin = 'round'; c.stroke();
    c.lineTo(w, h); c.lineTo(0, h); c.closePath();
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(' + col + ',.25)'); g.addColorStop(1, 'rgba(' + col + ',0)');
    c.fillStyle = g; c.fill();
  }

  function animateNumber(el, from, to, dur) {
    if (reduceMotion || from == null || from === to) { el.textContent = fmtPrice(to); return; }
    var start = null;
    function f(ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmtPrice(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  function buildBoard(data) {
    var board = document.getElementById('board');
    board.innerHTML = data.map(function (c) {
      return '<article class="coin" data-id="' + esc(c.id) + '" aria-label="' + esc(c.name) + '">' +
        '<div class="coin__id"><img src="' + esc(c.image || '') + '" alt="" width="28" height="28" loading="lazy">' +
        '<div><div class="coin__sym">' + esc((c.symbol || '').toUpperCase()) + '</div><div class="coin__name">' + esc(c.name) + '</div></div></div>' +
        '<div class="coin__chg"></div>' +
        '<div class="coin__price"></div>' +
        '<canvas class="coin__spark" role="img" aria-label="7-day price trend for ' + esc(c.name) + '"></canvas>' +
        '<div class="coin__cap"><span>Market cap</span><b></b></div>' +
        '</article>';
    }).join('');
    board.setAttribute('aria-busy', 'false');
    rendered = true;
  }

  function updateBoard(data, animate) {
    if (!rendered || document.querySelectorAll('.coin[data-id]').length !== data.length) buildBoard(data);
    data.forEach(function (c) {
      var card = document.querySelector('.coin[data-id="' + c.id + '"]');
      if (!card) return;
      var pct = c.price_change_percentage_24h_in_currency != null ? c.price_change_percentage_24h_in_currency : c.price_change_percentage_24h;
      var up = (pct || 0) >= 0;
      var chg = card.querySelector('.coin__chg');
      chg.textContent = fmtPct(pct);
      chg.className = 'coin__chg ' + (up ? 'up' : 'down');
      chg.setAttribute('aria-label', '24 hour change ' + (pct != null ? pct.toFixed(2) + ' percent' : 'unavailable'));
      var priceEl = card.querySelector('.coin__price');
      var old = prev[c.id];
      if (animate && old != null && old !== c.current_price) {
        priceEl.classList.remove('flash-up', 'flash-down'); void priceEl.offsetWidth;
        priceEl.classList.add(c.current_price > old ? 'flash-up' : 'flash-down');
        animateNumber(priceEl, old, c.current_price, 900);
      } else if (animate && old == null) {
        animateNumber(priceEl, c.current_price * 0.98, c.current_price, 900);
      } else {
        priceEl.textContent = fmtPrice(c.current_price);
      }
      prev[c.id] = c.current_price;
      card.querySelector('.coin__cap b').textContent = fmtCap(c.market_cap);
      var spark = c.sparkline_in_7d && c.sparkline_in_7d.price;
      var trendUp = spark && spark.length ? spark[spark.length - 1] >= spark[0] : up;
      drawSpark(card.querySelector('.coin__spark'), spark, trendUp);
    });
    updateTicker(data);
  }

  function updateTicker(data) {
    var el = document.getElementById('ticker');
    var items = data.map(function (c) {
      var pct = c.price_change_percentage_24h_in_currency != null ? c.price_change_percentage_24h_in_currency : c.price_change_percentage_24h;
      var cls = (pct || 0) >= 0 ? 'up' : 'down';
      return '<span class="ticker__item"><span class="ticker__sym">' + esc((c.symbol || '').toUpperCase()) + '</span>' +
        '<span class="ticker__price">' + fmtPrice(c.current_price) + '</span>' +
        '<span class="' + cls + '">' + fmtPct(pct) + '</span></span>';
    }).join('');
    // duplicated so the CSS loop (translateX -50%) is seamless; second copy hidden from screen readers
    el.innerHTML = '<span style="display:inline-flex">' + items + '</span><span style="display:inline-flex" aria-hidden="true">' + items + '</span>';
  }

  function setStatus(state, text) {
    var s = document.getElementById('status');
    s.className = 'status status--' + state;
    document.getElementById('status-text').textContent = text;
    document.getElementById('notice').classList.toggle('show', state === 'stale');
  }

  function timeStr(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function readCache() {
    try { var c = JSON.parse(localStorage.getItem(CACHE_KEY)); return c && c.data && c.data.length ? c : null; } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) { /* storage full/blocked */ }
  }

  var inFlight = false, timer = null, failures = 0;
  function load() {
    if (inFlight) return;
    inFlight = true;
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(API, { headers: { accept: 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status === 429 ? 'rate limited' : 'HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) throw new Error('empty response');
        data = sortByList(data);
        writeCache(data);
        updateBoard(data, true);
        failures = 0;
        setStatus('live', 'Live · updated ' + timeStr(Date.now()));
      })
      .catch(function (err) {
        failures++;
        var cache = readCache();
        if (cache) {
          if (!rendered) updateBoard(cache.data, false);
          setStatus('stale', 'Last update ' + timeStr(cache.ts));
          document.getElementById('notice').textContent = 'Live data temporarily unavailable. Showing the last prices received at ' +
            new Date(cache.ts).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '.';
        } else {
          setStatus('stale', 'Offline');
          document.getElementById('notice').textContent = 'Live data temporarily unavailable. Please check back in a minute.';
          var board = document.getElementById('board'); board.setAttribute('aria-busy', 'false');
          if (!rendered) board.innerHTML = '<p class="empty">Prices will appear here when the data source is reachable.</p>';
        }
        if (window.console) console.warn('[ALZ] market data:', err && err.message);
      })
      .then(function () { clearTimeout(to); inFlight = false; schedule(); });
  }
  function schedule() {
    clearTimeout(timer);
    // back off a little after repeated failures (max 5 min)
    var delay = failures ? Math.min(REFRESH_MS * Math.pow(2, failures - 1), 300000) : REFRESH_MS;
    timer = setTimeout(function () { if (!document.hidden) load(); else schedule(); }, delay);
  }

  function initMarket() {
    var cache = readCache();
    if (cache) { // instant paint from cache, then refresh
      updateBoard(cache.data, false);
      setStatus('stale', 'Refreshing…');
      document.getElementById('notice').classList.remove('show');
    }
    load();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { var c = readCache(); if (!c || Date.now() - c.ts > REFRESH_MS) load(); }
    });
    var rt; window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var c = readCache(); if (c && rendered) updateBoard(c.data, false); }, 200);
    });
  }

  /* ================= Articles ================= */
  function initArticles() {
    var wrap = document.getElementById('cards');
    if (!wrap) return;
    fetch('articles/articles.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (list) {
        list = (list || []).filter(function (a) { return !a.draft; })
          .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
        if (!list.length) { wrap.innerHTML = '<p class="empty">New articles coming soon.</p>'; return; }
        wrap.innerHTML = list.map(function (a) {
          var d = a.date ? new Date(a.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
          return '<a class="card" href="' + esc(a.url) + '">' +
            (a.image ? '<img class="card__img" src="' + esc(a.image) + '" alt="' + esc(a.imageAlt || '') + '" width="1280" height="720" loading="lazy">' : '') +
            '<div class="card__body"><div class="card__meta">' +
            (a.tag ? '<span class="tag">' + esc(a.tag) + '</span>' : '') +
            (d ? '<time datetime="' + esc(a.date) + '">' + d + '</time>' : '') +
            (a.readMinutes ? '<span>' + esc(a.readMinutes) + ' min read</span>' : '') +
            '</div><h3>' + esc(a.title) + '</h3><p>' + esc(a.summary || '') + '</p>' +
            '<span class="card__more">Read article →</span></div></a>';
        }).join('');
      })
      .catch(function (err) {
        wrap.innerHTML = '<p class="empty">Articles could not be loaded right now.</p>';
        if (window.console) console.warn('[ALZ] articles:', err && err.message);
      });
  }

  initNetwork();
  initMarket();
  initArticles();
})();
