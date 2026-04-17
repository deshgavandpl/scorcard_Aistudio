import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Play, Trophy, History, Trash2, AlertCircle, LogIn, RotateCcw } from 'lucide-react';
import { Match } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { collection, onSnapshot, query, orderBy, deleteDoc, doc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { handleGoogleLogin } from '../lib/authUtils';
import { useAdmin } from '../context/AdminContext';
import { toast } from 'sonner';
import TournamentWidget from '../components/TournamentWidget';
import TournamentChampionBanner from '../components/TournamentChampionBanner';

export default function LiveScore() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [error, setError] = useState<string | null>(null);
  const { isAdminMode } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const canManage = isAdminMode;

  useEffect(() => {
    let isMounted = true;
    setError(null);

    // Try to load from cache first
    const cachedMatches = localStorage.getItem('cricket_matches_cache');
    if (cachedMatches) {
      try {
        setMatches(JSON.parse(cachedMatches));
      } catch (e) {
        console.error("Failed to parse cached matches", e);
      }
    }

    // Limit to 50 matches to save on Firestore read quota
    const q = query(
      collection(db, 'matches'), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (!isMounted) return;
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
      setError(null);
      // Update cache
      localStorage.setItem('cricket_matches_cache', JSON.stringify(matchesData));
    }, (err) => {
      if (!isMounted) return;
      console.error("LiveScore Fetch Error:", err);
      setError(err.message || String(err));
      handleFirestoreError(err, OperationType.LIST, 'matches');
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const retryFetch = () => {
    window.location.reload();
  };

  const [activeSegment, setActiveSegment] = useState<'Live' | 'Upcoming' | 'Finished'>('Live');
  const [relevantTournamentId, setRelevantTournamentId] = useState<string | null>(null);

  useEffect(() => {
    // Find the first match that belongs to a tournament to show its context in the sidebar
    const matchWithTournament = matches.find(m => m.tournamentId);
    if (matchWithTournament?.tournamentId) {
      setRelevantTournamentId(matchWithTournament.tournamentId);
    }
  }, [matches]);

  const filteredMatches = matches.filter(m => m.status === activeSegment);

  // For Finished matches, we want the most recently created at the top
  // For Upcoming matches, we want Match 1, 2, 3... order
  const sortedFilteredMatches = [...filteredMatches].sort((a, b) => {
    if (activeSegment === 'Finished') {
      // Sort by order descending if available, else by createdAt descending
      if (a.order !== undefined && b.order !== undefined) {
        return b.order - a.order;
      }
      return b.createdAt - a.createdAt;
    }
    if (activeSegment === 'Upcoming') {
      // Sort by order ascending if available
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // If matchDate exists, sort by it
      if (a.matchDate && b.matchDate) {
        const dateA = new Date(`${a.matchDate} ${a.matchTime || '00:00'}`).getTime();
        const dateB = new Date(`${b.matchDate} ${b.matchTime || '00:00'}`).getTime();
        return dateA - dateB;
      }
      return a.createdAt - b.createdAt;
    }
    // For Live matches, show newest first
    return b.createdAt - a.createdAt;
  });

  const groupedMatches = sortedFilteredMatches.reduce((groups: Record<string, Match[]>, match) => {
    let dateStr = '';
    if (match.matchDate) {
      dateStr = new Date(match.matchDate).toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else {
      dateStr = new Date(match.createdAt).toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(match);
    return groups;
  }, {});

  // Sort dates: Upcoming matches should show earliest date first, Finished should show latest date first
  const sortedDates = Object.keys(groupedMatches).sort((a, b) => {
    const timeA = new Date(a).getTime();
    const timeB = new Date(b).getTime();
    return activeSegment === 'Upcoming' ? timeA - timeB : timeB - timeA;
  });

  const handleLogin = async () => {
    try {
      await handleGoogleLogin();
    } catch (error) {
      toast.error('Login failed. Please try again.');
    }
  };

  const deleteMatch = async (id: string) => {
    if (!canManage) return;
    try {
      await deleteDoc(doc(db, 'matches', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${id}`);
    }
  };

  const createNewMatch = () => {
    if (!canManage) return;
    navigate('/admin/match/new');
  };

  return (
    <div className="space-y-8">
      {/* Tournament Winners Announcement */}
      <TournamentChampionBanner />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-slate-500 font-medium">
            Follow live matches and tournament standings.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-3">
            <button 
              onClick={createNewMatch}
              className="px-6 py-3 rounded-xl bg-brand-red text-white font-black uppercase tracking-wider hover:bg-brand-red/90 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> New Match
            </button>
            <Link 
              to="/tournaments/new"
              className="px-6 py-3 rounded-xl bg-red-600 text-white font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg flex items-center gap-2"
            >
              <Trophy className="w-5 h-5" /> New Tournament
            </Link>
          </div>
        )}
      </div>

      {/* Segments */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
        {(['Live', 'Upcoming', 'Finished'] as const).map((segment) => (
          <button
            key={segment}
            onClick={() => setActiveSegment(segment)}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeSegment === segment 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {segment}
            {segment === 'Live' && matches.filter(m => m.status === 'Live').length > 0 && (
              <span className="ml-2 w-2 h-2 rounded-full bg-brand-red inline-block animate-pulse"></span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Matches */}
        <div className="lg:col-span-2 space-y-6">
          {error && matches.length === 0 ? (
            <div className="bg-red-50 rounded-3xl border border-red-100 p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {error.includes('quota-exceeded') || error.includes('resource-exhausted') ? 'Daily Limit Reached' : 'Connection Error'}
                </h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">
                  {error.includes('quota-exceeded') || error.includes('resource-exhausted') 
                    ? "The free daily database quota for this project has been reached. The scores will automatically resume once the quota resets in 24 hours."
                    : "We're having trouble connecting to the live score database. This could be due to a network issue or a temporary service interruption."}
                </p>
                <p className="text-red-400 text-[10px] font-mono mt-2">{error}</p>
              </div>
              <button 
                onClick={retryFetch}
                className="px-8 py-3 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-brand-red transition-all shadow-lg flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" /> Retry Connection
              </button>
            </div>
          ) : (
            <>
              {error && matches.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <History className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Viewing Cached Data</p>
                      <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">Database limit reached. Showing last known scores.</p>
                    </div>
                  </div>
                  <button 
                    onClick={retryFetch}
                    className="px-4 py-2 rounded-lg bg-amber-600 text-white text-[8px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
                  >
                    Retry
                  </button>
                </div>
              )}
              
              {filteredMatches.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-slate-200" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No {activeSegment} Matches</h3>
                <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium">
                  {activeSegment === 'Live' 
                    ? "There are no matches currently in progress. Check the upcoming tab for scheduled games."
                    : activeSegment === 'Upcoming'
                    ? "No matches are currently scheduled. Stay tuned for future tournament announcements."
                    : "No matches have been completed yet."}
                </p>
              </div>
              {activeSegment === 'Live' && matches.some(m => m.status === 'Upcoming') && (
                <button 
                  onClick={() => setActiveSegment('Upcoming')}
                  className="px-8 py-3 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-brand-red transition-all shadow-lg"
                >
                  View Upcoming Fixtures
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {sortedDates.map(date => (
                <div key={date} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">{date}</h3>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {groupedMatches[date].map((match, idx) => (
                      <motion.div 
                        key={match.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                      >
                        {/* Tournament Label */}
                        <div className="absolute top-0 right-0">
                          {match.tournamentId ? (
                            <Link 
                              to={`/tournament/${match.tournamentId}`}
                              className="bg-red-600 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm hover:bg-red-700 transition-colors"
                            >
                              {match.tournamentName || 'Tournament Match'}
                            </Link>
                          ) : (
                            <div className="bg-slate-100 text-slate-500 px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                              Single Match
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                              match.status === 'Live' ? "bg-red-100 text-red-600 animate-pulse" : 
                              match.status === 'Finished' ? "bg-slate-100 text-slate-600" : "bg-red-50 text-brand-red"
                            )}>
                              {match.status}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                              Match {match.order || idx + 1}
                            </span>
                          </div>
                          {canManage && (
                            <button 
                              onClick={() => deleteMatch(match.id)}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              title="Delete Match"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col items-center justify-between gap-4 mb-6">
                          <div className="w-full text-center">
                            <p className="text-sm font-black text-slate-900 uppercase truncate">{match.teamAName}</p>
                            <p className="text-xl font-black text-brand-red">
                              {match.innings2?.battingTeamId === match.teamAId ? match.innings2.runs : (match.innings1?.battingTeamId === match.teamAId ? match.innings1.runs : 0)}
                              <span className="text-xs text-slate-400 font-bold">/{match.innings2?.battingTeamId === match.teamAId ? match.innings2.wickets : (match.innings1?.battingTeamId === match.teamAId ? match.innings1.wickets : 0)}</span>
                            </p>
                          </div>
                          <div className="text-slate-300 font-black italic text-sm">VS</div>
                          <div className="w-full text-center">
                            <p className="text-sm font-black text-slate-900 uppercase truncate">{match.teamBName}</p>
                            <p className="text-xl font-black text-brand-red">
                              {match.innings2?.battingTeamId === match.teamBId ? match.innings2.runs : (match.innings1?.battingTeamId === match.teamBId ? match.innings1.runs : 0)}
                              <span className="text-xs text-slate-400 font-bold">/{match.innings2?.battingTeamId === match.teamBId ? match.innings2.wickets : (match.innings1?.battingTeamId === match.teamBId ? match.innings1.wickets : 0)}</span>
                            </p>
                          </div>
                        </div>

                        {match.status === 'Finished' && match.resultMessage && (
                          <div className="mb-6 px-4 py-2 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                            <p className="text-[10px] font-black text-emerald-600 text-center uppercase tracking-wider">
                              {match.resultMessage}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-center">
                          <Link 
                            to={canManage && match.status !== 'Finished' ? `/admin/match/${match.id}` : `/match/${match.id}`}
                            className="w-full text-center py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs hover:bg-brand-red hover:text-white hover:border-brand-red transition-all"
                          >
                            {match.status === 'Finished' ? 'View Scorecard' : (canManage ? 'Resume Scoring' : 'View Live Score')}
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>

    {/* Sidebar - Tournament Widget */}
        <div className="hidden lg:block">
          {relevantTournamentId ? (
            <TournamentWidget tournamentId={relevantTournamentId} />
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center space-y-4 sticky top-24">
              <Trophy className="w-12 h-12 text-slate-200 mx-auto" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Tournament Center</p>
              <p className="text-slate-300 text-[10px]">Select a tournament match to see standings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
