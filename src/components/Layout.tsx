import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Home, BarChart2, Users, PlayCircle, Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminMode(false);
      localStorage.removeItem('isAdminMode');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId === 'admin' && adminPass === '1010') {
      setIsAdminMode(true);
      localStorage.setItem('isAdminMode', 'true');
      setShowAdminLogin(false);
      setAdminId('');
      setAdminPass('');
      setLoginError('');
    } else {
      setLoginError('Invalid ID or PIN');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminMode(false);
    localStorage.removeItem('isAdminMode');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Live Score', path: '/live', icon: PlayCircle },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Stats', path: '/stats', icon: BarChart2 },
    { name: 'Teams', path: '/teams', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Admin Login</h2>
              <button onClick={() => setShowAdminLogin(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin ID</label>
                <input 
                  type="text" 
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold"
                  placeholder="Enter ID"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">PIN</label>
                <input 
                  type="password" 
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold"
                  placeholder="Enter PIN"
                />
              </div>
              {loginError && <p className="text-red-500 text-xs font-bold uppercase">{loginError}</p>}
              <button 
                type="submit"
                className="w-full py-4 rounded-xl bg-blue-900 text-white font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg"
              >
                Unlock Admin Mode
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="https://ApnaCricket.co.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all">
                  <span className="text-white font-black italic text-xl">A</span>
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-black text-slate-900 uppercase tracking-tighter">Apna</span>
                  <span className="text-[0.65rem] font-bold text-blue-600 uppercase tracking-widest">Cricket</span>
                </div>
              </a>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                    location.pathname === item.path
                      ? "bg-blue-900 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                {isAdminMode ? (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Admin Mode</span>
                      <span className="text-xs font-bold text-slate-900">Unlocked</span>
                    </div>
                    <button 
                      onClick={handleAdminLogout}
                      className="p-2 rounded-full hover:bg-slate-100 text-red-500 transition-all"
                      title="Lock Admin Mode"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowAdminLogin(true)}
                    className="bg-amber-500 text-white px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" /> Admin
                  </button>
                )}

                {user ? (
                  <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google User</span>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{user.displayName || user.email}</span>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-all"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={handleLogin}
                    className="text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all"
                    title="Login with Google"
                  >
                    <User className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-600 p-2"
              >
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 py-4 px-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold uppercase tracking-wider",
                  location.pathname === item.path
                    ? "bg-blue-900 text-white"
                    : "text-slate-600 bg-slate-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            
            <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
              {isAdminMode ? (
                <button 
                  onClick={handleAdminLogout}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 text-amber-700 font-bold"
                >
                  <span className="uppercase tracking-widest text-xs">Admin Mode: Unlocked</span>
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={() => { setShowAdminLogin(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 text-white font-bold uppercase tracking-widest text-xs"
                >
                  <LogIn className="w-5 h-5" /> Admin Login
                </button>
              )}

              {user ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900 uppercase">{user.displayName}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{user.email}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-red-500"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-900 text-white font-bold uppercase tracking-widest text-xs"
                >
                  <LogIn className="w-5 h-5" /> Google Login
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <a href="https://ApnaCricket.co.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center group-hover:scale-110 transition-all">
              <span className="text-white font-black italic text-sm">A</span>
            </div>
            <span className="text-lg font-black uppercase tracking-tighter">Apna Cricket</span>
          </a>
          <p className="text-slate-400 text-sm">© 2026 Apna Cricket. Built for local legends.</p>
          <div className="flex gap-4">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">About</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Contact</a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
