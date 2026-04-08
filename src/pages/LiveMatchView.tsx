import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  ChevronLeft, 
  Zap, 
  Play,
  Trophy, 
  History,
  Users,
  User,
  Target,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { Match, BatterStats, BowlerStats, BallEvent } from '../types/cricket';
import { useCricketScoring } from '../hooks/useCricketScoring';
import { cn } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { generateTeamPDF } from '../lib/pdfGenerator';
import { Team } from '../types/cricket';
import Scorecard from '../components/Scorecard';
import Certificate from '../components/Certificate';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerProfile } from '../context/PlayerProfileContext';
import TournamentSidebar from '../components/TournamentSidebar';
import LiveChat from '../components/LiveChat';
import { getHypeCommentary, speakHype } from '../lib/audioUtils';

export default function LiveMatchView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openPlayerProfile } = usePlayerProfile();
  const { match, setMatch, loading } = useCricketScoring(id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default to muted for better UX
  const [showLiveVideo, setShowLiveVideo] = useState(false);
  const [lastBallKey, setLastBallKey] = useState<string>('');
  const certificateRef = useRef<HTMLDivElement>(null);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const toggleAudio = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (!newMuted) {
      // Unlocks speech synthesis on mobile browsers
      speakHype("Commentary Enabled");
    } else {
      window.speechSynthesis?.cancel();
    }
  };

  // Audio Commentary Effect
  useEffect(() => {
    if (!match || isMuted) return;

    const currentInn = match.isSuperOver
      ? (match.currentInnings === 1 ? match.superOverInnings1 : match.superOverInnings2)
      : (match.currentInnings === 1 ? match.innings1 : match.innings2);
      
    if (!currentInn || currentInn.ballHistory.length === 0) return;

    const lastBall = currentInn.ballHistory[currentInn.ballHistory.length - 1];
    const currentBallKey = `${match.isSuperOver ? 'SO-' : ''}${match.currentInnings}-${lastBall.over}-${lastBall.ball}`;

    if (currentBallKey !== lastBallKey) {
      // Only speak if we already had a previous ball key (prevents speaking old balls on first load/unmute)
      if (lastBallKey !== '') {
        const commentary = getHypeCommentary(lastBall);
        speakHype(commentary);
      }
      setLastBallKey(currentBallKey);
    }
  }, [match?.innings1?.ballHistory, match?.innings2?.ballHistory, match?.superOverInnings1?.ballHistory, match?.superOverInnings2?.ballHistory, isMuted, lastBallKey, match?.currentInnings, match?.isSuperOver]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading Live Score...</p>
    </div>
  );

  if (!match) return (
    <div className="text-center py-20 space-y-6">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
        <Zap className="w-10 h-10 text-slate-200" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Match Not Found</h2>
      <button onClick={() => navigate('/live')} className="px-8 py-3 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest text-sm">
        Back to Live Center
      </button>
    </div>
  );

  const currentInnings = match.isSuperOver
    ? (match.currentInnings === 1 ? match.superOverInnings1 : match.superOverInnings2)
    : (match.currentInnings === 1 ? match.innings1 : match.innings2);
    
  const battingTeamName = currentInnings?.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
  const bowlingTeamName = currentInnings?.battingTeamId === match.teamAId ? match.teamBName : match.teamAName;

  const striker = (Object.values(currentInnings?.battingStats || {}) as BatterStats[]).find(b => b.isStriker);
  const nonStriker = (Object.values(currentInnings?.battingStats || {}) as BatterStats[]).find(b => !b.isStriker && !b.isOut);
  const bowler = currentInnings?.currentBowlerId ? currentInnings.bowlingStats[currentInnings.currentBowlerId] : null;

  const isTransitioning = match.status === 'Live' && match.currentInnings === 2 && (!match.innings2 || match.innings2.ballHistory.length === 0);

  const handlePrint = () => {
    window.print();
  };

  const getPlayerPerformance = (playerName: string) => {
    let runs = 0;
    let wickets = 0;
    let balls = 0;

    [match.innings1, match.innings2].forEach(inn => {
      if (!inn) return;
      
      // Find in batting
      const batter = (Object.values(inn.battingStats) as BatterStats[]).find(b => b.playerName === playerName);
      if (batter) {
        runs += batter.runs;
        balls += batter.balls;
      }

      // Find in bowling
      const bowler = (Object.values(inn.bowlingStats) as BowlerStats[]).find(b => b.playerName === playerName);
      if (bowler) {
        wickets += bowler.wickets;
      }
    });

    const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
    return { runs, wickets, strikeRate };
  };

  const downloadCertificate = async () => {
    if (!certificateRef.current || isGenerating) return;
    
    setIsGenerating(true);
    try {
      // Small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const element = certificateRef.current.querySelector('.certificate-content-inner') as HTMLElement;
      if (!element) throw new Error('Certificate element not found');

      const dataUrl = await htmlToImage.toPng(element, {
        quality: 2, // Higher quality
        backgroundColor: '#ffffff',
        width: 595,
        height: 842,
      });
      
      const link = document.createElement('a');
      link.download = `Certificate_${match.manOfTheMatch?.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Failed to generate PNG. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadTeamSheet = (teamId: 'team_a' | 'team_b') => {
    const teamName = teamId === 'team_a' ? match.teamAName : match.teamBName;
    // We need to fetch the full team object or construct it from match data
    // For now, we'll construct it from the match data we have
    const team: Team = {
      id: teamId,
      name: teamName,
      players: match.innings1?.battingTeamId === teamId 
        ? (Object.values(match.innings1.battingStats) as BatterStats[]).map(b => ({ id: b.playerId, name: b.playerName, role: 'Batsman' as any }))
        : match.innings2?.battingTeamId === teamId
          ? (Object.values(match.innings2.battingStats) as BatterStats[]).map(b => ({ id: b.playerId, name: b.playerName, role: 'Batsman' as any }))
          : [] // Fallback if no innings data yet
    };
    
    // If we don't have players yet (upcoming match), we might need to fetch them.
    // But usually live matches have players in innings stats.
    
    generateTeamPDF(team, match.tournamentName, match);
  };

  if (match.status === 'Finished') {
    const performance = match.manOfTheMatch ? getPlayerPerformance(match.manOfTheMatch) : { runs: 0, wickets: 0, strikeRate: '0.0' };

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20 print:p-0">
        {/* Hidden Certificate for Generation */}
        <div className="fixed -left-[9999px] top-0 pointer-events-none" ref={certificateRef}>
          {match.manOfTheMatch && (
            <div className="certificate-content-inner" style={{ width: '595px', height: '842px' }}>
              <Certificate 
                match={match}
                playerName={match.manOfTheMatch}
                performance={performance}
                isHeadless={true}
              />
            </div>
          )}
        </div>

        {/* Champion Banner */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 rounded-[3rem] p-12 text-center text-white shadow-2xl border-8 border-brand-red relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <Trophy className="w-64 h-64 absolute -top-10 -left-10 rotate-12" />
            <Trophy className="w-64 h-64 absolute -bottom-10 -right-10 -rotate-12" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-brand-red text-white font-black uppercase tracking-[0.3em] text-xs shadow-lg">
              <Trophy className="w-4 h-4" /> Champion
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic transform -skew-x-6 leading-none">
              {match.winnerId === match.teamAId ? match.teamAName : match.teamBName}
            </h1>
            
            <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 inline-block">
              <p className="text-2xl font-black uppercase tracking-widest text-brand-red italic">{match.resultMessage}</p>
            </div>

            {match.manOfTheMatch && (
              <div className="pt-4 space-y-4">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Man of the Match</p>
                  <p className="text-3xl font-black uppercase tracking-tight text-white italic">{match.manOfTheMatch}</p>
                </div>
                <button 
                  onClick={downloadCertificate}
                  disabled={isGenerating}
                  className="px-8 py-4 bg-brand-red text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-brand-red/90 transition-all flex items-center gap-3 mx-auto shadow-2xl disabled:opacity-50 active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating PNG...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download Official Certificate (PNG)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Final Scorecard Window */}
        <div className="space-y-12">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 italic transform -skew-x-6">Final Scorecard</h2>
            <button 
              onClick={handlePrint}
              className="px-6 py-3 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest text-[10px] hover:bg-brand-red/90 transition-all shadow-lg flex items-center gap-2 print:hidden"
            >
              <History className="w-4 h-4" /> Download Ball-by-Ball PDF
            </button>
          </div>
          
            {match.innings1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 bg-slate-100 p-4 rounded-2xl border border-slate-200">1st Innings: {match.innings1.battingTeamId === match.teamAId ? match.teamAName : match.teamBName}</h3>
                <Scorecard match={match} innings={match.innings1} inningsNumber={1} />
              </div>
            )}

            {match.innings2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 bg-slate-100 p-4 rounded-2xl border border-slate-200">2nd Innings: {match.innings2.battingTeamId === match.teamAId ? match.teamAName : match.teamBName}</h3>
                <Scorecard match={match} innings={match.innings2} inningsNumber={2} />
              </div>
            )}

            {match.superOverInnings1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-widest text-brand-red bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Super Over: 1st Innings
                </h3>
                <Scorecard match={match} innings={match.superOverInnings1} inningsNumber={1} />
              </div>
            )}

            {match.superOverInnings2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-widest text-brand-red bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Super Over: 2nd Innings
                </h3>
                <Scorecard match={match} innings={match.superOverInnings2} inningsNumber={2} />
              </div>
            )}
        </div>

        {/* Ball History for PDF/Print */}
        <div className="hidden print:block space-y-8 pt-12 border-t border-slate-200">
          <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 text-center">Full Ball-by-Ball History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[match.innings1, match.innings2].map((inn, i) => inn && (
              <div key={i} className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-widest border-b-4 border-slate-900 pb-2">
                  Innings {i + 1}: {inn.battingTeamId === match.teamAId ? match.teamAName : match.teamBName}
                </h3>
                <div className="space-y-1">
                  {inn.ballHistory.map((ball, bi) => (
                    <div key={bi} className="flex justify-between text-xs font-medium border-b border-slate-100 py-1">
                      <span>Over {ball.over}.{ball.ball}</span>
                      <span>{ball.isWicket ? 'WICKET' : ball.runs + (ball.isExtra ? ' (' + ball.extraType + ')' : '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "max-w-4xl mx-auto space-y-6 pb-20 transition-all duration-500",
      showLiveVideo && "h-screen overflow-hidden flex flex-col max-w-none px-0 space-y-0 pb-0"
    )}>
      <div className={cn(
        "space-y-6 transition-all duration-500",
        showLiveVideo ? "flex-1 overflow-y-auto p-4 bg-slate-50" : ""
      )}>
        {/* Transition Message */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-brand-red text-white p-4 rounded-2xl text-center font-black uppercase tracking-[0.2em] text-sm shadow-lg"
          >
            Second innings started soon
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast Style Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/live')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{match.teamAName} <span className="text-slate-300 mx-2 italic">vs</span> {match.teamBName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{match.oversLimit} Overs Match • {match.status}</p>
              {match.umpireName && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                  <User className="w-2 h-2" /> Umpire: {match.umpireName}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {match.youtubeLiveUrl && (
            <button 
              onClick={() => setShowLiveVideo(!showLiveVideo)}
              className={cn(
                "px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all shadow-lg",
                showLiveVideo 
                  ? "bg-slate-900 text-white ring-2 ring-brand-red" 
                  : "bg-brand-red text-white hover:bg-brand-red/90 animate-pulse"
              )}
            >
              <Play className="w-4 h-4 fill-current" />
              {showLiveVideo ? "Close Live" : "Watch Live"}
            </button>
          )}
          <div className="flex flex-col items-end gap-1">
            <button 
              onClick={toggleAudio}
              className={cn(
                "p-3 rounded-xl transition-all flex items-center gap-2 font-black uppercase tracking-widest text-[10px]",
                isMuted ? "bg-slate-100 text-slate-400" : "bg-red-50 text-brand-red border border-red-100 shadow-sm"
              )}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4" /> Audio Off
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 animate-pulse" /> Audio On
                </>
              )}
            </button>
            {isMuted && <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Enable Commentary</p>}
          </div>
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
          className="bg-emerald-600 rounded-3xl md:rounded-[40px] p-6 md:p-10 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-32 h-32 md:w-64 md:h-64 text-white" />
          </div>
          
          <div className="relative z-10 text-center space-y-4 md:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-emerald-500 border border-emerald-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-50 mb-2 md:mb-4">
              <Trophy className="w-3 h-3 md:w-4 md:h-4" /> Final Result
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
              {match.winnerId === 'Draw' ? "Match Drawn" : (
                <>
                  <span className="text-emerald-200 block text-lg md:text-2xl mb-1 md:mb-2">Champion</span>
                  {match.winnerId === match.teamAId ? match.teamAName : match.teamBName}
                </>
              )}
            </h1>

            {match.resultMessage && (
              <p className="text-lg md:text-2xl font-bold text-emerald-100 italic">
                "{match.resultMessage}"
              </p>
            )}

            {match.manOfTheMatch && (
              <div className="pt-6 md:pt-8 border-t border-emerald-500/30 inline-block">
                <div className="flex items-center justify-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] md:text-[10px] font-black text-emerald-200 uppercase tracking-widest">Man of the Match</p>
                    <p className="text-xl md:text-2xl font-black text-white">{match.manOfTheMatch}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Score Display */}
      <div className="bg-slate-900 rounded-[2rem] md:rounded-[40px] p-5 md:p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Zap className="w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <div className="space-y-3 md:space-y-6">
            <div>
              <p className="text-brand-red text-[8px] md:text-xs font-black uppercase tracking-[0.3em] mb-1 md:mb-2">{battingTeamName} is Batting</p>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">
                {currentInnings?.runs}<span className="text-xl md:text-4xl text-slate-500">/{currentInnings?.wickets}</span>
              </h1>
              <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-4">
                <p className="text-xl md:text-3xl font-black text-slate-300">
                  {currentInnings?.overs}.{currentInnings?.balls} 
                  <span className="text-[8px] md:text-sm font-bold opacity-50 uppercase tracking-widest ml-1">
                    / {match.isSuperOver ? 1 : match.oversLimit} Overs
                  </span>
                </p>
                {match.isSuperOver && (
                  <span className="px-3 py-1 rounded-full bg-yellow-400 text-slate-900 text-[10px] font-black uppercase tracking-widest animate-bounce">
                    Super Over
                  </span>
                )}
                <div className="h-6 md:h-8 w-px bg-slate-800"></div>
                <div className="text-center">
                  <p className="text-[7px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Run Rate</p>
                  <p className="text-base md:text-xl font-black text-brand-red">
                    {currentInnings && (currentInnings.overs > 0 || currentInnings.balls > 0) 
                      ? (currentInnings.runs / (currentInnings.overs + currentInnings.balls/6)).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {match.currentInnings === 2 && (match.isSuperOver ? match.superOverInnings1 : match.innings1) && (
              <div className="p-3 md:p-6 rounded-2xl md:rounded-3xl bg-brand-red/20 border border-brand-red/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                  <Target className="w-3 h-3 md:w-5 md:h-5 text-brand-red" />
                  <span className="text-[8px] md:text-xs font-black uppercase tracking-widest text-brand-red">
                    Target: {((match.isSuperOver ? match.superOverInnings1?.runs : match.innings1?.runs) || 0) + 1}
                  </span>
                </div>
                <p className="text-sm md:text-xl font-black text-white">
                  Need {((match.isSuperOver ? match.superOverInnings1?.runs : match.innings1?.runs) || 0) + 1 - (currentInnings?.runs || 0)} runs in {((match.isSuperOver ? 1 : match.oversLimit) * 6) - ((currentInnings?.overs || 0) * 6 + (currentInnings?.balls || 0))} balls
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end space-y-3 md:space-y-6">
            {/* Active Batter Stats */}
            <div className="grid grid-cols-1 gap-2 md:gap-3">
              <div className={cn(
                "p-2.5 md:p-4 rounded-xl md:rounded-2xl border transition-all flex justify-between items-center",
                striker?.isStriker ? "bg-brand-red/20 border-brand-red/50 ring-1 ring-brand-red/50" : "bg-slate-800/40 border-slate-700"
              )}>
                <div className="flex items-center gap-2 md:gap-3">
                  {striker?.isStriker && <Zap className="w-2.5 h-2.5 md:w-4 md:h-4 text-brand-red fill-brand-red" />}
                  <button 
                    onClick={() => striker && openPlayerProfile(striker.playerId, striker.playerName)}
                    className="text-sm md:text-lg font-black truncate max-w-[100px] md:max-w-none text-left hover:text-brand-red transition-colors"
                  >
                    {striker?.playerName || 'Batsman'}
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm md:text-xl font-black">{striker?.runs || 0} <span className="text-[8px] md:text-sm font-bold text-slate-500">({striker?.balls || 0})</span></p>
                </div>
              </div>

              <div className={cn(
                "p-2.5 md:p-4 rounded-xl md:rounded-2xl border transition-all flex justify-between items-center",
                nonStriker?.isStriker ? "bg-brand-red/20 border-brand-red/50 ring-1 ring-brand-red/50" : "bg-slate-800/40 border-slate-700"
              )}>
                <div className="flex items-center gap-2 md:gap-3">
                  {nonStriker?.isStriker && <Zap className="w-2.5 h-2.5 md:w-4 md:h-4 text-brand-red fill-brand-red" />}
                  <button 
                    onClick={() => nonStriker && openPlayerProfile(nonStriker.playerId, nonStriker.playerName)}
                    className="text-sm md:text-lg font-black truncate max-w-[100px] md:max-w-none text-left hover:text-brand-red transition-colors"
                  >
                    {nonStriker?.playerName || 'Batsman'}
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm md:text-xl font-black">{nonStriker?.runs || 0} <span className="text-[8px] md:text-sm font-bold text-slate-500">({nonStriker?.balls || 0})</span></p>
                </div>
              </div>
            </div>

            {/* Current Bowler */}
            <div className="p-2.5 md:p-4 rounded-xl md:rounded-2xl bg-brand-red text-white flex justify-between items-center shadow-lg">
              <div>
                <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest opacity-60">Bowling Now</span>
                <button 
                  onClick={() => bowler && openPlayerProfile(bowler.playerId, bowler.playerName)}
                  className="text-sm md:text-lg font-black truncate max-w-[100px] md:max-w-none text-left hover:text-white/80 transition-colors block"
                >
                  {bowler?.playerName || 'Bowler'}
                </button>
              </div>
              <div className="text-right">
                <p className="text-lg md:text-2xl font-black">{bowler?.wickets || 0}-{bowler?.runs || 0}</p>
                <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest opacity-60">{bowler?.overs || 0}.{bowler?.balls || 0} Overs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Balls Timeline */}
      <div className="bg-white rounded-3xl p-4 md:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4" /> Recent Balls (Over {currentInnings?.overs})
          </h3>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {currentInnings?.ballHistory
              .filter(ball => ball.over === currentInnings.overs)
              .map((ball, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-xs border-2",
                    ball.isWicket ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-200" :
                    ball.runs === 4 ? "bg-emerald-500 border-emerald-500 text-white" :
                    ball.runs === 6 ? "bg-purple-600 border-purple-600 text-white" :
                    ball.isExtra ? "bg-red-50 border-red-200 text-brand-red" :
                    "bg-slate-50 border-slate-100 text-slate-600"
                  )}
                >
                  {ball.isWicket ? 'W' : ball.isExtra ? ball.extraType : ball.runs}
                </motion.div>
              ))}
          </div>
        </div>
      </div>

      {/* Partnership & Team Sheets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Current Partnership
          </h3>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-sm font-black text-slate-900 uppercase truncate">{striker?.playerName}</p>
              <p className="text-xl font-black text-brand-red">{striker?.runs || 0}</p>
            </div>
            <div className="px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border-2 border-slate-100">
                <span className="text-lg font-black text-slate-300">&</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 mt-2">
                {((striker?.runs || 0) + (nonStriker?.runs || 0))} Runs
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-sm font-black text-slate-900 uppercase truncate">{nonStriker?.playerName}</p>
              <p className="text-xl font-black text-brand-red">{nonStriker?.runs || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Download className="w-3 h-3" /> Team Sheets
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => downloadTeamSheet('team_a')}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-brand-red hover:bg-red-50 transition-all flex items-center justify-between group"
            >
              <span className="text-[10px] font-black text-slate-900 uppercase truncate">{match.teamAName}</span>
              <Download className="w-3 h-3 text-slate-400 group-hover:text-brand-red" />
            </button>
            <button 
              onClick={() => downloadTeamSheet('team_b')}
              className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-brand-red hover:bg-red-50 transition-all flex items-center justify-between group"
            >
              <span className="text-[10px] font-black text-slate-900 uppercase truncate">{match.teamBName}</span>
              <Download className="w-3 h-3 text-slate-400 group-hover:text-brand-red" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Scorecard */}
      <div className="bg-white rounded-3xl p-4 md:p-8 border border-slate-200 shadow-sm space-y-6 md:space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-100"></div>
          <h2 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Match Scorecard</h2>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <div className="space-y-8 md:space-y-12">
          {match.innings1 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">1st Innings</h3>
              <Scorecard match={match} innings={match.innings1} inningsNumber={1} />
            </div>
          )}
          {match.innings2 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">2nd Innings</h3>
              <Scorecard match={match} innings={match.innings2} inningsNumber={2} />
            </div>
          )}
          {match.superOverInnings1 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-red px-1 flex items-center gap-2">
                <Zap className="w-3 h-3" /> Super Over: 1st Innings
              </h3>
              <Scorecard match={match} innings={match.superOverInnings1} inningsNumber={1} />
            </div>
          )}
          {match.superOverInnings2 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-red px-1 flex items-center gap-2">
                <Zap className="w-3 h-3" /> Super Over: 2nd Innings
              </h3>
              <Scorecard match={match} innings={match.superOverInnings2} inningsNumber={2} />
            </div>
          )}
        </div>
      </div>

      {/* Tournament Sidebar Trigger (Floating Button) */}
      {match.tournamentId && (
        <>
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white p-3 rounded-l-2xl shadow-2xl flex flex-col items-center gap-2 border-l-4 border-brand-red group"
          >
            <Trophy className="w-5 h-5 text-brand-red group-hover:animate-bounce" />
            <span className="[writing-mode:vertical-lr] text-[8px] font-black uppercase tracking-widest rotate-180">Tournament</span>
          </motion.button>

          <TournamentSidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            tournamentId={match.tournamentId}
            currentMatchId={match.id}
          />
        </>
      )}

      <LiveChat matchId={match.id} />
      </div>
      
      {showLiveVideo && match.youtubeLiveUrl && (
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          className="h-[45vh] md:h-[50vh] bg-black border-t-4 border-brand-red relative z-50"
        >
          <button 
            onClick={() => setShowLiveVideo(false)}
            className="absolute -top-10 right-4 bg-slate-900 text-white px-4 py-2 rounded-t-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 border-t-2 border-x-2 border-brand-red shadow-2xl"
          >
            <X className="w-3 h-3" /> Close Video
          </button>
          {getYoutubeId(match.youtubeLiveUrl) ? (
            <iframe
              src={`https://www.youtube.com/embed/${getYoutubeId(match.youtubeLiveUrl)}?autoplay=1&mute=0`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white space-y-4">
              <AlertCircle className="w-12 h-12 text-brand-red" />
              <p className="font-black uppercase tracking-widest text-sm">Invalid YouTube URL</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
