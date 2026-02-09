import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';

const PlayerSearch = ({ label, onSelect, selectedPlayer, allPlayers }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredPlayers = useMemo(() => {
        if (!search) return [];
        const lower = search.toLowerCase();
        return allPlayers
            .filter(p => p.name.toLowerCase().includes(lower) || p.team.toLowerCase().includes(lower))
            .slice(0, 10);
    }, [search, allPlayers]);

    return (
        <div className="relative w-full max-w-sm">
            <label className="block text-xs uppercase tracking-wider text-purple-300 mb-1">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    value={selectedPlayer ? selectedPlayer.name : search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (selectedPlayer) onSelect(null); // Clear selection on type
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    placeholder="Search player..."
                    className={clsx(
                        "w-full bg-white/5 border rounded-lg px-4 py-2 pl-10 text-white placeholder-white/30 focus:outline-none transition-colors",
                        selectedPlayer ? "border-green-500/50 text-green-400" : "border-white/10 focus:border-purple-500/50"
                    )}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
            </div>

            {isOpen && search && !selectedPlayer && (
                <div className="absolute z-50 w-full mt-1 bg-[#1a1625] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                    {filteredPlayers.length > 0 ? (
                        filteredPlayers.map(p => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    onSelect(p);
                                    setSearch('');
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-white/5 flex justify-between items-center group"
                            >
                                <span className="text-white group-hover:text-purple-300 transition-colors">{p.name}</span>
                                <span className="text-xs text-white/50">{p.team} • {p.position}</span>
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-2 text-white/30 text-sm">No players found</div>
                    )}
                </div>
            )}
        </div>
    );
};

const StatRow = ({ label, valueA, valueB, format = (v) => v, reverse = false }) => {
    // Determine winner
    let highlightA = false;
    let highlightB = false;

    if (valueA !== valueB) {
        if (reverse) {
            if (valueA < valueB) highlightA = true;
            else highlightB = true;
        } else {
            if (valueA > valueB) highlightA = true;
            else highlightB = true;
        }
    }

    return (
        <div className="grid grid-cols-3 gap-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors">
            <div className={clsx("text-right font-mono", highlightA ? "text-green-400 font-bold" : "text-white/80")}>
                {format(valueA, true)}
            </div>
            <div className="text-center text-sm text-purple-200">{label}</div>
            <div className={clsx("text-left font-mono", highlightB ? "text-green-400 font-bold" : "text-white/80")}>
                {format(valueB, false)}
            </div>
        </div>
    );
};

