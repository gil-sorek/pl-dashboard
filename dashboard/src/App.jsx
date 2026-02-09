import { useState, useEffect } from 'react';
import { fetchPremierLeagueData } from './services/api';
import TeamStats from './components/dashboard/TeamStats';
import PlayerStats from './components/dashboard/PlayerStats';
import SuspensionStats from './components/dashboard/SuspensionStats';
import EOTracker from './components/dashboard/EOTracker';
import OversUnders from './components/dashboard/OversUnders';
import CompareTab from './components/dashboard/CompareTab';
import { RefreshCw, AlertCircle } from './components/ui/Icons';

function App() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('teams');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentGameweek, setCurrentGameweek] = useState(38);

  const fetchData = async (isLiveRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      let data;

      if (!isLiveRefresh) {
        console.log('Attempting to load data from snapshot...');
        try {
          // Construct absolute path using Vite's BASE_URL
          const baseUrl = import.meta.env.BASE_URL || '/';
          const snapshotPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}data/snapshot.json?t=${Date.now()}`;
          console.log('Fetching snapshot from:', snapshotPath);

          const response = await fetch(snapshotPath);
          if (response.ok) {
            const snapshot = await response.json();
            data = snapshot;
            setLastUpdated(new Date(snapshot.updatedAt));
            console.log('Snapshot loaded instantly!');
          } else {
            console.warn(`Snapshot fetch failed with status: ${response.status} ${response.statusText}`);
          }
        } catch (snapshotErr) {
          console.warn('Snapshot load error, falling back to live fetch:', snapshotErr);
        }
      }

      if (!data) {
        console.log('Fetching live data from APIs...');
        data = await fetchPremierLeagueData();
        setLastUpdated(new Date());
      }

      setTeams(data.teams);
      setPlayers(data.players);
      if (data.currentGameweek) {
        setCurrentGameweek(data.currentGameweek);
      }
      console.log('Data ready!');
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 shadow-2xl border border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Premier League Analytics</h1>
              <p className="text-purple-200">Expected Goals Analytics • Powered by FPL API</p>
              {lastUpdated && (
                <p className="text-purple-300 text-sm mt-1">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Live Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-300 shrink-0" />
            <div>
              <p className="text-white font-semibold">Error loading data</p>
              <p className="text-red-200 text-sm">{error}</p>
              <p className="text-red-200 text-sm mt-1">Please try refreshing the page or clicking "Refresh Data"</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-8 py-4 rounded-lg font-semibold transition-all ${activeTab === 'teams'
              ? 'bg-white text-purple-900 shadow-lg'
              : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            Teams
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-8 py-4 rounded-lg font-semibold transition-all ${activeTab === 'players'
              ? 'bg-white text-purple-900 shadow-lg'
              : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            Players
          </button>
          <button
            onClick={() => setActiveTab('suspensions')}
            className={`px-8 py-4 rounded-lg font-semibold transition-all ${activeTab === 'suspensions'
              ? 'bg-white text-purple-900 shadow-lg'
              : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            Suspensions
          </button>
          <button
            onClick={() => setActiveTab('eo')}
            className={`px-8 py-4 rounded-lg font-semibold transition-all ${activeTab === 'eo'
              ? 'bg-white text-purple-900 shadow-lg'
              : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            EO Tracker
          </button>
          <button
            onClick={() => setActiveTab('oversunders')}
            className={`px-8 py-4 rounded-lg font-semibold transition-all ${activeTab === 'oversunders'
              ? 'bg-white text-purple-900 shadow-lg'
              : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            Overs/Unders
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-8 py-4 rounded-lg font-semibold transition-all ${activeTab === 'compare'
              ? 'bg-white text-purple-900 shadow-lg'
              : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            Compare
          </button>
        </div>

        {loading ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center">
            <RefreshCw className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white text-xl">Loading Premier League data...</p>
            <p className="text-purple-300 text-sm mt-2">Fetching player match history... this may take a moment</p>
          </div>
        ) : teams.length === 0 && players.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <p className="text-white text-xl mb-2">No data available</p>
            <p className="text-purple-300 text-sm">Click "Refresh Data" to load the latest Premier League statistics</p>
          </div>
        ) : (
          <>
            {activeTab === 'teams' && <TeamStats teams={teams} />}
            {activeTab === 'players' && <PlayerStats players={players} teams={teams} />}
            {activeTab === 'suspensions' && <SuspensionStats players={players} />}
            {activeTab === 'eo' && <EOTracker players={players} />}
            {activeTab === 'oversunders' && <OversUnders players={players} teams={teams} currentGameweek={currentGameweek} />}
            {activeTab === 'compare' && <CompareTab players={players} />}
          </>
        )}

      </div>
    </div>
  );
}

export default App;
