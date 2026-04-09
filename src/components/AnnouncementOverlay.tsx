import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Megaphone } from 'lucide-react';

export default function AnnouncementOverlay() {
  const [announcement, setAnnouncement] = useState<{ id: string, message: string, active: boolean } | null>(null);
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-[100]"
        >
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-brand-red overflow-hidden">
            <div className="bg-brand-red p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 animate-bounce" />
                <span className="font-black uppercase tracking-widest text-sm">New Announcement</span>
              </div>
              <button 
                onClick={handleClose}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-900 font-bold leading-relaxed whitespace-pre-wrap">
                {announcement.message}
              </p>
              <button
                onClick={handleClose}
                className="mt-6 w-full py-3 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all text-xs"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
