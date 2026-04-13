import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Match, BatterStats, BowlerStats } from '../types/cricket';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface MatchAISummaryProps {
  match: Match;
}

export default function MatchAISummary({ match }: MatchAISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    if (!match) return;
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const matchData = {
        tournament: match.tournamentName,
        matchName: match.name,
        teamA: match.teamAName,
        teamB: match.teamBName,
        winner: match.winnerId === match.teamAId ? match.teamAName : (match.winnerId === 'Draw' ? 'Draw' : match.teamBName),
        result: match.resultMessage,
        manOfTheMatch: match.manOfTheMatch,
        innings1: match.innings1 ? {
          team: match.innings1.battingTeamId === match.teamAId ? match.teamAName : match.teamBName,
          score: `${match.innings1.runs}/${match.innings1.wickets}`,
          overs: `${match.innings1.overs}.${match.innings1.balls}`,
          topBatsmen: Object.values(match.innings1.battingStats)
            .sort((a, b) => b.runs - a.runs)
            .slice(0, 2)
            .map(b => `${b.playerName} (${b.runs} off ${b.balls})`),
          topBowlers: Object.values(match.innings1.bowlingStats)
            .sort((a, b) => b.wickets - a.wickets)
            .slice(0, 2)
            .map(b => `${b.playerName} (${b.wickets}/${b.runs})`)
        } : null,
        innings2: match.innings2 ? {
          team: match.innings2.battingTeamId === match.teamAId ? match.teamAName : match.teamBName,
          score: `${match.innings2.runs}/${match.innings2.wickets}`,
          overs: `${match.innings2.overs}.${match.innings2.balls}`,
          topBatsmen: Object.values(match.innings2.battingStats)
            .sort((a, b) => b.runs - a.runs)
            .slice(0, 2)
            .map(b => `${b.playerName} (${b.runs} off ${b.balls})`),
          topBowlers: Object.values(match.innings2.bowlingStats)
            .sort((a, b) => b.wickets - a.wickets)
            .slice(0, 2)
            .map(b => `${b.playerName} (${b.wickets}/${b.runs})`)
        } : null
      };

      const prompt = `As a friendly and expert cricket commentator, provide a brief, engaging summary of this cricket match. 
      Structure your response as follows:
      1. A catchy headline for the match.
      2. A brief summary of the 1st innings (key performers and total).
      3. A brief summary of the 2nd innings (how the chase went or how the defense succeeded).
      4. A final concluding sentence on the overall result.
      
      Keep the total length under 180 words. Use a user-friendly, conversational tone.
      
      Match Data: ${JSON.stringify(matchData, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-latest",
        contents: prompt,
      });

      setSummary(response.text || "Could not generate summary.");
    } catch (err) {
      console.error("AI Summary Error:", err);
      setError("Failed to generate AI summary. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (match.status === 'Finished' && !summary && !loading) {
      generateSummary();
    }
  }, [match.id, match.status]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4">
        <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
        <p className="text-red-600 text-sm font-medium">{error}</p>
        <button 
          onClick={generateSummary}
          className="ml-auto px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-200 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl group-hover:bg-brand-red/10 transition-all duration-700"></div>
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
              <Sparkles className="w-5 h-5 text-brand-red animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 italic transform -skew-x-6">AI Match Summary</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini AI</p>
            </div>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-brand-red">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Analyzing Match...</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-slate-100 rounded-full w-full animate-pulse"></div>
            <div className="h-4 bg-slate-100 rounded-full w-[90%] animate-pulse"></div>
            <div className="h-4 bg-slate-100 rounded-full w-[95%] animate-pulse"></div>
            <div className="h-4 bg-slate-100 rounded-full w-[80%] animate-pulse"></div>
          </div>
        ) : summary ? (
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed font-medium italic">
              "{summary}"
            </p>
          </div>
        ) : (
          <button 
            onClick={generateSummary}
            className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-brand-red transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Generate Match Summary
          </button>
        )}
      </div>
    </div>
  );
}
