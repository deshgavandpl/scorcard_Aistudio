import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Home, BarChart2, Users, PlayCircle, Menu, X, LogIn, LogOut, User, Mail, Shield, Phone, MessageSquare, Send, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', mobile: '', issue: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (adminId === 'admin' && adminPass === '5007') {
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.mobile || !contactForm.issue) {
      toast.error('Please fill all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'contacts'), {
        ...contactForm,
        createdAt: serverTimestamp(),
        userId: user?.uid || 'anonymous'
      });
      toast.success('Message sent! We will contact you soon.');
      setContactForm({ name: '', mobile: '', issue: '' });
      setShowContact(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Live Score', path: '/live', icon: PlayCircle },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Stats', path: '/stats', icon: BarChart2 },
    { name: 'Help', path: '/help', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AnimatePresence>
        {/* Admin Login Modal */}
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
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
            </motion.div>
          </motion.div>
        )}

        {/* Contact Modal */}
        {showContact && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-brand-red" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Contact Us</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Apna Cricket System</p>
                  </div>
                </div>
                <button onClick={() => setShowContact(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                  <input 
                    type="text" 
                    value={contactForm.name}
                    onChange={(e) => setContactForm(s => ({ ...s, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-red outline-none font-bold text-sm"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Mobile Number
                  </label>
                  <input 
                    type="tel" 
                    value={contactForm.mobile}
                    onChange={(e) => setContactForm(s => ({ ...s, mobile: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-red outline-none font-bold text-sm"
                    placeholder="+91 00000 00000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Describe Issue
                  </label>
                  <textarea 
                    value={contactForm.issue}
                    onChange={(e) => setContactForm(s => ({ ...s, issue: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-red outline-none font-bold text-sm min-h-[100px] resize-none"
                    placeholder="Tell us what's happening..."
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : <><Send className="w-4 h-4" /> Send Message</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Privacy Modal */}
        {showPrivacy && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center sticky top-0 bg-white pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Privacy Policy</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Policy</p>
                  </div>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6 text-slate-600">
                <section className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">1. Data Collection</h3>
                  <p className="text-xs leading-relaxed font-medium">
                    We collect minimal data required for your cricket experience, including your name, email, and match statistics. This data is used solely to power the Apna Cricket System features.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">2. Data Usage</h3>
                  <p className="text-xs leading-relaxed font-medium">
                    Your data helps us manage tournaments, track player performance, and provide real-time scoring. We never sell your personal information to third parties.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">3. Security</h3>
                  <p className="text-xs leading-relaxed font-medium">
                    We use industry-standard encryption and secure Firebase infrastructure to protect your data. Your privacy is our top priority.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">4. Your Rights</h3>
                  <p className="text-xs leading-relaxed font-medium">
                    You have the right to access, update, or request deletion of your data at any time through your account settings or by contacting our support team.
                  </p>
                </section>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase text-center">
                    Last Updated: April 2026 • © Apna Cricket System
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowPrivacy(false)}
                className="w-full py-4 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* About Modal */}
        {showAbout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center">
                    <span className="text-white font-black italic text-xl">A</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">About Us</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Apna Cricket System</p>
                  </div>
                </div>
                <button onClick={() => setShowAbout(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4 text-slate-600">
                <p className="text-sm font-medium leading-relaxed">
                  <span className="font-black text-brand-red">Apna Cricket System</span> is the ultimate digital companion for local tennis cricket in India, specifically designed for <span className="font-bold">Rural Cricket</span> and tournaments like the <span className="font-bold">Deshgavhan Premier League</span>. 
                </p>
                <p className="text-sm font-medium leading-relaxed">
                  Managed by <span className="font-bold">Avinash Huse</span>, we empower village leagues and local legends with professional-grade scoring, real-time auctions, and comprehensive tournament management tools at <span className="font-bold">apnacricket.co.in</span>.
                </p>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-brand-red uppercase tracking-widest text-center">
                    Powering every village cricket league of India.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowAbout(true)}
                className="w-full py-4 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest hover:bg-red-700 transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="https://apnacricket.co.in" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all">
                  <span className="text-white font-black italic text-xl">A</span>
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-black text-slate-900 uppercase tracking-tighter">Apna</span>
                  <span className="text-[0.65rem] font-bold text-brand-red uppercase tracking-widest">Cricket</span>
                </div>
              </a>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  id={item.name === 'Tournaments' ? 'nav-tournaments' : undefined}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                    location.pathname === item.path
                      ? "bg-brand-red text-white shadow-md"
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
                      <span className="text-[10px] font-black text-brand-red uppercase tracking-widest">Admin Mode</span>
                      <span className="text-xs font-bold text-slate-900">Unlocked</span>
                    </div>
                    <button 
                      onClick={handleAdminLogout}
                      className="p-2 rounded-full hover:bg-slate-100 text-brand-red transition-all"
                      title="Lock Admin Mode"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowAdminLogin(true)}
                    className="bg-brand-red text-white px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2"
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
                        ? "bg-brand-red text-white"
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
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-50 text-brand-red font-bold"
                >
                  <span className="uppercase tracking-widest text-xs">Admin Mode: Unlocked</span>
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={() => { setShowAdminLogin(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-red text-white font-bold uppercase tracking-widest text-xs"
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
                    className="p-2 text-brand-red"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-red text-white font-bold uppercase tracking-widest text-xs"
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
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <a href="https://apnacricket.co.in" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center group-hover:scale-110 transition-all">
                <span className="text-white font-black italic text-sm">A</span>
              </div>
              <span className="text-lg font-black uppercase tracking-tighter">Apna Cricket</span>
            </a>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/help" className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">Help Guide</Link>
              <button onClick={() => setShowAbout(true)} className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">About</button>
              <button onClick={() => setShowContact(true)} className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">Contact</button>
              <button onClick={() => setShowPrivacy(true)} className="text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">Privacy</button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <div className="space-y-1">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                Official Platform: <span className="text-white">apnacricket.co.in</span>
              </p>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                Managed by Avinash Huse • Rural Cricket Specialist
              </p>
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              © 2026 Apna Cricket. Powering Deshgavhan Premier League & Local Legends.
            </p>
          </div>

          {/* Hidden SEO Keywords for Indexing */}
          <div className="sr-only">
            <h2>Rural Cricket Live Scoring</h2>
            <p>Apna Cricket by Avinash Huse provides live scoring for Deshgavhan Premier League and other rural cricket tournaments in India. Visit apnacricket.co.in for the best cricket scoring experience.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
