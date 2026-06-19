
import { LevelData, QuestionType, DiagnosticResult, GameMode } from "../types";
import { TAHA_QUIZ_DATA } from "../components/data/surahTahaQuestions";

// --- Configuration ---
// AI is powered by DeepSeek behind the /api/gemini proxy (see api/gemini.ts and
// server/index.js). The API key lives only on the server, so it is never shipped to
// the browser — in dev Vite proxies /api -> http://localhost:3001, in prod it's the
// Vercel serverless function.

const getApiKey = (): string => {
    // 'SERVER_MANAGED' signals "use the proxy" in both dev and prod.
    return 'SERVER_MANAGED';
};

// --- DATA: Surah Mapping for Public API ---
const SURAH_LIST = [
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

const getSurahNumber = (name: string): number => {
    const index = SURAH_LIST.findIndex(s => s === name || name.includes(s));
    return index !== -1 ? index + 1 : 1;
};

// --- MODEL FALLBACK STRATEGY (Shared) ---
// DeepSeek serves our needs from a single chat model. The proxy picks the concrete
// model via the DEEPSEEK_MODEL env var; this list just drives the retry loop.
const MODELS_TO_TRY = [
    "deepseek-chat"
];

// --- PER-MODEL RATE LIMIT TRACKING ---
// Free tier quota is PER-MODEL (e.g. 20 req/day for gemini-2.5-flash).
// So if one model hits 429, we skip it and try the next model (which has its own quota).
const exhaustedModels: Map<string, number> = new Map(); // model -> timestamp when it was exhausted

function isModelExhausted(modelName: string): boolean {
    const until = exhaustedModels.get(modelName);
    if (!until) return false;
    if (Date.now() > until) {
        exhaustedModels.delete(modelName); // Expired, allow retry
        return false;
    }
    return true;
}

function markModelExhausted(modelName: string, retryAfterSec?: number) {
    const waitMs = (retryAfterSec || 60) * 1000;
    exhaustedModels.set(modelName, Date.now() + waitMs);
    console.warn(`🛑 [Rate Limit] Model ${modelName} exhausted. Skipping for ${retryAfterSec || 60}s.`);
}

// Check if ALL models are exhausted (no point trying API at all)
function allModelsExhausted(): boolean {
    return MODELS_TO_TRY.every(m => isModelExhausted(m));
}

// Helper: robust generation with fallback across models
async function generateContentWithFallback(
    apiKey: string,
    params: {
        prompt: string | any[],
        systemInstruction?: string,
        jsonMode?: boolean,
        modelParams?: any
    }
) {
    let lastError;

    for (const modelName of MODELS_TO_TRY) {
        // Skip models we know are exhausted
        if (isModelExhausted(modelName)) {
            console.log(`⏭️ [Fallback] Skipping exhausted model: ${modelName}`);
            continue;
        }

        try {
            console.log(`🤖 [Fallback] Trying model: ${modelName} (DeepSeek proxy)`);

            // All AI runs through the DeepSeek-backed /api/gemini proxy (dev + prod),
            // so the API key stays server-side and is never shipped to the browser.
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelName,
                    prompt: params.prompt,
                    systemInstruction: params.systemInstruction,
                    jsonMode: params.jsonMode,
                    modelParams: params.modelParams
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server Error: ${response.status}`);
            }

            const { text } = await response.json();

            console.log(`✅ [Fallback] Model ${modelName} succeeded!`);
            // Return a mock response object compatible with existing code
            return {
                text: () => text,
                response: Promise.resolve({ text: () => text })
            };

        } catch (error: any) {
            console.warn(`⚠️ [Fallback] Model ${modelName} failed:`, error.message?.substring(0, 120));
            lastError = error;

            // 429 = This specific model's quota is exhausted. Try the NEXT model.
            if (error.message?.includes('429') || error.message?.includes('Too Many Requests') || error.message?.includes('Quota')) {
                // Try to parse retry delay from error message
                const retryMatch = error.message?.match(/retry in (\d+)/i);
                const retryAfterSec = retryMatch ? parseInt(retryMatch[1]) : 60;
                markModelExhausted(modelName, retryAfterSec);
                continue; // Try next model — it has its own separate quota!
            }

            // 404 = Model doesn't exist for this API key. Skip to next.
            if (error.message?.includes('404') || error.message?.includes('not found')) {
                continue;
            }

            // Other errors (network, 500, etc.) — also try next model
        }
    }
    throw lastError || new Error("All models exhausted. Please wait and try again.");
}

// --- PROCEDURAL GENERATION ENGINE (No API Key Required) ---

interface QuranVerse {
    number: number;
    text: string;
    numberInSurah: number;
    juz: number;
}

// Helper to remove Tashkeel for comparison
const removeTashkeel = (text: string) => text.replace(/[\u064B-\u065F\u0670\u0610-\u061A\u06D6-\u06ED]/g, "");

const fetchSurahVerses = async (surahNum: number, start: number, end: number): Promise<QuranVerse[]> => {
    try {
        // Fetch text
        // "quran-uthmani" uses distinct Uthmani script which usually includes Basmalah at start of Verse 1 for all surahs
        // Optimize: Use offset/limit to fetch only needed range
        // offset is 0-indexed (Verse 1 = offset 0)
        // limit is count of verses
        const offset = Math.max(0, start - 1);
        const limit = (end - start) + 1;

        const textResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani?offset=${offset}&limit=${limit}`);
        if (!textResponse.ok) throw new Error("Failed to fetch Quran data");
        const data = await textResponse.json();

        const allVerses: any[] = data.data.ayahs;

        // Robust Basmalah check: Check first few letters without tashkeel
        // CRITICAL: The API uses special Unicode character ٱ (Alif Wasla) in "ٱلله"
        const START_BASMALAH_PLAIN = "بسم ٱلله"; // Note: ٱ not regular ا

        // Filter range and Clean Basmalah
        return allVerses
            .filter(v => v.numberInSurah >= start && v.numberInSurah <= end)
            .map(v => {
                let text = v.text;

                // FIXED: Robust Basmalah Removal
                // If Verse 1 of any Surah (except Fatiha #1), checks if it strictly starts with Basmalah
                if (surahNum !== 1 && v.numberInSurah === 1) {
                    const plain = removeTashkeel(text);
                    // Check if it starts with the generic Bismillah pattern
                    if (plain.startsWith(START_BASMALAH_PLAIN)) {
                        // Basmalah is 4 words: Bismi Allahi Ar-Rahmani Ar-Rahimi
                        const words = text.split(' ');
                        // Ensure we don't accidentally delete the whole verse if it's super short
                        if (words.length > 4) {
                            text = words.slice(4).join(' ');
                        }
                    }
                }

                return {
                    number: v.number,
                    text: text.trim(), // Ensure no leading whitespace remains
                    numberInSurah: v.numberInSurah,
                    juz: v.juz
                };
            })
            // If Verse 1 was *only* Basmalah and we stripped it, ignore it (shouldn't happen with Uthmani edition usually)
            .filter(v => v.text.length > 0);

    } catch (e) {
        console.error("Procedural Fetch Error:", e);
        return [];
    }
};

const generateProceduralLevel = async (surah: string, startVerse: number, endVerse: number, mode: GameMode): Promise<LevelData> => {
    // 1. Fetch Verses
    const surahNum = getSurahNumber(surah);

    // Safety buffer: fetch a few extra verses for distractors if range is small
    const fetchStart = Math.max(1, startVerse - 3);

    // For SURF mode, strictly limit to 30 verses per "level" to enforce pauses
    const effectiveEndVerse = mode === 'SURF' ? Math.min(startVerse + 29, endVerse || 999) : endVerse;
    const fetchEnd = effectiveEndVerse ? effectiveEndVerse + 5 : startVerse + 15;

    const allFetched = await fetchSurahVerses(surahNum, fetchStart, fetchEnd);

    if (allFetched.length === 0) {
        throw new Error("Could not fetch verses. Please check internet connection.");
    }

    // 2. Filter down to the user's requested range for QUESTIONS
    const activeVerses = allFetched.filter(v => v.numberInSurah >= startVerse && v.numberInSurah <= (effectiveEndVerse || 999));

    const questions: any[] = [];

    // --- PRE-LOOP BATCHED AI CALLS (ONE call for ALL verses instead of per-verse) ---
    const apiKey = getApiKey();

    // ASSEMBLY: Batch-fetch distractors for ALL verses in one call
    let batchedAssemblyDistractors: Record<number, string[]> = {};
    if (mode === 'ASSEMBLY' && apiKey && !allModelsExhausted()) {
        try {
            const verseList = activeVerses.map((v, i) => `${i + 1}. "${v.text}"`).join('\n');
            const response = await generateContentWithFallback(apiKey, {
                prompt: `Surah: ${surah}\n\nFor EACH of these ${activeVerses.length} verses, generate 4 misleading Quranic fragments (3-5 words each) that are similar but from OTHER Surahs:\n${verseList}`,
                systemInstruction: `You are a Quran expert generating CREDIBLE distractor fragments for a verse assembly game.\nRules:\n1. Each fragment MUST be 3-5 CONTIGUOUS words of REAL, AUTHENTIC Quranic text in UTHMANI SCRIPT with FULL TASHKEEL — copied verbatim from an actual verse, NEVER hallucinated or stitched together.\n2. Take fragments from OTHER Surahs (not the given verse's Surah).\n3. Each fragment should look like it could belong to the SAME verse — similar length, rhythm and theme — so it is a believable decoy, not an obvious mismatch.\n4. Output JSON: { "verses": { "1": ["frag1", "frag2", "frag3", "frag4"], "2": [...] } }`,
                jsonMode: true,
                modelParams: { temperature: 0.9 }
            });
            const text = response.text();
            const jsonStr = text.includes('```') ? text.replace(/```json/g, '').replace(/```/g, '').trim() : text;
            const parsed = JSON.parse(jsonStr);
            if (parsed.verses) {
                Object.entries(parsed.verses).forEach(([key, frags]: [string, any]) => {
                    const idx = parseInt(key) - 1;
                    if (idx >= 0 && idx < activeVerses.length && Array.isArray(frags)) {
                        batchedAssemblyDistractors[activeVerses[idx].numberInSurah] = frags.filter((f: any) => typeof f === 'string' && f.length > 3);
                    }
                });
            }
            console.log(`[Assembly AI Batch] Got distractors for ${Object.keys(batchedAssemblyDistractors).length} verses in 1 API call`);
        } catch (e) {
            console.warn('[Assembly AI Batch] Failed, will use procedural:', e);
        }
    }

    // BRIDGE: Batch-fetch similar verses for ALL first-words in one call
    let batchedBridgeVerses: Record<string, string[]> = {};
    if ((mode === 'CLASSIC' || mode === 'LEARN') && apiKey && !allModelsExhausted()) {
        const firstWordsNeeded = new Set<string>();
        for (const verse of activeVerses) {
            if (verse.numberInSurah < (effectiveEndVerse || 999)) {
                const nextVerse = allFetched.find(v => v.numberInSurah === verse.numberInSurah + 1);
                if (nextVerse) {
                    const nw = nextVerse.text.split(' ').filter(w => w.trim().length > 0);
                    if (nw.length >= 3) firstWordsNeeded.add(nw[0]);
                }
            }
        }
        if (firstWordsNeeded.size > 0) {
            try {
                const wordList = Array.from(firstWordsNeeded);
                const response = await generateContentWithFallback(apiKey, {
                    prompt: `For each of these ${wordList.length} Arabic words, find 3 distinct Quranic verses that START with that exact word:\n${wordList.map((w, i) => `${i + 1}. "${w}"`).join('\n')}`,
                    systemInstruction: `You are a strict Quran expert.\nFor each numbered word, return 3 REAL Quranic verses that BEGIN with that exact word as their first word.\nOutput JSON: { "words": { "1": ["verse1", "verse2", "verse3"], "2": [...] } }\nRules: 100% accurate Uthmani script with full tashkeel. Choose from different Surahs.`,
                    jsonMode: true,
                    modelParams: { temperature: 0.3 }
                });
                const text = response.text();
                const jsonStr = text.includes('```') ? text.replace(/```json/g, '').replace(/```/g, '').trim() : text;
                const parsed = JSON.parse(jsonStr);
                if (parsed.words) {
                    Object.entries(parsed.words).forEach(([key, verses]: [string, any]) => {
                        const idx = parseInt(key) - 1;
                        if (idx >= 0 && idx < wordList.length && Array.isArray(verses)) {
                            batchedBridgeVerses[wordList[idx]] = verses.filter((v: any) => typeof v === 'string' && v.length > 5);
                        }
                    });
                }
                console.log(`[Bridge AI Batch] Got verses for ${Object.keys(batchedBridgeVerses).length} words in 1 API call`);
            } catch (e) {
                console.warn('[Bridge AI Batch] Failed, will use procedural:', e);
            }
        }
    }

    // BRIDGE: Batch-fetch credible single-word decoys (real Quranic verse-openers) for
    // each next-verse first word, so the word-choice step stops showing random words.
    let batchedBridgeWordDistractors: Record<string, string[]> = {};
    if ((mode === 'CLASSIC' || mode === 'LEARN') && apiKey && !allModelsExhausted()) {
        const wordsNeeded = new Set<string>();
        for (const verse of activeVerses) {
            if (verse.numberInSurah < (effectiveEndVerse || 999)) {
                const nextVerse = allFetched.find(v => v.numberInSurah === verse.numberInSurah + 1);
                if (nextVerse) {
                    const nw = nextVerse.text.split(' ').filter(w => w.trim().length > 0);
                    if (nw.length >= 3) wordsNeeded.add(nw[0]);
                }
            }
        }
        if (wordsNeeded.size > 0) {
            try {
                const wl = Array.from(wordsNeeded);
                const response = await generateContentWithFallback(apiKey, {
                    prompt: `For EACH of these ${wl.length} Arabic words (each BEGINS a Quranic verse), give 3 OTHER real Quranic words that ALSO commonly begin Quranic verses or clauses — credible decoys, all DIFFERENT from the given word:\n${wl.map((w, i) => `${i + 1}. "${w}"`).join('\n')}`,
                    systemInstruction: `You are a Quran expert creating CREDIBLE word decoys for a memorization game.\nFor each numbered word, return 3 REAL Arabic words that frequently START Quranic verses/clauses (e.g. إِنَّ، قُلْ، وَمَا، يَٰٓأَيُّهَا، ٱلَّذِينَ، مَن) and are tempting but WRONG alternatives to it.\nRules: real Quranic words only, UTHMANI script with full tashkeel, each DIFFERENT from the given word.\nOutput JSON: { "words": { "1": ["w1","w2","w3"], "2": [...] } }`,
                    jsonMode: true,
                    modelParams: { temperature: 0.6 }
                });
                const text = response.text();
                const jsonStr = text.includes('```') ? text.replace(/```json/g, '').replace(/```/g, '').trim() : text;
                const parsed = JSON.parse(jsonStr);
                if (parsed.words) {
                    Object.entries(parsed.words).forEach(([key, ws]: [string, any]) => {
                        const idx = parseInt(key) - 1;
                        if (idx >= 0 && idx < wl.length && Array.isArray(ws)) {
                            const cn = removeTashkeel(wl[idx]);
                            batchedBridgeWordDistractors[wl[idx]] = ws.filter((w: any) => typeof w === 'string' && w.trim().length > 0 && removeTashkeel(w) !== cn);
                        }
                    });
                }
                console.log(`[Bridge Words AI Batch] Got word decoys for ${Object.keys(batchedBridgeWordDistractors).length} words`);
            } catch (e) {
                console.warn('[Bridge Words AI Batch] Failed, will use procedural:', e);
            }
        }
    }

    // SURFER / SURVIVOR: Batch-fetch meaningful per-word distractors (real, confusable
    // Quranic words) in ONE call, so the catch-the-word games stop showing random fragments.
    let batchedWordChallenges: Record<string, string[]> = {};
    if ((mode === 'SURF' || mode === 'SURVIVOR') && apiKey && !allModelsExhausted()) {
        const uniqueWords = Array.from(new Set(
            activeVerses.flatMap(v => v.text.split(' ').map(w => w.trim()).filter(w => w.length > 1))
        )).slice(0, 40); // cap so the prompt stays small
        if (uniqueWords.length > 0) {
            try {
                const response = await generateContentWithFallback(apiKey, {
                    prompt: `For EACH of these ${uniqueWords.length} Arabic Quranic words, give 3 DIFFERENT real Quranic words that are easy to confuse with it (similar root, shape, rhyme or letters) but are NOT the same word:\n${uniqueWords.map((w, i) => `${i + 1}. "${w}"`).join('\n')}`,
                    systemInstruction: `You generate CREDIBLE distractor words for a Quran memorization game.\nFor each given word, return 3 REAL, COMMON Quranic words a reciter could plausibly confuse with it — similar in root, shape, rhyme or meaning — so each decoy is tempting but wrong.\nRules: real Quranic words only, UTHMANI script with full tashkeel, each DIFFERENT from the given word, never invent or transliterate.\nOutput JSON: { "words": { "1": ["w1","w2","w3"], "2": [...] } }`,
                    jsonMode: true,
                    modelParams: { temperature: 0.7 }
                });
                const text = response.text();
                const jsonStr = text.includes('```') ? text.replace(/```json/g, '').replace(/```/g, '').trim() : text;
                const parsed = JSON.parse(jsonStr);
                if (parsed.words) {
                    Object.entries(parsed.words).forEach(([key, frags]: [string, any]) => {
                        const idx = parseInt(key) - 1;
                        if (idx >= 0 && idx < uniqueWords.length && Array.isArray(frags)) {
                            batchedWordChallenges[uniqueWords[idx]] = frags.filter((f: any) => typeof f === 'string' && f.trim().length > 1 && f !== uniqueWords[idx]);
                        }
                    });
                }
                console.log(`[Surfer AI Batch] Got distractors for ${Object.keys(batchedWordChallenges).length} words in 1 API call`);
            } catch (e) {
                console.warn('[Surfer AI Batch] Failed, will use procedural:', e);
            }
        }
    }

    // 3. Generate Questions per Verse (NO per-verse API calls inside this loop)
    for (const verse of activeVerses) {
        const words = verse.text.split(' ').filter(w => w.trim().length > 0);
        const id = `proc-${verse.numberInSurah}`;

        if (mode === 'ASSEMBLY') {
            const numFragments = Math.min(4, Math.max(3, Math.floor(words.length / 3)));
            const fragmentSize = Math.ceil(words.length / numFragments);
            const fragments: any[] = [];

            for (let i = 0; i < numFragments; i++) {
                const start = i * fragmentSize;
                const end = Math.min(start + fragmentSize, words.length);
                const fragmentWords = words.slice(start, end);
                if (fragmentWords.length > 0) {
                    fragments.push({ id: `c-${id}-${i}`, text: fragmentWords.join(' '), type: 'CORRECT', orderIndex: i });
                }
            }

            // Use pre-fetched batch distractors (no API call here)
            const distractorCount = 4;
            const avgFragmentSize = Math.ceil(words.length / numFragments);
            let distractorFragments: any[] = [];

            const aiBatch = batchedAssemblyDistractors[verse.numberInSurah];
            if (aiBatch && aiBatch.length >= 3) {
                aiBatch.slice(0, distractorCount).forEach((text, idx) => {
                    distractorFragments.push({ id: `d-${id}-ai-${idx}`, text, type: 'DISTRACTOR', orderIndex: -1 });
                });
                console.log(`[Assembly] Using ${distractorFragments.length} batched AI distractors for verse ${verse.numberInSurah}`);
            }

            // PROCEDURAL FALLBACK: Use REAL fragments from OTHER verses
            // KEY: Use the SAME fragmentSize as correct fragments so all pieces look identical
            if (distractorFragments.length < distractorCount) {
                const needed = distractorCount - distractorFragments.length;

                // Only pick verses long enough to yield a fragment of the correct size
                const otherVerses = allFetched
                    .filter(v => v.numberInSurah !== verse.numberInSurah)
                    .filter(v => {
                        const wc = v.text.split(' ').filter(w => w.trim().length > 0).length;
                        return wc >= fragmentSize; // Must have enough words for same-size fragment
                    })
                    .sort(() => Math.random() - 0.5);

                const candidateFragments: { text: string, sourceVerse: number }[] = [];

                for (const otherVerse of otherVerses) {
                    if (candidateFragments.length >= needed * 3) break;

                    const otherWords = otherVerse.text.split(' ').filter(w => w.trim().length > 0);

                    // Pick a random starting position that yields exactly fragmentSize words
                    const maxStart = otherWords.length - fragmentSize;
                    const fStart = Math.floor(Math.random() * (maxStart + 1));
                    const fragText = otherWords.slice(fStart, fStart + fragmentSize).join(' ');

                    // Ensure no duplication with correct fragments or other candidates
                    const isDuplicate = fragments.some(f => f.text === fragText) ||
                        candidateFragments.some(c => c.text === fragText);

                    if (!isDuplicate && fragText.length > 3) {
                        candidateFragments.push({ text: fragText, sourceVerse: otherVerse.numberInSurah });
                    }
                }

                candidateFragments.slice(0, needed).forEach((candidate, idx) => {
                    distractorFragments.push({
                        id: `d-${id}-${idx}`,
                        text: candidate.text,
                        type: 'DISTRACTOR',
                        orderIndex: -1
                    });
                });
            }

            fragments.push(...distractorFragments);

            questions.push({
                id,
                type: QuestionType.VERSE_ASSEMBLY,
                verseNumber: verse.numberInSurah,
                points: 300,
                prompt: "رتب أجزاء الآية الكريمة",
                arabicText: verse.text,
                assemblyData: { fragments: fragments.sort(() => Math.random() - 0.5) },
                hint: "استعن بالله",
                memorizationTip: "اقرأ الآية كاملة أولاً"
            });

        } else if (mode === 'STACK') {
            questions.push({
                id,
                type: QuestionType.VERSE_STACK,
                verseNumber: verse.numberInSurah,
                points: 300,
                prompt: "ابنِ الآية كلمة بكلمة",
                arabicText: verse.text,
                stackData: { words: words },
                hint: "الترتيب مهم",
            });

        } else if (mode === 'SURF' || mode === 'SURVIVOR') {
            // Per-word challenges: each correct word gets 2-3 confusable REAL Quranic words
            // from the AI batch; fall back to real words from OTHER verses (never gibberish).
            const otherVerseWords = Array.from(new Set(
                allFetched
                    .filter(v => v.numberInSurah !== verse.numberInSurah)
                    .flatMap(v => v.text.split(' ').map(w => w.trim()))
                    .filter(w => w.length > 1)
            ));

            const correctNorm = new Set(words.map(removeTashkeel));
            const wordChallenges = words.map(w => {
                const wNorm = removeTashkeel(w);
                // Drop any AI distractor equal to the answer ignoring tashkeel (look-alikes).
                let d = (batchedWordChallenges[w] || []).filter(x => removeTashkeel(x) !== wNorm);
                if (d.length < 2) {
                    const filler = otherVerseWords
                        .filter(x => !correctNorm.has(removeTashkeel(x)) && !d.some(y => removeTashkeel(y) === removeTashkeel(x)))
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 2 - d.length);
                    d = [...d, ...filler];
                }
                return { word: w, distractors: d.slice(0, 3) };
            });

            // Flat pool used by the Surfer game — real words, deduped, and never equal to a
            // correct word (compared ignoring tashkeel so look-alikes don't leak through).
            const distractors = Array.from(new Set(wordChallenges.flatMap(c => c.distractors)))
                .filter(x => !correctNorm.has(removeTashkeel(x)));
            while (distractors.length < 3) {
                distractors.push("ٱلۡعَٰلَمِينَ", "مُّسۡتَقِيم", "حَكِيم");
            }

            questions.push({
                id,
                type: QuestionType.VERSE_SURFER,
                verseNumber: verse.numberInSurah,
                points: 300,
                prompt: "التقط كلمات الآية الصحيحة",
                arabicText: verse.text,
                surferData: { words: words, distractors, wordChallenges },
                hint: "",
            });

        } else if (mode === 'QUIZ') {
            // --- PROCEDURAL / MOCK LUDIC QUIZ (Fallback or Demo) ---
            // We rotate through types to demonstrate the UI features since we might not have AI

            const words = verse.text.split(' ');
            if (words.length < 3) continue;

            // --- RANDOM POOL SELECTION ---
            // To ensure 20+ unique questions without repetition, we pick from the global TAHA_QUIZ_DATA
            // We use a deterministic but rotating index based on the verse number to pick different questions
            const poolIndex = (verse.numberInSurah + questions.length) % TAHA_QUIZ_DATA.length;
            const qData = TAHA_QUIZ_DATA[poolIndex];

            questions.push({
                id: `${id}-${qData.quizSubType.toLowerCase()}`,
                type: QuestionType.VERSE_QUIZ,
                quizSubType: qData.quizSubType as any,
                verseNumber: verse.numberInSurah,
                points: qData.points,
                prompt: qData.prompt,
                scenario: (qData as any).scenario,
                emojis: (qData as any).emojis,
                arabicText: (qData as any).arabicText || qData.answer, // Fallback for various types
                correctAnswer: qData.answer,
                options: [...qData.options].sort(() => Math.random() - 0.5), // Shuffle options
                explanation: qData.explanation,
                hint: "من سورة طه"
            });

        } else {
            // ============ VERSE BRIDGE LOGIC ============
            // Generates data for 3-step difficulty progression:
            // Step 1: User types first word (nextVerseFirstWord)
            // Step 2: User chooses from 3 single words (wordDistractors)
            // Step 3: User chooses from 3 full verses (options - all start with same word)

            if (verse.numberInSurah < endVerse) {
                const nextVerse = allFetched.find(v => v.numberInSurah === verse.numberInSurah + 1);

                if (nextVerse) {
                    const nextWords = nextVerse.text.split(' ').filter(w => w.trim().length > 0);
                    if (nextWords.length < 3) continue; // Need at least 3 words for full verse

                    const firstWord = nextWords[0];

                    const fullNextVerse = nextVerse.text;

                    // Authentic Quranic Verses for Common Starters (To avoid "Fake" verses)
                    // Expanded Map to cover 80% of common sentence starters
                    const COMMON_STARTERS: Record<string, string[]> = {
                        "إِنَّ": ["إِنَّ ٱللَّهَ عَلَىٰ كُلِّ شَيۡءٖ قَدِيرٞ", "إِنَّ ٱللَّهَ غَفُورٞ رَّحِيمٞ", "إِنَّ ٱلَّذِينَ ءَامَنُواْ وَعَمِلُواْ ٱلصَّٰلِحَٰتِ", "إِنَّ ٱللَّهَ يُحِبُّ ٱلۡمُحۡسِنِينَ", "إِنَّ ٱلۡبَٰطِلَ كَانَ زَهُوقٗا"],
                        "قُلۡ": ["قُلۡ هُوَ ٱللَّهُ أَحَدٌ", "قُلۡ يَٰٓأَيُّهَا ٱلۡكَٰفِرُونَ", "قُلۡ أَعُوذُ بِرَبِّ ٱلنَّاسِ", "قُلۡ سِيرُواْ فِي ٱلۡأَرۡضِ فَٱنظُرُواْ", "قُلۡ لَّن يُصِيبَنَآ إِلَّا مَا كَتَبَ ٱللَّهُ لَنَا"],
                        "وَمَا": ["وَمَا خَلَقۡتُ ٱلۡجِنَّ وَٱلۡإِنسَ إِلَّا لِيَعۡبُدُونِ", "وَمَا تَفۡعَلُواْ مِنۡ خَيۡرٖ يَعۡلَمۡهُ ٱللَّهُ", "وَمَا ٱلۡحَيَوٰةُ ٱلدُّنۡيَآ إِلَّا مَتَٰعُ ٱلۡغُرُورِ", "وَمَا مِن دَآبَّةٖ فِي ٱلۡأَرۡضِ إِلَّا عَلَى ٱللَّهِ رِزۡقُهَا", "وَمَا كَانَ ٱللَّهُ لِيُعَذِّبَهُمۡ وَأَنتَ فِيهِمۡ"],
                        "وَٱللَّهُ": ["وَٱللَّهُ يَعۡلَمُ وَأَنتُمۡ لَا تَعۡلَمُونَ", "وَٱللَّهُ بِمَا تَعۡمَلُونَ بَصِيرٞ", "وَٱللَّهُ عَلَىٰ كُلِّ شَيۡءٖ قَدِيرٞ", "وَٱللَّهُ يَعۡصِمُكَ مِنَ ٱلنَّاسِ", "وَٱللَّهُ يُرِيدُ أَن يَتُوبَ عَلَيۡكُمۡ"],
                        "يَٰٓأَيُّهَا": ["يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ ٱتَّقُواْ ٱللَّهَ", "يَٰٓأَيُّهَا ٱلنَّاسُ ٱعۡبُدُواْ رَبَّكُمُ", "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ كُتِبَ عَلَيۡكُمُ ٱلصِّيَامُ", "يَٰٓأَيُّهَا ٱلۡإِنسَٰنُ مَا غَرَّكَ بِرَبِّكَ ٱلۡكَرِيمِ", "يَٰٓأَيُّهَا ٱلنَّاسُ إِنَّ وَعۡدَ ٱللَّهِ حَقّٞ"],
                        "أَلَمۡ": ["أَلَمۡ تَرَ كَيۡفَ فَعَلَ رَبُّكَ بِأَصۡحَٰبِ ٱلۡفِيلِ", "أَلَمۡ نَشۡرَحۡ لَكَ صَدۡرَكَ", "أَلَمۡ يَعۡلَم بِأَنَّ ٱللَّهَ يَرَىٰ", "أَلَمۡ يَأۡنِ لِلَّذِينَ ءَامَنُوٓاْ أَن تَخۡشَعَ قُلُوبُهُمۡ", "أَلَمۡ تَرَ أَنَّ ٱللَّهَ يَسۡجُدُ لَهُۥ مَن فِي ٱلسَّمَٰوَٰتِ"],
                        "وَلَقَدۡ": ["وَلَقَدۡ يَسَّرۡنَا ٱلۡقُرۡءَانَ لِلذِّكۡرِ فَهَلۡ مِن مُّدَّكِرٖ", "وَلَقَدۡ خَلَقۡنَا ٱلۡإِنسَٰنَ وَنَعۡلَمُ مَا تُوَسۡوِسُ بِهِۦ نَفۡسُهُۥ", "وَلَقَدۡ أَرۡسَلۡنَا نُوحًا إِلَىٰ قَوۡمِهِۦ", "وَلَقَدۡ كَرَّمۡنَا بَنِيٓ ءَادَمَ", "وَلَقَدۡ ءَاتَيۡنَا لُقۡمَٰنَ ٱلۡحِكۡمَةَ"],
                        "ٱلَّذِينَ": ["ٱلَّذِينَ يُؤۡمِنُونَ بِٱلۡغَيۡبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ", "ٱلَّذِينَ ءَامَنُواْ وَعَمِلُواْ ٱلصَّٰلِحَٰتِ", "ٱلَّذِينَ هُمۡ فِي صَلَاتِهِمۡ خَٰشِعُونَ", "ٱلَّذِينَ يُنفِقُونَ أَمۡوَٰلَهُم بِٱلَّيۡلِ وَٱلنَّهَارِ"],
                        "وَإِذَا": ["وَإِذَا قُرِئَ ٱلۡقُرۡءَانُ فَٱسۡتَمِعُواْ لَهُۥ", "وَإِذَا لَقُواْ ٱلَّذِينَ ءَامَنُواْ قَالُوٓاْ ءَامَنَّا", "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ", "وَإِذَا ٱلۡمَوۡءُۥدَةُ سُئِلَتۡ"],
                        "فَإِن": ["فَإِن تَوَلَّوۡاْ فَقُلۡ حَسۡبِيَ ٱللَّهُ", "فَإِنَّ مَعَ ٱلۡعُسۡرِ يُسۡرًا", "فَإِنَّ ٱللَّهَ غَفُورٞ رَّحِيمٞ"],
                        "بَلۡ": ["بَلۡ هُمۡ فِي شَكّٖ يَلۡعَبُونَ", "بَلۡ تُؤۡثِرُونَ ٱلۡحَيَوٰةَ ٱلدُّنۡيَا", "بَلۡ كَذَّبُواْ بِٱلسَّاعَةِ"],
                        "كَلَّآ": ["كَلَّآ إِنَّ ٱلۡإِنسَٰنَ لَيَطۡغَىٰٓ", "كَلَّآ إِنَّ كِتَٰبَ ٱلۡأَبۡرَارِ لَفِي عِلِّيِّينَ", "كَلَّا سَيَعۡلَمُونَ"],
                        "ثُمَّ": ["ثُمَّ رَدَدۡنَٰهُ أَسۡفَلَ سَافِلِينَ", "ثُمَّ لَتُسۡـَٔلُنَّ يَوۡمَئِذٍ عَنِ ٱلنَّعِيمِ", "ثُمَّ ٱلسَّبِيلَ يَسَّرَهُۥ"],
                        "هَلۡ": ["هَلۡ أَتَىٰكَ حَدِيثُ ٱلۡغَٰشِيَةِ", "هَلۡ جَزَآءُ ٱلۡإِحۡسَٰنِ إِلَّا ٱلۡإِحۡسَٰنُ", "هَلۡ يَسۡتَوِي ٱلَّذِينَ يَعۡلَمُونَ وَٱلَّذِينَ لَا يَعۡلَمُونَ"],
                        "وَأَنَّ": ["وَأَنَّ ٱللَّهَ لَيۡسَ بِظَلَّٰمٖ لِّلۡعَبِيدِ", "وَأَنَّ هَٰذَا صِرَٰطِي مُسۡتَقِيمٗا فَٱتَّبِعُوهُ", "وَأَنَّ ٱلۡمَسَٰجِدَ لِلَّهِ فَلَا تَدۡعُواْ مَعَ ٱللَّهِ أَحَدٗا"],
                        "لَآ": ["لَآ أَعۡبُدُ مَا تَعۡبُدُونَ", "لَآ إِكۡرَاهَ فِي ٱلدِّينِ", "لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡرَّحۡمَٰنُ ٱلۡرَّحِيمُ"],
                        "مَا": ["مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ", "مَا عِندَكُمۡ يَنفَدُ وَمَا عِندَ ٱللَّهِ بَاقٖ", "مَآ أَغْنَىٰ عَنْهُ مَالُهُۥ وَمَا كَسَبَ"],
                        // Rare/Specific Starters (Added for robust coverage)
                        "تَنزِيلُ": ["تَنزِيلُ ٱلۡكِتَٰبِ مِنَ ٱللَّهِ ٱلۡعَزِيزِ ٱلۡحَكِيمِ", "تَنزِيلُ ٱلۡكِتَٰبِ لَا رَيۡبَ فِيهِ مِن رَّبِّ ٱلۡعَٰلَمِينَ", "تَنزِيلٞ مِّنَ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"], // Matches Tanzeelan/Tanzeelun
                        "سُبۡحَٰنَ": ["سُبۡحَٰنَ ٱلَّذِيٓ أَسۡرَىٰ بِعَبۡدِهِۦ لَيۡلٗا", "سُبۡحَٰنَ ٱلَّذِي خَلَقَ ٱلۡأَزۡوَٰجَ كُلَّهَا", "سُبۡحَٰنَ رَبِّكَ رَبِّ ٱلۡعِزَّةِ عَمَّا يَصِفُونَ"],
                        "ٱلۡحَمۡدُ": ["ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ", "ٱلۡحَمۡدُ لِلَّهِ ٱلَّذِي خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلۡأَرۡضَ", "ٱلۡحَمۡدُ لِلَّهِ فَاطِرِ ٱلسَّمَٰوَٰتِ وَٱلۡأَرۡضِ"],
                        "تَبَٰرَكَ": ["تَبَٰرَكَ ٱلَّذِي نَزَّلَ ٱلۡفُرۡقَانَ عَلَىٰ عَبۡدِهِۦ", "تَبَٰرَكَ ٱلَّذِي بِيَدِهِ ٱلۡمُلۡكُ", "تَبَٰرَكَ ٱلَّذِي جَعَلَ فِي ٱلسَّمَآءِ بُرُوجٗا"],
                        "إِلَّا": ["إِلَّا تَنصُرُوهُ فَقَدۡ نَصَرَهُ ٱللَّهُ", "إِلَّا ٱلَّذِينَ ءَامَنُواْ وَعَمِلُواْ ٱلصَّٰلِحَٰتِ", "إِلَّا مَن تَوَلَّىٰ وَكَفَرَ"], // Verses starting with illa
                        "فَلَمَّا": ["فَلَمَّا رَءَاهُ مُسۡتَقِرًّا عِندَهُۥ", "فَلَمَّا جَآءَهُمُ ٱلۡحَقُّ مِنۡ عِندِنَا", "فَلَمَّا ءَاسَفُونَا ٱنتَقَمۡنَا مِنۡهُمۡ"],
                        "وَلَمَّا": ["وَلَمَّا دَخَلُواْ مِنۡ حَيۡثُ أَمَرَهُمۡ أَبُوهُم", "وَلَمَّا جَآءَتۡ رُسُلُنَا لُوطٗا", "وَلَمَّا بَرَزُواْ لِجَالُوتَ وَجُنُودِهِۦ"]
                    };

                    // ========== STEP 2: WORD DISTRACTORS (single words) ==========
                    // Prefer AI-generated CREDIBLE verse-opening decoys; fall back to real
                    // first-words from other verses, then a curated list of common openers.
                    const fwNorm = removeTashkeel(firstWord);
                    let wordDistractors: string[] = Array.from(new Set(
                        (batchedBridgeWordDistractors[firstWord] || []).filter(w => removeTashkeel(w) !== fwNorm)
                    )).slice(0, 2);

                    if (wordDistractors.length < 2) {
                        const wordPool = allFetched
                            .filter(v => v.numberInSurah !== nextVerse.numberInSurah)
                            .map(v => v.text.split(' ').filter(w => w.trim().length > 0)[0])
                            .filter(w => w && removeTashkeel(w) !== fwNorm && !wordDistractors.some(d => removeTashkeel(d) === removeTashkeel(w)));
                        const extra = Array.from(new Set(wordPool)).sort(() => Math.random() - 0.5).slice(0, 2 - wordDistractors.length);
                        wordDistractors = [...wordDistractors, ...extra];
                    }

                    // Curated common verse-openers as a last resort.
                    const fallbackWords = ["قَالَ", "وَمَا", "إِنَّ", "فَلَمَّا", "يَا", "وَقَالَ", "فَإِنَّ", "أَلَمْ"];
                    while (wordDistractors.length < 2) {
                        const candidate = fallbackWords.find(c => removeTashkeel(c) !== fwNorm && !wordDistractors.some(d => removeTashkeel(d) === removeTashkeel(c)));
                        if (candidate) wordDistractors.push(candidate); else break;
                    }

                    // ========== STEP 3: FULL VERSE OPTIONS (all start with same word) ==========
                    let verseOptions: string[] = [];

                    // Use pre-fetched batch results (no API call here)
                    const batchVerses = batchedBridgeVerses[firstWord];
                    if (batchVerses && batchVerses.length > 0) {
                        // Validate tashkeel-insensitively: keep real same-start verses,
                        // drop hallucinations, without rejecting good ones over diacritics.
                        const firstWordNorm = removeTashkeel(firstWord);
                        verseOptions = batchVerses
                            .filter(v => removeTashkeel(v).startsWith(firstWordNorm) && v !== fullNextVerse)
                            .slice(0, 2);
                        if (verseOptions.length >= 2) {
                            console.log(`[Bridge] Using ${verseOptions.length} batched AI verses for word "${firstWord}"`);
                        }
                    }

                    // Procedural fallback: Find verses from fetched data that start with same word
                    if (verseOptions.length < 2) {
                        const sameStartVerses = allFetched
                            .filter(v => {
                                const words = v.text.split(' ').filter(w => w.trim().length > 0);
                                return words[0] === firstWord && v.numberInSurah !== nextVerse.numberInSurah;
                            })
                            .map(v => v.text)
                            .sort(() => Math.random() - 0.5)
                            .slice(0, 2);

                        verseOptions = sameStartVerses;
                    }

                    // Final fallback: Use Common Starters if applicable, or Random UNMODIFIED Verses
                    // Priority 1: Check if the word is a common starter
                    const cleanFirstWord = removeTashkeel(firstWord); // Normalize for lookup if needed, but keys are usually with tashkeel if fetched that way. 
                    // Actually, let's try direct match first.

                    if (verseOptions.length < 2) {
                        // Normalize first word for lookup (remove Tashkeel)
                        const cleanFirstWord = removeTashkeel(firstWord);

                        // Try Partial Match in Common Starters (e.g. "Wa" + "Ma" + "Allah" -> "Wama")
                        const keys = Object.keys(COMMON_STARTERS);
                        const matchKey = keys.find(k => removeTashkeel(k) === cleanFirstWord) ||
                            keys.find(k => cleanFirstWord.startsWith(removeTashkeel(k)));

                        if (matchKey) {
                            const potential = COMMON_STARTERS[matchKey];
                            for (const p of potential) {
                                if (p !== fullNextVerse && !verseOptions.includes(p)) {
                                    verseOptions.push(p);
                                    if (verseOptions.length >= 2) break;
                                }
                            }
                        }
                    }

                    // Priority 2: Generic Real Verses (Authenticity > Difficulty)
                    // If we STILL don't have enough options, we must show REAL verses. 
                    // Showing a real verse that starts with a DIFFERENT word is better than showing a FAKE verse.
                    // However, we try to pick verses that are "thematically confident" strings.

                    if (verseOptions.length < 2) {
                        const randomRealVerses = allFetched
                            .filter(v => v.numberInSurah !== nextVerse.numberInSurah && v.numberInSurah !== verse.numberInSurah)
                            .map(v => v.text)
                            .sort(() => Math.random() - 0.5);

                        for (const rv of randomRealVerses) {
                            if (!verseOptions.includes(rv)) {
                                verseOptions.push(rv);
                                if (verseOptions.length >= 2) break;
                            }
                        }
                    }

                    // Final Safety Net: Hardcoded SAFE Full Verses (Guaranteed Authenticity)
                    const SAFE_VERSES = [
                        "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَيُّ ٱلۡقَيُّومُ",
                        "قُلۡ هُوَ ٱللَّهُ أَحَدٌ",
                        "إِنَّآ أَعۡطَيۡنَٰكَ ٱلۡكَوۡثَرَ"
                    ];

                    while (verseOptions.length < 2) {
                        const candidate = SAFE_VERSES[Math.floor(Math.random() * SAFE_VERSES.length)];
                        if (candidate !== fullNextVerse && !verseOptions.includes(candidate)) {
                            verseOptions.push(candidate);
                        } else if (verseOptions.length < 2 && SAFE_VERSES.length < 5) {
                            // duplication worst case
                            verseOptions.push("ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ");
                        }
                    }

                    // Build final options array (correct + 2 distractors)
                    const allVerseOptions = [fullNextVerse, ...verseOptions.slice(0, 2)]
                        .sort(() => Math.random() - 0.5);

                    // Extract words from the verse for VerseSurferGame
                    const verseWords = verse.text.split(' ').filter(w => w.trim().length > 0);
                    // Get distractor words from wordDistractors array
                    const distractorWords = wordDistractors.length > 0 ? wordDistractors : ["خطأ", "انتبه", "حاول", "مرة"];

                    questions.push({
                        id,
                        type: QuestionType.VERSE_BRIDGE,
                        verseNumber: verse.numberInSurah,
                        points: 300,
                        prompt: "أكمل بداية الآية التالية",
                        arabicText: verse.text,
                        nextVerseFirstWord: firstWord,
                        wordDistractors: wordDistractors, // NEW: For Step 2
                        correctAnswer: fullNextVerse, // Full verse for Step 3
                        options: allVerseOptions, // NEW: All start with same word
                        hint: "لاحظ سياق الآيات",
                        surferData: { // NEW: For VerseSurferGame
                            words: verseWords,
                            distractors: distractorWords
                        }
                    });
                }
            }
        }
    }


    return {
        surahName: surah,
        questions: questions.length > 0 ? questions : []
    };
};

