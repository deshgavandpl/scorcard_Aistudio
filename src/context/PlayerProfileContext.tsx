import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PlayerProfileContextType {
  openPlayerProfile: (playerId: string, playerName: string) => void;
  closePlayerProfile: () => void;
  selectedPlayer: { id: string; name: string } | null;
}

const PlayerProfileContext = createContext<PlayerProfileContextType | undefined>(undefined);

export function PlayerProfileProvider({ children }: { children: ReactNode }) {
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string } | null>(null);

  const openPlayerProfile = (id: string, name: string) => {
    setSelectedPlayer({ id, name });
  };

  const closePlayerProfile = () => {
    setSelectedPlayer(null);
  };

  return (
    <PlayerProfileContext.Provider value={{ openPlayerProfile, closePlayerProfile, selectedPlayer }}>
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
