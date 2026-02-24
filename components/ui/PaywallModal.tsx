
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Lock, CheckCircle } from 'lucide-react';

interface PaywallModalProps {
    open: boolean;
    onClose: () => void;
    reason?: 'game' | 'analysis';
    gumroadUrl: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ open, onClose, reason = 'game', gumroadUrl }) => {
    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.88, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                        className="fixed inset-0 flex items-center justify-center z-[1000] p-4"
                        dir="rtl"
                    >
                        <div className="relative bg-slate-900 border border-indigo-500/30 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl shadow-indigo-500/20 font-cairo overflow-hidden">
                            {/* Glow */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="absolute top-5 left-5 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={22} />
                            </button>

                            {/* Lock icon */}
                            <div className="flex justify-center mb-6">
                                <div className="bg-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center">
                                    <Lock className="text-indigo-400 w-8 h-8" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-white text-center mb-2">
                                انتهت التجربة المجانية
                            </h2>
                            <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
                                {reason === 'analysis'
                                    ? 'لقد استخدمت تحليل التلاوة المجاني. اشترك للحصول على استعمال غير محدود.'
                                    : 'لقد استخدمت جلستَي اللعب المجانيتين. اشترك للحصول على استعمال غير محدود.'}
                            </p>

                            {/* Feature bullets */}
                            <div className="space-y-3 mb-8 bg-slate-800/50 rounded-2xl p-5">
                                {[
                                    'جميع الألعاب الست بلا قيود',
                                    'مصحح التلاوة بالذكاء الاصطناعي — غير محدود',
                                    'تتبع التقدم ولوحة الإحصائيات',
                                    'جميع سور القرآن الـ 114',
                                ].map(f => (
                                    <div key={f} className="flex items-center gap-3">
                                        <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                                        <span className="text-slate-200 text-sm">{f}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA */}
                            <a
                                href={gumroadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-lg py-4 px-8 rounded-2xl shadow-[0_10px_40px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95 transition-all"
                            >
                                <Zap className="inline-block ml-2 w-5 h-5" />
                                اشترك الآن — 99 ر.س / شهر
                            </a>
                            <p className="text-slate-600 text-[11px] text-center mt-3">بدون إلغاء تلقائي • أمان تام</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
