// List of CORS proxies to try in order
const PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest='
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithFallback = async (url) => {
    // If running in Node/Server-side, fetch directly
    if (typeof window === 'undefined') {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Direct fetch failed: ${response.status}`);
        }
        return await response.json();
    }

    let lastError;
    for (const proxy of PROXIES) {
        try {
            const proxyUrl = proxy + encodeURIComponent(url);
            const response = await fetch(proxyUrl);
            if (response.ok) {
                return await response.json();
            }
            lastError = new Error(`Proxy ${proxy} failed with status: ${response.status}`);
            console.warn(lastError.message);
        } catch (err) {
            lastError = err;
            console.warn(`Proxy ${proxy} error:`, err);
        }
    }
    throw lastError || new Error('All proxies failed');
};

const fetchTextWithFallback = async (url) => {
    // If running in Node/Server-side, fetch directly
    if (typeof window === 'undefined') {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Direct fetch failed: ${response.status}`);
        }
        return await response.text();
    }

    let lastError;
    for (const proxy of PROXIES) {
        try {
            const proxyUrl = proxy + encodeURIComponent(url);
            const response = await fetch(proxyUrl);
            if (response.ok) {
                return await response.text();
            }
            lastError = new Error(`Proxy ${proxy} failed with status: ${response.status}`);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('All text proxies failed');
};

export const fetchEOData = async () => {
    try {
        console.log('Fetching EO data from LiveFPL...');
        const html = await fetchTextWithFallback('https://plan.livefpl.net/EO');

        const eoData = {};

        // 1. Try to extract from script variables (most reliable for IDs)
        const eoMatch = html.match(/var\s+eo_t\s*=\s*({.*?});/);
        const overallMatch = html.match(/var\s+eo_o\s*=\s*({.*?});/);

        if (eoMatch) {
            try {
                const eoMap = JSON.parse(eoMatch[1]);
                Object.keys(eoMap).forEach(id => {
                    if (!eoData[id]) eoData[id] = {};
                    eoData[id].eo10k = (parseFloat(eoMap[id]) * 100).toFixed(1);
                });
            } catch (e) { console.error('Error parsing eo_t', e); }
        }

        if (overallMatch) {
            try {
                const overallMap = JSON.parse(overallMatch[1]);
                Object.keys(overallMap).forEach(id => {
                    const val = parseFloat(overallMap[id]);
                    if (val > 0) { // Only use if data is actually there
                        if (!eoData[id]) eoData[id] = {};
                        eoData[id].eoOverall = (val * 100).toFixed(1);
                    }
                });
            } catch (e) { console.error('Error parsing eo_o', e); }
        }

        // 2. Fallback: Parse the HTML table for missing Captaincy and Overall stats
        // LiveFPL table rows usually look like: <tr>...<td>Player</td>...<td>173.00%</td><td>75.51%</td>...</tr>
        // We look for rows that contain a link to player profile to get the ID
        const rows = html.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
        rows.forEach(row => {
            const idMatch = row.match(/player\?id=(\d+)/);
            if (idMatch) {
                const id = idMatch[1];
                if (!eoData[id]) eoData[id] = {};

                // Extract all percentage values from columns
                // Column indices for the EO table:
                // 0: Player, 1: Team, 2: EO (10k), 3: Cap (10k), 4: TC (10k), 5: EO (Overall)...
                const percentages = row.match(/>(\d+\.?\d*)%<\/td>/g);
                if (percentages && percentages.length >= 4) {
                    // Captaincy is typically the 2nd percentage column in the row (index 1)
                    // (EO 10k, Cap 10k, TC 10k, EO Overall...)
                    if (!eoData[id].cap10k || eoData[id].cap10k === '0.0') {
                        eoData[id].cap10k = parseFloat(percentages[1].replace(/[>%<]/g, '')).toFixed(1);
                    }

                    // Overall EO is typically the 4th percentage column (index 3)
                    if (!eoData[id].eoOverall || eoData[id].eoOverall === '0.0') {
                        const overallVal = parseFloat(percentages[3].replace(/[>%<]/g, ''));
                        if (overallVal > 0) {
                            eoData[id].eoOverall = overallVal.toFixed(1);
                        }
                    }
                }
            }
        });

        return eoData;
    } catch (err) {
        console.error('Failed to fetch EO data:', err);
        return {};
    }
};

export const fetchPremierLeagueData = async () => {
    try {
        console.log('Fetching bootstrap data...');
        const bootstrapData = await fetchWithFallback('https://fantasy.premierleague.com/api/bootstrap-static/');

        console.log('Fetching fixtures data...');
        const fixturesData = await fetchWithFallback('https://fantasy.premierleague.com/api/fixtures/');

        // Fetch Live Data for all finished/current gameweeks to get real xG
        // Find the last finished or current gameweek
        const currentEvent = [...bootstrapData.events].reverse().find(e => e.is_current || e.finished);
        const lastGameweek = currentEvent ? currentEvent.id : 0;

        console.log(`Fetching live data for gameweeks 1 to ${lastGameweek}...`);

        // Parallel fetch for all relevant gameweeks
        const liveDataPromises = [];
        for (let i = 1; i <= lastGameweek; i++) {
            liveDataPromises.push(
                fetchWithFallback(`https://fantasy.premierleague.com/api/event/${i}/live/`)
                    .then(data => ({ gameweek: i, data }))
                    .catch(err => {
                        console.error(`Failed to load GW ${i} live data`, err);
                        return null;
                    })
            );
        }

        const liveDataResults = await Promise.all(liveDataPromises);

        // Build a map of Team ID -> Gameweek -> xG
        // teamXGMap[teamId][gameweek] = xG
        const teamXGMap = {};

        liveDataResults.forEach(result => {
            if (!result || !result.data || !result.data.elements) return;

            result.data.elements.forEach(element => {
                // element.explain contains stats? No, element.stats contains stats.
                const stats = element.stats;
                const elementId = element.id;

                // We need to find which team this player belongs to
                // But live data doesn't have team_id directly in elements usually, it maps by element ID.
                // We need to look up player in bootstrapData
                const player = bootstrapData.elements.find(p => p.id === elementId);
                if (!player) return;

                const teamId = player.team;

                if (!teamXGMap[teamId]) teamXGMap[teamId] = {};
                if (!teamXGMap[teamId][result.gameweek]) teamXGMap[teamId][result.gameweek] = 0;

                // Accumulate xG
                if (stats && stats.expected_goals) {
                    teamXGMap[teamId][result.gameweek] += parseFloat(stats.expected_goals);
                }
            });
        });

        // Identify the last 6 global gameweeks that have finished or are in progress
        const targetGameweeks = [];
        for (let i = lastGameweek; i > Math.max(0, lastGameweek - 6); i--) {
            targetGameweeks.push(i);
        }
        targetGameweeks.reverse();

        // Process teams data with fixtures and real xG
        const teamsData = bootstrapData.teams.map(team => {
            const teamFixtures = targetGameweeks.map(gw => {
                const fixturesInGw = fixturesData.filter(f =>
                    f && f.finished && f.event === gw &&
                    (f.team_h === team.id || f.team_a === team.id)
                );

                if (fixturesInGw.length === 0) {
                    return {
                        gameweek: gw,
                        opponent: '-',
                        opponentId: null,
                        isHome: true,
                        xg: "0.00",
                        gc: "0.00",
                        score: '-',
                        isBlank: true
                    };
                }

                // Aggregate for DGWs
                let combinedXg = 0;
                let combinedGc = 0;
                const opponents = [];
                const scores = [];

                fixturesInGw.forEach(fixture => {
                    const isHome = fixture.team_h === team.id;
                    const opponentId = isHome ? fixture.team_a : fixture.team_h;
                    const opponent = bootstrapData.teams.find(t => t.id === opponentId);

                    if (opponent) opponents.push(opponent.short_name);

                    scores.push(isHome ?
                        `${fixture.team_h_score || 0}-${fixture.team_a_score || 0}` :
                        `${fixture.team_a_score || 0}-${fixture.team_h_score || 0}`
                    );

                    // xG = Team's accumulated xG for this specific fixture 
                    // (Actually we still only have GW totals from teamXGMap, so we split)
                    if (teamXGMap[team.id] && teamXGMap[team.id][gw]) {
                        combinedXg += teamXGMap[team.id][gw] / fixturesInGw.length;
                    }
                    if (teamXGMap[opponentId] && teamXGMap[opponentId][gw]) {
                        // For opponent GC, we need to know how many games the OPPONENT played in this GW to split their total xG correctly
                        const oppGamesInGw = fixturesData.filter(f =>
                            f.finished && f.event === gw && (f.team_h === opponentId || f.team_a === opponentId)
                        ).length;
                        combinedGc += teamXGMap[opponentId][gw] / oppGamesInGw;
                    }
                });

                return {
                    gameweek: gw,
                    opponent: opponents.join('/'),
                    opponentId: fixturesInGw[0].team_h === team.id ? fixturesInGw[0].team_a : fixturesInGw[0].team_h,
                    isHome: fixturesInGw[0].team_h === team.id, // Just pick first for icon
                    xg: combinedXg.toFixed(2),
                    gc: combinedGc.toFixed(2),
                    score: scores.join(', '),
                    isBlank: false
                };
            });

            const totalXG = teamFixtures.reduce((sum, f) => sum + parseFloat(f.xg || 0), 0);
            const totalGC = teamFixtures.reduce((sum, f) => sum + parseFloat(f.gc || 0), 0);
            const playedFixtures = teamFixtures.filter(f => !f.isBlank);
            const avgXG = playedFixtures.length > 0 ? totalXG / playedFixtures.length : 0;
            const avgGC = playedFixtures.length > 0 ? totalGC / playedFixtures.length : 0;

            return {
                id: team.id,
                code: team.code,
                name: team.name,
                shortName: team.short_name,
                fixtures: teamFixtures,
                totalXG: totalXG,
                avgXG: avgXG,
                totalGC: totalGC,
                avgGC: avgGC
            };
        });

        // Process players data - fetch top players with their match history
        const topPlayers = bootstrapData.elements
            .sort((a, b) => parseFloat(b.total_points || 0) - parseFloat(a.total_points || 0))
            .slice(0, 300);

        console.log('Fetching history for top', topPlayers.length, 'players...');

        // For player history, we'll process in chunks to be nice to the APIs
        const CHUNK_SIZE = 50;
        const validPlayers = [];

        // Split topPlayers into chunks
        for (let i = 0; i < topPlayers.length; i += CHUNK_SIZE) {
            const chunk = topPlayers.slice(i, i + CHUNK_SIZE);

            // Add a small delay between chunks to avoid rate limiting
            if (i > 0) await sleep(50);

            const chunkResults = await Promise.all(
                chunk.map(async (player) => {
                    try {
                        const historyData = await fetchWithFallback(`https://fantasy.premierleague.com/api/element-summary/${player.id}/`);

                        const team = bootstrapData.teams.find(t => t.id === player.team);
                        let position = '';
                        switch (player.element_type) {
                            case 1: position = 'GK'; break;
                            case 2: position = 'DEF'; break;
                            case 3: position = 'MID'; break;
                            case 4: position = 'FWD'; break;
                        }

                        // Get last 6 matches aligned with global gameweeks
                        const last6Matches = targetGameweeks.map(gw => {
                            const matchesInGw = historyData.history.filter(m => m.round === gw);
                            const teamFixturesInGw = fixturesData.filter(f =>
                                f && f.finished && f.event === gw &&
                                (f.team_h === player.team || f.team_a === player.team)
                            );

                            if (matchesInGw.length === 0) {
                                // Player was not in the squad. Check if team played.
                                if (teamFixturesInGw.length === 0) {
                                    return {
                                        gameweek: gw,
                                        opponent: '-',
                                        wasHome: true,
                                        xGI: 0, xG: 0, xA: 0, goals: 0, assists: 0, minutes: 0,
                                        isBlank: true
                                    };
                                } else {
                                    // Team played, player omitted from squad
                                    const opponents = teamFixturesInGw.map(f => {
                                        const oppId = f.team_h === player.team ? f.team_a : f.team_h;
                                        return bootstrapData.teams.find(t => t.id === oppId)?.short_name || 'UNK';
                                    });
                                    return {
                                        gameweek: gw,
                                        opponent: opponents.join('/'),
                                        wasHome: teamFixturesInGw[0].team_h === player.team,
                                        xGI: 0, xG: 0, xA: 0, goals: 0, assists: 0, minutes: 0,
                                        isBlank: false
                                    };
                                }
                            }

                            // Aggregate for DGWs
                            const aggregated = matchesInGw.reduce((acc, match) => {
                                const opponent = bootstrapData.teams.find(t => t.id === match.opponent_team);
                                if (opponent) acc.opponents.push(opponent.short_name);

                                acc.xGI += parseFloat(match.expected_goal_involvements || 0);
                                acc.xG += parseFloat(match.expected_goals || 0);
                                acc.xA += parseFloat(match.expected_assists || 0);
                                acc.DC += parseFloat(match.defensive_contribution || 0);
                                acc.goals += match.goals_scored;
                                acc.assists += match.assists;
                                acc.minutes += match.minutes;
                                acc.points += match.total_points;
                                return acc;
                            }, { opponents: [], xGI: 0, xG: 0, xA: 0, DC: 0, goals: 0, assists: 0, minutes: 0, points: 0 });

                            // If team played but player has 0 minutes, it's NOT a blank (it's a bench/0-pointer)
                            // isBlank is only true if NO finished fixtures for the team in this GW.
                            return {
                                gameweek: gw,
                                opponent: aggregated.opponents.join('/'),
                                wasHome: matchesInGw[0].was_home,
                                xGI: aggregated.xGI,
                                xG: aggregated.xG,
                                xA: aggregated.xA,
                                DC: aggregated.DC,
                                goals: aggregated.goals,
                                assists: aggregated.assists,
                                minutes: aggregated.minutes,
                                points: aggregated.points,
                                isBlank: teamFixturesInGw.length === 0
                            };
                        });

                        // Calculate totals from last 6 matches
                        const totalMinutes = last6Matches.reduce((sum, m) => sum + m.minutes, 0);
                        const totalXGI = last6Matches.reduce((sum, m) => sum + m.xGI, 0);
                        const totalXG = last6Matches.reduce((sum, m) => sum + m.xG, 0);
                        const totalXA = last6Matches.reduce((sum, m) => sum + m.xA, 0);
                        const totalDC = last6Matches.reduce((sum, m) => sum + (m.DC || 0), 0);
                        const xGIPer90 = totalMinutes > 0 ? (totalXGI / totalMinutes) * 90 : 0;

                        // Calculate DC/90 from full season data
                        const seasonMinutes = parseFloat(player.minutes || 0);
                        const seasonDefCon = historyData.history.reduce((sum, m) =>
                            sum + parseFloat(m.defensive_contribution || 0), 0
                        );
                        const dcPer90 = seasonMinutes > 0 ? (seasonDefCon / seasonMinutes) * 90 : 0;

                        return {
                            id: player.id,
                            name: player.web_name,
                            fullName: `${player.first_name} ${player.second_name}`,
                            team: team.short_name,
                            teamId: player.team,
                            teamCode: team.code,
                            position: position,
                            price: player.now_cost / 10,
                            yellowCards: player.yellow_cards || 0,
                            selectedBy: parseFloat(player.selected_by_percent || 0),
                            xG: totalXG,
                            xA: totalXA,
                            xGI: totalXGI,
                            DC: totalDC,
                            xGIPer90: xGIPer90,
                            dcPer90: dcPer90,
                            last6Matches: last6Matches,
                            totalMinutes: totalMinutes,
                            seasonXG: parseFloat(player.expected_goals || 0),
                            seasonXA: parseFloat(player.expected_assists || 0),
                            seasonGoals: parseInt(player.goals_scored || 0),
                            seasonAssists: parseInt(player.assists || 0),
                            seasonMinutes: parseInt(player.minutes || 0),
                            totalPoints: parseInt(player.total_points || 0)
                        };
                    } catch (err) {
                        console.error(`Error fetching history for player ${player.id}:`, err);
                        return null;
                    }
                })
            );
            validPlayers.push(...chunkResults.filter(p => p !== null));
        }

        // Fetch EO Data
        let eoDataMap = {};
        try {
            eoDataMap = await fetchEOData();
        } catch (err) {
            console.warn('Continuing without EO data');
        }

        // Merge EO data into players
        const playersWithEO = validPlayers.map(p => ({
            ...p,
            eo10k: eoDataMap[p.id]?.eo10k || '0.0',
            eoOverall: eoDataMap[p.id]?.eoOverall || '0.0',
            cap10k: eoDataMap[p.id]?.cap10k || '0.0'
        }));

        return {
            teams: teamsData,
            players: playersWithEO,
            currentGameweek: lastGameweek
        };

    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};