const CompareTab = ({ players }) => {
    const [playerA, setPlayerA] = useState(null);
    const [playerB, setPlayerB] = useState(null);

    if (!players) return <div className="text-white">Loading data...</div>;

    // Helper to calculate Scoring Frequency safely
    const getScoringFreq = (mins, goals) => {
        if (!goals || goals === 0) return 'N/A';
        return (mins / goals).toFixed(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
                <PlayerSearch
                    label="Select Player 1"
                    onSelect={setPlayerA}
                    selectedPlayer={playerA}
                    allPlayers={players}
                />
                <div className="hidden md:flex h-full items-center pt-6">
                    <div className="w-px h-12 bg-white/10"></div>
                </div>
                <PlayerSearch
                    label="Select Player 2"
                    onSelect={setPlayerB}
                    selectedPlayer={playerB}
                    allPlayers={players}
                />
            </div>

            {playerA && playerB && (
                <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-xl overflow-hidden mt-8">
                    {/* Header with Photos */}
                    <div className="grid grid-cols-3 gap-4 p-6 bg-purple-900/20 border-b border-white/10 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

                        {/* Player A Header */}
                        <div className="flex flex-col items-center relative z-10">
                            <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-purple-500/30 mb-3 overflow-hidden shadow-lg relative">
                                <img
                                    src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${playerA.code}.png`}
                                    alt={playerA.name}
                                    className="w-full h-full object-cover object-top"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://resources.premierleague.com/premierleague/photos/players/110x140/p0.png"
                                    }}
                                />
                            </div>
                            <div className="text-xl font-bold text-white mb-1">{playerA.name}</div>
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                                <img
                                    src={`https://resources.premierleague.com/premierleague/badges/70/t${playerA.teamCode}.png`}
                                    alt={playerA.team}
                                    className="w-4 h-4"
                                />
                                <span className="text-xs text-white/70 font-medium">{playerA.team}</span>
                            </div>
                        </div>

                        {/* VS Label */}
                        <div className="flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                <span className="text-white/50 font-bold text-sm">VS</span>
                            </div>
                        </div>

                        {/* Player B Header */}
                        <div className="flex flex-col items-center relative z-10">
                            <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-purple-500/30 mb-3 overflow-hidden shadow-lg relative">
                                <img
                                    src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${playerB.code}.png`}
                                    alt={playerB.name}
                                    className="w-full h-full object-cover object-top"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://resources.premierleague.com/premierleague/photos/players/110x140/p0.png"
                                    }}
                                />
                            </div>
                            <div className="text-xl font-bold text-white mb-1">{playerB.name}</div>
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                                <img
                                    src={`https://resources.premierleague.com/premierleague/badges/70/t${playerB.teamCode}.png`}
                                    alt={playerB.team}
                                    className="w-4 h-4"
                                />
                                <span className="text-xs text-white/70 font-medium">{playerB.team}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-1">
                        {/* General Info */}
                        <StatRow label="Position" valueA={playerA.position} valueB={playerB.position} />
                        <StatRow label="Price" valueA={playerA.price} valueB={playerB.price} format={v => `£${v.toFixed(1)}m`} reverse={true} />
                        <StatRow label="Total Points" valueA={playerA.totalPoints} valueB={playerB.totalPoints} />

                        {/* Matches Section */}
                        <div className="h-px bg-white/10 my-4"></div>
                        <h3 className="text-center text-xs uppercase tracking-widest text-white/30 mb-2">Matches</h3>

                        <StatRow label="Matches Played" valueA={playerA.matchesPlayed || 0} valueB={playerB.matchesPlayed || 0} />
                        <StatRow label="Total Minutes" valueA={playerA.seasonMinutes} valueB={playerB.seasonMinutes} />
                        <StatRow label="Mins Per Game"
                            valueA={playerA.matchesPlayed ? (playerA.seasonMinutes / playerA.matchesPlayed).toFixed(0) : 0}
                            valueB={playerB.matchesPlayed ? (playerB.seasonMinutes / playerB.matchesPlayed).toFixed(0) : 0}
                        />

                        {/* Attacking Section */}
                        <div className="h-px bg-white/10 my-4"></div>
                        <h3 className="text-center text-xs uppercase tracking-widest text-white/30 mb-2">Attacking</h3>

                        <StatRow label="Goals" valueA={playerA.seasonGoals} valueB={playerB.seasonGoals} />
                        <StatRow label="Expected Goals (xG)" valueA={playerA.seasonXG} valueB={playerB.seasonXG} format={v => v.toFixed(2)} />
                        <StatRow label="Goals Per Game"
                            valueA={playerA.matchesPlayed ? (playerA.seasonGoals / playerA.matchesPlayed).toFixed(2) : '0.00'}
                            valueB={playerB.matchesPlayed ? (playerB.seasonGoals / playerB.matchesPlayed).toFixed(2) : '0.00'}
                            format={v => v}
                        />

                        {/* Passes Section */}
                        <div className="h-px bg-white/10 my-4"></div>
                        <h3 className="text-center text-xs uppercase tracking-widest text-white/30 mb-2">Passes</h3>

                        <StatRow label="Assists" valueA={playerA.seasonAssists} valueB={playerB.seasonAssists} />
                        <StatRow label="Assists Per Game"
                            valueA={playerA.matchesPlayed ? (playerA.seasonAssists / playerA.matchesPlayed).toFixed(2) : '0.00'}
                            valueB={playerB.matchesPlayed ? (playerB.seasonAssists / playerB.matchesPlayed).toFixed(2) : '0.00'}
                            format={v => v}
                        />
                        <StatRow label="Expected Assists (xA)" valueA={playerA.seasonXA} valueB={playerB.seasonXA} format={v => v.toFixed(2)} />

                        {/* Defensive Section */}
                        <div className="h-px bg-white/10 my-4"></div>
                        <h3 className="text-center text-xs uppercase tracking-widest text-white/30 mb-2">Defensive</h3>

                        <StatRow
                            label="Successful Def. Contrib."
                            valueA={playerA.defconMatches || 0}
                            valueB={playerB.defconMatches || 0}
                            format={(v, isA) => {
                                const player = isA ? playerA : playerB;
                                return `${v}/${player.matchesPlayed || 0}`;
                            }}
                        />
                        <StatRow label="Def. Contrib. per 90" valueA={playerA.dcPer90 || 0} valueB={playerB.dcPer90 || 0} format={v => v.toFixed(2)} />

                        {/* Discipline Section */}
                        <div className="h-px bg-white/10 my-4"></div>
                        <h3 className="text-center text-xs uppercase tracking-widest text-white/30 mb-2">Discipline</h3>
                        <StatRow label="Yellow Cards" valueA={playerA.yellowCards} valueB={playerB.yellowCards} reverse={true} />
                        <StatRow label="Red Cards" valueA={playerA.redCards || 0} valueB={playerB.redCards || 0} reverse={true} />
                    </div>
                </div>
            )}

            {!playerA && !playerB && (
                <div className="text-center text-white/30 mt-20">
                    Select two players to begin comparison
                </div>
            )}
        </div>
    );
};

export default CompareTab;
