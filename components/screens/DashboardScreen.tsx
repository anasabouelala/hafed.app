import React, { useEffect, useState } from 'react';
import { GlobalStats, SurahStats } from '../../types';
import { getGlobalStats, getSurahStats, addGoal, removeGoal } from '../../services/storageService';
import { ArcadeButton } from '../ui/ArcadeButton';
import { ArrowLeft, Activity, Flame, Medal, Scroll, Crown, Sparkles, Quote, Target, Plus, Calendar, Trash2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
    onBack: () => void;
    isPremium: boolean;
}

const QURAN_SURAHS = [
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
    "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
    "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
    "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
    "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
    "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
    "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
    "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
    "المسد", "الإخلاص", "الفلق", "الناس"
];

export const DashboardScreen: React.FC<Props> = ({ onBack, isPremium }) => {
    const [global, setGlobal] = useState<GlobalStats | null>(null);
    const [surahs, setSurahs] = useState<SurahStats[]>([]);
    const [showGoalModal, setShowGoalModal] = useState(false);

    // Goal Modal State
    const [newGoalSurah, setNewGoalSurah] = useState("");
    const [newGoalDate, setNewGoalDate] = useState("");

    const refreshData = () => {
        const stats = getGlobalStats();
        setGlobal(stats);
        const surahMap = getSurahStats();
        const surahList = Object.values(surahMap).sort((a, b) => b.lastPlayed - a.lastPlayed);
        setSurahs(surahList);
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleAddGoal = () => {
        if (!newGoalSurah) return;
        addGoal(newGoalSurah, newGoalDate);
        setShowGoalModal(false);
        refreshData();
        setNewGoalSurah("");
        setNewGoalDate("");
    };

    const handleDeleteGoal = (id: string) => {
        removeGoal(id);
        refreshData();
    };

    const getSurahMastery = (name: string) => {
        const found = surahs.find(s => s.surahName === name);
        return found ? (found.masteryLevel || 0) : 0;
    };

    if (!global) return null;

    // Data for charts
    const masteryData = [
        { name: 'متقن', value: surahs.filter(s => s.masteryLevel >= 90).length, color: '#22c55e' },
        { name: 'قيد الحفظ', value: surahs.filter(s => s.masteryLevel >= 50 && s.masteryLevel < 90).length, color: '#eab308' },
        { name: 'بدأ للتو', value: surahs.filter(s => (s.masteryLevel || 0) < 50).length, color: '#06b6d4' },
    ];

    // Calculate Progress with safety checks
    const currentLvl = global.level || 1;
    const currentLevelBaseXp = Math.pow(currentLvl - 1, 2) * 100;
    const nextLevelBaseXp = Math.pow(currentLvl, 2) * 100;
    const xp = global.totalXp || 0;
    let levelProgress = 0;

    if (nextLevelBaseXp > currentLevelBaseXp) {
        levelProgress = ((xp - currentLevelBaseXp) / (nextLevelBaseXp - currentLevelBaseXp)) * 100;
    }
    // Clamp progress
    levelProgress = Math.max(0, Math.min(100, levelProgress));
    if (isNaN(levelProgress)) levelProgress = 0;

    // Quranic verses about virtue of the Quran
    const quotes = [
        { text: "إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ", ref: "سورة الإسراء — الآية ٩" },
        { text: "وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ", ref: "سورة القمر — الآية ١٧" },
        { text: "كِتَابٌ أَنزَلْنَاهُ إِلَيْكَ مُبَارَكٌ لِّيَدَّبَّرُوا آيَاتِهِ وَلِيَتَذَكَّرَ أُولُو الْأَلْبَابِ", ref: "سورة ص — الآية ٢٩" },
        { text: "وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ", ref: "سورة الإسراء — الآية ٨٢" },
        { text: "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ", ref: "سورة الحجر — الآية ٩" },
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // Active goals (not completed)
    const activeGoals = (global.goals || []).filter(g => !g.isCompleted);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col p-4 md:p-6 overflow-hidden relative font-sans text-white" dir="rtl">
            {/* Islamic Geometric Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2306b6d4' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}>
            </div>

            {/* Glow Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-arcade-cyan/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-arcade-purple/20 rounded-full blur-[100px] pointer-events-none"></div>

            {/* --- HEADER --- */}
            <div className="relative z-10 flex items-center justify-between mb-6">
                <button onClick={onBack} className="bg-slate-800/80 p-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 border-2 border-slate-700 transition-all shadow-lg active:scale-95">
                    <ArrowLeft size={24} className="rotate-180" />
                </button>
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-arcade text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300 drop-shadow-sm">
                        لوحة البطل
                    </h1>
                    <span className="text-xs text-arcade-cyan font-arabic tracking-wide">تابع تقدمك يا بطل القرآن</span>
                </div>
                <div className="w-12"></div>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full pb-20">

                {/* --- LEFT COL: PLAYER CARD --- */}
                <div className="lg:col-span-1 flex flex-col gap-6">

                    {/* 1. RANK CARD */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-arcade-cyan/30 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group"
                    >
                        <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:animate-[shine_1.5s_infinite]"></div>

                        <div className="flex flex-col items-center relative z-10">
                            <div className="relative mb-4">
                                <div className="w-28 h-28 rounded-full border-4 border-arcade-cyan bg-slate-800 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                                    <Crown className="w-14 h-14 text-yellow-400 fill-yellow-400/20 animate-bounce-short" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full border border-slate-600">
                                    LVL {global.level}
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-1 font-arabic">{getRankTitle(global.level)}</h2>

                            {isPremium && (
                                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-3 py-1 rounded-full font-bold text-xs mb-3 shadow-[0_0_15px_rgba(251,191,36,0.3)] border border-yellow-200" title="Premium Access">
                                    <Crown size={14} className="fill-black/30 text-black" /> حساب متميز
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                                <Sparkles size={14} className="text-yellow-400" />
                                <span>{Math.floor(global.totalXp || 0)} نقطة خبرة</span>
                            </div>

                            {/* XP Bar */}
                            <div className="w-full relative">
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1 px-1">
                                    <span>المستوى {global.level}</span>
                                    <span>{Math.round(levelProgress)}%</span>
                                    <span>المستوى {(global.level || 1) + 1}</span>
                                </div>
                                <div className="h-4 bg-slate-950 rounded-full border border-slate-700 overflow-hidden shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${levelProgress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-l from-arcade-cyan via-blue-500 to-purple-600 relative"
                                    >
                                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-30"></div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. QUICK STATS */}
                    <div className="grid grid-cols-2 gap-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="bg-slate-800/80 p-4 rounded-3xl border border-slate-700 flex flex-col items-center justify-center text-center gap-2"
                        >
                            <div className="bg-orange-500/20 p-3 rounded-2xl">
                                <Flame className="w-6 h-6 text-orange-500 fill-orange-500/20" />
                            </div>
                            <div>
                                <span className="block text-2xl font-arcade text-white">{global.streakDays || 0}</span>
                                <span className="text-[10px] text-slate-400 font-bold">يوم تتابع</span>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className="bg-slate-800/80 p-4 rounded-3xl border border-slate-700 flex flex-col items-center justify-center text-center gap-2"
                        >
                            <div className="bg-purple-500/20 p-3 rounded-2xl">
                                <Scroll className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <span className="block text-2xl font-arcade text-white">{surahs.length}</span>
                                <span className="text-[10px] text-slate-400 font-bold">سورة محفوظة</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* 3. CHART CARD */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-800/80 border border-slate-700 p-6 rounded-[2rem] flex flex-col min-h-[260px]"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={18} className="text-arcade-yellow" />
                            <h3 className="font-arcade text-white text-sm">إحصائيات الإتقان</h3>
                        </div>

                        <div className="flex-1 w-full relative">
                            {surahs.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={masteryData}
                                            innerRadius={55}
                                            outerRadius={75}
                                            paddingAngle={6}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {masteryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', padding: '8px 12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'Amiri' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 opacity-60">
                                    <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-slate-500 animate-spin mb-2"></div>
                                    <span className="text-xs font-arcade">البيانات قيد التحميل...</span>
                                </div>
                            )}

                            {/* Center Metric */}
                            {surahs.length > 0 && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="block text-2xl font-bold text-white">{surahs.length}</span>
                                        <span className="text-[10px] text-slate-400 font-arcade">سورة</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap justify-center gap-3 mt-2">
                            {masteryData.map((d, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-lg">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                    <span className="text-[10px] text-slate-300 font-bold">{d.name}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* 4. MOTIVATIONAL QUOTE */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-4 rounded-2xl relative"
                    >
                        <Quote className="absolute top-2 right-2 w-4 h-4 text-emerald-500/40 rotate-180" />
                        <p className="text-center text-emerald-100 font-arabic text-sm leading-relaxed pt-2">
                            "{randomQuote.text}"
                        </p>
                        <p className="text-center text-emerald-600 text-[10px] font-bold mt-2 tracking-wide">
                            {randomQuote.ref}
                        </p>
                    </motion.div>

                </div>

                {/* --- RIGHT COL: GOALS & SURAH LIST --- */}
                <div className="lg:col-span-2 flex flex-col h-full overflow-hidden gap-6">

                    {/* --- GOALS SECTION --- */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.25 }}
                    >
                        <div className="flex justify-between items-center mb-3 px-2">
                            <h3 className="font-arcade text-white text-sm flex items-center gap-2">
                                <Target size={18} className="text-red-400" /> أهدافي الحالية
                            </h3>
                            <button
                                onClick={() => setShowGoalModal(true)}
                                className="text-arcade-cyan hover:text-white flex items-center gap-1 text-xs font-arcade bg-slate-800 px-3 py-1 rounded-full border border-slate-700 transition-colors"
                            >
                                <Plus size={14} /> هدف جديد
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeGoals.length === 0 ? (
                                <div className="col-span-2 bg-slate-800/40 border-2 border-dashed border-slate-700 rounded-2xl p-6 flex items-center justify-center text-slate-500 text-xs font-arcade">
                                    لا توجد أهداف نشطة حالياً. حدد سورة للحفظ!
                                </div>
                            ) : (
                                activeGoals.map(goal => {
                                    const progress = getSurahMastery(goal.surahName);
                                    return (
                                        <div key={goal.id} className="bg-slate-800 border border-slate-600 p-4 rounded-2xl flex items-center justify-between relative group overflow-hidden">
                                            <div className="relative z-10 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center font-bold text-lg font-arabic text-slate-300">
                                                    {goal.surahName.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white font-arabic">حفظ {goal.surahName}</h4>
                                                    {goal.targetDate && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                                                            <Calendar size={10} /> {goal.targetDate}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="relative z-10 flex items-center gap-4">
                                                <div className="text-center">
                                                    <span className="text-xs font-bold text-arcade-cyan block">{progress}%</span>
                                                    <div className="w-12 h-1.5 bg-slate-900 rounded-full mt-1">
                                                        <div className="h-full bg-arcade-cyan rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteGoal(goal.id)}
                                                    className="bg-slate-900 p-2 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Progress BG fill opacity */}
                                            <div className="absolute left-0 top-0 bottom-0 bg-arcade-cyan/5 transition-all" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>

                    {/* --- SURAH LIST --- */}
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-[2rem] p-6 flex-1 flex flex-col shadow-xl min-h-0"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-arcade text-white text-lg flex items-center gap-2">
                                <Medal className="text-arcade-yellow" /> سجل المهام
                            </h3>
                            <div className="flex gap-2">
                                <span className="bg-slate-900 px-3 py-1 rounded-full text-[10px] text-slate-400 border border-slate-700 font-bold">
                                    {surahs.length} مكتمل
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pl-2 pr-1">
                            {surahs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                                    <Scroll size={64} className="mb-4 text-slate-600" />
                                    <h4 className="text-xl font-arcade mb-2">السجل فارغ!</h4>
                                    <p className="text-sm font-arabic max-w-xs text-center">
                                        ابدأ رحلتك بحفظ أول سورة، وسجل إنجازاتك هنا لتراها تنمو.
                                    </p>
                                </div>
                            ) : (
                                surahs.map((surah, idx) => (
                                    <motion.div
                                        key={surah.surahName}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * idx }}
                                        className="bg-slate-900 border border-slate-700 hover:border-arcade-cyan/50 hover:bg-slate-800/80 p-4 rounded-2xl flex items-center justify-between group transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                        {/* Left: Icon & Name */}
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl relative overflow-hidden
                                            ${surah.stars === 3 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/40' :
                                                    surah.stars === 2 ? 'bg-slate-700 text-slate-300 border border-slate-600' :
                                                        'bg-slate-800 text-slate-500 border border-slate-700'}
                                        `}>
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/5"></div>
                                                {surah.surahName.substring(0, 2)}
                                            </div>

                                            <div>
                                                <h4 className="text-white font-arabic text-lg group-hover:text-arcade-cyan transition-colors">
                                                    سورة {surah.surahName}
                                                </h4>
                                                <div className="flex gap-1 mt-1">
                                                    {[...Array(3)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            size={14}
                                                            className={`${i < (surah.stars || 0) ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-slate-700'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Stats */}
                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">أعلى نتيجة</span>
                                                <span className="font-arcade text-arcade-cyan text-lg">{(surah.highScore || 0).toLocaleString()}</span>
                                            </div>

                                            <div className="w-28 md:w-36">
                                                <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold">
                                                    <span>نسبة الحفظ</span>
                                                    <span className={`${(surah.masteryLevel || 0) >= 90 ? 'text-green-400' : 'text-slate-300'}`}>
                                                        {Math.round(surah.masteryLevel || 0)}%
                                                    </span>
                                                </div>
                                                <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                                    <div
                                                        className={`h-full rounded-full relative overflow-hidden transition-all duration-1000
                                                        ${(surah.masteryLevel || 0) >= 90 ? 'bg-green-500' : (surah.masteryLevel || 0) >= 50 ? 'bg-yellow-500' : 'bg-blue-500'}
                                                    `}
                                                        style={{ width: `${surah.masteryLevel || 0}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* --- GOAL MODAL --- */}
            <AnimatePresence>
                {showGoalModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                            onClick={() => setShowGoalModal(false)}
                        ></motion.div>

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-800 border-2 border-arcade-cyan rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl"
                        >
                            <h2 className="text-2xl font-arcade text-white text-center mb-6">تحديد هدف جديد</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold mb-2 pr-1">السورة المستهدفة</label>
                                    <select
                                        value={newGoalSurah}
                                        onChange={(e) => setNewGoalSurah(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white font-arabic focus:border-arcade-cyan outline-none"
                                    >
                                        <option value="">اختر السورة...</option>
                                        {QURAN_SURAHS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold mb-2 pr-1">تاريخ الإنجاز (اختياري)</label>
                                    <input
                                        type="date"
                                        value={newGoalDate}
                                        onChange={(e) => setNewGoalDate(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white font-sans focus:border-arcade-cyan outline-none"
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <ArcadeButton onClick={handleAddGoal} size="lg" disabled={!newGoalSurah}>
                                        حفظ الهدف
                                    </ArcadeButton>
                                    <button
                                        onClick={() => setShowGoalModal(false)}
                                        className="bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-600 transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
          @keyframes shine {
            100% { left: 125%; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
        </div>
    );
};

// Helper for fun rank titles
const getRankTitle = (lvl: number) => {
    if (!lvl) return "مبتدئ";
    if (lvl < 2) return "مبتدئ";
    if (lvl < 5) return "قارئ ناشئ";
    if (lvl < 10) return "حافظ مثابر";
    if (lvl < 20) return "نجم القرآن";
    if (lvl < 30) return "سيد التلاوة";
    if (lvl < 50) return "أستاذ الحفاظ";
    return "شيخ القراء";
};