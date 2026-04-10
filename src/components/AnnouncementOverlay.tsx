import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Megaphone } from 'lucide-react';

export default function AnnouncementOverlay() {
  const [announcement, setAnnouncement] = useState<{ id: string, message: string, imageUrl?: string, active: boolean } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lastSeenId, setLastSeenId] = useState<string | null>(localStorage.getItem('last_announcement_id'));

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'announcement'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as any;
        if (data.active && data.id !== lastSeenId) {
          setAnnouncement(data);
          setIsVisible(true);
        } else if (!data.active) {
          setIsVisible(false);
        }
      }
    });
    return () => unsub();
  }, [lastSeenId]);

  const handleClose = () => {
    if (announcement) {
      localStorage.setItem('last_announcement_id', announcement.id);
      setLastSeenId(announcement.id);
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && announcement && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border-4 border-brand-red overflow-hidden flex flex-col"
          >
            <div className="bg-brand-red p-4 sm:p-6 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                  <Megaphone className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <span className="block font-black uppercase tracking-widest text-base sm:text-lg leading-none">Important Update</span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">From Admin</span>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[70vh] p-6 sm:p-8 space-y-6">
              {announcement.imageUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50">
                  <img 
                    src={announcement.imageUrl} 
                    alt="Announcement" 
                    className="w-full h-auto max-h-[300px] object-contain mx-auto block"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              
              <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100">
                <p className="text-slate-900 text-lg sm:text-xl font-black leading-relaxed whitespace-pre-wrap text-center italic">
                  "{announcement.message}"
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-4 bg-brand-red text-white font-black uppercase tracking-widest rounded-2xl hover:bg-brand-red/90 transition-all shadow-lg shadow-brand-red/20 text-sm"
              >
                Got it, thanks!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