// --- Utils ---
async function retry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay * 2);
    }
}


// --- Main Service Functions ---

export const analyzeRecitation = async (input: { text?: string, audioBase64?: string, targetSurah?: string, range?: { start: number, end?: number } }): Promise<DiagnosticResult> => {
    const apiKey = getApiKey();

    // Fallback result for demo/error cases
    const fallbackResult = (reason: string): DiagnosticResult => ({
        surahName: input.targetSurah || "Demo",
        startVerse: input.range?.start || 1,
        endVerse: input.range?.end || 5,
        overallScore: 75,
        metrics: { memorization: 75, tajweed: 70, pronunciation: 80 },
        mistakes: [{
            type: 'MEMORIZATION',
            verse: input.range?.start || 1,
            text: "مثال",
            correction: "مثال صحيح",
            description: "This is a demo/fallback result",
            advice: reason
        }],
        diagnosis: `عرض تجريبي - ${reason}`,
        identifiedText: input.text || "(Audio analysis unavailable)"
    });

    if (!apiKey) {
        return fallbackResult("No API Key provided. Add key in Settings for real analysis.");
    }

    try {
        const parts: any[] = [];
        if (input.audioBase64) {
            const cleanBase64 = input.audioBase64.includes(',')
                ? input.audioBase64.split(',')[1]
                : input.audioBase64;

            parts.push({
                inlineData: {
                    mimeType: "audio/webm",
                    data: cleanBase64
                }
            });
        }

        const jsonSchema = `
        4. المخرجات يجب أن تكون JSON فقط:
        {
          "overallScore": number,
          "metrics": {"memorization": number, "tajweed": number, "pronunciation": number},
          "mistakes": [{"type": "MEMORIZATION|TAJWEED|PRONUNCIATION", "verse": number, "text": "الكلمة الخطأ", "correction": "الصواب", "description": "وصف دقيق للخطأ بالعربية", "advice": "نصيحة عملية"}],
          "diagnosis": "تقرير شامل وملخص للمستوى العام (بالعربية)",
          "identifiedText": "النص الذي تم تحليله"
        }`;

        const promptText = input.audioBase64
            ? `استمع إلى تلاوة سورة ${input.targetSurah || "غير محددة"}.
               1. اكتب النص الذي تسمعه بدقة (identifiedText).
               2. قيم التلاوة من 100 في: الحفظ، التجويد، والنطق.
               3. استخرج الأخطاء:
                  - الحفظ: نسيان، تبديل.
                  - التجويد: الغنة، المدود، القلقلة.
                  - المخارج: تفخيم، ترقيق.
               ${jsonSchema}`
            : `قم بتحليل النص القرآني المكتوب التالي من سورة ${input.targetSurah || "غير محددة"}:
               "${input.text}"
               
               المهمة:
               1. قارن النص المكتوب بالنص القرآني الصحيح (مصحف المدينة).
               2. استخرج الأخطاء الإملائية (رسم المصحف) أو التشكيلية أو النقص/الزيادة.
               3. قيم الحفظ بناءً على دقة الكتابة.
               ${jsonSchema}`;

        parts.push(promptText);

        const response = await generateContentWithFallback(apiKey, {
            prompt: parts,
            systemInstruction: "أنت شيخ مقرئ خبير في علم التجويد والمقامات. مهمتك هي الاستماع للتلاوة وتصحيحها بدقة متناهية مع التركيز على أحكام التجويد (النون الساكنة والتنوين، المدود، التفخيم والترقيق) ومخارج الحروف. كل مخرجاتك يجب أن تكون باللغة العربية الفصحى.",
            jsonMode: true
        });
        const text = response.text();
        console.log("[ANALYSIS] Raw response:", text.substring(0, 500));

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);

        return {
            surahName: input.targetSurah || "Unknown",
            startVerse: input.range?.start || 1,
            endVerse: input.range?.end,
            overallScore: data.overallScore || 0,
            metrics: data.metrics || { memorization: 0, tajweed: 0, pronunciation: 0 },
            mistakes: data.mistakes || [],
            diagnosis: data.diagnosis || "تعذر التحليل الدقيق",
            identifiedText: data.identifiedText || ""
        };

    } catch (e: any) {
        // Detailed error logging
        const errorMessage = e?.message || String(e);
        console.error("[ANALYSIS] API call failed:", errorMessage);
        console.error("[ANALYSIS] Using fallback demo result");

        // Detect specific errors
        const is404 = errorMessage.includes('404') || errorMessage.includes('not found');
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');

        let reason = "API call failed.";
        if (is404) {
            reason = "Model not available for your API key. Using demo result.";
        } else if (isRateLimit) {
            reason = "Rate limit exceeded. Wait 1 minute and try again.";
        }

        return fallbackResult(reason);
    }
};

