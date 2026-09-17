#!/usr/bin/env node
// Fetches the current ticket supply for the Gangbangbrudar run from Nortic and writes
// the snapshot that biljetter/index.html renders. Driven by .github/workflows/ticket-supply.yml.
//
// Usage: node scripts/fetch-ticket-supply.mjs <output-directory>

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const EVENT_ID = 83424;
const EVENT_URL = `https://nortic.se/ticket/event/${EVENT_ID}`;
const SUPPLY_URL = 'https://nortic.se/dagny/ajax/event/supply';

// Nortic's supply endpoint returns numbers but no dates, so the run is listed here.
// A show's id is the data-showid attribute on its row in the event page's show listing.
const SHOWS = [
    { id: 348130, date: '2026-09-19', time: '19:00' },
    { id: 348131, date: '2026-09-20', time: '16:00' },
];

// Once the run is over there is nothing left to poll, and an unattended schedule that
// keeps committing forever is worse than one that stops on its own.
const STOP_AFTER = new Date('2026-09-22T00:00:00+02:00');

const outDir = process.argv[2];
if (!outDir) {
    console.error('Missing output directory. Usage: node scripts/fetch-ticket-supply.mjs <dir>');
    process.exit(2);
}

if (new Date() > STOP_AFTER) {
    console.log(`The run ended on ${STOP_AFTER.toISOString()}; nothing to poll.`);
    process.exit(0);
}

const response = await fetch(`${SUPPLY_URL}?showIds=${SHOWS.map((s) => s.id).join(',')}`, {
    headers: { Accept: 'application/json' },
});
if (!response.ok) {
    throw new Error(`Nortic answered ${response.status} ${response.statusText}`);
}

const payload = await response.json();

// Nortic calls the field remainingPercentage, but it counts what has been SOLD -- their own
// areThereTicketsLeft() treats 100 as sold out. Deriving sold from the two raw counts sidesteps
// the misnomer entirely, so the page never inherits it.
const shows = SHOWS.map((show) => {
    const entry = payload[show.id];
    if (!entry) {
        throw new Error(`Nortic returned no supply for show ${show.id}`);
    }

    const released = entry.totalAmount;
    const remaining = entry.remaining;
    if (!Number.isInteger(released) || !Number.isInteger(remaining)) {
        throw new Error(`Show ${show.id} returned non-integer counts: ${JSON.stringify(entry)}`);
    }
    if (released <= 0 || remaining < 0 || remaining > released) {
        throw new Error(`Show ${show.id} returned counts outside the sane range: ${JSON.stringify(entry)}`);
    }

    return { ...show, released, sold: released - remaining, remaining };
});

const sum = (key) => shows.reduce((total, show) => total + show[key], 0);
const totals = { released: sum('released'), sold: sum('sold'), remaining: sum('remaining') };

const snapshotPath = join(outDir, 'supply.json');
const historyPath = join(outDir, 'history.json');
const previous = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, 'utf8')) : null;

// checkedAt moves every run so the page can tell "nothing sold" apart from "the job died";
// changedAt only moves when the counts actually do.
const now = new Date().toISOString();
const countsOf = (snapshot) => JSON.stringify(snapshot?.shows?.map((s) => [s.id, s.released, s.remaining]));
const changed = countsOf(previous) !== countsOf({ shows });

mkdirSync(outDir, { recursive: true });
writeFileSync(
    snapshotPath,
    `${JSON.stringify(
        {
            checkedAt: now,
            changedAt: changed ? now : (previous?.changedAt ?? now),
            eventUrl: EVENT_URL,
            shows,
            totals,
        },
        null,
        2,
    )}\n`,
);

if (changed) {
    const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')) : [];
    history.push({ at: now, shows: shows.map((s) => ({ id: s.id, sold: s.sold, remaining: s.remaining })) });
    writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`);
}

console.log(`${changed ? 'Changed' : 'Unchanged'}: ${totals.sold}/${totals.released} sold, ${totals.remaining} left.`);
