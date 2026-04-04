import React, { useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Trophy, QrCode, ShieldCheck, Loader2, FileText, Printer, Download } from 'lucide-react';
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
  isHeadless?: boolean;
}

const IndianFlag = ({ className }: { className?: string }) => (
  <div className={cn("w-10 h-6 flex flex-col border border-slate-200 shrink-0", className)}>
    <div className="flex-1 bg-[#FF9933]"></div>
    <div className="flex-1 bg-white flex items-center justify-center relative overflow-hidden">
      <div className="w-2 h-2 rounded-full border-[0.5px] border-[#000080] flex items-center justify-center">
        <div className="absolute w-px h-full bg-[#000080]"></div>
        <div className="absolute w-px h-full bg-[#000080] rotate-45"></div>
        <div className="absolute w-px h-full bg-[#000080] rotate-90"></div>
        <div className="absolute w-px h-full bg-[#000080] rotate-135"></div>
      </div>
    </div>
    <div className="flex-1 bg-[#138808]"></div>
  </div>
);

export default function Certificate({ match, playerName, performance, onClose, isHeadless }: CertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Standard A4 dimensions in pixels (at 72 DPI for jsPDF compatibility)
  const A4_WIDTH = 595;
  const A4_HEIGHT = 842;

  const downloadAsImage = async () => {
    if (!certificateRef.current || isGenerating) return;
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await htmlToImage.toPng(certificateRef.current, {
        quality: 3, // Even higher quality
        backgroundColor: '#ffffff',
        width: A4_WIDTH,
        height: A4_HEIGHT,
      });
      
      const link = document.createElement('a');
      link.download = `Official_Certificate_${playerName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate PNG.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsPDF = async () => {
    if (!certificateRef.current || isGenerating) return;
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await htmlToImage.toPng(certificateRef.current, {
        quality: 1,
        backgroundColor: '#ffffff',
        width: A4_WIDTH,
        height: A4_HEIGHT,
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      // A4 in px at 72 DPI is 595x842. jsPDF 'a4' is exactly this.
      pdf.addImage(dataUrl, 'PNG', 0, 0, A4_WIDTH, A4_HEIGHT);
      pdf.save(`Certificate_${playerName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const certificateId = `AC-${match.tournamentId ? match.tournamentId.substring(0, 3).toUpperCase() : 'GEN'}-${new Date(match.createdAt).getFullYear()}-${match.id.substring(0, 6).toUpperCase()}`;

  const content = (
    <div 
      ref={isHeadless ? null : certificateRef}
      className="relative bg-white overflow-hidden"
      style={{ 
        width: `${A4_WIDTH}px`, 
        height: `${A4_HEIGHT}px`, 
        fontFamily: "'Outfit', sans-serif",
        padding: '30px',
      }}
    >
      {/* Clean Minimal Border */}
      <div className="absolute inset-0 border-[2px] border-slate-100 pointer-events-none"></div>
      <div className="absolute inset-[10px] border-[1px] border-slate-200 pointer-events-none"></div>
      <div className="absolute inset-[15px] border-[1px] border-amber-200 opacity-50 pointer-events-none"></div>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] pointer-events-none">
         <Trophy className="w-[250px] h-[250px] text-amber-600" />
      </div>

      <div className="w-full h-full relative flex flex-col items-center justify-between text-center">
        {/* Header */}
        <div className="w-full pt-8 space-y-6">
          <div className="flex justify-center items-center gap-10">
            <IndianFlag />
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/200px-Emblem_of_India.svg.png" 
              alt="Emblem of India" 
              className="h-16"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
            <IndianFlag />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black text-blue-950 uppercase tracking-[0.2em]">Apna Cricket</h1>
            <div className="flex items-center justify-center gap-4">
              <div className="h-[2px] bg-amber-400 w-16"></div>
              <h2 className="text-base font-bold text-amber-600 uppercase tracking-[0.5em]">Official Certificate</h2>
              <div className="h-[2px] bg-amber-400 w-16"></div>
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="py-2">
           <div className="bg-blue-950 p-4 rounded-2xl border-2 border-amber-400 shadow-xl">
              <div className="flex flex-col items-center">
                <Trophy className="w-10 h-10 text-amber-400 mb-1" />
                <span className="text-white font-black text-[10px] uppercase tracking-widest">Apna Cricket</span>
              </div>
           </div>
        </div>

        {/* Main Body */}
        <div className="w-full flex flex-col items-center space-y-8">
          <p className="text-xl font-medium text-slate-500 italic">This is to certify that</p>
          
          <div className="border-b-4 border-amber-400 inline-block pb-2 px-10">
            <h3 className="text-5xl font-black text-blue-950 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {playerName}
            </h3>
          </div>

          <p className="text-lg font-medium text-slate-500">
            has delivered an outstanding performance in
          </p>
          
          <h4 className="text-3xl font-black text-red-600 uppercase tracking-tight max-w-[90%]">
            {match.tournamentName || 'Local Cricket Tournament'}
          </h4>

          <div className="flex items-center justify-center gap-4">
            <div className="h-px bg-slate-300 w-20"></div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">Awarded as:</p>
            <div className="h-px bg-slate-300 w-20"></div>
          </div>

          <div className="inline-block px-12 py-4 bg-blue-950 text-white rounded-xl shadow-2xl transform -rotate-1">
            <h5 className="text-4xl font-black uppercase tracking-tighter italic">
              Player of the Match
            </h5>
          </div>

          {/* Match Info */}
          <div className="space-y-2 text-slate-600 font-bold uppercase tracking-widest text-xs pt-6">
            <p>Match: <span className="text-blue-950 font-black">{match.teamAName} vs {match.teamBName}</span></p>
            <p>Date: <span className="text-blue-950 font-black">{new Date(match.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
            <p>Venue: <span className="text-blue-950 font-black">Local Cricket Ground</span></p>
          </div>

          {/* Stats Section */}
          <div className="w-full max-w-[85%] border-y-2 border-amber-200 py-5 mt-6">
            <div className="flex justify-center gap-12">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Performance Summary</p>
                <p className="text-2xl font-black text-blue-950">
                  Runs: <span className="text-red-600">{performance.runs}</span> | 
                  Wickets: <span className="text-red-600">{performance.wickets}</span> | 
                  SR: <span className="text-red-600">{performance.strikeRate}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full pt-10 pb-12 flex justify-between items-end px-10">
          <div className="text-left space-y-4">
            <div className="flex items-center gap-3 text-blue-950">
              <ShieldCheck className="w-6 h-6" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Authorized by Apna Cricket</span>
            </div>
            <div className="pt-4 border-t-2 border-slate-200 min-w-[180px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Official Signature</p>
              <p className="text-3xl font-black text-blue-950 italic pt-1" style={{ fontFamily: "'Playfair Display', serif" }}>Apna Cricket</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="p-2.5 bg-white border-2 border-slate-100 rounded-xl shadow-lg">
              <QrCode className="w-16 h-16 text-slate-800" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Verify Match</span>
          </div>
        </div>

        {/* ID */}
        <div className="absolute bottom-4 left-0 w-full px-10">
           <div className="flex justify-center items-center gap-3">
             <div className="h-px bg-slate-100 flex-1"></div>
             <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] whitespace-nowrap">
               ID: {certificateId}
             </span>
             <div className="h-px bg-slate-100 flex-1"></div>
           </div>
        </div>
      </div>
    </div>
  );

  if (isHeadless) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:block">
      <div className="max-w-4xl w-full space-y-4 my-8 print:my-0 print:max-w-none">
        <div className="flex flex-wrap justify-between items-center text-white gap-4 print:hidden">
          <h3 className="text-xl font-black uppercase tracking-tighter">Player of the Match Certificate</h3>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={downloadAsImage}
              disabled={isGenerating}
              className="px-6 py-3 bg-amber-500 text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-400 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 active:scale-95"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Official Certificate (PNG)
            </button>
            <button 
              onClick={handlePrint}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          {content}
        </div>
      </div>
    </div>
  );
}
