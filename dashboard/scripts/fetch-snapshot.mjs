import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '../public/data/snapshot.json');

// --- Helper Functions (Replicated from src/services/api.js) ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url) => {
    let lastError;
    for (let i = 0; i < 3; i++) {
        try {
            console.log(`Fetching: ${url} (Attempt ${i + 1})`);
            const response = await fetch(url);
            if (response.ok) return await response.json();
            lastError = new Error(`Status: ${response.status}`);
        } catch (err) {
            lastError = err;
        }
        await sleep(1000);
    }
    throw lastError;
};

const fetchTextWithRetry = async (url) => {
    let lastError;
    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return await response.text();
            lastError = new Error(`Status: ${response.status}`);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
};

const fetchEOData = async () => {
    try {
        console.log('Fetching EO data from LiveFPL...');
        const html = await fetchTextWithRetry('https://plan.livefpl.net/EO');
        const eoData = {};

        const eoMatch = html.match(/var\s+eo_t\s*=\s*({.*?});/);
        const overallMatch = html.match(/var\s+eo_o\s*=\s*({.*?});/);

        if (eoMatch) {
            try {
                const eoMap = JSON.parse(eoMatch[1]);
                Object.keys(eoMap).forEach(id => {
                    if (!eoData[id]) eoData[id] = {};
                    eoData[id].eo10k = (parseFloat(eoMap[id]) * 100).toFixed(1);
                });
            } catch (e) { }
        }

        if (overallMatch) {
            try {
                const overallMap = JSON.parse(overallMatch[1]);
                Object.keys(overallMap).forEach(id => {
                    const val = parseFloat(overallMap[id]);
                    if (val > 0) {
                        if (!eoData[id]) eoData[id] = {};
                        eoData[id].eoOverall = (val * 100).toFixed(1);
                    }
                });
            } catch (e) { }
        }

        const rows = html.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
        rows.forEach(row => {
            const idMatch = row.match(/player\?id=(\d+)/);
            if (idMatch) {
                const id = idMatch[1];
                if (!eoData[id]) eoData[id] = {};
                const percentages = row.match(/>(\d+\.?\d*)%<\/td>/g);
                if (percentages && percentages.length >= 4) {
                    if (!eoData[id].cap10k || eoData[id].cap10k === '0.0') {
                        eoData[id].cap10k = parseFloat(percentages[1].replace(/[>%<]/g, '')).toFixed(1);
                    }
                }
            }
        });
        return eoData;
    } catch (err) {
        console.error('EO fetch failed:', err.message);
        return {};
    }
};

