import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Users, Trophy, PlayCircle, Trash2, Key, Database, RefreshCw, Check, 
  Search, AlertTriangle, Briefcase, Award, Phone, MapPin, UserCheck, Settings,
  ArrowRight, Sparkles, Building, Code, Activity, PlusCircle, Download
} from 'lucide-react';
import { useAuth, PlayerProfile, UserRole } from '../context/AuthContext';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Match, Tournament, Team } from '../types/cricket';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { hashPassword } from '../lib/hash';

export default function DeveloperPanel() {
  const { currentUser, allPlayers, loginDeveloper, logout, deletePlayerAccount, updatePlayerRole } = useAuth();
  
  // Real-time states for other administrative directories
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  const [activeTab, setActiveTab] = useState<'players' | 'matches' | 'tournaments' | 'teams' | 'monitoring' | 'system'>('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [tempPinChange, setTempPinChange] = useState<{[key: string]: string}>({});
  
  // Access security inputs
  const [devId, setDevId] = useState('');
  const [devPin, setDevPin] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  // Sync matches, tournaments, and teams paths for total control
  useEffect(() => {
    if (currentUser?.role !== 'developer') return;

    const unsubMatches = onSnapshot(collection(db, 'matches'), (snap) => {
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
    });
    const unsubTournaments = onSnapshot(collection(db, 'tournaments'), (snap) => {
      setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    });

    return () => {
      unsubMatches();
      unsubTournaments();
      unsubTeams();
    };
  }, [currentUser]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthenticating(true);
    try {
      const success = await loginDeveloper(devId, devPin);
      if (success) {
        setDevId('');
        setDevPin('');
      }
    } catch (err) {
      toast.error('Developer system handshake failed.');
    } finally {
      setAuthenticating(false);
    }
  };

  // Admin delete actions
  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this match permanently? All live scores, custom parameters and chats will be immediately removed.')) return;
    try {
      await deleteDoc(doc(db, 'matches', id));
      toast.success('Cricket match instance terminated and deleted.');
    } catch (e) {
      toast.error('Failed to purge match');
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!window.confirm('Do you want to delete this tournament? Standard matches connected inside may need independent cleanup.')) return;
    try {
      await deleteDoc(doc(db, 'tournaments', id));
      toast.success('Tournament index purged successfully.');
    } catch (e) {
      toast.error('Failed to purge tournament data');
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm('Delete team permanently?')) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
      toast.success('Team deleted from directory.');
    } catch (e) {
      toast.error('Failed to purge team records');
    }
  };

  const handleToggleDeveloper = async (player: PlayerProfile) => {
    const targetRole: UserRole = player.role === 'developer' ? 'player' : 'developer';
    if (!window.confirm(`Elevate/Modify permissions for ${player.name} to "${targetRole}"?`)) return;
    try {
      await updatePlayerRole(player.id, targetRole);
    } catch (error) {
      toast.error('Elevate request rejected');
    }
  };

  const handleTogglePermittedCreator = async (playerId: string, currentVal: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentVal ? 'REVOKE' : 'GRANT'} Match and Tournament creation/management privileges for this player?`)) return;
    try {
      const playerRef = doc(db, 'registered_players', playerId);
      await updateDoc(playerRef, {
        isPermittedCreator: !currentVal
      });
      toast.success('Player custom creation permissions updated!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update creator permission for this player');
    }
  };

  const exportPlayersToCSV = () => {
    try {
      const headers = [
        'ID / Username',
        'Full Name',
        'Mobile Number',
        'Role (System)',
        'Player Style',
        'City / Location',
        'Experience Level',
        'Registration Date',
        'Last Active Time',
        'Last Login Time',
        'Creator Privileges'
      ];

      const rows = allPlayers.map(p => {
        return [
          p.id || '',
          p.name || '',
          p.mobileNo ? `+91 ${p.mobileNo}` : '',
          p.role || 'player',
          p.style || '',
          p.city || '',
          p.experience || '',
          p.createdAt ? new Date(p.createdAt).toLocaleString() : 'N/A',
          p.lastActiveAt ? new Date(p.lastActiveAt).toLocaleString() : 'N/A',
          p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleString() : 'N/A',
          p.isPermittedCreator ? 'Yes' : 'No'
        ].map(val => `"${String(val).replace(/"/g, '""')}"`);
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `registered_players_backup_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Player CSV exported successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export CSV database backup.');
    }
  };

  const handleResetPin = async (playerId: string, newPin: string) => {
    if (!newPin || newPin.trim().length === 0) {
      toast.error('Please input a valid PIN code');
      return;
    }
    try {
      const pinHash = await hashPassword(newPin);
      const playerRef = doc(db, 'registered_players', playerId);
      await updateDoc(playerRef, {
        pinHash,
        rawPin: newPin.trim(),
        pin: newPin.trim()
      });
      toast.success(`PIN adjusted successfully to: ${newPin}`);
      setTempPinChange(prev => ({ ...prev, [playerId]: '' }));
    } catch (e) {
      toast.error('Failed to update PIN record in database.');
    }
  };

  // Reset database helper (Wipes system directories for clean sandbox run)
  const handleWipeCollections = async () => {
    if (!window.confirm('💥 CRITICAL ACTION: You are about to wipe all MATCHES, TEAMS, and TOURNAMENTS from Firestore to start brand new cricket leagues. Registered user profiles will remain. Proceed?')) return;
    
    toast.loading('Initiating system clean wipe...', { id: 'wipe' });
    try {
      const matchSnaps = await getDocs(collection(db, 'matches'));
      for (const d of matchSnaps.docs) await deleteDoc(doc(db, 'matches', d.id));

      const teamSnaps = await getDocs(collection(db, 'teams'));
      for (const d of teamSnaps.docs) await deleteDoc(doc(db, 'teams', d.id));

      const tourSnaps = await getDocs(collection(db, 'tournaments'));
      for (const d of tourSnaps.docs) await deleteDoc(doc(db, 'tournaments', d.id));

      toast.success('All system leagues matches, teams & tournaments cleared!', { id: 'wipe' });
    } catch (e) {
      toast.error('Wipe directories broke due to permissions configuration.', { id: 'wipe' });
    }
  };

  // Seed demo cricket environment to quickly run testing
  const handleSeedMockData = async () => {
    toast.loading('Injecting standard professional league seeds...', { id: 'seed' });
    try {
      const demoTeams = [
        { id: 't_mumbai', name: 'Mumbai Patriots', players: [{ id: 'p_1', name: 'Rohit S.', role: 'Batsman' }, { id: 'p_2', name: 'Jasprit B.', role: 'Bowler' }] },
        { id: 't_delhi', name: 'Delhi Titans', players: [{ id: 'p_3', name: 'Rishabh P.', role: 'Wicket-Keeper' }, { id: 'p_4', name: 'Axar P.', role: 'All-Rounder' }] }
      ];

      for (const team of demoTeams) {
        await setDoc(doc(db, 'teams', team.id), { ...team, createdAt: Date.now(), createdBy: 'developer' });
      }

      const mockMatch: Match = {
        id: 'mock_match_id_' + Math.random().toString(36).substr(2, 6),
        name: 'Inaugural Developer Cup Match',
        teamAId: 't_mumbai',
        teamBId: 't_delhi',
        teamAName: 'Mumbai Patriots',
        teamBName: 'Delhi Titans',
        tossWinnerId: 't_mumbai',
        tossDecision: 'Bat',
        oversLimit: 10,
        status: 'Upcoming',
        currentInnings: 1,
        createdAt: Date.now(),
        createdBy: 'developer'
      };

      await setDoc(doc(db, 'matches', mockMatch.id), mockMatch);
      toast.success('Professional cricket league mock templates injected successfully!', { id: 'seed' });
    } catch (e) {
      toast.error('Seed rejected due to credential error.', { id: 'seed' });
    }
  };

  // Unauthorized display: IT System login screen
  if (currentUser?.role !== 'developer') {
    return (
      <div className="min-h-[85vh] bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background circuit matrix grids */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(0,0,0,0))]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl relative z-10 text-left"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase flex items-center gap-1.5 font-sans">
              <Code className="w-4 h-4 text-emerald-400" />
              Developer Panel
            </h2>
            <p className="text-xs text-slate-400 text-center font-medium mt-1">
              Authorized access terminals only. Enter cryptographic administrator keys to initiate controls.
            </p>
          </div>

          <form onSubmit={handleDevLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">ADMINISTRATIVE ID</label>
              <input
                type="text"
                autoFocus
                required
                value={devId}
                onChange={(e) => setDevId(e.target.value)}
                placeholder="e.g. developer / admin"
                className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 placeholder:text-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent text-sm font-mono tracking-wider transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">CYBER ACCESS PIN</label>
              <input
                type="password"
                required
                value={devPin}
                onChange={(e) => setDevPin(e.target.value)}
                placeholder="••••"
                maxLength={8}
                className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 placeholder:text-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent text-sm font-mono tracking-widest text-center transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer mt-2 disabled:opacity-50"
            >
              {authenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  Decrypting credentials...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Access Developer Core
                </>
              )}
            </button>
          </form>

          {/* IT Hint Block */}
          <div className="mt-5 pt-3 border-t border-slate-800 text-center">
            <p className="text-[10px] font-mono text-slate-500">
              ID: <span className="text-slate-300">developer</span> | Pass: <span className="text-slate-300">5007</span> (hashed check)
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Filter players based on search query
  const filteredPlayers = allPlayers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mobileNo.includes(searchQuery) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Grid */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-sm border border-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_90%_10%,rgba(16,185,129,0.1),rgba(0,0,0,0))]" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-black uppercase tracking-wider text-[9px] border border-emerald-500/30">DEVELOPER ROOT ACCESS</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-white mt-1">Apna Cricket Console</h1>
            </div>
          </div>
          <button
            onClick={logout}
            className="self-start md:self-auto bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 font-extrabold text-xs uppercase px-4 py-2.5 rounded-xl transition-all cursor-pointer relative z-10"
          >
            Lock Terminal
          </button>
        </div>

        {/* Dashboard Statistics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Players Directory</p>
              <h3 className="text-lg font-black text-slate-800 mt-0.5">{allPlayers.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tournaments</p>
              <h3 className="text-lg font-black text-slate-800 mt-0.5">{tournaments.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Matches</p>
              <h3 className="text-lg font-black text-slate-800 mt-0.5">{matches.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Teams</p>
              <h3 className="text-lg font-black text-slate-800 mt-0.5">{teams.length}</h3>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex overflow-x-auto gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl sticky top-2 z-10 scrollbar-none">
          <button
            onClick={() => setActiveTab('players')}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'players' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <Users className="w-4 h-4" />
            Players ({allPlayers.length})
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'matches' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <PlayCircle className="w-4 h-4" />
            Matches ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'tournaments' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <Trophy className="w-4 h-4" />
            Tournaments ({tournaments.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'teams' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <Building className="w-4 h-4" />
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'monitoring' ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            )}
          >
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            Live Monitor ({allPlayers.filter(p => p.lastActiveAt && (Date.now() - p.lastActiveAt) < 30000).length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ml-auto",
              activeTab === 'system' ? "bg-red-900 text-red-100 shadow-sm border border-red-950" : "text-slate-500 hover:text-red-700 hover:bg-red-50/50"
            )}
          >
            <Database className="w-4 h-4 text-red-500" />
            System Control Unit
          </button>
        </div>

        {/* Content Panel Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[40vh] shadow-xs">
          
          {/* SEARCH BAR (Visible except on System Tab) */}
          {activeTab !== 'system' && (
            <div className="relative mb-5 max-w-md mx-auto">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-900 text-sm font-semibold transition"
              />
            </div>
          )}

          {/* TAB 1: PLAYERS VIEW */}
          {activeTab === 'players' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Credentials Registry</span>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={exportPlayersToCSV}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-xs"
                    title="Export all players as CSV backup"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{filteredPlayers.length} Matches Found</span>
                </div>
              </div>

              {filteredPlayers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  No registered players matched search parameters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPlayers.map((player) => (
                    <div 
                      key={player.id}
                      className={cn(
                        "p-4 rounded-2xl border bg-white flex flex-col justify-between transition-all text-left",
                        player.role === 'developer' ? "border-emerald-200 bg-emerald-50/15" : "border-slate-150"
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {player.photoUrl ? (
                              <img src={player.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-black flex items-center justify-center text-xs border border-slate-200 uppercase">
                                {player.name.substring(0,2)}
                              </div>
                            )}
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900 flex flex-wrap items-center gap-1.5 uppercase tracking-tight">
                                {player.name}
                                {player.role === 'developer' && (
                                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded text-[8px] font-black">DEV</span>
                                )}
                                {player.lastActiveAt && (Date.now() - player.lastActiveAt) < 30000 ? (
                                  <span className="inline-flex items-center gap-1.5 bg-green-100 border border-green-300 text-green-800 px-1.5 py-0.5 rounded text-[8px] font-black animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                    LIVE
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-extrabold">
                                    OFFLINE
                                  </span>
                                )}
                              </h4>
                              {player.lastActiveAt && (Date.now() - player.lastActiveAt) >= 30000 && (
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                  Seen: {new Date(player.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                +91 {player.mobileNo}
                              </p>
                            </div>
                          </div>

                          <div className="text-right text-[10px] font-bold text-slate-400">
                            ID: <span className="font-mono text-slate-600 block text-[9px]">{player.id}</span>
                          </div>
                        </div>

                        {/* Player details */}
                        <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <div>
                            <span className="block text-[8px] font-bold text-slate-400">ROLE</span>
                            <span className="text-slate-700 truncate block mt-0.5">{player.experience || 'Amateur'}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-slate-400">STYLE</span>
                            <span className="text-slate-700 truncate block mt-0.5">{player.battingStyle}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-slate-400">LOCATION</span>
                            <span className="text-slate-700 truncate block mt-0.5 flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {player.city}
                            </span>
                          </div>
                        </div>

                        {/* PIN and Hash details - Super Admin view */}
                        <div className="mt-3 p-3 bg-indigo-50/45 border border-indigo-100/80 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-extrabold">
                            <span className="text-slate-500 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                              <Key className="w-3.5 h-3.5 text-slate-400" />
                              Security PIN:
                            </span>
                            <span className="font-mono text-xs bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                              {player.rawPin || player.pin || <span className="text-[10px] text-indigo-500 font-sans font-black italic">Unknown (Re-login to sync)</span>}
                            </span>
                          </div>
                          
                          {/* Inline Force Set/Change PIN input */}
                          <div className="flex items-center gap-1.5 mt-2 bg-transparent">
                            <input
                              type="text"
                              maxLength={8}
                              placeholder="Reset PIN (e.g. 3939)"
                              value={tempPinChange[player.id] || ''}
                              onChange={(e) => setTempPinChange(prev => ({ ...prev, [player.id]: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                            <button
                              onClick={() => handleResetPin(player.id, tempPinChange[player.id] || '')}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg cursor-pointer shrink-0 transition"
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Administrative triggers */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 bg-transparent">
                        <button
                          onClick={() => handleToggleDeveloper(player)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider border cursor-pointer flex items-center gap-1",
                            player.role === 'developer'
                              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          )}
                        >
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          {player.role === 'developer' ? 'Demote' : 'Make Dev'}
                        </button>

                        <button
                          onClick={() => handleTogglePermittedCreator(player.id, player.isPermittedCreator || false)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider border cursor-pointer flex items-center gap-1 transition-colors",
                            player.isPermittedCreator
                              ? "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          )}
                        >
                          <PlusCircle className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                          {player.isPermittedCreator ? 'Revoke Creator' : 'Permit Creator'}
                        </button>

                        <button
                          onClick={async () => {
                            if (window.confirm(`Are you absolutely sure you want to completely purge and delete player account "${player.name}"? This action is irreversible!`)) {
                              await deletePlayerAccount(player.id);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          Purge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MATCHES OPERATIONS */}
          {activeTab === 'matches' && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">SYSTEM INDEPENDENT MATCHES</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{matches.length} Total Matches</span>
              </div>

              {matches.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  No created matches active in database directory.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {matches.map((item) => (
                    <div 
                      key={item.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4 hover:shadow-xs transition-all"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-950 flex items-center justify-center text-slate-200 shadow-sm text-xs font-black shrink-0">
                          VS
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate uppercase tracking-tight flex items-center gap-2">
                            <span>{item.teamAName}</span>
                            <span className="text-[10px] text-slate-400">vs</span>
                            <span>{item.teamBName}</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                              item.status === 'Live' ? "bg-red-500 text-white animate-pulse" : item.status === 'Finished' ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-800"
                            )}>{item.status}</span>
                            <span>• Limit: <strong className="text-slate-700">{item.oversLimit} Overs</strong></span>
                            <span>• Creator ID: <strong className="font-mono text-emerald-600 font-bold text-[10px]">{item.createdBy || 'Legacy Admin'}</strong></span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`#/admin/match/${item.id}`}
                          className="bg-slate-900 hover:bg-slate-850 text-amber-400 text-xs font-extrabold px-3 py-2 rounded-xl transition-all uppercase tracking-wider"
                        >
                          Manual score referee
                        </a>
                        <button
                          onClick={() => handleDeleteMatch(item.id)}
                          className="p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TOURNAMENTS OPERATIONS */}
          {activeTab === 'tournaments' && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">SYSTEM LEAGUE TOURNAMENTS</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{tournaments.length} Count</span>
              </div>

              {tournaments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  No cricket tournaments stored inside database collections.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {tournaments.map((tour) => (
                    <div 
                      key={tour.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Trophy className="w-4.5 h-4.5 text-orange-500 shrink-0" />
                          <span>{tour.name}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-2.5 mt-0.5">
                          <span>Status: <strong className="text-orange-600 uppercase tracking-wider text-[10px]">{tour.status}</strong></span>
                          <span>• Teams: <strong className="text-slate-805">{tour.teams?.length || 0}</strong></span>
                          <span>• Assigned Matches: <strong className="text-slate-805">{tour.matches?.length || 0}</strong></span>
                          <span>• Creator ID: <strong className="font-mono text-emerald-600 font-bold text-[10px]">{tour.createdBy || 'Admin'}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`#/tournament/${tour.id}`}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-extrabold px-3 py-2 rounded-xl transition-all uppercase tracking-wider"
                        >
                          Visit Details Pages
                        </a>
                        <button
                          onClick={() => handleDeleteTournament(tour.id)}
                          className="p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEAMS OPERATIONS */}
          {activeTab === 'teams' && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">SYSTEM TEAMS MANAGER</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{teams.length} Teams Registered</span>
              </div>

              {teams.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  No standalone or modular rosters found in DB.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teams.map((team) => (
                    <div 
                      key={team.id}
                      className="p-4 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Building className="w-4 h-4 text-pink-500" />
                          {team.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                          <span>Squad Size: <strong className="text-slate-850">{team.players?.length || 0} Players</strong></span>
                          <span>• Creator ID: <strong className="font-mono text-emerald-600 font-bold text-[10px]">{team.createdBy || 'Admin'}</strong></span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4.5: LIVE MONITORING & SESSION PRESENCE */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider block flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                    Real-time Presence & Match Sessions Monitor
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">
                    Tracking currently logged in players and active web-referee sockets
                  </p>
                </div>
              </div>

              {/* Statistical overview grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50/55 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">ONLINE NOW (PINGS)</span>
                    <strong className="text-base font-black text-slate-800">
                      {allPlayers.filter(p => p.lastActiveAt && (Date.now() - p.lastActiveAt) < 30000).length} Player(s)
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-50/55 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <PlayCircle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">ACTIVE MATCH SESSIONS</span>
                    <strong className="text-base font-black text-slate-800">
                      {allPlayers.filter(p => matches.some(m => m.createdBy === p.id && (m.status === 'Upcoming' || m.status === 'Live'))).length} Session(s)
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-50/55 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">TOTAL REGISTERED DIRECTORY</span>
                    <strong className="text-base font-black text-slate-800">{allPlayers.length} Members</strong>
                  </div>
                </div>
              </div>

              {/* Table or detailed list */}
              {filteredPlayers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  No registered active users matched search parameters.
                </div>
              ) : (
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="px-5 py-3.5">User</th>
                          <th className="px-5 py-3.5">Network Status</th>
                          <th className="px-5 py-3.5">Last Login Timestamp</th>
                          <th className="px-5 py-3.5">Active Match-Creation Sessions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredPlayers
                          .slice()
                          .sort((a, b) => {
                            const aActive = a.lastActiveAt && (Date.now() - a.lastActiveAt) < 30000 ? 1 : 0;
                            const bActive = b.lastActiveAt && (Date.now() - b.lastActiveAt) < 30000 ? 1 : 0;
                            if (aActive !== bActive) return bActive - aActive;
                            return (b.lastLoginAt || 0) - (a.lastLoginAt || 0);
                          })
                          .map((player) => {
                            const isOnline = player.lastActiveAt && (Date.now() - player.lastActiveAt) < 30000;
                            const userCreatedMatches = matches.filter(
                              (m) => m.createdBy === player.id && (m.status === 'Live' || m.status === 'Upcoming')
                            );

                            return (
                              <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                                {/* column 1: name details */}
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    {player.photoUrl ? (
                                      <img
                                        src={player.photoUrl}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-extrabold flex items-center justify-center text-[10px] border border-slate-200 uppercase">
                                        {player.name.substring(0, 2)}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-extrabold text-slate-800 text-sm">{player.name}</span>
                                        {player.role === 'developer' && (
                                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded">DEV</span>
                                        )}
                                        {player.isPermittedCreator && (
                                          <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[8px] font-black px-1.5 py-0.5 rounded">CREATOR</span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase block mt-0.5">
                                        ID: {player.id} • +91 {player.mobileNo}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* column 2: network status */}
                                <td className="px-5 py-4">
                                  {isOnline ? (
                                    <span className="inline-flex items-center gap-1.5 bg-green-100 border border-green-300 text-green-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                      LIVE NOW
                                    </span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                        OFFLINE
                                      </span>
                                      {player.lastActiveAt && (
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                          Seen: {new Date(player.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* column 3: last login */}
                                <td className="px-5 py-4 text-left">
                                  {player.lastLoginAt ? (
                                    <div className="space-y-0.5">
                                      <p className="font-bold text-slate-700 text-xs">
                                        {new Date(player.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                                        {new Date(player.lastLoginAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-bold italic tracking-wide text-[10px]">No login history logged</span>
                                  )}
                                </td>

                                {/* column 4: active match sessions */}
                                <td className="px-5 py-4">
                                  {userCreatedMatches.length > 0 ? (
                                    <div className="space-y-1.5">
                                      <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-805 border border-indigo-200 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                                        {userCreatedMatches.length} ACTIVE SESSION(S)
                                      </span>
                                      <div className="max-w-[220px] space-y-1">
                                        {userCreatedMatches.map((m) => (
                                          <div key={m.id} className="text-[10px] bg-slate-50 border border-slate-150 p-1.5 rounded-lg font-bold flex items-center justify-between gap-1">
                                            <span className="text-slate-700 truncate">{m.teamAName} vs {m.teamBName}</span>
                                            <span className={cn(
                                              "text-[8px] font-black px-1.5 rounded uppercase tracking-widest leading-normal",
                                              m.status === 'Live' ? "bg-red-500 text-white animate-pulse" : "bg-blue-100 text-blue-800"
                                            )}>{m.status}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wide">Ready for match setup</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SYSTEM CONTROL UNIT */}
          {activeTab === 'system' && (
            <div className="space-y-6 text-left max-w-2xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Cyber Sandbox - High Risk Admin Zone</h4>
                  <p className="text-xs font-medium text-red-700/90 mt-1">
                    The triggers below affect live global directories directly in Google Cloud Firestore. Use with professional care. Always confirm that all developer testing criteria lists are matched.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seed Box */}
                <div className="p-5 border border-slate-200 bg-slate-50/50 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-sky-500 w-5 h-5" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Mock League Seeder</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Inject predefined professional teams (Mumbai Patriots, Delhi Titans) and draft match template structures directly inside the current database configurations for instantaneous end-to-end testing logs.
                  </p>
                  <button
                    onClick={handleSeedMockData}
                    className="w-full bg-slate-900 border border-slate-900 hover:bg-slate-850 hover:border-slate-850 text-white font-extrabold text-[10px] uppercase tracking-wider py-3 px-4 rounded-xl transition"
                  >
                    🚀 Trigger Mock Seed Initialization
                  </button>
                </div>

                {/* DB Wipe Box */}
                <div className="p-5 border border-red-200 bg-red-50/20 rounded-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Trash2 className="text-red-500 w-5 h-5" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-800">Purge Directories</h4>
                  </div>
                  <p className="text-[11px] text-red-400 font-medium">
                    Instantly wipes matches, tournaments, and cricket team collections out from active database servers. Player profiles, logs, and passwords registry will continue to be safely preserved.
                  </p>
                  <button
                    onClick={handleWipeCollections}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-3 px-4 rounded-xl border border-red-700 transition"
                  >
                    💥 Wipe Matches, Tournaments & Teams
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
