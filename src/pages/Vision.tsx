import React from 'react';
import { motion } from 'motion/react';
import { Target, Lightbulb, Zap, Rocket, CreditCard, ShieldCheck, Globe, Users } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Vision() {
  const coreValues = [
    {
      title: "Digital Identity",
      desc: "Providing every rural player with a verifiable digital career. No more lost records or forgotten matches.",
      icon: <Zap className="w-8 h-8 md:w-12 md:h-12" />,
      color: "bg-red-500",
      accent: "text-red-500"
    },
    {
      title: "Talent Discovery",
      desc: "Bridging the gap between village grounds and pro academies. Your stats are your resume.",
      icon: <Lightbulb className="w-8 h-8 md:w-12 md:h-12" />,
      color: "bg-amber-500",
      accent: "text-amber-500"
    },
    {
      title: "Payment Transparency",
      desc: "Simplifying tournament entry fees and prize distributions with secure, integrated payment modules.",
      icon: <CreditCard className="w-8 h-8 md:w-12 md:h-12" />,
      color: "bg-blue-500",
      accent: "text-blue-500"
    }
  ];

  return (
    <div className="space-y-16 py-8 md:py-16">
      {/* Hero */}
      <section className="text-center space-y-8 max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-500"
        >
          <Target className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Our Mission</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-8xl font-black uppercase tracking-tight leading-[0.85]"
        >
          Powering the <span className="text-brand-red">Invisible</span> Legends.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-2xl text-slate-500 font-medium leading-relaxed"
        >
          Rural cricket is the heartbeat of the sport. Apna Cricket Platform exists to modernize, digitize, and professionalize local sports management.
        </motion.p>
      </section>

      {/* Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {coreValues.map((value, idx) => (
          <motion.div
            key={value.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + idx * 0.1 }}
            className="group p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-brand-red transition-all"
          >
            <div className={cn("w-16 h-16 md:w-20 md:h-20 rounded-3xl flex items-center justify-center text-white mb-8 transition-all group-hover:scale-110", value.color)}>
              {value.icon}
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">{value.title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{value.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Vision Statement */}
      <section className="bg-slate-900 rounded-[3rem] p-8 md:p-24 text-white relative overflow-hidden text-center md:text-left">
          <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
            <Rocket className="w-96 h-96 absolute -right-20 -top-20" />
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
             <div className="space-y-8">
               <h2 className="text-4xl md:text-7xl font-black uppercase leading-none tracking-tighter italic">
                 The Future of <br />
                 <span className="text-brand-red">Deshgavhan</span> Pro.
               </h2>
               <p className="text-slate-400 text-lg font-medium">
                 We are building more than just an app. We are building a legacy. Every ball recorded on Apna Cricket helps paint the picture of the region's top talent.
               </p>
               <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-brand-red" />
                    <span className="text-xs font-black uppercase tracking-widest">Verified Data</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="w-6 h-6 text-brand-red" />
                    <span className="text-xs font-black uppercase tracking-widest">Global Standards</span>
                  </div>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square bg-slate-800 rounded-3xl p-8 flex flex-col justify-end gap-2 border border-slate-700">
                   <p className="text-3xl font-black text-brand-red">500+</p>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Players</p>
                </div>
                <div className="aspect-square bg-brand-red rounded-3xl p-8 flex flex-col justify-end gap-2 text-white">
                   <p className="text-3xl font-black">20+</p>
                   <p className="text-[10px] font-black uppercase text-red-200 tracking-widest">Tournaments</p>
                </div>
                <div className="aspect-square bg-slate-800 rounded-3xl p-8 flex flex-col justify-end gap-2 border border-slate-700">
                   <p className="text-3xl font-black text-brand-red">100%</p>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Real-time Data</p>
                </div>
                <div className="aspect-square bg-slate-200 rounded-3xl p-8 flex flex-col justify-end gap-2 text-slate-600">
                   <Users className="w-8 h-8 mb-auto" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Solo Built</p>
                </div>
             </div>
          </div>
      </section>
    </div>
  );
}
