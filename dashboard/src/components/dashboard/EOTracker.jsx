import React, { useState, Fragment } from 'react';
import { ArrowUpDown } from '../ui/Icons';
import clsx from 'clsx';

const PositionPanel = ({ title, players, sortConfig, onSort, getEOColorClass, getPositionColorClass }) => {
    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-2xl border border-white/20 h-full flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
                <span>{title}</span>
                <span className="text-xs font-medium text-purple-300 bg-white/5 px-2 py-1 rounded-full">{players.length}</span>
            </h3>

            <div className="space-y-2 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-1">
                {players.length === 0 ? (
                    <div className="py-10 text-center bg-white/5 rounded-lg border border-white/10">
                        <p className="text-purple-300 text-sm">No players matching filters</p>
                    </div>
                ) : (
                    players.map((player) => (
                        <div key={player.id} className="bg-white/5 rounded-lg p-3 border border-white/10 transition-colors hover:bg-white/10">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-white font-bold text-sm truncate">{player.name}</div>
                                        <div className="text-purple-300 text-[10px] font-medium opacity-80 uppercase truncate">{player.team}</div>
                                    </div>
                                    <div className={clsx("text-lg font-black leading-none shrink-0", getEOColorClass(player.eo10k))}>
                                        {player.eo10k}%
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                                    <div className="text-[10px] text-white/60">
                                        Price: <span className="text-white font-bold">£{player.price.toFixed(1)}</span>
                                    </div>
                                    <div className="text-[10px] text-white/60">
                                        TSB: <span className="text-purple-200 font-bold">{player.selectedBy.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const EOTrackerV2 = ({ players }) => {
    const [minEO, setMinEO] = useState(0);
    const [sortConfig, setSortConfig] = useState({ key: 'eo10k', direction: 'desc' });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleReset = () => {
        setMinEO(0);
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
        if (val > 30) return 'text-red-500';
        if (val >= 10) return 'text-yellow-400';
        return 'text-green-400';
    };

    const filteredPlayers = players.filter(player => {
        if (parseFloat(player.eo10k || 0) < minEO) return false;
        if (parseFloat(player.selectedBy || 0) <= 0) return false;
        if (parseFloat(player.eo10k || 0) <= 0) return false;
        return true;
    });

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        const aValue = parseFloat(a[sortConfig.key] || 0);
        const bValue = parseFloat(b[sortConfig.key] || 0);

        if (sortConfig.direction === 'desc') {
            return bValue - aValue;
        }
        return aValue - bValue;
    });

    // Divide by position
    const gks = sortedPlayers.filter(p => p.position === 'GK');
    const defs = sortedPlayers.filter(p => p.position === 'DEF');
    const mids = sortedPlayers.filter(p => p.position === 'MID');
    const fwds = sortedPlayers.filter(p => p.position === 'FWD');

    return (
        <div className="space-y-6">
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

                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg border border-white/10 w-fit h-[42px]">
                    <label className="text-white text-sm">Min EO%:</label>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PositionPanel
                    title="🧤 Goalkeepers"
                    players={gks}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    getEOColorClass={getEOColorClass}
                    getPositionColorClass={getPositionColorClass}
                />
                <PositionPanel
                    title="🛡️ Defenders"
                    players={defs}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    getEOColorClass={getEOColorClass}
                    getPositionColorClass={getPositionColorClass}
                />
                <PositionPanel
                    title="⚔️ Midfielders"
                    players={mids}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    getEOColorClass={getEOColorClass}
                    getPositionColorClass={getPositionColorClass}
                />
                <PositionPanel
                    title="🎯 Forwards"
                    players={fwds}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    getEOColorClass={getEOColorClass}
                    getPositionColorClass={getPositionColorClass}
                />
            </div>
        </div>
    );
};

export default EOTrackerV2;
