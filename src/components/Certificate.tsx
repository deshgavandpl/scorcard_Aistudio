import React, { useRef, useState } from 'react';
import domtoimage from 'dom-to-image-more';
import { Download, Trophy, QrCode, ShieldCheck, Loader2 } from 'lucide-react';
import { Match } from '../types/cricket';
import { cn } from '../lib/utils';

interface CertificateProps {
  match: Match;
  playerName: string;
  performance: {
    runs: number;
    wickets: number;
    strikeRate: string;
  };
  onClose?: () => void;
}

const IndianFlag = ({ className }: { className?: string }) => (
  <div className={cn("w-12 h-8 flex flex-col shadow-sm border border-slate-100 shrink-0", className)}>
    <div className="flex-1 bg-[#FF9933]"></div>
    <div className="flex-1 bg-white flex items-center justify-center relative overflow-hidden">
      <div className="w-2.5 h-2.5 rounded-full border-[0.5px] border-[#000080] flex items-center justify-center">
        <div className="absolute w-px h-full bg-[#000080] rotate-0"></div>
        <div className="absolute w-px h-full bg-[#000080] rotate-45"></div>
        <div className="absolute w-px h-full bg-[#000080] rotate-90"></div>
        <div className="absolute w-px h-full bg-[#000080] rotate-135"></div>
      </div>
    </div>
    <div className="flex-1 bg-[#138808]"></div>
  </div>
);

export default function Certificate({ match, playerName, performance, onClose }: CertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadCertificate = async () => {
    if (!certificateRef.current || isDownloading) return;
    
    setIsDownloading(true);
    try {
      // Small delay to ensure any pending renders are done
      await new Promise(resolve => setTimeout(resolve, 800));

      const blob = await domtoimage.toBlob(certificateRef.current, {
        quality: 1,
        bgcolor: '#fdfbf7',
        width: certificateRef.current.offsetWidth,
        height: certificateRef.current.offsetHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Certificate_${playerName.replace(/\s+/g, '_')}_${match.id.substring(0, 6)}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Failed to generate certificate. Please take a screenshot of the certificate displayed on your screen.');
    } finally {
      setIsDownloading(false);
    }
  };

  const certificateId = `AC-${match.tournamentId ? match.tournamentId.substring(0, 3).toUpperCase() : 'GEN'}-${new Date(match.createdAt).getFullYear()}-${match.id.substring(0, 6).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-4xl w-full space-y-4 my-8">
        <div className="flex justify-between items-center text-white">
          <h3 className="text-xl font-black uppercase tracking-tighter">Player of the Match Certificate</h3>
          <div className="flex gap-2">
            <button 
              onClick={downloadCertificate}
              disabled={isDownloading}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download PNG
                </>
              )}
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Certificate Container */}
        <div 
          ref={certificateRef}
          className="relative aspect-[1/1.414] w-full bg-[#fdfbf7] p-12 shadow-2xl overflow-hidden border-[16px] border-double border-[#c5a059]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Ornate Border Overlay (CSS simulated) */}
          <div className="absolute inset-4 border-2 border-[#c5a059] pointer-events-none"></div>
          <div className="absolute inset-6 border border-[#c5a059] opacity-50 pointer-events-none"></div>

          {/* Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
             <Trophy className="w-[500px] h-[500px] text-[#c5a059]" />
          </div>

          {/* Header Section */}
          <div className="relative z-10 text-center space-y-6">
            <div className="flex justify-center items-center gap-8 mb-4">
              <IndianFlag />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/200px-Emblem_of_India.svg.png" 
                alt="Emblem of India" 
                className="h-20"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
              <IndianFlag />
            </div>

            <div className="space-y-1">
              <h1 className="text-4xl font-black text-[#1a365d] uppercase tracking-[0.2em]">Apna Cricket</h1>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px bg-[#c5a059] w-12"></div>
                <h2 className="text-lg font-bold text-[#c5a059] uppercase tracking-[0.4em]">Official Certificate</h2>
                <div className="h-px bg-[#c5a059] w-12"></div>
              </div>
            </div>

            {/* Logo */}
            <div className="flex justify-center py-4">
               <div className="bg-[#1a365d] p-4 rounded-2xl shadow-xl border-4 border-[#c5a059]">
                  <div className="flex flex-col items-center">
                    <Trophy className="w-12 h-12 text-amber-400 mb-1" />
                    <span className="text-white font-black text-xs uppercase tracking-widest">Apna Cricket</span>
                  </div>
               </div>
            </div>

            {/* Main Content */}
            <div className="space-y-8 pt-4">
              <p className="text-xl font-medium text-slate-600 italic">This is to certify that</p>
              
              <h3 className="text-6xl font-black text-[#1a365d] tracking-tight py-2 border-b-2 border-[#c5a059] inline-block min-w-[300px]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {playerName}
              </h3>

              <p className="text-lg font-medium text-slate-600">
                has delivered an outstanding performance in
              </p>
              
              <h4 className="text-3xl font-black text-red-700 uppercase tracking-tight">
                {match.tournamentName || 'Local Cricket Tournament'}
              </h4>

              <div className="flex items-center justify-center gap-4 py-2">
                <div className="h-px bg-slate-200 w-16"></div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Awarded as:</p>
                <div className="h-px bg-slate-200 w-16"></div>
              </div>

              <h5 className="text-4xl font-black text-[#1a365d] uppercase tracking-tighter transform -skew-x-6">
                Player of the Match
              </h5>

              {/* Match Details Grid */}
              <div className="grid grid-cols-1 gap-2 text-slate-700 font-bold uppercase tracking-wide text-sm pt-4">
                <p>Match: <span className="text-[#1a365d] font-black">{match.teamAName} vs {match.teamBName}</span></p>
                <p>Date: <span className="text-[#1a365d] font-black">{new Date(match.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
                <p>Venue: <span className="text-[#1a365d] font-black">Local Cricket Ground</span></p>
              </div>

              {/* Performance Stats */}
              <div className="bg-[#1a365d]/5 border-y-2 border-[#c5a059] py-4 mt-8">
                <div className="flex justify-center gap-12">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance</p>
                    <p className="text-lg font-black text-[#1a365d]">
                      Runs: <span className="text-red-600">{performance.runs}</span> | 
                      Wickets: <span className="text-red-600">{performance.wickets}</span> | 
                      Strike Rate: <span className="text-red-600">{performance.strikeRate}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="pt-12 flex justify-between items-end px-8">
              <div className="text-left space-y-4">
                <div className="flex items-center gap-2 text-[#1a365d]">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Authorized by Apna Cricket</span>
                </div>
                <div className="pt-4 border-t border-slate-300 min-w-[150px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</p>
                  <p className="text-2xl font-black text-[#1a365d] italic pt-1" style={{ fontFamily: "'Playfair Display', serif" }}>Apna Cricket</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <QrCode className="w-16 h-16 text-slate-800" />
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Scan for match details</span>
              </div>
            </div>

            {/* Certificate ID */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-12">
               <div className="flex justify-center items-center gap-4">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">
                   Certificate ID: {certificateId}
                 </span>
                 <div className="h-px bg-slate-200 flex-1"></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
