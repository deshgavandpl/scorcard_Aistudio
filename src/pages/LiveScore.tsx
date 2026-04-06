import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Play, Trophy, History, Trash2, AlertCircle, LogIn } from 'lucide-react';
import { Match } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';

export default function LiveScore() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    // Listen for storage changes to sync admin mode
    const handleStorageChange = () => {
      setIsAdminMode(localStorage.getItem('isAdminMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    // Also poll briefly because 'storage' event only fires on other tabs
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const canManage = user || isAdminMode;

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });
    return () => unsub();
  }, []);

  const groupedMatches = matches.reduce((groups: Record<string, Match[]>, match) => {
    const date = new Date(match.createdAt).toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(match);
    return groups;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(groupedMatches).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
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
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-brand-red shrink-0 mt-0.5" />
            <div>
              <p className="text-lg font-black text-brand-red uppercase tracking-tight">Admin Access Required</p>
              <p className="text-sm text-red-700 font-medium">You can view all live scores, but you must be logged in or use Admin PIN to manage matches.</p>
            </div>
          </div>
          <button 
            onClick={handleLogin}
            className="px-8 py-3 bg-brand-red text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-red/90 transition-all shadow-lg flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" /> Login with Google
          </button>
        </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">
            {canManage ? 'Match Management' : 'Live Score Center'}
          </h1>
          <p className="text-slate-500 font-medium">
            {canManage ? 'Manage your matches and tournaments in real-time.' : 'Follow live matches and tournament standings.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={createNewMatch}
            disabled={!canManage}
            className="px-6 py-3 rounded-xl bg-brand-red text-white font-black uppercase tracking-wider hover:bg-brand-red/90 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" /> {canManage ? 'New Match' : 'Single Match'}
          </button>
          <Link 
            to={canManage ? "/tournaments/new" : "#"}
            onClick={(e) => !canManage && e.preventDefault()}
            className={cn(
              "px-6 py-3 rounded-xl bg-red-600 text-white font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg flex items-center gap-2",
              !canManage && "opacity-50 cursor-not-allowed"
            )}
          >
            <Trophy className="w-5 h-5" /> {canManage ? 'New Tournament' : 'Tournament'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Matches */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Play className="w-5 h-5 fill-emerald-500 text-emerald-500" /> Recent & Live
          </h2>
          
          {matches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 italic">
              No matches found. Start a new one to see it here.
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
                  
                  <div className="grid grid-cols-1 gap-4">
                    {groupedMatches[date]
                      .sort((a, b) => {
                        const statusOrder = { 'Live': 0, 'Upcoming': 1, 'Finished': 2 };
                        return statusOrder[a.status] - statusOrder[b.status];
                      })
                      .map((match) => (
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

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                          <div className="flex-1 text-center">
                            <p className="text-base md:text-lg font-black text-slate-900 uppercase truncate">{match.teamAName}</p>
                            <p className="text-xl md:text-2xl font-black text-brand-red">
                              {match.innings1?.battingTeamId === match.teamAId ? match.innings1.runs : match.innings2?.runs || 0}
                              <span className="text-xs md:text-sm text-slate-400 font-bold">/{match.innings1?.battingTeamId === match.teamAId ? match.innings1.wickets : match.innings2?.wickets || 0}</span>
                            </p>
                          </div>
                          <div className="text-slate-300 font-black italic text-lg md:text-xl transform sm:rotate-0 rotate-90">VS</div>
                          <div className="flex-1 text-center">
                            <p className="text-base md:text-lg font-black text-slate-900 uppercase truncate">{match.teamBName}</p>
                            <p className="text-xl md:text-2xl font-black text-brand-red">
                              {match.innings1?.battingTeamId === match.teamBId ? match.innings1.runs : match.innings2?.runs || 0}
                              <span className="text-xs md:text-sm text-slate-400 font-bold">/{match.innings1?.battingTeamId === match.teamBId ? match.innings1.wickets : match.innings2?.wickets || 0}</span>
                            </p>
                          </div>
                        </div>

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
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-brand-red rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
              <History className="w-5 h-5" /> Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-red-800 pb-2">
                <span className="text-red-200 text-xs font-bold uppercase">Total Matches</span>
                <span className="font-black">{matches.length}</span>
              </div>
              <div className="flex justify-between items-center border-b border-red-800 pb-2">
                <span className="text-red-200 text-xs font-bold uppercase">Live Now</span>
                <span className="font-black text-emerald-400">{matches.filter(m => m.status === 'Live').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-200 text-xs font-bold uppercase">Finished</span>
                <span className="font-black">{matches.filter(m => m.status === 'Finished').length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Scoring Tips</h3>
            <ul className="space-y-3 text-sm text-slate-500 font-medium">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-red mt-1.5 shrink-0"></div>
                Auto-strike change happens on odd runs and over completion.
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-red mt-1.5 shrink-0"></div>
                Use "Wicket" button to record dismissals and set new batters.
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-red mt-1.5 shrink-0"></div>
                Extras like Wide and No Ball add 1 run and don't count as a legal ball.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
