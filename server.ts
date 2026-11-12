import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { GoogleGenAI, Modality } from '@google/genai';
import {
  evaluateNpcCognitiveTurn,
  type NpcRelationshipState,
  type NpcSocialActionType,
} from './src/game/npcPersonas.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

type NpcVoiceGender = 'male' | 'female';

interface NpcVoiceProfile {
  gender: NpcVoiceGender;
  geminiVoiceName: 'Fenrir' | 'Charon' | 'Orus' | 'Puck' | 'Kore' | 'Aoede';
  neuralPitchMultiplier: number;
  speakingTempo: number;
  nativePlaybackRate: number;
  formantBaseHz: number;
  chestBassDb: number;
  voiceLabelRu: string;
  voiceLabelEn: string;
}

const FEMALE_NPC_IDS = new Set<string>([
  'npc_herbalist',
  'npc_water_carrier',
  'npc_companion_lyra',
  'npc_belltower_helga',
  'npc_monastery_chronicler',
  'npc_emerald_archdruid',
  'npc_emerald_guard_1',
  'npc_aether_legate',
  'npc_cauldron_seeker',
  'npc_cauldron_guard_1',
]);

const MALE_NPC_IDS = new Set<string>([
  'npc_elder',
  'npc_blacksmith',
  'npc_merchant',
  'npc_peasant_farmer',
  'npc_peasant_woodcutter',
  'npc_guard_1',
  'npc_guard_2',
  'npc_bard',
  'npc_caravan_merchant',
  'npc_fence_pass',
  'npc_companion_thorvald',
  'npc_companion_vesper',
  'npc_lord_vane',
  'npc_order_captain_mines',
  'npc_sentient_ghoul_elder',
  'npc_apprentice_erian',
  'npc_inquisitor',
  'npc_charon',
  'npc_brom',
  'npc_kael',
  'npc_village_miller',
  'npc_village_miller_apprentice',
  'npc_guard_captain',
  'npc_guard_west_bridge',
  'npc_guard_east_bridge',
  'npc_forest_ranger',
  'npc_forest_sawyer',
  'npc_cemetery_quartermaster',
  'npc_swamp_watcher',
  'npc_pass_smelter',
  'npc_solheim_keeper',
  'npc_solheim_smuggler',
  'npc_solheim_fisherman',
  'npc_solheim_guard',
  'npc_monastery_abbot',
  'npc_monastery_paladin',
  'npc_starfall_herald',
  'npc_emerald_guard_2',
  'npc_aether_guard_1',
  'npc_aether_guard_2',
  'npc_cauldron_guard_2',
  'npc_streamer_foozzee',
]);

