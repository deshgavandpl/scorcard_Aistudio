import React, { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Sparkles, ShoppingBag, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

interface AdItem {
  id: string;
  productName: string;
  description: string;
  imageUrl?: string;
  targetUrl?: string;
  ctaText?: string;
  displayType: 'marquee' | 'popup' | 'both';
  delayMin: number;
}

export default function AdvertisementBanner() {
  const [adList, setAdList] = useState<AdItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adActive, setAdActive] = useState(false);
  const [ad, setAd] = useState<AdItem | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [pulse, setPulse] = useState(false);

  const handleDismissPopup = useCallback(() => {
    if (ad) {
      localStorage.setItem(`ad_dismissed_time_${ad.id}`, Date.now().toString());
    }
    setShowPopup(false);
  }, [ad]);

  // Synchronously monitor all live matches to spot when a batsman or team records a new high score
  useEffect(() => {
    const q = query(collection(db, 'matches'), where('status', '==', 'Live'));
    let lastMaxBatterScore = 0;
    let lastMaxTeamScore = 0;
    let isFirstLoad = true;
    let pulseTimeoutId: NodeJS.Timeout | null = null;

    const unsub = onSnapshot(q, (snapshot) => {
      let currentMaxBatterScore = 0;
      let currentMaxTeamScore = 0;
      let topBatterName = '';

      snapshot.docs.forEach((docSnap) => {
        const matchData = docSnap.data();
        
        // Find maximum team scores in this match
        const runs1 = matchData.innings1?.runs || 0;
        const runs2 = matchData.innings2?.runs || 0;
        const maxMatchTeamScore = Math.max(runs1, runs2);
        if (maxMatchTeamScore > currentMaxTeamScore) {
          currentMaxTeamScore = maxMatchTeamScore;
        }

        // Find individual batsman scores
        if (matchData.innings1?.battingStats) {
          Object.values(matchData.innings1.battingStats).forEach((stats: any) => {
            if (stats.runs && stats.runs > currentMaxBatterScore) {
              currentMaxBatterScore = stats.runs;
              topBatterName = stats.playerName || '';
            }
          });
        }

        if (matchData.innings2?.battingStats) {
          Object.values(matchData.innings2.battingStats).forEach((stats: any) => {
            if (stats.runs && stats.runs > currentMaxBatterScore) {
              currentMaxBatterScore = stats.runs;
              topBatterName = stats.playerName || '';
            }
          });
        }
      });

      // Compare to check if a new milestone / high score has been recorded during live feed update
      if (!isFirstLoad) {
        let scoreIncreased = false;
        let milestoneReason = '';

        if (currentMaxBatterScore > lastMaxBatterScore && currentMaxBatterScore > 0) {
          scoreIncreased = true;
          milestoneReason = `🏏 ${topBatterName || 'Batsman'} reached a new high of ${currentMaxBatterScore} runs!`;
        } else if (currentMaxTeamScore > lastMaxTeamScore && currentMaxTeamScore > 0) {
          scoreIncreased = true;
          milestoneReason = `🔥 Team score increased to a new high of ${currentMaxTeamScore} runs!`;
        }

        if (scoreIncreased) {
          setPulse(true);
          toast('⚡ Live Match Milestone!', {
            description: milestoneReason,
            duration: 5000,
          });

          if (pulseTimeoutId) clearTimeout(pulseTimeoutId);
          pulseTimeoutId = setTimeout(() => {
            setPulse(false);
          }, 3000);
        }
      } else {
        isFirstLoad = false;
      }

      lastMaxBatterScore = currentMaxBatterScore;
      lastMaxTeamScore = currentMaxTeamScore;
    }, (err) => {
      console.warn("Milestone listener error:", err);
    });

    return () => {
      unsub();
      if (pulseTimeoutId) clearTimeout(pulseTimeoutId);
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'advertisement'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const active = data.active !== false;
        setAdActive(active);

        let list: AdItem[] = [];
        if (Array.isArray(data.ads) && data.ads.length > 0) {
          list = data.ads;
        } else if (data.productName) {
          list = [{
            id: 'legacy',
            productName: data.productName,
            description: data.description || '',
            imageUrl: data.imageUrl || '',
            targetUrl: data.targetUrl || '',
            ctaText: data.ctaText || 'Buy Now',
            displayType: data.displayType || 'both',
            delayMin: 1
          }];
        }

        setAdList(list);
      }
    }, (error) => {
      console.warn("Error fetching advertisements in banner:", error);
    });

    return () => unsub();
  }, []);

  // Synchronize active ad state when catalog or current index changes
  useEffect(() => {
    if (adList.length === 0) {
      setAd(null);
      setShowPopup(false);
      return;
    }

    const safeIndex = currentIndex >= adList.length ? 0 : currentIndex;
    if (safeIndex !== currentIndex) {
      setCurrentIndex(safeIndex);
      return;
    }

    const currentAd = adList[safeIndex];
    setAd(currentAd);

    if (adActive && (currentAd.displayType === 'popup' || currentAd.displayType === 'both')) {
      const storedDismissedTime = localStorage.getItem(`ad_dismissed_time_${currentAd.id}`);
      if (!storedDismissedTime) {
        setShowPopup(true);
      } else {
        setShowPopup(false);
      }
    } else {
      setShowPopup(false);
    }
  }, [currentIndex, adList, adActive]);

  // Timed execution and scheduling for multiple advertisements
  useEffect(() => {
    if (adList.length <= 1 || !adActive) return;

    const currentAd = adList[currentIndex >= adList.length ? 0 : currentIndex];
    const delayMin = currentAd?.delayMin && currentAd.delayMin > 0 ? currentAd.delayMin : 1;
    const delayMs = delayMin * 60 * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % adList.length);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [currentIndex, adList, adActive]);

  // Automatically dismiss the popup after 15 seconds
  useEffect(() => {
    if (showPopup && ad && (ad.displayType === 'popup' || ad.displayType === 'both')) {
      const timer = setTimeout(() => {
        handleDismissPopup();
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [showPopup, ad, handleDismissPopup]);

  if (!adActive || !ad) return null;

  const showMarquee = ad.displayType === 'marquee' || ad.displayType === 'both';
  const showPopupUI = showPopup && (ad.displayType === 'popup' || ad.displayType === 'both');

  // We loop the marquee message multiple times so it forms a continuous line
  const marqueeText = `🏏 MATCH DAY SPECIAL: ${ad.productName.toUpperCase()} — ${ad.description.toUpperCase()} ${ad.ctaText ? `[ 👉 ${ad.ctaText.toUpperCase()} NOW ]` : ''} 🏏`;
  const marqueeRepeated = Array(6).fill(marqueeText).join(' \u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 ');

  return (
    <div className="w-full space-y-3 z-40 relative">
      {/* 1. Marquee Scrolling Ticker Panel */}
      {showMarquee && (
        <motion.a
          href={ad.targetUrl || '#'}
          target={ad.targetUrl ? '_blank' : undefined}
          rel="noreferrer"
          animate={pulse ? {
            scale: [1, 1.02, 0.98, 1.01, 1],
            backgroundColor: ["#0f172a", "#3b0712", "#450a0a", "#3b0712", "#0f172a"],
            borderColor: ["#1e293b", "#eab308", "#ef4444", "#eab308", "#1e293b"],
            boxShadow: [
              "0 0 0 rgba(239, 68, 68, 0)",
              "0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -4px rgba(239, 68, 68, 0.3)",
              "0 0 0 rgba(239, 68, 68, 0)"
            ]
          } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="block w-full bg-slate-900 border-y border-slate-800 text-amber-300 py-2.5 overflow-hidden relative group hover:bg-slate-950 transition-colors shadow-sm"
          id="live-ad-marquee-ticker"
        >
          {/* Neon side shading filters */}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>
          
          <div className={`whitespace-nowrap flex animate-marquee-custom font-mono text-xs font-black uppercase tracking-wider relative ${pulse ? 'text-amber-200 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : ''}`}>
            <span className="inline-block shrink-0">{marqueeRepeated}</span>
            <span className="inline-block shrink-0">{marqueeRepeated}</span>
          </div>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-red text-white py-0.5 px-2 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1 z-20">
            <span>Sponsor</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </div>
        </motion.a>
      )}

      {/* 2. Interactive Popup Product Advertisement */}
      <AnimatePresence>
        {showPopupUI && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm" 
            id="live-ad-popup-card"
          >
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-[2rem] border-3 border-slate-950 shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col p-6 space-y-5 max-w-md w-full"
            >
              {/* Corner Badge */}
              <div className="absolute top-0 left-0 bg-slate-950 text-amber-400 font-mono font-black text-[9px] tracking-[0.22em] px-4 py-2 rounded-br-2xl uppercase flex items-center gap-1 z-10">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current animate-spin" />
                Featured Partner
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismissPopup}
                className="absolute top-3.5 right-3.5 p-2 bg-slate-100/95 hover:bg-brand-red text-slate-500 hover:text-white rounded-full transition-all cursor-pointer shadow-md z-20"
                title="Dismiss Deal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Image & Description container */}
              <div className="pt-4 space-y-4 text-left">
                {ad.imageUrl ? (
                  <div className="w-full aspect-[4/3] sm:aspect-[16/10] rounded-2.5xl bg-slate-50 border border-slate-150 overflow-hidden flex items-center justify-center relative shadow-inner">
                    <img 
                      src={ad.imageUrl} 
                      alt={ad.productName} 
                      className="w-full h-full object-contain p-2" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-2.5xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12" />
                  </div>
                )}

                <div className="space-y-1.5 min-w-0">
                  <h4 className="font-extrabold text-slate-150 text-lg tracking-tight uppercase flex items-center gap-2 text-slate-950">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse shrink-0"></span>
                    <span className="truncate">{ad.productName}</span>
                  </h4>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {ad.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={handleDismissPopup}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Later
                </button>
                <a
                  href={ad.targetUrl || '#'}
                  target={ad.targetUrl ? '_blank' : undefined}
                  rel="noreferrer"
                  onClick={handleDismissPopup}
                  className="flex-1 py-3.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-center font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-brand-red/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {ad.ctaText || 'Get Deal'}
                </a>
              </div>

              {/* Progress bar indication of auto-dismiss */}
              <div className="absolute bottom-0 left-0 h-1 bg-slate-200 w-full overflow-hidden">
                <motion.div
                  key={ad.id}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 15, ease: 'linear' }}
                  className="h-full bg-brand-red"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
