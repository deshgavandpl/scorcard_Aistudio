import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Shield, User, AlertCircle, LogIn, X, Edit2 } from 'lucide-react';
import { Team, Player, PlayerRole } from '../types/cricket';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { collection, onSnapshot, query, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';
import { usePlayerProfile } from '../context/PlayerProfileContext';

export default function Teams() {
  const { openPlayerProfile } = usePlayerProfile();
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [managingTeam, setManagingTeam] = useState<Team | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('Batsman');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    const handleStorageChange = () => {
      setIsAdminMode(localStorage.getItem('isAdminMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const canManage = user || isAdminMode;

  useEffect(() => {
    const q = query(collection(db, 'teams'));
    const unsub = onSnapshot(q, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teams');
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const addTeam = async () => {
    if (!canManage || !newTeamName.trim()) return;
    const teamId = Math.random().toString(36).substr(2, 9);
    const newTeam: Team = {
      id: teamId,
      name: newTeamName,
      players: []
    };
    
    try {
      await setDoc(doc(db, 'teams', teamId), newTeam);
      setNewTeamName('');
      toast.success('Team added successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teams/${teamId}`);
    }
  };

  const updateTeam = async () => {
    if (!canManage || !editingTeam || !editTeamName.trim()) return;
    
    const updatedTeam = {
      ...editingTeam,
      name: editTeamName
    };

    try {
      await setDoc(doc(db, 'teams', editingTeam.id), updatedTeam);
      setEditingTeam(null);
      toast.success('Team updated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teams/${editingTeam.id}`);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!canManage) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
      toast.success('Team deleted successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `teams/${id}`);
    }
  };

  const addPlayer = async () => {
    if (!canManage || !managingTeam || !newPlayerName.trim()) return;
    
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPlayerName,
      role: newPlayerRole
    };

    const updatedTeam = {
      ...managingTeam,
      players: [...managingTeam.players, newPlayer]
    };

    try {
      await setDoc(doc(db, 'teams', managingTeam.id), updatedTeam);
      setManagingTeam(updatedTeam);
      setNewPlayerName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teams/${managingTeam.id}`);
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!canManage || !managingTeam) return;

    const updatedTeam = {
      ...managingTeam,
      players: managingTeam.players.filter(p => p.id !== playerId)
    };

    try {
      await setDoc(doc(db, 'teams', managingTeam.id), updatedTeam);
      setManagingTeam(updatedTeam);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teams/${managingTeam.id}`);
    }
  };

  const toggleCaptain = async (playerId: string) => {
    if (!canManage || !managingTeam) return;

    const updatedTeam = {
      ...managingTeam,
      players: managingTeam.players.map(p => ({
        ...p,
        isCaptain: p.id === playerId ? !p.isCaptain : false // Only one captain
      }))
    };

    try {
      await setDoc(doc(db, 'teams', managingTeam.id), updatedTeam);
      setManagingTeam(updatedTeam);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `teams/${managingTeam.id}`);
    }
  };

  return (
    <div className="space-y-8">
      {!canManage && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-brand-red shrink-0 mt-0.5" />
            <div>
              <p className="text-lg font-black text-brand-red uppercase tracking-tight">Admin Access Required</p>
              <p className="text-sm text-red-700 font-medium">You can view all teams, but you must be logged in or use Admin PIN to add or delete teams.</p>
            </div>
          </div>
          <button 
            onClick={handleLogin}
            className="px-8 py-3 bg-brand-red text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-red/90 transition-all shadow-lg flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" /> Login with Google
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Teams</h1>
          <p className="text-slate-500 font-medium">Manage your local franchises and rosters.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <input 
            type="text" 
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            disabled={!canManage}
            placeholder={canManage ? "New Team Name" : "Admin access required"}
            className="flex-grow md:w-64 px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-red outline-none transition-all font-bold disabled:bg-slate-50 disabled:text-slate-400 text-sm"
          />
          <button 
            onClick={addTeam}
            disabled={!canManage || !newTeamName.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-red text-white font-black uppercase tracking-wider hover:bg-brand-red/90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            <Plus className="w-5 h-5" /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <motion.div 
            key={team.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                  <Shield className="w-6 h-6 text-brand-red" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{team.name}</h3>
              </div>
              <div className="flex gap-1">
                {canManage && (
                  <button 
                    onClick={() => {
                      setEditingTeam(team);
                      setEditTeamName(team.name);
                    }}
                    className="p-1.5 rounded-lg bg-brand-red/20 text-brand-red hover:bg-brand-red hover:text-white transition-all shadow-sm"
                    title="Edit Team"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {canManage && (
                  <button 
                    onClick={() => setTeamToDelete(team.id)}
                    className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    title="Delete Team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Squad Size</span>
                <span className="font-black text-slate-900">{team.players.length} Players</span>
              </div>
              
              <div className="space-y-2">
                {team.players.slice(0, 3).map((p, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => openPlayerProfile(p.id, p.name)}
                    className="flex items-center gap-2 text-sm text-slate-600 font-medium hover:text-brand-red transition-colors w-full text-left"
                  >
                    <User className="w-3 h-3 text-slate-300" /> {p.name}
                  </button>
                ))}
                {team.players.length > 3 && (
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">+{team.players.length - 3} more</p>
                )}
                {team.players.length === 0 && (
                  <p className="text-xs text-slate-300 italic">No players added yet.</p>
                )}
              </div>

              <button 
                onClick={() => setManagingTeam(team)}
                className="w-full mt-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-50 hover:text-brand-red hover:border-red-200 transition-all"
              >
                Manage Roster
              </button>
            </div>
          </motion.div>
        ))}
        
        {teams.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center text-slate-400 italic">
            No teams created yet. Add your first team above!
          </div>
        )}
      </div>

      <AnimatePresence>
        {managingTeam && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{managingTeam.name} Roster</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage players and roles</p>
                </div>
                <button onClick={() => setManagingTeam(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {canManage && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add New Player</h3>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input 
                      type="text" 
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Player Name"
                      className="flex-grow px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-brand-red transition-all"
                    />
                    <select 
                      value={newPlayerRole}
                      onChange={(e) => setNewPlayerRole(e.target.value as any)}
                      className="px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-brand-red transition-all"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicket-Keeper">Wicket-Keeper</option>
                    </select>
                    <button 
                      onClick={addPlayer}
                      disabled={!newPlayerName.trim()}
                      className="px-6 py-3 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest text-xs hover:bg-brand-red/90 transition-all shadow-lg disabled:opacity-50"
                    >
                      Add Player
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Squad ({managingTeam.players.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {managingTeam.players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-red-100 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          player.isCaptain ? "bg-brand-red text-white" : "bg-slate-50 text-slate-400"
                        )}>
                          {player.isCaptain ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <button 
                          onClick={() => openPlayerProfile(player.id, player.name)}
                          className="text-left"
                        >
                          <p className="font-bold text-slate-900 uppercase tracking-tight text-sm flex items-center gap-2 hover:text-brand-red transition-colors">
                            {player.name}
                            {player.isCaptain && <span className="text-[8px] font-black bg-brand-red text-white px-1.5 py-0.5 rounded-full">CAPTAIN</span>}
                          </p>
                          <p className="text-[10px] font-black text-brand-red uppercase tracking-widest">{player.role}</p>
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <button 
                            onClick={() => toggleCaptain(player.id)}
                            className={cn(
                              "p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                              player.isCaptain ? "text-brand-red bg-red-50" : "text-slate-300 hover:text-brand-red hover:bg-red-50"
                            )}
                            title={player.isCaptain ? "Remove Captaincy" : "Make Captain"}
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        {canManage && (
                          <button 
                            onClick={() => removePlayer(player.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {managingTeam.players.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 italic text-sm">
                      No players in the squad yet.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTeam && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Edit Team</h2>
                <button onClick={() => setEditingTeam(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Name</label>
                  <input 
                    type="text" 
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-brand-red transition-all"
                  />
                </div>
              </div>

              <button 
                onClick={updateTeam}
                className="w-full py-4 rounded-2xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-brand-red/90 transition-all shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        onConfirm={() => teamToDelete && deleteTeam(teamToDelete)}
        title="Delete Team?"
        message="This will permanently delete this team and all its player data. This action cannot be undone."
        confirmText="Delete Now"
        isDestructive={true}
      />
    </div>
  );
}
