import React, { useState } from 'react';
import { Home, Plane, ArrowUpDown } from '../ui/Icons';
import clsx from 'clsx';

const TeamStatsTable = ({ teams, type, sortConfig, onSort }) => {
    // Determine metrics based on type
    const metrics = type === 'attack'
        ? { total: 'totalXG', avg: 'avgXG', matchVal: 'xg', label: 'Expected Goals' }
        : { total: 'totalGC', avg: 'avgGC', matchVal: 'gc', label: 'Expected Goals Conceded' };

    const sortedTeams = [...teams].filter(team => team.fixtures.length > 0).sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.direction === 'desc') {
            return bValue - aValue;
        }
        return aValue - bValue;
    });

    const getColorClass = (value, type, isBlank) => {
        if (isBlank) return 'bg-white/10 text-white/30';
        const val = parseFloat(value);
        if (type === 'attack') {
            if (val > 1.5) return 'bg-green-500/50 text-white';
            if (val >= 0.5) return 'bg-yellow-500/50 text-white';
            return 'bg-red-500/50 text-white';
        } else {
            // Defense: Lower is better
            if (val < 0.7) return 'bg-green-500/50 text-white';
            if (val <= 1.2) return 'bg-yellow-500/50 text-white';
            return 'bg-red-500/50 text-white';
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20 h-full">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                {type === 'attack' ? '⚔️' : '🛡️'} {metrics.label} (Last 6 Matches)
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-purple-200 text-xs uppercase border-b border-white/10">
                            <th className="py-2 pl-2 font-semibold">Team</th>
                            <th className="py-2 px-1 font-semibold text-center w-16">
                                <button
                                    onClick={() => onSort(metrics.total)}
                                    className="flex items-center justify-center gap-1 hover:text-white transition-colors mx-auto"
                                >
                                    Tot <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="py-2 px-1 font-semibold text-center w-16">
                                <button
                                    onClick={() => onSort(metrics.avg)}
                                    className="flex items-center justify-center gap-1 hover:text-white transition-colors mx-auto"
                                >
                                    Avg <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="py-2 pr-1 font-semibold text-center">Last 6 GWs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedTeams.map((team) => (
                            <tr key={team.id} className="hover:bg-white/5 transition-colors group">
                                <td className="py-2 pl-2">
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm group-hover:scale-110 transition-transform">
                                                <img
                                                    src={`https://resources.premierleague.com/premierleague/badges/70/t${team.code}.png`}
                                                    alt={team.shortName}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-white font-semibold text-xs md:text-sm">{team.shortName}</span>
                                    </div>
                                </td>
                                <td className="py-2 px-1 text-center">
                                    <div className="text-white font-bold text-sm">{team[metrics.total].toFixed(2)}</div>
                                </td>
                                <td className="py-2 px-1 text-center">
                                    <div className="text-purple-200 font-medium text-sm">{team[metrics.avg].toFixed(2)}</div>
                                </td>
                                <td className="py-2 pr-1">
                                    <div className="flex gap-0.5 justify-end">
                                        {team.fixtures.map((fixture, idx) => (
                                            <div
                                                key={idx}
                                                className={clsx(
                                                    "first:rounded-l last:rounded-r p-1 text-center transition-colors border border-black/10 w-[54px] shrink-0",
                                                    getColorClass(fixture[metrics.matchVal], type, fixture.isBlank)
                                                )}
                                                title={fixture.isBlank ? `Blank GW ${fixture.gameweek}` : `${fixture.opponent} (${fixture.isHome ? 'H' : 'A'})`}
                                            >
                                                <div className="text-white/90 text-[10px] font-semibold mb-0.5 whitespace-nowrap overflow-hidden">
                                                    {fixture.isBlank ? `GW ${fixture.gameweek}` : `${fixture.opponent}${fixture.opponent.includes('/') ? '' : ` (${fixture.isHome ? 'H' : 'A'})`}`}
                                                </div>
                                                <div className="font-bold text-xs shadow-black/50 drop-shadow-sm leading-none">
                                                    {fixture[metrics.matchVal]}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TeamStats = ({ teams }) => {
    const [attackSort, setAttackSort] = useState({ key: 'totalXG', direction: 'desc' });
    const [defenseSort, setDefenseSort] = useState({ key: 'totalGC', direction: 'asc' });

    const handleAttackSort = (key) => {
        setAttackSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleDefenseSort = (key) => {
        setDefenseSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TeamStatsTable
                teams={teams}
                type="attack"
                sortConfig={attackSort}
                onSort={handleAttackSort}
            />
            <TeamStatsTable
                teams={teams}
                type="defense"
                sortConfig={defenseSort}
                onSort={handleDefenseSort}
            />

            <div className="xl:col-span-2 mt-6 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <p className="text-white text-sm mb-2">
                    <strong>Teams Attack:</strong> <span className="text-green-400">Green = High xG (&gt;1.5)</span> •
                    <span className="text-yellow-400 ml-2">Yellow = Medium (0.5-1.5)</span> •
                    <span className="text-red-400 ml-2">Red = Low (&lt;0.5)</span>
                </p>
                <p className="text-white text-sm mb-2">
                    <strong>Teams Defense:</strong> <span className="text-green-400">Green = Low xGC (&lt;0.7)</span> •
                    <span className="text-yellow-400 ml-2">Yellow = Medium (0.7-1.2)</span> •
                    <span className="text-red-400 ml-2">Red = High (&gt;1.2)</span>
                </p>
                <p className="text-white text-sm">
                    <strong>Players (xGI):</strong> <span className="text-green-400">Green = High (&gt;1)</span> •
                    <span className="text-yellow-400 ml-2">Yellow = Medium (0.3-1)</span> •
                    <span className="text-red-400 ml-2">Red = Low (&lt;0.3)</span>
                </p>
                <p className="text-purple-200 text-xs mt-2">
                    xG = Expected Goals (derived from live player stats) | xGC = Expected Goals Conceded | xGI = Expected Goal Involvements | DC/90 = Defensive Contributions per 90 minutes
                </p>
            </div>
        </div>
    );
};

export default TeamStats;
