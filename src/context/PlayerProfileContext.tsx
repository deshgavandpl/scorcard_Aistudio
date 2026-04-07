import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Match } from '../types/cricket';

interface PlayerProfileContextType {
  openPlayerProfile: (playerId: string, playerName: string) => void;
  closePlayerProfile: () => void;
  selectedPlayer: { id: string; name: string } | null;
  allMatches: Match[];
  loadingMatches: boolean;
}

const PlayerProfileContext = createContext<PlayerProfileContextType | undefined>(undefined);

export function PlayerProfileProvider({ children }: { children: ReactNode }) {
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string } | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'matches'));
    const unsub = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setAllMatches(matchesData);
      setLoadingMatches(false);
    });

    return () => unsub();
  }, []);

  const openPlayerProfile = (id: string, name: string) => {
    setSelectedPlayer({ id, name });
  };

  const closePlayerProfile = () => {
    setSelectedPlayer(null);
  };

  return (
    <PlayerProfileContext.Provider value={{ 
      openPlayerProfile, 
      closePlayerProfile, 
      selectedPlayer,
      allMatches,
      loadingMatches
    }}>
      {children}
    </PlayerProfileContext.Provider>
  );
}

export function usePlayerProfile() {
  const context = useContext(PlayerProfileContext);
  if (context === undefined) {
    throw new Error('usePlayerProfile must be used within a PlayerProfileProvider');
  }
  return context;
}
