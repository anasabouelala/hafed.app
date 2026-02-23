import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Heart, Zap, ChevronUp, AlertCircle, Trophy, Star, Gauge } from 'lucide-react';
import { Question, PlayerStats } from '../../types';
import { ArcadeButton } from '../ui/ArcadeButton';

interface Props {
    surahName: string;
    question: Question;
    onGameEnd: (victory: boolean, score?: number) => void;
    onExit: () => void;
}

interface GameItem {
    id: string;
    text: string;
    lane: number; // 0, 1, 2
    y: number;
    isCorrect: boolean;
    spawnTime: number;
}

export const VerseSurferGame: React.FC<Props> = ({ surahName, question, onGameEnd, onExit }) => {
    // Game State (React for UI)
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const scoreRef = useRef(0); // Ref for loop access
    const [lives, setLives] = useState(3);
    const [combo, setCombo] = useState(0);
    const [feedback, setFeedback] = useState<{ text: string, color: string, id: number } | null>(null);

    // Game Loop State (Refs for performance)
    const reqRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const playerLaneRef = useRef<number>(1); // Start middle (0, 1, 2)
    const itemsRef = useRef<GameItem[]>([]);
    const speedRef = useRef<number>(150); // Base Pixels per second
    const nextSpawnTimeRef = useRef<number>(0);
    const wordIndexRef = useRef<number>(0); // Current target word index
    const [forceUpdate, setForceUpdate] = useState(0); // Trigger render for canvas-like updates
    const livesRef = useRef(3); // Ref for logic to avoid stale closures

    // Speed Control
    const speedFactorRef = useRef<number>(1);
    const [speedFactor, setSpeedFactor] = useState(1);

    // Feedback helper
    const showFeedback = (text: string, color: string) => {
        setFeedback({ text, color, id: Date.now() });
        setTimeout(() => setFeedback(null), 1000);
    };

    // Derived Data
    // Derived Data (Use refs to prevent stale closure)
    const wordsRef = useRef<string[]>([]);
    const distractorsRef = useRef<string[]>([]);

    // Update refs when question changes
    const onGameEndRef = useRef(onGameEnd);
    useEffect(() => {
        onGameEndRef.current = onGameEnd;
    }, [onGameEnd]);

    useEffect(() => {
        const newWords = question.surferData?.words || [];
        const newDistractors = question.surferData?.distractors || ["خطأ", "انتبه"];

        wordsRef.current = newWords;
        distractorsRef.current = newDistractors;

        // If already playing, just reset word index for the new verse!
        if (isPlaying) {
            wordIndexRef.current = 0;
            // Optional: Increase speed slightly for new verse
            speedRef.current += 10;
            showFeedback(`الآية ${question.verseNumber}`, "text-arcade-yellow");
        }
    }, [question]);

    const targetWords = wordsRef.current; // access via ref inside loop usually, but for render verify usage

    // --- CONTROLS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying || isGameOver) return;
            if (e.key === 'ArrowLeft') {
                playerLaneRef.current = Math.min(2, playerLaneRef.current + 1); // RTL: Left moves index up visually (right side)
            } else if (e.key === 'ArrowRight') {
                playerLaneRef.current = Math.max(0, playerLaneRef.current - 1); // RTL
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, isGameOver]);

    const handleLaneClick = (lane: number) => {
        if (!isPlaying || isGameOver) return;
        playerLaneRef.current = lane;
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setSpeedFactor(val);
        speedFactorRef.current = val;
    };

    // --- GAME LOOP ---
    const startGame = () => {
        setIsPlaying(true);
        setIsGameOver(false);
        setScore(0);
        scoreRef.current = 0;
        setLives(3);
        livesRef.current = 3; // Reset ref
        setCombo(0);
        itemsRef.current = [];
        wordIndexRef.current = 0;
        speedRef.current = 200; // Starting speed
        lastTimeRef.current = performance.now();

        // Start Loop
        reqRef.current = requestAnimationFrame(gameLoop);
    };

    const gameLoop = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const delta = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        updateGame(delta, time);

        // Loop condition: Continue if alive. 
        // If wordIndex finished, we wait for next verse (props update via onGameEnd)
        if (livesRef.current > 0) {
            setForceUpdate(prev => prev + 1); // Render frame
            reqRef.current = requestAnimationFrame(gameLoop);
        } else {
            handleGameOver();
        }
    };

    const updateGame = (delta: number, time: number) => {
        // 1. Spawn Items
        // 1. Spawn Items
        if (time > nextSpawnTimeRef.current) {
            // Only spawn if we have words left in current verse
            if (wordIndexRef.current < wordsRef.current.length) {
                spawnItem();
                // Difficulty scaling
                // Scale interval based on CURRENT SPEED to keep density constant!
                const baseSpeed = 200;
                const speedRatio = speedRef.current / baseSpeed;

                const baseInterval = Math.max(400, 2000 - (wordIndexRef.current * 30));
                const adjustedInterval = (baseInterval / speedFactorRef.current) / speedRatio;

                nextSpawnTimeRef.current = time + adjustedInterval;
            } else {
                // Verse Completed! Wait for next verse data
                // Trigger callback ONCE to load next
                // We can check if we just finished
                if (wordIndexRef.current === wordsRef.current.length) {
                    // Prevent spamming
                    wordIndexRef.current += 1; // Mark as 'handled'
                    onGameEndRef.current(true, scoreRef.current); // Load Next Verse
                }
            }
        }

        // 2. Move Items & Collision
        const newItems: GameItem[] = [];
        const playerY = 85; // Percentage from top
        const hitBox = 5; // Tolerance

        itemsRef.current.forEach(item => {
            // Apply Base Speed * User Speed Factor
            const currentEffectiveSpeed = speedRef.current * speedFactorRef.current;
            item.y += (currentEffectiveSpeed * delta) / 10; // Convert px speed to % approximate

            // Collision Check
            if (item.y > playerY - hitBox && item.y < playerY + hitBox) {
                if (item.lane === playerLaneRef.current) {
                    // HIT
                    handleCollision(item);
                    return; // Remove item
                }
            }

            // Out of bounds check
            if (item.y > 100) {
                if (item.isCorrect) {
                    // Missed the correct word!
                    handleMiss();
                }
                return; // Remove item
            }

            newItems.push(item);
        });

        itemsRef.current = newItems;
    };

    const spawnItem = () => {
        // Logic: If the correct word isn't on screen, we MUST spawn it soon.
        // Otherwise, spawn distractors.

        const correctWordOnScreen = itemsRef.current.some(i => i.isCorrect);

        // Safety check
        if (wordIndexRef.current >= wordsRef.current.length) return;

        const targetWord = wordsRef.current[wordIndexRef.current];

        let newItem: GameItem;
        const lane = Math.floor(Math.random() * 3);

        if (!correctWordOnScreen) {
            // Spawn Correct
            newItem = {
                id: Math.random().toString(),
                text: targetWord,
                lane: lane,
                y: -10,
                isCorrect: true,
                spawnTime: Date.now()
            };
        } else {
            // Spawn Distractor
            const currentDistractors = distractorsRef.current;
            const randomDistractor = currentDistractors[Math.floor(Math.random() * currentDistractors.length)];
            // Ensure we don't spawn on top of existing items at top
            const occupiedLanes = itemsRef.current.filter(i => i.y < 10).map(i => i.lane);
            let safeLane = lane;
            while (occupiedLanes.includes(safeLane)) {
                safeLane = (safeLane + 1) % 3;
                if (safeLane === lane) break; // All lanes full, skip spawn
            }

            newItem = {
                id: Math.random().toString(),
                text: randomDistractor,
                lane: safeLane,
                y: -10,
                isCorrect: false,
                spawnTime: Date.now()
            };
        }

        itemsRef.current.push(newItem);
    };

    const handleCollision = (item: GameItem) => {
        if (item.isCorrect) {
            // Correct!
            const points = 100 + (combo * 10);
            setScore(s => s + points);
            scoreRef.current += points;

            setCombo(c => c + 1);
            wordIndexRef.current += 1;
            speedRef.current += 30; // Speed up base speed significantly per word
            showFeedback("ممتاز!", "text-green-400");

            if (wordIndexRef.current >= wordsRef.current.length) {
                // Level Complete handled in spawn loop
            }
        } else {
            // Wrong!
            setLives(l => l - 1);
            livesRef.current -= 1; // Update logical state
            setCombo(0);
            showFeedback("خطأ!", "text-red-500");

            // Check implicit game over immediately
            if (livesRef.current <= 0) {
                // We don't wait for next loop, we can trigger end immediately if we want, 
                // but usually loop handles it. loop will see livesRef <= 0 and call handleGameOver.
            }
        }
    };

    const handleMiss = () => {
        // Missed the correct word -> Rewind logic (it essentially respawns because wordIndex didn't increment)
        setCombo(0);
        showFeedback("فاتتك!", "text-yellow-500");
        // Optional: Penalty score or lives? Let's just reset combo for "Miss" to be forgiving
    };

    const handleGameOver = () => {
        setIsPlaying(false);
        setIsGameOver(true);
        cancelAnimationFrame(reqRef.current);
        if (livesRef.current > 0) {
            onGameEndRef.current(true, scoreRef.current); // Victory if we finished words
        } else {
            onGameEndRef.current(false, scoreRef.current); // Game Over
        }
    };



    // --- RENDER HELPERS ---
    const lanes = [0, 1, 2];

    // START SCREEN
    if (!isPlaying && !isGameOver) {
        return (
            <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-6 text-center">
                {/* --- EXIT BUTTON (START SCREEN) --- */}
                <button
                    onClick={onExit}
                    className="absolute top-6 left-6 group flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/50 backdrop-blur-md border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300 shadow-lg"
                    title="Exit Game"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-red-400 transition-colors">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                </button>

                <div className="w-24 h-24 rounded-full bg-arcade-cyan/20 flex items-center justify-center mb-6 animate-pulse">
                    <ChevronUp className="w-12 h-12 text-arcade-cyan" />
                </div>
                <h1 className="text-4xl font-arcade text-white mb-2">متزلج الآيات</h1>
                <p className="text-slate-400 mb-8 max-w-md">التقط كلمات سورة <span className="text-arcade-yellow">{surahName}</span> بالترتيب الصحيح. تجنب الكلمات الخاطئة!</p>

                <div className="grid grid-cols-2 gap-4 mb-8 text-sm text-slate-300">
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <span className="block text-arcade-cyan font-bold mb-1">التحكم</span>
                        اضغط على المسارات أو الأسهم
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <span className="block text-red-400 font-bold mb-1">تحذير</span>
                        الكلمات متشابهة، ركّز جيداً!
                    </div>
                </div>

                <ArcadeButton onClick={startGame} size="lg" className="animate-bounce-short">
                    انطلق
                </ArcadeButton>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900 overflow-hidden flex flex-col font-sans">

            {/* --- HUD --- */}
            <div className="absolute top-0 left-0 w-full p-4 z-40 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-arcade-yellow" />
                        <span className="text-2xl font-arcade text-white">{score}</span>
                    </div>
                    {combo > 1 && (
                        <div className="text-arcade-cyan font-arcade text-xs animate-pulse">
                            COMBO x{combo}
                        </div>
                    )}
                </div>

                <div className="bg-slate-900/80 backdrop-blur px-6 py-2 rounded-full border border-slate-600">
                    <span className="text-white font-arabic text-lg">{surahName} - الآية {question.verseNumber}</span>
                </div>

                <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                        <Heart
                            key={i}
                            className={`w-6 h-6 ${i < lives ? 'fill-red-500 text-red-500' : 'text-slate-700'}`}
                        />
                    ))}
                </div>
            </div>

            {/* --- SPEED CONTROL --- */}
            <div className="absolute top-20 right-4 z-50 flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-600 backdrop-blur">
                <Gauge size={16} className="text-arcade-cyan" />
                <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={speedFactor}
                    onChange={handleSpeedChange}
                    className="w-24 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-arcade-cyan"
                />
                <span className="text-xs font-mono w-8 text-center">{speedFactor}x</span>
            </div>

            {/* --- EXIT BUTTON --- */}
            <button
                onClick={onExit}
                className="absolute top-20 left-4 z-50 group flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-600 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300 shadow-lg"
                title="Exit Game"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-red-400 transition-colors">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
            </button>
            {/* --- GAME WORLD --- */}
            <div className="relative flex-1 w-full max-w-2xl mx-auto border-x-2 border-slate-800 bg-slate-900 perspective-1000 overflow-hidden">

                {/* Moving Grid Floor Effect */}
                <div className="absolute inset-0 z-0 opacity-20">
                    <div
                        className="absolute inset-0 bg-[linear-gradient(transparent_95%,#06b6d4_95%)] bg-[size:100%_40px] animate-[slideDown_1s_linear_infinite]"
                        style={{ animationDuration: `${1 / speedFactor}s` }} // Sync grid visual speed
                    ></div>
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_95%,#06b6d4_95%)] bg-[size:33.33%_100%]"></div>
                </div>

                {/* Lanes Click Area */}
                <div className="absolute inset-0 z-10 grid grid-cols-3 h-full">
                    {lanes.map(lane => (
                        <div
                            key={lane}
                            onClick={() => handleLaneClick(lane)}
                            className="h-full border-r border-white/5 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10"
                        ></div>
                    ))}
                </div>

                {/* Player Character */}
                <div
                    className="absolute bottom-[10%] w-[33.33%] h-20 z-20 transition-all duration-200 ease-out flex justify-center items-end pb-4"
                    style={{ right: `${playerLaneRef.current * 33.33}%` }} // RTL logic: index 0 is rightmost
                >
                    <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-t from-arcade-cyan to-blue-500 rounded-xl shadow-[0_0_30px_#06b6d4] border-2 border-white flex items-center justify-center transform rotate-45">
                            <ChevronUp className="w-8 h-8 text-white -rotate-45" />
                        </div>
                        {/* Engine trail */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-8 h-20 bg-gradient-to-b from-arcade-cyan to-transparent opacity-50 blur-sm"></div>
                    </div>
                </div>

                {/* Falling Items */}
                <AnimatePresence>
                    {itemsRef.current.map(item => (
                        <div
                            key={item.id}
                            className="absolute w-[33.33%] h-24 z-20 flex justify-center items-center px-2"
                            style={{
                                top: `${item.y}%`,
                                right: `${item.lane * 33.33}%` // RTL
                            }}
                        >
                            <div className="w-full h-full bg-slate-800/90 border-2 border-arcade-cyan/50 rounded-lg shadow-lg flex items-center justify-center text-center p-1 backdrop-blur-sm">
                                <span className="text-white font-arabic text-xl md:text-2xl drop-shadow-md select-none">
                                    {item.text}
                                </span>
                            </div>
                        </div>
                    ))}
                </AnimatePresence>

                {/* Feedback Float */}
                <AnimatePresence>
                    {feedback && (
                        <motion.div
                            key={feedback.id}
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: -100, scale: 1.5 }}
                            exit={{ opacity: 0 }}
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 font-arcade text-4xl font-bold ${feedback.color} drop-shadow-lg`}
                        >
                            {feedback.text}
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

        </div >
    );
};
