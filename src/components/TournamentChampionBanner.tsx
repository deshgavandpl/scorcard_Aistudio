import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Star, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TournamentChampionBanner() {
  const winners = [
    {
      rank: 2,
      name: "Ajinkya classes",
      prize: "₹15,000",
      color: "from-slate-300 to-slate-100",
      text: "text-slate-600",
      border: "border-slate-200",
      glow: "shadow-slate-200/50",
      height: "h-32",
      icon: <Medal className="w-6 h-6 text-slate-400" />
    },
    {
      rank: 1,
      name: "Ankushraj 11",
      prize: "₹21,000",
      color: "from-amber-400 via-yellow-200 to-amber-300",
      text: "text-amber-700",
      border: "border-amber-300",
      glow: "shadow-amber-200/50",
      height: "h-40",
      icon: <Trophy className="w-10 h-10 text-amber-600" />
    },
    {
      rank: 3,
      name: "Cotton 11",
      prize: "₹11,000",
      color: "from-orange-300 to-orange-100",
      text: "text-orange-700",
      border: "border-orange-200",
      glow: "shadow-orange-200/50",
      height: "h-28",
      icon: <Medal className="w-5 h-5 text-orange-400" />
    }
  ];

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 mb-12 shadow-2xl border border-slate-800">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-brand-red rounded-full filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500 rounded-full filter blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-amber-400 mb-2">
            <Sparkles className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Season Finale</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight">
            Grand Champions <span className="text-brand-red">Announced</span>
          </h2>
          <p className="text-slate-400 font-medium max-w-lg mx-auto">
            Witness the legends who dominated the field. Congratulations to the victors of Apna Cricket Season!
          </p>
        </motion.div>

        {/* Podium Section */}
        <div className="flex flex-row items-end justify-center gap-2 md:gap-6 w-full max-w-4xl py-6">
          {winners.map((winner, idx) => (
            <motion.div
              key={winner.rank}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.2 + 0.5, type: "spring", damping: 15 }}
              className="flex flex-col items-center flex-1"
            >
              {/* Profile/Icon area */}
              <div className={cn(
                "w-16 h-16 md:w-24 md:h-24 rounded-full bg-slate-800 border-4 flex items-center justify-center mb-4 relative",
                winner.rank === 1 ? "border-amber-400 shadow-xl shadow-amber-400/20" : 
                winner.rank === 2 ? "border-slate-300 shadow-lg shadow-slate-300/10" : 
                "border-orange-300"
              )}>
                {winner.icon}
                {winner.rank === 1 && (
                   <motion.div 
                     animate={{ rotate: 360 }}
                     transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                     className="absolute -inset-1 border-2 border-dashed border-amber-400/30 rounded-full"
                   />
                )}
                <div className={cn(
                  "absolute -bottom-2 px-3 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-lg",
                  winner.rank === 1 ? "bg-amber-500" : winner.rank === 2 ? "bg-slate-500" : "bg-orange-500"
                )}>
                  {winner.rank === 1 ? '1st' : winner.rank === 2 ? '2nd' : '3rd'}
                </div>
              </div>

              {/* Box Podium */}
              <div className={cn(
                "w-full rounded-t-3xl bg-gradient-to-b flex flex-col items-center justify-center p-4 md:p-6 transition-all shadow-2xl relative group",
                winner.color,
                winner.height
              )}>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-3xl" />
                <p className={cn("text-xs md:text-sm font-black uppercase tracking-tight mb-1 text-center truncate w-full", winner.text)}>
                  {winner.name}
                </p>
                <div className="flex flex-col items-center">
                   <p className={cn("text-[10px] font-bold uppercase opacity-60", winner.text)}>Price Money</p>
                   <p className={cn("text-lg md:text-2xl font-black tracking-tighter", winner.text)}>
                     {winner.prize}
                   </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"
        />

        <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
           {/* Mock sponsors or decorative icons */}
           <div className="flex items-center gap-2">
             <Star className="w-5 h-5 text-white" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Premium League</span>
           </div>
           <div className="flex items-center gap-2 text-white">
             <Trophy className="w-5 h-5" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white">Finalist Pro</span>
           </div>
        </div>
      </div>
    </div>
  );
}
