import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DateTime } from 'luxon';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// --- Gemini init ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const AI_MOCK = String(process.env.AI_MOCK || '').toLowerCase() === 'true' || !GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is missing. Running in mock mode.');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY ?? '');

// --- Rate limit (30 request / user / day) ---
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 30);
// Align reset to Gemini's daily quota reset (defaults to America/Los_Angeles)
const RESET_TZ = process.env.AI_RESET_TZ || 'America/Los_Angeles';
const memoryCounters = new Map(); // key -> { count, resetAt }

function identifyUser(req) {
  const headerId = req.headers['x-user-id'];
  const cookieUid = (req.headers.cookie || '').match(/(?:^|;\s*)uid=([^;]+)/)?.[1];
  const raw = headerId || cookieUid || req.ip || req.headers['x-forwarded-for'] || 'anon';
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function getNextResetAt() {
  // Next midnight in the target timezone (Gemini quota reset)
  return DateTime.now().setZone(RESET_TZ).endOf('day').toMillis();
}

function getCounter(key) {
  const resetAt = getNextResetAt();
  let rec = memoryCounters.get(key);
  if (!rec || Date.now() > rec.resetAt) {
    rec = { count: 0, resetAt };
    memoryCounters.set(key, rec);
  }
  return rec;
}

function incrementCounter(counter, key) {
  counter.count += 1;
  memoryCounters.set(key, counter);
  return counter.count;
}

function dailyLimit(req, res, next) {
  const userKey = identifyUser(req);
  const counter = getCounter(userKey);
  if (counter.count >= DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Daily AI limit reached',
      limit: DAILY_LIMIT,
      resetAt: counter.resetAt,
    });
  }
  res.locals.__aiCounter = { counter, userKey };
  next();
}

// Health endpoint
app.get('/api/ai/health', (req, res) => {
  const userKey = identifyUser(req);
  const counter = getCounter(userKey);
  res.json({
    ok: true,
    provider: AI_MOCK ? 'mock' : 'gemini',
    model: MODEL_NAME,
    used: counter.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - counter.count),
    resetAt: counter.resetAt,
    resetTz: RESET_TZ,
  });
});

function makeMockCards({ topic = 'general', language = 'en', numQuestions = 15, difficulty = 'medium' }) {
  const isHungarian = language === 'hu';
  
  const cards = Array.from({ length: Math.max(1, Math.min(50, Number(numQuestions) || 15)) }).map((_, i) => ({
    question: isHungarian 
      ? `[MOCK ${language}|${difficulty}] Mi a ${topic} alapvető jellemzője ${i + 1}?` 
      : `[MOCK ${language}|${difficulty}] What is the basic characteristic of ${topic} ${i + 1}?`,
    answers: [
      { 
        text: isHungarian 
          ? `${topic} helyes válasz 1 (${i + 1})` 
          : `${topic} correct answer 1 (${i + 1})`, 
        isCorrect: true 
      },
      { 
        text: isHungarian 
          ? `${topic} helyes válasz 2 (${i + 1})` 
          : `${topic} correct answer 2 (${i + 1})`, 
        isCorrect: true 
      },
      { 
        text: isHungarian 
          ? `${topic} rossz válasz 1 (${i + 1})` 
          : `${topic} incorrect answer 1 (${i + 1})`, 
        isCorrect: false 
      },
      { 
        text: isHungarian 
          ? `${topic} rossz válasz 2 (${i + 1})` 
          : `${topic} incorrect answer 2 (${i + 1})`, 
        isCorrect: false 
      },
      { 
        text: isHungarian 
          ? `${topic} rossz válasz 3 (${i + 1})` 
          : `${topic} incorrect answer 3 (${i + 1})`, 
        isCorrect: false 
      }
    ],
    explanation: isHungarian 
      ? `Mock magyarázat a ${i + 1}. kérdéshez: a helyes válaszok azért helyesek, mert...`
      : `Mock explanation for question ${i + 1}: the correct answers are right because...`
  }));
  return cards;
}

