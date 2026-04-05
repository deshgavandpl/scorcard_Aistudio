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
  Settings
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function Home() {
  const [socialLinks, setSocialLinks] = useState([
    { id: 'youtube', icon: Youtube, color: 'bg-[#FF0000]', hover: 'hover:bg-[#CC0000]', label: 'YouTube', url: '#' },
    { id: 'instagram', icon: Instagram, color: 'bg-[#E4405F]', hover: 'hover:bg-[#D62976]', label: 'Instagram', url: '#' },
    { id: 'facebook', icon: Facebook, color: 'bg-[#1877F2]', hover: 'hover:bg-[#0D65D9]', label: 'Facebook', url: '#' },
    { id: 'website', icon: Globe, color: 'bg-[#00AEEF]', hover: 'hover:bg-[#008CCF]', label: 'Website', url: '#' },
    { id: 'linkedin', icon: Linkedin, color: 'bg-[#0077B5]', hover: 'hover:bg-[#005E93]', label: 'LinkedIn', url: '#' },
  ]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'social'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSocialLinks(prev => prev.map(link => ({
          ...link,
          url: data[link.id] || '#'
        })));
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
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5 pr-1.5 md:pr-3">
        {socialLinks.map((social, idx) => (
          <motion.a
            key={social.id}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 + idx * 0.1 }}
            className={cn(
              "w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white shadow-lg transition-all hover:scale-110 hover:-translate-x-1",
              social.color,
              social.hover
            )}
            title={social.label}
          >
            <social.icon className="w-4 h-4 md:w-5 md:h-5" />
          </motion.a>
        ))}
        <Link 
          to="/settings" 
          className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center bg-slate-800 text-white shadow-lg transition-all hover:scale-110 hover:-translate-x-1 mt-2"
          title="Admin Settings"
        >
          <Settings className="w-4 h-4 md:w-5 md:h-5" />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Hero Section - Reverted to Old Style from Photo */}
        <section className="relative overflow-hidden rounded-3xl bg-blue-900 text-white p-8 md:p-16 shadow-2xl">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
          </div>
          
          <div className="relative z-10 max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-800/50 border border-blue-700 text-blue-200 font-black text-[10px] tracking-[0.2em] uppercase mb-8"
            >
              <Zap className="w-3 h-3 fill-blue-400 text-blue-400" />
              Local Cricket Revolution
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-black mb-8 leading-[0.85] tracking-tighter uppercase transform -skew-x-6"
            >
              Every Run <br />
              <span className="text-blue-400">Counts.</span>
            </motion.h1>
            
            <div className="space-y-8 max-w-2xl">
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-blue-100 font-medium leading-relaxed"
              >
                The ultimate scoring platform for local tennis cricket. Track your matches, manage tournaments, and become a local legend.
              </motion.p>

              {/* Gen-Z Inspired Feature List */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 pt-2"
              >
                <div className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-sm font-bold text-blue-200 uppercase tracking-tight">Live ball-by-ball. Chase the glory.</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-sm font-bold text-blue-200 uppercase tracking-tight">Universal registration. Level up your profile.</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-sm font-bold text-blue-200 uppercase tracking-tight">Real-time auctions. Build your dream team.</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-sm font-bold text-blue-200 uppercase tracking-tight">Match & Tournament management. Main character energy.</span>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4 pt-10"
            >
              <Link 
                to="/live" 
                className="px-8 py-4 rounded-xl bg-white text-blue-900 font-black uppercase tracking-wider hover:bg-blue-50 transition-all shadow-lg flex items-center gap-2"
              >
                Start Scoring <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/tournaments" 
                className="px-8 py-4 rounded-xl bg-blue-800 text-white font-black uppercase tracking-wider hover:bg-blue-700 transition-all border border-blue-700"
              >
                Tournaments
              </Link>
            </motion.div>
          </div>

          {/* Decorative Element */}
          <div className="absolute right-0 bottom-0 w-1/3 h-full hidden lg:flex items-end justify-end p-8">
             <div className="w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-20"></div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard 
            title="Live Scoring" 
            desc="Start a single match or continue an ongoing one." 
            icon={PlayCircle} 
            link="/live"
            color="bg-emerald-500"
          />
          <ActionCard 
            title="Tournaments" 
            desc="Create leagues, generate fixtures, and track points." 
            icon={Trophy} 
            link="/tournaments"
            color="bg-amber-500"
          />
          <ActionCard 
            title="Player Stats" 
            desc="View top performers and all-time records." 
            icon={BarChart2} 
            link="/stats"
            color="bg-blue-500"
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
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
