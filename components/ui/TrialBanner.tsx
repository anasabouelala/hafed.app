
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Gamepad2, Mic, ExternalLink } from 'lucide-react';
import { trialService } from '../../services/trialService';

const GUMROAD_URL = 'https://hafedapp.gumroad.com/l/mfkxjl?wanted=true';

interface TrialBannerProps {
    onUpgrade: () => void;
    gumroadUrl?: string;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ onUpgrade, gumroadUrl = GUMROAD_URL }) => {
    const { games, analysis } = trialService.getRemaining();
    const exhausted = games === 0 && analysis === 0;

    return (
        <motion.div
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 240, delay: 0.4 }}
            className="fixed top-0 inset-x-0 z-50 font-cairo"
            dir="rtl"
        >
            {/* ── Main bar ─────────────────────────────────────── */}
            <div
                className={`
          flex flex-col sm:flex-row items-stretch sm:items-center
          gap-0 sm:gap-4
          shadow-[0_6px_32px_rgba(0,0,0,0.7)]
          ${exhausted
                        ? 'bg-gradient-to-l from-red-700 via-rose-600 to-red-700'
                        : 'bg-gradient-to-l from-orange-600 via-red-500 to-orange-600'
                    }`}
            >
                {/* ── TOP ROW: label + button (always on same visual row) ── */}
                <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1 sm:py-3 sm:flex-1">

                    {/* Label block */}
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="text-white font-black text-base leading-tight">
                            {exhausted ? '🔒 انتهت التجربة المجانية' : '🎁 تجربة مجانية'}
                        </span>

                        {/* Sub-label — only shown on desktop alongside */}
                        {exhausted && (
                            <p className="text-red-200 text-sm font-bold hidden sm:block">
                                اشترك للاستمتاع باستعمال كامل بلا حدود
                            </p>
                        )}
                    </div>

                    {/* CTA — direct link to Gumroad checkout */}
                    <a
                        href={gumroadUrl}
                        data-gumroad-overlay-checkout="true"
                        className="shrink-0 flex flex-col items-center justify-center
              px-4 py-2 rounded-2xl
              bg-white text-red-600 hover:bg-orange-50
              min-h-[54px] min-w-[120px] sm:min-w-[140px]
              active:scale-95 transition-all shadow-xl shadow-black/40"
                    >
                        <div className="flex items-center gap-1.5">
                            <Zap size={15} className="shrink-0 text-orange-500" />
                            <span className="font-black text-sm sm:text-base whitespace-nowrap">اشترك الآن</span>
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-orange-500 whitespace-nowrap leading-tight mt-0.5">
                            ✦ استعمال كامل بلا حدود
                        </span>
                    </a>
                </div>

                {/* ── BOTTOM ROW (mobile only): counters full-width ── */}
                {!exhausted && (
                    <div className="flex items-center justify-center gap-6 px-4 pb-3 sm:pb-0 sm:pr-0 sm:pl-4">
                        {/* Games counter */}
                        <div className="flex items-center gap-2">
                            <Gamepad2 size={18} className="text-orange-200 shrink-0" />
                            <span className="text-orange-100 text-sm font-semibold">
                                <span className="text-white font-black text-lg">{games}</span>
                                {' '}لعبة
                            </span>
                        </div>

                        {/* Separator */}
                        <span className="text-white/30 text-lg font-thin">|</span>

                        {/* Analysis counter */}
                        <div className="flex items-center gap-2">
                            <Mic size={18} className="text-orange-200 shrink-0" />
                            <span className="text-orange-100 text-sm font-semibold">
                                <span className="text-white font-black text-lg">{analysis}</span>
                                {' '}تحليل
                            </span>
                        </div>
                    </div>
                )}

                {/* Exhausted sub-label on mobile */}
                {exhausted && (
                    <p className="sm:hidden text-red-200 text-sm font-bold text-center pb-3 px-4">
                        اشترك للاستمتاع باستعمال كامل بلا حدود
                    </p>
                )}
            </div>

            {/* ── Progress bar ─────────────────────────────── */}
            {!exhausted && (
                <div className="h-1.5 bg-red-900/60 w-full">
                    <motion.div
                        className="h-full bg-white/80 rounded-full"
                        initial={{ width: '100%' }}
                        animate={{
                            width: `${((games / trialService.MAX_GAMES + analysis / trialService.MAX_ANALYSIS) / 2) * 100}%`,
                        }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.7 }}
                    />
                </div>
            )}
        </motion.div>
    );
};
