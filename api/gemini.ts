// Hybrid AI proxy.
//   • Text requests  -> DeepSeek (OpenAI-compatible Chat Completions).
//   • Audio/media    -> Gemini (multimodal) — used for mic recitation analysis.
// The provider is chosen automatically from the request payload. Keys live only on
// the server (DEEPSEEK_API_KEY / GEMINI_API_KEY) and never reach the browser.
import { GoogleGenerativeAI } from '@google/generative-ai';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

// True when the prompt carries inline audio/image (Gemini `inlineData`) parts.
function hasMedia(prompt: any): boolean {
    if (prompt == null || typeof prompt === 'string') return false;
    if (Array.isArray(prompt)) return prompt.some(hasMedia);
    if (typeof prompt === 'object') return !!prompt.inlineData;
    return false;
}

// Flatten Gemini-style parts into a single OpenAI/DeepSeek text turn.
function buildMessages(systemInstruction: string | undefined, prompt: any, jsonMode: boolean | undefined) {
    const textParts: string[] = [];
    const collect = (p: any) => {
        if (p == null) return;
        if (typeof p === 'string') { textParts.push(p); return; }
        if (Array.isArray(p)) { p.forEach(collect); return; }
        if (typeof p === 'object' && typeof p.text === 'string') textParts.push(p.text);
    };
    collect(prompt);

    let userContent = textParts.join('\n\n').trim();
    // DeepSeek JSON mode requires the literal word "json" somewhere in the prompt.
    if (jsonMode && !/json/i.test(userContent) && !/json/i.test(systemInstruction || '')) {
        userContent += '\n\nReturn the result strictly as a JSON object.';
    }

    const messages: { role: string; content: string }[] = [];
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
    messages.push({ role: 'user', content: userContent || ' ' });
    return messages;
}

async function callGemini(opts: { apiKey: string; model: string; systemInstruction?: string; prompt: any; jsonMode?: boolean; modelParams?: any }) {
    const genAI = new GoogleGenerativeAI(opts.apiKey);
    const model = genAI.getGenerativeModel({
        model: opts.model,
        systemInstruction: opts.systemInstruction,
        generationConfig: {
            responseMimeType: opts.jsonMode ? 'application/json' : 'text/plain',
            ...(opts.modelParams || {}),
        },
    });
    const result = await model.generateContent(opts.prompt);
    return result.response.text();
}

async function callDeepSeek(opts: { apiKey: string; model: string; messages: any[]; jsonMode?: boolean; modelParams?: any }) {
    const body = {
        model: opts.model,
        messages: opts.messages,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(opts.modelParams || {}),
    };
    const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`DeepSeek error ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
}

export default async function handler(request: any, response: any) {
    // CORS
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') { response.status(200).end(); return; }
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { systemInstruction, prompt, modelParams, jsonMode } = request.body;

        let text: string;
        if (hasMedia(prompt)) {
            // Audio recitation analysis -> Gemini.
            const geminiKey = process.env.GEMINI_API_KEY;
            if (!geminiKey) {
                return response.status(503).json({ error: 'Audio analysis requires GEMINI_API_KEY (not configured).' });
            }
            text = await callGemini({
                apiKey: geminiKey,
                model: process.env.GEMINI_AUDIO_MODEL || 'gemini-2.5-flash',
                systemInstruction, prompt, jsonMode, modelParams,
            });
        } else {
            // All text generation -> DeepSeek.
            const dsKey = process.env.DEEPSEEK_API_KEY;
            if (!dsKey) {
                return response.status(500).json({ error: 'Server Configuration Error: DEEPSEEK_API_KEY missing' });
            }
            text = await callDeepSeek({
                apiKey: dsKey,
                model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
                messages: buildMessages(systemInstruction, prompt, jsonMode),
                jsonMode, modelParams,
            });
        }

        return response.status(200).json({ text });
    } catch (error: any) {
        console.error('AI proxy error:', error);
        return response.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
