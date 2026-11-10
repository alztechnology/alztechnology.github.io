#!/usr/bin/env python3
"""Build data/altseason.json for the Altseason tracker (/altseason/).

Uses CoinGecko's free public API only (no key):
  /coins/markets              -> top coins by market cap
  /coins/{id}/market_chart    -> 180 days of daily price + volume per coin

Writes daily closes, a rolling Altcoin Season Index history (90d and 30d),
ETH/BTC history and alt-vs-BTC volume history. Run by
.github/workflows/altseason-data.yml once a day. Standard library only.
"""
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone

API = 'https://api.coingecko.com/api/v3'
TOP_N = 50            # eligible alts in the index
HISTORY_DAYS = 180    # needed for a 90-day rolling index over the last 90 days
KEEP_CLOSES = 120     # daily closes kept per coin for live 7/30/90d anchors
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'altseason.json')

# Stablecoins, wrapped/staked/bridged tokens and tokenised funds/commodities.
# Keep in sync with EXCLUDE_IDS in js/altseason.js.
EXCLUDE_IDS = {
    'tether', 'usd-coin', 'dai', 'ethena-usde', 'first-digital-usd', 'usds', 'usd1-wlfi', 'paypal-usd',
    'global-dollar', 'ripple-usd', 'falcon-finance', 'united-stables', 'usdd', 'bfusd', 'usdgo', 'open-usd',
    'gho', 'usual-usd', 'true-usd', 'frax', 'tusd', 'binance-usd', 'paxos-standard', 'gemini-dollar',
    'stasis-eurs', 'euro-coin', 'susds', 'ethena-staked-usde', 'sky-dollar', 'resolv-usr', 'agora-dollar',
    'wrapped-bitcoin', 'weth', 'staked-ether', 'wrapped-steth', 'wrapped-beacon-eth', 'wrapped-eeth',
    'coinbase-wrapped-btc', 'binance-peg-weth', 'rocket-pool-eth', 'mantle-staked-ether', 'lombard-staked-btc',
    'kelp-dao-restaked-eth', 'renzo-restaked-eth', 'solv-btc', 'jito-staked-sol', 'msol', 'binance-staked-sol',
    'bitget-staked-eth', 'coinbase-wrapped-staked-eth', 'wrapped-solana', 'tbtc', 'wrapped-hype',
    'tether-gold', 'pax-gold', 'figure-heloc', 'ondo-us-dollar-yield', 'hashnote-usyc',
    'spiko-amundi-overnight-swap-fund-eur', 'blackrock-usd-institutional-digital-liquidity-fund',
    'superstate-short-duration-us-government-securities-fund-ustb', 'janus-henderson-anemoy-aaa-clo-fund',
    'ousg', 'usdtb', 'usdx-money-usdx', 'bitway',
}
NAME_FLAGS = ('wrapped', 'bridged', 'staked', 'restaked', ' usd', 'usd ', 'dollar', ' fund', 'treasury', ' gold')


def is_excluded(c):
    cid, sym, name = c.get('id', ''), (c.get('symbol') or '').lower(), (c.get('name') or '').lower()
    if cid == 'bitcoin':
        return False
    if cid in EXCLUDE_IDS:
        return True
    if 'usd' in sym or any(f in ' ' + name + ' ' for f in NAME_FLAGS):
        return True
    p, c7, c30 = c.get('current_price'), c.get('price_change_percentage_7d_in_currency'), c.get('price_change_percentage_30d_in_currency')
    if p and 0.97 <= p <= 1.03 and c30 is not None and abs(c30) < 1.5 and (c7 is None or abs(c7) < 1):
        return True   # behaves like a dollar peg
    return False


def get(path, tries=6):
    url = API + path
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'accept': 'application/json', 'user-agent': 'alz-altseason/1.0'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            wait = 65 if e.code == 429 else 10 * (i + 1)
            print(f'  HTTP {e.code} on {path}, retry in {wait}s', file=sys.stderr)
            time.sleep(wait)
        except Exception as e:  # network blip
            print(f'  {e} on {path}, retry', file=sys.stderr)
            time.sleep(10 * (i + 1))
    raise RuntimeError('failed: ' + path)


def daily(series):
    """[[ms, v], ...] -> {YYYY-MM-DD: last value of that UTC day}"""
    out = {}
    for ms, v in series:
        if v is None:
            continue
        out[datetime.fromtimestamp(ms / 1000, timezone.utc).strftime('%Y-%m-%d')] = v
    return out


def sig(v, n=6):
    return None if v is None else float(f'{v:.{n}g}')


def main():
    markets = get('/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1'
                  '&sparkline=false&price_change_percentage=7d,30d')
    btc = next(c for c in markets if c['id'] == 'bitcoin')
    alts = [c for c in markets if c['id'] != 'bitcoin' and not is_excluded(c)][:TOP_N]
    universe = [btc] + alts
    print(f'{len(alts)} eligible alts', file=sys.stderr)

    px, vol = {}, {}
    for i, c in enumerate(universe):
        d = get(f"/coins/{c['id']}/market_chart?vs_currency=usd&days={HISTORY_DAYS}&interval=daily")
        px[c['id']] = daily(d.get('prices', []))
        vol[c['id']] = daily(d.get('total_volumes', []))
        print(f'  [{i + 1}/{len(universe)}] {c["id"]}: {len(px[c["id"]])} days', file=sys.stderr)
        time.sleep(2.5)

    dates = sorted(px['bitcoin'].keys())
    bp = px['bitcoin']

    def index_on(k, lb):
        if k - lb < 0:
            return None
        t, t0 = dates[k], dates[k - lb]
        if t not in bp or t0 not in bp:
            return None
        b = bp[t] / bp[t0]
        n = beat = 0
        for c in alts:
            p = px[c['id']]
            if t in p and t0 in p and p[t0] > 0:
                n += 1
                beat += p[t] / p[t0] > b
        return None if n < 10 else round(beat / n * 100, 1)

    hist = []
    for k in range(max(0, len(dates) - 91), len(dates)):
        t = dates[k]
        ev = vol['ethereum'].get(t) if 'ethereum' in vol else None
        bv = vol['bitcoin'].get(t)
        av = sum(vol[c['id']].get(t, 0) or 0 for c in alts)
        eth = px.get('ethereum', {}).get(t)
        hist.append({
            'd': t,
            'i90': index_on(k, 90), 'i30': index_on(k, 30), 'i7': index_on(k, 7),
            'ethbtc': sig(eth / bp[t]) if eth and t in bp else None,
            'btcVol': round(bv) if bv else None, 'altVol': round(av) if av else None,
            'ethVol': round(ev) if ev else None,
        })

    keep = dates[-KEEP_CLOSES:]
    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'source': 'CoinGecko public API (coins/markets, coins/{id}/market_chart)',
        'method': f'Top {TOP_N} coins by market cap excluding Bitcoin, stablecoins, wrapped/staked tokens and tokenised funds/commodities. '
                  'Index = share of them that beat BTC over the lookback, x100. History uses today\'s constituents (survivorship bias).',
        'closes_start': keep[0], 'closes_dates': len(keep),
        'coins': [{
            'id': c['id'], 'symbol': c['symbol'].upper(), 'name': c['name'], 'image': c.get('image'),
            'rank': c.get('market_cap_rank'),
            'closes': [sig(px[c['id']].get(t)) for t in keep],
        } for c in universe],
        'history': hist,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    last = hist[-1]
    print(f"wrote {OUT}: i90={last['i90']} i30={last['i30']} i7={last['i7']} ({len(hist)} days)", file=sys.stderr)


if __name__ == '__main__':
    main()
