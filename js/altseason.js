/* ALZ Technology - Altseason tracker. Data: CoinGecko, Alternative.me, TradingView embeds. */
(function () {
  'use strict';

  var CG = 'https://api.coingecko.com/api/v3';
  var URLS = {
    markets: CG + '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d,30d',
    global: CG + '/global',
    fng: 'https://api.alternative.me/fng/?limit=31',
    hist: '../data/altseason.json'
  };
  var REFRESH_MS = 120000;          // markets + global
  var FNG_MS = 30 * 60000;          // Fear & Greed updates once a day
  var TOP_N = 50;
  var CACHE = 'alz_altseason_v1_';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stablecoins, wrapped/staked/bridged tokens and tokenised funds/commodities.
  // Keep in sync with EXCLUDE_IDS in scripts/build_altseason_data.py.
  var EXCLUDE_IDS = ('tether usd-coin dai ethena-usde first-digital-usd usds usd1-wlfi paypal-usd global-dollar ripple-usd ' +
    'falcon-finance united-stables usdd bfusd usdgo open-usd gho usual-usd true-usd frax tusd binance-usd paxos-standard ' +
    'gemini-dollar stasis-eurs euro-coin susds ethena-staked-usde sky-dollar resolv-usr agora-dollar wrapped-bitcoin weth ' +
    'staked-ether wrapped-steth wrapped-beacon-eth wrapped-eeth coinbase-wrapped-btc binance-peg-weth rocket-pool-eth ' +
    'mantle-staked-ether lombard-staked-btc kelp-dao-restaked-eth renzo-restaked-eth solv-btc jito-staked-sol msol ' +
    'binance-staked-sol bitget-staked-eth coinbase-wrapped-staked-eth wrapped-solana tbtc wrapped-hype tether-gold pax-gold ' +
    'figure-heloc ondo-us-dollar-yield hashnote-usyc spiko-amundi-overnight-swap-fund-eur ' +
    'blackrock-usd-institutional-digital-liquidity-fund superstate-short-duration-us-government-securities-fund-ustb ' +
    'janus-henderson-anemoy-aaa-clo-fund ousg usdtb usdx-money-usdx bitway').split(' ');
  var NAME_FLAGS = ['wrapped', 'bridged', 'staked', 'restaked', ' usd', 'usd ', 'dollar', ' fund', 'treasury', ' gold'];

  function isPeg(c) {
    var p = c.current_price, c7 = c.price_change_percentage_7d_in_currency, c30 = c.price_change_percentage_30d_in_currency;
    return p >= 0.97 && p <= 1.03 && c30 != null && Math.abs(c30) < 1.5 && (c7 == null || Math.abs(c7) < 1);
  }
  function isExcluded(c) {
    if (c.id === 'bitcoin') return false;
    if (EXCLUDE_IDS.indexOf(c.id) !== -1) return true;
    var sym = (c.symbol || '').toLowerCase(), name = ' ' + (c.name || '').toLowerCase() + ' ';
    if (sym.indexOf('usd') !== -1) return true;
    for (var i = 0; i < NAME_FLAGS.length; i++) if (name.indexOf(NAME_FLAGS[i]) !== -1) return true;
    return isPeg(c);
  }
  function isStable(c) {
    var sym = (c.symbol || '').toLowerCase(), name = (c.name || '').toLowerCase();
    if (/gold|wrapped|staked|bridged/.test(name)) return false;
    return isPeg(c) || ((sym.indexOf('usd') !== -1 || /dollar|usd/.test(name)) && c.current_price > 0.9 && c.current_price < 1.1);
  }

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function ok(n) { return n != null && isFinite(n); }
  function fmtUsd(n) {
    if (!ok(n)) return '–';
    var u = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M']];
    for (var i = 0; i < u.length; i++) if (Math.abs(n) >= u[i][0]) return '$' + (n / u[i][0]).toFixed(n >= 1e12 ? 3 : 2) + u[i][1];
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function fmtPrice(p) {
    if (!ok(p)) return '–';
    var d = p >= 1 ? 2 : p >= 0.1 ? 4 : p >= 0.01 ? 5 : 6;
    return '$' + p.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtPct(p, dp) { return ok(p) ? (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(dp == null ? 1 : dp) + '%' : '–'; }
  function cls(p) { return ok(p) ? (p >= 0 ? 'up' : 'down') : 'na'; }
  function pctSpan(p, dp) { return '<span class="' + cls(p) + '">' + fmtPct(p, dp) + '</span>'; }
  function timeStr(ts, withDay) {
    var o = { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
    if (withDay) { o.day = 'numeric'; o.month = 'short'; }
    try { return new Date(ts).toLocaleString([], o); } catch (e) { return new Date(ts).toLocaleString(); }
  }
  function rel(r, rb) { return ok(r) && ok(rb) ? ((1 + r / 100) / (1 + rb / 100) - 1) * 100 : null; }
  function readCache(k) { try { var c = JSON.parse(localStorage.getItem(CACHE + k)); return c && c.data ? c : null; } catch (e) { return null; } }
  function writeCache(k, data) { try { localStorage.setItem(CACHE + k, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) { /* full/blocked */ } }

  function getJSON(url, noCache) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return fetch(url, { headers: { accept: 'application/json' }, cache: noCache ? 'no-cache' : 'default', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        clearTimeout(to);
        if (!r.ok) throw new Error(r.status === 429 ? 'rate limited (429)' : 'HTTP ' + r.status);
        return r.json();
      }, function (e) { clearTimeout(to); throw e; });
  }

  /* ---------- state ---------- */
  var S = { markets: null, global: null, fng: null, hist: null, ts: {}, live: {} };
  var lastFng = 0, failures = 0, timer = null, inFlight = false;

  function settle(name, p, validate) {
    return p.then(function (d) {
      if (!validate(d)) throw new Error('unexpected response');
      S[name] = d; S.ts[name] = Date.now(); S.live[name] = true;
      if (name !== 'hist') writeCache(name, d);
    }).catch(function (err) {
      S.live[name] = false;
      if (!S[name]) { var c = readCache(name); if (c) { S[name] = c.data; S.ts[name] = c.ts; } }
      if (window.console) console.warn('[ALZ altseason] ' + name + ':', err && err.message);
    });
  }

  function load() {
    if (inFlight) return;
    inFlight = true;
    var jobs = [
      settle('markets', getJSON(URLS.markets), function (d) { return Array.isArray(d) && d.length > 20; }),
      settle('global', getJSON(URLS.global), function (d) { return d && d.data && d.data.total_market_cap; })
    ];
    if (!S.hist) jobs.push(settle('hist', getJSON(URLS.hist, true), function (d) { return d && d.coins && d.history; }));
    if (Date.now() - lastFng > FNG_MS) {
      lastFng = Date.now();
      jobs.push(settle('fng', getJSON(URLS.fng), function (d) { return d && d.data && d.data.length; }));
    }
    Promise.all(jobs).then(function () {
      try { render(); } catch (e) { if (window.console) console.error('[ALZ altseason] render', e); }
      failures = S.live.markets && S.live.global ? 0 : failures + 1;
      inFlight = false; schedule();
    });
  }
  function schedule() {
    clearTimeout(timer);
    var delay = failures ? Math.min(REFRESH_MS * Math.pow(2, failures - 1), 600000) : REFRESH_MS;
    timer = setTimeout(function () { if (!document.hidden) load(); else schedule(); }, delay);
  }

  /* ---------- computations ---------- */
  function dayIndex(startIso, date) {
    var s = Date.UTC(+startIso.slice(0, 4), +startIso.slice(5, 7) - 1, +startIso.slice(8, 10));
    return Math.round((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - s) / 864e5);
  }
  function anchorReturn(id, price, days) {
    var h = S.hist; if (!h || !ok(price)) return null;
    var coin = null;
    for (var i = 0; i < h.coins.length; i++) if (h.coins[i].id === id) { coin = h.coins[i]; break; }
    if (!coin) return null;
    var k = dayIndex(h.closes_start, new Date(Date.now() - days * 864e5));
    var p0 = coin.closes[k];
    return ok(p0) && p0 > 0 ? (price / p0 - 1) * 100 : null;
  }
  function compute() {
    var m = S.markets; if (!m) return null;
    var btc = null, eth = null, alts = [];
    m.forEach(function (c) {
      if (c.id === 'bitcoin') btc = c;
      else if (c.id === 'ethereum') eth = c;
      if (c.id !== 'bitcoin' && !isExcluded(c) && alts.length < TOP_N) alts.push(c);
    });
    if (!btc) return null;
    var b = {
      r7: btc.price_change_percentage_7d_in_currency, r30: btc.price_change_percentage_30d_in_currency,
      r90: anchorReturn('bitcoin', btc.current_price, 90)
    };
    var rows = alts.map(function (c) {
      var r7 = c.price_change_percentage_7d_in_currency, r30 = c.price_change_percentage_30d_in_currency, r90 = anchorReturn(c.id, c.current_price, 90);
      return { id: c.id, rank: c.market_cap_rank, name: c.name, sym: (c.symbol || '').toUpperCase(), img: c.image,
        r7: r7, r30: r30, r90: r90, rel7: rel(r7, b.r7), rel30: rel(r30, b.r30), rel90: rel(r90, b.r90) };
    });
    function idx(k) {
      var n = 0, beat = 0;
      rows.forEach(function (r) { if (ok(r['r' + k]) && ok(b['r' + k])) { n++; if (r['r' + k] > b['r' + k]) beat++; } });
      return n >= 10 ? { v: Math.round(beat / n * 100), beat: beat, n: n } : null;
    }
    return { btc: btc, eth: eth, b: b, rows: rows, i90: idx(90), i30: idx(30), i7: idx(7) };
  }
  function histIndexFallback() {
    var h = S.hist && S.hist.history; if (!h || !h.length) return null;
    var l = h[h.length - 1];
    function f(v) { return ok(v) ? { v: Math.round(v), beat: null, n: null } : null; }
    return { i90: f(l.i90), i30: f(l.i30), i7: f(l.i7), fromHist: true };
  }
  function volTrend() {
    var h = S.hist && S.hist.history; if (!h || h.length < 30) return null;
    var r = h.map(function (x) { return x.altVol && x.btcVol ? x.altVol / x.btcVol : null; }).filter(ok);
    if (r.length < 30) return null;
    function avg(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
    var a7 = avg(r.slice(-7)), a30 = avg(r.slice(-30));
    return { a7: a7, a30: a30, chg: (a7 / a30 - 1) * 100 };
  }

  /* ---------- rendering ---------- */
  function bucket(v) { return v < 25 ? 'btc' : v >= 75 ? 'alt' : 'mid'; }
  var BUCKET_LABEL = { btc: 'Bitcoin season', mid: 'Mixed / transition', alt: 'Altcoin season' };

  function renderScores(I) {
    var v90 = I.i90 && I.i90.v;
    $('idx90').textContent = ok(v90) ? v90 : '–';
    var lab = $('idx-label');
    if (ok(v90)) { var bk = bucket(v90); lab.textContent = BUCKET_LABEL[bk]; lab.className = 'gauge__label ' + bk; }
    else { lab.textContent = 'Unavailable'; lab.className = 'gauge__label'; }
    $('needle').setAttribute('transform', 'rotate(' + (-90 + (ok(v90) ? v90 : 0) * 1.8) + ' 110 110)');
    $('gauge-desc').textContent = 'Altcoin Season Index gauge: ' + (ok(v90) ? v90 + ' out of 100, ' + BUCKET_LABEL[bucket(v90)] : 'unavailable');
    $('idx-cap').textContent = I.i90 && I.i90.n ? I.i90.beat + ' of ' + I.i90.n + ' alts beat BTC over 90 days' : '0–25 Bitcoin season · 25–75 mixed · 75–100 altcoin season';
    [['90', I.i90], ['30', I.i30], ['7', I.i7]].forEach(function (p) {
      $('s' + p[0]).textContent = p[1] ? p[1].v : '–';
      $('b' + p[0]).style.width = (p[1] ? p[1].v : 0) + '%';
      $('s' + p[0]).title = p[1] && p[1].n ? p[1].beat + ' of ' + p[1].n + ' beat BTC' : '';
    });
  }

  function renderRead(I, ethbtc30, vt) {
    var i90 = I.i90 && I.i90.v, i30 = I.i30 && I.i30.v, i7 = I.i7 && I.i7.v;
    if (!ok(i90)) {
      $('read-title').textContent = 'The regime read is unavailable right now';
      $('read-body').textContent = 'We could not load enough price data to compute the index. It will update automatically when the data source responds.';
      $('read-pos').innerHTML = ''; return;
    }
    var bk = bucket(i90), turn = ok(i30) ? (i30 >= i90 + 10 ? 'up' : i30 <= i90 - 10 ? 'down' : 'flat') : 'flat';
    var titles = {
      btc: 'Bitcoin season: BTC is leading most alts',
      mid: turn === 'up' ? 'Mixed, with breadth improving: a possible rotation' : turn === 'down' ? 'Mixed, with breadth fading: Bitcoin is regaining the lead' : 'Mixed market: no clear altcoin season',
      alt: 'Altcoin season: most alts are beating Bitcoin'
    };
    var body = 'The 90-day index is ' + i90 + ' out of 100' + (I.i90.n ? ' (' + I.i90.beat + ' of the top ' + I.i90.n + ' alts beat BTC)' : '') + '. ';
    if (ok(i30)) body += 'The 30-day score is ' + i30 + (ok(i7) ? ' and the 7-day is ' + i7 : '') + ', so short-term breadth is ' + (turn === 'up' ? 'stronger than' : turn === 'down' ? 'weaker than' : 'in line with') + ' the 90-day trend. ';
    if (ok(ethbtc30)) body += 'ETH/BTC is ' + (ethbtc30 >= 0 ? 'up ' : 'down ') + Math.abs(ethbtc30).toFixed(1) + '% over 30 days' + (ethbtc30 >= 0 ? ', which is the usual early tell for rotation. ' : ', so the usual leader of a rotation is not leading yet. ');
    if (vt) body += 'Alt volume relative to BTC is ' + (vt.chg >= 0 ? 'up ' : 'down ') + Math.abs(vt.chg).toFixed(0) + '% (7-day vs 30-day average).';
    if (I.fromHist) body += ' (Live prices are unavailable, so these scores are from the last daily snapshot.)';
    var pos = {
      btc: ['Historically, phases like this have favoured a Bitcoin-heavy core. Most alts have lost ground against BTC.',
        'Where people hold alts here, it tends to be a few liquid, high-conviction names rather than a broad basket.',
        'What would change the read: ETH/BTC turning up, the 30d score climbing above 50, and alt volume growing faster than BTC volume.'],
      mid_up: ['Rotation may be starting. ETH and large caps usually move first, smaller caps last.',
        'A common approach is to scale in gradually rather than going all-in before the 90d score confirms above 75.',
        'Supporting signs to watch: BTC.D breaking lower and TOTAL3 breaking above its recent highs.'],
      mid_down: ['Breadth is fading: alts that led over 90 days are losing ground recently. BTC has historically held up better in this phase.',
        'Typical risk response: smaller alt sizes, defined exits, and not chasing laggards.',
        'The read improves if the 7d and 30d scores recover above the 90d score.'],
      mid_flat: ['A selective market. Coin selection matters more than the regime: quality large caps and ETH over broad baskets.',
        'Sizing alts below a BTC core is the conservative way to stay exposed without betting on a full season.',
        'Watch for the 30d score breaking above the 90d with rising alt volume as confirmation.'],
      alt: ['Broad alt strength. Historically, this is when alts outperform the most, and when a take-profit plan matters most.',
        'Late-phase tells: OTHERS.D spiking, Fear & Greed at extreme greed, and parabolic moves in small caps.',
        'If the 30d and 7d scores drop well below the 90d, the season may be ending.']
    };
    var key = bk === 'mid' ? 'mid_' + turn : bk;
    $('read-title').textContent = titles[bk];
    $('read-body').textContent = body;
    $('read-pos').innerHTML = pos[key].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  }

  function renderSignals(I, ethbtc30, vt) {
    var i90 = I.i90 && I.i90.v, i30 = I.i30 && I.i30.v, i7 = I.i7 && I.i7.v;
    var fngV = S.fng && S.fng.data && S.fng.data[0] ? +S.fng.data[0].value : null;
    var list = [
      { t: 'Broad breadth', d: '90-day index at 75 or higher', v: ok(i90) ? i90 + ' / 100' : '–', on: ok(i90) ? i90 >= 75 : null },
      { t: 'Breadth turning up', d: '30-day score at or above the 90-day', v: ok(i30) && ok(i90) ? i30 + ' vs ' + i90 : '–', on: ok(i30) && ok(i90) ? i30 >= i90 : null },
      { t: 'Short-term momentum', d: '7-day index at 50 or higher', v: ok(i7) ? i7 + ' / 100' : '–', on: ok(i7) ? i7 >= 50 : null },
      { t: 'ETH leading BTC', d: 'ETH/BTC up over 30 days', v: fmtPct(ethbtc30), on: ok(ethbtc30) ? ethbtc30 > 0 : null },
      { t: 'Alt volume expanding', d: 'Alt/BTC volume, 7d avg vs 30d avg', v: vt ? fmtPct(vt.chg, 0) : '–', on: vt ? vt.chg > 0 : null },
      { t: 'Sentiment (context)', d: 'Fear & Greed; extreme greed often marks late phases', v: ok(fngV) ? fngV + ' · ' + S.fng.data[0].value_classification : '–', on: 'ctx' }
    ];
    var count = 0, known = 0;
    $('signal-list').innerHTML = list.map(function (s) {
      var state = s.on === 'ctx' ? '' : s.on === true ? 'sig--on' : s.on === false ? 'sig--off' : '';
      if (s.on === true || s.on === false) { known++; if (s.on) count++; }
      var ico = s.on === 'ctx' ? 'i' : s.on === true ? '✓' : s.on === false ? '✕' : '?';
      var sr = s.on === 'ctx' ? 'Context' : s.on === true ? 'Yes' : s.on === false ? 'No' : 'Unavailable';
      return '<li class="sig ' + state + '"><span class="sig__ico" aria-hidden="true">' + ico + '</span><span><b>' + esc(s.t) +
        ' <span class="sr-only">: ' + sr + '</span></b><small>' + esc(s.d) + '</small></span><span class="sig__v">' + esc(s.v) + '</span></li>';
    }).join('');
    $('signal-sum').textContent = known ? count + ' of ' + known + ' confirmation signals point toward alts right now.' : 'Signals will appear when data loads.';
  }

  function setText(id, t) { $(id).textContent = t; }
  function renderStats(C) {
    var g = S.global && S.global.data;
    if (g) {
      var tot = g.total_market_cap.usd, p = g.market_cap_percentage || {}, btcd = p.btc, ethd = p.eth;
      setText('v-btcd', ok(btcd) ? btcd.toFixed(2) + '%' : '–');
      setText('v-ethd', ok(ethd) ? ethd.toFixed(2) + '%' : '–');
      setText('v-othd', ok(btcd) && ok(ethd) ? (100 - btcd - ethd).toFixed(2) + '%' : '–');
      setText('v-total', fmtUsd(tot));
      $('s-total').innerHTML = '24h ' + pctSpan(g.market_cap_change_percentage_24h_usd, 2);
      setText('v-total2', ok(btcd) ? fmtUsd(tot * (1 - btcd / 100)) : '–');
      setText('v-total3', ok(btcd) && ok(ethd) ? fmtUsd(tot * (1 - (btcd + ethd) / 100)) : '–');
      setText('v-vol', fmtUsd(g.total_volume && g.total_volume.usd));
      $('s-vol').innerHTML = ok(g.volume_change_percentage_24h_usd) ? 'All coins · ' + pctSpan(g.volume_change_percentage_24h_usd) + ' vs prior 24h' : 'All coins';
      if (S.markets) {
        var st = S.markets.filter(isStable).reduce(function (s, c) { return s + (c.market_cap || 0); }, 0);
        setText('v-stbd', st && tot ? (st / tot * 100).toFixed(2) + '%' : '–');
      }
    }
    if (C && C.eth && C.btc) {
      setText('v-ethbtc', (C.eth.current_price / C.btc.current_price).toFixed(5));
      $('s-ethbtc').innerHTML = '7d ' + pctSpan(rel(C.eth.price_change_percentage_7d_in_currency, C.b.r7)) + ' · 30d ' + pctSpan(rel(C.eth.price_change_percentage_30d_in_currency, C.b.r30));
    }
    var f = S.fng && S.fng.data;
    if (f && f[0]) {
      setText('v-fng', f[0].value + ' · ' + f[0].value_classification);
      var parts = [];
      if (f[7]) parts.push('1w ago ' + f[7].value);
      if (f[30]) parts.push('1m ago ' + f[30].value);
      setText('s-fng', parts.length ? parts.join(' · ') : 'Alternative.me');
    } else { setText('v-fng', '–'); setText('s-fng', 'Unavailable right now'); }
    $('stats').setAttribute('aria-busy', 'false');
  }

  function renderVolume() {
    var m = S.markets; if (!m) { $('vlegend').innerHTML = '<li>Volume split unavailable right now.</li>'; return; }
    var v = { btc: 0, eth: 0, alts: 0, stables: 0 };
    m.forEach(function (c) {
      var x = c.total_volume || 0;
      if (c.id === 'bitcoin') v.btc += x; else if (c.id === 'ethereum') v.eth += x;
      else if (isStable(c)) v.stables += x; else if (!isExcluded(c)) v.alts += x;
    });
    var tot = v.btc + v.eth + v.alts + v.stables; if (!tot) return;
    var parts = [['Bitcoin', v.btc, '#f7931a'], ['Ethereum', v.eth, '#8f7cff'], ['Other alts', v.alts, '#19d3c5'], ['Stablecoins', v.stables, '#4b5a80']];
    $('vsplit').innerHTML = parts.map(function (p) { return '<i style="width:' + (p[1] / tot * 100).toFixed(2) + '%;background:' + p[2] + '"></i>'; }).join('');
    $('vlegend').innerHTML = parts.map(function (p) {
      return '<li><span style="--c:' + p[2] + '">' + p[0] + '</span><b>' + (p[1] / tot * 100).toFixed(1) + '% · ' + fmtUsd(p[1]) + '</b></li>';
    }).join('') + '<li><span style="--c:transparent">Alts (incl. ETH) ÷ BTC</span><b>' + ((v.eth + v.alts) / (v.btc || 1)).toFixed(2) + '×</b></li>';
    $('vsplit-sub').textContent = 'Top 100 coins by market cap · 24h volume ' + fmtUsd(tot);
  }

  var sortKey = 'rel90', sortDir = -1;
  function renderTable(C) {
    var body = $('lb-body');
    if (!C || !C.rows.length) { body.innerHTML = '<tr><td colspan="6" class="dim" style="text-align:left">Table unavailable right now. It will load when CoinGecko responds.</td></tr>'; return; }
    var rows = C.rows.slice();
    rows.sort(function (a, b) {
      var x = sortKey === 'beat' ? a.rel90 : a[sortKey], y = sortKey === 'beat' ? b.rel90 : b[sortKey];
      if (sortKey === 'name') return sortDir * String(x).localeCompare(String(y));
      if (!ok(x) && !ok(y)) return 0; if (!ok(x)) return 1; if (!ok(y)) return -1;
      return sortDir * (x - y);
    });
    var max = 1;
    rows.forEach(function (r) { ['rel7', 'rel30', 'rel90'].forEach(function (k) { if (ok(r[k])) max = Math.max(max, Math.abs(r[k])); }); });
    function cell(v) {
      if (!ok(v)) return '<td class="na">–</td>';
      var w = Math.max(2, Math.round(Math.abs(v) / max * 56));
      return '<td><span class="bar"><span class="' + cls(v) + '">' + fmtPct(v) + '</span><i style="--w:' + w + 'px;--c:' + (v >= 0 ? 'var(--alt)' : 'var(--btc)') + '"></i></span></td>';
    }
    body.innerHTML = rows.map(function (r) {
      var beat = ok(r.rel90) ? (r.rel90 > 0 ? '<span class="beat">Beat BTC</span>' : '<span class="beat lag">Lagged</span>') : '<span class="na">n/a</span>';
      return '<tr><td>' + esc(r.rank || '') + '</td><td><span class="coincell">' + (r.img ? '<img src="' + esc(r.img) + '" alt="" width="20" height="20" loading="lazy">' : '') +
        '<span><b>' + esc(r.sym) + '</b> <small>' + esc(r.name) + '</small></span></span></td>' + cell(r.rel7) + cell(r.rel30) + cell(r.rel90) + '<td>' + beat + '</td></tr>';
    }).join('');
    $('lb-foot').innerHTML = 'Bitcoin itself: 7d ' + pctSpan(C.b.r7) + ' · 30d ' + pctSpan(C.b.r30) + ' · 90d ' + pctSpan(C.b.r90) +
      '. Excludes stablecoins, wrapped/staked tokens and tokenised funds or gold.' +
      (S.hist && S.hist.generated_at ? ' 90d uses daily closes from the ' + timeStr(Date.parse(S.hist.generated_at), true) + ' snapshot.' : ' 90d history unavailable.');
  }
  function initSort() {
    var ths = document.querySelectorAll('#lb thead th');
    Array.prototype.forEach.call(ths, function (th) {
      var b = th.querySelector('button');
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k');
        if (k === sortKey) sortDir = -sortDir; else { sortKey = k; sortDir = (k === 'rank' || k === 'name') ? 1 : -1; }
        Array.prototype.forEach.call(ths, function (t) { t.removeAttribute('aria-sort'); });
        th.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
        renderTable(compute());
      });
    });
  }

  function renderTicker(C) {
    if (!S.markets) return;
    var list = S.markets.filter(function (c) { return !isExcluded(c); }).slice(0, 14);
    var items = list.map(function (c) {
      var p = c.price_change_percentage_24h_in_currency != null ? c.price_change_percentage_24h_in_currency : c.price_change_percentage_24h;
      return '<span class="ticker__item"><span class="ticker__sym">' + esc((c.symbol || '').toUpperCase()) + '</span><span class="ticker__price">' + fmtPrice(c.current_price) +
        '</span><span class="' + cls(p) + '">' + (ok(p) ? (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p).toFixed(2) + '%' : '–') + '</span></span>';
    }).join('');
    var g = S.global && S.global.data;
    if (g && g.market_cap_percentage) items = '<span class="ticker__item"><span class="ticker__sym">BTC.D</span><span class="ticker__price">' + g.market_cap_percentage.btc.toFixed(2) + '%</span></span>' + items;
    $('ticker').innerHTML = '<span style="display:inline-flex">' + items + '</span><span style="display:inline-flex" aria-hidden="true">' + items + '</span>';
  }

  function renderStatus() {
    var live = S.live.markets && S.live.global, s = $('status'), n = $('notice');
    if (live) {
      s.className = 'status status--live'; setText('status-text', 'Live · updated ' + timeStr(Date.now()));
      n.classList.remove('show');
    } else {
      s.className = 'status status--stale';
      var ts = S.ts.markets || S.ts.global;
      setText('status-text', ts ? 'Last update ' + timeStr(ts) : 'Offline');
      n.textContent = ts ? 'Live data temporarily unavailable (CoinGecko may be rate-limiting). Showing the last data received at ' + timeStr(ts, true) + '. Retrying automatically.'
        : 'Live data temporarily unavailable. Please check back in a minute; the page retries automatically.';
      n.classList.add('show');
    }
  }

  /* ---------- Chart.js charts (history from data/altseason.json) ---------- */
  var charts = {};
  var bands = {
    id: 'bands',
    beforeDatasetsDraw: function (chart, a, opts) {
      if (!opts || !opts.on) return;
      var y = chart.scales.y, x = chart.chartArea, ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(247,147,26,.08)'; ctx.fillRect(x.left, y.getPixelForValue(25), x.right - x.left, y.getPixelForValue(0) - y.getPixelForValue(25));
      ctx.fillStyle = 'rgba(25,211,197,.08)'; ctx.fillRect(x.left, y.getPixelForValue(100), x.right - x.left, y.getPixelForValue(75) - y.getPixelForValue(100));
      ctx.restore();
    }
  };
  function baseOpts(yfmt, extra) {
    var o = {
      responsive: true, maintainAspectRatio: false, animation: reduceMotion ? false : { duration: 600 },
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#a9b6d3', boxWidth: 12, boxHeight: 2, font: { family: 'Inter', size: 12 } } },
        tooltip: { backgroundColor: '#14254f', borderColor: 'rgba(255,255,255,.12)', borderWidth: 1, titleColor: '#fff', bodyColor: '#dce4f5',
          callbacks: { label: function (c) { return ' ' + c.dataset.label + ': ' + yfmt(c.parsed.y); } } } },
      scales: {
        x: { ticks: { color: '#7d8bab', maxTicksLimit: 6, maxRotation: 0, font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: '#7d8bab', font: { size: 11 }, callback: yfmt }, grid: { color: 'rgba(255,255,255,.06)' } }
      }
    };
    if (extra) extra(o);
    return o;
  }
  function shortDate(iso) { var d = new Date(iso + 'T00:00:00Z'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  function lineDs(label, data, color, width, dash) {
    return { label: label, data: data, borderColor: color, backgroundColor: color, borderWidth: width || 2, pointRadius: 0, pointHoverRadius: 3, tension: .25, spanGaps: true, borderDash: dash || [] };
  }
  function makeChart(id, cfg) {
    if (charts[id]) { charts[id].data = cfg.data; charts[id].update('none'); return; }
    charts[id] = new window.Chart($(id), cfg);
  }
  function renderCharts() {
    var h = S.hist && S.hist.history, okH = h && h.length > 5 && window.Chart;
    ['ch-index', 'ch-ethbtc', 'ch-vol'].forEach(function (id) { $(id + '-empty').classList.toggle('show', !okH); });
    if (!okH) return;
    var labels = h.map(function (x) { return shortDate(x.d); });
    makeChart('ch-index', {
      type: 'line', plugins: [bands],
      data: { labels: labels, datasets: [lineDs('90d index', h.map(function (x) { return x.i90; }), '#19d3c5', 2.5), lineDs('30d index', h.map(function (x) { return x.i30; }), '#8f7cff', 1.5, [4, 3])] },
      options: baseOpts(function (v) { return Math.round(v); }, function (o) { o.scales.y.min = 0; o.scales.y.max = 100; o.scales.y.ticks.stepSize = 25; o.plugins.bands = { on: true }; })
    });
    makeChart('ch-ethbtc', {
      type: 'line',
      data: { labels: labels, datasets: [lineDs('ETH/BTC', h.map(function (x) { return x.ethbtc; }), '#1e9bff', 2)] },
      options: baseOpts(function (v) { return ok(v) ? Number(v).toFixed(4) : v; }, function (o) { o.plugins.legend.display = false; })
    });
    var ratio = h.map(function (x) { return x.altVol && x.btcVol ? x.altVol / x.btcVol : null; });
    var ma = ratio.map(function (v, i) {
      var w = ratio.slice(Math.max(0, i - 6), i + 1).filter(ok);
      return i >= 6 && w.length ? w.reduce(function (s, a) { return s + a; }, 0) / w.length : null;
    });
    makeChart('ch-vol', {
      type: 'line',
      data: { labels: labels, datasets: [lineDs('Alt ÷ BTC volume', ratio, 'rgba(25,211,197,.45)', 1), lineDs('7-day average', ma, '#19d3c5', 2.5)] },
      options: baseOpts(function (v) { return ok(v) ? Number(v).toFixed(2) + '×' : v; })
    });
  }

  function render() {
    var C = compute();
    var I = C && C.i90 ? C : histIndexFallback() || { i90: null, i30: null, i7: null };
    if (C && !C.i90) { var hf = histIndexFallback(); if (hf) I = { i90: hf.i90, i30: C.i30, i7: C.i7 }; }
    var ethbtc30 = C && C.eth ? rel(C.eth.price_change_percentage_30d_in_currency, C.b.r30) : null;
    var vt = volTrend();
    renderStatus();
    renderScores(I);
    renderRead(I, ethbtc30, vt);
    renderSignals(I, ethbtc30, vt);
    renderStats(C);
    renderVolume();
    renderTable(C);
    renderTicker(C);
    renderCharts();
  }

  /* ---------- TradingView ---------- */
  var tvMounted = false;
  function mountTV(sym) {
    var box = $('tv'); box.innerHTML = '';
    var wrap = document.createElement('div'); wrap.className = 'tradingview-widget-container';
    var inner = document.createElement('div'); inner.className = 'tradingview-widget-container__widget';
    wrap.appendChild(inner);
    var s = document.createElement('script');
    s.type = 'text/javascript'; s.async = true;
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.text = JSON.stringify({
      autosize: true, symbol: sym, interval: 'D', timezone: 'Asia/Kuala_Lumpur', theme: 'dark', style: '1', locale: 'en',
      backgroundColor: 'rgba(13,26,61,1)', gridColor: 'rgba(255,255,255,0.05)', hide_side_toolbar: true, hide_top_toolbar: false,
      allow_symbol_change: true, save_image: false, calendar: false, withdateranges: true, details: false,
      support_host: 'https://www.tradingview.com'
    });
    wrap.appendChild(s);
    box.appendChild(wrap);
    tvMounted = true;
  }
  function initTV() {
    var tabs = document.querySelectorAll('#tv-tabs .tab');
    Array.prototype.forEach.call(tabs, function (t, i) {
      t.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (x) { x.setAttribute('aria-selected', 'false'); x.tabIndex = -1; });
        t.setAttribute('aria-selected', 'true'); t.tabIndex = 0;
        $('tv-note').textContent = t.getAttribute('data-note');
        mountTV(t.getAttribute('data-sym'));
      });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); n.click();
      });
      t.tabIndex = i ? -1 : 0;
    });
    var first = function () { if (!tvMounted) mountTV(tabs[0].getAttribute('data-sym')); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { first(); io.disconnect(); } }, { rootMargin: '400px' });
      io.observe($('tv'));
    } else first();
  }

  /* ---------- boot ---------- */
  function init() {
    ['markets', 'global', 'fng'].forEach(function (k) { var c = readCache(k); if (c) { S[k] = c.data; S.ts[k] = c.ts; } });
    if (S.markets) { try { render(); setText('status-text', 'Refreshing…'); $('notice').classList.remove('show'); } catch (e) { /* ignore */ } }
    initSort();
    initTV();
    load();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && Date.now() - (S.ts.markets || 0) > REFRESH_MS) load();
    });
    // Chart.js loads from a CDN with defer; draw charts once it is there.
    if (!window.Chart) window.addEventListener('load', function () { if (S.hist) renderCharts(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