function resolveNpcVoiceProfile(
  npcName: string,
  npcRole = '',
  npcId = ''
): NpcVoiceProfile {
  const idLower = (npcId || '').trim().toLowerCase();
  const nameLower = (npcName || '').trim().toLowerCase();
  const roleLower = (npcRole || '').trim().toLowerCase();
  const combined = `${nameLower} ${roleLower}`;

  const hasExplicitFemaleIdentity =
    FEMALE_NPC_IDS.has(idLower) ||
    nameLower.includes('марфа') ||
    nameLower.includes('marfa') ||
    nameLower.includes('травниц') ||
    nameLower.includes('herbalist') ||
    nameLower.includes('дарья') ||
    nameLower.includes('darya') ||
    nameLower.includes('лира') ||
    nameLower.includes('lyra') ||
    nameLower.includes('хельг') ||
    nameLower.includes('helga') ||
    nameLower.includes('аурели') ||
    nameLower.includes('aurelia') ||
    nameLower.includes('сестра') ||
    nameLower.includes('sister') ||
    nameLower.includes('изераэл') ||
    nameLower.includes('yserael') ||
    nameLower.includes('талисс') ||
    nameLower.includes('talissa') ||
    nameLower.includes('серафин') ||
    nameLower.includes('seraphina') ||
    nameLower.includes('алой') ||
    nameLower.includes('aloy') ||
    nameLower.includes('валья') ||
    nameLower.includes('valya') ||
    nameLower.includes('морана') ||
    nameLower.includes('morana') ||
    nameLower.includes('аделин') ||
    nameLower.includes('adelina') ||
    nameLower.includes('полуденниц') ||
    nameLower.includes('матерь трясины') ||
    nameLower.includes('хранительница') ||
    nameLower.includes('стражница') ||
    nameLower.includes('воительница') ||
    nameLower.includes('матриарх');

  const hasExplicitMaleName =
    !hasExplicitFemaleIdentity &&
    (MALE_NPC_IDS.has(idLower) ||
      nameLower.includes('foozzee') ||
      nameLower.includes('фуззи') ||
      nameLower.includes('стример') ||
      nameLower.includes('андрей') ||
      nameLower.includes('корвус') ||
      nameLower.includes('corvus') ||
      nameLower.includes('бран') ||
      nameLower.includes('боримир') ||
      nameLower.includes('bran') ||
      nameLower.includes('торн') ||
      nameLower.includes('thorn') ||
      nameLower.includes('велеслав') ||
      nameLower.includes('veleslav') ||
      nameLower.includes('мирон') ||
      nameLower.includes('степан') ||
      nameLower.includes('гуннар') ||
      nameLower.includes('рольф') ||
      nameLower.includes('корвин') ||
      nameLower.includes('corvin') ||
      nameLower.includes('радован') ||
      nameLower.includes('хорь') ||
      nameLower.includes('торвальд') ||
      nameLower.includes('thorvald') ||
      nameLower.includes('веспер') ||
      nameLower.includes('vesper') ||
      nameLower.includes('эдгар') ||
      nameLower.includes('вейн') ||
      nameLower.includes('валлен') ||
      nameLower.includes('торос') ||
      nameLower.includes('эриан') ||
      nameLower.includes('erian') ||
      nameLower.includes('лазарь') ||
      nameLower.includes('lazarus') ||
      nameLower.includes('харон') ||
      nameLower.includes('charon') ||
      nameLower.includes('бром') ||
      nameLower.includes('brom') ||
      nameLower.includes('каэль') ||
      nameLower.includes('kael') ||
      nameLower.includes('тихон') ||
      nameLower.includes('яромир') ||
      nameLower.includes('родерик') ||
      nameLower.includes('гарольд') ||
      nameLower.includes('маркус') ||
      nameLower.includes('берен') ||
      nameLower.includes('корней') ||
      nameLower.includes('кассиан') ||
      nameLower.includes('варг') ||
      nameLower.includes('дорн') ||
      nameLower.includes('хендрик') ||
      nameLower.includes('вейл') ||
      nameLower.includes('олаф') ||
      nameLower.includes('каэлум') ||
      nameLower.includes('солярис') ||
      nameLower.includes('эландр') ||
      nameLower.includes('эренд') ||
      nameLower.includes('кассиэль') ||
      nameLower.includes('люциан') ||
      nameLower.includes('рост') ||
      nameLower.includes('малакор') ||
      nameLower.includes('азраэль') ||
      nameLower.includes('ксавий'));

  const isFemale =
    hasExplicitFemaleIdentity ||
    (!hasExplicitMaleName &&
      (roleLower.includes('знахарка') ||
        roleLower.includes('жительница') ||
        roleLower.includes('лучница') ||
        roleLower.includes('друидка') ||
        roleLower.includes('охотница') ||
        roleLower.includes('дозорная') ||
        roleLower.includes('подозреваемая')));

  if (isFemale) {
    const isMatureOrCommandingFemale =
      nameLower.includes('марфа') ||
      nameLower.includes('marfa') ||
      nameLower.includes('травниц') ||
      nameLower.includes('алой') ||
      nameLower.includes('матриарх') ||
      nameLower.includes('серафин') ||
      nameLower.includes('изераэл') ||
      nameLower.includes('морана');

    if (isMatureOrCommandingFemale) {
      return {
        gender: 'female',
        geminiVoiceName: 'Kore',
        neuralPitchMultiplier: nameLower.includes('марфа') ? 0.96 : 0.99,
        speakingTempo: nameLower.includes('марфа') ? 0.97 : 1.0,
        nativePlaybackRate: 1.0,
        formantBaseHz: 215,
        chestBassDb: 0,
        voiceLabelRu: 'Женский голос · Меццо-сопрано',
        voiceLabelEn: 'Female Voice · Mezzo-Soprano',
      };
    }

    return {
      gender: 'female',
      geminiVoiceName: 'Aoede',
      neuralPitchMultiplier: 1.04,
      speakingTempo: 1.02,
      nativePlaybackRate: 1.02,
      formantBaseHz: 232,
      chestBassDb: -1,
      voiceLabelRu: 'Женский голос · Сопрано',
      voiceLabelEn: 'Female Voice · Soprano',
    };
  }

  const isDeepBassMale =
    combined.includes('кузнец') ||
    combined.includes('торн') ||
    combined.includes('thorn') ||
    combined.includes('гром') ||
    combined.includes('торвальд') ||
    combined.includes('thorvald') ||
    combined.includes('инквизитор') ||
    combined.includes('лазарь') ||
    combined.includes('бром') ||
    combined.includes('brom') ||
    combined.includes('торос') ||
    combined.includes('дорн') ||
    combined.includes('олаф') ||
    combined.includes('степан') ||
    combined.includes('малакор') ||
    combined.includes('алтарь') ||
    combined.includes('наковальня');

  if (isDeepBassMale) {
    return {
      gender: 'male',
      geminiVoiceName: 'Fenrir',
      neuralPitchMultiplier: 0.71,
      speakingTempo: 0.96,
      nativePlaybackRate: 0.96,
      formantBaseHz: 106,
      chestBassDb: 5.5,
      voiceLabelRu: 'Мужской голос · Бас-баритон',
      voiceLabelEn: 'Male Voice · Bass-Baritone',
    };
  }

  const isTenorBaritoneMale =
    combined.includes('foozzee') ||
    combined.includes('фуззи') ||
    combined.includes('стример') ||
    combined.includes('бард') ||
    combined.includes('корвин') ||
    combined.includes('эриан') ||
    combined.includes('яромир') ||
    combined.includes('подмастерье') ||
    combined.includes('адепт') ||
    combined.includes('каэль') ||
    combined.includes('велеслав') ||
    combined.includes('радован') ||
    combined.includes('хорь') ||
    combined.includes('вейл') ||
    combined.includes('кассиан');

  if (isTenorBaritoneMale) {
    return {
      gender: 'male',
      geminiVoiceName: combined.includes('велеслав') || combined.includes('радован') ? 'Orus' : 'Puck',
      neuralPitchMultiplier: 0.77,
      speakingTempo: 1.01,
      nativePlaybackRate: 1.0,
      formantBaseHz: 126,
      chestBassDb: 4.2,
      voiceLabelRu: 'Мужской голос · Тенор-баритон',
      voiceLabelEn: 'Male Voice · Tenor-Baritone',
    };
  }

  const isGuardOrCaptain =
    combined.includes('страж') ||
    combined.includes('сотник') ||
    combined.includes('капитан') ||
    combined.includes('рыцарь') ||
    combined.includes('центурион') ||
    combined.includes('дозорн') ||
    combined.includes('часовой') ||
    combined.includes('копьеносец');

  return {
    gender: 'male',
    geminiVoiceName: isGuardOrCaptain ? 'Fenrir' : 'Charon',
    neuralPitchMultiplier: isGuardOrCaptain ? 0.74 : 0.73,
    speakingTempo: 0.98,
    nativePlaybackRate: 0.98,
    formantBaseHz: 114,
    chestBassDb: 5.0,
    voiceLabelRu: 'Мужской голос · Баритон',
    voiceLabelEn: 'Male Voice · Baritone',
  };
}

