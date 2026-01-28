import React, { useState, Fragment } from 'react';
import { ArrowUpDown } from '../ui/Icons';
import clsx from 'clsx';

const SuspensionStats = ({ players }) => {
    const [positionFilter, setPositionFilter] = useState('ALL');
    const [threshold, setThreshold] = useState(3);
    const [minTSB, setMinTSB] = useState(0);
    const [groupByTeam, setGroupByTeam] = useState(false);
    const [groupByCount, setGroupByCount] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'yellowCards', direction: 'desc' });

    const SUSPENSION_LIMIT = 10;

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleReset = () => {
        setPositionFilter('ALL');
        setThreshold(3);
        setMinTSB(0);
        setGroupByTeam(false);
        setGroupByCount(false);
        setSortConfig({ key: 'yellowCards', direction: 'desc' });
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

    const getRiskColorClass = (yellows) => {
        if (yellows === 9) return 'bg-red-500/30 border-red-500/50 text-red-100';
        if (yellows === 8) return 'bg-yellow-400/30 border-yellow-400/50 text-yellow-100';
        return 'bg-green-500/30 border-green-500/50 text-green-100';
    };

    const filteredPlayers = players.filter(player => {
        const risk = SUSPENSION_LIMIT - (player.yellowCards || 0);
        if (positionFilter !== 'ALL' && player.position !== positionFilter) return false;
        if (risk > threshold) return false;
        if ((player.selectedBy || 0) < minTSB) return false;
        if (parseFloat(player.selectedBy || 0) <= 0) return false;
        return true;
    });

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        try {
            if (groupByCount) {
                // First sort by yellow cards (descending) to group them
                if (a.yellowCards !== b.yellowCards) {
                    return (b.yellowCards || 0) - (a.yellowCards || 0);
                }
                // Then by TSB (descending) within the group
                return (b.selectedBy || 0) - (a.selectedBy || 0);
            }

            if (groupByTeam) {
                // First keep teams together
                if (a.teamId !== b.teamId) {
                    return (a.teamId || 0) - (b.teamId || 0);
                }
                // Within team: sort by yellow cards (descending)
                if (a.yellowCards !== b.yellowCards) {
                    return (b.yellowCards || 0) - (a.yellowCards || 0);
                }
                // Finally by TSB (descending)
                return (b.selectedBy || 0) - (a.selectedBy || 0);
            }

            const aValue = a[sortConfig.key] || 0;
            const bValue = b[sortConfig.key] || 0;

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
            <h2 className="text-2xl font-bold text-white mb-4">Suspension Tracker</h2>

            <div className="flex flex-col gap-4 mb-6">
                {/* Filters & Actions Row */}
                <div className="flex gap-4 flex-wrap items-center">
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

                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10 h-[42px]">
                        <label className="text-white text-sm">Threshold (Risk ≤):</label>
                        <select
                            value={threshold}
                            onChange={(e) => setThreshold(parseInt(e.target.value))}
                            className="bg-white/20 text-white px-3 py-1 rounded border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        >
                            {[1, 2, 3, 4, 5].map(t => (
                                <option key={t} value={t} className="text-black">{t}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10 h-[42px]">
                        <label className="text-white text-sm">Min TSB%:</label>
                        <input
                            type="range"
                            min="0"
                            max="20"
                            step="0.5"
                            value={minTSB}
                            onChange={(e) => setMinTSB(parseFloat(e.target.value))}
                            className="w-32 accent-purple-500"
                        />
                        <span className="text-white text-sm font-semibold w-12">{minTSB.toFixed(1)}%</span>
                    </div>

                    <button
                        onClick={() => {
                            setGroupByTeam(!groupByTeam);
                            setGroupByCount(false);
                        }}
                        className={clsx(
                            "px-4 py-3 rounded-lg font-medium transition-all h-[42px] flex items-center",
                            groupByTeam
                                ? 'bg-white text-purple-900 shadow-lg'
                                : 'bg-white/20 text-white hover:bg-white/30'
                        )}
                    >
                        {groupByTeam ? 'Grouped by Team' : 'Group by Team'}
                    </button>

                    <button
                        onClick={() => {
                            setGroupByCount(!groupByCount);
                            setGroupByTeam(false);
                        }}
                        className={clsx(
                            "px-4 py-3 rounded-lg font-medium transition-all h-[42px] flex items-center",
                            groupByCount
                                ? 'bg-white text-purple-900 shadow-lg'
                                : 'bg-white/20 text-white hover:bg-white/30'
                        )}
                    >
                        {groupByCount ? 'Grouped by Count' : 'Group by Count'}
                    </button>

                    <button
                        onClick={handleReset}
                        className="px-4 py-3 rounded-lg font-medium bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30 transition-all ml-auto h-[42px] flex items-center"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                <div className="min-w-[800px] md:min-w-0 w-full">
                    {/* Rounded Square Header */}
                    <div className="mb-4 bg-white/5 rounded-lg p-2 flex gap-4 border border-white/20">
                        <div className="flex-1 text-purple-200 text-xs font-semibold">Player</div>

                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleSort('price')} className="w-16 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                                Price <ArrowUpDown className="w-3 h-3" />
                            </button>

                            <button onClick={() => handleSort('selectedBy')} className="w-20 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                                TSB (%) <ArrowUpDown className="w-3 h-3" />
                            </button>

                            <button onClick={() => handleSort('yellowCards')} className="w-20 text-purple-200 text-xs font-semibold hover:text-white flex items-center justify-center gap-1">
                                Yellow's <ArrowUpDown className="w-3 h-3" />
                            </button>

                            <div className="w-20 text-purple-200 text-xs font-semibold text-center">Risk</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {sortedPlayers.map((player, idx) => {
                            const showTeamHeader = groupByTeam && (idx === 0 || sortedPlayers[idx - 1].teamId !== player.teamId);
                            const currentYellows = player.yellowCards || 0;
                            const showCountHeader = groupByCount && (idx === 0 || (sortedPlayers[idx - 1].yellowCards || 0) !== currentYellows);
                            const risk = SUSPENSION_LIMIT - currentYellows;

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

                                    {showCountHeader && (
                                        <div className="bg-white/10 rounded-lg p-3 mt-4 flex items-center gap-2 sticky left-0">
                                            <h3 className="text-white font-bold text-sm">
                                                {`${risk} Yellows to Ban (${sortedPlayers.filter(p => (SUSPENSION_LIMIT - p.yellowCards) === risk).length} players)`}
                                            </h3>
                                        </div>
                                    )}

                                    <div className={clsx(
                                        "rounded-lg p-3 border transition-colors",
                                        groupByTeam || groupByCount ? 'ml-4' : '',
                                        getRiskColorClass(currentYellows)
                                    )}>
                                        <div className="flex gap-4 items-center flex-nowrap">
                                            {/* Player Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-semibold flex items-center gap-2 truncate">
                                                    {player.name}
                                                    <span className={clsx("text-xs px-1.5 py-0.5 rounded font-medium shrink-0", getPositionColorClass(player.position))}>{player.position}</span>
                                                </div>
                                                <div className="text-purple-300 text-xs opacity-70 truncate">{player.team}</div>
                                            </div>

                                            {/* Stats Cluster Aligned Right */}
                                            <div className="flex gap-2 items-center shrink-0">
                                                <div className="w-16 text-center">
                                                    <div className="text-white font-semibold text-sm">£{(player.price || 0).toFixed(1)}</div>
                                                </div>

                                                <div className="w-20 text-center">
                                                    <div className="text-purple-200 font-semibold text-sm">{(player.selectedBy || 0).toFixed(1)}%</div>
                                                </div>

                                                <div className="w-20 text-center">
                                                    <div className="text-white font-bold text-lg leading-none">{currentYellows}</div>
                                                </div>

                                                <div className="w-20 flex flex-col items-center justify-center">
                                                    <span className="text-white font-black text-xl leading-none">{risk}</span>
                                                    <span className="text-[10px] uppercase font-bold tracking-tighter opacity-70">to go</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Fragment>
                            );
                        })}
                    </div>
                </div>
                {sortedPlayers.length === 0 && (
                    <div className="py-12 text-center bg-white/5 rounded-xl border border-white/10">
                        <p className="text-purple-300">No players matching the risk threshold found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuspensionStats;
