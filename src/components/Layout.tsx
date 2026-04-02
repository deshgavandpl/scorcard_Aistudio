import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Home, BarChart2, Users, PlayCircle, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Live Score', path: '/live', icon: PlayCircle },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Stats', path: '/stats', icon: BarChart2 },
    { name: 'Teams', path: '/teams', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all">
                  <span className="text-white font-black italic text-xl">A</span>
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-black text-slate-900 uppercase tracking-tighter">Apna</span>
                  <span className="text-[0.65rem] font-bold text-blue-600 uppercase tracking-widest">Cricket</span>
                </div>
              </Link>
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
              <button className="bg-red-600 text-white px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all transform -skew-x-6">
                <span className="inline-block transform skew-x-6">Admin</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-black italic text-sm">A</span>
            </div>
            <span className="text-lg font-black uppercase tracking-tighter">Apna Cricket</span>
          </div>
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
