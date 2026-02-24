import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import { ArcadeButton } from './ArcadeButton';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const PremiumWelcomeModal: React.FC<Props> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                        onClick={onClose}
                    ></motion.div>

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-yellow-400/50 p-8 rounded-3xl w-full max-w-sm relative z-10 shadow-[0_0_50px_rgba(250,204,21,0.2)] text-center overflow-hidden"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shine_2s_infinite]"></div>

                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.4)] mb-6 animate-pulse">
                            <Crown size={40} className="text-white fill-white/20" />
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-2 font-arabic bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
                            مبارك لك!
                        </h2>

                        <p className="text-slate-300 font-arabic text-[15px] leading-relaxed mb-6">
                            لقد أصبح حسابك الآن <span className="text-yellow-400 font-bold">متميزاً</span>.<br />
                            تم فتح جميع الميزات وألعاب الحفظ اللا محدودة بنجاح.
                        </p>

                        <div className="bg-slate-950/50 rounded-2xl p-4 mb-8 border border-slate-700/50">
                            <p className="text-emerald-400 font-arabic font-bold text-md leading-relaxed">
                                "نسأل الله أن يبارك لك في حفظك وأن يجعله حجة لك لا عليك"
                            </p>
                        </div>

                        <ArcadeButton onClick={onClose} size="lg" className="w-full">
                            ابدأ رحلتك
                        </ArcadeButton>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
