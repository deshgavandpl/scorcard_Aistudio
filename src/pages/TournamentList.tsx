import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Plus, Calendar, Users, ChevronRight, Trash2, Copy } from 'lucide-react';
import { Tournament, Match } from '../types/cricket';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { collection, onSnapshot, query, deleteDoc, doc, getDocs, where, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useAdmin } from '../context/AdminContext';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'sonner';

export default function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const { isAdminMode } = useAdmin();
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);

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
    const q = query(collection(db, 'tournaments'));
    const unsub = onSnapshot(q, (snapshot) => {
      const tournamentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(tournamentsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tournaments');
    });
    return () => unsub();
  }, []);

  const deleteTournament = async (tournamentId: string) => {
    if (!canManage) return;
    
    const toastId = toast.loading('Deleting tournament and matches...');
    
    try {
      // 1. Delete all matches associated with this tournament
      const q = query(collection(db, 'matches'), where('tournamentId', '==', tournamentId));
      const matchesSnap = await getDocs(q);
      
      if (!matchesSnap.empty) {
        const deletePromises = matchesSnap.docs.map(matchDoc => 
          deleteDoc(doc(db, 'matches', matchDoc.id))
        );
        await Promise.all(deletePromises);
      }

      // 2. Delete the tournament itself
      await deleteDoc(doc(db, 'tournaments', tournamentId));
      
      toast.success('Tournament and all associated matches deleted successfully.', { id: toastId });
    } catch (error) {
      console.error("Error deleting tournament:", error);
      handleFirestoreError(error, OperationType.DELETE, `tournaments/${tournamentId}`);
      toast.error('Failed to delete tournament.', { id: toastId });
    } finally {
      setTournamentToDelete(null);
    }
  };

  const cloneTournament = async (tournament: Tournament) => {
    if (!canManage) return;
    
    const toastId = toast.loading('Cloning tournament...');
    
    try {
      const newTournamentId = Math.random().toString(36).substr(2, 9);
      const newTournamentName = `${tournament.name} (Copy)`;
      
      // 1. Clone matches with new IDs and reset states
      const newMatches: Match[] = tournament.matches.map((m, idx) => {
        const newMatchId = Math.random().toString(36).substr(2, 9);
        return {
          ...m,
          id: newMatchId,
          tournamentId: newTournamentId,
          tournamentName: newTournamentName,
          status: 'Upcoming',
          currentInnings: 1,
          innings1: undefined,
          innings2: undefined,
          superOverInnings1: undefined,
          superOverInnings2: undefined,
          isSuperOver: false,
          winnerId: undefined,
          resultMessage: undefined,
          manOfTheMatch: undefined,
          createdAt: Date.now() + idx,
          order: idx + 1
        } as Match;
      });

      const newTournament: Tournament = {
        ...tournament,
        id: newTournamentId,
        name: newTournamentName,
        matches: newMatches,
        status: 'Live',
        winnerId: undefined,
        resultMessage: undefined
      };

      // 2. Save new tournament
      await setDoc(doc(db, 'tournaments', newTournamentId), newTournament);
      
      // 3. Save each new match to the matches collection
      for (const match of newMatches) {
        await setDoc(doc(db, 'matches', match.id), match);
      }
      
      toast.success('Tournament cloned successfully!', { id: toastId });
    } catch (error) {
      console.error("Error cloning tournament:", error);
      handleFirestoreError(error, OperationType.WRITE, 'tournaments');
      toast.error('Failed to clone tournament.', { id: toastId });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Tournaments</h1>
            {isAdminMode && !user && (
              <span className="px-2 py-0.5 rounded bg-red-100 text-brand-red text-[10px] font-black uppercase tracking-widest">Admin Mode</span>
            )}
          </div>
          <p className="text-slate-500 font-medium">Create and manage your cricket leagues.</p>
        </div>
        {canManage && (
          <Link 
            to="/tournaments/new"
            className="px-6 py-3 rounded-xl bg-brand-red text-white font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create Tournament
          </Link>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">No Tournaments Yet</h3>
          <p className="text-slate-400 max-w-xs mx-auto mb-8">Start your first league and invite teams to compete for the glory.</p>
          <Link 
            to="/tournaments/new"
            className="inline-flex items-center gap-2 text-brand-red font-black uppercase text-sm tracking-widest hover:text-red-700 transition-colors"
          >
            Create Now <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group"
            >
              <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Trophy className="w-20 h-20" />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-[0.2em] inline-block",
                    t.status === 'Live' ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-300"
                  )}>
                    {t.status}
                  </span>
                  <div className="flex gap-2">
                    {canManage && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          cloneTournament(t);
                        }}
                        className="p-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-brand-red hover:text-white transition-all shadow-sm"
                        title="Clone Tournament"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    )}
                    {canManage && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTournamentToDelete(t.id);
                        }}
                        className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-50 hover:text-white transition-all shadow-sm"
                        title="Delete Tournament"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight truncate">{t.name}</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    <Users className="w-4 h-4" /> Teams
                  </div>
                  <span className="font-black text-slate-900">{t.teams.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    <Calendar className="w-4 h-4" /> Matches
                  </div>
                  <span className="font-black text-slate-900">{t.matches.length}</span>
                </div>
                
                <Link 
                  to={`/tournament/${t.id}`}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs hover:bg-brand-red hover:text-white hover:border-brand-red transition-all"
                >
                  View Tournament <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!tournamentToDelete}
        onClose={() => setTournamentToDelete(null)}
        onConfirm={() => tournamentToDelete && deleteTournament(tournamentToDelete)}
        title="Delete Tournament?"
        message="This will permanently delete the tournament and all its associated matches. This action cannot be undone."
        confirmText="Delete Now"
        isDestructive={true}
      />
    </div>
  );
}
