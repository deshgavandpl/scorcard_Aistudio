import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Trophy, 
  PlayCircle, 
  Shield, 
  Zap, 
  MessageSquare, 
  BarChart2,
  Download,
  ArrowRight,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { generateUserGuidePDF } from '../lib/pdfGuideGenerator';
import { toast } from 'sonner';

export default function UserGuide() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateUserGuidePDF();
      toast.success('User Guide PDF generated successfully!');
    } catch (error) {
      console.error('PDF Generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sections = [
    {
      title: "Admin & Security",
      icon: Shield,
      color: "bg-blue-50 text-blue-600",
      steps: [
        "Click the 'Admin' button in the top navigation bar.",
        "Enter your secure Admin ID and PIN to unlock management features.",
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
        "In the Tournament Detail page, use 'Add Stage Match' to schedule fixtures."
      ]
    },
    {
      title: "Match Scoring",
      icon: PlayCircle,
      color: "bg-emerald-50 text-emerald-600",
      steps: [
        "Find an 'Upcoming' match and click 'Resume Scoring' (Admin only).",
        "Select the Toss Winner and their decision (Bat/Bowl).",
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
        "Use the floating chat bubble to send messages or emojis.",
        "Scores update in real-time without needing to refresh the page."
      ]
    },
    {
      title: "Troubleshooting",
      icon: Zap,
      color: "bg-purple-50 text-purple-600",
      steps: [
        "Google Login: If it fails on mobile, ensure you are not in a private/incognito tab and pop-ups are allowed.",
        "Sound: If commentary is silent, check device volume and ensure 'Hindi' voice is installed in system settings.",
        "Missing Data: If a team or match isn't showing, try refreshing the page or checking your internet connection."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8 px-4">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
          <BookOpen className="w-4 h-4" /> Official User Guide
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tight transform -skew-x-6">
          How to use <span className="text-brand-red">Apna Cricket</span>
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          Everything you need to know to manage your local cricket tournaments like a professional.
        </p>
        
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          Download PDF Guide
        </button>
      </div>

      {/* Flowchart Visualization */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">System Workflow</h2>
          <p className="text-slate-500 text-sm font-medium">A quick look at how the application works</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <WorkflowStep icon={Shield} title="Admin Login" desc="Unlock management" />
          <div className="hidden md:flex justify-center"><ArrowRight className="text-slate-200" /></div>
          <WorkflowStep icon={Trophy} title="Setup" desc="Create Tournaments" />
          <div className="hidden md:flex justify-center col-start-2"><ArrowRight className="text-slate-200 rotate-90" /></div>
          <div className="md:hidden flex justify-center"><ArrowRight className="text-slate-200 rotate-90" /></div>
          <WorkflowStep icon={PlayCircle} title="Live Scoring" desc="Record every ball" />
          <div className="hidden md:flex justify-center col-start-2"><ArrowRight className="text-slate-200 rotate-90" /></div>
          <div className="md:hidden flex justify-center"><ArrowRight className="text-slate-200 rotate-90" /></div>
          <WorkflowStep icon={BarChart2} title="Stats" desc="Auto-updated tables" />
        </div>
      </div>

      {/* Guide Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
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
      <div className="bg-red-50 rounded-[2.5rem] p-8 md:p-12 border border-red-100 text-center space-y-6">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <FileText className="w-8 h-8 text-brand-red" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Need more help?</h3>
          <p className="text-slate-600 text-sm font-medium max-w-md mx-auto">
            Download the full PDF guide for offline reading, or contact Avinash Huse via the footer form for direct support.
          </p>
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
        <Icon className="w-5 h-5 text-brand-red" />
      </div>
      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h4>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{desc}</p>
    </div>
  );
}
