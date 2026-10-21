import { Connection, PublicKey } from '@solana/web3.js';
import { resolveHandle, reverseResolve, SolHandleError } from 'solhandle-sdk';
export class WalletIdentityError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
export function parseWalletQuery(input) {
    if (typeof input !== 'string')
        throw new WalletIdentityError('Enter a Solana wallet address or @handle.');
    const value = input.trim();
    if (value.startsWith('@')) {
        if (!/^@[a-z0-9]{1,20}$/i.test(value))
            throw new WalletIdentityError('SolHandles use @ followed by 1–20 letters or numbers.');
        return { kind: 'handle', value: value.toLowerCase() };
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value))
        throw new WalletIdentityError('Enter a complete Solana wallet address or @handle.');
    try {
        new PublicKey(value);
    }
    catch {
        throw new WalletIdentityError('Enter a valid Solana wallet address.');
    }
    return { kind: 'address', value };
}
// The SDK uses the site's existing bounded RPC transport. Credentials, retries,
// fallback endpoints and error redaction stay server-side in that transport.
function connectionFor(readRpc) {
    const deadline = Date.now() + 7000;
    return new Connection('https://api.mainnet-beta.solana.com', {
        commitment: 'confirmed', disableRetryOnRateLimit: true,
        fetch: async (_url, init) => {
            const payload = JSON.parse(String(init?.body));
            if (!['getAccountInfo', 'getMultipleAccounts'].includes(payload.method))
                throw new Error('Unsupported identity read.');
            const remaining = deadline - Date.now();
            if (remaining <= 0)
                throw new Error('Identity lookup timed out.');
            let timer;
            try {
                const result = await Promise.race([readRpc(payload.method, payload.params), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Identity lookup timed out.')), remaining); })]);
                return Response.json({ jsonrpc: '2.0', id: payload.id, result });
            }
            finally {
                if (timer)
                    clearTimeout(timer);
            }
        }
    });
}
export async function resolveWalletQuery(input, readRpc, reverse = true) {
    const query = parseWalletQuery(input), connection = connectionFor(readRpc);
    const identity = (status, handle = null, assetAddress = null) => ({
        provider: 'SolHandle', network: 'mainnet-beta', status, lookup: query.kind === 'handle' ? 'forward' : 'primary', handle, assetAddress, checkedAt: new Date().toISOString()
    });
    if (query.kind === 'handle') {
        try {
            // Checks program, deterministic record/asset, protocol version, official
            // Metaplex collection and current asset owner on each request. No cache.
            const resolved = await resolveHandle(query.value, { connection });
            if (!resolved)
                throw new WalletIdentityError('This SolHandle was not found on Solana mainnet. Check the spelling or use a wallet address.', 404);
            return { address: resolved.addressString, identity: identity('resolved', resolved.handle, resolved.assetAddress) };
        }
        catch (error) {
            if (error instanceof WalletIdentityError)
                throw error;
            if (error instanceof SolHandleError && error.code !== 'RPC_ERROR')
                throw new WalletIdentityError('This SolHandle could not be verified against the official onchain records. No wallet was selected.', 422);
            throw new WalletIdentityError('SolHandle ownership could not be checked right now. Retry or enter a known wallet address.', 503);
        }
    }
    if (!reverse)
        return { address: query.value, identity: null };
    try {
        // A stale primary record must never label a wallet after the NFT transfers.
        const primary = await reverseResolve(query.value, { connection });
        return { address: query.value, identity: primary ? identity('resolved', primary.handle, primary.asset.toBase58()) : identity('not-set') };
    }
    catch {
        // Optional identity enrichment never blocks an explicit-address lookup.
        return { address: query.value, identity: identity('unavailable') };
    }
}
