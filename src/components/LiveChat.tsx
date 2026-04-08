import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, X, Smile, Trash2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { ChatMessage } from '../types/cricket';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

interface LiveChatProps {
  matchId: string;
  userName?: string;
}

export default function LiveChat({ matchId, userName = 'Fan' }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const emojis = ['🔥', '🏏', '💯', '👏', '😮', '🙌', ' wicket ', ' boundary ', ' out '];

  useEffect(() => {
    if (!matchId) return;

    const q = query(
      collection(db, `matches/${matchId}/chat`),
      orderBy('timestamp', 'desc'),
      limit(7)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now()
        } as ChatMessage;
      });
      // Sort by timestamp ascending for display
      setMessages(msgs.reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `matches/${matchId}/chat`);
    });

    return () => unsub();
  }, [matchId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (text: string, type: 'text' | 'emoji' = 'text') => {
    if (!text.trim()) return;

    try {
      await addDoc(collection(db, `matches/${matchId}/chat`), {
        userId: auth.currentUser?.uid || 'anonymous',
        userName: auth.currentUser?.displayName || userName,
        text: text.trim(),
        timestamp: serverTimestamp(),
        type
      });
      setInputText('');
      setShowEmojis(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `matches/${matchId}/chat`);
    }
  };

  const visibleMessages = messages;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-80 h-[450px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest">Live Fan Chat</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50"
            >
              {visibleMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-40">
                  <MessageSquare className="w-8 h-8" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No recent messages</p>
                  <p className="text-[8px] font-medium">Only the 7 most recent messages are shown</p>
                </div>
              ) : (
                visibleMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
                      msg.userId === auth.currentUser?.uid 
                        ? "bg-brand-red text-white ml-auto rounded-tr-none" 
                        : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                    )}
                  >
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        msg.userId === auth.currentUser?.uid ? "text-red-200" : "text-slate-400"
                      )}>
                        {msg.userName}
                      </span>
                    </div>
                    <p className={cn(
                      "font-bold leading-tight",
                      msg.type === 'emoji' ? "text-2xl" : "text-xs"
                    )}>
                      {msg.text}
                    </p>
                  </motion.div>
                ))
              )}
            </div>

            {/* Emoji Bar */}
            {showEmojis && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2 bg-white border-t border-slate-100 flex flex-wrap gap-1"
              >
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => sendMessage(emoji, 'emoji')}
                    className="p-2 hover:bg-slate-50 rounded-xl text-xl transition-all active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
              <button 
                onClick={() => setShowEmojis(!showEmojis)}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  showEmojis ? "bg-red-50 text-brand-red" : "text-slate-400 hover:bg-slate-50"
                )}
              >
                <Smile className="w-5 h-5" />
              </button>
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputText)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-brand-red/20 outline-none"
              />
              <button 
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim()}
                className="p-2 bg-brand-red text-white rounded-xl shadow-lg shadow-red-100 disabled:opacity-50 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all relative",
          isOpen ? "bg-slate-900 text-white" : "bg-brand-red text-white"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && visibleMessages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {visibleMessages.length > 9 ? '9+' : visibleMessages.length}
          </span>
        )}
      </motion.button>
    </div>
  );
}
