import React from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Trophy, BarChart2, Users, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-blue-900 text-white p-8 md:p-16 shadow-2xl">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:20px_20px]"></div>
        </div>
        
        <div className="relative z-10 max-w-2xl">
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
            className="text-5xl md:text-7xl font-black mb-6 leading-[0.9] tracking-tighter uppercase transform -skew-x-6"
          >
            Every Run <br />
            <span className="text-blue-400">Counts.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-blue-100 mb-10 font-medium leading-relaxed max-w-lg"
          >
            The ultimate scoring platform for local tennis cricket. Track your matches, manage tournaments, and become a local legend.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/live" className="px-8 py-4 rounded-xl bg-white text-blue-900 font-black uppercase tracking-wider hover:bg-blue-50 transition-all shadow-lg flex items-center gap-2">
              Start Scoring <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/tournaments" className="px-8 py-4 rounded-xl bg-blue-800 text-white font-black uppercase tracking-wider hover:bg-blue-700 transition-all border border-blue-700">
              Tournaments
            </Link>
          </motion.div>
        </div>

        {/* Decorative Element */}
        <div className="absolute right-0 bottom-0 w-1/3 h-full hidden lg:flex items-end justify-end p-8">
           <div className="w-64 h-64 bg-blue-800 rounded-full blur-3xl opacity-50"></div>
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

      {/* Recent Matches Placeholder */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">Recent Matches</h2>
            <p className="text-slate-500 font-medium">Latest action from the grounds.</p>
          </div>
          <Link to="/stats" className="text-blue-600 font-bold uppercase text-sm hover:underline">View All</Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-12 text-slate-400 italic">
            No recent matches found. Start scoring to see them here!
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-12 text-slate-400 italic">
            Match history will appear here.
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionCard({ title, desc, icon: Icon, link, color }: any) {
  return (
    <Link to={link} className="group">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg", color)}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}
