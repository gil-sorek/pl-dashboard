async function checkFixtures() {
    try {
        const response = await fetch('https://fantasy.premierleague.com/api/fixtures/');
        const fixtures = await response.json();

        // 1. Check root keys of a finished fixture
        const finishedFixture = fixtures.find(f => f.finished);
        if (finishedFixture) {
            console.log("Fixture Keys:", Object.keys(finishedFixture));
        }

        // 2. Search for 'expected_goals' in stats
        let foundXG = false;
        for (const f of fixtures) {
            if (f.stats) {
                const xgStat = f.stats.find(s => s.identifier === 'expected_goals');
                if (xgStat) {
                    console.log("Found expected_goals in stats for fixture:", f.id);
                    console.log(JSON.stringify(xgStat, null, 2));
                    foundXG = true;
                    break;
                }
            }
        }

        if (!foundXG) {
            console.log("Could NOT find 'expected_goals' identifier in any fixture stats.");
        }

    } catch (e) {
        console.error(e);
    }
}

checkFixtures();
