import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Zap, 
  Trophy, 
  History,
  Users,
  User,
  Target,
  CheckCircle2
} from 'lucide-react';
import { Match, BatterStats, BowlerStats } from '../types/cricket';
import { useCricketScoring } from '../hooks/useCricketScoring';
import { cn } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import Scorecard from '../components/Scorecard';
import { motion } from 'motion/react';

export default function LiveMatchView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { match, setMatch, loading } = useCricketScoring(id);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Live Score...</p>
    </div>
  );

  if (!match) return (
    <div className="text-center py-20 space-y-6">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
        <Zap className="w-10 h-10 text-slate-200" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Match Not Found</h2>
      <button onClick={() => navigate('/live')} className="px-8 py-3 rounded-xl bg-blue-900 text-white font-black uppercase tracking-widest text-sm">
        Back to Live Center
      </button>
    </div>
  );

  const currentInnings = match.currentInnings === 1 ? match.innings1 : match.innings2;
  const battingTeamName = currentInnings?.battingTeamId === 'team_a' ? match.teamAName : match.teamBName;
  const bowlingTeamName = currentInnings?.battingTeamId === 'team_a' ? match.teamBName : match.teamAName;

  const striker = (Object.values(currentInnings?.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
  const nonStriker = (Object.values(currentInnings?.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
  const bowler = currentInnings?.currentBowlerId ? currentInnings.bowlingStats[currentInnings.currentBowlerId] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Broadcast Style Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/live')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{match.teamAName} <span className="text-slate-300 mx-2 italic">vs</span> {match.teamBName}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{match.oversLimit} Overs Match • {match.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {match.status === 'Live' && (
            <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Live Broadcast</span>
            </div>
          )}
          {match.status === 'Finished' && (
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Match Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Match Result Card (Visible when finished) */}
      {match.status === 'Finished' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-600 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-64 h-64 text-white" />
          </div>
          
          <div className="relative z-10 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 border border-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-50 mb-4">
              <Trophy className="w-4 h-4" /> Final Result
            </div>
            
            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
              {match.winnerId === 'Draw' ? "Match Drawn" : (
                <>
                  <span className="text-emerald-200 block text-2xl mb-2">Champion</span>
                  {match.winnerId === 'team_a' ? match.teamAName : match.teamBName}
                </>
              )}
            </h1>

            {match.resultMessage && (
              <p className="text-2xl font-bold text-emerald-100 italic">
                "{match.resultMessage}"
              </p>
            )}

            {match.manOfTheMatch && (
              <div className="pt-8 border-t border-emerald-500/30 inline-block">
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Man of the Match</p>
                    <p className="text-2xl font-black text-white">{match.manOfTheMatch}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Score Display */}
      <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Zap className="w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <p className="text-blue-400 text-xs font-black uppercase tracking-[0.3em] mb-2">{battingTeamName} is Batting</p>
              <h1 className="text-8xl font-black tracking-tighter leading-none">
                {currentInnings?.runs}<span className="text-4xl text-slate-500">/{currentInnings?.wickets}</span>
              </h1>
              <div className="flex items-center gap-4 mt-4">
                <p className="text-3xl font-black text-slate-300">{currentInnings?.overs}.{currentInnings?.balls} <span className="text-sm font-bold opacity-50 uppercase tracking-widest">Overs</span></p>
                <div className="h-8 w-px bg-slate-800"></div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Run Rate</p>
                  <p className="text-xl font-black text-blue-400">
                    {currentInnings && (currentInnings.overs > 0 || currentInnings.balls > 0) 
                      ? (currentInnings.runs / (currentInnings.overs + currentInnings.balls/6)).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {match.currentInnings === 2 && match.innings1 && (
              <div className="p-6 rounded-3xl bg-blue-900/40 border border-blue-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-blue-200">Target: {match.innings1.runs + 1}</span>
                </div>
                <p className="text-xl font-black text-white">
                  Need {match.innings1.runs + 1 - (currentInnings?.runs || 0)} runs in {(match.oversLimit * 6) - ((currentInnings?.overs || 0) * 6 + (currentInnings?.balls || 0))} balls
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end space-y-6">
            {/* Active Batter Stats */}
            <div className="grid grid-cols-1 gap-3">
              <div className={cn(
                "p-4 rounded-2xl border transition-all flex justify-between items-center",
                striker?.isStriker ? "bg-blue-900/40 border-blue-700 ring-1 ring-blue-500/50" : "bg-slate-800/40 border-slate-700"
              )}>
                <div className="flex items-center gap-3">
                  {striker?.isStriker && <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />}
                  <p className="text-lg font-black">{striker?.playerName || 'Batter'}</p>
                </div>
                <p className="text-xl font-black">{striker?.runs || 0} <span className="text-sm font-bold text-slate-500">({striker?.balls || 0})</span></p>
              </div>
              <div className={cn(
                "p-4 rounded-2xl border transition-all flex justify-between items-center",
                nonStriker?.isStriker ? "bg-blue-900/40 border-blue-700 ring-1 ring-blue-500/50" : "bg-slate-800/40 border-slate-700"
              )}>
                <div className="flex items-center gap-3">
                  {nonStriker?.isStriker && <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />}
                  <p className="text-lg font-black">{nonStriker?.playerName || 'Batter'}</p>
                </div>
                <p className="text-xl font-black">{nonStriker?.runs || 0} <span className="text-sm font-bold text-slate-500">({nonStriker?.balls || 0})</span></p>
              </div>
            </div>

            {/* Current Bowler */}
            <div className="p-4 rounded-2xl bg-amber-500 text-slate-900 flex justify-between items-center shadow-lg">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Bowling Now</span>
                <p className="text-lg font-black">{bowler?.playerName || 'Bowler'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{bowler?.wickets || 0}-{bowler?.runs || 0}</p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{bowler?.overs || 0}.{bowler?.balls || 0} Overs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Balls Timeline */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4" /> Recent Balls
          </h3>
          <div className="flex gap-2">
            {currentInnings?.ballHistory.slice(-12).map((ball, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2",
                  ball.isWicket ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200" :
                  ball.runs === 4 ? "bg-emerald-500 border-emerald-500 text-white" :
                  ball.runs === 6 ? "bg-purple-600 border-purple-600 text-white" :
                  ball.isExtra ? "bg-amber-100 border-amber-200 text-amber-700" :
                  "bg-slate-50 border-slate-100 text-slate-600"
                )}
              >
                {ball.isWicket ? 'W' : ball.isExtra ? ball.extraType : ball.runs}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Scorecard */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-100"></div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Match Scorecard</h2>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <div className="space-y-12">
          {match.innings1 && (
            <Scorecard match={match} innings={match.innings1} inningsNumber={1} />
          )}
          {match.innings2 && (
            <Scorecard match={match} innings={match.innings2} inningsNumber={2} />
          )}
        </div>
      </div>
    </div>
  );
}
