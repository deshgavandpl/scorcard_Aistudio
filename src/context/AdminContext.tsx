import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

interface AdminContextType {
  isAdminMode: boolean;
  setIsAdminMode: (value: boolean) => void;
  login: (id: string, pin: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, loginDeveloper, logout } = useAuth();

  const isAdminMode = currentUser?.role === 'developer';

  const setIsAdminMode = (value: boolean) => {
    if (!value) {
      logout();
    }
  };

  const login = async (id: string, pin: string) => {
    return await loginDeveloper(id, pin);
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

