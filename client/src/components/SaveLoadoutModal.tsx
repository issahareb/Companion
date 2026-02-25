import { useState } from 'react';
import { Loader2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

interface SaveLoadoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export function SaveLoadoutModal({ isOpen, onClose, onSave }: SaveLoadoutModalProps) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useI18n();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(name);
      setName('');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141417] border border-white/10 p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-display font-medium text-white mb-2 tracking-wider flex items-center gap-2">
                <Save className="w-5 h-5 opacity-70" />
                {t('modal.saveLoadout')}
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                {t('modal.saveDesc')}
              </p>
              
              <form onSubmit={handleSave}>
                <div className="mb-6">
                  <label htmlFor="loadout-name" className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-display">
                    {t('modal.loadoutName')}
                  </label>
                  <input
                    id="loadout-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('modal.loadoutPlaceholder')}
                    className="w-full bg-black/50 border border-white/20 text-white px-4 py-3 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all font-display text-lg tracking-wide"
                    autoFocus
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-display tracking-widest uppercase text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    disabled={isSaving}
                  >
                    {t('action.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || isSaving}
                    className="px-6 py-2.5 bg-white text-black text-sm font-display font-bold tracking-widest uppercase hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] transition-colors"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('modal.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
