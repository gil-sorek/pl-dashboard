import { fetchPremierLeagueData } from './src/services/api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateSnapshot() {
    try {
        console.log('Fetching fresh data from FPL API...');
        const data = await fetchPremierLeagueData();
        const snapshot = {
            ...data,
            updatedAt: new Date().toISOString()
        };
        const snapshotPath = path.join(__dirname, 'public', 'data', 'snapshot.json');

        // Ensure directory exists
        const dir = path.dirname(snapshotPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
        console.log('Snapshot updated successfully at ' + snapshotPath);
        process.exit(0);
    } catch (err) {
        console.error('Failed to update snapshot:', err);
        process.exit(1);
    }
}

updateSnapshot();
