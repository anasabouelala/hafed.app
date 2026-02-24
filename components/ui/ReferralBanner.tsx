
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, CheckCheck, Gift, Users } from 'lucide-react';

const DISCOUNT_CODE = '30HAFED30';
const GUMROAD_URL = 'https://hafedapp.gumroad.com/l/mfkxjl?wanted=true';

interface ReferralBannerProps {
    gumroadUrl?: string;
}

export const ReferralBanner: React.FC<ReferralBannerProps> = ({ gumroadUrl = GUMROAD_URL }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(DISCOUNT_CODE);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback for older browsers
            const el = document.createElement('textarea');
            el.value = DISCOUNT_CODE;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 240, delay: 0.4 }}
            className="fixed top-0 inset-x-0 z-50 font-cairo"
            dir="rtl"
        >
            <div className="flex items-center justify-between gap-3 px-4 py-2.5
        bg-gradient-to-l from-emerald-700 via-teal-600 to-emerald-700
        shadow-[0_4px_24px_rgba(0,0,0,0.5)]">

                {/* Left: message */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Gift size={16} className="text-emerald-200 shrink-0" />
                        <span className="text-white font-black text-sm leading-tight">
                            شارك مع عائلتك وأصدقائك
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-emerald-100 text-xs font-medium">
                        <Users size={13} className="text-emerald-200 shrink-0" />
                        <span>يحصلون على <span className="text-white font-black">خصم 30٪</span> بكود:</span>
                        {/* Code pill */}
                        <span className="bg-white/20 border border-white/30 text-white font-black tracking-widest text-xs px-2 py-0.5 rounded-md">
                            {DISCOUNT_CODE}
                        </span>
                    </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Copy button */}
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs
              min-h-[40px] transition-all active:scale-95 shadow-md
              ${copied
                                ? 'bg-emerald-400 text-emerald-900'
                                : 'bg-white text-emerald-700 hover:bg-emerald-50'
                            }`}
                    >
                        {copied
                            ? <><CheckCheck size={14} /><span>تم النسخ!</span></>
                            : <><Copy size={14} /><span>نسخ الكود</span></>
                        }
                    </button>

                    {/* Share link */}
                    <a
                        href={`${gumroadUrl}&discount_code=${DISCOUNT_CODE}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs
              min-h-[40px] bg-emerald-900/50 border border-white/20 text-white
              hover:bg-emerald-900/70 transition-all active:scale-95"
                    >
                        شارك الرابط ↗
                    </a>
                </div>
            </div>
        </motion.div>
    );
};
