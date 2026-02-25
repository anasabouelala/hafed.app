import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Mail, Send } from 'lucide-react';

export const SupportWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');

    const supportEmail = 'abouelala93@gmail.com';

    const handleSend = () => {
        const subject = encodeURIComponent('طلب مساعدة - Hafed App');
        const body = encodeURIComponent(message);
        window.open(`mailto:${supportEmail}?subject=${subject}&body=${body}`, '_blank');
        setIsOpen(false);
        setMessage('');
    };

    return (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start font-cairo" dir="rtl">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl w-80 mb-4 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                    <MessageCircle className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">الدعم الفني</h3>
                                    <p className="text-indigo-100 text-xs opacity-90">نحن هنا لمساعدتك!</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 bg-slate-900">
                            <p className="text-slate-300 text-sm mb-4">
                                هل تواجه مشكلة أو لديك اقتراح؟ أرسل لنا رسالة وسنرد عليك عبر البريد الإلكتروني في أقرب وقت.
                            </p>

                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="اكتب رسالتك هنا..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none h-28"
                            />

                            <button
                                onClick={handleSend}
                                disabled={!message.trim()}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Send size={18} />
                                <span>إرسال عبر البريد الإلكتروني</span>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-800/50 p-3 text-center border-t border-slate-800">
                            <a href={`mailto:${supportEmail}`} className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5">
                                <Mail size={12} />
                                <span>{supportEmail}</span>
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors relative ${isOpen
                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
                    }`}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <X size={24} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <MessageCircle size={24} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Ping animation when closed */}
                {!isOpen && (
                    <span className="absolute top-0 right-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-slate-900"></span>
                    </span>
                )}
            </motion.button>
        </div>
    );
};
