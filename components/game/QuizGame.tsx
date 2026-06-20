
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Brain, BookOpen, ArrowLeft, Tag, Book, HelpCircle, CheckCircle } from 'lucide-react';
import { Question } from '../../types';
import { ArcadeButton } from '../ui/ArcadeButton';

interface Props {
    question: Question;
    onAnswer: (correct: boolean) => void;
}

export const QuizGame: React.FC<Props> = ({ question, onAnswer }) => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
    const [isCorrectState, setIsCorrectState] = useState(false);

    useEffect(() => {
        // Shuffle options on new question
        if (question.options) {
            setShuffledOptions([...question.options].sort(() => Math.random() - 0.5));
        }
        setSelectedOption(null);
        setIsAnswered(false);
        setIsCorrectState(false);
    }, [question]);

    const handleOptionClick = (option: string) => {
        if (isAnswered) return; // Prevent changing answer

        setSelectedOption(option);
        setIsAnswered(true);

        const correct = option === question.correctAnswer;
        setIsCorrectState(correct);
    };

    const handleNext = () => {
        // Trigger parent handler to move to next question
        // We pass the result for scoring, but the game logic will move next regardless
        onAnswer(isCorrectState);
    };

    const getCategoryLabel = (type?: string) => {
        switch (type) {
            case 'VOCABULARY': return { label: 'معاني الكلمات', icon: <Tag size={16} />, color: 'text-blue-400 bg-blue-900/20' };
            case 'TAFSEER': return { label: 'التفسير العام', icon: <BookOpen size={16} />, color: 'text-emerald-400 bg-emerald-900/20' };
            case 'ASBAB': return { label: 'سبب النزول', icon: <Book size={16} />, color: 'text-amber-400 bg-amber-900/20' };
            case 'THEME': return { label: 'هدايات الآيات', icon: <Brain size={16} />, color: 'text-purple-400 bg-purple-900/20' };
            case 'PRECISION': return { label: 'ضبط اللفظ', icon: <CheckCircle size={16} />, color: 'text-orange-400 bg-orange-900/20' };
            default: return { label: 'اختبار شامل', icon: <HelpCircle size={16} />, color: 'text-slate-400 bg-slate-900/20' };
        }
    };

    const catInfo = getCategoryLabel(question.quizSubType);

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-start p-4 md:p-6 h-full overflow-hidden">

            {/* Premium Header */}
            <div className="w-full flex justify-between items-center mb-6 bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shrink-0 shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className={`p-3 rounded-xl ${catInfo.color} shadow-inner ring-1 ring-white/10`}>
                        {catInfo.icon}
                    </div>
                    <div>
                        <h3 className="text-white font-arcade text-sm tracking-widest uppercase opacity-90">{catInfo.label}</h3>
                        <p className="text-slate-400 text-xs mt-0.5 font-medium">{question.verseNumber ? `الآية ${question.verseNumber}` : 'سؤال عام'}</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/50 border border-slate-800 text-[10px] text-slate-500 font-mono tracking-tight shadow-inner">
                    <Book size={10} />
                    <span>TAFSEER: AL-SA'DI</span>
                </div>
            </div>

            {/* Main Game Surface */}
            <div className="w-full flex flex-col lg:flex-row gap-8 h-full min-h-0 relative">

                {/* Question Area */}
                <div className="flex-1 flex flex-col gap-4 min-h-0 z-10">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        key={question.id}
                        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 p-5 md:p-6 rounded-[2rem] relative overflow-hidden shadow-2xl shrink-0 group ring-1 ring-white/5"
                    >
                        {/* Subtle Background Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] mix-blend-overlay pointer-events-none" />

                        <div className="relative z-10">
                            <span className="inline-block px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-arcade text-cyan-400 mb-4 border border-cyan-500/20 tracking-wider shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                                {question.quizSubType === 'SCENARIO' ? 'SCENARIO MODE' :
                                    question.quizSubType === 'PUZZLE' ? 'PUZZLE MODE' : 'QUESTION'}
                            </span>

                            <h2 className="text-lg md:text-2xl font-arabic text-white leading-[1.7] mb-4 rtl-text drop-shadow-md text-balance">
                                {question.prompt}
                            </h2>

                            {/* Dynamic Verse/Content Display */}
                            <AnimatePresence mode='wait'>
                                {question.quizSubType === 'PUZZLE' && question.emojis ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800/50 text-center shadow-inner"
                                    >
                                        <p className="text-5xl md:text-7xl tracking-[0.5em] drop-shadow-2xl filter saturate-150">
                                            {question.emojis}
                                        </p>
                                    </motion.div>
                                ) : !['SCENARIO', 'PUZZLE', 'CONNECTION', 'ORDER'].includes(question.quizSubType || '') ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 text-center backdrop-blur-sm"
                                    >
                                        <p className="font-arabic text-xl md:text-2xl text-emerald-100/90 rtl-text leading-loose">
                                            "{question.arabicText}"
                                        </p>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Options Grid — fills remaining space and scrolls within bounds so options stay visible */}
                    <div className={`grid gap-3 w-full flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-4 pr-2 ${question.quizSubType === 'CONNECTION' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                        {shuffledOptions.map((option, idx) => {
                            const isSelected = selectedOption === option;
                            const isCorrect = option === question.correctAnswer;
                            const optionLetters = ['أ', 'ب', 'ج', 'د'];

                            // Advanced State Styling
                            let cardStyle = "bg-slate-800/40 border-white/5 hover:bg-slate-800/60 hover:border-white/20 hover:scale-[1.01] hover:shadow-lg";
                            let textStyle = "text-slate-200";

                            if (isAnswered) {
                                if (isCorrect) {
                                    cardStyle = "bg-green-900/20 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)] ring-1 ring-green-500/30";
                                    textStyle = "text-green-100";
                                } else if (isSelected && !isCorrect) {
                                    cardStyle = "bg-red-900/20 border-red-500/50 opacity-60";
                                    textStyle = "text-red-200";
                                } else {
                                    cardStyle = "bg-slate-900/20 border-transparent opacity-30 grayscale";
                                }
                            }

                            return (
                                <motion.button
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                                    onClick={() => handleOptionClick(option)}
                                    disabled={isAnswered}
                                    className={`
                                        relative w-full p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 group
                                        flex items-center justify-between min-h-[56px] text-right
                                        ${cardStyle}
                                    `}
                                >
                                    {/* Selection Ring */}
                                    {isSelected && <motion.div layoutId="outline" className="absolute inset-0 border-2 border-cyan-400/30 rounded-2xl z-20" />}

                                    <span className={`relative z-10 w-full text-lg md:text-xl font-arabic leading-relaxed ${textStyle} group-hover:text-white transition-colors`}>
                                        {option}
                                    </span>

                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/30 border border-white/5 flex items-center justify-center text-xs font-arcade text-slate-500 group-hover:text-white group-hover:border-white/20 transition-all">
                                        {optionLetters[idx]}
                                    </div>

                                    {/* Status Icons */}
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2">
                                        {isAnswered && isCorrect && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                <CheckCircle2 className="w-6 h-6 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                            </motion.div>
                                        )}
                                        {isAnswered && isSelected && !isCorrect && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                <XCircle className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Intelligent Slide-Over Panel for Result */}
                <AnimatePresence>
                    {isAnswered && (
                        <motion.div
                            initial={{ opacity: 0, x: 50, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="hidden lg:flex flex-col w-[380px] shrink-0 z-0 pl-2"
                        >
                            <div className={`
                                h-full p-6 rounded-[2rem] border backdrop-blur-xl flex flex-col shadow-2xl relative overflow-hidden
                                ${isCorrectState
                                    ? 'bg-gradient-to-b from-green-950/40 to-slate-950/40 border-green-500/20'
                                    : 'bg-gradient-to-b from-slate-900/60 to-slate-950/60 border-slate-700/50'}
                            `}>
                                {/* Decorative Glow */}
                                <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] ${isCorrectState ? 'bg-green-500/20' : 'bg-blue-500/10'}`} />

                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <div className={`p-2 rounded-full ${isCorrectState ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/30 text-slate-400'}`}>
                                        <BookOpen size={20} />
                                    </div>
                                    <h4 className={`font-arcade text-sm uppercase tracking-wider ${isCorrectState ? 'text-green-400' : 'text-slate-300'}`}>
                                        {isCorrectState ? 'Correct Insight' : 'Review & Learn'}
                                    </h4>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
                                    <p className="font-arabic text-xl leading-[2.2] text-slate-100 rtl-text text-right drop-shadow-sm">
                                        {question.explanation || "No explanation available for this verse."}
                                    </p>

                                    <div className="mt-8 pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-semibold opacity-70">
                                            <Book size={12} />
                                            <span>Source: Tafseer As-Sa'di</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 relative z-10">
                                    <ArcadeButton
                                        onClick={handleNext}
                                        size="lg"
                                        variant={isCorrectState ? 'success' : 'primary'}
                                        className="w-full flex items-center justify-center gap-3 py-4 shadow-lg active:scale-95 transition-transform"
                                    >
                                        <span>Next Challenge</span>
                                        <ArrowLeft size={18} />
                                    </ArcadeButton>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mobile Result Sheet (Fixed Bottom) */}
                <AnimatePresence>
                    {isAnswered && (
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                        >
                            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6 opacity-50" />

                            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className={`w-4 h-4 ${isCorrectState ? 'text-green-400' : 'text-slate-400'}`} />
                                    <span className={`text-xs font-arcade uppercase ${isCorrectState ? 'text-green-400' : 'text-slate-400'}`}>
                                        {isCorrectState ? 'Insight' : 'Explanation'}
                                    </span>
                                </div>
                                <p className="font-arabic text-lg leading-loose text-white rtl-text text-right">
                                    {question.explanation}
                                </p>
                            </div>

                            <ArcadeButton
                                onClick={handleNext}
                                size="lg"
                                variant={isCorrectState ? 'success' : 'primary'}
                                className="w-full justify-center"
                            >
                                Next Level <ArrowLeft size={20} className="ml-2" />
                            </ArcadeButton>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};
