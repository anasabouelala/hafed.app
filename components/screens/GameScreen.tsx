
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, LevelData, PlayerStats, QuestionType, GameMode } from '../../types';
import { generateLevel } from '../../services/geminiService';
import { saveGameSession } from '../../services/storageService'; // Added
import { GameHUD } from '../game/GameHUD';
import { EchoBridge } from '../game/EchoBridge';
import { VerseAssembler } from '../game/VerseAssembler';
import { VerseSurferGame } from '../game/VerseSurferGame';
import { QuranStackGame } from '../game/QuranStackGame';
import { HifzSurvivorGame } from '../game/HifzSurvivorGame';
import { QuranMemorizer } from '../game/QuranMemorizer';
import { QuizGame } from '../game/QuizGame';
import { GameOver } from './GameOver';
import { DiagnosticScreen } from './DiagnosticScreen'; // Added
import { analyzeRecitation } from '../../services/geminiService'; // Added
import { Loader2 } from 'lucide-react';

interface Props {
  surahName: string;
  initialVerse?: number;
  endVerse?: number;
  gameMode: GameMode;
  config?: any; // Extra configuration (e.g. inputMode for Learn)
  onExit: () => void;
}

const MAX_LIVES = 3;
const TIME_BUDGET = 120;

export const GameScreen: React.FC<Props> = ({ surahName, initialVerse = 1, endVerse, gameMode, config, onExit }) => {
  const [loading, setLoading] = useState(true);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Progression System
  const [startVerse, setStartVerse] = useState(initialVerse);

  // Game State
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_BUDGET);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);

  // Continuous Bridge Mode: Background batch loading
  const [nextBatchData, setNextBatchData] = useState<LevelData | null>(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  // Gamification State
  const [feverMode, setFeverMode] = useState(false);

  // Stats
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    highScore: 0,
    streak: 0,
    maxStreak: 0,
    accuracy: 0,
    correctAnswers: 0,
    totalQuestions: 0
  });

  const isFetchingRef = React.useRef(false);
  const mountedRef = React.useRef(true); // Track if component is still mounted

  // Load Data
  const loadLevel = useCallback(async (verseOffset: number) => {
    if (isFetchingRef.current) {
      console.log('[GameScreen] Skipping duplicate loadLevel call (already fetching)');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const data = await generateLevel(surahName, verseOffset, gameMode, endVerse);

      // Only update state if component is still mounted (StrictMode cleanup protection)
      if (!mountedRef.current) {
        return;
      }

      // Check if we got valid questions. If not, we might be at end of Surah.
      if (!data || !data.questions || data.questions.length === 0) {
        console.log('[GameScreen] No questions returned - likely End of Surah');
        // If we were trying to advance (offset > initial), show completion
        if (verseOffset > initialVerse) {
          alert("🎉 أحسنت! أكملت السورة (أو النطاق المحدد).");
          onExit(); // Go back to menu
        } else {
          // Failed on first load?
          console.error("Failed to load level data on first try");
          onExit();
        }
        return;
      }

      setLevelData(data);
      setCurrentQuestionIdx(0);
      setGameState(GameState.PLAYING);
      // Reset timer
      setTimeLeft(TIME_BUDGET);
      setStats(prev => ({ ...prev, totalQuestions: prev.totalQuestions + (data.questions.length || 0) }));
    } catch (e) {
      console.error("❌ Level Load Failed:", e);
      // If we differ from start, assume we finished
      if (verseOffset > initialVerse) {
        alert("🎉 أحسنت! أكملت السورة.");
        onExit();
      } else {
        alert("حدث خطأ أثناء تحميل اللعبة. يرجى المحاولة لاحقاً.");
        onExit();
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [surahName, gameMode, endVerse]);

  // Initial Load & Prop Sync
  useEffect(() => {
    mountedRef.current = true; // Mark as mounted
    setStartVerse(initialVerse); // Force sync if prop changes
    loadLevel(initialVerse);

    // Cleanup: on StrictMode unmount or real unmount, cancel pending work
    return () => {
      mountedRef.current = false;
    };
  }, [loadLevel, initialVerse, surahName]);

  // Background Batch Preloading for Continuous Bridge Mode
  const loadNextBatchInBackground = useCallback(async () => {
    if (isLoadingNext || !levelData || gameMode !== 'CLASSIC') return;

    const nextStartVerse = startVerse + levelData.questions.length;

    // Don't load if we'd exceed endVerse
    if (endVerse && nextStartVerse > endVerse) return;

    setIsLoadingNext(true);
    try {
      const nextData = await generateLevel(surahName, nextStartVerse, gameMode, endVerse);
      if (nextData && nextData.questions.length > 0) {
        setNextBatchData(nextData);
      }
    } catch (error) {
      console.warn('Failed to preload next batch:', error);
    }
    setIsLoadingNext(false);
  }, [isLoadingNext, levelData, gameMode, startVerse, endVerse, surahName]);

  const continueToNextBatch = useCallback(() => {
    if (!nextBatchData) {
      // No more verses available - Victory!
      endGame(true);
      return;
    }

    // Seamlessly switch to preloaded data
    setLevelData(nextBatchData);
    setStartVerse(prev => prev + (levelData?.questions.length || 0));
    setCurrentQuestionIdx(0);
    setNextBatchData(null);

    // Immediately start loading the NEXT batch
    setTimeout(() => loadNextBatchInBackground(), 100);
  }, [nextBatchData, levelData, loadNextBatchInBackground]);

  // Timer (Only for classic/assembly, Surfer/Stack/Survivor/Learn handle their own loop/time)
  useEffect(() => {
    if (gameState !== GameState.PLAYING || gameMode === 'SURF' || gameMode === 'STACK' || gameMode === 'SURVIVOR' || gameMode === 'LEARN') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          handleAnswer(false);
          return 5; // Penalty pause
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, gameMode]);


  // Handle Fever Mode
  useEffect(() => {
    if (streak >= 3) {
      setFeverMode(true);
    } else {
      setFeverMode(false);
    }
  }, [streak]);

  const handleAnswer = useCallback((isCorrect: boolean, overrideScore?: number) => {
    if (gameState !== GameState.PLAYING) return;

    if (isCorrect) {
      // Calculate Score
      const basePoints = 200; // Higher base for this mode
      const streakBonus = streak * 30;
      const feverMultiplier = feverMode ? 2 : 1;

      // If the game component provides a specific score (e.g. Surf/Stack), use it
      // Otherwise calculate based on generic formula
      const points = overrideScore !== undefined ? overrideScore : ((basePoints + streakBonus) * feverMultiplier);

      setScore(s => s + points);
      setStreak(s => s + 1);
      setStats(s => ({
        ...s,
        correctAnswers: s.correctAnswers + 1,
        maxStreak: Math.max(s.maxStreak, streak + 1)
      }));

      // ========== CONTINUOUS PLAY (BRIDGE & STACK) ==========
      // SURF is now Batched (3-4 verses), so it exits this infinite loop to trigger Level Complete
      if ((gameMode === 'CLASSIC' || gameMode === 'STACK' || gameMode === 'SURVIVOR') && levelData) {
        const currentVerse = levelData.questions[currentQuestionIdx].verseNumber;

        // Check if we've reached the endVerse limit
        if (endVerse && currentVerse >= endVerse) {
          endGame(true); // Victory - Range completed!
          return;
        }

        // Advance to next question
        if (currentQuestionIdx < levelData.questions.length - 1) {
          setCurrentQuestionIdx(prev => prev + 1);

          // PRE-LOAD NEXT BATCH when approaching end (2 questions before end)
          if (currentQuestionIdx === levelData.questions.length - 2) {
            loadNextBatchInBackground();
          }
        } else {
          // Reached end of current batch - seamlessly continue
          continueToNextBatch();
        }
      }
      // ========== OTHER GAME MODES (Assembly, SURF, etc.) ==========
      else if (gameMode !== 'STACK' && gameMode !== 'SURVIVOR' && gameMode !== 'LEARN') {
        if (currentQuestionIdx < (levelData?.questions.length || 0) - 1) {
          // Check if we reached the end verse within this batch (edge case)
          const nextVerseInBatch = levelData!.questions[currentQuestionIdx + 1].verseNumber;
          if (endVerse && nextVerseInBatch > endVerse) {
            handleLevelComplete();
            return;
          }
          setCurrentQuestionIdx(prev => prev + 1);
        } else {
          handleLevelComplete();
        }
      }

    } else {
      // FAILURE
      // For SURF mode, failure means "Out of Lives" (3 mistakes made internally), so End Game immediately
      if (gameMode === 'SURF') {
        endGame(false);
        return;
      }

      setLives(l => l - 1);
      setStreak(0);
      if (lives - 1 <= 0) {
        endGame(false); // Game Over - Out of lives
      }
      // If player still has lives, they continue playing (component handles retry)
    }
  }, [gameState, streak, lives, currentQuestionIdx, levelData, feverMode, endVerse, gameMode, loadNextBatchInBackground, continueToNextBatch]);

  const handleLevelComplete = useCallback(() => {
    setScore(s => s + 1500); // Level completion bonus

    // Check if we should stop because of endVerse range
    const questionsCount = levelData?.questions.length || 0;
    const nextStart = startVerse + questionsCount;

    if (endVerse && nextStart > endVerse) {
      endGame(true); // Victory - Range Completed
    } else {
      // Continue to next batch?
      endGame(true);
    }
  }, [startVerse, levelData, endVerse]);

  // Analysis State
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null); // Type DiagnosticResult

  const endGame = async (victory: boolean, transcript?: string, overrideScore?: number) => {
    // Stop timer
    setGameState(victory ? GameState.VICTORY : GameState.GAME_OVER);

    // If override score provided (e.g. from Memorizer), add it to current score
    let finalScore = score;
    if (overrideScore) {
      finalScore += overrideScore;
      setScore(finalScore);
    }

    // Save to Persistent Storage
    const totalQs = stats.totalQuestions || 1;
    const finalAccuracy = victory ? 100 : Math.round((stats.correctAnswers / totalQs) * 100);

    // Calculate Verses Played (Mastered)
    let versesPlayed: number[] = [];
    if (levelData) {
      if (victory) {
        // Victory means we mastered the set presented
        versesPlayed = levelData.questions.map(q => q.verseNumber);
      } else {
        // Partial completion (sequential modes)
        // For randomly access modes this might be inaccurate, but for linear progression it works
        versesPlayed = levelData.questions.slice(0, currentQuestionIdx).map(q => q.verseNumber);
      }
    }

    // Ensure uniqueness just in case
    versesPlayed = Array.from(new Set(versesPlayed));

    saveGameSession(surahName, finalScore, finalAccuracy, victory, versesPlayed);

    // Update UI Stats for GameOver Screen
    setStats(s => ({
      ...s,
      score: finalScore,
      // For LEARN mode or generally on victory, ensure we show full bars if we didn't track granularly
      correctAnswers: victory ? s.totalQuestions : s.correctAnswers,
      accuracy: finalAccuracy
    }));

    // [ANALYSIS REMOVED] - User requested functional game over screen instead of prompt analysis
    if (gameMode === 'LEARN') {
      console.log("[GAME END] Learn mode finished. Showing standard results.");
    }
  };

  // Handle Early Exit (Save Progress)
  const handleGameExit = () => {
    if (score > 0) {
      // Estimate partial accuracy
      const attempted = Math.max(1, currentQuestionIdx + 1);
      const acc = Math.min(100, Math.round((stats.correctAnswers / attempted) * 100));

      // Calculate verses played so far
      let versesPlayed: number[] = [];
      if (levelData) {
        versesPlayed = levelData.questions.slice(0, currentQuestionIdx).map(q => q.verseNumber);
      }
      versesPlayed = Array.from(new Set(versesPlayed));

      saveGameSession(surahName, score, acc, false, versesPlayed);
    }
    onExit();
  };

  const handleNextLevel = () => {
    const nextOffset = startVerse + (levelData?.questions.length || 3);

    if (endVerse && nextOffset > endVerse) {
      return;
    }
    setStartVerse(nextOffset);
    // Reset Diagnostic State
    setDiagnosticResult(null);
    setGameState(GameState.PLAYING);

    // Explicitly fetch the next level data
    loadLevel(nextOffset);
  };

  const handleRestart = () => {
    setScore(0);
    setLives(MAX_LIVES);
    setStreak(0);
    setTimeLeft(TIME_BUDGET);
    setStats({
      score: 0,
      highScore: 0,
      streak: 0,
      maxStreak: 0,
      accuracy: 0,
      correctAnswers: 0,
      totalQuestions: 0
    });
    loadLevel(initialVerse);
  };

  const getLoadingMessage = () => {
    switch (gameMode) {
      case 'QUIZ': return 'جاري تحضير الأسئلة...';
      case 'ASSEMBLY': return 'جاري تحضير لعبة الترتيب...';
      case 'SURF': return 'جاري تحضير التزلج...';
      case 'STACK': return 'جاري بناء البرج...';
      case 'SURVIVOR': return 'جاري تحضير تحدي الصمود...';
      case 'LEARN': return 'جاري تحضير جلسة الحفظ...';
      default: return 'جاري التحميل...';
    }
  };

  if (loading || !levelData) {
    return (
      <div className="fixed inset-0 bg-slate-900 bg-ambient flex flex-col items-center justify-center text-white z-50">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-arcade-cyan" />
          <div className="absolute inset-0 rounded-full bg-arcade-cyan/10 animate-ping" />
        </div>
        <p className="font-arcade text-slate-300 mt-6 text-sm animate-shimmer">{getLoadingMessage()}</p>
        <p className="text-slate-600 text-xs mt-2 font-arcade">الآية {startVerse}</p>
      </div>
    );
  }

  if (gameState === GameState.DIAGNOSTIC && diagnosticResult) {
    return (
      <DiagnosticScreen
        targetSurah={surahName}
        startVerse={startVerse}
        endVerse={endVerse}
        initialResult={diagnosticResult}
        onDiagnosticComplete={(surah, start) => {
          // Retry or Continue logic
          handleNextLevel(); // Or restart? Let's assume continue for now.
        }}
        onBack={onExit}
      />
    );
  }

  if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
    const nextStart = startVerse + (levelData?.questions.length || 0);
    const hasMore = !endVerse || nextStart <= endVerse;

    return (
      <GameOver
        stats={stats}
        isVictory={gameState === GameState.VICTORY}
        nextStartVerse={nextStart}
        onRestart={handleRestart}
        onNextLevel={hasMore ? handleNextLevel : onExit}
        onHome={onExit}
      />
    );
  }

  const currentQuestion = levelData.questions[currentQuestionIdx];

  if (!currentQuestion) {
    return null; // Safety guard for batch transitions
  }

  if (gameMode === 'SURF') {
    return (
      <VerseSurferGame
        question={currentQuestion}
        surahName={surahName}
        onGameEnd={(victory, score) => handleAnswer(victory, score)}
        onExit={handleGameExit}
      />
    );
  }
  if (gameMode === 'STACK') {
    return (
      <QuranStackGame
        question={currentQuestion}
        surahName={surahName}
        onGameEnd={(victory) => handleAnswer(victory)}
        onExit={handleGameExit}
      />
    );
  }
  if (gameMode === 'SURVIVOR') {
    return (
      <HifzSurvivorGame
        question={currentQuestion}
        surahName={surahName}
        onGameEnd={(victory) => handleAnswer(victory)}
      />
    );
  }
  if (gameMode === 'LEARN') {
    return (
      <QuranMemorizer
        surahName={surahName}
        questions={levelData.questions}
        initialInputMode={config?.inputMode}
        onGameEnd={(v, t, s) => endGame(v, t, s)}
        onExit={handleGameExit}
      />
    );
  }

  return (
    <div className={`fixed inset-0 bg-slate-900 transition-colors duration-1000 ${feverMode ? 'bg-emerald-950' : 'bg-slate-900'} flex flex-col overflow-hidden`}>
      {/* Background */}
      <div className="absolute inset-0 bg-stardust opacity-30 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col h-full w-full max-w-5xl mx-auto p-4">
        {/* Standardized Header */}
        <div className="flex justify-between items-center mb-4 shrink-0 relative z-50">
          <button
            onClick={handleGameExit}
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/50 backdrop-blur-md border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300 shadow-lg"
            title="Exit Game"
          >
            <span className="sr-only">Exit</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-red-400 transition-colors">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <h2 className="text-white/90 font-arabic text-sm tracking-wide drop-shadow-md bg-slate-900/40 px-4 py-1 rounded-full border border-white/5 backdrop-blur-sm">
              {surahName} <span className="text-slate-500 mx-2">|</span> <span className="text-emerald-400 font-arcade text-xs">{startVerse + currentQuestionIdx}</span>
            </h2>
          </div>

          <div className="w-10"></div> {/* Spacer for balance */}
        </div>

        {/* HUD */}
        <div className="shrink-0 mb-4">
          <GameHUD
            score={score}
            lives={lives}
            streak={streak}
            timeLeft={timeLeft}
            maxTime={TIME_BUDGET}
          />
        </div>

        {/* Game Viewport */}
        <div className="flex-1 w-full relative min-h-0">
          {currentQuestion.type === QuestionType.VERSE_ASSEMBLY ? (
            <VerseAssembler
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={handleAnswer}
            />
          ) : currentQuestion.type === QuestionType.VERSE_QUIZ ? (
            <QuizGame
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={handleAnswer}
            />
          ) : (
            <EchoBridge
              key={currentQuestion.id}
              question={currentQuestion}
              feverMode={feverMode}
              onAnswer={handleAnswer}
            />
          )}
        </div>
      </div>
    </div>
  );
};
