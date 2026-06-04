import React from 'react';
import { Match, MatchInnings, BatterStats, BowlerStats } from '../types/cricket';
import { cn } from '../lib/utils';
import { Zap, Trophy } from 'lucide-react';
import { usePlayerProfile } from '../context/PlayerProfileContext';

interface ScorecardProps {
  match: Match;
  innings: MatchInnings;
  inningsNumber: number;
}

export default function Scorecard({ match, innings, inningsNumber }: ScorecardProps) {
  const { openPlayerProfile } = usePlayerProfile();
  const [activeTab, setActiveTab ] = React.useState<'batting' | 'bowling'>('batting');
  
  const battingTeamName = innings.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
  const bowlingTeamName = innings.bowlingTeamId === match.teamAId ? match.teamAName : match.teamBName;

  const batsmen = Object.values(innings.battingStats || {}).sort((a, b) => (a.order || 0) - (b.order || 0));
  const bowlers = Object.values(innings.bowlingStats || {});

  const getThemeConfig = () => {
    const themeColor = match.themeColor || 'red';
    if (themeColor === 'blue') {
      return {
        text: 'text-blue-600',
        textLight: 'text-blue-500',
        bgStriker: 'bg-blue-50/30',
        hoverText: 'group-hover/player:text-blue-600 hover:text-blue-600',
        fill: 'fill-blue-600 text-blue-600',
        bg: 'bg-blue-600'
      };
    } else if (themeColor === 'green') {
      return {
        text: 'text-emerald-600',
        textLight: 'text-emerald-500',
        bgStriker: 'bg-emerald-50/30',
        hoverText: 'group-hover/player:text-emerald-600 hover:text-emerald-600',
        fill: 'fill-emerald-600 text-emerald-600',
        bg: 'bg-emerald-600'
      };
    }
    // Default red
    return {
      text: 'text-brand-red',
      textLight: 'text-red-500',
      bgStriker: 'bg-red-50/30',
      hoverText: 'group-hover/player:text-brand-red hover:text-brand-red',
      fill: 'fill-brand-red text-brand-red',
      bg: 'bg-brand-red'
    };
  };

  const themeConfig = getThemeConfig();

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      {/* Mobile Tabs */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl border border-slate-200 w-full">
        <button
          onClick={() => setActiveTab('batting')}
          className={cn(
            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'batting' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          )}
        >
          Batting
        </button>
        <button
          onClick={() => setActiveTab('bowling')}
          className={cn(
            "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'bowling' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          )}
        >
          Bowling
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Batting Section */}
        <div className={cn(
          "bg-slate-50 rounded-2xl p-4 border border-slate-200 h-full",
          activeTab !== 'batting' && "hidden lg:block"
        )}>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
              Innings {inningsNumber}: {battingTeamName}
            </h3>
            <div className="text-right">
              <p className={cn("text-2xl font-black tracking-tight", themeConfig.text)}>
                {innings.runs}/{innings.wickets}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {innings.overs}.{innings.balls} Overs
              </p>
            </div>
          </div>
          
          {/* Batsmen Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Batsman</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">R</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">B</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">4s</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">6s</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">SR</th>
                </tr>
              </thead>
              <tbody>
                {batsmen.map((b) => {
                  const isNonStriker = !b.isStriker && !b.isOut;
                  
                  return (
                    <tr key={b.playerId} className={cn("border-b border-slate-100 last:border-0", (b.isStriker || isNonStriker) && themeConfig.bgStriker)}>
                      <td className="py-3 pr-4">
                        <button 
                          onClick={() => openPlayerProfile(b.playerId, b.playerName)}
                          className="flex flex-col text-left group/player"
                        >
                          <span className={cn("font-bold text-sm flex items-center gap-1 group-hover/player:text-brand-red transition-colors", b.isStriker ? themeConfig.text : isNonStriker ? "text-slate-900" : "text-slate-600", themeConfig.hoverText)}>
                            <span className="text-[10px] text-slate-300 w-4">{b.order || '-'}</span>
                            {b.playerName}{b.isStriker ? '*' : ''}
                            {b.isStriker && <Zap className={cn("w-3 h-3", themeConfig.fill)} />}
                            {match.manOfTheMatch && b.playerName.toLowerCase().trim() === match.manOfTheMatch.toLowerCase().trim() && (
                              <span className="inline-flex items-center gap-0.5 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm ml-1 animate-pulse">
                                <Trophy className="w-2 h-2 fill-white" /> MVP
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium italic">
                            {b.isOut ? (b.howOut || 'Out') : 'Not Out'}
                          </span>
                        </button>
                      </td>
                      <td className="py-3 text-right font-black text-sm">{b.runs}</td>
                      <td className="py-3 text-right text-slate-500 text-xs">{b.balls}</td>
                      <td className="py-3 text-right text-slate-500 text-xs">{b.fours}</td>
                      <td className="py-3 text-right text-slate-500 text-xs">{b.sixes}</td>
                      <td className="py-3 text-right text-slate-500 text-xs">
                        {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Extras</span>
            <span className="text-sm font-bold">
              {innings.extras.wide + innings.extras.noBall + innings.extras.bye + innings.extras.legBye}
              <span className="text-[10px] text-slate-400 ml-2">
                (W {innings.extras.wide}, NB {innings.extras.noBall}, B {innings.extras.bye}, LB {innings.extras.legBye})
              </span>
            </span>
          </div>
        </div>

        {/* Bowling Section */}
        <div className={cn(
          "bg-slate-50 rounded-2xl p-4 border border-slate-200 h-full",
          activeTab !== 'bowling' && "hidden lg:block"
        )}>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
            Bowling: {bowlingTeamName}
          </h3>
          
          {/* Bowlers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Bowler</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">O</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">M</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">R</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">W</th>
                  <th className="py-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">Econ</th>
                </tr>
              </thead>
              <tbody>
                {bowlers.map((b) => {
                  const isCurrentBowler = innings.currentBowlerId === b.playerId;
                  return (
                    <tr key={b.playerId} className={cn("border-b border-slate-100 last:border-0", isCurrentBowler && "bg-slate-900/5")}>
                      <td className="py-3 pr-4">
                        <button 
                          onClick={() => openPlayerProfile(b.playerId, b.playerName)}
                          className={cn("font-bold text-sm flex items-center gap-2 transition-colors text-left", themeConfig.hoverText)}
                        >
                          {b.playerName}
                          {isCurrentBowler && <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", themeConfig.bg)}></span>}
                          {match.manOfTheMatch && b.playerName.toLowerCase().trim() === match.manOfTheMatch.toLowerCase().trim() && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                              <Trophy className="w-2 h-2 fill-white" /> MVP
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 text-right text-slate-500 text-xs">{b.overs}.{b.balls}</td>
                      <td className="py-3 text-right text-slate-500 text-xs">{b.maiden}</td>
                      <td className="py-3 text-right font-black text-sm">{b.runs}</td>
                      <td className={cn("py-3 text-right font-black text-sm", themeConfig.textLight)}>{b.wickets}</td>
                      <td className="py-3 text-right text-slate-500 text-xs">
                        {b.overs > 0 || b.balls > 0 ? (b.runs / (b.overs + b.balls/6)).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
