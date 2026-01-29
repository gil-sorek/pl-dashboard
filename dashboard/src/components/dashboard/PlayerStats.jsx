import React, { useState, Fragment } from 'react';
import { ArrowUpDown } from '../ui/Icons';
import clsx from 'clsx';

const PlayerStats = ({ players, teams }) => {
    const [teamFilter, setTeamFilter] = useState('ALL');
    const [positionFilter, setPositionFilter] = useState('ALL');
    const [groupByTeam, setGroupByTeam] = useState(false);
    const [xGIThreshold, setXGIThreshold] = useState(1.0);
    const [minutesThreshold, setMinutesThreshold] = useState(150);
    const [priceThreshold, setPriceThreshold] = useState(15.5);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'xGI', direction: 'desc' });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleReset = () => {
        setTeamFilter('ALL');
        setPositionFilter('ALL');
        setSearchTerm('');
        setGroupByTeam(false);
        setXGIThreshold(1.0);
        setMinutesThreshold(150);
        setPriceThreshold(15.5);
        setSortConfig({ key: 'xGI', direction: 'desc' });
    };

    const getColorForPlayerXGI = (value, isBlank) => {
        if (isBlank) return 'rgba(156, 163, 175, 0.2)'; // Gray for blank weeks
        if (value < 0.3) {
            return 'rgba(239, 68, 68, 0.5)';
        } else if (value < 1) {
            return 'rgba(234, 179, 8, 0.5)';
        } else {
            return 'rgba(34, 197, 94, 0.5)';
        }
    };

    const getPositionColorClass = (position) => {
        switch (position) {
            case 'GK': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
            case 'DEF': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
            case 'MID': return 'bg-green-500/20 text-green-300 border border-green-500/30';
            case 'FWD': return 'bg-pink-500/20 text-pink-300 border border-pink-500/30';
            default: return 'bg-white/10 text-purple-200 border border-white/10';
        }
    };

    const normalizedSearch = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const filteredPlayers = players.filter(player => {
        if (teamFilter !== 'ALL' && player.teamId !== parseInt(teamFilter)) return false;
        if (positionFilter !== 'ALL' && player.position !== positionFilter) return false;
        if (searchTerm) {
            const normalizedName = player.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (!normalizedName.includes(normalizedSearch)) return false;
        }
        if (player.xGI < xGIThreshold) return false;
        if (player.totalMinutes < minutesThreshold) return false;
        if (player.price > priceThreshold) return false;
        if (parseFloat(player.selectedBy || 0) <= 0) return false;
        return true;
    });

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        if (groupByTeam && a.teamId !== b.teamId) {
            return a.teamId - b.teamId;
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.direction === 'desc') {
            return bValue - aValue;
        }
        return aValue - bValue;
    });

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Players - Expected Goals Analytics (Last 6 Matches)</h2>

            <div className="flex flex-col gap-4 mb-6">
                {/* Sliders Row */}
                <div className="flex gap-4 flex-wrap items-center bg-white/5 p-3 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2">
                        <label className="text-white text-sm">Min xGI:</label>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={xGIThreshold}
                            onChange={(e) => setXGIThreshold(parseFloat(e.target.value))}
                            className="w-32 accent-purple-500"
                        />
                        <span className="text-white text-sm font-semibold w-12">{xGIThreshold.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-white text-sm">Min Mins:</label>
                        <input
                            type="range"
                            min="0"
                            max="540"
                            step="30"
                            value={minutesThreshold}
                            onChange={(e) => setMinutesThreshold(parseFloat(e.target.value))}
                            className="w-32 accent-purple-500"
                        />
                        <span className="text-white text-sm font-semibold w-12">{minutesThreshold}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-white text-sm">Max Price:</label>
                        <input
                            type="range"
                            min="3.5"
                            max="15.5"
                            step="0.1"
                            value={priceThreshold}
                            onChange={(e) => setPriceThreshold(parseFloat(e.target.value))}
                            className="w-32 accent-purple-500"
                        />
                        <span className="text-white text-sm font-semibold w-12">£{priceThreshold.toFixed(1)}</span>
                    </div>
                </div>

                {/* Filters & Actions Row */}
                <div className="flex gap-4 flex-wrap items-center">
                    <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="bg-white/20 text-white px-4 py-2 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="ALL" className="text-black">All Teams</option>
                        {teams && teams.sort((a, b) => a.name.localeCompare(b.name)).map(team => (
                            <option key={team.id} value={team.id} className="text-black">{team.name}</option>
                        ))}
                    </select>
                    <select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="bg-white/20 text-white px-4 py-2 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="ALL" className="text-black">All Positions</option>
                        <option value="GK" className="text-black">Goalkeepers</option>
                        <option value="DEF" className="text-black">Defenders</option>
                        <option value="MID" className="text-black">Midfielders</option>
                        <option value="FWD" className="text-black">Forwards</option>
                    </select>

                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search player name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/20 text-white px-4 py-2 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/50"
                        />
                    </div>

                    <button
                        onClick={() => setGroupByTeam(!groupByTeam)}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-medium transition-all",
                            groupByTeam
                                ? 'bg-white text-purple-900'
                                : 'bg-white/20 text-white hover:bg-white/30'
                        )}
                    >
                        {groupByTeam ? 'Grouped by Team' : 'Group by Team'}
                    </button>

                    <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-lg font-medium bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30 transition-all ml-auto"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                <div className="min-w-[1200px] md:min-w-0 w-full">
                    <div className="mb-4 bg-white/5 rounded-lg p-2 flex gap-2 border border-white/20">
                        <div className="w-40 shrink-0 md:shrink text-purple-200 text-xs font-semibold">Player</div>

                        <button onClick={() => handleSort('price')} className="w-14 shrink-0 md:shrink-0 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                            Price <ArrowUpDown className="w-3 h-3" />
                        </button>

                        <button onClick={() => handleSort('xG')} className="w-12 shrink-0 md:shrink-0 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                            xG <ArrowUpDown className="w-3 h-3" />
                        </button>

                        <button onClick={() => handleSort('xA')} className="w-12 shrink-0 md:shrink-0 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                            xA <ArrowUpDown className="w-3 h-3" />
                        </button>

                        <button onClick={() => handleSort('xGI')} className="w-12 shrink-0 md:shrink-0 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                            xGI <ArrowUpDown className="w-3 h-3" />
                        </button>

                        <button onClick={() => handleSort('xGIPer90')} className="w-14 shrink-0 md:shrink-0 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                            xGI/90 <ArrowUpDown className="w-3 h-3" />
                        </button>

                        <button onClick={() => handleSort('dcPer90')} className="w-14 shrink-0 md:shrink-0 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                            DC/90 <ArrowUpDown className="w-3 h-3" />
                        </button>

                        <div className="flex-1 text-purple-200 text-xs font-semibold text-center">Last 6 Matches</div>
                    </div>

                    <div className="space-y-2">
                        {sortedPlayers.map((player, idx) => {
                            const showTeamHeader = groupByTeam && (idx === 0 || sortedPlayers[idx - 1].teamId !== player.teamId);

                            return (
                                <Fragment key={player.id}>
                                    {showTeamHeader && (
                                        <div className="bg-white/20 rounded-lg p-3 mt-4 flex items-center gap-2 sticky left-0">
                                            <img
                                                src={`https://resources.premierleague.com/premierleague/badges/70/t${player.teamCode}.png`}
                                                alt={player.team}
                                                className="w-6 h-6"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                            <h3 className="text-white font-bold text-lg">{player.team}</h3>
                                        </div>
                                    )}

                                    <div className={clsx(
                                        "rounded-lg p-3 border transition-colors",
                                        groupByTeam
                                            ? 'bg-white/5 border-white/20 ml-4'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    )}>
                                        <div className="flex gap-2 items-center flex-nowrap">
                                            {/* Player Info */}
                                            <div className="w-40 shrink-0 md:shrink">
                                                <div className="text-white font-semibold flex items-center gap-2">
                                                    {player.name}
                                                    <span className={clsx("text-xs px-1.5 py-0.5 rounded font-medium", getPositionColorClass(player.position))}>{player.position}</span>
                                                </div>
                                                <div className="text-purple-300 text-xs">{player.team}</div>
                                            </div>

                                            {/* Stats */}
                                            <div className="w-14 text-center shrink-0">
                                                <div className="text-white font-semibold">£{player.price.toFixed(1)}</div>
                                            </div>

                                            <div className="w-12 text-center shrink-0">
                                                <div className="text-white font-semibold">{player.xG.toFixed(2)}</div>
                                            </div>

                                            <div className="w-12 text-center shrink-0">
                                                <div className="text-white font-semibold">{player.xA.toFixed(2)}</div>
                                            </div>

                                            <div className="w-12 text-center shrink-0">
                                                <div className="text-white font-semibold">{player.xGI.toFixed(2)}</div>
                                            </div>

                                            <div className="w-14 text-center shrink-0">
                                                <div className="text-white font-semibold">{player.xGIPer90.toFixed(2)}</div>
                                            </div>

                                            <div className="w-14 text-center shrink-0">
                                                <div className="text-white font-semibold">{player.dcPer90.toFixed(2)}</div>
                                            </div>

                                            {/* Last 6 Matches */}
                                            <div className="flex-1 flex gap-1 min-w-[610px] md:min-w-0">
                                                {player.last6Matches.map((match, matchIdx) => {
                                                    const matchColor = getColorForPlayerXGI(match.xGI, match.isBlank);

                                                    return (
                                                        <div
                                                            key={matchIdx}
                                                            className="flex-1 min-w-[100px] rounded p-0.5 text-center shrink-0 md:shrink"
                                                            style={{ backgroundColor: matchColor }}
                                                            title={match.isBlank ? `Blank GW ${match.gameweek}` : `${match.opponent} (${match.wasHome ? 'H' : 'A'}) - xGI: ${match.xGI.toFixed(2)}`}
                                                        >
                                                            <div className="text-white text-xs font-semibold mb-1 truncate">
                                                                {match.isBlank ? `GW ${match.gameweek}` : `${match.opponent}${match.opponent.includes('/') ? '' : ` (${match.wasHome ? 'H' : 'A'})`}`}
                                                            </div>
                                                            <div className="text-white font-bold text-sm flex items-center justify-center gap-0.5 whitespace-nowrap overflow-hidden">
                                                                {match.xGI.toFixed(2)}
                                                                {(match.goals > 0 || match.assists > 0) && (
                                                                    <div className="flex ml-0.5 shrink-0">
                                                                        {[...Array(match.goals || 0)].map((_, i) => <span key={`g-${i}`} role="img" aria-label="goal">⚽</span>)}
                                                                        {[...Array(match.assists || 0)].map((_, i) => <span key={`a-${i}`} role="img" aria-label="assist">🅰️</span>)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-4 text-purple-200 text-sm">
                Showing {sortedPlayers.length} of {players.length} players
            </div>
        </div>
    );
};

export default PlayerStats;