interface CachedTtsAudio {
  audioBase64: string;
  audioMimeType: string;
  ttsGenderProcessed: boolean;
}

const ttsAudioCache = new Map<string, CachedTtsAudio>();
const serverNpcRelationships = new Map<string, NpcRelationshipState>();

/**
 * Wraps raw 16-bit signed PCM mono audio bytes into a standard RIFF WAV container.
 */
function pcmToWavBuffer(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timeout')), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Splits Russian text into sentence chunks <= 180 chars for fast neural TTS synthesis.
 */
function splitTextIntoTtsChunks(rawText: string, maxLen = 180): string[] {
  const cleaned = rawText
    .replace(/[*_#`~«»"[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const sentences = cleaned.split(/(?<=[.!?…;])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        const words = s.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = (sub + ' ' + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 4);
}

/**
 * Transforms an MP3 audio buffer in memory via FFmpeg so that:
 * - Male NPCs ('male') have their fundamental pitch and vocal-tract formants shifted down
 *   into natural male baritone / bass-baritone / tenor-baritone range (0.71..0.77x) while
 *   WSOLA (`atempo`) preserves 100% natural speaking speed and chest resonance EQ adds warmth.
 * - Female NPCs ('female') retain a natural female timbre with subtle character differentiation
 *   between Mezzo-Soprano (0.96..0.99x) and Soprano (1.04x).
 */
async function transformMp3WithFfmpegGenderProfile(
  mp3Buffer: Buffer,
  profile: NpcVoiceProfile
): Promise<Buffer | null> {
  const pitch = Math.max(0.65, Math.min(1.15, profile.neuralPitchMultiplier));
  const rawTempo = profile.speakingTempo / pitch;
  const tempo = Math.max(0.55, Math.min(1.95, Number(rawTempo.toFixed(3))));

  // If female voice with near-unity pitch and tempo, no transformation needed
  if (
    profile.gender === 'female' &&
    Math.abs(pitch - 1.0) < 0.015 &&
    Math.abs(tempo - 1.0) < 0.015
  ) {
    return mp3Buffer;
  }

  const eqChain =
    profile.gender === 'male'
      ? `,bass=g=${profile.chestBassDb.toFixed(1)}:f=140,treble=g=-2.2:f=4300`
      : `,treble=g=1.4:f=3200`;

  const filterGraph = `aresample=24000,asetrate=24000*${pitch.toFixed(3)},aresample=24000,atempo=${tempo}${eqChain}`;

  try {
    const processed = await withTimeout(
      new Promise<Buffer>((resolve, reject) => {
        const ff = spawn('ffmpeg', [
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'mp3',
          '-i',
          'pipe:0',
          '-af',
          filterGraph,
          '-f',
          'mp3',
          '-b:a',
          '64k',
          'pipe:1',
        ]);
        const outChunks: Buffer[] = [];
        ff.stdout.on('data', (chunk: Buffer) => outChunks.push(chunk));
        ff.on('error', (err) => reject(err));
        ff.on('close', (code) => {
          if (code === 0 && outChunks.length > 0) {
            resolve(Buffer.concat(outChunks));
          } else {
            reject(new Error(`ffmpeg exited with ${code}`));
          }
        });
        ff.stdin.on('error', () => {});
        ff.stdin.write(mp3Buffer);
        ff.stdin.end();
      }),
      2600
    );
    return processed.byteLength > 100 ? processed : null;
  } catch {
    return null;
  }
}

/**
 * Fetches neural Russian speech MP3 and shapes it according to the NPC's gender & voice profile
 * so male NPCs speak with a genuine Russian male voice and female NPCs speak with a Russian female voice.
 */
async function fetchRussianNeuralTtsFallback(
  text: string,
  profile: NpcVoiceProfile
): Promise<CachedTtsAudio | null> {
  try {
    const chunks = splitTextIntoTtsChunks(text, 175);
    if (chunks.length === 0) return null;

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ru&client=tw-ob&q=${encodeURIComponent(
        chunk
      )}`;
      const resp = await withTimeout(
        fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          },
        }),
        2800
      );
      if (!resp.ok) return null;
      const arrBuf = await resp.arrayBuffer();
      if (arrBuf.byteLength > 100) {
        buffers.push(Buffer.from(arrBuf));
      }
    }

    if (buffers.length === 0) return null;
    const combined = Buffer.concat(buffers);

    const genderShaped = await transformMp3WithFfmpegGenderProfile(combined, profile);
    if (genderShaped) {
      return {
        audioBase64: genderShaped.toString('base64'),
        audioMimeType: 'audio/mpeg',
        ttsGenderProcessed: true,
      };
    }

    return {
      audioBase64: combined.toString('base64'),
      audioMimeType: 'audio/mpeg',
      ttsGenderProcessed: profile.gender === 'female',
    };
  } catch {
    return null;
  }
}

/**
 * Synthesizes spoken Russian audio for an NPC line using:
 * 1. In-memory LRU cache (keyed by gender + voiceName + pitch + text),
 * 2. Gemini TTS (`gemini-3.8-flash-lite-tts`) with gender-matched prebuilt voice when GEMINI_API_KEY is valid,
 * 3. Server-side Russian Neural TTS + FFmpeg gender & formant shaping so male NPCs always speak with a male voice
 *    and female NPCs always speak with a female voice.
 */
async function synthesizeNpcRussianVoice(
  text: string,
  profile: NpcVoiceProfile,
  apiKey: string
): Promise<CachedTtsAudio | null> {
  const cleanText = text
    .replace(/https?:\/\/\S+/g, (url) =>
      url.includes('twitch.tv/foozzee')
        ? 'твич точка тв слэш фуззи'
        : url.includes('foozzee.ru')
        ? 'фуззи точка ру'
        : ''
    )
    .replace(/FooZzee/gi, 'Фуззи')
    .replace(/[*_#`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleanText) return null;

  const cacheKey = `${profile.gender}:${profile.geminiVoiceName}:${profile.neuralPitchMultiplier.toFixed(
    2
  )}:${cleanText.slice(0, 260)}`;
  const cached = ttsAudioCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Try Gemini TTS if API key is present
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length >= 15) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const ttsResp = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [{ parts: [{ text: cleanText.slice(0, 360) }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: profile.geminiVoiceName },
              },
            },
          },
        }),
        3800
      );
      const inlineAudio = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineAudio?.data) {
        const mime = (inlineAudio.mimeType || '').toLowerCase();
        const rawBuf = Buffer.from(inlineAudio.data, 'base64');
        const wavBase64 = mime.includes('wav')
          ? rawBuf.toString('base64')
          : pcmToWavBuffer(rawBuf, 24000, 1, 16).toString('base64');
        const result: CachedTtsAudio = {
          audioBase64: wavBase64,
          audioMimeType: 'audio/wav',
          ttsGenderProcessed: true,
        };
        if (ttsAudioCache.size > 160) {
          const firstKey = ttsAudioCache.keys().next().value;
          if (firstKey) ttsAudioCache.delete(firstKey);
        }
        ttsAudioCache.set(cacheKey, result);
        return result;
      }
    } catch {
      // Fall through to Russian Neural TTS fallback
    }
  }

  // 2. Reliable Russian Neural TTS fallback with gender & formant shaping
  const fallbackAudio = await fetchRussianNeuralTtsFallback(cleanText.slice(0, 340), profile);
  if (fallbackAudio) {
    if (ttsAudioCache.size > 160) {
      const firstKey = ttsAudioCache.keys().next().value;
      if (firstKey) ttsAudioCache.delete(firstKey);
    }
    ttsAudioCache.set(cacheKey, fallbackAudio);
    return fallbackAudio;
  }

  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Endpoint 1: Synthesize spoken Russian voice for ANY NPC dialogue node or bark
  app.post('/api/npc-tts', async (req, res) => {
    try {
      const {
        npcName = 'Житель Вальдмарка',
        npcRole = '',
        npcId = '',
        text = '',
      } = req.body ?? {};
      const apiKey = (process.env.GEMINI_API_KEY || '').trim();
      const profile = resolveNpcVoiceProfile(npcName, npcRole, npcId);
      const ttsResult = await synthesizeNpcRussianVoice(String(text || ''), profile, apiKey);

      return res.json({
        gender: profile.gender,
        voiceName: profile.geminiVoiceName,
        voiceLabelRu: profile.voiceLabelRu,
        ttsGenderProcessed: ttsResult?.ttsGenderProcessed ?? false,
        audioWavBase64: ttsResult?.audioBase64 ?? null,
        audioMimeType: ttsResult?.audioMimeType ?? 'audio/wav',
      });
    } catch {
      return res.json({
        gender: 'male',
        voiceName: 'Charon',
        voiceLabelRu: 'Мужской голос · Баритон',
        ttsGenderProcessed: false,
        audioWavBase64: null,
        audioMimeType: 'audio/wav',
      });
    }
  });

  // Endpoint 2: Interactive Russian Microphone / Full Cognitive AI Voice Chat with any NPC
  app.post('/api/npc-voice-chat', async (req, res) => {
    try {
      const {
        npcName = 'Староста Бран',
        npcRole = 'Старейшина поселения',
        npcId = '',
        npcCurrentLine = '',
        biomeName = 'Деревня Воронья Падь',
        questTitle = '',
        reputationTitle = 'Странник',
        playerText = '',
        socialAction = 'chat',
        relationshipState = null,
        audioBase64 = '',
        audioMimeType = 'audio/webm',
        history = [],
      } = req.body ?? {};

      const apiKey = (process.env.GEMINI_API_KEY || '').trim();
      const hasValidGeminiKey =
        Boolean(apiKey) && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length >= 15;
      const profile = resolveNpcVoiceProfile(npcName, npcRole, npcId);
      let transcribedUserText = String(playerText || '').trim();

      // 1. If raw microphone audio was provided without text and Gemini key is valid, transcribe via Gemini
      if (!transcribedUserText && audioBase64 && hasValidGeminiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });
          const sttResp = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.5-transcribe',
              contents: [
                {
                  inlineData: {
                    mimeType: audioMimeType || 'audio/webm',
                    data: audioBase64,
                  },
                },
                {
                  text: 'Распознай русскую речь игрока дословно без лишних комментариев. Если ничего не слышно, верни пустую строку.',
                },
              ],
            }),
            3500
          );
          transcribedUserText = (sttResp.text || '').trim();
        } catch {
          transcribedUserText = '';
        }
      }

      if (!transcribedUserText) {
        transcribedUserText = 'Здравствуй! Расскажи о себе и о том, что у тебя на душе.';
      }

      // 2. Run Autonomous Cognitive & Relationship Turn Evaluation
      const relKey = npcId || npcName || 'default';
      const priorRel: NpcRelationshipState | undefined =
        relationshipState ?? serverNpcRelationships.get(relKey);

      const cognitiveResult = evaluateNpcCognitiveTurn({
        npcName,
        npcRole,
        npcId,
        biomeName,
        questTitle,
        playerText: transcribedUserText,
        socialAction: (socialAction as NpcSocialActionType) || 'chat',
        currentRelationship: priorRel,
        history,
      });

      serverNpcRelationships.set(relKey, cognitiveResult.updatedRelationship);

      let replyText = cognitiveResult.replyText;

      // 3. When Gemini API key is configured, enhance the response with Gemini 3.8 Flash while preserving persona & relationship state
      if (hasValidGeminiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });
          const historyLines = Array.isArray(history)
            ? history
                .slice(-6)
                .map(
                  (h: { sender?: string; text?: string }) =>
                    `${h.sender === 'player' ? 'Корвус (Игрок)' : npcName}: ${h.text ?? ''}`
                )
                .join('\n')
            : '';

          const p = cognitiveResult.persona;
          const rel = cognitiveResult.updatedRelationship;
          const genderInstruction =
            profile.gender === 'female'
              ? 'Твой пол: женский. Обязательно говори о себе в женском роде.'
              : 'Твой пол: мужской. Обязательно говори о себе в мужском роде.';

          const systemInstruction = [
            `Ты — живой, мыслящий персонаж ролевой игры в мире Вальдмарк.`,
            `Твоё имя: ${p.name}. Твоя роль: ${p.role}.`,
            genderInstruction,
            `Твоя биография: ${p.biography}`,
            `Твой характер: ${p.personalityTraits.join(', ')}. Стиль речи: ${p.speechStyle}`,
            `Что ты любишь: ${p.likes.join('; ')}. Твоя тайная мечта: ${p.secretDream}`,
            p.twitchUrl ? `Твой канал на Twitch: ${p.twitchUrl} и портал ${p.communityUrl}.` : '',
            `Текущие отношения с игроком (Корвусом): статус «${rel.statusTitleRu}», дружба=${rel.affinity}/100, романтика/любовь=${rel.romance}/100, настроение: «${rel.moodLabelRu}».`,
            `Твоя внутренняя мысль сейчас: «${cognitiveResult.thoughtProcess}».`,
            `Текущий регион: ${biomeName}.`,
            questTitle ? `Активное задание игрока: ${questTitle}.` : '',
            reputationTitle ? `Известность игрока: ${reputationTitle}.` : '',
            npcCurrentLine ? `Предыдущая реплика: «${npcCurrentLine}».` : '',
            `Отвечай ТОЛЬКО на русском языке, от первого лица, глубоко, осмысленно и без шаблонных повторов (2–3 предложения, до 300 символов). Не используй звёздочки и markdown.`,
          ]
            .filter(Boolean)
            .join(' ');

          const chatResp = await withTimeout(
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: [
                historyLines ? `История разговора:\n${historyLines}\n` : '',
                `Корвус говорит тебе (действие: ${socialAction}): «${transcribedUserText}»\nТвой обдуманный ответ от лица ${p.name}:`,
              ]
                .filter(Boolean)
                .join('\n'),
              config: {
                systemInstruction,
                temperature: 0.82,
                maxOutputTokens: 220,
              },
            }),
            3800
          );
          const candidate = (chatResp.text || '')
            .replace(/[*_#`~]+/g, '')
            .replace(/^«|»$/g, '')
            .trim();
          if (candidate.length > 10) {
            replyText = candidate;
          }
        } catch {
          // Keep cognitiveResult.replyText
        }
      }

      // 4. Synthesize spoken Russian voice (Gemini TTS or FFmpeg gender-shaped Russian Neural TTS)
      const ttsResult = await synthesizeNpcRussianVoice(replyText, profile, apiKey);

      return res.json({
        transcript: transcribedUserText,
        replyText,
        thoughtProcess: cognitiveResult.thoughtProcess,
        detectedIntent: cognitiveResult.detectedIntent,
        isFarewell: cognitiveResult.isFarewell,
        affinityDelta: cognitiveResult.affinityDelta,
        romanceDelta: cognitiveResult.romanceDelta,
        relationship: cognitiveResult.updatedRelationship,
        persona: {
          id: cognitiveResult.persona.id,
          name: cognitiveResult.persona.name,
          shortName: cognitiveResult.persona.shortName,
          role: cognitiveResult.persona.role,
          gender: cognitiveResult.persona.gender,
          archetype: cognitiveResult.persona.archetype,
          biography: cognitiveResult.persona.biography,
          personalityTraits: cognitiveResult.persona.personalityTraits,
          likes: cognitiveResult.persona.likes,
          dislikes: cognitiveResult.persona.dislikes,
          secretDream: cognitiveResult.persona.secretDream,
          twitchUrl: cognitiveResult.persona.twitchUrl,
          communityUrl: cognitiveResult.persona.communityUrl,
          favoriteGames: cognitiveResult.persona.favoriteGames,
        },
        audioWavBase64: ttsResult?.audioBase64 ?? null,
        audioMimeType: ttsResult?.audioMimeType ?? 'audio/mpeg',
        gender: profile.gender,
        voiceName: profile.geminiVoiceName,
        voiceLabelRu: profile.voiceLabelRu,
        ttsGenderProcessed: ttsResult?.ttsGenderProcessed ?? false,
      });
    } catch (err) {
      const fallbackProfile = resolveNpcVoiceProfile(
        req.body?.npcName || 'Житель Вальдмарка',
        req.body?.npcRole || '',
        req.body?.npcId || ''
      );
      const fallbackCognitive = evaluateNpcCognitiveTurn({
        npcName: req.body?.npcName || 'Житель Вальдмарка',
        npcRole: req.body?.npcRole || '',
        npcId: req.body?.npcId || '',
        biomeName: req.body?.biomeName || 'Вальдмарк',
        questTitle: req.body?.questTitle || '',
        playerText: req.body?.playerText || 'Здравствуй',
        socialAction: req.body?.socialAction || 'chat',
      });
      const ttsResult = await synthesizeNpcRussianVoice(
        fallbackCognitive.replyText,
        fallbackProfile,
        ''
      );
      return res.json({
        transcript: req.body?.playerText || 'Здравствуй',
        replyText: fallbackCognitive.replyText,
        thoughtProcess: fallbackCognitive.thoughtProcess,
        detectedIntent: fallbackCognitive.detectedIntent,
        isFarewell: fallbackCognitive.isFarewell,
        affinityDelta: fallbackCognitive.affinityDelta,
        romanceDelta: fallbackCognitive.romanceDelta,
        relationship: fallbackCognitive.updatedRelationship,
        persona: fallbackCognitive.persona,
        audioWavBase64: ttsResult?.audioBase64 ?? null,
        audioMimeType: ttsResult?.audioMimeType ?? 'audio/mpeg',
        gender: fallbackProfile.gender,
        voiceName: fallbackProfile.geminiVoiceName,
        voiceLabelRu: fallbackProfile.voiceLabelRu,
        ttsGenderProcessed: ttsResult?.ttsGenderProcessed ?? false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Valdmark Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

