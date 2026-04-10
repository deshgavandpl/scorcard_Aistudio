import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextType {
  isAdminMode: boolean;
  setIsAdminMode: (value: boolean) => void;
  login: (id: string, pin: string) => boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // Use sessionStorage so admin mode resets when the tab/browser is closed
  const [isAdminMode, setIsAdminModeState] = useState(() => {
    return sessionStorage.getItem('isAdminMode') === 'true';
  });

  const setIsAdminMode = (value: boolean) => {
    setIsAdminModeState(value);
    if (value) {
      sessionStorage.setItem('isAdminMode', 'true');
    } else {
      sessionStorage.removeItem('isAdminMode');
    }
  };

  const login = (id: string, pin: string) => {
    // Hardcoded credentials as per existing logic
    if (id === 'admin' && pin === '5007') {
      setIsAdminMode(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdminMode(false);
  };

  return (
    <AdminContext.Provider value={{ isAdminMode, setIsAdminMode, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
