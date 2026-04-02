import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Shield, User } from 'lucide-react';
import { Team, Player } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('cricket_teams') || '[]');
    setTeams(saved);
  }, []);

  const addTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam: Team = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTeamName,
      players: []
    };
    const updated = [...teams, newTeam];
    setTeams(updated);
    localStorage.setItem('cricket_teams', JSON.stringify(updated));
    setNewTeamName('');
  };

  const deleteTeam = (id: string) => {
    const updated = teams.filter(t => t.id !== id);
    setTeams(updated);
    localStorage.setItem('cricket_teams', JSON.stringify(updated));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Teams</h1>
          <p className="text-slate-500 font-medium">Manage your local franchises and rosters.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="New Team Name"
            className="flex-grow md:w-64 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-bold"
          />
          <button 
            onClick={addTeam}
            className="px-6 py-3 rounded-xl bg-blue-900 text-white font-black uppercase tracking-wider hover:bg-blue-800 transition-all shadow-lg flex items-center gap-2"
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
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{team.name}</h3>
              </div>
              <button 
                onClick={() => deleteTeam(team.id)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Squad Size</span>
                <span className="font-black text-slate-900">{team.players.length} Players</span>
              </div>
              
              <div className="space-y-2">
                {team.players.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <User className="w-3 h-3 text-slate-300" /> {p.name}
                  </div>
                ))}
                {team.players.length > 3 && (
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">+{team.players.length - 3} more</p>
                )}
                {team.players.length === 0 && (
                  <p className="text-xs text-slate-300 italic">No players added yet.</p>
                )}
              </div>

              <button className="w-full mt-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
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
    </div>
  );
}
