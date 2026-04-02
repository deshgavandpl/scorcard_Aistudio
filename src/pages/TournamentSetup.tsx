import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Trophy, Zap } from 'lucide-react';
import { Team, Tournament, Match } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function TournamentSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [teamNames, setTeamNames] = useState(['', '', '', '']);

  const addTeamField = () => {
    setTeamNames([...teamNames, '']);
  };

  const removeTeamField = (index: number) => {
    if (teamNames.length <= 2) return;
    const updated = [...teamNames];
    updated.splice(index, 1);
    setTeamNames(updated);
  };

  const updateTeamName = (index: number, value: string) => {
    const updated = [...teamNames];
    updated[index] = value;
    setTeamNames(updated);
  };

  const generateFixtures = (teams: Team[]): Match[] => {
    const matches: Match[] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: Math.random().toString(36).substr(2, 9),
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          teamAName: teams[i].name,
          teamBName: teams[j].name,
          tossWinnerId: '',
          tossDecision: 'Bat',
          oversLimit: 6,
          status: 'Upcoming',
          currentInnings: 1,
          createdAt: Date.now(),
        });
      }
    }
    return matches;
  };

  const createTournament = () => {
    const validTeams = teamNames.filter(n => n.trim() !== '');
    if (validTeams.length < 2) return;

    const teams: Team[] = validTeams.map(n => ({
      id: Math.random().toString(36).substr(2, 9),
      name: n,
      players: []
    }));

    const tournament: Tournament = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      teams,
      matches: generateFixtures(teams),
      status: 'Live'
    };

    const saved = JSON.parse(localStorage.getItem('cricket_tournaments') || '[]');
    saved.push(tournament);
    localStorage.setItem('cricket_tournaments', JSON.stringify(saved));

    navigate('/tournaments');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold uppercase text-xs tracking-widest transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-amber-500 p-8 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-20">
              <Trophy className="w-24 h-24" />
            </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter transform -skew-x-6 relative z-10">Create Tournament</h1>
          <p className="text-amber-100 text-sm font-medium mt-1 uppercase tracking-widest relative z-10">Setup your league and fixtures</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tournament Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deshgavhan Premier League"
              className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-black text-xl uppercase tracking-tight"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Teams</label>
              <button 
                onClick={addTeamField}
                className="text-xs font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Team
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {teamNames.map((team, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <div className="flex-grow relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Team {idx + 1}</div>
                    <input 
                      type="text" 
                      value={team}
                      onChange={(e) => updateTeamName(idx, e.target.value)}
                      placeholder="Enter team name"
                      className="w-full pl-20 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <button 
                    onClick={() => removeTeamField(idx)}
                    className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button 
              disabled={!name || teamNames.filter(n => n.trim() !== '').length < 2}
              onClick={createTournament}
              className="w-full py-4 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 fill-amber-400 text-amber-400" /> Generate Fixtures & Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
