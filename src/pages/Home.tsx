import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlayCircle, 
  Trophy, 
  BarChart2, 
  ArrowRight, 
  Zap, 
  CheckCircle2,
  Youtube,
  Instagram,
  Facebook,
  Globe,
  Linkedin,
  Users,
  Settings,
  Twitter,
  Github,
  MessageCircle,
  Send
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const ICON_MAP: Record<string, any> = {
  Youtube,
  Instagram,
  Facebook,
  Globe,
  Linkedin,
  Twitter,
  Github,
  MessageCircle,
  Send
};

export default function Home() {
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isAdminMode, setIsAdminMode] = useState(localStorage.getItem('isAdminMode') === 'true');
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    const handleStorageChange = () => {
      setIsAdminMode(localStorage.getItem('isAdminMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const canManage = user || isAdminMode;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'social'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (Array.isArray(data.links)) {
          setSocialLinks(data.links);
        } else {
          // Fallback for old structure
          const legacyLinks = [
            { id: 'youtube', iconName: 'Youtube', color: 'bg-[#FF0000]', hover: 'hover:bg-[#CC0000]', label: 'YouTube', url: data.youtube || '#' },
            { id: 'instagram', iconName: 'Instagram', color: 'bg-[#E4405F]', hover: 'hover:bg-[#D62976]', label: 'Instagram', url: data.instagram || '#' },
            { id: 'facebook', iconName: 'Facebook', color: 'bg-[#1877F2]', hover: 'hover:bg-[#0D65D9]', label: 'Facebook', url: data.facebook || '#' },
            { id: 'website', iconName: 'Globe', color: 'bg-[#00AEEF]', hover: 'hover:bg-[#008CCF]', label: 'Website', url: data.website || '#' },
            { id: 'linkedin', iconName: 'Linkedin', color: 'bg-[#0077B5]', hover: 'hover:bg-[#005E93]', label: 'LinkedIn', url: data.linkedin || '#' },
          ].filter(l => l.url !== '#');
          setSocialLinks(legacyLinks);
        }
      }
    });
    return () => unsub();
  }, []);

  const features = [
    "Team player registration, or simple universal player registration.",
    "Multi-city player engagement.",
    "Real-time franchise option.",
    "Tournament, all single and tournaments management."
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Floating Social Sidebar */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1 md:gap-1.5 pr-1 md:pr-3">
        {socialLinks.map((social, idx) => {
          const Icon = ICON_MAP[social.iconName] || Globe;
          return (
            <motion.a
              key={social.id}
              href={social.url === '#' ? undefined : social.url}
              onClick={social.url === '#' ? (e) => e.preventDefault() : undefined}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              className={cn(
                "w-7 h-7 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 hover:-translate-x-1",
                social.color || 'bg-slate-500',
                social.hover || 'hover:bg-slate-600'
              )}
              title={social.label}
            >
              <Icon className="w-3.5 h-3.5 md:w-5 md:h-5" />
            </motion.a>
          );
        })}
        {canManage && (
          <Link 
            to="/settings" 
            className="w-7 h-7 md:w-10 md:h-10 rounded-lg flex items-center justify-center bg-slate-800 text-white shadow-lg transition-all hover:scale-110 hover:-translate-x-1 mt-1 md:mt-2"
            title="Admin Settings"
          >
            <Settings className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </Link>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8 md:space-y-12">
        {/* Hero Section - Reverted to Old Style from Photo */}
        <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-brand-red text-white p-6 md:p-16 shadow-2xl">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
          </div>
          
          <div className="relative z-10 max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-red-700/50 border border-red-600 text-red-100 font-black text-[8px] md:text-[10px] tracking-[0.2em] uppercase mb-6 md:mb-8"
            >
              <Zap className="w-3 h-3 fill-red-400 text-red-400" />
              Local Cricket Revolution
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl md:text-8xl font-black mb-6 md:mb-8 leading-[0.9] md:leading-[0.85] tracking-tighter uppercase transform -skew-x-6"
            >
              Rural Cricket <br />
              <span className="text-red-200">Revolution.</span>
            </motion.h1>
            
            <div className="space-y-6 md:space-y-8 max-w-2xl">
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base md:text-xl text-red-50 font-medium leading-relaxed"
              >
                The ultimate scoring platform for local tennis cricket, managed by <span className="font-black">Avinash Huse</span>. Powering the <span className="font-black">Deshgavhan Premier League</span> and local legends across India.
              </motion.p>

              {/* Gen-Z Inspired Feature List */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-y-3 md:gap-y-4 gap-x-8 pt-2"
              >
                <div className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-[10px] md:text-sm font-bold text-red-100 uppercase tracking-tight">Live ball-by-ball. Chase the glory.</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-[10px] md:text-sm font-bold text-red-100 uppercase tracking-tight">Universal registration. Level up your profile.</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-[10px] md:text-sm font-bold text-red-100 uppercase tracking-tight">Real-time auctions. Build your dream team.</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-[10px] md:text-sm font-bold text-red-100 uppercase tracking-tight">Match & Tournament management. Main character energy.</span>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-3 md:gap-4 pt-8 md:pt-10"
            >
              <Link 
                to="/live" 
                className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 rounded-xl bg-white text-brand-red font-black uppercase tracking-wider hover:bg-red-50 transition-all shadow-lg flex items-center justify-center gap-2 text-sm md:text-base"
              >
                Live Score <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
              <a 
                href="https://apnacricket.co.in" 
                className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 rounded-xl bg-red-700 text-white font-black uppercase tracking-wider hover:bg-red-800 transition-all border border-red-600 text-sm md:text-base text-center flex items-center justify-center"
              >
                Home
              </a>
            </motion.div>
          </div>

          {/* Decorative Element */}
          <div className="absolute right-0 bottom-0 w-1/3 h-full hidden lg:flex items-end justify-end p-8">
             <div className="w-96 h-96 bg-red-400 rounded-full blur-[120px] opacity-20"></div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard 
            title="Live Scoring" 
            desc="Ball-by-ball updates for Rural Cricket matches and local tournaments." 
            icon={PlayCircle} 
            link="/live"
            color="bg-emerald-500"
          />
          <ActionCard 
            title="Tournaments" 
            desc="Manage Deshgavhan Premier League and other local cricket events with ease." 
            icon={Trophy} 
            link="/tournaments"
            color="bg-amber-500"
          />
          <ActionCard 
            title="Player Stats" 
            desc="Track career records for local legends. Managed by Avinash Huse." 
            icon={BarChart2} 
            link="/stats"
            color="bg-brand-red"
          />
        </section>
      </div>
    </div>
  );
}

function ActionCard({ title, desc, icon: Icon, link, color }: any) {
  return (
    <Link to={link} className="group">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-white shadow-lg", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1 group-hover:text-brand-red transition-colors">{title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
