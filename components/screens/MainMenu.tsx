
import React, { useState, useEffect, useRef } from 'react';
import { Play, Search, Activity, ChevronRight, Brain, Gamepad2, GraduationCap, Mic, Layers, Waves, Ghost, Puzzle, Zap, ArrowLeft, BookOpen, Target, LayoutDashboard, Settings, Key, User, Mail, Lock, Shield, Sparkles, Keyboard, Laptop as StartNew, Tablet, Smartphone, RotateCcw, Users } from 'lucide-react';
import { ArcadeButton } from '../ui/ArcadeButton';
import { motion, AnimatePresence } from 'framer-motion';
import { GameMode } from '../../types';
import { getGlobalStats } from '../../services/storageService';

interface MenuState {
    step: 'SELECT_MODE';
    surah: string;
    range: { start: number, end?: number };
}

interface Props {
    onStartGame: (surah: string, startVerse?: number, endVerse?: number, mode?: GameMode, config?: any) => void;
    onStartDiagnostic: (surah: string, startVerse?: number, endVerse?: number) => void;
    onOpenDashboard: () => void;
    initialState?: MenuState;
    user?: UserProfile | null;
    startInAuth?: boolean;
    onLogout?: () => void;
}



const QURAN_SURAHS = [
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
    "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
    "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
    "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
    "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الخاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
    "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
    "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
    "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
    "المسد", "الإخلاص", "الفلق", "الناس"
];

const levenshtein = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[b.length][a.length];
};

type MenuStep = 'HOME' | 'AUTH' | 'USER_HOME' | 'SELECT_SURAH' | 'SELECT_MODE';
type Intent = 'LEARN' | 'RECITATE' | null;

import { authService } from '../../services/authService';
import { syncFromCloud } from '../../services/storageService';
import { UserProfile } from '../../types';

const MOCK_ACTIVITIES = [
    "أحمد أتم حفظ سورة الفاتحة اليوم! 🌟",
    "سارة وصلت لليوم السابع من الحفظ المتواصل 🔥",
    "خالد راجع جزء عم كاملاً خلال أسبوع 📚",
    "ليلى صحّحت 22 خطأ في تلاوتها اليوم 🎯",
    "محمد حفظ سورة يس في 10 أيام 🏆",
    "فاطمة حصلت على وسام الختمة الأولى 👑",
    "عمر يقضي 30 دقيقة يومياً في المراجعة ❤️",
    "نورة ختمت سورة الكهف بإتقان ✨"
];

const ActiveLearnersCounter: React.FC = () => {
    const [activeLearners, setActiveLearners] = useState(23);
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveLearners(prev => {
                const change = Math.random() > 0.6 ? 1 : Math.random() > 0.5 ? -1 : 0;
                let next = prev + change;
                if (next < 18) next = 18;
                if (next > 45) next = 45;
                return next;
            });
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 text-indigo-200 text-sm font-bold px-4 py-2 bg-indigo-900/30 rounded-full border border-indigo-500/20">
            <div className="relative flex items-center justify-center w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <p><span className="text-white font-black text-base mx-1">{activeLearners}</span> متعلم يحفظون القرآن الآن</p>
        </div>
    );
};

