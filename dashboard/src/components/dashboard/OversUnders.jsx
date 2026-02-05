import React, { useState, useMemo, useEffect } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from 'recharts';
import clsx from 'clsx';

const normalizeString = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/ø/g, 'o')
        .replace(/æ/g, 'ae')
        .replace(/ß/g, 'ss')
        .replace(/ł/g, 'l');
};

const getPositionColor = (position) => {
    switch (position) {
        case 'GK': return '#facc15';  // Yellow-400
        case 'DEF': return '#60a5fa'; // Blue-400
        case 'MID': return '#4ade80'; // Green-400
        case 'FWD': return '#f472b6'; // Pink-400
        default: return '#a78bfa';    // Purple-400
    }
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-purple-900/90 backdrop-blur-md border border-white/20 p-3 rounded-lg shadow-xl text-white">
                <p className="font-bold border-b border-white/10 pb-1 mb-1">{data.name}</p>
                <p className="text-xs text-purple-200">{data.team} • {data.position}</p>
                <div className="mt-2 space-y-1 text-sm">
                    <p>{data.yName}: <span className="font-semibold">{data.y.toFixed(2)}</span></p>
                    <p>{data.xName}: <span className="font-semibold">{data.x.toFixed(2)}</span></p>
                    {data.diff !== undefined && (
                        <p>Diff: <span className={clsx("font-bold", data.diff >= 0 ? "text-green-400" : "text-red-400")}>
                            {data.diff >= 0 ? '+' : ''}{data.diff.toFixed(2)}
                        </span></p>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const OversUnders = ({ players, teams, currentGameweek }) => {
    const [teamFilter, setTeamFilter] = useState('ALL');
    const [positionFilter, setPositionFilter] = useState('ALL');
    const [minutesThreshold, setMinutesThreshold] = useState(300);
    const [priceThreshold, setPriceThreshold] = useState(15.5);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState('season'); // 'last6' or 'season'
    const [hoveredPlayerId, setHoveredPlayerId] = useState(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState(null);


    const maxMins = useMemo(() => {
        return timeRange === 'last6' ? 540 : (currentGameweek || 38) * 90;
    }, [timeRange, currentGameweek]);

    // Clamp minutesThreshold when maxMins changes
    useEffect(() => {
        if (minutesThreshold > maxMins) {
            setMinutesThreshold(maxMins);
        }
    }, [maxMins, minutesThreshold]);

    const filteredData = useMemo(() => {
        const normalizedSearch = normalizeString(searchTerm);
        return players.filter(player => {
            if (teamFilter !== 'ALL' && player.teamId !== parseInt(teamFilter)) return false;
            if (positionFilter !== 'ALL' && player.position !== positionFilter) return false;
            if (searchTerm && !normalizeString(player.name).includes(normalizedSearch)) return false;

            const mins = timeRange === 'last6' ? player.totalMinutes : player.seasonMinutes;
            if (mins < minutesThreshold) return false;

            if (player.price > priceThreshold) return false;
            return true;
        });
    }, [players, teamFilter, positionFilter, minutesThreshold, priceThreshold, searchTerm, timeRange]);

    const goalsData = useMemo(() => {
        return filteredData.map(p => {
            const x = timeRange === 'last6' ? p.xG : p.seasonXG;
            const y = timeRange === 'last6' ? p.last6Matches.reduce((sum, m) => sum + m.goals, 0) : p.seasonGoals;
            return {
                x, y,
                id: p.id,
                name: p.name,
                team: p.team,
                position: p.position,
                xName: 'xG',
                yName: 'Goals',
                diff: y - x
            };
        });
    }, [filteredData, timeRange]);

    const assistsData = useMemo(() => {
        return filteredData.map(p => {
            const x = timeRange === 'last6' ? p.xA : p.seasonXA;
            const y = timeRange === 'last6' ? p.last6Matches.reduce((sum, m) => sum + m.assists, 0) : p.seasonAssists;
            return {
                x, y,
                id: p.id,
                name: p.name,
                team: p.team,
                position: p.position,
                xName: 'xA',
                yName: 'Assists',
                diff: y - x
            };
        });
    }, [filteredData, timeRange]);

    const ppmData = useMemo(() => {
        return filteredData.map(p => {
            const x = p.price;
            const points = timeRange === 'last6' ? p.last6Matches.reduce((sum, m) => sum + (m.points || 0), 0) : (p.totalPoints || 0);
            const y = x > 0 ? points / x : 0;
            return {
                x, y,
                id: p.id,
                name: p.name,
                team: p.team,
                position: p.position,
                xName: 'Price',
                yName: 'PPM'
            };
        });
    }, [filteredData, timeRange]);

    const renderChart = (data, title, xLabel, yLabel, xDomain = [0, 'auto']) => {
        const maxX = Math.max(...data.map(d => d.x), 1);
        const maxY = Math.max(...data.map(d => d.y), 1);
        const maxVal = Math.max(maxX, maxY);
        const activeId = selectedPlayerId || hoveredPlayerId;

        // For Goals and Assists, we want square axes to keep the diagonal line meaningful
        const chartDomain = xDomain[0] === 0 ? [0, Math.ceil(maxVal)] : xDomain;

        return (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 flex-1 min-w-[400px]">
                <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
                <div className="h-[400px] w-full" style={{ outline: 'none' }} tabIndex={-1}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                            style={{ outline: 'none' }}
                            onClick={(props) => {
                                // If props.activePayload is empty, we clicked on blank space
                                if (!props || !props.activePayload || props.activePayload.length === 0) {
                                    setSelectedPlayerId(null);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                type="number"
                                dataKey="x"
                                name={xLabel}
                                stroke="#a78bfa"
                                domain={chartDomain}
                                label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#a78bfa' }}
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                name={yLabel}
                                stroke="#a78bfa"
                                domain={chartDomain}
                                label={{ value: yLabel, angle: -90, position: 'center', fill: '#a78bfa' }}
                            />
                            <ZAxis type="number" range={[50, 400]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            {/* Only show diagonal line if both axes start at 0 (Goals/Assists) */}
                            {xDomain[0] === 0 && (
                                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: Math.ceil(maxVal), y: Math.ceil(maxVal) }]} stroke="#6366f1" strokeDasharray="5 5" />
                            )}

                            {/* Persistent ReferenceLines for Selected Player */}
                            {selectedPlayerId && data.find(d => d.id === selectedPlayerId) && (
                                <>
                                    <ReferenceLine
                                        x={data.find(d => d.id === selectedPlayerId).x}
                                        stroke="rgba(255,255,255,0.4)"
                                        strokeDasharray="3 3"
                                    />
                                    <ReferenceLine
                                        y={data.find(d => d.id === selectedPlayerId).y}
                                        stroke="rgba(255,255,255,0.4)"
                                        strokeDasharray="3 3"
                                    />
                                </>
                            )}
                            <Scatter
                                name="Players"
                                data={data}
                                onMouseEnter={(node) => setHoveredPlayerId(node.id)}
                                onMouseLeave={() => setHoveredPlayerId(null)}
                                onClick={(node, index, e) => {
                                    if (e && e.stopPropagation) e.stopPropagation();
                                    if (node && node.id) setSelectedPlayerId(node.id);
                                }}
                            >
                                {data.map((entry, index) => {
                                    const isSelected = entry.id === selectedPlayerId;
                                    const isHovered = entry.id === hoveredPlayerId;
                                    const isHighlighted = isSelected || isHovered;
                                    const isDimmed = (selectedPlayerId !== null || hoveredPlayerId !== null) && !isHighlighted;

                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={getPositionColor(entry.position)}
                                            stroke={isSelected ? '#fff' : (isHovered ? 'white' : (isDimmed ? 'none' : 'rgba(255,255,255,0.3)'))}
                                            strokeWidth={isSelected ? 4 : (isHovered ? 2 : (isDimmed ? 0 : 1))}
                                            fillOpacity={isHighlighted ? 1 : (isDimmed ? 0.15 : 0.8)}
                                            className="transition-all duration-200 cursor-pointer"
                                        />
                                    );
                                })}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPositionColor('DEF') }}></div>
                        <span className="text-blue-300">Defenders</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPositionColor('MID') }}></div>
                        <span className="text-green-300">Midfielders</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPositionColor('FWD') }}></div>
                        <span className="text-pink-300">Forwards</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPositionColor('GK') }}></div>
                        <span className="text-yellow-300">Goalkeepers</span>
                    </div>
                </div>
                {xDomain[0] === 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-purple-300 px-4">
                        <span>Underperforming (Expected &gt; Actual)</span>
                        <span>Overperforming (Actual &gt; Expected)</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Overs/Unders - Actual vs Expected Performance ({timeRange === 'last6' ? 'Last 6 Matches' : 'Entire Season'})</h2>

            <div className="flex flex-col gap-4 mb-8">
                {/* Filters Row */}
                <div className="flex gap-4 flex-wrap items-center bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex bg-white/10 p-1 rounded-lg mr-4">
                        <button
                            onClick={() => setTimeRange('last6')}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                timeRange === 'last6' ? "bg-white text-purple-900 shadow-lg" : "text-white hover:bg-white/10"
                            )}
                        >
                            Last 6 Matches
                        </button>
                        <button
                            onClick={() => setTimeRange('season')}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                timeRange === 'season' ? "bg-white text-purple-900 shadow-lg" : "text-white hover:bg-white/10"
                            )}
                        >
                            Entire Season
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-white text-sm">Min Mins:</label>
                        <input
                            type="range" min="0" max={maxMins} step="30"
                            value={minutesThreshold}
                            onChange={(e) => setMinutesThreshold(parseInt(e.target.value))}
                            className="w-32 accent-purple-500"
                        />
                        <span className="text-white text-sm font-semibold w-12">{minutesThreshold}</span>
                    </div>

                    <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="bg-white/20 text-white px-3 py-1.5 rounded-lg border border-white/30 text-sm"
                    >
                        <option value="ALL" className="text-black">All Teams</option>
                        {teams?.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                            <option key={t.id} value={t.id} className="text-black">{t.name}</option>
                        ))}
                    </select>

                    <select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="bg-white/20 text-white px-3 py-1.5 rounded-lg border border-white/30 text-sm"
                    >
                        <option value="ALL" className="text-black">All Positions</option>
                        <option value="DEF" className="text-black">Defenders</option>
                        <option value="MID" className="text-black">Midfielders</option>
                        <option value="FWD" className="text-black">Forwards</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Search player..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white/20 text-white px-3 py-1.5 rounded-lg border border-white/30 text-sm flex-1 min-w-[150px]"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {renderChart(goalsData, "Goals vs Expected Goals (xG)", "Expected Goals (xG)", "Actual Goals")}
                {renderChart(assistsData, "Assists vs Expected Assists (xA)", "Expected Assists (xA)", "Actual Assists")}
                {renderChart(ppmData, "Value (PPM) vs Price", "Price (£m)", "Points Per Million", [3.5, 'auto'])}
            </div>

            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-purple-200 text-sm">
                    <strong>How to read:</strong> Points above the dashed diagonal line represent players who are
                    <span className="text-green-400 font-semibold ml-1 mr-1">overperforming</span>
                    (scoring more than their xG/xA suggest). Points below the line are
                    <span className="text-red-400 font-semibold ml-1">underperforming</span>.
                </p>
                <p className="text-purple-300 text-xs mt-2 italic">
                    * Data based on {timeRange === 'last6' ? 'the last 6 matches played by each player' : 'the entire season to date'}.
                </p>
            </div>
        </div>
    );
};

export default OversUnders;
