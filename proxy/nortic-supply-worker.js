// Cloudflare Worker. Reads the ticket supply from Nortic and serves it with the CORS header
// Nortic omits, which is the only reason biljetter/index.html cannot simply call Nortic itself.
//
// It answers with the same JSON shape as the ticket-data snapshot, so the page parses one format
// whichever source it ends up reading. Deploy by pasting this into the Cloudflare dashboard's
// Worker editor; there is nothing to build and no dependencies.

const EVENT_ID = 83424;

// Nortic returns counts but no dates, so the run is listed here. Keep in step with SHOWS in
// scripts/fetch-ticket-supply.mjs, which builds the fallback snapshot from the same endpoint.
const SHOWS = [
    { id: 348130, date: '2026-09-19', time: '19:00' },
    { id: 348131, date: '2026-09-20', time: '16:00' },
];

// The figures are public either way, so this list is about not letting other sites spend the
// Worker's request budget rather than about keeping anything secret. localhost is for previewing.
const ALLOWED_ORIGINS = ['https://gangbangbrudar.se', 'http://localhost:8765'];

function corsHeaders(request) {
    const origin = request.headers.get('Origin');

    return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        Vary: 'Origin',
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
    };
}

const fail = (message, headers, status = 502) =>
    new Response(JSON.stringify({ error: message }), { status, headers });

export default {
    async fetch(request) {
        const headers = corsHeaders(request);

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
            });
        }
        if (request.method !== 'GET') {
            return fail('Method not allowed', headers, 405);
        }

        // The show ids come from the constant above rather than from the query string, so this
        // cannot be turned into an open proxy for arbitrary URLs.
        const showIds = SHOWS.map((show) => show.id).join(',');

        let payload;
        try {
            const upstream = await fetch(`https://nortic.se/dagny/ajax/event/supply?showIds=${showIds}`, {
                headers: { Accept: 'application/json' },
                cf: { cacheTtl: 0, cacheEverything: false },
            });
            if (!upstream.ok) {
                return fail(`Nortic svarade ${upstream.status}`, headers);
            }
            payload = await upstream.json();
        } catch {
            return fail('Nortic kunde inte nås', headers);
        }

        const shows = [];
        for (const show of SHOWS) {
            const entry = payload[show.id];

            // Nortic calls the field remainingPercentage but it counts what has been SOLD, so
            // everything here is derived from the two raw counts and that field is never passed on.
            if (!entry || !Number.isInteger(entry.totalAmount) || !Number.isInteger(entry.remaining)) {
                return fail(`Oväntat svar för föreställning ${show.id}`, headers);
            }
            if (entry.totalAmount <= 0 || entry.remaining < 0 || entry.remaining > entry.totalAmount) {
                return fail(`Orimliga siffror för föreställning ${show.id}`, headers);
            }

            shows.push({
                ...show,
                released: entry.totalAmount,
                sold: entry.totalAmount - entry.remaining,
                remaining: entry.remaining,
            });
        }

        const sum = (key) => shows.reduce((total, show) => total + show[key], 0);

        return new Response(
            JSON.stringify({
                checkedAt: new Date().toISOString(),
                eventUrl: `https://nortic.se/ticket/event/${EVENT_ID}`,
                shows,
                totals: { released: sum('released'), sold: sum('sold'), remaining: sum('remaining') },
            }),
            { headers },
        );
    },
};