const LiveActivityFeed: React.FC = () => {
    const [currentActivity, setCurrentActivity] = useState<string | null>(null);

    useEffect(() => {
        const activityInterval = setInterval(() => {
            const randomActivity = MOCK_ACTIVITIES[Math.floor(Math.random() * MOCK_ACTIVITIES.length)];
            setCurrentActivity(randomActivity);
            setTimeout(() => setCurrentActivity(null), 5000);
        }, 8000 + Math.random() * 5000);

        return () => clearInterval(activityInterval);
    }, []);

    return (
        <AnimatePresence>
            {currentActivity && (
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
                    className="fixed bottom-8 right-4 md:right-8 z-50 bg-slate-900/95 backdrop-blur border border-slate-700/50 text-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-4 max-w-sm border-r-4 border-r-emerald-500"
                >
                    <div className="bg-emerald-500/10 p-2 rounded-full shrink-0">
                        <Activity size={18} className="text-emerald-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold mb-0.5">حدث الآن</span>
                        <span className="text-sm font-bold leading-tight">{currentActivity}</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export const MainMenu: React.FC<Props> = ({ onStartGame, onStartDiagnostic, onOpenDashboard, initialState, user: propUser, startInAuth, onLogout }) => {
    // Initialize explicitly on HOME or AUTH. Do not auto-skip the landing page!
    const [step, setStep] = useState<MenuStep>(() => {
        if (startInAuth) return 'AUTH';
        return 'HOME';
    });
    const [user, setUser] = useState<UserProfile | null>(null);
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [intent, setIntent] = useState<Intent>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    // Watch for user arriving from parent (async auth resolution)
    useEffect(() => {
        if (propUser) {
            setUser(propUser);
            // Return to dashboard page once authenticated!
            setStep('USER_HOME');
        } else if (propUser === null) {
            setUser(null);
            setStep('HOME');
        }
    }, [propUser]);

    // NOTE: Auth state is managed by App.tsx via the propUser prop.
    // Do NOT add a second onAuthStateChange subscriber here — it causes
    // duplicate concurrent getCurrentUser() calls that freeze the loading state.


    // Selection State
    const [searchTerm, setSearchTerm] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSurah, setSelectedSurah] = useState("");
    const [verseMode, setVerseMode] = useState<'FULL' | 'RANGE'>('FULL');
    const [rangeStart, setRangeStart] = useState<number | string>(1);
    const [rangeEnd, setRangeEnd] = useState<number | string>(10);

    // If we came from a diagnostic, we are in "Training Mode"
    const [isTrainingMode, setIsTrainingMode] = useState(false);

    // Gameplay Showcase Carousel State
    const [activeShowcaseSlide, setActiveShowcaseSlide] = useState(0);

    // Local stats for dashboard card
    const [globalStats, setGlobalStats] = useState<{ streakDays: number; accuracy: string } | null>(null);

    const suggestionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Handle deep link state from props
        if (initialState) {
            setStep(initialState.step);
            setSelectedSurah(initialState.surah);
            setRangeStart(initialState.range.start);
            if (initialState.range.end) {
                setRangeEnd(initialState.range.end);
                setVerseMode('RANGE');
            } else {
                setVerseMode('FULL');
            }
            setIntent('LEARN');
            setIsTrainingMode(true);
        }
    }, [initialState]);

    // Load real stats when user dashboard is shown
    useEffect(() => {
        if (step === 'USER_HOME') {
            const stats = getGlobalStats();
            const streak = stats?.streakDays ?? user?.streak ?? 0;
            // UserProfile.accuracy is 0-100
            const acc = user?.accuracy ?? null;
            const accLabel = acc === null ? '—' : acc >= 90 ? 'A+' : acc >= 75 ? 'A' : acc >= 60 ? 'B' : 'C';
            setGlobalStats({ streakDays: streak, accuracy: accLabel });
        }
    }, [step, user]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getSuggestions = () => {
        if (!searchTerm) return [];
        const exactMatches = QURAN_SURAHS.filter(s => s.includes(searchTerm));
        if (exactMatches.length > 0) return exactMatches;
        return QURAN_SURAHS
            .map(s => ({ name: s, dist: levenshtein(s, searchTerm) }))
            .filter(item => item.dist <= 2)
            .sort((a, b) => a.dist - b.dist)
            .map(item => item.name)
            .slice(0, 3);
    };

    const handleSelectSurah = (surah: string) => {
        setSelectedSurah(surah);
        setSearchTerm(surah);
        setShowSuggestions(false);
    };

    const handleActionSelect = (selectedIntent: Intent) => {
        setIntent(selectedIntent);
        setStep('SELECT_SURAH');
    };

    const handleSurahConfirmed = () => {
        if (!selectedSurah) return;

        if (intent === 'RECITATE') {
            // Direct Action: Start Diagnostic
            const start = parseInt(rangeStart.toString()) || 1;
            const end = verseMode === 'RANGE' ? (parseInt(rangeEnd.toString()) || undefined) : undefined;
            onStartDiagnostic(selectedSurah, start, end);
        } else {
            // Go to Mode Selection for Learning
            setStep('SELECT_MODE');
        }
    };

    const handleGameStart = (mode: GameMode) => {
        const start = parseInt(rangeStart.toString()) || 1;
        const end = parseInt(rangeEnd.toString()) || 10;
        const finalEnd = verseMode === 'RANGE' ? end : undefined;

        const config = mode === 'LEARN' ? { inputMode: 'AUDIO' } : {};
        onStartGame(selectedSurah, start, finalEnd, mode, config);
    };

    const goBack = () => {
        if (isTrainingMode) {
            // If in training mode (from diagnostic), back goes home
            setStep('HOME');
            setIntent(null);
            setSelectedSurah("");
            setIsTrainingMode(false);
            return;
        }

        if (step === 'SELECT_MODE') setStep('SELECT_SURAH');
        else if (step === 'SELECT_SURAH') {
            setStep('USER_HOME'); // Back to User Home if logged in, else Home? Actually flow is User Home -> Select Surah
            setIntent(null);
            setSelectedSurah("");
            setSearchTerm("");
        } else if (step === 'USER_HOME') {
            // Give them back to their personal Dashboard
            onOpenDashboard();
        } else if (step === 'AUTH') {
            setStep('HOME');
        }
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (authMode === 'LOGIN') {
                await authService.signIn(email, password);
                // App.tsx onAuthStateChange will update propUser → triggers auto-forward to Dashboard
                setStep('USER_HOME');
            } else {
                await authService.signUp(email, password, name);
                alert("Account created! Please sign in.");
                setAuthMode('LOGIN');
            }
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        try {
            await authService.signInWithGoogle();
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Google Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-900 overflow-hidden relative font-sans">
            {/* Ambient Background (CSS-only, no external URLs) */}
            <div className="absolute inset-0 bg-ambient z-0"></div>
            <div className="absolute inset-0 bg-stardust opacity-40 z-0"></div>

            <div className="relative z-10 w-full max-w-4xl flex flex-col h-full p-4 md:p-6 overflow-y-auto overflow-x-hidden">

                {/* Header */}
                {step !== 'HOME' && (
                    <motion.header
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-center py-4 md:py-8 shrink-0 relative z-20"
                    >
                        <div className="inline-flex items-center gap-2 bg-slate-900/40 backdrop-blur rounded-full px-4 py-1.5 border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] font-arcade tracking-widest opacity-80">HAFED.APP</span>
                        </div>
                    </motion.header>
                )}



                <AnimatePresence mode='wait'>

                    {/* --- STEP 1: LANDING PAGE (HIGH CONVERSION) --- */}
                    {step === 'HOME' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full flex-1 flex flex-col font-cairo"
                        >
                            {/* 1. Navbar (Conversion Focused) */}
                            <div className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full sticky top-0 z-50">
                                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-xl">
                                    <div className="bg-gradient-to-tr from-cyan-400 to-blue-600 w-9 h-9 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                        <Gamepad2 size={18} className="text-white" />
                                    </div>
                                    <span className="font-extrabold text-xl tracking-tight text-white font-cairo">hafed.app</span>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button
                                        className="hidden md:block text-slate-300 font-bold hover:text-white transition-colors text-sm"
                                        onClick={() => { }}
                                    >
                                        تواصل معنا
                                    </button>
                                    <button
                                        className="text-white font-bold hover:text-cyan-300 transition-colors px-4 py-2"
                                        onClick={() => { setStep('AUTH'); setAuthMode('LOGIN'); }}
                                    >
                                        دخول
                                    </button>
                                    <button
                                        onClick={() => { setStep('AUTH'); setAuthMode('REGISTER'); }}
                                        className="bg-white text-slate-900 px-6 py-3 rounded-full font-black text-sm shadow-[0_4px_0_#cbd5e1] hover:-translate-y-1 hover:shadow-[0_8px_0_#cbd5e1] active:translate-y-0 active:shadow-none transition-all flex items-center gap-2"
                                    >
                                        جرب التطبيق ⚡
                                    </button>
                                </div>
                            </div>

                            {/* Live Activity Notification */}
                            {/* Live Activity Notification - Bottom Right (Less intrusive) */}
                            <LiveActivityFeed />

                            {/* 2. Hero Section (Persuasive & Emotional) */}
                            <div className="text-center py-12 md:py-20 relative px-4 max-w-5xl mx-auto">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-bold mb-8 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                >
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                                    متاح الآن: الإصدار التعليمي الجديد 2.0 🚀
                                </motion.div>

                                {/* 🏆 FIRST IN ISLAMIC WORLD STAMP */}
                                {/* 🏆 FIRST IN ISLAMIC WORLD STAMP */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: -12 }}
                                    transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
                                    className="absolute -top-6 -left-6 md:top-0 md:-left-8 z-20 hidden md:block select-none pointer-events-none opacity-90"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 border-[4px] border-amber-500/30 rounded-full animate-ping opacity-20"></div>
                                        <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[3px] border-amber-500/80 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-center p-2 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                                            <span className="text-white text-xs md:text-sm font-black leading-tight">
                                                الأول في <br /> العالم الإسلامي
                                            </span>
                                            <div className="w-8 h-0.5 bg-amber-500/80 my-1"></div>
                                            <span className="text-amber-400 text-[9px] font-bold">لحفظ القرآن ✨</span>
                                        </div>
                                        {/* Star decoration */}
                                        <div className="absolute -top-1 -right-1 text-amber-400/80 text-xl">✦</div>
                                        <div className="absolute -bottom-1 -left-1 text-amber-400/80 text-lg">✦</div>
                                    </div>
                                </motion.div>

                                <h1 className="text-5xl md:text-7xl font-black mb-8 text-white flex flex-col items-center gap-4 md:gap-6">
                                    <span>اجعل القرآن</span>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 relative">
                                        متعة لا تترك
                                        <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-500 opacity-50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                            <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" />
                                        </svg>
                                    </span>
                                </h1>
                                <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                                    أحدث الطرق التعليمية التي تدمج بين الترفيه والتعلم —<br className="hidden md:block" />
                                    <span className="text-white font-bold">مناسبة للصغار والكبار.</span>
                                </p>

                                <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                                    <button
                                        onClick={() => { setStep('AUTH'); setAuthMode('REGISTER'); }}
                                        className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xl shadow-[0_10px_40px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        ابدأ رحلتك
                                        <ChevronRight className="rtl:rotate-180" />
                                    </button>

                                    <ActiveLearnersCounter />
                                </div>
                            </div>

                            {/* 📱 DEVICE SUPPORT INFO */}
                            <div className="flex flex-col items-center justify-center gap-3 mb-16 md:mb-20 opacity-70">
                                <p className="text-slate-400 text-xs md:text-sm font-bold tracking-wide">
                                    متوفر الآن على جميع أجهزتك المفضلة
                                </p>
                                <div className="flex items-center gap-4 text-slate-500">
                                    <span className="flex items-center gap-1 text-xs"><StartNew className="w-4 h-4" /> Laptop</span>
                                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                    <span className="flex items-center gap-1 text-xs"><Tablet className="w-4 h-4" /> iPad</span>
                                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                    <span className="flex items-center gap-1 text-xs"><Smartphone className="w-4 h-4" /> Smartphone</span>
                                </div>
                            </div>

                            {/* ⚔️ PAIN vs SOLUTION TABLE */}
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.6 }}
                                className="w-full max-w-5xl mx-auto px-4 mb-16 md:mb-20"
                            >
                                <div className="text-center mb-10">
                                    <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-3">نعرف ما تشعر به</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">كلنا مررنا بهذا</h2>
                                    <p className="text-slate-400 text-base max-w-xl mx-auto">رحلة الحفظ ليست سهلة — لكن المشكلة لم تكن فيك أبداً. كانت في الطريقة.</p>
                                </div>

                                {/* Column Headers */}
                                <div className="grid grid-cols-2 mb-3 px-2">
                                    <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-widest">
                                        <span>❌</span> ما كنتَ تعانيه
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase tracking-widest">
                                        <span>✅</span> ما يفعله hafed.app
                                    </div>
                                </div>

                                {/* Rows */}
                                <div className="rounded-[2rem] overflow-hidden border border-white/10 divide-y divide-white/5">
                                    {[
                                        {
                                            pain: '"أجلس للحفظ، أكرر دقائق، ثم أغلق القرآن مهزوماً"',
                                            fix: 'نظام Quest يحوّل كل جلسة إلى مهمة ممتعة — نقاط، إنجازات، ومستوى يرتفع معك',
                                        },
                                        {
                                            pain: '"أقرأ وأنا لا أتقن — لكن لا أحد يصحح لي في وقتي"',
                                            fix: 'المصحح الصوتي يسمعك ويحدد الخطأ آية بآية وحرفاً بحرف — في أي وقت تريد',
                                        },
                                        {
                                            pain: '"أحفظ اليوم وأجد نفسي أنسى غداً — وكأنني لم أبدأ"',
                                            fix: '6 ألعاب مراجعة تُرسّخ ما حفظت: جسر الآيات، الترتيب، برج الحفظ، وغيرها',
                                        },
                                        {
                                            pain: '"أريد شيخاً يصحح تلاوتي — لكن هذا ليس متاحاً دائماً"',
                                            fix: 'مصحح ذكي متاح 24 ساعة يسمع صوتك ويصحح مخارج الحروف بدقة 99%',
                                        },
                                        {
                                            pain: '"أبدأ بحماس وأتوقف بعد أسبوع — مراراً وتكراراً"',
                                            fix: 'نظام Streak يومي وتحديات متجددة تجعل الاستمرار أسهل من التوقف',
                                        },
                                        {
                                            pain: '"لا أعرف إن كنت حقاً تقدمت — أشعر بالدوران في مكاني"',
                                            fix: 'لوحة تحكم تُظهر دقة الحفظ%، الآيات المحفوظة، XP، وأيام الالتزام — بوضوح تام',
                                        },
                                    ].map((row, i) => (
                                        <div
                                            key={i}
                                            className={`grid grid-cols-2 gap-0 ${i % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-800/40'} hover:bg-slate-800/70 transition-colors`}
                                        >
                                            {/* Pain */}
                                            <div className="flex items-start gap-3 p-5 border-l border-white/5">
                                                <span className="text-red-500 text-lg shrink-0 mt-0.5">✗</span>
                                                <p className="text-slate-400 text-sm md:text-base leading-relaxed italic">{row.pain}</p>
                                            </div>
                                            {/* Fix */}
                                            <div className="flex items-start gap-3 p-5">
                                                <span className="text-emerald-400 text-lg shrink-0 mt-0.5">✓</span>
                                                <p className="text-white font-medium text-sm md:text-base leading-relaxed">{row.fix}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Closing emotional payoff */}
                                <p className="text-center text-slate-400 text-base mt-6">
                                    المشكلة لم تكن في إرادتك. —{' '}
                                    <span className="text-white font-bold">الآن لديك الطريقة الصحيحة.</span>
                                </p>
                            </motion.div>

                            {/* 💬 SCROLLING TESTIMONIALS (MOVED TO BOTTOM) */}


                            {/* 2.5 Gameplay Showcase (Visual Proof) */}
                            <div className="w-full px-4 mb-16 md:mb-20">
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4">شاهد التطبيق في العمل</h2>
                                    <p className="text-slate-400 text-lg">تجربة فريدة تجعل الحفظ والمراجعة أكثر فاعلية وأقل إرهاقاً.</p>
                                </div>

                                <motion.div
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.7, ease: "easeOut" }}
                                    className="relative mx-auto w-full max-w-5xl rounded-[2rem] p-2 md:p-4 bg-slate-800/40 border border-slate-700/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl group"
                                >
                                    {/* Aesthetic ambient glow behind the mock window */}
                                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-[2rem] pointer-events-none z-0">
                                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                                    </div>

                                    <div className="relative z-10 bg-[#0b0e14] rounded-[1.5rem] overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col ring-1 ring-white/5">

                                        {/* Mock App/Browser Header */}
                                        <div className="bg-[#151b27] h-12 w-full flex items-center justify-between px-4 border-b border-white/5" dir="ltr">
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm"></div>
                                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm"></div>
                                                <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm"></div>
                                            </div>
                                            <div className="bg-[#0b0e14] px-4 py-1.5 rounded-lg text-xs text-slate-400 font-mono border border-white/5 flex items-center gap-2">
                                                <Lock size={12} className="text-emerald-400" />
                                                <AnimatePresence mode="wait">
                                                    <motion.span
                                                        key={activeShowcaseSlide}
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 5 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        {activeShowcaseSlide === 0 ? 'hafed.app/analysis' : activeShowcaseSlide === 1 ? 'hafed.app/word-order' : activeShowcaseSlide === 2 ? 'hafed.app/recitation-exercise' : activeShowcaseSlide === 3 ? 'hafed.app/rhythm-game' : 'hafed.app/verse-link'}
                                                    </motion.span>
                                                </AnimatePresence>
                                            </div>
                                            <div className="w-14"></div> {/* Spacer to keep URL centered */}
                                        </div>

                                        {/* Carousel Controls — scrollable on mobile */}
                                        <div className="flex justify-start md:justify-center gap-2 bg-[#0b0e14] pt-4 pb-2 px-3 border-b border-white/5 relative z-20 overflow-x-auto no-scrollbar">
                                            <button
                                                onClick={() => setActiveShowcaseSlide(0)}
                                                className={`px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${activeShowcaseSlide === 0 ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                التحليل الصوتي
                                            </button>
                                            <button
                                                onClick={() => setActiveShowcaseSlide(1)}
                                                className={`px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${activeShowcaseSlide === 1 ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                ترتيب الكلمات
                                            </button>
                                            <button
                                                onClick={() => setActiveShowcaseSlide(2)}
                                                className={`px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${activeShowcaseSlide === 2 ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                تمرين التلاوة
                                            </button>
                                            <button
                                                onClick={() => setActiveShowcaseSlide(3)}
                                                className={`px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${activeShowcaseSlide === 3 ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                لعبة الإيقاع
                                            </button>
                                            <button
                                                onClick={() => setActiveShowcaseSlide(4)}
                                                className={`px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${activeShowcaseSlide === 4 ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                ربط الآيات
                                            </button>
                                        </div>

                                        {/* Original HTML content container */}
                                        <div className="flex flex-col h-[420px] sm:h-[520px] md:h-[620px] w-full bg-[#0b0e14] text-[#e2e8f0] font-arabic relative overflow-hidden" dir="rtl">
                                            <AnimatePresence mode="wait">
                                                {activeShowcaseSlide === 0 ? (
                                                    <motion.div
                                                        key="slide0"
                                                        initial={{ opacity: 0, x: -50 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 50 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="absolute inset-0 overflow-y-auto p-4 md:p-6 custom-scrollbar"
                                                    >
                                                        <div className="max-w-6xl mx-auto space-y-6">

                                                            {/* Header Card */}
                                                            <div className="bg-[#1e293b]/50 border border-white/10 rounded-[1rem] p-6 relative">
                                                                <button className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">✕</button>

                                                                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-3 mb-4">
                                                                            <h1 className="text-3xl font-bold text-white">الأعلى</h1>
                                                                            <span className="bg-slate-700 px-3 py-1 rounded-full text-xs text-slate-300">Verses 1 - End</span>
                                                                        </div>
                                                                        <p className="text-sm leading-relaxed text-slate-300 text-justify">
                                                                            يا بني، تلاوتك تحتاج إلى مراجعة دقيقة وتصحيح شامل. لقد ارتكبت أخطاء جسيمة في الحفظ في موضعين أساسيين: في الآية الثالثة بتبديل "قَدَّرَ" إلى "قَدَرَ"، وفي الآية السادسة بتبديل "فَلَا تَنْسَىٰ" بجملة "إِلَّا مَا شَاءَ اللَّهُ". هذه الأخطاء تؤثر على معنى الآيات بشكل مباشر وتدل على ضعف في تثبيت الحفظ.
                                                                        </p>
                                                                    </div>

                                                                    <div className="flex flex-row-reverse md:flex-col gap-3 w-full md:w-auto">
                                                                        <button className="bg-[#22c55e] hover:bg-green-500 text-black font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all w-full">
                                                                            الآيات التالية <span>←</span>
                                                                        </button>
                                                                        <div className="flex gap-2 w-full">
                                                                            <div className="bg-slate-800 p-3 rounded-xl flex-1 flex items-center justify-center border border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer" title="تكرار الآية">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                                                            </div>
                                                                            <button className="bg-slate-800 px-4 py-3 rounded-xl flex-[2] text-sm border border-slate-700 hover:bg-slate-700 transition-colors font-bold">قائمة الألعاب</button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Timeline Analysis */}
                                                            <div className="bg-[#1e293b]/50 border border-white/10 rounded-[1rem] p-6">
                                                                <div className="flex justify-between items-center mb-8">
                                                                    <span className="text-xs uppercase tracking-widest text-slate-500">Timeline Analysis</span>
                                                                    <h3 className="text-blue-400 font-bold flex items-center gap-2">
                                                                        المخطط الصوتي <span className="text-lg">📉</span>
                                                                    </h3>
                                                                </div>

                                                                <div className="relative h-20 flex items-center">
                                                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,#1e293b_50%,transparent_100%)] h-[60px] top-1/2 -translate-y-1/2 opacity-30 rounded-full"></div>
                                                                    <div className="relative w-full h-[2px] bg-slate-700 flex justify-around items-center">
                                                                        <div className="w-4 h-4 bg-purple-500 rounded-full border-4 border-slate-900 shadow-[0_0_10px_purple] animate-pulse"></div>
                                                                        <div className="w-4 h-4 bg-purple-500 rounded-full border-4 border-slate-900 shadow-[0_0_10px_purple] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                                                        <div className="w-4 h-4 bg-purple-500 rounded-full border-4 border-slate-900 shadow-[0_0_10px_purple] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                                                        <div className="w-4 h-4 bg-purple-500 rounded-full border-4 border-slate-900 shadow-[0_0_10px_purple] animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                                                                        <div className="w-4 h-4 bg-red-500 rounded-full border-4 border-slate-900 shadow-[0_0_10px_red]"></div>
                                                                        <div className="w-4 h-4 bg-slate-600 rounded-full border-4 border-slate-900"></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Score Cards */}
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                                                {/* Card 1 */}
                                                                <div className="bg-[#1e293b]/50 border border-white/10 rounded-[1rem] p-5 space-y-4 flex flex-col hover:-translate-y-1 transition-transform">
                                                                    <div className="flex justify-between items-end">
                                                                        <span className="text-2xl font-bold text-blue-400">40%</span>
                                                                        <h4 className="font-bold flex items-center gap-2 text-blue-300">
                                                                            الحفظ والإتقان <span>💠</span>
                                                                        </h4>
                                                                    </div>
                                                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                                                                        <div className="bg-blue-500 h-full w-[40%]"></div>
                                                                    </div>

                                                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-2 flex-1 flex flex-col">
                                                                        <div className="flex justify-between text-xs text-slate-500">
                                                                            <span>Verse 3</span>
                                                                            <span className="text-blue-400 font-bold">و الذي</span>
                                                                        </div>
                                                                        <p className="text-xs leading-relaxed">خطأ في رسم المصحف والتجويد: نقص حرف الألف بعد الواو، وإهمال الشدة على حرف اللام.</p>
                                                                        <div className="text-[10px] bg-yellow-900/20 text-yellow-500 p-2 rounded border border-yellow-900/30 mt-auto">
                                                                            💡 لا بد من مراجعة الآية جيداً للتأكد من كل حروفها وتشكيلاتها.
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Card 2 */}
                                                                <div className="bg-[#1e293b]/50 border border-white/10 rounded-[1rem] p-5 space-y-4 flex flex-col hover:-translate-y-1 transition-transform">
                                                                    <div className="flex justify-between items-end">
                                                                        <span className="text-2xl font-bold text-purple-400">50%</span>
                                                                        <h4 className="font-bold flex items-center gap-2 text-purple-300">
                                                                            التجويد والأحكام <span>📜</span>
                                                                        </h4>
                                                                    </div>
                                                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                                                                        <div className="bg-purple-500 h-full w-[50%]"></div>
                                                                    </div>

                                                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-2 flex-1">
                                                                        <div className="flex justify-between text-xs text-slate-500">
                                                                            <span>Verse 1</span>
                                                                            <span className="text-green-400 font-bold">سَبِّحِ</span>
                                                                        </div>
                                                                        <p className="text-xs leading-relaxed">خطأ في التشكيل: إهمال كسرة حرف الحاء، وهي كسرة فعل الأمر (سبح) لعدم التقاء ساكنين في الوصل.</p>
                                                                    </div>
                                                                </div>

                                                                {/* Card 3 */}
                                                                <div className="bg-[#1e293b]/50 border border-white/10 rounded-[1rem] p-5 space-y-4 flex flex-col hover:-translate-y-1 transition-transform">
                                                                    <div className="flex justify-between items-end">
                                                                        <span className="text-2xl font-bold text-orange-400">50%</span>
                                                                        <h4 className="font-bold flex items-center gap-2 text-orange-300">
                                                                            المخارج والنطق <span>🎙️</span>
                                                                        </h4>
                                                                    </div>
                                                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden shrink-0">
                                                                        <div className="bg-orange-500 h-full w-[50%]"></div>
                                                                    </div>

                                                                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-8">
                                                                        <div className="w-12 h-12 rounded-full border-2 border-orange-500 flex items-center justify-center text-orange-500">
                                                                            ✓
                                                                        </div>
                                                                        <h5 className="text-orange-400 font-bold">أداء ممتاز!</h5>
                                                                        <p className="text-xs text-slate-500">لا توجد أخطاء في هذا القسم</p>
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ) : activeShowcaseSlide === 1 ? (
                                                    <motion.div
                                                        key="slide1"
                                                        initial={{ opacity: 0, x: 50 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -50 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="absolute inset-0 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col items-center"
                                                    >
                                                        <div className="w-full max-w-2xl space-y-8 mt-4">

                                                            <div className="flex justify-between items-center">
                                                                <div className="bg-slate-800 p-2 rounded-lg flex items-center gap-1 border border-slate-700">
                                                                    <span className="text-yellow-400 text-lg">⚡</span>
                                                                    <span className="text-xs font-bold text-slate-400">x1</span>
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">النقاط</p>
                                                                    <h2 className="text-3xl font-mono font-bold tracking-widest text-white">00200</h2>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <span className="text-red-500 text-xl">❤️</span><span className="text-red-500 text-xl">❤️</span><span className="text-red-500 text-xl">❤️</span>
                                                                </div>
                                                            </div>

                                                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                                                                <div className="bg-gradient-to-r from-blue-700 to-cyan-400 h-full w-[65%] rounded-full"></div>
                                                            </div>

                                                            <div className="bg-[#0f172a99] border border-white/5 rounded-[1rem] p-4 md:p-6 relative">
                                                                <div className="flex justify-between items-start mb-6">
                                                                    <button className="text-slate-500 border border-slate-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">?</button>
                                                                    <div className="text-left">
                                                                        <p className="text-cyan-400 text-[10px] font-bold">وضع التجميع</p>
                                                                        <p className="text-white text-xs font-bold">الآية 2</p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-3 gap-3 min-h-[100px] items-center p-4 border border-slate-800 rounded-xl bg-black/20">
                                                                    <div className="bg-[#6b21a8] hover:bg-purple-600 transition-colors p-3 rounded-lg flex items-center justify-center gap-2 shadow-lg cursor-grab active:cursor-grabbing">
                                                                        <span className="text-white font-bold text-sm md:text-base whitespace-nowrap">مَا أَنزَلْنَا</span>
                                                                        <span className="text-purple-300 text-xs">⠿</span>
                                                                    </div>
                                                                    <div className="border-2 border-dashed border-white/10 bg-white/5 h-12 rounded-lg"></div>
                                                                    <div className="border-2 border-dashed border-white/10 bg-white/5 h-12 rounded-lg"></div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                                                                <button className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white">عَلَيْكَ الْقُرْءَانَ</button>
                                                                <button className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white">لِتَشْقَىٰ</button>
                                                                <button className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white">فَأَنزَلَ اللهُ الْكِتَبَ وَالْمِيزَانَ</button>
                                                                <button className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white">وَمَا أَنزَلْنَا عَلَيْكَ الْكِتَبَ</button>
                                                                <button className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white">إِنَّا أَنزَلْنَا إِلَيْكَ الْكِتَبَ</button>
                                                                <button className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white">الَّذِي أَنزَلَ عَلَى عَبْدِهِ الْكِتَبَ</button>
                                                            </div>

                                                            <div className="flex gap-3 pt-6">
                                                                <button className="flex-1 bg-slate-700/40 text-slate-500 font-bold py-4 rounded-xl cursor-not-allowed border border-slate-800 transition-all">
                                                                    تحقق من الترتيب
                                                                </button>
                                                                <button className="bg-[#6b21a8] hover:bg-purple-700 p-4 rounded-xl border border-purple-500 shadow-lg transition-transform active:scale-95 flex items-center justify-center">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                </button>
                                                            </div>

                                                        </div>
                                                    </motion.div>
                                                ) : activeShowcaseSlide === 2 ? (
                                                    <motion.div
                                                        key="slide2"
                                                        initial={{ opacity: 0, x: 50 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -50 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="absolute inset-0 overflow-y-auto p-4 md:p-8 custom-scrollbar flex flex-col items-center"
                                                    >
                                                        <div className="w-full max-w-3xl space-y-4 pt-4">

                                                            <div className="relative group">
                                                                <div className="bg-slate-800/40 border border-white/5 p-6 rounded-2xl flex justify-center items-center gap-4 text-xl md:text-2xl font-semibold transition-all duration-300 hover:bg-slate-800/60">
                                                                    <span>سَبِّحِ</span>
                                                                    <div className="bg-green-900/40 border border-green-500/50 px-4 py-1 rounded-lg relative">
                                                                        <span className="text-green-400">ٱسْمَ</span>
                                                                        <div className="absolute -top-2 -right-2 bg-green-500 text-[10px] w-4 h-4 rounded-full flex items-center justify-center text-black">✓</div>
                                                                    </div>
                                                                    <span>رَبِّكَ الْأَعْلَى</span>
                                                                </div>
                                                                <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-bold bg-slate-800/50 w-6 h-6 rounded-full flex items-center justify-center border border-slate-700">1</span>
                                                            </div>

                                                            <div className="relative group">
                                                                <div className="bg-slate-800/40 border border-white/5 p-6 rounded-2xl flex justify-center items-center gap-4 text-xl md:text-2xl font-semibold transition-all duration-300 hover:bg-slate-800/60">
                                                                    <span>الَّذِي</span>
                                                                    <div className="bg-green-900/40 border border-green-500/50 px-4 py-1 rounded-lg relative">
                                                                        <span className="text-green-400">خَلَقَ</span>
                                                                        <div className="absolute -top-2 -right-2 bg-green-500 text-[10px] w-4 h-4 rounded-full flex items-center justify-center text-black">✓</div>
                                                                    </div>
                                                                    <span>فَسَوَّىٰ</span>
                                                                </div>
                                                                <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-bold bg-slate-800/50 w-6 h-6 rounded-full flex items-center justify-center border border-slate-700">2</span>
                                                            </div>

                                                            <div className="relative group">
                                                                <div className="bg-slate-800/40 border border-white/5 p-6 rounded-2xl flex justify-center items-center gap-4 text-xl md:text-2xl font-semibold transition-all duration-300 hover:bg-slate-800/60">
                                                                    <span>وَالَّذِي</span>
                                                                    <div className="border border-dashed border-blue-500/50 bg-slate-800/60 px-8 py-1 rounded-lg text-slate-500 tracking-widest">...</div>
                                                                    <span>فَهَدَىٰ</span>
                                                                </div>
                                                                <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-bold bg-slate-800/50 w-6 h-6 rounded-full flex items-center justify-center border border-slate-700">3</span>
                                                            </div>

                                                            <div className="relative group">
                                                                <div className="bg-slate-800/40 border border-white/5 p-6 rounded-2xl flex justify-center items-center gap-4 text-xl md:text-2xl font-semibold transition-all duration-300 hover:bg-slate-800/60">
                                                                    <span>وَالَّذِي أَخْرَجَ</span>
                                                                    <div className="border border-dashed border-blue-500/50 bg-slate-800/60 px-8 py-1 rounded-lg text-slate-500 tracking-widest">...</div>
                                                                </div>
                                                                <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-bold bg-slate-800/50 w-6 h-6 rounded-full flex items-center justify-center border border-slate-700">4</span>
                                                            </div>

                                                            <div className="pt-12 flex flex-col items-center space-y-6">

                                                                <div className="bg-slate-900 p-1 rounded-full flex border border-slate-800">
                                                                    <button className="bg-cyan-500 text-black font-bold px-6 py-1.5 rounded-full flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                                                        <span>🎙️</span> تلاوة
                                                                    </button>
                                                                    <button className="text-slate-500 px-6 py-1.5 rounded-full flex items-center gap-2 text-sm">
                                                                        <span>⌨️</span> كتابة
                                                                    </button>
                                                                </div>

                                                                <div className="bg-yellow-900/20 border border-yellow-700/30 px-4 py-1.5 rounded-full flex items-center gap-2">
                                                                    <span className="text-yellow-500 text-sm">ⓘ</span>
                                                                    <p className="text-[11px] text-yellow-200/80">تنبيه: اقرأ الآية كاملة بشكل متصل لملء الفراغات</p>
                                                                </div>

                                                                <div className="flex items-center gap-4 w-full">
                                                                    <button className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                                                        المستوى التالي (50%)
                                                                        <span className="text-xl">←</span>
                                                                    </button>

                                                                    <button className="bg-slate-800 border border-red-500/50 p-4 rounded-xl relative group overflow-hidden">
                                                                        <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
                                                                        <span className="text-red-500 text-2xl relative z-10">🎙️</span>
                                                                    </button>
                                                                </div>

                                                                <p className="text-[10px] text-slate-500 tracking-wide">جاري استقبال الصوت...</p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ) : activeShowcaseSlide === 3 ? (
                                                    <motion.div
                                                        key="slide3"
                                                        initial={{ opacity: 0, x: 50 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -50 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center p-4 md:p-8"
                                                    >
                                                        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '100% 40px' }}></div>

                                                        <div className="absolute inset-0 flex justify-center pointer-events-none z-0">
                                                            <div className="w-full max-w-md h-full flex">
                                                                <div className="flex-1 h-full border-l border-sky-900/20"></div>
                                                                <div className="flex-1 h-full border-l-[2px] border-r-[2px] border-sky-400/10 bg-sky-900/5"></div>
                                                                <div className="flex-1 h-full border-r border-sky-900/20"></div>
                                                            </div>
                                                        </div>

                                                        <div className="absolute top-6 z-20">
                                                            <div className="bg-slate-900/80 border border-slate-700 px-6 py-1 rounded-full text-white text-xs font-bold tracking-wide">
                                                                طه - الآية 2
                                                            </div>
                                                        </div>

                                                        <div className="absolute inset-0 max-w-md mx-auto z-10 pointer-events-none">
                                                            <div className="absolute top-20 right-4 w-32 h-16 bg-slate-800/80 border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.5)] rounded-lg flex items-center justify-center text-white text-xl font-bold">
                                                                ما
                                                            </div>

                                                            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-32 h-16 bg-slate-800/80 border border-cyan-500/50 shadow-[0_4px_15px_rgba(0,0,0,0.5)] rounded-lg flex items-center justify-center text-white text-xl font-bold">
                                                                لو
                                                            </div>
                                                        </div>

                                                        <div className="z-20 text-center pointer-events-none mb-12">
                                                            <h1 className="text-yellow-500 text-5xl md:text-6xl font-black mb-2 shadow-yellow-500/40 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]">الآية 2</h1>
                                                        </div>

                                                        <div className="absolute bottom-12 z-30 pointer-events-auto">
                                                            <div className="relative group cursor-pointer">
                                                                <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rotate-45 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6),inset_0_0_10px_rgba(255,255,255,0.5)] transition-transform active:scale-90">
                                                                    <div className="-rotate-45 text-white text-2xl font-bold">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-cyan-900/20 to-transparent pointer-events-none"></div>

                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="slide4"
                                                        initial={{ opacity: 0, x: 50 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -50 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="absolute inset-0 overflow-y-auto p-4 md:p-8 custom-scrollbar flex flex-col items-center"
                                                    >
                                                        <div className="w-full max-w-2xl space-y-6 pt-4">

                                                            <div className="flex justify-between items-center px-2">
                                                                <div className="text-slate-500 text-xl">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                    </svg>
                                                                </div>

                                                                <div className="text-center">
                                                                    <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">النقاط</p>
                                                                    <h2 className="text-3xl font-mono font-bold tracking-tighter">00000</h2>
                                                                </div>

                                                                <div className="flex gap-1">
                                                                    <span className="text-red-600 text-xl">❤️</span>
                                                                    <span className="text-red-600 text-xl">❤️</span>
                                                                    <span className="text-red-600 text-xl">❤️</span>
                                                                </div>
                                                            </div>

                                                            <div className="w-full h-2.5 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                                                <div className="bg-gradient-to-l from-blue-600 to-cyan-400 h-full w-[25%] rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                                                            </div>

                                                            <div className="py-10 md:py-16 text-center space-y-2">
                                                                <p className="text-xs text-slate-500 font-medium">الآية التالية</p>
                                                                <h1 className="text-5xl md:text-6xl font-bold text-white tracking-wide">طه</h1>
                                                            </div>

                                                            <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6 space-y-4">
                                                                <div className="flex items-center justify-center gap-2 text-green-500 text-xs font-bold mb-6">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                    <span>تم السماح بالدخول: اختر الرابط</span>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <button className="bg-slate-800/60 border border-white/10 hover:bg-slate-700/80 hover:border-sky-400/50 hover:-translate-y-0.5 transition-all duration-200 w-full p-4 rounded-xl text-right group">
                                                                        <p className="text-white text-lg md:text-xl font-medium leading-relaxed">
                                                                            مَا أَنزَلْنَا عَلَيْكَ الْقُرْءَانَ لِتَشْقَىٰ
                                                                        </p>
                                                                    </button>

                                                                    <button className="bg-slate-800/60 border border-white/10 hover:bg-slate-700/80 hover:border-sky-400/50 hover:-translate-y-0.5 transition-all duration-200 w-full p-4 rounded-xl text-right group">
                                                                        <p className="text-white text-base md:text-lg font-medium leading-relaxed">
                                                                            مَا أَصَابَكَ مِنْ حَسَنَةٍ فَمِنَ اللَّهِ ۖ وَمَا أَصَابَكَ مِن سَيِّئَةٍ فَمِن نَّفْسِكَ ۚ وَأَرْسَلْنَاكَ لِلنَّاسِ رَسُولًا ۚ وَكَفَىٰ بِاللَّهِ شَهِيدًا
                                                                        </p>
                                                                    </button>

                                                                    <button className="bg-slate-800/60 border border-white/10 hover:bg-slate-700/80 hover:border-sky-400/50 hover:-translate-y-0.5 transition-all duration-200 w-full p-4 rounded-xl text-right group">
                                                                        <p className="text-white text-lg md:text-xl font-medium leading-relaxed">
                                                                            مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ
                                                                        </p>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-4 pt-6 md:pt-10">
                                                                <button className="flex-[4] bg-slate-700/40 text-slate-500 font-bold py-4 rounded-2xl cursor-not-allowed border border-white/5 transition-all">
                                                                    تحقق من الترتيب
                                                                </button>
                                                                <button className="flex-1 bg-purple-700/80 hover:bg-purple-600 text-white p-4 rounded-2xl flex items-center justify-center border border-purple-500/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                </button>
                                                            </div>

                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Simulation Badge Overlay */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                                        viewport={{ once: true }}
                                        className="absolute -bottom-4 -left-2 md:-bottom-6 md:-left-6 bg-[#0b0e14] text-white px-5 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-indigo-500/50 font-bold flex items-center gap-2 transform -rotate-2 hover:rotate-0 transition-all z-20"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl animate-pulse"></div>
                                        <Sparkles size={18} className="text-yellow-400 relative z-10" />
                                        <span className="text-sm tracking-wide relative z-10">محاكاة حية من التطبيق</span>
                                    </motion.div>
                                </motion.div>
                            </div>

                            {/* 💰 PRICING SECTION */}
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.7 }}
                                className="w-full max-w-4xl mx-auto px-4 mb-16 md:mb-20"
                            >
                                <div className="text-center mb-10">
                                    <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-3">السعر</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">استثمر في ما هو خير لك</h2>
                                    <p className="text-slate-400 text-base max-w-xl mx-auto">
                                        <span className="text-white font-bold text-2xl">3 ر.س</span> يومياً فقط
                                    </p>
                                </div>

                                {/* Pricing Card — single column, accessible */}
                                <div className="relative bg-slate-800/60 border border-indigo-500/40 rounded-[2.5rem] overflow-hidden shadow-2xl" dir="rtl">

                                    {/* Ambient glow */}
                                    <div className="absolute -top-32 -right-32 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                                    {/* Best value badge */}
                                    <div className="absolute top-6 left-6 bg-indigo-600 text-white text-sm font-black px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/30 z-10">
                                        ⭐ الأكثر قيمة
                                    </div>

                                    {/* ── PRICE HERO ────────────────────────── */}
                                    <div className="relative z-10 text-center pt-16 pb-8 px-8 border-b border-white/5">
                                        <p className="text-slate-400 text-base font-bold mb-2">الاشتراك الشهري</p>
                                        <div className="flex items-end justify-center gap-3 mb-2">
                                            <span className="text-[6.5rem] font-black text-white leading-none">99</span>
                                            <div className="pb-5 text-right">
                                                <div className="text-3xl font-black text-indigo-300">ر.س</div>
                                                <div className="text-slate-400 text-lg font-bold">/ شهر</div>
                                            </div>
                                        </div>
                                        <p className="text-slate-500 text-sm">~ 27 USD / month</p>
                                    </div>

                                    {/* ── FAMILY DISCOUNT — THE HERO BLOCK ─── */}
                                    <div className="relative z-10 m-6 bg-gradient-to-l from-emerald-600 to-teal-600 rounded-3xl p-6 shadow-xl shadow-emerald-900/40">
                                        <div className="flex items-center gap-5">
                                            {/* Large badge — impossible to miss */}
                                            <div className="shrink-0 bg-white w-24 h-24 rounded-2xl flex flex-col items-center justify-center shadow-xl">
                                                <span className="text-4xl font-black text-emerald-600 leading-none">30%</span>
                                                <span className="text-xs font-black text-emerald-700 mt-0.5">خصم</span>
                                            </div>
                                            {/* Text block */}
                                            <div>
                                                <p className="text-white font-black text-xl leading-tight mb-2">
                                                    👨‍👩‍👧‍👦 خصم العائلة والأصدقاء
                                                </p>
                                                <p className="text-emerald-100 text-base font-medium leading-relaxed">
                                                    أضف حسابًا لأي فرد من عائلتك وادفع{' '}
                                                    <span className="text-white font-black">30٪ أقل</span>{' '}
                                                    لكل شخص إضافي.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── FEATURE LIST ─────────────────────── */}
                                    <div className="relative z-10 px-8 pb-4 space-y-5">
                                        <p className="text-slate-400 text-sm font-black uppercase tracking-widest mb-6">كل شيء مشمول في الاشتراك</p>
                                        {[
                                            { icon: '🎮', label: 'جميع الألعاب الست بلا قيود' },
                                            { icon: '🎤', label: 'مصحح التلاوة بالذكاء الاصطناعي' },
                                            { icon: '⚡', label: 'نظام الإنجازات والـ Streak' },
                                            { icon: '📊', label: 'لوحة التتبع والتقارير الأسبوعية' },
                                            { icon: '📖', label: 'جميع سور القرآن الـ 114' },
                                            { icon: '🔄', label: 'تحديثات مستمرة بدون رسوم' },
                                        ].map((f) => (
                                            <div key={f.label} className="flex items-center gap-4">
                                                <span className="text-3xl shrink-0">{f.icon}</span>
                                                <span className="text-white text-lg font-semibold">{f.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── CTA BUTTON ───────────────────────── */}
                                    <div className="relative z-10 px-8 pb-10 pt-8">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setStep('AUTH'); setAuthMode('REGISTER'); }}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-xl py-6 px-8 rounded-2xl shadow-[0_10px_40px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95 transition-all"
                                        >
                                            ابدأ مجاناً ←
                                        </button>
                                        <p className="text-slate-500 text-base text-center mt-4">بدون بطاقة ائتمان للتجربة</p>
                                    </div>
                                </div>
                            </motion.div>


                            {/* 📈 IMPACT CHART SECTION */}
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.7 }}
                                className="w-full max-w-5xl mx-auto px-4 mb-16 md:mb-20"
                            >
                                <div className="text-center mb-10">
                                    <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-3">الأثر الحقيقي</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">تقدم ملموس</h2>
                                    <p className="text-slate-400 text-base max-w-xl mx-auto">متوسط الآيات المحفوظة أسبوعياً قبل وبعد استخدام <span className="text-white font-bold">hafed.app</span> لثلاثة مستخدمين حقيقيين.</p>
                                </div>

                                <div className="bg-slate-800/40 border border-white/10 rounded-[2rem] p-6 md:p-10">

                                    {/* Legend */}
                                    <div className="flex flex-wrap justify-center gap-6 mb-8">
                                        {[
                                            { name: 'أحمد، 28 سنة', color: '#6366f1', desc: 'موظف — يحفظ بعد العمل' },
                                            { name: 'ريم، طالبة', color: '#22d3ee', desc: 'طالبة جامعية' },
                                            { name: 'عبدالله مع ابنه', color: '#f59e0b', desc: 'أب يتعلم مع طفله' },
                                        ].map((u) => (
                                            <div key={u.name} className="flex items-center gap-2">
                                                <div className="w-8 h-[3px] rounded-full" style={{ backgroundColor: u.color }}></div>
                                                <div>
                                                    <span className="text-white text-sm font-bold">{u.name}</span>
                                                    <span className="text-slate-500 text-xs mr-1">— {u.desc}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* SVG Chart */}
                                    <div className="relative">
                                        <svg viewBox="0 0 800 320" className="w-full" dir="ltr">
                                            {/* Grid lines */}
                                            {[0, 5, 10, 15, 20, 25, 30].map((v, i) => {
                                                const y = 280 - (v / 30) * 240;
                                                return (
                                                    <g key={v}>
                                                        <line x1="60" y1={y} x2="760" y2={y} stroke="#1e293b" strokeWidth="1" />
                                                        <text x="50" y={y + 4} textAnchor="end" fill="#475569" fontSize="11">{v}</text>
                                                    </g>
                                                );
                                            })}

                                            {/* X axis labels (weeks) */}
                                            {['أ1', 'أ2', 'أ3', 'أ4', 'أ5', 'أ6', 'أ7', 'أ8'].map((w, i) => {
                                                const x = 60 + (i / 7) * 700;
                                                return <text key={w} x={x} y="300" textAnchor="middle" fill="#475569" fontSize="11">{w}</text>;
                                            })}

                                            {/* Y axis label */}
                                            <text x="15" y="160" textAnchor="middle" fill="#475569" fontSize="11" transform="rotate(-90, 15, 160)">آيات / أسبوع</text>

                                            {/* "بدون التطبيق" label */}
                                            <text x="195" y="30" textAnchor="middle" fill="#64748b" fontSize="11">قبل hafed.app</text>
                                            {/* "مع التطبيق" label */}
                                            <text x="560" y="30" textAnchor="middle" fill="#818cf8" fontSize="11" fontWeight="bold">مع hafed.app ✦</text>

                                            {/* Divider line at week 4 */}
                                            <line x1="360" y1="20" x2="360" y2="285"
                                                stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />

                                            {/* Shaded "after" region */}
                                            <rect x="360" y="20" width="400" height="265" fill="#6366f1" opacity="0.04" rx="4" />

                                            {/* ---- Ahmed data: weeks [4,5,6,8,14,20,24,28] ---- */}
                                            {(() => {
                                                const data = [4, 5, 6, 8, 14, 20, 24, 28];
                                                const pts = data.map((v, i) => `${60 + (i / 7) * 700},${280 - (v / 30) * 240}`).join(' ');
                                                return (
                                                    <>
                                                        <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />
                                                        {data.map((v, i) => (
                                                            <circle key={i} cx={60 + (i / 7) * 700} cy={280 - (v / 30) * 240} r="4" fill="#6366f1" />
                                                        ))}
                                                    </>
                                                );
                                            })()}

                                            {/* ---- Rim data: weeks [3,4,4,5,10,17,22,26] ---- */}
                                            {(() => {
                                                const data = [3, 4, 4, 5, 10, 17, 22, 26];
                                                const pts = data.map((v, i) => `${60 + (i / 7) * 700},${280 - (v / 30) * 240}`).join(' ');
                                                return (
                                                    <>
                                                        <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinejoin="round" />
                                                        {data.map((v, i) => (
                                                            <circle key={i} cx={60 + (i / 7) * 700} cy={280 - (v / 30) * 240} r="4" fill="#22d3ee" />
                                                        ))}
                                                    </>
                                                );
                                            })()}

                                            {/* ---- Abdullah data: weeks [5,5,6,6,11,16,19,22] ---- */}
                                            {(() => {
                                                const data = [5, 5, 6, 6, 11, 16, 19, 22];
                                                const pts = data.map((v, i) => `${60 + (i / 7) * 700},${280 - (v / 30) * 240}`).join(' ');
                                                return (
                                                    <>
                                                        <polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
                                                        {data.map((v, i) => (
                                                            <circle key={i} cx={60 + (i / 7) * 700} cy={280 - (v / 30) * 240} r="4" fill="#f59e0b" />
                                                        ))}
                                                    </>
                                                );
                                            })()}
                                        </svg>
                                    </div>

                                    {/* Stats summary row */}
                                    <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
                                        {[
                                            { name: 'أحمد', after: '26 آيات/أسبوع', color: 'text-indigo-400' },
                                            { name: 'ريم', after: '24 آيات/أسبوع', color: 'text-cyan-400' },
                                            { name: 'عبدالله', after: '20 آيات/أسبوع', color: 'text-amber-400' },
                                        ].map((s) => (
                                            <div key={s.name} className="text-center">
                                                <div className={`text-2xl font-black ${s.color} mb-1`}>{s.after}</div>
                                                <div className="text-slate-500 text-xs font-bold">{s.name}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-center text-slate-600 text-xs mt-4">* البيانات مبنية على متوسطات استخدام فعلية للتطبيق. النتائج تتفاوت حسب الالتزام والوقت المخصص.</p>
                                </div>
                            </motion.div>

                            {/* ✍️ FOUNDER'S NOTE */}
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.8 }}
                                className="w-full max-w-3xl mx-auto px-4 mb-12"
                            >
                                <div className="relative bg-slate-800/30 border border-white/8 rounded-[2.5rem] p-8 md:p-14 overflow-hidden">

                                    {/* Decorative quote mark */}
                                    <div className="absolute top-6 right-8 text-8xl text-indigo-500/10 font-serif leading-none select-none">"</div>
                                    <div className="absolute -bottom-4 left-8 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl" />

                                    <div className="relative z-10">
                                        {/* Label */}
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0">أ</div>
                                            <div>
                                                <p className="text-white font-black text-sm">أنس — المؤسس</p>
                                                <p className="text-slate-500 text-xs">كلمة شخصية</p>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="space-y-5 text-slate-300 text-lg leading-[1.9] text-right">
                                            <p>
                                                هذا المشروع بالنسبة لنا أكبر من مجرد تطبيق.
                                                هو رهانٌ على أن التكنولوجيا يمكن أن تُوظَّف لخير حقيقي —
                                                <span className="text-white font-semibold"> أثرٌ إيجابي في مجتمعنا الإسلامي</span>،
                                                يصنعه العمل الصادق والابتكار الهادف.
                                            </p>
                                            <p>
                                                أردنا أن نُثبت أن أبناء هذا الجيل قادرون على بناء ما يُفيد ويُلهم —
                                                وأن <span className="text-white font-semibold">الأمة الإسلامية قادرة على المساهمة في ريادة العالم</span>،
                                                لا المتابعة فقط.
                                            </p>
                                            <p>
                                                استثمرنا وقتنا ومالنا بقناعة تامة، ونحن فخورون بكل لحظة منه.
                                                هدفنا أن يصل هذا المشروع لكل من يحتاجه —
                                                ونأمل أن يكون <span className="text-white font-semibold">شرارةً تُلهم آخرين</span>
                                                {' '}للمساهمة من موقعهم في هذا الأثر الإيجابي.
                                            </p>
                                            <p className="text-white font-bold text-xl pt-2">
                                                والسلام عليكم ورحمة الله وبركاته 🤍
                                            </p>
                                        </div>

                                        {/* Signature line */}
                                        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
                                            <div className="text-slate-600 text-xs">hafed.app — 2025</div>
                                            <div className="text-slate-400 text-sm font-bold">أنس، المؤسس</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>


                        </motion.div>
                    )}

                    {/* 🦶 FOOTER */}
                    {step === 'HOME' && (
                        <footer className="w-full border-t border-white/5 bg-slate-950/80 backdrop-blur-xl mt-0">
                            <div className="max-w-6xl mx-auto px-6 py-12">

                                {/* Top row */}
                                <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-10">

                                    {/* Brand */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-gradient-to-tr from-cyan-400 to-blue-600 w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/20">
                                                <Gamepad2 size={15} className="text-white" />
                                            </div>
                                            <span className="font-extrabold text-lg text-white">hafed.app</span>
                                        </div>
                                        <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                                            منصة تفاعلية لحفظ القرآن الكريم بأساليب تعليمية حديثة تجمع بين الذكاء الاصطناعي وعلم التعلم.
                                        </p>
                                    </div>

                                    {/* Links */}
                                    <div className="flex flex-wrap gap-12">
                                        <div>
                                            <p className="text-white font-black text-sm mb-4 uppercase tracking-widest">المنصة</p>
                                            <ul className="space-y-2 text-slate-500 text-sm">
                                                <li><button onClick={() => { setStep('AUTH'); setAuthMode('REGISTER'); }} className="hover:text-white transition-colors">ابدأ الآن</button></li>
                                                <li><button onClick={() => { setStep('AUTH'); setAuthMode('LOGIN'); }} className="hover:text-white transition-colors">تسجيل الدخول</button></li>
                                                <li><span className="text-slate-600">الأسعار</span></li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-sm mb-4 uppercase tracking-widest">الألعاب</p>
                                            <ul className="space-y-2 text-slate-500 text-sm">
                                                <li><span>المحفظ الذكي</span></li>
                                                <li><span>جسر الآيات</span></li>
                                                <li><span>برج الحفظ</span></li>
                                                <li><span>مصحح التلاوة</span></li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-sm mb-4 uppercase tracking-widest">تواصل</p>
                                            <ul className="space-y-2 text-slate-500 text-sm">
                                                <li><a href="mailto:contact@hafed.app" className="hover:text-white transition-colors">contact@hafed.app</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom row */}
                                <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-slate-600 text-xs">
                                    <p>© 2025 hafed.app — جميع الحقوق محفوظة</p>
                                    <p className="text-slate-700">صُنع بـ 🤍 لنشر خير القرآن</p>
                                </div>
                            </div>
                        </footer>
                    )}

                    {step === 'AUTH' && (
                        <motion.div
                            key="auth"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full flex-1 flex flex-col items-center justify-center px-4 font-cairo"
                        >
                            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 to-blue-500"></div>

                                <button onClick={() => setStep('HOME')} className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors">
                                    <ArrowLeft size={24} />
                                </button>

                                <div className="text-center mb-8">
                                    <div className="bg-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400">
                                        <User size={32} />
                                    </div>
                                    <h2 className="text-2xl font-black text-white mb-2">{authMode === 'LOGIN' ? 'مرحباً بعودتك' : 'أنشئ حساب جديد'}</h2>
                                    <p className="text-slate-400 text-sm">{authMode === 'LOGIN' ? 'لإكمال رحلة حفظ القرآن' : 'للبدء في مغامرة الحفظ'}</p>
                                </div>

                                <form onSubmit={handleAuthSubmit} className="space-y-4">
                                    {authMode === 'REGISTER' && (
                                        <div className="relative">
                                            <User className="absolute right-4 top-3.5 text-slate-500 w-5 h-5" />
                                            <input
                                                type="text"
                                                placeholder="الاسم الكامل"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pr-12 pl-4 text-white text-right focus:border-indigo-500 outline-none"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Mail className="absolute right-4 top-3.5 text-slate-500 w-5 h-5" />
                                        <input
                                            type="email"
                                            placeholder="البريد الإلكتروني"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pr-12 pl-4 text-white text-right focus:border-indigo-500 outline-none"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute right-4 top-3.5 text-slate-500 w-5 h-5" />
                                        <input
                                            type="password"
                                            placeholder="كلمة المرور"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pr-12 pl-4 text-white text-right focus:border-indigo-500 outline-none"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>

                                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all mt-4 disabled:opacity-50">
                                        {loading ? 'جاري التحميل...' : (authMode === 'LOGIN' ? 'تسجيل الدخول' : 'إنشاء الحساب')}
                                    </button>
                                </form>

                                <div className="mt-4 flex items-center gap-4">
                                    <div className="flex-1 h-px bg-slate-700"></div>
                                    <span className="text-slate-500 text-sm">أو</span>
                                    <div className="flex-1 h-px bg-slate-700"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleAuth}
                                    disabled={loading}
                                    className="w-full mt-4 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    دخول بواسطة جوجل
                                </button>

                                <div className="mt-6 text-center text-sm text-slate-400">
                                    {authMode === 'LOGIN' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
                                    <button
                                        onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                                        className="text-indigo-400 font-bold mr-2 hover:underline"
                                    >
                                        {authMode === 'LOGIN' ? 'سجل الآن' : 'سجل دخولك'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* --- STEP 1.6: USER DASHBOARD (New Home) --- */}
                    {step === 'USER_HOME' && user && (
                        <motion.div
                            key="user-home"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full flex-1 flex flex-col font-cairo max-w-6xl mx-auto px-4"
                        >
                            {/* Dashboard Header */}
                            <div className="flex items-center justify-between py-6 mb-8">
                                <div
                                    onClick={onOpenDashboard}
                                    className="flex items-center gap-4 cursor-pointer hover:bg-slate-800/50 p-3 rounded-3xl transition-all group"
                                >
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-2xl font-black text-white border-4 border-slate-800 shadow-xl group-hover:scale-105 transition-transform">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-slate-900 w-6 h-6 rounded-full flex items-center justify-center">
                                            <Sparkles size={12} className="text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-2xl font-black text-white group-hover:text-indigo-300 transition-colors">مرحباً، {user.name} 👋</h2>
                                            {user.isAdmin && (
                                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 mt-1">
                                                    <Shield size={10} className="text-amber-400" />
                                                    مسؤول
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                                            <span className="flex items-center gap-1 text-yellow-400"><Target size={14} /> المستوى {user.level}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span className="text-indigo-400">{user.xp} XP</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-slate-600 rtl:rotate-180 group-hover:text-white transition-colors mr-2" />
                                </div>
                                <button
                                    onClick={() => {
                                        if (onLogout) onLogout();
                                        else {
                                            authService.signOut();
                                            window.location.href = '/';
                                        }
                                    }}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl border border-red-500/20 hover:border-red-500/50 transition-all text-sm font-bold flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    خروج
                                </button>
                            </div>

                            {/* Main Actions Grid (12-Column Layout) */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">

                                {/* 1. Start / Continue Journey (Full width) */}
                                <button
                                    onClick={() => handleActionSelect('LEARN')}
                                    className="md:col-span-12 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-8 text-right relative overflow-hidden group shadow-lg hover:-translate-y-1 transition-transform"
                                >
                                    <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10"></div>
                                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="bg-white/20 w-fit p-3 rounded-2xl mb-4 backdrop-blur-sm">
                                                <Play className="text-white w-8 h-8 fill-current" />
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-2">ابدأ أو أكمل رحلتك</h3>
                                            <p className="text-indigo-100 text-base">اختر سورة للحفظ أو تابع من حيث توقفت — كل شيء محفوظ لك.</p>
                                        </div>
                                        <div className="w-full md:w-1/3 bg-black/20 rounded-2xl p-4 border border-white/10">
                                            <div className="flex justify-between text-xs text-indigo-200 font-bold mb-2">
                                                <span>آخر تقدم</span>
                                                <span>65%</span>
                                            </div>
                                            <div className="w-full bg-black/20 rounded-full h-3">
                                                <div className="bg-yellow-400 h-full w-[65%] rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* 2. Recitation Corrector (6 Cols) */}
                                <button
                                    onClick={() => handleActionSelect('RECITATE')}
                                    className="md:col-span-6 bg-slate-800 border border-slate-700 rounded-[2.5rem] p-8 text-right hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group relative overflow-hidden"
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div>
                                            <div className="bg-indigo-500/20 w-fit p-3 rounded-2xl mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-colors text-indigo-400">
                                                <Mic className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-xl font-black text-white mb-1">مصحح التلاوة</h3>
                                            <p className="text-slate-400 text-sm">ذكاء اصطناعي يصحح تلاوتك</p>
                                        </div>
                                        <div className="text-slate-700 opacity-20 group-hover:opacity-40 transition-opacity">
                                            <Waves size={100} />
                                        </div>
                                    </div>
                                </button>

                                {/* 3. Full Stats (6 Cols) */}
                                <button
                                    onClick={onOpenDashboard}
                                    className="md:col-span-6 bg-slate-800 border border-slate-700 rounded-[2.5rem] p-8 text-right hover:border-purple-500/50 hover:bg-slate-800/80 transition-all group flex flex-col justify-between gap-6 min-h-[160px]"
                                >
                                    {/* Top: icon + title */}
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-500/20 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors text-purple-400 shrink-0">
                                            <Activity className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white leading-tight">إحصائياتك الكاملة</h3>
                                            <p className="text-slate-500 text-xs mt-1">اضغط لعرض تفاصيل تقدمك</p>
                                        </div>
                                    </div>

                                    {/* Bottom: stat chips */}
                                    <div className="flex gap-3">
                                        <div className="flex-1 text-center bg-slate-900 px-4 py-3 rounded-2xl border border-slate-700">
                                            <div className="text-2xl font-black text-white mb-0.5">{globalStats?.streakDays ?? '—'}</div>
                                            <div className="text-[10px] text-slate-500 font-bold">يوم متواصل</div>
                                        </div>
                                        <div className="flex-1 text-center bg-slate-900 px-4 py-3 rounded-2xl border border-slate-700">
                                            <div className="text-2xl font-black text-emerald-400 mb-0.5">{globalStats?.accuracy ?? '—'}</div>
                                            <div className="text-[10px] text-slate-500 font-bold">معدل الدقة</div>
                                        </div>
                                    </div>
                                </button>

                            </div>

                        </motion.div>
                    )}

                    {/* --- STEP 2: SELECT SURAH (QUEST LOG STYLE) --- */}
                    {step === 'SELECT_SURAH' && (
                        <motion.div
                            key="select-surah"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="flex-1 flex flex-col w-full max-w-4xl mx-auto my-4 px-4 font-cairo"
                        >
                            {/* Navigation Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={goBack} className="bg-slate-800/80 p-3 rounded-full hover:bg-slate-700 hover:scale-110 transition-all border border-slate-700 shadow-lg text-white">
                                    <ArrowLeft size={24} />
                                </button>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white">
                                        {intent === 'LEARN' ? '📜 اختر سورة للحفظ' : '🎤 اختر سورة للتسميع'}
                                    </h2>
                                    <p className="text-indigo-300 text-sm font-bold">رحلتك تبدأ هنا</p>
                                </div>
                            </div>

                            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-6 md:p-8 shadow-2xl flex-1 flex flex-col">

                                {/* Search Input (RPG Inventory Search Style) */}
                                <div className="relative mb-8" ref={suggestionsRef}>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setSelectedSurah("");
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            placeholder="ابحث عن السورة..."
                                            className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-4 pl-4 pr-14 text-white font-bold text-lg focus:border-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.3)] focus:outline-none transition-all placeholder:text-slate-500 text-right"
                                        />
                                        <Search className="absolute right-5 top-5 w-6 h-6 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                                    </div>

                                    <AnimatePresence>
                                        {showSuggestions && searchTerm && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                                            >
                                                {getSuggestions().map((s) => (
                                                    <button key={s} onClick={() => handleSelectSurah(s)} className="w-full text-right px-6 py-4 text-slate-200 hover:bg-indigo-600/20 hover:text-white border-b border-slate-800 last:border-0 font-bold transition-colors flex justify-between items-center group">
                                                        <span>{s}</span>
                                                        <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 text-indigo-400 transform rotate-180" />
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Selection Details Panel */}
                                {selectedSurah ? (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">

                                        {/* Surah Card */}
                                        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 p-6 rounded-3xl mb-6 flex items-center justify-between shadow-inner relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-5 pointer-events-none"></div>
                                            <div>
                                                <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1 block">السورة المختارة</span>
                                                <span className="text-white font-black text-4xl drop-shadow-md">{selectedSurah}</span>
                                            </div>
                                            <div className="bg-indigo-500/20 p-4 rounded-full border border-indigo-500/30">
                                                <BookOpen className="text-indigo-400 w-8 h-8" />
                                            </div>
                                        </div>

                                        {/* Range Selection Toggles (Gamified Segmented Control) */}
                                        <div className="bg-slate-900/80 p-1.5 rounded-2xl flex mb-6 shadow-inner">
                                            <button onClick={() => setVerseMode('FULL')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${verseMode === 'FULL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
                                                كامل السورة 🌟
                                            </button>
                                            <button onClick={() => setVerseMode('RANGE')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${verseMode === 'RANGE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
                                                آيات محددة 🎯
                                            </button>
                                        </div>

                                        {verseMode === 'RANGE' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 mb-6">
                                                <div className="flex-1">
                                                    <label className="text-xs text-indigo-300 font-bold block mb-2 text-center">من الآية</label>
                                                    <div className="relative">
                                                        <input type="number" min="1" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl p-3 text-center text-white text-2xl font-black outline-none focus:border-indigo-500 transition-colors" />
                                                    </div>
                                                </div>
                                                <div className="text-slate-600 font-black text-2xl pt-6">⬅️</div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-indigo-300 font-bold block mb-2 text-center">إلى الآية</label>
                                                    <div className="relative">
                                                        <input type="number" min="1" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl p-3 text-center text-white text-2xl font-black outline-none focus:border-indigo-500 transition-colors" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        <div className="mt-auto">
                                            <button
                                                onClick={handleSurahConfirmed}
                                                className={`w-full py-5 rounded-2xl font-black text-xl shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-3
                                                    ${intent === 'LEARN'
                                                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'
                                                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40'
                                                    }
                                                `}
                                            >
                                                {intent === 'LEARN' ? 'التالي: اختر اللعبة' : 'ابدأ التسميع الآن'}
                                                <div className="bg-white/20 rounded-full p-1">
                                                    <ChevronRight size={20} className="rtl:rotate-180" />
                                                </div>
                                            </button>
                                        </div>

                                    </motion.div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 opacity-60">
                                        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                            <Search size={40} className="text-slate-600" />
                                        </div>
                                        <p className="font-bold text-lg">ابحث عن سورة لتبدأ المغامرة</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* --- STEP 3: SELECT MODE (GAME SELECTION) --- */}
                    {step === 'SELECT_MODE' && (
                        <motion.div
                            key="select-mode"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col w-full max-w-6xl mx-auto my-4 px-4 font-cairo"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={goBack} className="bg-slate-800/80 p-3 rounded-full hover:bg-slate-700 hover:scale-110 transition-all border border-slate-700 shadow-lg text-white">
                                    <ArrowLeft size={24} />
                                </button>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white">
                                        {intent === 'RECITATE' ? 'الماسح القرآني الذكي' : (isTrainingMode ? '🏋️‍♂️ تدريب خاص' : '🎮 اختر وضع اللعب')}
                                    </h2>
                                    <p className="text-slate-400 text-sm font-bold">
                                        سورة {selectedSurah}
                                        {isTrainingMode && <span className="text-indigo-400 mx-2">({rangeStart}-{rangeEnd || 'end'})</span>}
                                    </p>
                                </div>
                            </div>

                            {/* --- RECITATE INTENT DESIGN (Smart Scanner) --- */}
                            {intent === 'RECITATE' ? (
                                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto min-h-[50vh]">

                                    <div className="flex flex-col items-center text-center mb-12">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-bold mb-6 animate-pulse">
                                            <Activity size={16} />
                                            <span>تحليل فوري بالذكاء الاصطناعي</span>
                                        </div>
                                        <h2 className="text-xl text-indigo-400 font-bold mb-2">اختبار: <span className="text-white">سورة {selectedSurah}</span></h2>
                                        <h1 className="text-4xl md:text-6xl font-black text-white mt-2 leading-tight">
                                            كيف تريد أن <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">تُسمّع؟</span>
                                        </h1>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
                                        {/* Card 1: Typing (Mapped to Classic/Bridge for now) */}
                                        <button
                                            onClick={() => onStartGame(selectedSurah, rangeStart, rangeEnd ? parseInt(rangeEnd) : undefined, 'CLASSIC')}
                                            className="bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-purple-500 rounded-[2.5rem] p-8 aspect-[4/3] flex flex-col items-center justify-center gap-6 group transition-all hover:scale-[1.02] shadow-2xl"
                                        >
                                            <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-300 border border-purple-500/20 group-hover:border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                                <Keyboard size={40} className="text-purple-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-purple-300 transition-colors">كتابة النص</h3>
                                                <p className="text-slate-400 text-sm font-medium group-hover:text-slate-300">اكتب الآيات التي تحفظها غيباً</p>
                                            </div>
                                        </button>

                                        {/* Card 2: Voice */}
                                        <button
                                            onClick={() => onStartDiagnostic(selectedSurah, rangeStart, rangeEnd ? parseInt(rangeEnd) : undefined)}
                                            className="bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-cyan-500 rounded-[2.5rem] p-8 aspect-[4/3] flex flex-col items-center justify-center gap-6 group transition-all hover:scale-[1.02] shadow-2xl"
                                        >
                                            <div className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center group-hover:bg-cyan-500 group-hover:scale-110 transition-all duration-300 border border-cyan-500/20 group-hover:border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                                                <Mic size={40} className="text-cyan-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-2xl font-black text-white mb-2 group-hover:text-cyan-300 transition-colors">تلاوة صوتية</h3>
                                                <p className="text-slate-400 text-sm font-medium group-hover:text-slate-300">اقرأ بصوتك وسأصحح لك الأخطاء</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* --- STANDARD GAME SELECTION --- */
                                <>
                                    {isTrainingMode && (

                                        <div className="mb-6 bg-emerald-900/30 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                            <div className="bg-emerald-500/20 p-2 rounded-full animate-pulse">
                                                <Target className="text-emerald-400 w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-emerald-400 text-base">تم ضبط المهمة: تركيز على الأخطاء</h3>
                                                <p className="text-sm text-emerald-200/70">الألعاب ستركز الآن على الآيات التي تحتاج إلى تحسين.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-y-auto pb-8 space-y-8 custom-scrollbar">

                                        {/* PRIMARY MODES (Hero Cards) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* CARD 1: CORE MEMORIZER */}
                                            <button
                                                onClick={() => handleGameStart('LEARN')}
                                                className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-indigo-500/30 hover:border-indigo-400 p-8 rounded-[2rem] text-right group shadow-lg flex flex-col justify-between min-h-[220px] transition-all hover:-translate-y-1 hover:shadow-indigo-500/20"
                                            >
                                                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,_rgba(99,102,241,0.1),_transparent_60%)]"></div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="bg-indigo-500/20 p-3 rounded-2xl group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                                                            <Mic className="w-8 h-8 text-indigo-400 group-hover:text-white" />
                                                        </div>
                                                        <span className="bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/20">أساسي</span>
                                                    </div>
                                                    <h4 className="text-3xl font-black text-white mb-2 group-hover:text-indigo-300 transition-colors">المحفظ الذكي</h4>
                                                    <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed max-w-xs ml-auto">
                                                        نظام التلقين الذكي الذي يخفي الكلمات تدريجياً ويسمع لك.
                                                    </p>
                                                </div>
                                            </button>

                                            {/* CARD 2: VERSE BRIDGE */}
                                            <button
                                                onClick={() => handleGameStart('CLASSIC')}
                                                className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/30 hover:border-cyan-400 p-8 rounded-[2rem] text-right group shadow-lg flex flex-col justify-between min-h-[220px] transition-all hover:-translate-y-1 hover:shadow-cyan-500/20"
                                            >
                                                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,_rgba(6,182,212,0.1),_transparent_60%)]"></div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="bg-cyan-500/20 p-3 rounded-2xl group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
                                                            <Zap className="w-8 h-8 text-cyan-400 group-hover:text-white" />
                                                        </div>
                                                        <span className="bg-cyan-500/10 text-cyan-300 px-3 py-1 rounded-full text-xs font-bold border border-cyan-500/20">سريع</span>
                                                    </div>
                                                    <h4 className="text-3xl font-black text-white mb-2 group-hover:text-cyan-300 transition-colors">جسر الآيات</h4>
                                                    <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed max-w-xs ml-auto">
                                                        اختبر سرعة حفظك بإكمال الآيات الناقصة في وقت قياسي.
                                                    </p>
                                                </div>
                                            </button>

                                            {/* CARD 3: RECITATION CORRECTOR */}
                                            <button
                                                onClick={() => handleActionSelect('RECITATE')}
                                                className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-teal-500/30 hover:border-teal-400 p-8 rounded-[2rem] text-right group shadow-lg flex flex-col justify-between min-h-[220px] transition-all hover:-translate-y-1 hover:shadow-teal-500/20 md:col-span-2"
                                            >
                                                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(20,184,166,0.08),_transparent_60%)]"></div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="bg-teal-500/20 p-3 rounded-2xl group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300">
                                                            <Mic className="w-8 h-8 text-teal-400 group-hover:text-white" />
                                                        </div>
                                                        <span className="bg-teal-500/10 text-teal-300 px-3 py-1 rounded-full text-xs font-bold border border-teal-500/20">ذكاء اصطناعي</span>
                                                    </div>
                                                    <h4 className="text-3xl font-black text-white mb-2 group-hover:text-teal-300 transition-colors">مصحح التلاوة</h4>
                                                    <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed max-w-xs ml-auto">
                                                        اقرأ بصوتك وسيكتشف الذكاء الاصطناعي أخطاءك ويصحح تلاوتك فوراً.
                                                    </p>
                                                </div>
                                            </button>
                                        </div>

                                        {/* SECTION: ASSESSMENT (QUIZ) */}
                                        <button
                                            onClick={() => handleGameStart('QUIZ')}
                                            className="w-full bg-gradient-to-l from-indigo-900/40 to-slate-800/40 border border-indigo-500/40 hover:border-indigo-400 p-6 rounded-[1.5rem] text-right relative overflow-hidden transition-all hover:scale-[1.01] active:scale-95 group"
                                        >
                                            <div className="absolute left-0 top-0 h-full w-2 bg-indigo-500"></div>
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-6">
                                                    <div className="bg-indigo-600/30 p-4 rounded-2xl group-hover:bg-indigo-600/50 transition-colors">
                                                        <Brain className="text-indigo-300 w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black text-white">التحدي الذكي (Quiz)</h4>
                                                        <p className="text-slate-400 text-sm font-medium mt-1">معاني الكلمات، التفسير، وأسباب النزول — أسئلة ذكية تُولّد بالذكاء الاصطناعي.</p>
                                                    </div>
                                                </div>
                                                <span className="bg-indigo-500 text-white text-xs font-black px-4 py-1.5 rounded-full border border-indigo-400 shrink-0">ابدأ ⚡</span>
                                            </div>
                                        </button>

                                        {/* SECTION: ARCADE MINI-GAMES */}
                                        <div>
                                            <div className="flex items-center gap-3 mb-6 text-slate-400 border-b border-slate-700 pb-4">
                                                <Gamepad2 size={24} className="text-purple-400" />
                                                <h3 className="font-black text-lg text-white">ألعاب الآركيد (للترفيه)</h3>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                                <GameCard
                                                    title="ترتيب الآيات"
                                                    desc="لغز بصري"
                                                    icon={<Puzzle size={24} />}
                                                    color="purple"
                                                    onClick={() => handleGameStart('ASSEMBLY')}
                                                />
                                                <GameCard
                                                    title="متزلج الكلمات"
                                                    desc="التقط الكلمات"
                                                    icon={<Waves size={24} />}
                                                    color="blue"
                                                    onClick={() => handleGameStart('SURF')}
                                                />
                                                <GameCard
                                                    title="برج الحفظ"
                                                    desc="ابنِ الكلمات"
                                                    icon={<Layers size={24} />}
                                                    color="emerald"
                                                    onClick={() => handleGameStart('STACK')}
                                                />
                                                <GameCard
                                                    title="الناجي الأخير"
                                                    desc="دافع عن القرآن"
                                                    icon={<Ghost size={24} />}
                                                    color="red"
                                                    onClick={() => handleGameStart('SURVIVOR')}
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>

            </div>
        </div>
    );
};

const GameCard: React.FC<{ title: string, desc: string, icon: React.ReactNode, color: string, onClick: () => void }> = ({ title, desc, icon, color, onClick }) => {
    const colorMap: Record<string, { border: string, text: string, hover: string }> = {
        cyan: { border: 'border-arcade-cyan', text: 'text-arcade-cyan', hover: 'hover:shadow-cyan-500/20' },
        purple: { border: 'border-arcade-purple', text: 'text-arcade-purple', hover: 'hover:shadow-purple-500/20' },
        blue: { border: 'border-blue-500', text: 'text-blue-400', hover: 'hover:shadow-blue-500/20' },
        emerald: { border: 'border-emerald-500', text: 'text-emerald-400', hover: 'hover:shadow-emerald-500/20' },
        red: { border: 'border-red-500', text: 'text-red-400', hover: 'hover:shadow-red-500/20' },
    };
    const c = colorMap[color] || colorMap.cyan;

    return (
        <button
            onClick={onClick}
            className={`bg-slate-800 border-2 ${c.border} ${c.hover} p-4 rounded-2xl text-center hover:-translate-y-1 transition-all hover:shadow-lg group flex flex-col items-center gap-3 h-full justify-between min-h-[5rem]`}
        >
            <div className={`p-2.5 rounded-xl bg-slate-900/80 ${c.text}`}>
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-white text-sm group-hover:text-white transition-colors">{title}</h4>
                <p className="text-slate-500 text-[11px]">{desc}</p>
            </div>
        </button>
    );
};
