import React, { useRef, useState } from 'react';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
import { Download, Trophy, QrCode, ShieldCheck, Loader2, FileText, Printer } from 'lucide-react';
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
  <div className={cn("w-12 h-8 flex flex-col shadow-sm border border-slate-200 shrink-0", className)}>
    <div className="flex-1 bg-[#FF9933]"></div>
    <div className="flex-1 bg-white flex items-center justify-center relative overflow-hidden">
      <div className="w-2.5 h-2.5 rounded-full border-[0.5px] border-[#000080] flex items-center justify-center">
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

  const downloadAsImage = async () => {
    if (!certificateRef.current || isGenerating) return;
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const blob = await domtoimage.toBlob(certificateRef.current, {
        quality: 1,
        bgcolor: '#fdfbf7',
        width: certificateRef.current.offsetWidth,
        height: certificateRef.current.offsetHeight,
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Certificate_${playerName.replace(/\s+/g, '_')}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate PNG. Please try the PDF option or take a screenshot.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsPDF = async () => {
    if (!certificateRef.current || isGenerating) return;
    
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await domtoimage.toPng(certificateRef.current, {
        quality: 1,
        bgcolor: '#fdfbf7',
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [certificateRef.current.offsetWidth, certificateRef.current.offsetHeight]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, certificateRef.current.offsetWidth, certificateRef.current.offsetHeight);
      pdf.save(`Certificate_${playerName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try the Print option.');
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
      className={cn(
        "relative aspect-[1/1.414] bg-[#fdfbf7] p-12 shadow-2xl overflow-hidden border-[12px] border-slate-200 print:shadow-none print:border-none print:w-full",
        isHeadless ? "w-[800px]" : "w-full"
      )}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Inner Gold Border */}
      <div className="absolute inset-4 border-4 border-[#c5a059] pointer-events-none"></div>
      <div className="absolute inset-6 border border-[#c5a059] opacity-30 pointer-events-none"></div>

      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
         <Trophy className="w-[400px] h-[400px] text-[#c5a059]" />
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
                <Trophy className="w-10 h-10 text-amber-400 mb-1" />
                <span className="text-white font-black text-[10px] uppercase tracking-widest">Apna Cricket</span>
              </div>
           </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8 pt-4">
          <p className="text-xl font-medium text-slate-600 italic">This is to certify that</p>
          
          <div className="border-b-2 border-[#c5a059] inline-block pb-2 px-8">
            <h3 className="text-5xl font-black text-[#1a365d] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {playerName}
            </h3>
          </div>

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

          <div className="inline-block px-8 py-2 bg-[#1a365d] text-white rounded-lg shadow-lg">
            <h5 className="text-3xl font-black uppercase tracking-tighter italic">
              Player of the Match
            </h5>
          </div>

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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance Details</p>
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
  );

  if (isHeadless) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:block">
      <div className="max-w-4xl w-full space-y-4 my-8 print:my-0 print:max-w-none">
        <div className="flex flex-wrap justify-between items-center text-white gap-4 print:hidden">
          <h3 className="text-xl font-black uppercase tracking-tighter">Player of the Match Certificate</h3>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={downloadAsPDF}
              disabled={isGenerating}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Save PDF
            </button>
            <button 
              onClick={downloadAsImage}
              disabled={isGenerating}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Save PNG
            </button>
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
            >
              <Printer className="w-3 h-3" /> Print
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {content}
      </div>
    </div>
  );
}
