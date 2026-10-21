// Generated from app/passport-comparison.ts. Checked by tests/observatory.mjs.
const finite = (v) => typeof v === 'number' && Number.isFinite(v) ? v : null;
function decimal(raw, places) {
    const negative = raw < 0n;
    const digits = (negative ? -raw : raw).toString().padStart(places + 1, '0');
    const value = places ? (digits.slice(0, -places) + '.' + digits.slice(-places)).replace(/\.?0+$/, '') : digits;
    return (negative ? '-' : '') + value;
}
export function compareSnapshots(before, after) {
    if (before.address !== after.address || before.network !== after.network)
        throw new Error('Choose two passports for the same token and network.');
    const start = Date.parse(before.fetchedAt), end = Date.parse(after.fetchedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        throw new Error('Choose two snapshots collected at different times.');
    const rows = [], warnings = [];
    const a = before.chain, b = after.chain, ma = before.market, mb = after.market;
    const samePair = !!ma?.pairAddress && ma.pairAddress === mb?.pairAddress;
    const chainOrder = !a || !b || finite(a.slot) === null || finite(b.slot) === null || b.slot >= a.slot;
    function row(key, label, source, unit, oldValue, newValue, comparable = true, note = '') {
        const item = { key, label, source, unit, before: oldValue, after: newValue, status: oldValue === null || newValue === null ? 'unavailable' : !comparable ? 'not-comparable' : oldValue === newValue ? 'unchanged' : 'changed', delta: null, percent: null, note };
        if (['changed', 'unchanged'].includes(item.status) && typeof oldValue === 'number' && typeof newValue === 'number') {
            item.delta = finite(newValue - oldValue);
            item.percent = oldValue === 0 ? null : finite((newValue - oldValue) / Math.abs(oldValue) * 100);
        }
        rows.push(item);
        return item;
    }
    if (!chainOrder)
        warnings.push('The later snapshot has an earlier Solana slot. On-chain differences are not comparable until you collect a newer confirmed snapshot.');
    const decimalsMatch = a && b && Number.isInteger(a.decimals) && a.decimals >= 0 && a.decimals <= 30 && a.decimals === b.decimals;
    const exactSupply = decimalsMatch && /^\d{1,50}$/.test(a.supplyRaw) && /^\d{1,50}$/.test(b.supplyRaw);
    if (a && b && !exactSupply)
        warnings.push('Supply precision is missing or token decimals differ between snapshots. No supply delta is calculated.');
    const supply = row('supply', 'Token supply', 'S1', 'tokens', a?.supply ?? null, b?.supply ?? null, !!exactSupply && chainOrder, 'Exact token units. Supply changes alone do not establish their cause.');
    if (exactSupply && chainOrder && ['changed', 'unchanged'].includes(supply.status)) {
        const oldRaw = BigInt(a.supplyRaw), newRaw = BigInt(b.supplyRaw);
        supply.delta = decimal(newRaw - oldRaw, a.decimals);
        supply.status = newRaw === oldRaw ? 'unchanged' : 'changed';
        supply.percent = oldRaw === 0n ? null : finite(Number(newRaw - oldRaw) / Number(oldRaw) * 100);
    }
    row('mintAuthority', 'Mint authority', 'S1', 'address', a ? a.mintAuthority ?? 'None reported' : null, b ? b.mintAuthority ?? 'None reported' : null, chainOrder);
    row('freezeAuthority', 'Freeze authority', 'S1', 'address', a ? a.freezeAuthority ?? 'None reported' : null, b ? b.freezeAuthority ?? 'None reported' : null, chainOrder);
    row('program', 'Token program', 'S1', 'address', a?.program ?? null, b?.program ?? null, chainOrder);
    const extensions = (c) => c && Array.isArray(c.extensions) ? [...new Set(c.extensions)].sort().join(', ') || 'None reported' : null;
    row('extensions', 'Extension types', 'S1', 'text', extensions(a), extensions(b), chainOrder, 'Compares extension names only. Settings and permissions within each extension are not checked.');
    if (ma && mb && !samePair)
        warnings.push('The selected market pool changed. Market values are shown side by side, but their differences and percentages are withheld.');
    for (const [key, label] of [['priceUsd', 'Indexed price'], ['liquidityUsd', 'Pair liquidity'], ['volume24hUsd', 'Rolling 24h pair volume'], ['marketCapUsd', 'Reported market cap'], ['fdvUsd', 'Reported FDV']]) {
        row(key, label, 'S2', 'usd', finite(ma?.[key]), finite(mb?.[key]), samePair, key === 'volume24hUsd' ? 'Each value covers its own trailing 24 hours; this is not volume traded between snapshots.' : 'Market figures come from the selected indexed pool.');
    }
    if (!a || !b)
        warnings.push('Solana account data is missing from at least one snapshot. Unknown permissions are not treated as removed permissions.');
    if (!ma || !mb)
        warnings.push('Market data is missing from at least one snapshot. Missing values are not treated as zero.');
    warnings.push('Two snapshots show observed differences at collection time, not every event between them. No change does not establish token safety.');
    return { address: before.address, network: before.network, elapsedSeconds: (end - start) / 1000, sameMarketPair: samePair, rows, counts: { changed: rows.filter(r => r.status === 'changed').length, unchanged: rows.filter(r => r.status === 'unchanged').length, unknown: rows.filter(r => ['unavailable', 'not-comparable'].includes(r.status)).length }, warnings };
}
