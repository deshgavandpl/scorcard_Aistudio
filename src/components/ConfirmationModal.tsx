import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{title}</h2>
              <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-4 rounded-xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg ${
                  isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-100' : 'bg-blue-900 hover:bg-blue-800 shadow-blue-100'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
