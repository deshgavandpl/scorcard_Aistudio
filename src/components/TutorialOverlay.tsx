import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTutorial } from '../context/TutorialContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft, X, Trophy, Zap, Users, Play } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TutorialOverlay() {
  const { isActive, currentStepIndex, steps, nextStep, prevStep, stopTutorial } = useTutorial();
  const navigate = useNavigate();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (!isActive) return;

    // Handle route navigation
    if (currentStep.route && !location.pathname.startsWith(currentStep.route)) {
        // Only navigate if it's a static route or if we're not already on a dynamic version of it
        const isStaticRoute = !currentStep.route.endsWith('/');
        
        if (isStaticRoute && location.pathname !== currentStep.route) {
            navigate(currentStep.route);
        }
        // For dynamic routes (ending in /), we don't navigate automatically 
        // because we don't know the ID, but we expect the user to be on a subpath
    }

    // Find target element and get its position
    const updatePosition = () => {
      const element = document.getElementById(currentStep.targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    const timer = setInterval(updatePosition, 500); // Poll for dynamic elements

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearInterval(timer);
    };
  }, [isActive, currentStep, location.pathname, navigate]);

  if (!isActive) return null;

  const getPositionStyles = () => {
    if (!targetRect || currentStep.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;
    switch (currentStep.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          top: targetRect.top - padding,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - padding,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: 'translate(0, -50%)',
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Backdrop with hole */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto" onClick={stopTutorial}>
        {targetRect && (
          <motion.div
            layoutId="tutorial-hole"
            className="absolute bg-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-xl"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          />
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="absolute pointer-events-auto w-[320px] bg-white rounded-3xl shadow-2xl p-6 border border-slate-100"
          style={getPositionStyles()}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-brand-red/10 rounded-xl">
              {currentStep.id === 'welcome' ? <Trophy className="w-5 h-5 text-brand-red" /> :
               currentStep.id.includes('tournament') ? < Zap className="w-5 h-5 text-brand-red" /> :
               currentStep.id.includes('team') ? <Users className="w-5 h-5 text-brand-red" /> :
               <Play className="w-5 h-5 text-brand-red" />}
            </div>
            <button 
              onClick={stopTutorial}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
            {currentStep.title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            {currentStep.content}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    idx === currentStepIndex ? "w-4 bg-brand-red" : "w-1 bg-slate-200"
                  )}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={prevStep}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest text-[10px] hover:bg-brand-red/90 transition-all shadow-lg"
              >
                {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