async function generateCards(params) {
  if (AI_MOCK) return makeMockCards(params);
  
  const { topic = 'general', difficulty = 'medium', language = 'en' } = params;
  const targetCount = 15;
  const batchSize = 5; // Generate in smaller batches to avoid token limits
  const allQuestions = [];
  
  console.log(`🎯 Generating ${targetCount} questions in ${language} language, in batches of ${batchSize}`);
  
  for (let batch = 0; batch < Math.ceil(targetCount / batchSize); batch++) {
    const questionsNeeded = Math.min(batchSize, targetCount - allQuestions.length);
    if (questionsNeeded <= 0) break;
    
    console.log(`📦 Generating batch ${batch + 1}, need ${questionsNeeded} questions`);
    
    try {
      const batchPrompt = buildBatchPrompt(topic, difficulty, questionsNeeded, language);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 20000);
      
      const result = await Promise.race([
        model.generateContent(batchPrompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), timeoutMs))
      ]);
      
      const text = result.response.text();
      console.log(`📝 Batch ${batch + 1} response length:`, text.length);
      
      // Parse the response
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          json = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found');
        }
      }
      
      if (!json.questions || !Array.isArray(json.questions)) {
        console.log(`❌ Batch ${batch + 1} has no questions array`);
        continue;
      }
      
      // Validate and add questions from this batch
      const validatedBatch = [];
      for (const q of json.questions) {
        if (!q || typeof q !== 'object' || !q.question || !Array.isArray(q.answers) || q.answers.length !== 5) {
          continue;
        }
        
        const validAnswers = q.answers.every(a => 
          a && typeof a.text === 'string' && typeof a.correct === 'boolean'
        );
        if (!validAnswers) continue;
        
        const correctCount = q.answers.filter(a => a.correct).length;
        const incorrectCount = q.answers.filter(a => !a.correct).length;
        
        if (correctCount !== 2 || incorrectCount !== 3) continue;
        
        validatedBatch.push({
          question: q.question,
          answers: q.answers.map(a => ({
            text: a.text,
            isCorrect: a.correct
          })),
          explanation: q.explanation || 'Generated by AI'
        });
      }
      
      allQuestions.push(...validatedBatch);
      console.log(`✅ Batch ${batch + 1}: added ${validatedBatch.length} valid questions (total: ${allQuestions.length}/${targetCount})`);
      
      // If we have enough questions, stop
      if (allQuestions.length >= targetCount) {
        break;
      }
      
      // Small delay between batches to avoid rate limiting
      if (batch < Math.ceil(targetCount / batchSize) - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.log(`❌ Error in batch ${batch + 1}:`, error.message);
      continue;
    }
  }
  
  // If we still don't have enough questions, fill with mock data
  while (allQuestions.length < targetCount) {
    const mockIndex = allQuestions.length;
    allQuestions.push({
      question: `[ADDITIONAL] ${topic} kérdés ${mockIndex + 1} (${difficulty} szint)`,
      answers: [
        { text: `${topic} helyes válasz 1`, isCorrect: true },
        { text: `${topic} helyes válasz 2`, isCorrect: true },
        { text: `${topic} rossz válasz 1`, isCorrect: false },
        { text: `${topic} rossz válasz 2`, isCorrect: false },
        { text: `${topic} rossz válasz 3`, isCorrect: false }
      ],
      explanation: `További kérdés a ${topic} témában (${difficulty} szint)`
    });
  }
  
  // Trim to exactly the target count
  const finalQuestions = allQuestions.slice(0, targetCount);
  console.log(`🎉 Final result: ${finalQuestions.length} questions generated`);
  
  return finalQuestions;
}

function buildBatchPrompt(topic, difficulty, count, language = 'en') {
  const languageInstructions = {
    'hu': {
      instruction: 'Generate the questions, answers, and explanations in HUNGARIAN language.',
      example: 'Example: "Mi a Java platform-függetlenségének jelentése?"'
    },
    'en': {
      instruction: 'Generate the questions, answers, and explanations in ENGLISH language.',
      example: 'Example: "What does Java platform independence mean?"'
    }
  };
  
  const langConfig = languageInstructions[language] || languageInstructions['en'];
  
  return `Generate exactly ${count} quiz questions about "${topic}" with ${difficulty} difficulty level.

${langConfig.instruction}
${langConfig.example}

The response must be in valid JSON format with exactly this structure:
{
  "questions": [
    {
      "question": "Your question here in ${language === 'hu' ? 'Hungarian' : 'English'}",
      "answers": [
        {"text": "Answer 1 in ${language === 'hu' ? 'Hungarian' : 'English'}", "correct": true},
        {"text": "Answer 2 in ${language === 'hu' ? 'Hungarian' : 'English'}", "correct": true},
        {"text": "Answer 3 in ${language === 'hu' ? 'Hungarian' : 'English'}", "correct": false},
        {"text": "Answer 4 in ${language === 'hu' ? 'Hungarian' : 'English'}", "correct": false},
        {"text": "Answer 5 in ${language === 'hu' ? 'Hungarian' : 'English'}", "correct": false}
      ],
      "explanation": "Brief explanation in ${language === 'hu' ? 'Hungarian' : 'English'} why the correct answers are right"
    }
  ]
}

Requirements:
- Generate exactly ${count} questions
- Each question must have exactly 2 correct answers and 3 incorrect answers
- All answers should be plausible and the correct answers should both be valid
- Make the questions challenging but fair for ${difficulty} level
- Provide a brief explanation for each question explaining why the correct answers are right
- Use clear, concise language
- All question text, answer text, and explanation must be in ${language === 'hu' ? 'Hungarian' : 'English'} language
- JSON structure keys (question, answers, text, correct, explanation) must remain in English
- Return only valid JSON, no additional text or formatting`;
}

app.post('/api/ai/generate-quiz', dailyLimit, async (req, res) => {
  try {
  const { topic, language, numQuestions, sourceText, testSummary, difficulty } = req.body || {};
    if (!topic && !sourceText && !testSummary) return res.status(400).json({ error: 'Provide topic or sourceText or testSummary' });
  const cards = await generateCards({ topic, language, numQuestions, sourceText, testSummary, difficulty });
    const { counter, userKey } = res.locals.__aiCounter || {};
    if (counter && userKey) incrementCounter(counter, userKey);
    res.json({ provider: 'gemini', model: MODEL_NAME, cards });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'AI error' });
  }
});

app.post('/api/ai/start-ai-test', dailyLimit, async (req, res) => {
  try {
  const { topic, language, numQuestions, sourceText, testSummary, difficulty } = req.body || {};
  const cards = await generateCards({ topic, language, numQuestions, sourceText, testSummary, difficulty });
    const test = { id: crypto.randomUUID(), type: 'AI', startedAt: new Date().toISOString(), cards };
    const { counter, userKey } = res.locals.__aiCounter || {};
    if (counter && userKey) incrementCounter(counter, userKey);
    res.json({ test });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'AI test error' });
  }
});

const port = process.env.PORT || 8787;
const server = app.listen(port, () => {
  console.log(`AI backend running at http://localhost:${port}`);
});
server.on('error', (err) => {
  console.error('Server error:', err);
});
server.on('close', () => {
  console.warn('AI backend server closed');
});
// Keep process observable in case something else would exit silently
setInterval(() => {}, 1 << 30);
