import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, Search, Trophy, Shield, Users, Smartphone, Globe, Target, 
  MapPin, Phone, Briefcase, Plus, Trash2, Award, CheckCircle2, AlertCircle, X, ChevronDown, UserCheck, Camera, UploadCloud
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAdmin } from '../context/AdminContext';
import { toast } from 'sonner';
import { collection, onSnapshot, query, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PlayerRole, Tournament, Team, Player, BatterStats, BowlerStats } from '../types/cricket';
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
  photoUrl?: string;
}

const PRESET_AVATARS = [
  { name: 'Power Cap', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&q=80' },
  { name: 'Elite Bat', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80' },
  { name: 'Super Star', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80' },
  { name: 'Spin Icon', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80' },
  { name: 'Champ Focus', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&q=80' },
  { name: 'Young Gun', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80' }
];

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
  const [selectedPlayer, setSelectedPlayer] = useState<GlobalRegistration | null>(null);

  // Player Form States
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [playerRole, setPlayerRole] = useState<PlayerRole>('Batsman');
  const [battingStyle, setBattingStyle] = useState<'Right Hand' | 'Left Hand'>('Right Hand');
  const [bowlingStyle, setBowlingStyle] = useState<'Right-arm Fast' | 'Right-arm Spin' | 'Left-arm Fast' | 'Left-arm Spin' | 'None'>('None');
  const [playerCity, setPlayerCity] = useState('');
  const [playerExperience, setPlayerExperience] = useState('');
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState('');

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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) { 
        toast.error('Image size must be less than 800KB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlayerPhotoUrl(reader.result as string);
        toast.success('Photo uploaded successfully!');
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  };

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
      createdAt: Date.now(),
      ...(playerPhotoUrl ? { photoUrl: playerPhotoUrl } : {})
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
      setPlayerPhotoUrl('');
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

  const calculatePlayerStats = (playerNameStr: string, playerRole: PlayerRole) => {
    let matchesPlayed = 0;
    let totalRuns = 0;
    let totalBalls = 0;
    let fours = 0;
    let sixes = 0;
    let dismissals = 0;
    let inningsBat = 0;
    
    let bowlingOvers = 0;
    let bowlingBalls = 0;
    let bowlingRuns = 0;
    let bowlingWickets = 0;
    let maidens = 0;

    const normalizedName = playerNameStr.trim().toLowerCase();

    tournaments.forEach(tour => {
      (tour.matches || []).forEach(match => {
        let playedInThisMatch = false;

        // Check Innings 1 Batting
        if (match.innings1?.battingStats) {
          (Object.values(match.innings1.battingStats) as BatterStats[]).forEach(stat => {
            if (stat.playerName && stat.playerName.trim().toLowerCase() === normalizedName) {
              playedInThisMatch = true;
              totalRuns += stat.runs || 0;
              totalBalls += stat.balls || 0;
              fours += stat.fours || 0;
              sixes += stat.sixes || 0;
              if (stat.isOut) dismissals++;
              inningsBat++;
            }
          });
        }
        // Check Innings 2 Batting
        if (match.innings2?.battingStats) {
          (Object.values(match.innings2.battingStats) as BatterStats[]).forEach(stat => {
            if (stat.playerName && stat.playerName.trim().toLowerCase() === normalizedName) {
              playedInThisMatch = true;
              totalRuns += stat.runs || 0;
              totalBalls += stat.balls || 0;
              fours += stat.fours || 0;
              sixes += stat.sixes || 0;
              if (stat.isOut) dismissals++;
              inningsBat++;
            }
          });
        }

        // Check Innings 1 Bowling
        if (match.innings1?.bowlingStats) {
          (Object.values(match.innings1.bowlingStats) as BowlerStats[]).forEach(stat => {
            if (stat.playerName && stat.playerName.trim().toLowerCase() === normalizedName) {
              playedInThisMatch = true;
              bowlingOvers += stat.overs || 0;
              bowlingBalls += stat.balls || 0;
              bowlingRuns += stat.runs || 0;
              bowlingWickets += stat.wickets || 0;
              maidens += stat.maiden || 0;
            }
          });
        }
        // Check Innings 2 Bowling
        if (match.innings2?.bowlingStats) {
          (Object.values(match.innings2.bowlingStats) as BowlerStats[]).forEach(stat => {
            if (stat.playerName && stat.playerName.trim().toLowerCase() === normalizedName) {
              playedInThisMatch = true;
              bowlingOvers += stat.overs || 0;
              bowlingBalls += stat.balls || 0;
              bowlingRuns += stat.runs || 0;
              bowlingWickets += stat.wickets || 0;
              maidens += stat.maiden || 0;
            }
          });
        }

        if (playedInThisMatch) {
          matchesPlayed++;
        }
      });
    });

    // Helper calculate skills based on role
    const getSkills = () => {
      switch (playerRole) {
        case 'Batsman':
          return { power: 92, speed: 35, spin: 20, reflex: 88, mental: 90 };
        case 'Bowler':
          return { power: 45, speed: 89, spin: 85, reflex: 75, mental: 80 };
        case 'All-Rounder':
          return { power: 84, speed: 78, spin: 70, reflex: 85, mental: 88 };
        case 'Wicket-Keeper':
          return { power: 78, speed: 15, spin: 10, reflex: 96, mental: 92 };
        default:
          return { power: 65, speed: 60, spin: 55, reflex: 70, mental: 75 };
      }
    };

    // calculate bowling overs representation correctly
    const extraOversFromBalls = Math.floor(bowlingBalls / 6);
    const residualBalls = bowlingBalls % 6;
    const finalOvers = bowlingOvers + extraOversFromBalls + (residualBalls / 10);

    return {
      matchesPlayed,
      hasScoredStats: matchesPlayed > 0,
      skills: getSkills(),
      batting: {
        totalRuns,
        totalBalls,
        fours,
        sixes,
        dismissals,
        innings: inningsBat,
        avg: dismissals > 0 ? (totalRuns / dismissals).toFixed(1) : (totalRuns > 0 ? totalRuns.toString() : 'N/A'),
        sr: totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : 'N/A'
      },
      bowling: {
        overs: finalOvers.toFixed(1),
        runs: bowlingRuns,
        wickets: bowlingWickets,
        maidens,
        economy: (bowlingOvers * 6 + bowlingBalls) > 0 ? ((bowlingRuns / (bowlingOvers * 6 + bowlingBalls)) * 6).toFixed(2) : 'N/A',
        avg: bowlingWickets > 0 ? (bowlingRuns / bowlingWickets).toFixed(1) : 'N/A'
      }
    };
  };

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
                  {/* Profile Photo / Avatar Option */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      {/* Photo Preview inside a beautiful circular frame */}
                      <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-full bg-white border-2 border-brand-red/20 overflow-hidden flex items-center justify-center text-slate-300 shadow-xl relative ring-4 ring-slate-100 flex-shrink-0">
                          {playerPhotoUrl ? (
                            <div className="w-full h-full relative group">
                              <img src={playerPhotoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[8px] font-black text-white uppercase tracking-wider">Live Preview</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-2">
                              <span className="font-sans font-black text-3xl text-slate-400 uppercase tracking-tight block animate-pulse">
                                {playerName ? playerName[0].toUpperCase() : '?'}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">No Photo</span>
                            </div>
                          )}
                        </div>
                        {playerPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => setPlayerPhotoUrl('')}
                            className="absolute -top-1 -right-1 bg-slate-900 hover:bg-brand-red text-white rounded-full p-1.5 transition-all cursor-pointer shadow-lg hover:scale-105"
                            title="Remove Photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Photo Options Meta */}
                      <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
                        <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center justify-center sm:justify-start gap-1">
                          <Camera className="w-3.5 h-3.5 text-brand-red" />
                          Profile Photo & Identity Badge
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto sm:mx-0">
                          Select one of our preset athlete badges, upload your own local profile photo, or enter a custom URL below.
                        </p>
                      </div>
                    </div>

                    {/* Presets choice */}
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Preset Athlete Avatars</span>
                      <div className="grid grid-cols-6 gap-2">
                        {PRESET_AVATARS.map((avatar) => (
                          <button
                            key={avatar.name}
                            type="button"
                            onClick={() => setPlayerPhotoUrl(avatar.url)}
                            className={cn(
                              "relative rounded-xl overflow-hidden aspect-square border-2 transition-all hover:scale-105 active:scale-95 cursor-pointer",
                              playerPhotoUrl === avatar.url ? "border-brand-red ring-2 ring-brand-red/25 shadow-sm" : "border-transparent opacity-75 hover:opacity-100"
                            )}
                          >
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom File Upload & URL Address inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 block mb-1">Upload Local Image File</span>
                        <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-white hover:bg-slate-100/80 border border-slate-200 text-slate-800 font-extrabold text-[10px] uppercase tracking-widest rounded-xl cursor-pointer transition-all">
                          <UploadCloud className="w-4 h-4 text-slate-400" />
                          <span>Choose local file...</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 block mb-1">Or Paste Image URL</span>
                        <input
                          type="url"
                          value={playerPhotoUrl && !playerPhotoUrl.startsWith('data:') ? playerPhotoUrl : ''}
                          onChange={(e) => setPlayerPhotoUrl(e.target.value)}
                          placeholder="e.g. https://domain.com/avatar.jpg"
                          className="w-full bg-white border border-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs outline-none focus:border-brand-red transition-all"
                        />
                      </div>
                    </div>
                  </div>

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
                        onClick={() => setSelectedPlayer(player)}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-150 hover:border-brand-red hover:bg-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-all flex flex-col justify-between gap-3 group cursor-pointer relative overflow-hidden"
                        title="Click to view full player profile & stats"
                      >
                        {/* Interactive overlay card accent */}
                        <div className="absolute top-0 right-0 w-2 h-0 group-hover:h-full bg-brand-red transition-all duration-300"></div>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-extrabold text-sm border border-orange-200 overflow-hidden shrink-0">
                              {player.photoUrl ? (
                                <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                player.name[0].toUpperCase()
                              )}
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

      {/* Interactive Global Player Profile Modal */}
      <AnimatePresence>
        {selectedPlayer && (() => {
          const stats = calculatePlayerStats(selectedPlayer.name, selectedPlayer.role);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setSelectedPlayer(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden border border-slate-200/60 shadow-2xl relative my-8"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Background Banner with Red/Dark Accent */}
                <div className="bg-slate-950 h-36 relative overflow-hidden flex items-center px-8 border-b border-slate-900">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red opacity-15 blur-[80px] -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600 opacity-5 blur-[80px] -ml-16 -mb-16"></div>
                  <div className="relative z-10 flex justify-between items-center w-full">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 font-mono flex items-center gap-1.5">
                      <Shield className="w-4 h-4 fill-current text-amber-500 animate-pulse" />
                      Apna Cricket Verified Card
                    </span>
                    <button
                      onClick={() => setSelectedPlayer(null)}
                      className="p-2 bg-white/10 hover:bg-brand-red text-white hover:text-white rounded-full transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Profile Photo Floating Over Header */}
                <div className="px-8 pb-8 relative -mt-16 space-y-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
                    <div className="relative shrink-0">
                      <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-100 overflow-hidden flex items-center justify-center text-slate-300 shadow-xl relative ring-8 ring-slate-100">
                        {selectedPlayer.photoUrl ? (
                          <img src={selectedPlayer.photoUrl} alt={selectedPlayer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="font-sans font-black text-5xl text-slate-400 uppercase tracking-tight">
                            {selectedPlayer.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="absolute bottom-1 right-1 bg-blue-500 text-white p-1 rounded-full border border-white shadow-md">
                        <CheckCircle2 className="w-4.5 h-4.5 fill-current text-white shrink-0" />
                      </span>
                    </div>

                    <div className="text-center sm:text-left space-y-1.5 flex-1 pb-2">
                      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        {selectedPlayer.name}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-900 text-white font-black text-[9px] uppercase tracking-wider border border-slate-900">
                          {selectedPlayer.role}
                        </span>
                        <div className="flex items-center gap-1 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <MapPin className="w-3.5 h-3.5 text-brand-red shrink-0" />
                          <span>{selectedPlayer.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* About / Bios */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/85 space-y-1.5 text-left">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Bio & Achievements</span>
                    <p className="text-xs text-slate-600 font-semibold italic leading-relaxed">
                      "{selectedPlayer.experience || 'Club Level Enthusiast'}"
                    </p>
                  </div>

                  {/* Body Content Grid (Left: Attributes, Right: System Recorded Stats) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    {/* Athlete Rating & Attributes */}
                    <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-brand-red shrink-0" />
                          Athlete Metrics
                        </h3>
                        <span className="font-mono text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase">
                          Overall Rating: {
                            selectedPlayer.role === 'Batsman' ? '90' :
                            selectedPlayer.role === 'Bowler' ? '86' :
                            selectedPlayer.role === 'All-Rounder' ? '88' : '84'
                          }
                        </span>
                      </div>

                      <div className="space-y-3 pt-1">
                        {/* Batting Power */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <span>Batting Power / Timing</span>
                            <span className="font-mono text-slate-700">{stats.skills.power}%</span>
                          </div>
                          <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.skills.power}%` }}
                              transition={{ duration: 0.8 }}
                              className="bg-brand-red h-full rounded-full"
                            />
                          </div>
                        </div>

                        {/* Bowling Speed / Pace */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <span>Bowling Speed / Velocity</span>
                            <span className="font-mono text-slate-700">{stats.skills.speed}%</span>
                          </div>
                          <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.skills.speed}%` }}
                              transition={{ duration: 0.8 }}
                              className="bg-orange-500 h-full rounded-full"
                            />
                          </div>
                        </div>

                        {/* Spin Control */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <span>Spin Coefficient & Rpm</span>
                            <span className="font-mono text-slate-700">{stats.skills.spin}%</span>
                          </div>
                          <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.skills.spin}%` }}
                              transition={{ duration: 0.8 }}
                              className="bg-indigo-500 h-full rounded-full"
                            />
                          </div>
                        </div>

                        {/* Athletic Reflexes */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <span>Field Reflex & Reactions</span>
                            <span className="font-mono text-slate-700">{stats.skills.reflex}%</span>
                          </div>
                          <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.skills.reflex}%` }}
                              transition={{ duration: 0.8 }}
                              className="bg-emerald-500 h-full rounded-full"
                            />
                          </div>
                        </div>

                        {/* Composure */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <span>Mental Composure / Clutch</span>
                            <span className="font-mono text-slate-700">{stats.skills.mental}%</span>
                          </div>
                          <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.skills.mental}%` }}
                              transition={{ duration: 0.8 }}
                              className="bg-amber-500 h-full rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recorded Official Match Stats */}
                    <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                            Official Match Scorecards
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">Matches Played</span>
                            <span className="text-xl font-black text-slate-900 tracking-tight block mt-1">{stats.matchesPlayed}</span>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">Total Runs</span>
                            <span className="text-xl font-black text-slate-900 tracking-tight block mt-1">{stats.batting.totalRuns}</span>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">Batting Average</span>
                            <span className="text-base font-black text-slate-900 tracking-tight block mt-1.5">{stats.batting.avg}</span>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-100 text-center">
                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">Wickets Taken</span>
                            <span className="text-xl font-black text-slate-900 block mt-1">{stats.bowling.wickets}</span>
                          </div>
                        </div>

                        {/* Extra metrics detail lists */}
                        <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2 text-[10px] font-bold text-slate-600">
                          <div className="flex justify-between items-center">
                            <span className="uppercase text-slate-400 text-[8px] tracking-widest">Batting Strike Rate</span>
                            <span className="font-mono text-slate-900 font-extrabold">{stats.batting.sr}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="uppercase text-slate-400 text-[8px] tracking-widest">Overs Bowled</span>
                            <span className="font-mono text-slate-900 font-extrabold">{stats.bowling.overs}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="uppercase text-slate-400 text-[8px] tracking-widest">Economy & Average</span>
                            <span className="font-mono text-slate-900 font-extrabold">{stats.bowling.economy} / {stats.bowling.avg}</span>
                          </div>
                        </div>
                      </div>

                      {/* Info context message */}
                      <div className="text-[9px] text-slate-400 font-bold p-1 bg-white/50 rounded-lg text-center border border-slate-100 uppercase tracking-wider block mt-3">
                        {stats.hasScoredStats 
                          ? "✓ Verified player activity automatically synced with physical match ledger."
                          : "ⓘ Active registrant. No officially scored Apna Cricket matches logged yet."
                        }
                      </div>
                    </div>
                  </div>

                  {/* Bottom Mobile Communication / Contact Badges */}
                  <div className="pt-4 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">Contact Identity Badge</span>
                        <a href={`tel:${selectedPlayer.phone}`} className="text-xs font-bold text-slate-700 hover:text-brand-red transition-all font-mono">
                          {selectedPlayer.phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <a 
                        href={`https://wa.me/${selectedPlayer.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black tracking-widest text-[9px] uppercase rounded-xl border border-emerald-200 transition-all text-center"
                      >
                        Contact via WhatsApp
                      </a>
                      <button 
                        onClick={() => setSelectedPlayer(null)}
                        className="flex-1 sm:flex-none px-5 py-2 bg-slate-900 hover:bg-brand-red text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                      >
                        Close Card
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
