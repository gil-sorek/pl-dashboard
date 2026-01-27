import React, { useState, Fragment } from 'react';
import { ArrowUpDown } from '../ui/Icons';
import clsx from 'clsx';

const EOTracker = ({ players }) => {
    const [positionFilter, setPositionFilter] = useState('ALL');
    const [minEO, setMinEO] = useState(0);
    const [groupByTeam, setGroupByTeam] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'eo10k', direction: 'desc' });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleReset = () => {
        setPositionFilter('ALL');
        setMinEO(0);
        setGroupByTeam(false);
        setSortConfig({ key: 'eo10k', direction: 'desc' });
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

    const getEOColorClass = (eo) => {
        const val = parseFloat(eo);
        if (val > 30) return 'text-red-500 font-bold';
        if (val >= 10) return 'text-yellow-400 font-semibold';
        return 'text-green-400 font-medium';
    };

    const filteredPlayers = players.filter(player => {
        if (positionFilter !== 'ALL' && player.position !== positionFilter) return false;
        if (parseFloat(player.eo10k || 0) < minEO) return false;
        if (parseFloat(player.selectedBy || 0) <= 0) return false;
        if (parseFloat(player.eo10k || 0) <= 0) return false;
        return true;
    });

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        try {
            if (groupByTeam) {
                if (a.teamId !== b.teamId) {
                    return (a.teamId || 0) - (b.teamId || 0);
                }
                const aVal = parseFloat(a[sortConfig.key] || 0);
                const bVal = parseFloat(b[sortConfig.key] || 0);
                return bVal - aVal;
            }

            const aValue = parseFloat(a[sortConfig.key] || 0);
            const bValue = parseFloat(b[sortConfig.key] || 0);

            if (sortConfig.direction === 'desc') {
                return bValue - aValue;
            }
            return aValue - bValue;
        } catch (e) {
            console.error('Sort error:', e);
            return 0;
        }
    });

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">EO Tracker</h2>
                    <p className="text-purple-300 text-sm mt-1">Effective Ownership in the top 10K</p>
                </div>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg font-medium bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30 transition-all text-sm"
                >
                    Reset Filters
                </button>
            </div>

            <div className="flex flex-col gap-4 mb-8">
                <div className="flex gap-4 flex-wrap items-center">
                    <select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="bg-white/20 text-white px-4 py-2 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 h-[42px]"
                    >
                        <option value="ALL" className="text-black">All Positions</option>
                        <option value="GK" className="text-black">Goalkeepers</option>
                        <option value="DEF" className="text-black">Defenders</option>
                        <option value="MID" className="text-black">Midfielders</option>
                        <option value="FWD" className="text-black">Forwards</option>
                    </select>

                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10 h-[42px]">
                        <label className="text-white text-sm">Min EO% (10k):</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={minEO}
                            onChange={(e) => setMinEO(parseFloat(e.target.value))}
                            className="w-32 accent-purple-500"
                        />
                        <span className="text-white text-sm font-semibold w-12">{minEO.toFixed(1)}%</span>
                    </div>

                    <button
                        onClick={() => setGroupByTeam(!groupByTeam)}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-medium transition-all h-[42px] flex items-center",
                            groupByTeam
                                ? 'bg-white text-purple-900 shadow-lg'
                                : 'bg-white/20 text-white hover:bg-white/30'
                        )}
                    >
                        {groupByTeam ? 'Grouped by Team' : 'Group by Team'}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                <div className="min-w-[800px] w-full">
                    {/* Header */}
                    <div className="mb-4 bg-white/5 rounded-lg p-3 flex gap-4 border border-white/20 items-center">
                        <div className="flex-1 text-purple-200 text-xs font-bold uppercase tracking-wider">Player / Team</div>

                        <div className="flex gap-4 shrink-0">
                            <button onClick={() => handleSort('price')} className="w-20 text-purple-200 text-xs font-bold uppercase tracking-wider hover:text-white flex items-center justify-center gap-1">
                                Price <ArrowUpDown className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleSort('selectedBy')} className="w-24 text-purple-200 text-xs font-bold uppercase tracking-wider hover:text-white flex items-center justify-center gap-1">
                                TSB (%) <ArrowUpDown className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleSort('eo10k')} className="w-32 text-purple-200 text-xs font-bold uppercase tracking-wider text-white border-b-2 border-purple-500 flex items-center justify-center gap-1">
                                Top 10k EO <ArrowUpDown className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Table Body */}
                    <div className="space-y-2">
                        {sortedPlayers.map((player, idx) => {
                            const showTeamHeader = groupByTeam && (idx === 0 || sortedPlayers[idx - 1].teamId !== player.teamId);

                            return (
                                <Fragment key={player.id}>
                                    {showTeamHeader && (
                                        <div className="bg-white/20 rounded-lg p-3 mt-4 flex items-center gap-2 sticky left-0 border border-white/10">
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
                                        "bg-white/5 rounded-lg p-4 border border-white/10 transition-colors hover:bg-white/10",
                                        groupByTeam ? 'ml-4' : ''
                                    )}>
                                        <div className="flex gap-4 items-center">
                                            {/* Player Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-bold text-lg flex items-center gap-2 truncate">
                                                    {player.name}
                                                    <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold", getPositionColorClass(player.position))}>
                                                        {player.position}
                                                    </span>
                                                </div>
                                                <div className="text-purple-300 text-xs font-medium opacity-80 uppercase tracking-tight">{player.team}</div>
                                            </div>

                                            {/* Stats Cluster */}
                                            <div className="flex gap-4 items-center shrink-0">
                                                <div className="w-20 text-center">
                                                    <div className="text-white/60 text-[10px] font-bold uppercase block mb-0.5">Price</div>
                                                    <div className="text-white font-bold">£{player.price.toFixed(1)}</div>
                                                </div>

                                                <div className="w-24 text-center">
                                                    <div className="text-white/60 text-[10px] font-bold uppercase block mb-0.5">TSB</div>
                                                    <div className="text-purple-200 font-bold">{player.selectedBy.toFixed(1)}%</div>
                                                </div>

                                                <div className="w-32 text-center bg-white/10 rounded-lg py-1 border border-white/10">
                                                    <div className="text-purple-300 text-[10px] font-bold uppercase block mb-0.5">Top 10k EO</div>
                                                    <div className={clsx("text-2xl leading-none", getEOColorClass(player.eo10k))}>
                                                        {player.eo10k}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Fragment>
                            );
                        })}

                        {sortedPlayers.length === 0 && (
                            <div className="py-20 text-center bg-white/5 rounded-xl border border-white/10">
                                <p className="text-purple-300 text-lg">No players found with EO ≥ {minEO}%</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EOTracker;
