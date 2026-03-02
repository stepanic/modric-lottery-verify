/**
 * Cloudflare Pages Function — Solana RPC proxy
 *
 * POST /rpc → proxies to Solana mainnet RPC with endpoint rotation on 429/403/401.
 * Bypasses browser CORS restrictions.
 */

const RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://solana.publicnode.com",
];

function rpcLabel(url) {
    try { return new URL(url).hostname; } catch { return url; }
}

export async function onRequestPost(context) {
    const body = await context.request.text();
    const maxAttempts = RPC_ENDPOINTS.length * 2;

    let lastErr;
    let idx = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const endpoint = RPC_ENDPOINTS[idx % RPC_ENDPOINTS.length];

        try {
            const resp = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "modric-verify/2.0",
                },
                body,
            });

            // If retryable status, rotate and retry
            if ([429, 403, 401].includes(resp.status) && attempt < maxAttempts - 1) {
                idx++;
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                continue;
            }

            // Forward the response with CORS headers
            const data = await resp.text();
            return new Response(data, {
                status: resp.status,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Expose-Headers": "X-RPC-Endpoint",
                    "X-RPC-Endpoint": rpcLabel(endpoint),
                },
            });
        } catch (err) {
            lastErr = err;
            idx++;
            if (attempt < maxAttempts - 1) {
                await new Promise(r => setTimeout(r, 500));
                continue;
            }
        }
    }

    return new Response(JSON.stringify({ error: lastErr?.message || "All RPC endpoints failed" }), {
        status: 502,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
    });
}

// Handle CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
