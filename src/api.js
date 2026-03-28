import { HL_API_URL, BRENT, CL } from './config';

async function postInfo(body) {
  const res = await fetch(HL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid API error: ${res.status}`);
  return res.json();
}

function topOfBook(book) {
  const bids = book?.levels?.[0] ?? [];
  const asks = book?.levels?.[1] ?? [];
  const bid = bids.length ? Number(bids[0].px) : null;
  const ask = asks.length ? Number(asks[0].px) : null;
  const mid = bid != null && ask != null ? (bid + ask) / 2 : null;
  return { bid, ask, mid, time: book?.time ?? Date.now() };
}

export async function fetchSpreadSnapshot() {
  const [mids, brentBook, clBook] = await Promise.all([
    postInfo({ type: 'allMids', dex: 'xyz' }),
    postInfo({ type: 'l2Book', coin: BRENT, nSigFigs: 5 }),
    postInfo({ type: 'l2Book', coin: CL, nSigFigs: 5 }),
  ]);

  const brent = topOfBook(brentBook);
  const cl = topOfBook(clBook);
  const fallbackBrentMid = Number(mids[BRENT]);
  const fallbackClMid = Number(mids[CL]);

  if (brent.mid == null && Number.isFinite(fallbackBrentMid)) brent.mid = fallbackBrentMid;
  if (cl.mid == null && Number.isFinite(fallbackClMid)) cl.mid = fallbackClMid;

  const spreadAskBid = brent.bid != null && cl.ask != null ? brent.bid - cl.ask : null;
  const spreadBidAsk = brent.ask != null && cl.bid != null ? brent.ask - cl.bid : null;
  const spreadMidMid = brent.mid != null && cl.mid != null ? brent.mid - cl.mid : null;

  return {
    ts: Date.now(),
    brent,
    cl,
    spreads: {
      shortBrentLongCl: spreadAskBid,
      longBrentShortCl: spreadBidAsk,
      midMid: spreadMidMid,
    },
  };
}
