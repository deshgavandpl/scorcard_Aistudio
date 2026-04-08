import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Trophy, 
  PlayCircle, 
  Users, 
  Shield, 
  Zap, 
  MessageSquare, 
  BarChart2,
  ChevronRight,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function UserGuide() {
  const [copied, setCopied] = React.useState(false);

  const geminiPrompt = `I am using the "Apna Cricket" scoring app. I need help with [INSERT YOUR QUESTION HERE]. 
The app has features for:
1. Tournament Management (Fixtures, Points Table with NRR)
2. Live Ball-by-Ball Scoring (Innings, Toss, Wickets)
3. Player Stats (Batting/Bowling rankings)
4. Live Fan Chat (Ephemeral messages)
5. Admin Mode (ID: admin, PIN: 5007)

Please explain how to [INSERT ACTION] based on these features.`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(geminiPrompt);
    setCopied(true);
    toast.success('Prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    {
      title: "Admin & Security",
      icon: Shield,
      color: "bg-blue-50 text-blue-600",
      steps: [
        "Click the 'Admin' button in the top navigation bar.",
        "Enter Admin ID: 'admin' and PIN: '5007' to unlock management features.",
        "Once unlocked, you can create tournaments, delete matches, and manage players."
      ]
    },
    {
      title: "Tournament Setup",
      icon: Trophy,
      color: "bg-amber-50 text-amber-600",
      steps: [
        "Go to 'Tournaments' and click 'New Tournament'.",
        "Add teams by entering their names. You can add players to each team later.",
        "In the Tournament Detail page, use 'Add Stage Match' to schedule fixtures (Match 1, Match 2, etc.)."
      ]
    },
    {
      title: "Match Scoring",
      icon: PlayCircle,
      color: "bg-emerald-50 text-emerald-600",
      steps: [
        "Find an 'Upcoming' match and click 'Resume Scoring' (Admin only).",
        "Select the Toss Winner and their decision (Bat/Bowl).",
        "Select the Opening Batters and the Opening Bowler.",
        "Record each ball (Runs, Wickets, Extras) using the scoring pad.",
        "The app automatically handles over changes and innings transitions."
      ]
    },
    {
      title: "Live Scores & Chat",
      icon: MessageSquare,
      color: "bg-red-50 text-brand-red",
      steps: [
        "Fans can view live matches in the 'Live Score' tab.",
        "Use the floating chat bubble (bottom-left) to send messages or emojis.",
        "Note: Only the 7 most recent messages are shown to keep the chat lively!"
      ]
    },
    {
      title: "Stats & Rankings",
      icon: BarChart2,
      color: "bg-purple-50 text-purple-600",
      steps: [
        "The 'Stats' page aggregates performance from all matches.",
        "The Points Table uses standard NRR: (Runs Scored/Overs Faced) - (Runs Conceded/Overs Bowled).",
        "If a team is all out, the full quota of overs is used for NRR calculation."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8 px-4">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
          <BookOpen className="w-4 h-4" /> Official User Guide
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">
          How to use <span className="text-brand-red">Apna Cricket</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          Everything you need to know to manage your local cricket tournaments like a professional.
        </p>
      </div>

      {/* Gemini Prompt Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-32 h-32" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Ask Gemini Manually</h2>
              <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">AI Support Prompt</p>
            </div>
          </div>
          
          <p className="text-slate-300 text-sm leading-relaxed">
            If you need specific help while using the app, copy this prompt and paste it into <a href="https://gemini.google.com" target="_blank" className="text-blue-400 underline font-bold">Google Gemini</a>. It tells the AI exactly how your app works so it can guide you.
          </p>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 relative group">
            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {geminiPrompt}
            </pre>
            <button 
              onClick={copyPrompt}
              className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy Prompt'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Guide Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", section.color)}>
                <section.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{section.title}</h3>
            </div>
            
            <ul className="space-y-4">
              {section.steps.map((step, sIdx) => (
                <li key={sIdx} className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-black flex items-center justify-center">
                    {sIdx + 1}
                  </span>
                  <p className="text-sm text-slate-600 font-medium leading-snug">{step}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="bg-red-50 rounded-3xl p-8 border border-red-100 text-center space-y-4">
        <Zap className="w-8 h-8 text-brand-red mx-auto" />
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Need more help?</h3>
        <p className="text-slate-600 text-sm font-medium max-w-md mx-auto">
          Our system is designed to be intuitive. If you encounter any issues, use the 'Contact' form in the footer to reach out to Avinash Huse directly.
        </p>
      </div>
    </div>
  );
}
