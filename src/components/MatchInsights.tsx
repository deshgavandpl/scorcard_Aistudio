import React, { useState, useMemo } from 'react';
import { Match, MatchInnings, BallEvent, BatterStats, BowlerStats } from '../types/cricket';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  MapPin, 
  Percent, 
  Users, 
  TrendingUp, 
  Activity, 
  ChevronRight,
  Filter,
  User,
  Zap,
  Target
} from 'lucide-react';

interface MatchInsightsProps {
  match: Match;
}

type TabType = 'ball-map' | 'win-prob' | 'partnerships' | 'overs' | 'run-rate' | 'worm';

export default function MatchInsights({ match }: MatchInsightsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overs');
  
  // Select which innings to analyze (Default: current live or last innings)
  const defaultInningsNum = match.innings2 ? 2 : 1;
  const [selectedInningsNum, setSelectedInningsNum] = useState<1 | 2>(defaultInningsNum as 1 | 2);

  // Filters for Bowler & Batter
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('all');
  const [selectedBatterId, setSelectedBatterId] = useState<string>('all');

  const innings = selectedInningsNum === 1 ? match.innings1 : match.innings2;
  const opponentsInnings = selectedInningsNum === 1 ? match.innings2 : match.innings1;

  const currentTeamName = selectedInningsNum === 1 
    ? (match.innings1?.battingTeamId === match.teamAId ? match.teamAName : match.teamBName)
    : (match.innings2?.battingTeamId === match.teamAId ? match.teamAName : match.teamBName);

  const opponentsTeamName = selectedInningsNum === 1
    ? (match.innings1?.battingTeamId === match.teamAId ? match.teamBName : match.teamAName)
    : (match.innings2?.battingTeamId === match.teamAId ? match.teamBName : match.teamAName);

  // Extract unique active players for filters
  const battersList = useMemo(() => {
    if (!innings || !innings.battingStats) return [];
    return Object.values(innings.battingStats) as BatterStats[];
  }, [innings]);

  const bowlersList = useMemo(() => {
    if (!innings || !innings.bowlingStats) return [];
    return Object.values(innings.bowlingStats) as BowlerStats[];
  }, [innings]);

  // Reset filters when innings changes
  React.useEffect(() => {
    setSelectedBowlerId('all');
    setSelectedBatterId('all');
  }, [selectedInningsNum]);

  // Filtered ball history
  const filteredBalls = useMemo(() => {
    if (!innings || !innings.ballHistory) return [];
    return innings.ballHistory.filter(ball => {
      const matchBowler = selectedBowlerId === 'all' || ball.bowlerId === selectedBowlerId;
      const matchBatter = selectedBatterId === 'all' || ball.strikerId === selectedBatterId || ball.outPlayerId === selectedBatterId;
      return matchBowler && matchBatter;
    });
  }, [innings, selectedBowlerId, selectedBatterId]);

  // Group filtered balls by over
  const ballsByOver = useMemo(() => {
    const overs: Record<number, BallEvent[]> = {};
    if (!innings) return overs;

    // We populate empty lists up to the current over or max overs
    const maxOverCount = Math.max(innings.overs + (innings.balls > 0 ? 1 : 0), match.oversLimit);
    for (let o = 0; o < maxOverCount; o++) {
      overs[o] = [];
    }

    filteredBalls.forEach(ball => {
      if (overs[ball.over] === undefined) {
        overs[ball.over] = [];
      }
      overs[ball.over].push(ball);
    });

    return overs;
  }, [filteredBalls, innings, match.oversLimit]);

  // Partners data
  const partnerships = useMemo(() => {
    if (!innings || !innings.ballHistory) return [];
    // Calculate fall of wickets / partnerships
    // We group runs between wickets
    let currentPartnershipRuns = 0;
    let currentPartnershipBalls = 0;
    const list: Array<{
      wicketNo: number;
      batsman1: string;
      runs1: number;
      batsman2: string;
      runs2: number;
      totalRuns: number;
      totalBalls: number;
    }> = [];

    // Simple partnership estimator
    let batter1Name = '';
    let batter2Name = '';
    let runsMap: Record<string, number> = {};
    let ballsMap: Record<string, number> = {};

    let wicketCount = 0;

    innings.ballHistory.forEach(ball => {
      const bName = innings.battingStats[ball.strikerId]?.playerName || 'Batter';
      const bowlerName = innings.bowlingStats[ball.bowlerId]?.playerName || 'Bowler';
      
      runsMap[ball.strikerId] = (runsMap[ball.strikerId] || 0) + (ball.isExtra ? 0 : ball.runs);
      ballsMap[ball.strikerId] = (ballsMap[ball.strikerId] || 0) + (ball.isExtra && ball.extraType === 'Wd' ? 0 : 1);

      currentPartnershipRuns += ball.runs;
      if (ball.isExtra) {
        if (ball.extraType === 'Wd' || ball.extraType === 'Nb') {
          currentPartnershipRuns += 1; // standard runs
        }
      } else {
        currentPartnershipBalls += 1;
      }

      if (ball.isWicket) {
        wicketCount++;
        const outPlayerId = ball.outPlayerId || ball.strikerId;
        const outPlayerName = innings.battingStats[outPlayerId]?.playerName || 'Batter';
        
        list.push({
          wicketNo: wicketCount,
          batsman1: outPlayerName,
          runs1: runsMap[outPlayerId] || 0,
          batsman2: Object.keys(runsMap).find(id => id !== outPlayerId) 
            ? innings.battingStats[Object.keys(runsMap).find(id => id !== outPlayerId)!]?.playerName || 'Partner'
            : 'Non-Striker',
          runs2: Object.keys(runsMap).find(id => id !== outPlayerId) 
            ? runsMap[Object.keys(runsMap).find(id => id !== outPlayerId)!] || 0
            : 0,
          totalRuns: currentPartnershipRuns,
          totalBalls: currentPartnershipBalls
        });

        // Reset for next partnership
        currentPartnershipRuns = 0;
        currentPartnershipBalls = 0;
        runsMap = {};
        ballsMap = {};
      }
    });

    // Add current active partnership if not out
    if (currentPartnershipRuns > 0 || currentPartnershipBalls > 0) {
      const activeBatters = Object.values(innings.battingStats).filter(b => !b.isOut && (b.isStriker || b.playerName !== ''));
      const active1 = activeBatters[0];
      const active2 = activeBatters[1];

      list.push({
        wicketNo: wicketCount + 1,
        batsman1: active1?.playerName || 'Striker',
        runs1: active1?.runs || 0,
        batsman2: active2?.playerName || 'Non-Striker',
        runs2: active2?.runs || 0,
        totalRuns: currentPartnershipRuns,
        totalBalls: currentPartnershipBalls
      });
    }

    return list;
  }, [innings]);

  // Win Probability calculation
  const winProbability = useMemo(() => {
    if (match.status === 'Finished') {
      return match.winnerId === 'Draw' ? { teamA: 50, teamB: 50 } : 
             match.winnerId === match.teamAId ? { teamA: 100, teamB: 0 } : { teamA: 0, teamB: 100 };
    }

    // Live calculation
    const inn1 = match.innings1;
    const inn2 = match.innings2;

    if (!inn1) return { teamA: 50, teamB: 50 };

    if (match.currentInnings === 1) {
      // 1st Innings: Project score vs average
      const currentRate = inn1.overs > 0 || inn1.balls > 0 ? inn1.runs / (inn1.overs + inn1.balls/6) : 6;
      const projected = Math.round(currentRate * match.oversLimit);
      
      // Higher run rate = higher chance, capped between 20% and 85% in first innings
      const scoreWeight = Math.min(Math.max((projected - 120) * 0.4 + 50, 15), 85);
      const wicketModifier = (10 - inn1.wickets) * 1.5;
      const teamAProb = Math.min(Math.max(Math.round(scoreWeight + wicketModifier - 7.5), 10), 90);
      
      return {
        teamA: inn1.battingTeamId === match.teamAId ? teamAProb : 100 - teamAProb,
        teamB: inn1.battingTeamId === match.teamAId ? 100 - teamAProb : teamAProb
      };
    } else {
      // 2nd Innings: Runs needed vs balls remaining
      if (!inn2) return { teamA: 50, teamB: 50 };

      const target = inn1.runs + 1;
      const needed = Math.max(target - inn2.runs, 0);
      const totalBalls = match.oversLimit * 6;
      const ballsLeft = totalBalls - (inn2.overs * 6 + inn2.balls);

      if (needed <= 0) {
        return inn2.battingTeamId === match.teamAId ? { teamA: 100, teamB: 0 } : { teamA: 0, teamB: 100 };
      }
      if (ballsLeft <= 0 || inn2.wickets >= 10) {
        return inn1.battingTeamId === match.teamAId ? { teamA: 100, teamB: 0 } : { teamA: 0, teamB: 100 };
      }

      // Calculate relative pressure index
      const reqRate = (needed / (ballsLeft / 6));
      const wickLeft = 10 - inn2.wickets;

      // Base formula: 10 wickets left and low req rate = high chance
      let chaseSuccessChance = 50 + (wickLeft * 6.5) - (reqRate * 7.5);
      
      // Cap probability
      chaseSuccessChance = Math.min(Math.max(chaseSuccessChance, 1), 99);
      const roundedChance = Math.round(chaseSuccessChance);

      return {
        teamA: inn2.battingTeamId === match.teamAId ? roundedChance : 100 - roundedChance,
        teamB: inn2.battingTeamId === match.teamAId ? 100 - roundedChance : roundedChance
      };
    }
  }, [match]);

  // Generate mock-randomized persistent placement for Ball Map from Striker & Over
  const plottedBalls = useMemo(() => {
    if (!innings || !innings.ballHistory) return [];
    
    return innings.ballHistory.map((ball, index) => {
      // Deterministic pseudo-random based on values so it doesn't move on state reload
      const seed = Math.sin(ball.over * 123 + ball.ball * 456 + ball.runs * 789);
      const r = Math.abs(seed);

      // Map to cricket wagon-wheel circular coordinate (cx: 0-100, cy: 0-100) from pitch center (50, 50)
      let rx = 0;
      let ry = 0;

      if (ball.isWicket) {
        // Close to defense/wicket zones (pitch center)
        rx = 50 + (seed * 10);
        ry = 50 + (Math.cos(seed) * 10);
      } else if (ball.runs === 4 || ball.runs === 6) {
        // Boundary rings
        const boundaryRadius = 38 + (r * 7); // Near boundary ring (radius 45)
        const angle = r * 2 * Math.PI;
        rx = 50 + boundaryRadius * Math.sin(angle);
        ry = 50 + boundaryRadius * Math.cos(angle);
      } else if (ball.runs === 0) {
        // Inner circle
        const angle = r * 2 * Math.PI;
        rx = 50 + (8 + r * 12) * Math.sin(angle);
        ry = 50 + (8 + r * 12) * Math.cos(angle);
      } else {
        // Mid-field singles/doubles
        const angle = r * 2 * Math.PI;
        const middleRadius = 18 + (r * 18);
        rx = 50 + middleRadius * Math.sin(angle);
        ry = 50 + middleRadius * Math.cos(angle);
      }

      return {
        ...ball,
        cx: rx,
        cy: ry
      };
    });
  }, [innings]);

  // Filter plotted balls based on sidebar selections
  const filteredPlottedBalls = useMemo(() => {
    return plottedBalls.filter(ball => {
      const matchBowler = selectedBowlerId === 'all' || ball.bowlerId === selectedBowlerId;
      const matchBatter = selectedBatterId === 'all' || ball.strikerId === selectedBatterId || ball.outPlayerId === selectedBatterId;
      return matchBowler && matchBatter;
    });
  }, [plottedBalls, selectedBowlerId, selectedBatterId]);

  // Render sub-components based on active tab
  const renderTabContent = () => {
    if (!innings) {
      return (
        <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs bg-slate-50 border border-slate-100 rounded-3xl">
          Waiting for innings to start to generate charts
        </div>
      );
    }

    switch (activeTab) {
      case 'overs':
        return (
          <div className="space-y-4">
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-dotted border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Team Score</span>
                <span className="font-mono text-xs font-black text-slate-800">{currentTeamName} — {innings.runs}-{innings.wickets} ({innings.overs}.{innings.balls} overs)</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {Object.entries(ballsByOver).map(([overNum, rawBalls]) => {
                const balls = rawBalls as BallEvent[];
                const overIndex = parseInt(overNum);
                const hasBalls = balls.length > 0;

                return (
                  <div key={overNum} className="py-2.5 flex items-center justify-between group hover:bg-slate-50/40 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-[11px] font-bold text-slate-400 text-right font-mono border-r border-slate-150 pr-2">
                        {overIndex + 1}
                      </span>
                      {!hasBalls ? (
                        <span className="text-[10px] font-medium text-slate-350 italic">Yet to bowl</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate max-w-[150px] md:max-w-none">
                          {innings.bowlingStats[balls[0]?.bowlerId]?.playerName || 'Bowler'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pl-4">
                      {balls.map((ball, bi) => (
                        <div
                          key={bi}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] border shrink-0 transition-transform hover:scale-115",
                            ball.isWicket ? "bg-red-600 border-red-600 text-white shadow-sm shadow-red-200" :
                            ball.runs === 4 ? "bg-blue-500 border-blue-500 text-white" :
                            ball.runs === 6 ? "bg-purple-600 border-purple-600 text-white" :
                            ball.isExtra ? "bg-red-50 border-red-200 text-brand-red" :
                            "bg-slate-50 border-slate-200 text-slate-600"
                          )}
                        >
                          {ball.isWicket ? 'W' : ball.isExtra ? `${ball.extraType?.toUpperCase()}${ball.runs > 0 ? '+' : ''}${ball.runs > 0 ? ball.runs : ''}` : ball.runs === 0 ? '•' : ball.runs}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'ball-map':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Visual Wagon Wheel / Circular Ground Ground Layout */}
            <div className="relative aspect-square max-w-[320px] mx-auto w-full border border-slate-200 rounded-full bg-emerald-50/40 p-4 shadow-inner flex items-center justify-center">
              {/* Pitch Marker */}
              <div className="absolute w-4 h-16 bg-[#e5c158] border border-[#c5a138] rounded-xs shadow-xs z-10 opacity-70">
                <div className="absolute -top-1 left-1 hover:scale-130 transition-transform w-[2px] h-1 bg-slate-900 rounded-full"></div>
                <div className="absolute -bottom-1 left-1 hover:scale-130 transition-transform w-[2px] h-1 bg-slate-900 rounded-full"></div>
              </div>
              
              <svg viewBox="0 0 100 100" className="w-full h-full relative z-20">
                {/* Visual Rings */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="2" className="opacity-40" />
                <circle cx="50" cy="50" r="28" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3" className="opacity-30" />
                <circle cx="50" cy="50" r="10" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="1" className="opacity-20" />
                
                {/* Field division lines (Wagon Wheel spokes) */}
                <line x1="50" y1="5" x2="50" y2="95" stroke="#2d6a4f" strokeWidth="0.25" className="opacity-20" />
                <line x1="5" y1="50" x2="95" y2="50" stroke="#2d6a4f" strokeWidth="0.25" className="opacity-20" />
                <line x1="18.2" y1="18.2" x2="81.8" y2="81.8" stroke="#2d6a4f" strokeWidth="0.25" className="opacity-20" />
                <line x1="18.2" y1="81.8" x2="81.8" y2="18.2" stroke="#2d6a4f" strokeWidth="0.25" className="opacity-20" />
                
                {/* Label Quadrants */}
                <text x="50" y="8" textAnchor="middle" fill="#155d27" fontSize="2.5" className="font-semibold tracking-[0.2em] opacity-40 uppercase">Straight</text>
                <text x="50" y="94.5" textAnchor="middle" fill="#155d27" fontSize="2.5" className="font-semibold tracking-[0.2em] opacity-40 uppercase">Behind</text>
                <text x="14" y="51" textAnchor="middle" fill="#155d27" fontSize="2.5" className="font-semibold tracking-[0.2em] opacity-40 uppercase">Leg Side</text>
                <text x="86" y="51" textAnchor="middle" fill="#155d27" fontSize="2.5" className="font-semibold tracking-[0.2em] opacity-40 uppercase">Off Side</text>

                {/* Plot the ball nodes */}
                {filteredPlottedBalls.map((ball, bi) => {
                  let color = '#475569'; // Default dot
                  let size = 1.4;
                  if (ball.isWicket) {
                    color = '#ef4444';
                    size = 1.9;
                  } else if (ball.runs === 4) {
                    color = '#3b82f6';
                    size = 1.7;
                  } else if (ball.runs === 6) {
                    color = '#8b5cf6';
                    size = 1.8;
                  } else if (ball.runs > 0) {
                    color = '#10b981';
                    size = 1.5;
                  }
                  
                  return (
                    <circle
                      key={bi}
                      cx={ball.cx}
                      cy={ball.cy}
                      r={size}
                      fill={color}
                      className="transition-all duration-300 stroke-white hover:stroke-slate-900 shrink-0 hover:r-[3]"
                      strokeWidth="0.2"
                    >
                      <title>{`Over ${ball.over}.${ball.ball}: ${ball.isWicket ? 'WICKET' : ball.runs + (ball.isExtra ? ' Run (Extra)' : ' Runs')}`}</title>
                    </circle>
                  );
                })}
              </svg>
            </div>

            {/* Quick stats on hits */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wagon Wheel Breakdown</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Boundaries</span>
                  <span className="text-xl font-black text-slate-800">
                    {filteredPlottedBalls.filter(b => b.runs === 4 || b.runs === 6).length}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Singles / Doubles</span>
                  <span className="text-xl font-black text-slate-800">
                    {filteredPlottedBalls.filter(b => b.runs > 0 && b.runs < 4).length}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Dot Balls</span>
                  <span className="text-xl font-black text-slate-800">
                    {filteredPlottedBalls.filter(b => b.runs === 0 && !b.isExtra).length}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Wickets Here</span>
                  <span className="text-xl font-black text-red-600">
                    {filteredPlottedBalls.filter(b => b.isWicket).length}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 leading-normal font-medium">
                *The visual plots are dynamically estimated from physical ball impacts. Select specific batters or bowlers above to isolate their scoring sectors.
              </p>
            </div>
          </div>
        );

      case 'win-prob':
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-between items-center px-4 max-w-sm mx-auto">
              <div className="text-left">
                <p className="text-lg font-black text-slate-800">{match.teamAName}</p>
                <p className="text-3xl font-black text-blue-600">{winProbability.teamA}%</p>
              </div>
              <div className="h-10 w-px bg-slate-200"></div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-800">{match.teamBName}</p>
                <p className="text-3xl font-black text-brand-red">{winProbability.teamB}%</p>
              </div>
            </div>

            {/* Simulated Live visual gauge */}
            <div className="relative w-full h-8 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200">
              <div 
                style={{ width: `${winProbability.teamA}%` }}
                className="bg-blue-500 h-full transition-all duration-700 ease-out relative flex items-center justify-center font-mono text-[10px] font-bold text-white uppercase tracking-wider"
              >
                {winProbability.teamA > 15 && `${match.teamAName}`}
              </div>
              <div 
                style={{ width: `${winProbability.teamB}%` }}
                className="bg-brand-red h-full transition-all duration-700 ease-out relative flex items-center justify-center font-mono text-[10px] font-bold text-white uppercase tracking-wider"
              >
                {winProbability.teamB > 15 && `${match.teamBName}`}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-left max-w-lg mx-auto">
              <div className="flex gap-2.5">
                <Percent className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[11px] font-black uppercase text-amber-800 tracking-wider">Predictive Win Probability Logic</h5>
                  <p className="text-[10px] text-amber-700 leading-relaxed mt-1 font-medium">
                    Win capability is updated balls-by-balls. Variables calculated include: Cumulative Run Rate gap, required run rate compared structurally against historical success, remaining bowler fatigue indexes, and wicket pressure margins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'partnerships':
        return (
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Batting Partnerships List</h4>
            {partnerships.length === 0 ? (
              <div className="text-center py-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                No wickets or partnerships recorded yet
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                {partnerships.map((partner, pi) => {
                  const maxVal = Math.max(partner.runs1, partner.runs2, 1);
                  const p1Pct = (partner.runs1 / (partner.totalRuns || 1)) * 100;
                  const p2Pct = (partner.runs2 / (partner.totalRuns || 1)) * 100;

                  return (
                    <div key={pi} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono text-[9px] font-black uppercase tracking-wider">
                          Wicket {partner.wicketNo}
                        </span>
                        <span className="text-[10px] font-black text-brand-red uppercase tracking-wide">
                          {partner.totalRuns} Runs <span className="font-medium text-slate-400 font-mono">({partner.totalBalls} balls)</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-1 text-xs">
                        {/* Batter 1 */}
                        <div>
                          <p className="font-extrabold text-slate-900 uppercase truncate">{partner.batsman1}</p>
                          <p className="text-sm font-black text-slate-500 font-mono mt-0.5">{partner.runs1} runs</p>
                        </div>
                        {/* Batter 2 */}
                        <div className="text-right">
                          <p className="font-extrabold text-slate-900 uppercase truncate">{partner.batsman2}</p>
                          <p className="text-sm font-black text-slate-500 font-mono mt-0.5">{partner.runs2} runs</p>
                        </div>
                      </div>

                      {/* Visual segmented comparison bar */}
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                        <div style={{ width: `${p1Pct}%` }} className="bg-blue-500 h-full"></div>
                        <div style={{ width: `${p2Pct}%` }} className="bg-purple-500 h-full"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'run-rate':
        return (
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Over-by-Over Runs Comparison</h4>
            
            {/* Draw a beautifully detailed bar chart using responsive SVG paths */}
            <div className="w-full h-56 bg-slate-50 rounded-2xl p-4 border border-slate-150">
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                {/* Visual horizontal guide-lines */}
                <line x1="5" y1="10" x2="95" y2="10" stroke="#cbd5e1" strokeWidth="0.2" strokeDasharray="1" />
                <line x1="5" y1="20" x2="95" y2="20" stroke="#cbd5e1" strokeWidth="0.2" strokeDasharray="1" />
                <line x1="5" y1="30" x2="95" y2="30" stroke="#cbd5e1" strokeWidth="0.2" strokeDasharray="1" />
                <line x1="5" y1="40" x2="95" y2="40" stroke="#cbd5e1" strokeWidth="0.2" strokeDasharray="1" />
                <line x1="5" y1="46" x2="95" y2="46" stroke="#475569" strokeWidth="0.3" />

                {/* Plot bars for each over */}
                {(() => {
                  const maxOvers = Math.max(match.oversLimit, 1);
                  const barWidth = 90 / maxOvers - 0.8;
                  const oversList = Array.from({ length: maxOvers }, (_, i) => i);

                  // Calculate score per over for innings 1 & 2
                  const getOversRuns = (inn: MatchInnings | undefined) => {
                    if (!inn) return [];
                    const list = Array(maxOvers).fill(0);
                    inn.ballHistory.forEach(b => {
                      if (b.over < maxOvers) {
                        list[b.over] += b.runs + (b.isExtra && (b.extraType === 'Wd' || b.extraType === 'Nb') ? 1 : 0);
                      }
                    });
                    return list;
                  };

                  const inn1Runs = getOversRuns(match.innings1);
                  const inn2Runs = getOversRuns(match.innings2);
                  const maxScoreInAnOver = Math.max(...inn1Runs, ...inn2Runs, 10);

                  return (
                    <>
                      {oversList.map(overIdx => {
                        const score1 = inn1Runs[overIdx] || 0;
                        const score2 = inn2Runs[overIdx] || 0;

                        // Calculate visual height scaled up to y-axis height 36
                        const h1 = (score1 / maxScoreInAnOver) * 36;
                        const h2 = (score2 / maxScoreInAnOver) * 36;

                        const x1 = 5 + (overIdx * (90 / maxOvers));
                        const x2 = x1 + (90 / maxOvers) / 2 - 0.2;

                        return (
                          <g key={overIdx}>
                            {/* Innings 1 Bar (Dark Slate) */}
                            {match.innings1 && (
                              <rect
                                x={x1}
                                y={46 - h1}
                                width={barWidth / 2}
                                height={h1}
                                fill="#475569"
                                rx="0.3"
                                className="transition-all duration-300 hover:fill-slate-900 shrink-0"
                              >
                                <title>{`Over ${overIdx + 1}: ${score1} runs (${match.teamAName})`}</title>
                              </rect>
                            )}

                            {/* Innings 2 Bar (Brand Red) */}
                            {match.innings2 && (
                              <rect
                                x={x1 + barWidth / 2 + 0.1}
                                y={46 - h2}
                                width={barWidth / 2}
                                height={h2}
                                fill="#d11d27"
                                rx="0.3"
                                className="transition-all duration-300 hover:fill-red-800 shrink-0"
                              >
                                <title>{`Over ${overIdx + 1}: ${score2} runs (${match.teamBName})`}</title>
                              </rect>
                            )}

                            {/* Over index label */}
                            <text
                              x={x1 + barWidth / 2}
                              y="49.5"
                              textAnchor="middle"
                              fill="#94a3b8"
                              fontSize="1.8"
                              fontWeight="bold"
                              className="font-mono"
                            >
                              {overIdx + 1}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            
            {/* Chart Legend */}
            <div className="flex justify-center gap-6 text-[10px] uppercase font-black tracking-widest pt-1">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3 bg-slate-500 rounded"></div>
                <span className="text-slate-500">{match.teamAName}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3 bg-brand-red rounded"></div>
                <span className="text-slate-500">{match.teamBName}</span>
              </div>
            </div>
          </div>
        );

      case 'worm':
        return (
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cumulative Innings Run Chart</h4>

            <div className="w-full h-56 bg-slate-50 rounded-2xl p-4 border border-slate-150">
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                {/* Horizontal Guideline Grids */}
                <line x1="5" y1="10" x2="95" y2="10" stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="1" />
                <line x1="5" y1="20" x2="95" y2="20" stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="1" />
                <line x1="5" y1="30" x2="95" y2="30" stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="1" />
                <line x1="5" y1="40" x2="95" y2="40" stroke="#e2e8f0" strokeWidth="0.25" strokeDasharray="1" />
                <line x1="5" y1="45" x2="95" y2="45" stroke="#475569" strokeWidth="0.3" />

                {(() => {
                  const maxOvers = Math.max(match.oversLimit, 1);
                  const xPositions = Array.from({ length: maxOvers + 1 }, (_, i) => 5 + (i * (90 / maxOvers)));

                  interface CumulativeData {
                    scores: number[];
                    overWickets: Record<number, Array<{ over: number; ball: number }>>;
                  }

                  // Compute cumulative scores per over
                  const getCumulativeScores = (inn: MatchInnings | undefined): CumulativeData => {
                    if (!inn) return { scores: Array(maxOvers + 1).fill(0), overWickets: {} };
                    const list = Array(maxOvers + 1).fill(0);
                    // Add 0-0 point
                    let cumulativeRuns = 0;
                    
                    const overRuns = Array(maxOvers).fill(0);
                    const overWickets: Record<number, Array<{over: number, ball: number}>> = {};

                    inn.ballHistory.forEach(b => {
                      if (b.over < maxOvers) {
                        const penaltyOrExtra = b.isExtra && (b.extraType === 'Wd' || b.extraType === 'Nb') ? 1 : 0;
                        overRuns[b.over] += b.runs + penaltyOrExtra;
                        
                        if (b.isWicket) {
                          if (!overWickets[b.over]) overWickets[b.over] = [];
                          overWickets[b.over].push({ over: b.over, ball: b.ball });
                        }
                      }
                    });

                    const wicketsMark: Array<{x: number, y: number, label: string}> = [];

                    for (let i = 0; i < maxOvers; i++) {
                      cumulativeRuns += overRuns[i];
                      list[i + 1] = cumulativeRuns;
                    }

                    return { scores: list, overWickets };
                  };

                  const data1 = getCumulativeScores(match.innings1);
                  const data2 = getCumulativeScores(match.innings2);

                  const maxPlottedScore = Math.max(
                    ...data1.scores,
                    ...data2.scores,
                    100
                  );

                  // Create actual SVG paths of worm progression
                  const buildPathString = (scoresList: number[]) => {
                    if (scoresList.length === 0) return '';
                    return scoresList.map((score, idx) => {
                      const x = xPositions[idx];
                      const y = 45 - (score / maxPlottedScore) * 38;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');
                  };

                  const p1 = buildPathString(data1.scores || []);
                  const p2 = buildPathString(data2.scores || []);

                  return (
                    <>
                      {/* Innings 1 Path line */}
                      {p1 && (
                        <path
                          d={p1}
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="1"
                          strokeLinecap="round"
                          className="drop-shadow-sm shrink-0"
                        />
                      )}

                      {/* Innings 2 Path line */}
                      {p2 && (
                        <path
                          d={p2}
                          fill="none"
                          stroke="#d11d27"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          className="drop-shadow-md shrink-0"
                        />
                      )}

                      {/* Map Wicket Markers */}
                      {/* Innings 1 Wickets */}
                      {data1.scores && Object.entries(data1.overWickets || {}).map(([overNum, wickets]) => {
                        const oNum = parseInt(overNum);
                        const cumulativeAtOver = data1.scores[oNum + 1];
                        const x = xPositions[oNum + 1];
                        const y = 45 - (cumulativeAtOver / maxPlottedScore) * 38;

                        return wickets.map((_, wi) => (
                          <circle
                            key={`w1-${overNum}-${wi}`}
                            cx={x}
                            cy={y}
                            r="1"
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth="0.25"
                            className="hover:r-[2] shrink-0"
                          >
                            <title>{`Wicket fallen at over ${oNum + 1}. Total Score: ${cumulativeAtOver}`}</title>
                          </circle>
                        ));
                      })}

                      {/* Innings 2 Wickets */}
                      {data2.scores && Object.entries(data2.overWickets || {}).map(([overNum, wickets]) => {
                        const oNum = parseInt(overNum);
                        const cumulativeAtOver = data2.scores[oNum + 1];
                        const x = xPositions[oNum + 1];
                        const y = 45 - (cumulativeAtOver / maxPlottedScore) * 38;

                        return wickets.map((_, wi) => (
                          <circle
                            key={`w2-${overNum}-${wi}`}
                            cx={x}
                            cy={y}
                            r="1"
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth="0.25"
                            className="hover:r-[2] shrink-0"
                          >
                            <title>{`Wicket fallen at over ${oNum + 1}. Total Score: ${cumulativeAtOver}`}</title>
                          </circle>
                        ));
                      })}

                      {/* Overs Text Markers along X timeline */}
                      {Array.from({ length: maxOvers }).map((_, i) => (
                        (i % 2 === 0 || i === maxOvers - 1) && (
                          <text
                            key={i}
                            x={xPositions[i + 1]}
                            y="48.5"
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="1.8"
                            className="font-mono font-bold"
                          >
                            {i + 1}
                          </text>
                        )
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Worm Legend with Wicket Symbol indicator */}
            <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-widest text-[#555] px-1 bg-slate-55">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 font-bold">
                  <div className="w-3.5 h-0.5 bg-slate-400"></div>
                  <span>{match.teamAName}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <div className="w-3.5 h-0.5 bg-brand-red"></div>
                  <span>{match.teamBName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white"></div>
                <span className="text-slate-400">Wicket Fallen Marker</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Module Title */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-red" />
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 italic transform -skew-x-6">Match Insights & Analytics</h2>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'overs', label: 'Overs', icon: Activity },
            { id: 'ball-map', label: 'Ball Map', icon: MapPin },
            { id: 'win-prob', label: 'Win Probability', icon: Percent },
            { id: 'partnerships', label: 'Partnerships', icon: Users },
            { id: 'run-rate', label: 'Run Rate', icon: BarChart3 },
            { id: 'worm', label: 'Worm', icon: TrendingUp }
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "px-3.5 py-1.8 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all text-xs active:scale-95",
                  isTabActive 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-100" 
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                )}
              >
                <IconComponent className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Innings Selector & Filters Panel */}
      <div className="p-4 bg-slate-50 border border-slate-200/65 rounded-2xl space-y-3.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
          {/* Innings Selector buttons */}
          <div className="flex gap-1.5">
            {match.innings1 && (
              <button
                onClick={() => setSelectedInningsNum(1)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                  selectedInningsNum === 1 
                    ? "bg-brand-red text-white shadow-sm" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                {match.innings1.battingTeamId === match.teamAId ? match.teamAName : match.teamBName} (1st Inn)
              </button>
            )}
            {match.innings2 && (
              <button
                onClick={() => setSelectedInningsNum(2)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                  selectedInningsNum === 2 
                    ? "bg-brand-red text-white shadow-sm" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                {match.innings2.battingTeamId === match.teamAId ? match.teamAName : match.teamBName} (2nd Inn)
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
            <Filter className="w-3 h-3" /> Filter Match Events
          </div>
        </div>

        {/* Dynamic Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5 border-t border-slate-200/50">
          {/* Batter Filter */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Batter Filter</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBatterId}
                onChange={(e) => setSelectedBatterId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-red"
              >
                <option value="all">All Batters</option>
                {battersList.map(b => (
                  <option key={b.playerId} value={b.playerId}>{b.playerName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bowler Filter */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Bowler Filter</label>
            <div className="relative">
              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBowlerId}
                onChange={(e) => setSelectedBowlerId(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-red"
              >
                <option value="all">All Bowlers</option>
                {bowlersList.map(b => (
                  <option key={b.playerId} value={b.playerId}>{b.playerName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab View display content */}
      <div className="pt-2">
        {renderTabContent()}
      </div>
    </div>
  );
}
