/**
 * Cloudflare Pages Function — Serve snapshot data
 *
 * GET /snapshot/1 → modric_top_holders_oct_19.json
 * GET /snapshot/2 → modric_top_holders_nov_01.json
 * GET /snapshot/3 → modric_top_holders_jan_14_2026.json
 *
 * Reads from the static /data/ directory deployed alongside the frontend.
 */

const SNAPSHOTS = {
    "1": "/data/modric_top_holders_oct_19.json",
    "2": "/data/modric_top_holders_nov_01.json",
    "3": "/data/modric_top_holders_jan_14_2026.json",
};

export async function onRequestGet(context) {
    const drawId = context.params.id;
    const path = SNAPSHOTS[drawId];

    if (!path) {
        return new Response(JSON.stringify({ error: "Unknown draw ID. Use 1, 2, or 3." }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }

    // Fetch the static asset from the same Pages deployment
    const url = new URL(path, context.request.url);
    const resp = await context.env.ASSETS.fetch(url);

    if (!resp.ok) {
        return new Response(JSON.stringify({ error: "Snapshot file not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }

    return new Response(resp.body, {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
