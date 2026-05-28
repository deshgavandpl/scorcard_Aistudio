import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Sparkles, ShoppingBag, Megaphone } from 'lucide-react';

interface AdData {
  active: boolean;
  productName: string;
  description: string;
  imageUrl?: string;
  targetUrl?: string;
  ctaText?: string;
  displayType: 'marquee' | 'popup' | 'both';
  timestamp?: number;
}

export default function AdvertisementBanner() {
  const [ad, setAd] = useState<AdData | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isPopupDismissed, setIsPopupDismissed] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'advertisement'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AdData;
        setAd(data);
        
        // If there's an active popup, show it if the user hasn't dismissed it yet
        if (data.active && (data.displayType === 'popup' || data.displayType === 'both')) {
          // If a new timestamp exists or the ad has changed, we reset the dismissal
          const storedDismissedTime = localStorage.getItem('ad_dismissed_time');
          const lastAdId = localStorage.getItem('last_ad_id');
          const currentAdId = `${data.productName}-${data.timestamp || 0}`;

          if (lastAdId !== currentAdId) {
            localStorage.setItem('last_ad_id', currentAdId);
            localStorage.removeItem('ad_dismissed_time');
            setIsPopupDismissed(false);
            setShowPopup(true);
          } else if (!storedDismissedTime) {
            setIsPopupDismissed(false);
            setShowPopup(true);
          } else {
            // Dismissed already for this specific ad
            setIsPopupDismissed(true);
            setShowPopup(false);
          }
        } else {
          setShowPopup(false);
        }
      }
    });

    return () => unsub();
  }, []);

  const handleDismissPopup = () => {
    localStorage.setItem('ad_dismissed_time', Date.now().toString());
    setIsPopupDismissed(true);
    setShowPopup(false);
  };

  if (!ad || !ad.active) return null;

  const showMarquee = ad.displayType === 'marquee' || ad.displayType === 'both';
  const showPopupUI = showPopup && (ad.displayType === 'popup' || ad.displayType === 'both');

  // We loop the marquee message multiple times so it forms a continuous line
  const marqueeText = `🏏 MATCH DAY SPECIAL: ${ad.productName.toUpperCase()} — ${ad.description.toUpperCase()} ${ad.ctaText ? `[ 👉 ${ad.ctaText.toUpperCase()} NOW ]` : ''} 🏏`;
  const marqueeRepeated = Array(6).fill(marqueeText).join(' \u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 ');

  return (
    <div className="w-full space-y-3 z-40 relative">
      {/* 1. Marquee Scrolling Ticker Panel */}
      {showMarquee && (
        <a
          href={ad.targetUrl || '#'}
          target={ad.targetUrl ? '_blank' : undefined}
          rel="noreferrer"
          className="block w-full bg-slate-900 border-y border-slate-800 text-amber-300 py-2.5 overflow-hidden relative group hover:bg-slate-950 transition-colors shadow-sm"
          id="live-ad-marquee-ticker"
        >
          {/* Neon side shading filters */}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointers-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointers-events-none"></div>
          
          <div className="whitespace-nowrap flex animate-marquee-custom font-mono text-xs font-black uppercase tracking-wider relative">
            <span className="inline-block shrink-0">{marqueeRepeated}</span>
            <span className="inline-block shrink-0">{marqueeRepeated}</span>
          </div>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-red text-white py-0.5 px-2 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1 z-20">
            <span>Sponsor</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </div>
        </a>
      )}

      {/* 2. Interactive Popup Product Advertisement */}
      <AnimatePresence>
        {showPopupUI && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-2.5rem)]" id="live-ad-popup-card">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-3xl border-2 border-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden relative flex flex-col p-5 space-y-4"
            >
              {/* Corner Badge */}
              <div className="absolute top-0 left-0 bg-slate-950 text-amber-400 font-mono font-black text-[8px] tracking-[0.2em] px-3.5 py-1.5 rounded-br-2xl uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 fill-current animate-spin" />
                Featured Ad
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismissPopup}
                className="absolute top-3 right-3 p-1.5 bg-slate-100 hover:bg-brand-red text-slate-500 hover:text-white rounded-full transition-all cursor-pointer shadow-md"
                title="Dismiss Deal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="pt-4 flex items-start gap-4">
                {ad.imageUrl ? (
                  <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-150 overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={ad.imageUrl} alt={ad.productName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}

                <div className="space-y-1 text-left flex-1 min-w-0">
                  <h4 className="font-extrabold text-slate-950 text-sm tracking-tight truncate uppercase">
                    {ad.productName}
                  </h4>
                  <p className="text-xs text-slate-600 font-semibold leading-normal">
                    {ad.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleDismissPopup}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-colors"
                >
                  Later
                </button>
                <a
                  href={ad.targetUrl || '#'}
                  target={ad.targetUrl ? '_blank' : undefined}
                  rel="noreferrer"
                  onClick={handleDismissPopup}
                  className="flex-1 py-3 bg-brand-red hover:bg-red-700 text-white rounded-xl text-center font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-brand-red/20 flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {ad.ctaText || 'Get Deal'}
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
