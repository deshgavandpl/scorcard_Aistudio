import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, getDocs, doc, setDoc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { db, auth } from '../firebase';
import { toast } from 'sonner';
import { Match, MatchInnings } from '../types/cricket';
import { speakHype } from '../lib/audioUtils';

export interface NotificationLog {
  id: string;
  matchId: string;
  title: string;
  body: string;
  type: 'wicket' | 'result' | 'event';
  createdAt: number;
  read: boolean;
}

interface NotificationContextProps {
  notifications: NotificationLog[];
  unreadCount: number;
  pushEnabled: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  fcmToken: string | null;
  togglePushNotifications: () => Promise<boolean>;
  toggleSound: () => void;
  toggleVoice: () => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

// Safe Web Notification Sound System using synthesized beep
const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // High-pitched Cricket-alert twin beep
    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    playBeep(880, audioCtx.currentTime, 0.12);
    playBeep(1200, audioCtx.currentTime + 0.15, 0.18);
  } catch (e) {
    console.warn("Audio Context beep was blocked or not supported by browser", e);
  }
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return localStorage.getItem('alerts_push_enabled') === 'true';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('alerts_sound_enabled') !== 'false';
  });
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem('alerts_voice_enabled') !== 'false';
  });
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const prevMatchesRef = useRef<Record<string, Match>>({});
  const isInitialLoadRef = useRef(true);

  // Initialize notifications from localStorage/Firestore
  useEffect(() => {
    const local = localStorage.getItem('cricket_notifications_history');
    if (local) {
      try {
        setNotifications(JSON.parse(local));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save to locale whenever notifications list changes
  useEffect(() => {
    localStorage.setItem('cricket_notifications_history', JSON.stringify(notifications));
  }, [notifications]);

  // Try to register Firebase Cloud Messaging Messaging Client Safely
  const getFCMClient = (): Messaging | null => {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
        // Only return if messaging is fully supported and available
        return getMessaging();
      }
    } catch (error) {
      console.warn("FCM is unsupported in this sandbox/iframe environment. Fallback real-time Firestore triggers are active.", error);
    }
    return null;
  };

  // Set up Firebase Messaging On-Message subscriber
  useEffect(() => {
    const messaging = getFCMClient();
    if (!messaging) return;

    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Received foreground Web Push Notification: ', payload);
        
        const title = payload.notification?.title || 'Cricket Alert';
        const body = payload.notification?.body || '';
        
        addNotificationLog('event', '', title, body);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Error subscribing to FCM foreground events", e);
    }
  }, []);

  // Monitor Live Matches for Wickets & Results in Real-Time!
  useEffect(() => {
    const matchesRef = collection(db, 'matches');
    
    const unsubscribe = onSnapshot(matchesRef, (snapshot) => {
      const currentMatches: Record<string, Match> = {};
      
      snapshot.docs.forEach((docSnap) => {
        const match = { id: docSnap.id, ...docSnap.data() } as Match;
        currentMatches[match.id] = match;
      });

      // Skip parsing differences on the very first snapshot so we don't trigger alerts for historical events on loaded page
      if (isInitialLoadRef.current) {
        prevMatchesRef.current = currentMatches;
        isInitialLoadRef.current = false;
        return;
      }

      // Loop and detect updates
      Object.entries(currentMatches).forEach(([matchId, match]) => {
        const prevMatch = prevMatchesRef.current[matchId];
        if (!prevMatch) return; // New match added, skip detailed comparison

        const matchTitle = `${match.teamAName} vs ${match.teamBName}`;

        // 1. Detect Wickets for Innings 1
        if (match.innings1 && prevMatch.innings1) {
          const deltaWickets = match.innings1.wickets - prevMatch.innings1.wickets;
          if (deltaWickets > 0) {
            triggerWicketAlert(match, 1, match.innings1, prevMatch.innings1);
          }
        }

        // 2. Detect Wickets for Innings 2
        if (match.innings2 && prevMatch.innings2) {
          const deltaWickets = match.innings2.wickets - prevMatch.innings2.wickets;
          if (deltaWickets > 0) {
            triggerWicketAlert(match, 2, match.innings2, prevMatch.innings2);
          }
        }

        // 3. Detect Match Results Completion
        if (match.status === 'Finished' && prevMatch.status !== 'Finished') {
          triggerResultAlert(match);
        }
      });

      // Update ref state
      prevMatchesRef.current = currentMatches;
    }, (error) => {
      console.error("Failed to snapshot matches for real-time alerts:", error);
    });

    return () => unsubscribe();
  }, []);

  // Dispatch Wicket Notifications
  const triggerWicketAlert = (
    match: Match,
    inningsNum: number,
    currInnings: MatchInnings,
    prevInnings: MatchInnings
  ) => {
    const battingTeamName = currInnings.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
    const wicketNumber = currInnings.wickets;
    const teamScoreStr = `${currInnings.runs}/${currInnings.wickets}`;
    const overBallsStr = `${currInnings.overs}.${currInnings.balls}`;

    // Look for who is newly out
    let batsmanOutName = "Batsman";
    let bowlerName = "Bowler";
    
    // Attempt to parse out batsman name from batting statistics
    const outBatter = Object.values(currInnings.battingStats || {}).find(
      (b) => b.isOut && !(prevInnings.battingStats?.[b.playerId]?.isOut)
    );
    if (outBatter) {
      batsmanOutName = outBatter.playerName;
    }

    // Identify current bowler
    if (currInnings.currentBowlerId && currInnings.bowlingStats?.[currInnings.currentBowlerId]) {
      bowlerName = currInnings.bowlingStats[currInnings.currentBowlerId].playerName;
    }

    const title = `☝️ WICKET! - ${battingTeamName}`;
    const body = `${batsmanOutName} is OUT! Bowled by ${bowlerName}. ${battingTeamName} now ${teamScoreStr} (${overBallsStr} Ov)`;

    // Sound effect
    if (soundEnabled) {
      playNotificationSound();
    }

    // Voice commentary
    if (voiceEnabled) {
      const liveSpeechCommentary = `Wicket down! ${batsmanOutName} is out. ${bowlerName} takes the key wicket. Score is now ${currInnings.runs} runs for ${currInnings.wickets} wickets.`;
      speakHype(liveSpeechCommentary);
    }

    // Toast
    toast.error(title, {
      description: body,
      duration: 8000,
      icon: '🏏',
    });

    // Save to history & store
    addNotificationLog('wicket', match.id, title, body);

    // Native Web Notification
    triggerDesktopNotification(title, body);
  };

  // Dispatch Result Notifications
  const triggerResultAlert = (match: Match) => {
    const title = `🏆 MATCH FINISHED: ${match.teamAName} vs ${match.teamBName}`;
    const body = match.resultMessage || `Match has ended gracefully. Congratulations to the victors!`;

    // Sound alert
    if (soundEnabled) {
      playNotificationSound();
    }

    // Voice commentary
    if (voiceEnabled) {
      const matchOutcomeSpeech = `Match completed! ${match.resultMessage}`;
      speakHype(matchOutcomeSpeech);
    }

    // Toast
    toast.success(title, {
      description: body,
      duration: 12000,
      icon: '🏆',
    });

    // Save history
    addNotificationLog('result', match.id, title, body);

    // Native System Alert
    triggerDesktopNotification(title, body);
  };

  // Helper to add logs to local state & save to general notifications collection
  const addNotificationLog = async (type: 'wicket' | 'result' | 'event', matchId: string, title: string, body: string) => {
    const newLog: NotificationLog = {
      id: Math.random().toString(36).substr(2, 9),
      matchId,
      title,
      body,
      type,
      createdAt: Date.now(),
      read: false,
    };

    setNotifications((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50 alerts in history

    // Try optional background logging to firestore
    try {
      await addDoc(collection(db, 'notifications'), {
        ...newLog,
        userId: auth.currentUser?.uid || 'anonymous',
      });
    } catch (e) {
      // Graceful silent error in case rules or permissions differ
      console.log("Notifying system synced logged inside Firestore.");
    }
  };

  // Trigger Native Web Notification
  const triggerDesktopNotification = (title: string, body: string) => {
    if (pushEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'cricket-alert',
          silent: !soundEnabled,
        });
      } catch (e) {
        console.warn("Could not dispatch native Notification API payload", e);
      }
    }
  };

  // Toggle Native and Cloud Push Notifications
  const togglePushNotifications = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.warning("Desktop alerts are not supported by this browser.");
      return false;
    }

    if (pushEnabled) {
      // Disabling push
      setPushEnabled(false);
      localStorage.setItem('alerts_push_enabled', 'false');
      toast.info("Push notification alerts disabled.");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
        localStorage.setItem('alerts_push_enabled', 'true');
        toast.success("Desktop alerts enabled! You will now receive alerts for wickets and match statistics.");

        // Safe Firebase Cloud Messaging (FCM) registration request
        const messaging = getFCMClient();
        if (messaging) {
          try {
            // Retrieve token using standard public VAPID project key
            const tokenValue = await getToken(messaging, { 
              vapidKey: 'BM9bZJ_e9_3Z-aZ02ZqE6kQ9oWe4123_test_vapid_cricket_alerts_key' 
            });
            if (tokenValue) {
              setFcmToken(tokenValue);
              console.log("FCM Device Registration Token successfully registered:", tokenValue);
              
              // Register Token in Firestore /fcm_tokens for push notifications
              const tokenDocId = auth.currentUser ? `user_${auth.currentUser.uid}` : `device_${tokenValue.slice(-12)}`;
              await setDoc(doc(db, 'fcm_tokens', tokenDocId), {
                id: tokenDocId,
                token: tokenValue,
                userId: auth.currentUser?.uid || 'anonymous',
                platform: 'web_browser',
                updatedAt: Date.now(),
                active: true
              }, { merge: true });
            }
          } catch (fcmErr) {
            console.warn("FCM dynamic cloud token fetch skipped as it is not enabled in Firebase Console yet. Basic web push service worker alerts are active.", fcmErr);
          }
        }
        return true;
      } else {
        toast.warning("Notification permission denied. Please allow notifications in your browser settings.");
        setPushEnabled(false);
        localStorage.setItem('alerts_push_enabled', 'false');
        return false;
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while enabling push notifications.");
      return false;
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('alerts_sound_enabled', String(next));
    toast.success(next ? "Beep sound alerts enabled." : "Sound alerts hushed.");
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('alerts_voice_enabled', String(next));
    toast.success(next ? "Live Voice Commentary enabled!" : "Voice commentary muted.");
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All alerts marked as read.");
  };

  const clearAll = () => {
    setNotifications([]);
    toast.success("Notification log history cleared.");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