export const checkRecitationGaps = async (audioBase64: string, maskedVerseText: string): Promise<{ filledWords: { word: string, isCorrect: boolean }[], fullTranscript: string }> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key missing");
    }

    console.log("[GAPS] Starting checkRecitationGaps");
    console.log("[GAPS] Audio length:", audioBase64.length);
    console.log("[GAPS] Masked text:", maskedVerseText);
    console.log("[GAPS] ✅ Using Gemini AI for audio transcription");

    try {
        const response = await generateContentWithFallback(apiKey, {
            prompt: [
                {
                    inlineData: {
                        mimeType: "audio/webm",
                        data: audioBase64
                    }
                },
                `Verse Text with Gaps: "${maskedVerseText}"\nTranscribe and fill the gaps based on the audio.`
            ],
            systemInstruction: `You are a Quran Recitation Verifier.
        TASK: Listen to the audio and:
        1. Transcribe EVERYTHING you hear (fullTranscript).
        2. Fill in the [MASK] gaps in the provided text.
        INPUT: Audio + "Bismi Allahi [MASK] [MASK]"
        OUTPUT: JSON only.
        Schema: { 
            "fullTranscript": "بسم الله الرحمن الرحيم",
            "filledWords": [{ "word": "الرحمن", "isCorrect": true }, { "word": "الرحيم", "isCorrect": true }] 
        }
        Strictly use Arabic text in fullTranscript.`,
            jsonMode: true
        });

        const text = response.text();
        console.log("[GAPS] Response received:", text.substring(0, 200));

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        console.log("[GAPS] Successfully parsed:", parsed);
        return {
            filledWords: parsed.filledWords || [],
            fullTranscript: parsed.fullTranscript || ""
        };
    } catch (e) {
        console.error("[GAPS] API or parse error:", e);
        return { filledWords: [], fullTranscript: "" };
    }
};