// --- Main Runner ---
const run = async () => {
    try {
        console.log('--- STARTING SNAPSHOT FETCH ---');

        const bootstrapData = await fetchWithRetry('https://fantasy.premierleague.com/api/bootstrap-static/');
        const fixturesData = await fetchWithRetry('https://fantasy.premierleague.com/api/fixtures/');

        const currentEvent = [...bootstrapData.events].reverse().find(e => e.is_current || e.finished);
        const lastGameweek = currentEvent ? currentEvent.id : 0;
        const targetGameweeks = [];
        for (let i = lastGameweek; i > Math.max(0, lastGameweek - 6); i--) targetGameweeks.push(i);
        targetGameweeks.reverse();

        console.log(`Scraping GWs: ${targetGameweeks.join(', ')}`);

        // Parallel fetch live data
        const liveDataResults = await Promise.all(targetGameweeks.map(gw =>
            fetchWithRetry(`https://fantasy.premierleague.com/api/event/${gw}/live/`)
                .then(data => ({ gameweek: gw, data }))
                .catch(() => null)
        ));

        const teamXGMap = {};
        liveDataResults.forEach(result => {
            if (!result || !result.data.elements) return;
            result.data.elements.forEach(element => {
                const player = bootstrapData.elements.find(p => p.id === element.id);
                if (!player) return;
                const teamId = player.team;
                if (!teamXGMap[teamId]) teamXGMap[teamId] = {};
                if (!teamXGMap[teamId][result.gameweek]) teamXGMap[teamId][result.gameweek] = 0;
                teamXGMap[teamId][result.gameweek] += parseFloat(element.stats.expected_goals || 0);
            });
        });

        // 1. Process Teams
        const teams = bootstrapData.teams.map(team => {
            const teamFixtures = targetGameweeks.map(gw => {
                const fixturesInGw = fixturesData.filter(f => f.finished && f.event === gw && (f.team_h === team.id || f.team_a === team.id));
                if (fixturesInGw.length === 0) return { gameweek: gw, opponent: '-', xg: "0.00", gc: "0.00", isBlank: true };

                let combinedXg = 0, combinedGc = 0, opponents = [];
                fixturesInGw.forEach(f => {
                    const isHome = f.team_h === team.id;
                    const oppId = isHome ? f.team_a : f.team_h;
                    opponents.push(bootstrapData.teams.find(t => t.id === oppId).short_name);
                    if (teamXGMap[team.id]?.[gw]) combinedXg += teamXGMap[team.id][gw] / fixturesInGw.length;
                    if (teamXGMap[oppId]?.[gw]) {
                        const oppGames = fixturesData.filter(x => x.finished && x.event === gw && (x.team_h === oppId || x.team_a === oppId)).length;
                        combinedGc += teamXGMap[oppId][gw] / oppGames;
                    }
                });

                return { gameweek: gw, opponent: opponents.join('/'), isHome: fixturesInGw[0].team_h === team.id, xg: combinedXg.toFixed(2), gc: combinedGc.toFixed(2), isBlank: false };
            });

            const totalXG = teamFixtures.reduce((sum, f) => sum + parseFloat(f.xg || 0), 0);
            const totalGC = teamFixtures.reduce((sum, f) => sum + parseFloat(f.gc || 0), 0);
            const played = teamFixtures.filter(f => !f.isBlank).length;
            return {
                id: team.id, code: team.code, name: team.name, shortName: team.short_name,
                fixtures: teamFixtures, totalXG, totalGC,
                avgXG: played > 0 ? totalXG / played : 0,
                avgGC: played > 0 ? totalGC / played : 0
            };
        });

        // 2. Process Players (Top 300)
        const topPlayersRaw = bootstrapData.elements.sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).slice(0, 300);
        const players = [];
        for (let i = 0; i < topPlayersRaw.length; i += 50) {
            const chunk = topPlayersRaw.slice(i, i + 50);
            await sleep(500);
            const results = await Promise.all(chunk.map(async p => {
                const history = await fetchWithRetry(`https://fantasy.premierleague.com/api/element-summary/${p.id}/`);
                const last6 = targetGameweeks.map(gw => {
                    const matches = history.history.filter(m => m.round === gw);
                    if (matches.length === 0) return { gameweek: gw, opponent: '-', xGI: 0, xG: 0, xA: 0, goals: 0, assists: 0, minutes: 0, isBlank: true };
                    const agg = matches.reduce((acc, m) => {
                        acc.xGI += parseFloat(m.expected_goal_involvements || 0);
                        acc.xG += parseFloat(m.expected_goals || 0);
                        acc.xA += parseFloat(m.expected_assists || 0);
                        acc.goals += m.goals_scored; acc.assists += m.assists; acc.minutes += m.minutes;
                        return acc;
                    }, { xGI: 0, xG: 0, xA: 0, goals: 0, assists: 0, minutes: 0 });
                    return { ...agg, gameweek: gw, wasHome: matches[0].was_home, isBlank: false };
                });

                const mins = last6.reduce((s, m) => s + m.minutes, 0);
                const xGI = last6.reduce((s, m) => s + m.xGI, 0);
                const seasonDef = history.history.reduce((s, m) => s + parseFloat(m.defensive_contribution || 0), 0);
                const team = bootstrapData.teams.find(t => t.id === p.team);

                return {
                    id: p.id, name: p.web_name, team: team.short_name, teamId: p.team, teamCode: team.code,
                    position: ['GK', 'DEF', 'MID', 'FWD'][p.element_type - 1],
                    price: p.now_cost / 10, yellowCards: p.yellow_cards || 0, selectedBy: parseFloat(p.selected_by_percent || 0),
                    xG: last6.reduce((s, m) => s + m.xG, 0), xA: last6.reduce((s, m) => s + m.xA, 0), xGI,
                    xGIPer90: mins > 0 ? (xGI / mins) * 90 : 0,
                    dcPer90: (p.minutes || 0) > 0 ? (seasonDef / p.minutes) * 90 : 0,
                    last6Matches: last6, totalMinutes: mins
                };
            }));
            players.push(...results);
        }

        // 3. EO Data
        const eoDataMap = await fetchEOData();
        const finalPlayers = players.map(p => ({
            ...p,
            eo10k: eoDataMap[p.id]?.eo10k || '0.0',
            eoOverall: eoDataMap[p.id]?.eoOverall || '0.0',
            cap10k: eoDataMap[p.id]?.cap10k || '0.0'
        }));

        // Final Payload
        const payload = {
            updatedAt: new Date().toISOString(),
            teams,
            players: finalPlayers
        };

        const dir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2));
        console.log(`--- SUCCESS: Saved to ${OUTPUT_PATH} ---`);

    } catch (err) {
        console.error('--- FATAL ERROR ---');
        console.error(err);
        process.exit(1);
    }
};

run();
