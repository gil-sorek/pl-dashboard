
const fetchEOData = async () => {
    try {
        console.log('Fetching EO data from LiveFPL...');
        const response = await fetch('https://plan.livefpl.net/EO');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();

        const eoData = {};

        // 1. Try to extract from script variables
        const eoMatch = html.match(/var\s+eo_t\s*=\s*({.*?});/);
        const overallMatch = html.match(/var\s+eo_o\s*=\s*({.*?});/);

        if (eoMatch) {
            try {
                const eoMap = JSON.parse(eoMatch[1]);
                console.log('Found eo_t map with', Object.keys(eoMap).length, 'entries');
                Object.keys(eoMap).forEach(id => {
                    if (!eoData[id]) eoData[id] = {};
                    eoData[id].eo10k = (parseFloat(eoMap[id]) * 100).toFixed(1);
                });
            } catch (e) { console.error('Error parsing eo_t', e); }
        }

        if (overallMatch) {
            try {
                const overallMap = JSON.parse(overallMatch[1]);
                console.log('Found eo_o map with', Object.keys(overallMap).length, 'entries');
                Object.keys(overallMap).forEach(id => {
                    const val = parseFloat(overallMap[id]);
                    if (val > 0) {
                        if (!eoData[id]) eoData[id] = {};
                        eoData[id].eoOverall = (val * 100).toFixed(1);
                    }
                });
            } catch (e) { console.error('Error parsing eo_o', e); }
        }

        const ids = Object.keys(eoData);
        if (ids.length > 0) {
            console.log('Sample EO Data for ID', ids[0], ':', eoData[ids[0]]);
        } else {
            console.log('No EO data found');
        }

        return eoData;
    } catch (err) {
        console.error('Failed to fetch EO data:', err);
        return {};
    }
};

fetchEOData();
