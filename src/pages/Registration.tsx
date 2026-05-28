import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, Search, Trophy, Shield, Users, Smartphone, Globe, Target, 
  MapPin, Phone, Briefcase, Plus, Trash2, Award, CheckCircle2, AlertCircle, X, ChevronDown, UserCheck 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAdmin } from '../context/AdminContext';
import { toast } from 'sonner';
import { collection, onSnapshot, query, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlayerRole, Tournament, Team, Player } from '../types/cricket';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

interface GlobalRegistration {
  id: string;
  name: string;
  phone: string;
  role: PlayerRole;
  battingStyle: 'Right Hand' | 'Left Hand';
  bowlingStyle: 'Right-arm Fast' | 'Right-arm Spin' | 'Left-arm Fast' | 'Left-arm Spin' | 'None';
  city: string;
  experience: string;
  isVerified: boolean;
  createdAt: number;
}

export default function Registration() {
  const [activeTab, setActiveTab] = useState<'global' | 'tournament'>('global');
  const { isAdminMode } = useAdmin();

  // Data States
  const [registrations, setRegistrations] = useState<GlobalRegistration[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // UI States
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Player Form States
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [playerRole, setPlayerRole] = useState<PlayerRole>('Batsman');
  const [battingStyle, setBattingStyle] = useState<'Right Hand' | 'Left Hand'>('Right Hand');
  const [bowlingStyle, setBowlingStyle] = useState<'Right-arm Fast' | 'Right-arm Spin' | 'Left-arm Fast' | 'Left-arm Spin' | 'None'>('None');
  const [playerCity, setPlayerCity] = useState('');
  const [playerExperience, setPlayerExperience] = useState('');

  // Team Form States
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [squad, setSquad] = useState<Array<{ name: string; role: PlayerRole; isCaptain: boolean }>>([
    { name: '', role: 'Batsman', isCaptain: true }
  ]);

  // Sync data from Firestore
  useEffect(() => {
    // 1. Fetch registrations
    const qRegs = query(collection(db, 'registrations'));
    const unsubRegs = onSnapshot(qRegs, (snapshot) => {
      const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalRegistration));
      setRegistrations(regs.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      console.error("Firestore registrations error", error);
    });

    // 2. Fetch tournaments
    const qTours = query(collection(db, 'tournaments'));
    const unsubTours = onSnapshot(qTours, (snapshot) => {
      const tours = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(tours);
      if (tours.length > 0 && !selectedTournamentId) {
        setSelectedTournamentId(tours[0].id);
      }
    }, (error) => {
      console.error("Firestore tournaments error", error);
    });

    return () => {
      unsubRegs();
      unsubTours();
    };
  }, []);

  // Submit Global Player Profile
  const handleRegisterPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !playerPhone.trim() || !playerCity.trim()) {
      toast.error('Please fill in Name, Phone, and City.');
      return;
    }

    const regId = 'reg_' + Math.random().toString(36).substr(2, 9);
    const newReg: GlobalRegistration = {
      id: regId,
      name: playerName.trim(),
      phone: playerPhone.trim(),
      role: playerRole,
      battingStyle,
      bowlingStyle,
      city: playerCity.trim(),
      experience: playerExperience.trim() || 'Club Level Enthusiast',
      isVerified: true, // Mark verified directly for polished feel
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'registrations', regId), newReg);
      toast.success('Registration completed! Welcome to Apna Cricket.');
      // Reset form
      setPlayerName('');
      setPlayerPhone('');
      setPlayerRole('Batsman');
      setBattingStyle('Right Hand');
      setBowlingStyle('None');
      setPlayerCity('');
      setPlayerExperience('');
      setShowPlayerForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `registrations/${regId}`);
    }
  };

  // Submit Squad/Team for Active Tournament
  const handleAddSquadRow = () => {
    setSquad([...squad, { name: '', role: 'Batsman', isCaptain: false }]);
  };

  const handleRemoveSquadRow = (idx: number) => {
    if (squad.length <= 1) return;
    setSquad(squad.filter((_, i) => i !== idx));
  };

  const handleSquadRowChange = (idx: number, field: string, value: any) => {
    const updated = [...squad];
    if (field === 'isCaptain' && value === true) {
      // Ensure only one captain
      updated.forEach((p, i) => {
        p.isCaptain = i === idx;
      });
    } else {
      (updated[idx] as any)[field] = value;
    }
    setSquad(updated);
  };

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId) {
      toast.error('Please select an active tournament.');
      return;
    }
    if (!teamName.trim()) {
      toast.error('Please enter a team name.');
      return;
    }
    const invalidPlayers = squad.some(p => !p.name.trim());
    if (invalidPlayers) {
      toast.error('Please enter the name of all squad members.');
      return;
    }

    const teamId = 'team_' + Math.random().toString(36).substr(2, 9);
    const registeredPlayers: Player[] = squad.map((p, idx) => ({
      id: 'plr_' + Math.random().toString(36).substr(2, 9),
      name: p.name.trim(),
      role: p.role,
      isCaptain: p.isCaptain
    }));

    const newTeam: Team = {
      id: teamId,
      name: teamName.trim(),
      players: registeredPlayers
    };

    try {
      // 1. Write the team to the global team database
      await setDoc(doc(db, 'teams', teamId), newTeam);

      // 2. Append the team to the selected Tournament's team list
      const selectedTour = tournaments.find(t => t.id === selectedTournamentId);
      if (selectedTour) {
        const updatedTeams = [...(selectedTour.teams || []), newTeam];
        await updateDoc(doc(db, 'tournaments', selectedTournamentId), {
          teams: updatedTeams
        });
        toast.success(`Success! Registered ${teamName} into ${selectedTour.name}.`);
      } else {
        toast.success(`Registered ${teamName} globally.`);
      }

      // Reset
      setTeamName('');
      setSquad([{ name: '', role: 'Batsman', isCaptain: true }]);
      setShowTeamForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tournaments/${selectedTournamentId}/teams`);
    }
  };

  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || r.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8 px-2 md:px-0 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden border border-slate-900 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-red opacity-15 blur-[120px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-600 opacity-5 blur-[120px] -ml-32 -mb-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3,5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400">
              <Shield className="w-3.5 h-3.5 fill-current text-amber-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] font-mono">Apna Cricket ID Registry</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none font-sans">
              BUILD YOUR <span className="text-brand-red italic text-glow-red">IDENTITY.</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-wider text-xs max-w-2xl leading-relaxed">
              Every legend starts somewhere. Register is a global talent, verify your mobile identity, and build official professional squads directly synced with physical scorecards.
            </p>
          </div>
          <div className="flex gap-4">
             <div className="w-16 h-16 md:w-24 md:h-24 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0 shadow-lg shadow-black/80">
               <UserPlus className="w-8 h-8 md:w-12 md:h-12 text-brand-red" />
             </div>
          </div>
        </div>
      </div>

      {/* Registry Navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full max-w-2xl mx-auto">
        <button
          onClick={() => {
            setActiveTab('global');
            setShowPlayerForm(false);
          }}
          className={cn(
            "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2",
            activeTab === 'global' ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Globe className="w-3.5 h-3.5" />
          Global Player ID
        </button>
        <button
          onClick={() => {
            setActiveTab('tournament');
            setShowTeamForm(false);
          }}
          className={cn(
            "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2",
            activeTab === 'tournament' ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Trophy className="w-3.5 h-3.5" />
          Tournament Squad Linked
        </button>
      </div>

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {activeTab === 'global' ? (
          <motion.div
            key="global"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {showPlayerForm ? (
              /* Player Registration Form */
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-200 shadow-xl max-w-3xl mx-auto space-y-6"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <UserCheck className="w-6 h-6 text-brand-red" />
                      Digital ID Registration
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete profile to enroll in global database</p>
                  </div>
                  <button 
                    onClick={() => setShowPlayerForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleRegisterPlayer} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="e.g. MS Dhoni"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold px-4 py-3 rounded-xl focus:border-brand-red focus:bg-white outline-none transition-all"
                      />
                    </div>

                    {/* Phone/WhatsApp */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp / Mobile Number</label>
                      <input 
                        type="tel" 
                        required
                        value={playerPhone}
                        onChange={(e) => setPlayerPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold px-4 py-3 rounded-xl focus:border-brand-red focus:bg-white outline-none transition-all"
                      />
                    </div>

                    {/* Playing Role */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Playing Role</label>
                      <div className="relative">
                        <select 
                          value={playerRole}
                          onChange={(e) => setPlayerRole(e.target.value as PlayerRole)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black uppercase tracking-wider px-4 py-3 rounded-xl focus:border-brand-red focus:bg-white outline-none appearance-none cursor-pointer"
                        >
                          <option value="Batsman">🏏 Batsman</option>
                          <option value="Bowler">🥎 Bowler</option>
                          <option value="All-Rounder">⚡ All-Rounder</option>
                          <option value="Wicket-Keeper">🧤 Wicket-Keeper</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* City */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City / Region</label>
                      <input 
                        type="text" 
                        required
                        value={playerCity}
                        onChange={(e) => setPlayerCity(e.target.value)}
                        placeholder="e.g. Ranchi, Jharkhand"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold px-4 py-3 rounded-xl focus:border-brand-red focus:bg-white outline-none transition-all"
                      />
                    </div>

                    {/* Batting Hand */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Batting Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Right Hand', 'Left Hand'].map((hand) => (
                          <button
                            key={hand}
                            type="button"
                            onClick={() => setBattingStyle(hand as any)}
                            className={cn(
                              "border py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                              battingStyle === hand 
                                ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            )}
                          >
                            {hand}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bowling Style */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bowling Style</label>
                      <div className="relative">
                        <select 
                          value={bowlingStyle}
                          onChange={(e) => setBowlingStyle(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black uppercase tracking-wider px-4 py-3 rounded-xl focus:border-brand-red focus:bg-white outline-none appearance-none cursor-pointer"
                        >
                          <option value="None">❌ None (Pure Batsman)</option>
                          <option value="Right-arm Fast">☄️ Right-Arm Fast / Medium</option>
                          <option value="Right-arm Spin">🌀 Right-Arm Spin / Off-Spin</option>
                          <option value="Left-arm Fast">☄️ Left-Arm Fast / Medium</option>
                          <option value="Left-arm Spin">🌀 Left-Arm Spin / Ortho</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience / Achievements Bio</label>
                    <textarea 
                      value={playerExperience}
                      onChange={(e) => setPlayerExperience(e.target.value)}
                      placeholder="List your high-score, local clubs you represented, or your best cricketing memories..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold px-4 py-3 rounded-xl focus:border-brand-red focus:bg-white outline-none transition-all resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 rounded-xl bg-brand-red hover:bg-brand-red/90 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-red/15 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    Complete ID Enrollment
                  </button>
                </form>
              </motion.div>
            ) : (
              /* Two-Column Global Registry Layout */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Benefits Side Card */}
                <div className="lg:col-span-4 bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Verified Talents List</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Unlock your official stats & scouting portal</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 uppercase text-xs">Digital Identity</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Mobile-linked verify</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Globe className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 uppercase text-xs">Universal Stats</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Batting & Bowling ledger</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Target className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 uppercase text-xs">Talent Scouting</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Regional franchise matches</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowPlayerForm(true)}
                    className="w-full py-5 rounded-2xl bg-slate-950 text-white font-black uppercase tracking-widest hover:bg-brand-red transition-all shadow-xl shadow-slate-950/15 cursor-pointer mt-6 flex items-center justify-center gap-2 text-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    Launch Registration Form
                  </button>
                </div>

                {/* Database List Display */}
                <div className="lg:col-span-8 bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Global Player Registry</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dynamic live player directory</p>
                    </div>

                    {/* Role Filter buttons */}
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1 overflow-x-auto w-full sm:w-auto">
                      {['all', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'].map((role) => (
                        <button
                          key={role}
                          onClick={() => setRoleFilter(role)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                            roleFilter === role ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {role === 'all' ? 'All Roles' : role}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search player name, city or state..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold px-4 py-3 pl-11 rounded-xl outline-none focus:border-brand-red focus:bg-white transition-all text-xs"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Registered Users List Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                    {filteredRegistrations.map((player) => (
                      <div 
                        key={player.id} 
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-150 hover:border-brand-red transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-extrabold text-sm border border-orange-200">
                              {player.name[0].toUpperCase()}
                            </div>
                            <div className="max-w-[140px] md:max-w-none">
                              <h4 className="font-extrabold text-slate-900 uppercase text-xs tracking-tight flex items-center gap-1">
                                {player.name}
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-current ml-0.5 shrink-0" />
                              </h4>
                              <div className="flex items-center gap-1.5 text-slate-500 tracking-tight mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-black uppercase font-mono">{player.city}</span>
                              </div>
                            </div>
                          </div>
                          
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-wider border border-slate-200">
                            {player.role}
                          </span>
                        </div>

                        {/* Middle metadata details */}
                        <div className="grid grid-cols-2 gap-2 bg-white/70 p-2 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">BATTING</span>
                            <span className="text-[10px] font-bold text-slate-700">{player.battingStyle}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">BOWLING</span>
                            <span className="text-[10px] font-bold text-slate-700 truncate block">{player.bowlingStyle}</span>
                          </div>
                        </div>

                        {/* Footer details */}
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                          <span className="truncate italic max-w-[140px] block">"{player.experience}"</span>
                          <span className="font-mono text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md">VERIFIED ID</span>
                        </div>
                      </div>
                    ))}

                    {filteredRegistrations.length === 0 && (
                      <div className="col-span-1 md:col-span-2 py-12 text-center text-slate-400 italic font-medium uppercase tracking-widest text-xs flex flex-col items-center gap-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <AlertCircle className="w-8 h-8 text-slate-350 animate-bounce" />
                        No players registered here yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Tournament Linked Team Entry */
          <motion.div
            key="tournament"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {showTeamForm ? (
              /* Team Squad Registration Form */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-200 shadow-xl max-w-4xl mx-auto space-y-6"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-brand-red animate-pulse" />
                      Register Squad & Team
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link team directly with active regional tournaments</p>
                  </div>
                  <button 
                    onClick={() => setShowTeamForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleRegisterTeam} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Select Tournament */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Tournament</label>
                      <div className="relative">
                        <select 
                          required
                          value={selectedTournamentId}
                          onChange={(e) => setSelectedTournamentId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-black uppercase tracking-wider px-4 py-3 rounded-xl focus:border-brand-red focus:bg-white outline-none appearance-none cursor-pointer"
                        >
                          {tournaments.length === 0 && <option value="">No Active Tournaments Found</option>}
                          {tournaments.map((t) => (
                            <option key={t.id} value={t.id}>🏆 {t.name} ({t.status.toUpperCase()})</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Team Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team / Club Name</label>
                      <input 
                        type="text" 
                        required
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. Royal Challengers"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold px-4 py-3 rounded-xl focus:border-brand-red focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Dynamic Squad Setup */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Squad Roster ({squad.length})</h4>
                      <button
                        type="button"
                        onClick={handleAddSquadRow}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-brand-red text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Player
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {squad.map((member, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-150">
                          <span className="text-[10px] font-bold text-slate-350 w-5 text-center">{idx + 1}</span>
                          
                          {/* Name */}
                          <input 
                            type="text"
                            required
                            placeholder="Player Full Name"
                            value={member.name}
                            onChange={(e) => handleSquadRowChange(idx, 'name', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 text-slate-800 font-bold px-3 py-2 rounded-lg text-xs outline-none focus:border-brand-red w-full"
                          />

                          {/* Role */}
                          <div className="relative w-full sm:w-40">
                            <select
                              value={member.role}
                              onChange={(e) => handleSquadRowChange(idx, 'role', e.target.value as PlayerRole)}
                              className="w-full bg-white border border-slate-200 text-slate-800 font-bold px-3 py-2 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                            >
                              <option value="Batsman">🏏 Batsman</option>
                              <option value="Bowler">🥎 Bowler</option>
                              <option value="All-Rounder">⚡ All-Rounder</option>
                              <option value="Wicket-Keeper">🧤 Wicket-Keeper</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Captain Switch */}
                          <button
                            type="button"
                            onClick={() => handleSquadRowChange(idx, 'isCaptain', true)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer w-full sm:w-auto",
                              member.isCaptain 
                                ? "bg-amber-100 border-amber-300 text-amber-800 font-black" 
                                : "bg-white border-slate-200 text-slate-400 hover:text-slate-500"
                            )}
                          >
                            Captain
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            disabled={squad.length <= 1}
                            onClick={() => handleRemoveSquadRow(idx)}
                            className={cn(
                              "p-2 rounded-lg border text-red-500 hover:bg-red-50 transition-all cursor-pointer w-full sm:w-auto flex justify-center",
                              squad.length <= 1 ? "opacity-30 cursor-not-allowed" : "border-slate-100 hover:border-red-200"
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 rounded-xl bg-slate-950 hover:bg-brand-red text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-950/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    Submit Squad & Build Team
                  </button>
                </form>
              </motion.div>
            ) : (
              /* Active Tournament Landing View */
              <div className="space-y-8">
                <div className="bg-amber-50 rounded-[2rem] p-6 md:p-10 border border-amber-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-amber-200 flex items-center justify-center shrink-0 shadow-md border border-amber-300">
                    <Trophy className="w-10 h-10 md:w-14 md:h-14 text-amber-700 animate-bounce" />
                  </div>
                  <div className="space-y-4 text-center md:text-left flex-1">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">Active Tournament Squad Builder</h3>
                    <p className="text-slate-600 text-xs md:text-sm font-bold uppercase tracking-wide leading-relaxed">
                      Register your complete cricket franchise. Linked squad databases are instantly tied to current match toss configs and automatically tracked for live rankings.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <button 
                        onClick={() => setShowTeamForm(true)}
                        className="px-6 py-3.5 rounded-xl bg-amber-600 text-white font-black uppercase tracking-widest text-xs hover:bg-amber-700 transition-all shadow shadow-amber-600/10 cursor-pointer"
                      >
                        Launch New Squad Form
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-4">
                     <h4 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                       <Users className="w-5 h-5 text-indigo-500" />
                       Squad Management Center
                     </h4>
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider leading-relaxed">
                       TEAM ADMINS: Build and manage playing squads, assign captain indices, and secure real-time verify records before each scheduled match toss.
                     </p>
                     <div className="h-32 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
                       <Award className="w-8 h-8 text-slate-300" />
                     </div>
                  </div>

                  <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-4">
                     <h4 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                       <Briefcase className="w-5 h-5 text-emerald-500" />
                       Interstate Form Verification
                     </h4>
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider leading-relaxed">
                       AMATEURS & ELITES: Standardized digital registration cards specifically adjusted for university matches, corporate leagues and district club meets.
                     </p>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="py-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-750 font-black uppercase text-[9px] tracking-widest">Univ. verified</div>
                        <div className="py-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-blue-750 font-black uppercase text-[9px] tracking-widest">Corp. matches</div>
                     </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
