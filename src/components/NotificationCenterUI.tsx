import React, { useState } from 'react';
import { useNotifications, NotificationLog } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, BellRing, Volume2, VolumeX, Mic, MicOff, 
  X, CheckCheck, Trash2, Clock, Sparkles, Trophy, 
  Activity, Settings, ExternalLink, HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { testSound } from '../lib/audioUtils';

export default function NotificationCenterUI() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    pushEnabled,
    soundEnabled,
    voiceEnabled,
    fcmToken,
    togglePushNotifications,
    toggleSound,
    toggleVoice,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>('alerts');

  return (
    <>
      {/* Trigger floating bell icon button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative p-2.5 rounded-full transition-all duration-300",
          isOpen 
            ? "bg-brand-red text-white scale-105 shadow-md" 
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
        title="Live Match Alerts"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="w-5.5 h-5.5 animate-bounce stroke-[2.2px]" />
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red font-black text-[9px] text-white border-2 border-white animate-pulse shadow-md">
              {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-5.5 h-5.5 stroke-[2px]" />
        )}
      </button>

      {/* Slide-out Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Panel Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-slate-55 flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.15)] bg-slate-50 border-l border-slate-200"
            >
              {/* Slanted Curved Tri-Color Pride Theme Header accent */}
              <div className="w-full h-1.5 flex relative overflow-hidden">
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, #10b981 0%, #10b981 33%, #fafafa 33%, #fafafa 66%, #f97316 66%, #f97316 100%)'
                  }}
                />
              </div>

              {/* Panel Header */}
              <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                    <span className="text-[10px] font-black uppercase text-brand-red tracking-widest leading-none">Real-Time Core</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                    Live Match Alert Hub
                  </h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Navigation selectors */}
              <div className="flex bg-white border-b border-slate-200 px-4">
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={cn(
                    "flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2",
                    activeTab === 'alerts' 
                      ? "border-brand-red text-brand-red font-black" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Bell className="w-4 h-4" />
                  Live Log ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={cn(
                    "flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2",
                    activeTab === 'settings' 
                      ? "border-brand-red text-brand-red font-black"  
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Alert Settings
                </button>
              </div>

              {/* Panel Content Scroll Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                
                {activeTab === 'alerts' && (
                  <>
                    {/* Actions Row */}
                    {notifications.length > 0 && (
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Last {notifications.length} events
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={markAllAsRead}
                            className="text-[10px] font-black text-brand-red uppercase tracking-wider hover:underline flex items-center gap-1"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark all read
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            onClick={clearAll}
                            className="text-[10px] font-black text-slate-400 uppercase tracking-wider hover:text-slate-600 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear log
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Historical Notifications List */}
                    {notifications.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center flex flex-col items-center justify-center min-h-[300px]">
                        <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center mb-4 text-slate-300">
                          <Bell className="w-8 h-8 stroke-[1.2px]" />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">No Alerts Logged</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                          Cricket alerts appear dynamic in real-time. Keep a live match running to observe live automated notifications!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notifications.map((log) => (
                          <div
                            key={log.id}
                            className={cn(
                              "relative p-4 rounded-xl border transition-all hover:translate-y-[-1px]",
                              log.read 
                                ? "bg-white border-slate-200 shadow-xs opacity-75" 
                                : "bg-white border-l-4 border-l-brand-red border-slate-200 shadow-md"
                            )}
                          >
                            {/* Alert Badge Icon indicator */}
                            <div className="flex gap-3">
                              <div className="mt-0.5">
                                {log.type === 'wicket' ? (
                                  <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-extrabold text-xs">
                                    🏏
                                  </div>
                                ) : log.type === 'result' ? (
                                  <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-extrabold text-xs">
                                    🏆
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-xs">
                                    📢
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 space-y-1">
                                <h4 className={cn("text-xs leading-snug tracking-tight", log.read ? "font-bold text-slate-700" : "font-black text-slate-900")}>
                                  {log.title}
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  {log.body}
                                </p>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 pt-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDistanceToNow(log.createdAt, { addSuffix: true })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-4">
                    {/* Settings Alert channels Card */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Real-Time Channels
                      </h3>

                      {/* 1. HTML Push notification permission switch */}
                      <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Desktop Push Alerts</span>
                            {pushEnabled && <span className="bg-green-50 text-green-600 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-green-200">Active</span>}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">
                            Receive native browser notifications on your computer screen even in other tabs.
                          </p>
                        </div>
                        <button
                          onClick={togglePushNotifications}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 pointer-events-auto",
                            pushEnabled ? "bg-green-600" : "bg-slate-300"
                          )}
                        >
                          <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300", pushEnabled ? "translate-x-6" : "translate-x-1")} />
                        </button>
                      </div>

                      <hr className="border-slate-100" />

                      {/* 2. Sound Beep Switch */}
                      <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Sound Beep alerts</span>
                            {soundEnabled ? (
                              <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <VolumeX className="w-3.5 h-3.5 text-slate-300" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">
                            Play dynamic high-pitched twin chime beeps instantly when a wicket falls or match concludes.
                          </p>
                        </div>
                        <button
                          onClick={toggleSound}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300",
                            soundEnabled ? "bg-blue-600" : "bg-slate-300"
                          )}
                        >
                          <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300", soundEnabled ? "translate-x-6" : "translate-x-1")} />
                        </button>
                      </div>

                      <hr className="border-slate-100" />

                      {/* 3. Text to Speech voice broadcast switch */}
                      <div className="flex items-center justify-between py-1">
                        <div className="space-y-0.5 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Voice Commentary</span>
                            {voiceEnabled ? (
                              <Mic className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            ) : (
                              <MicOff className="w-3.5 h-3.5 text-slate-300" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">
                            Synthesized live broadcaster announces details (batter out, bowler stats) aloud in English/Hindi!
                          </p>
                        </div>
                        <button
                          onClick={toggleVoice}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300",
                            voiceEnabled ? "bg-brand-red" : "bg-slate-300"
                          )}
                        >
                          <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300", voiceEnabled ? "translate-x-6" : "translate-x-1")} />
                        </button>
                      </div>
                    </div>

                    {/* Listener diagnostic module */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        Live Web Listener State
                      </h3>
                      
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">Observer Engine:</span>
                          <span className="text-emerald-600 font-black flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            ON-SNAPSHOT ACTIVE
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">Iframe Fallback Status:</span>
                          <span className="text-slate-600 font-black">ENABLED (AUTO)</span>
                        </div>
                        {fcmToken && (
                          <div className="text-xs">
                            <span className="text-slate-500 font-bold">FCM Cloud Token:</span>
                            <span className="font-mono text-[9px] text-slate-400 block break-all font-bold mt-0.5 bg-slate-100 p-1.5 rounded select-all cursor-copy">
                              {fcmToken}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={testSound}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1.5"
                      >
                        <Volume2 className="w-4 h-4" />
                        Test speaker output
                      </button>
                    </div>

                    {/* IFrame/Sandbox security guidance card */}
                    <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/50 space-y-2 text-xs text-amber-800">
                      <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider">
                        <HelpCircle className="w-4 h-4 text-amber-600" />
                        Sandbox & Iframe Notice
                      </div>
                      <p className="leading-relaxed">
                        Normally, browser policies prevent iframes from showing notifications or registering Service Workers directly. 
                      </p>
                      <p className="leading-relaxed font-bold">
                        Tip: Open Apna Cricket in a "New Tab" to fully allow native desktop notifications!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mx-auto flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-red" />
                  Made for Apna Cricket Fans
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