// --- REQUEST DEDUPLICATION & CACHING ---
// Prevents duplicate API calls from React StrictMode double-mounts,
// fast navigation, or any other source of duplicate requests.
const pendingRequests: Map<string, Promise<LevelData>> = new Map();
const responseCache: Map<string, { data: LevelData, timestamp: number }> = new Map();
const CACHE_TTL = 30_000; // 30 seconds

export const generateLevel = async (
    surah: string,
    startVerse: number = 1,
    mode: GameMode = 'CLASSIC',
    endVerse?: number
): Promise<LevelData> => {
    const cacheKey = `${surah}-${startVerse}-${endVerse}-${mode}`;

    // 1. Return cached response if still fresh
    const cached = responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`[GENERATE LEVEL] ♻️ Returning cached result for ${cacheKey}`);
        return cached.data;
    }

    // 2. If an identical request is already in flight, reuse it
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
        console.log(`[GENERATE LEVEL] ⏳ Dedup: reusing in-flight request for ${cacheKey}`);
        return pending;
    }

    // 3. Create and track the new request
    const requestPromise = (async () => {
        try {
            const result = await _generateLevelImpl(surah, startVerse, mode, endVerse);
            // Cache the result
            responseCache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;
        } finally {
            pendingRequests.delete(cacheKey);
        }
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
};

// Actual implementation (called only once per unique request)
const _generateLevelImpl = async (
    surah: string,
    startVerse: number,
    mode: GameMode,
    endVerse?: number
): Promise<LevelData> => {
    const apiKey = getApiKey();

    // HYBRID SWITCH
    if (!apiKey) {
        console.log(`[GENERATE LEVEL] No API key - using procedural generation for ${mode} mode`);
        // Ensure endVerse is set
        const finalEnd = endVerse || (startVerse + 4);
        return await generateProceduralLevel(surah, startVerse, finalEnd, mode);
    }

    console.log(`[GENERATE LEVEL] ✅ Using Gemini AI for ${mode} mode`);

    // --- LUDIC QUIZ MODE ---
    if (mode === 'QUIZ') {
        try {
            const response = await generateContentWithFallback(apiKey, {
                prompt: `Generate 5 structured quiz questions for Surah ${surah} (Verses ${startVerse}-${endVerse || startVerse + 10}).
Output Schema:
{
    "questions": [
        {
            "type": "VERSE_QUIZ",
            "quizSubType": "SCENARIO" | "PUZZLE" | "CONNECTION" | "ORDER" | "TAFSEER",
            "prompt": "The question text (Arabic) - DO NOT include the answer verse here!",
            "scenario": "REQUIRED for SCENARIO: A relatable real-life situation (Arabic)",
            "emojis": "REQUIRED for PUZZLE: 3-5 emojis matching specific words",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correctAnswer": "Exact string of correct option",
            "explanation": "Why this is correct (Arabic)",
            "verseNumber": number,
            "arabicText": "Verse text"
        }
    ]
}`,
                systemInstruction: `You are an Expert Game Designer for a Quran App.
            Your goal is to generate FUN, LUDIC, and CHALLENGING questions that connect the Quran to DAILY LIFE.
            
            ### CRITICAL RULES:
            1. ⛔ **NEVER** include the answer verse in the question prompt. The player must GUESS the verse based on the scenario/clue.
            2. 🌍 **SCENARIOS (Mawqif)**: Create relatable real-world situations where a specific verse applies.
               - ❌ Bad: "Which verse mentions patience?"
               - ✅ Good: "You are stuck in heavy traffic and feel your anger rising. Which verse reminds you that Allah is with the patient?"
            3. 🧩 **PUZZLES**: Use Emojis or Word Associations.
               - ✅ Good: "🔥 ➡️ 👠 ➡️ 🐍" (Answer: The story of Musa at the fire)
            4. 🔗 **CONNECTIONS**: Find the "Odd One Out" or "Missing Link".
            5. **LANGUAGE**: ALL Output (Questions, Options, Explanations) MUST be in **ARABIC (Fusha)**.
            6. **DISTRACTORS**: Must be plausible Quranic text or related concepts. No random/silly words.
            `,
                jsonMode: true
            });

            const text = response.text();
            const jsonStr = text.includes("```") ? text.replace(/```json/g, "").replace(/```/g, "").trim() : text;
            const data = JSON.parse(jsonStr);

            return {
                surahName: surah,
                questions: data.questions.map((q: any, idx: number) => ({
                    ...q,
                    id: `game-quiz-${Date.now()}-${idx}`,
                    points: 500,
                    type: QuestionType.VERSE_QUIZ
                }))
            };
        } catch (e) {
            console.error("Quiz Gen Error:", e);
            return await generateProceduralLevel(surah, startVerse, endVerse || startVerse + 5, mode);
        }
    }

    // --- ALL OTHER MODES (Assembly/Bridge/Stack/Surf/Survivor/Learn) ---
    // Use generateProceduralLevel which:
    // 1. Fetches real verses from the Quran API
    // 2. Makes batched AI calls for enrichment (distractors, bridge verses)
    // 3. Produces the CORRECT data structures (assemblyData, surferData, stackData)
    //    that game components expect
    const finalEnd = endVerse || (startVerse + 4);
    console.log(`[GENERATE LEVEL] Using procedural+AI hybrid for ${mode} mode (verses ${startVerse}-${finalEnd})`);
    return await generateProceduralLevel(surah, startVerse, finalEnd, mode);
};

function getQuestionType(mode: GameMode): QuestionType {
    switch (mode) {
        case 'ASSEMBLY': return QuestionType.VERSE_ASSEMBLY;
        case 'STACK': return QuestionType.VERSE_STACK;
        case 'SURF': return QuestionType.VERSE_SURFER;
        case 'SURVIVOR': return QuestionType.VERSE_SURVIVOR;
        case 'LEARN': return QuestionType.VERSE_LEARN;
        case 'QUIZ': return QuestionType.VERSE_QUIZ;
        default: return QuestionType.VERSE_BRIDGE;
    }
}