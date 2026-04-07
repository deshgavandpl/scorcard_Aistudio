import React from 'react';
import { Match, MatchInnings, BatterStats, BowlerStats } from '../types/cricket';
import { cn } from '../lib/utils';
import { Zap } from 'lucide-react';
import { usePlayerProfile } from '../context/PlayerProfileContext';

interface ScorecardProps {
  match: Match;
  innings: MatchInnings;
  inningsNumber: number;
}

export default function Scorecard({ match, innings, inningsNumber }: ScorecardProps) {
  const { openPlayerProfile } = usePlayerProfile();
  const [activeTab, setActiveTab] = React.useState<'batting' | 'bowling'>('batting');
  
  const battingTeamName = innings.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
  const bowlingTeamName = innings.bowlingTeamId === match.teamAId ? match.teamAName : match.teamBName;

  const batsmen = Object.values(innings.battingStats || {});
  const bowlers = Object.values(innings.bowlingStats || {});

  return (
    <div className="space-y-4">
      {/* Mobile Tabs */}
      <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl border border-slate-200">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batting Section */}
        <div className={cn(
          "bg-slate-50 rounded-2xl p-4 border border-slate-200 h-full",
          activeTab !== 'batting' && "hidden lg:block"
        )}>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
            Innings {inningsNumber}: {battingTeamName}
          </h3>
          
          {/* Batsmen Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Batsman</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">R</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">B</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">4s</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">6s</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">SR</th>
                </tr>
              </thead>
              <tbody>
                {batsmen.map((b) => {
                  const isNonStriker = !b.isStriker && !b.isOut;
                  
                  return (
                    <tr key={b.playerId} className={cn("border-b border-slate-100 last:border-0", (b.isStriker || isNonStriker) && "bg-red-50/30")}>
                      <td className="py-3 pr-4">
                        <button 
                          onClick={() => openPlayerProfile(b.playerId, b.playerName)}
                          className="flex flex-col text-left group/player"
                        >
                          <span className={cn("font-bold text-sm flex items-center gap-1 group-hover/player:text-brand-red transition-colors", b.isStriker ? "text-brand-red" : isNonStriker ? "text-slate-900" : "text-slate-600")}>
                            {b.playerName}{b.isStriker ? '*' : ''}
                            {b.isStriker && <Zap className="w-3 h-3 fill-brand-red" />}
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
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Bowler</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">O</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">M</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">R</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">W</th>
                  <th className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Econ</th>
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
                          className="font-bold text-sm flex items-center gap-2 hover:text-brand-red transition-colors text-left"
                        >
                          {b.playerName}
                          {isCurrentBowler && <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>}
                        </button>
                      </td>
                      <td className="py-3 text-right text-slate-500 text-xs">{b.overs}.{b.balls}</td>
                      <td className="py-3 text-right text-slate-500 text-xs">{b.maiden}</td>
                      <td className="py-3 text-right font-black text-sm">{b.runs}</td>
                      <td className="py-3 text-right font-black text-sm text-red-600">{b.wickets}</td>
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
