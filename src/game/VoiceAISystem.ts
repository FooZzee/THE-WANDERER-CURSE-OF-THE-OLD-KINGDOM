import {
  resolveNpcVoiceProfile,
  resolveNpcPersona,
  createInitialRelationshipState,
  evaluateNpcCognitiveTurn,
  type NpcVoiceGender,
  type NpcVoiceProfile,
  type NpcPersonaProfile,
  type NpcRelationshipState,
  type NpcSocialActionType,
} from './rules';

export interface VoiceChatTurn {
  id: string;
  sender: 'player' | 'npc';
  speakerName: string;
  text: string;
  thought?: string;
  timestamp: number;
}

export interface VoiceAIStatus {
  state: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  lastPlayerTranscript: string;
  lastUserTranscript: string;
  lastNpcReply: string;
  lastNpcThought: string;
  activeNpcName: string;
  activeNpcRole: string;
  activeNpcGender: NpcVoiceGender;
  activeNpcVoiceLabel: string;
  activeNpcPersona?: NpcPersonaProfile;
  activeNpcRelationship?: NpcRelationshipState;
  errorMessage: string | null;
  history: VoiceChatTurn[];
  conversationHistory: { role: 'user' | 'npc'; text: string; thought?: string }[];
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/**
 * Manages:
 * 1. Live Russian microphone speech capture (Web Speech API `ru-RU` + MediaRecorder audio fallback),
 * 2. Server-side Gemini & Cognitive NPC conversation (`/api/npc-voice-chat`) and dialogue node TTS (`/api/npc-tts`),
 * 3. Per-NPC relationship & romance state (friendship, quarrel, flirting, falling in love, inner thoughts),
 * 4. Guaranteed gender-accurate spoken Russian voice playback for ALL NPCs (male voice for male NPCs, female voice for female NPCs),
 * 5. Automatic dismissal of voice chat when dialogue closes or when the player bids farewell.
 */
export class VoiceAISystem {
  private status: VoiceAIStatus = {
    state: 'idle',
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    interimTranscript: '',
    lastPlayerTranscript: '',
    lastUserTranscript: '',
    lastNpcReply: '',
    lastNpcThought: '',
    activeNpcName: '',
    activeNpcRole: '',
    activeNpcGender: 'male',
    activeNpcVoiceLabel: 'Мужской голос · Баритон',
    errorMessage: null,
    history: [],
    conversationHistory: [],
  };

  private historiesByNpc: Map<string, VoiceChatTurn[]> = new Map();
  private relationshipsByNpc: Map<string, NpcRelationshipState> = new Map();
  private clientTtsCache: Map<
    string,
    { audioBase64: string; audioMimeType: string; ttsGenderProcessed: boolean }
  > = new Map();
  private recognition: SpeechRecognitionInstanceLike | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private activeAudioElement: HTMLAudioElement | null = null;
  private voiceAudioCtx: AudioContext | null = null;
  private activeBufferSource: AudioBufferSourceNode | null = null;
  private autoDismissTimer: number | null = null;
  private speechFallbackTimer: number | null = null;
  private pendingAutoCloseOnFinish = false;
  private speechRequestId = 0;
  private onStateChange: () => void;
  private onVoiceConversationComplete?: () => void;
  private unlockAudioBound: () => void;
  private pendingContext: {
    npcName: string;
    npcRole: string;
    npcCurrentLine: string;
    biomeName: string;
    questTitle: string;
    reputationTitle: string;
    onNpcReply?: (replyText: string, transcript: string) => void;
  } | null = null;

  constructor(
    onStateChange: () => void = () => {},
    onVoiceConversationComplete?: () => void
  ) {
    this.onStateChange = onStateChange;
    this.onVoiceConversationComplete = onVoiceConversationComplete;
    this.unlockAudioBound = () => {
      const ctx = this.getOrCreateAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.unlockAudioBound, { passive: true });
      window.addEventListener('keydown', this.unlockAudioBound, { passive: true });
    }
  }

  public setOnVoiceConversationComplete(cb: () => void): void {
    this.onVoiceConversationComplete = cb;
  }

  private getOrCreateAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.voiceAudioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        try {
          this.voiceAudioCtx = new Ctor();
        } catch {
          this.voiceAudioCtx = null;
        }
      }
    }
    if (this.voiceAudioCtx && this.voiceAudioCtx.state === 'suspended') {
      this.voiceAudioCtx.resume().catch(() => {});
    }
    return this.voiceAudioCtx;
  }

  private computeCurrentState(): 'idle' | 'listening' | 'processing' | 'speaking' | 'error' {
    if (this.status.isListening) return 'listening';
    if (this.status.isProcessing) return 'processing';
    if (this.status.isSpeaking) return 'speaking';
    if (this.status.errorMessage) return 'error';
    return 'idle';
  }

  public getOrCreateRelationship(npcName: string, npcRole = ''): NpcRelationshipState {
    const persona = resolveNpcPersona(npcName, npcRole);
    const key = persona.id || npcName || 'default';
    let rel = this.relationshipsByNpc.get(key);
    if (!rel) {
      rel = createInitialRelationshipState(persona);
      this.relationshipsByNpc.set(key, rel);
    }
    return rel;
  }

  public exportRelationships(): Record<string, NpcRelationshipState> {
    const result: Record<string, NpcRelationshipState> = {};
    for (const [key, value] of this.relationshipsByNpc.entries()) {
      result[key] = { ...value };
    }
    return result;
  }

  public importRelationships(saved: Record<string, NpcRelationshipState> | undefined): void {
    if (!saved) return;
    for (const [key, value] of Object.entries(saved)) {
      if (value && typeof value.affinity === 'number' && typeof value.romance === 'number') {
        this.relationshipsByNpc.set(key, { ...value });
      }
    }
  }

  public getStatus(npcName?: string, npcRole?: string): VoiceAIStatus {
    const resolvedName = npcName || this.status.activeNpcName || 'Житель Вальдмарка';
    const resolvedRole = npcRole || this.status.activeNpcRole || 'Собеседник';
    const profile = resolveNpcVoiceProfile(resolvedName, resolvedRole);
    const persona = resolveNpcPersona(resolvedName, resolvedRole);
    const rel = this.getOrCreateRelationship(resolvedName, resolvedRole);
    const key = npcName || this.status.activeNpcName || 'default';
    const history = this.historiesByNpc.get(key) ?? [];
    const userTranscript =
      this.status.interimTranscript || this.status.lastPlayerTranscript || '';
    const npcReply = this.status.lastNpcReply || '';
    const npcThought = this.status.lastNpcThought || rel.lastThought || '';

    return {
      ...this.status,
      state: this.computeCurrentState(),
      activeNpcName: resolvedName,
      activeNpcRole: resolvedRole,
      activeNpcGender: profile.gender,
      activeNpcVoiceLabel: profile.voiceLabelRu,
      activeNpcPersona: persona,
      activeNpcRelationship: { ...rel },
      lastPlayerTranscript: userTranscript,
      lastUserTranscript: userTranscript,
      lastNpcReply: npcReply,
      lastNpcThought: npcThought,
      history: [...history],
      conversationHistory: history.map((h) => ({
        role: h.sender === 'player' ? 'user' : 'npc',
        text: h.text,
        thought: h.thought,
      })),
    };
  }

  /**
   * Clears any visible voice chat banners/transcripts and stops ongoing voice playback.
   * Called when dialogue closes or when a voice exchange concludes.
   */
  public clearConversationOverlay(): void {
    this.speechRequestId++;
    this.clearTimers();
    this.stopSpeaking(false);
    this.status.isListening = false;
    this.status.isProcessing = false;
    this.status.isSpeaking = false;
    this.status.interimTranscript = '';
    this.status.lastPlayerTranscript = '';
    this.status.lastUserTranscript = '';
    this.status.lastNpcReply = '';
    this.status.lastNpcThought = '';
    this.status.errorMessage = null;
    this.onStateChange();
  }

  private clearTimers(): void {
    if (this.autoDismissTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
    if (this.speechFallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.speechFallbackTimer);
      this.speechFallbackTimer = null;
    }
  }

  private schedulePostVoiceAutoClose(shouldCloseDialogue: boolean): void {
    if (typeof window === 'undefined') return;
    if (this.autoDismissTimer !== null) {
      window.clearTimeout(this.autoDismissTimer);
    }
    this.autoDismissTimer = window.setTimeout(() => {
      this.autoDismissTimer = null;
      // Do not close if the player started another recording or request in the meantime
      if (this.status.isListening || this.status.isProcessing) return;
      this.status.lastNpcReply = '';
      this.status.lastPlayerTranscript = '';
      this.status.lastUserTranscript = '';
      this.status.interimTranscript = '';
      this.status.errorMessage = null;
      this.onStateChange();
      if (shouldCloseDialogue && this.onVoiceConversationComplete) {
        this.onVoiceConversationComplete();
      }
    }, 650);
  }

  public setActiveNpc(npcName: string, npcRole = ''): void {
    if (this.status.activeNpcName !== npcName) {
      const profile = resolveNpcVoiceProfile(npcName, npcRole);
      const rel = this.getOrCreateRelationship(npcName, npcRole);
      this.status.activeNpcName = npcName;
      if (npcRole) this.status.activeNpcRole = npcRole;
      this.status.activeNpcGender = profile.gender;
      this.status.activeNpcVoiceLabel = profile.voiceLabelRu;
      this.status.errorMessage = null;
      this.status.lastNpcReply = '';
      this.status.lastNpcThought = rel.lastThought;
      this.status.lastPlayerTranscript = '';
      this.status.lastUserTranscript = '';
      this.onStateChange();
    }
  }

  /**
   * Speaks any scripted NPC dialogue node or companion line out loud in Russian!
   * Ensures every character in the game answers with both text AND a gender-matched voice.
   */
  public async speakNpcDialogueLine(
    npcName: string,
    npcRole: string,
    text: string
  ): Promise<void> {
    const cleanText = (text || '')
      .replace(/[*_#`~«»]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return;

    const reqId = ++this.speechRequestId;
    const profile = resolveNpcVoiceProfile(npcName, npcRole);
    this.clearTimers();
    this.stopSpeaking(false);
    this.status.activeNpcName = npcName;
    this.status.activeNpcRole = npcRole;
    this.status.activeNpcGender = profile.gender;
    this.status.activeNpcVoiceLabel = profile.voiceLabelRu;

    const cacheKey = `${profile.gender}:${npcName}:${cleanText.slice(0, 220)}`;
    const cached = this.clientTtsCache.get(cacheKey);
    if (cached) {
      if (reqId !== this.speechRequestId) return;
      await this.playNpcVoice(
        cleanText,
        cached.audioBase64,
        cached.audioMimeType,
        npcName,
        npcRole,
        false,
        cached.ttsGenderProcessed
      );
      return;
    }

    try {
      const response = await fetch('/api/npc-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName,
          npcRole,
          text: cleanText,
        }),
      });
      if (reqId !== this.speechRequestId || this.status.isListening || this.status.isProcessing) {
        return;
      }
      if (response.ok) {
        const data = (await response.json()) as {
          audioWavBase64?: string | null;
          audioMimeType?: string;
          ttsGenderProcessed?: boolean;
        };
        if (reqId !== this.speechRequestId || this.status.isListening || this.status.isProcessing) {
          return;
        }
        if (data.audioWavBase64) {
          const mime = data.audioMimeType || 'audio/mpeg';
          const genderProcessed = Boolean(data.ttsGenderProcessed);
          this.clientTtsCache.set(cacheKey, {
            audioBase64: data.audioWavBase64,
            audioMimeType: mime,
            ttsGenderProcessed: genderProcessed,
          });
          await this.playNpcVoice(
            cleanText,
            data.audioWavBase64,
            mime,
            npcName,
            npcRole,
            false,
            genderProcessed
          );
          return;
        }
      }
    } catch {
      // Fallback to browser TTS + WebAudio formant voice below
    }

    if (reqId !== this.speechRequestId || this.status.isListening || this.status.isProcessing) {
      return;
    }
    await this.playNpcVoice(cleanText, null, 'audio/wav', npcName, npcRole, false, false);
  }

  public async toggleMicrophone(
    npcNameOrContext:
      | string
      | {
          npcName: string;
          npcRole: string;
          npcCurrentLine?: string;
          biomeName: string;
          questTitle: string;
          reputationTitle?: string;
          onNpcReply?: (replyText: string, transcript: string) => void;
        },
    npcRole = 'Житель Вальдмарка',
    biomeName = 'Вальдмарк',
    questTitle = 'Исследование Вальдмарка'
  ): Promise<void> {
    const context =
      typeof npcNameOrContext === 'string'
        ? {
            npcName: npcNameOrContext,
            npcRole,
            npcCurrentLine: '',
            biomeName,
            questTitle,
            reputationTitle: 'Странник',
          }
        : {
            npcName: npcNameOrContext.npcName,
            npcRole: npcNameOrContext.npcRole,
            npcCurrentLine: npcNameOrContext.npcCurrentLine ?? '',
            biomeName: npcNameOrContext.biomeName,
            questTitle: npcNameOrContext.questTitle,
            reputationTitle: npcNameOrContext.reputationTitle ?? 'Странник',
            onNpcReply: npcNameOrContext.onNpcReply,
          };

    if (this.status.isListening) {
      await this.stopListeningAndSend();
    } else {
      await this.startListening(context);
    }
  }

  public async sendTextMessage(
    playerText: string,
    npcName: string,
    npcRole: string,
    biomeName: string,
    questTitle: string,
    socialAction: NpcSocialActionType = 'chat'
  ): Promise<string> {
    await this.sendVoiceOrTextMessage({
      npcName,
      npcRole,
      npcCurrentLine: '',
      biomeName,
      questTitle,
      reputationTitle: 'Странник',
      playerText,
      socialAction,
    });
    return this.status.lastNpcReply;
  }

  public async startListening(context: {
    npcName: string;
    npcRole: string;
    npcCurrentLine: string;
    biomeName: string;
    questTitle: string;
    reputationTitle: string;
    onNpcReply?: (replyText: string, transcript: string) => void;
  }): Promise<void> {
    if (this.status.isListening || this.status.isProcessing) return;

    this.speechRequestId++;
    const profile = resolveNpcVoiceProfile(context.npcName, context.npcRole);
    this.clearTimers();
    this.stopSpeaking(false);
    this.getOrCreateAudioContext();
    this.pendingContext = context;
    this.status.activeNpcName = context.npcName;
    this.status.activeNpcRole = context.npcRole;
    this.status.activeNpcGender = profile.gender;
    this.status.activeNpcVoiceLabel = profile.voiceLabelRu;
    this.status.interimTranscript = '';
    this.status.errorMessage = null;

    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstanceLike })
            .SpeechRecognition ??
          (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstanceLike })
            .webkitSpeechRecognition)
        : undefined;

    let startedAnyCapture = false;

    // 1. Start MediaRecorder if available so raw Russian audio is captured as fallback/primary
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.recordedChunks = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
        this.mediaRecorder = mimeType
          ? new MediaRecorder(this.mediaStream, { mimeType })
          : new MediaRecorder(this.mediaStream);
        this.mediaRecorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            this.recordedChunks.push(ev.data);
          }
        };
        this.mediaRecorder.start(200);
        startedAnyCapture = true;
      } catch {
        // Microphone stream might be unavailable in headless browser; SpeechRecognition or text input still works
      }
    }

    // 2. Start browser SpeechRecognition ('ru-RU') for instant live Russian transcript
    if (SpeechRecognitionCtor) {
      try {
        const rec = new SpeechRecognitionCtor();
        rec.lang = 'ru-RU';
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 1;

        rec.onresult = (event: SpeechRecognitionEventLike) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + ' ';
          }
          this.status.interimTranscript = fullText.trim();
          this.onStateChange();
        };

        rec.onerror = () => {
          // Handled gracefully when stopping
        };

        rec.start();
        this.recognition = rec;
        startedAnyCapture = true;
      } catch {
        this.recognition = null;
      }
    }

    if (!startedAnyCapture) {
      this.status.errorMessage =
        'Микрофон недоступен в текущем окружении. Введите реплику текстом или проверьте разрешение микрофона.';
      this.onStateChange();
      return;
    }

    this.status.isListening = true;
    this.onStateChange();
  }

  public async stopListeningAndSend(): Promise<void> {
    if (!this.status.isListening) return;
    this.status.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }

    let audioBase64 = '';
    let audioMimeType = 'audio/webm';

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      const recorder = this.mediaRecorder;
      audioMimeType = recorder.mimeType || 'audio/webm';
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;

    if (this.recordedChunks.length > 0) {
      const blob = new Blob(this.recordedChunks, { type: audioMimeType });
      this.recordedChunks = [];
      if (blob.size > 0) {
        audioBase64 = await this.blobToBase64(blob);
      }
    }

    const capturedText = this.status.interimTranscript.trim();
    this.status.interimTranscript = '';
    this.onStateChange();

    if (!capturedText && !audioBase64) {
      this.status.errorMessage = 'Речь не распознана. Попробуйте произнести фразу громче.';
      this.onStateChange();
      this.schedulePostVoiceAutoClose(false);
      return;
    }

    if (this.pendingContext) {
      await this.sendVoiceOrTextMessage({
        ...this.pendingContext,
        playerText: capturedText,
        audioBase64,
        audioMimeType,
      });
    }
  }

  public async sendVoiceOrTextMessage(params: {
    npcName: string;
    npcRole: string;
    npcCurrentLine: string;
    biomeName: string;
    questTitle: string;
    reputationTitle: string;
    playerText: string;
    socialAction?: NpcSocialActionType;
    audioBase64?: string;
    audioMimeType?: string;
    onNpcReply?: (replyText: string, transcript: string) => void;
  }): Promise<void> {
    if (this.status.isProcessing) return;

    this.speechRequestId++;
    const profile = resolveNpcVoiceProfile(params.npcName, params.npcRole);
    const persona = resolveNpcPersona(params.npcName, params.npcRole);
    const currentRel = this.getOrCreateRelationship(params.npcName, params.npcRole);
    const relKey = persona.id || params.npcName || 'default';

    this.clearTimers();
    this.stopSpeaking(false);
    this.getOrCreateAudioContext();
    this.status.isProcessing = true;
    this.status.errorMessage = null;
    this.status.activeNpcName = params.npcName;
    this.status.activeNpcRole = params.npcRole;
    this.status.activeNpcGender = profile.gender;
    this.status.activeNpcVoiceLabel = profile.voiceLabelRu;
    if (params.playerText) {
      this.status.lastPlayerTranscript = params.playerText;
      this.status.lastUserTranscript = params.playerText;
    }
    this.onStateChange();

    const npcKey = params.npcName || 'default';
    const existingHistory = this.historiesByNpc.get(npcKey) ?? [];

    try {
      const response = await fetch('/api/npc-voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName: params.npcName,
          npcRole: params.npcRole,
          npcId: persona.id,
          npcCurrentLine: params.npcCurrentLine,
          biomeName: params.biomeName,
          questTitle: params.questTitle,
          reputationTitle: params.reputationTitle,
          playerText: params.playerText,
          socialAction: params.socialAction ?? 'chat',
          relationshipState: currentRel,
          audioBase64: params.audioBase64 ?? '',
          audioMimeType: params.audioMimeType ?? 'audio/webm',
          history: existingHistory.slice(-8).map((h) => ({
            sender: h.sender,
            text: h.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        transcript?: string;
        replyText?: string;
        thoughtProcess?: string;
        isFarewell?: boolean;
        relationship?: NpcRelationshipState;
        audioWavBase64?: string | null;
        audioMimeType?: string;
        ttsGenderProcessed?: boolean;
      };

      const finalTranscript =
        (data.transcript || params.playerText || 'Здравствуй').trim();

      let replyText = (data.replyText || '').trim();
      let thoughtProcess = (data.thoughtProcess || '').trim();
      let shouldCloseOnFinish = Boolean(data.isFarewell);

      if (data.relationship) {
        this.relationshipsByNpc.set(relKey, data.relationship);
      } else {
        const localEval = evaluateNpcCognitiveTurn({
          npcName: params.npcName,
          npcRole: params.npcRole,
          npcId: persona.id,
          biomeName: params.biomeName,
          questTitle: params.questTitle,
          playerText: finalTranscript,
          socialAction: params.socialAction ?? 'chat',
          currentRelationship: currentRel,
          history: existingHistory,
        });
        this.relationshipsByNpc.set(relKey, localEval.updatedRelationship);
        if (!replyText) replyText = localEval.replyText;
        if (!thoughtProcess) thoughtProcess = localEval.thoughtProcess;
        shouldCloseOnFinish = localEval.isFarewell;
      }

      const updatedHistory: VoiceChatTurn[] = [
        ...existingHistory,
        {
          id: `p-${Date.now()}`,
          sender: 'player' as const,
          speakerName: 'Корвус',
          text: finalTranscript,
          timestamp: Date.now(),
        },
        {
          id: `n-${Date.now() + 1}`,
          sender: 'npc' as const,
          speakerName: params.npcName,
          text: replyText,
          thought: thoughtProcess,
          timestamp: Date.now() + 1,
        },
      ].slice(-14);

      this.historiesByNpc.set(npcKey, updatedHistory);
      this.status.lastPlayerTranscript = finalTranscript;
      this.status.lastUserTranscript = finalTranscript;
      this.status.lastNpcReply = replyText;
      this.status.lastNpcThought = thoughtProcess;
      this.status.isProcessing = false;
      this.onStateChange();

      if (params.onNpcReply) {
        params.onNpcReply(replyText, finalTranscript);
      }

      await this.playNpcVoice(
        replyText,
        data.audioWavBase64 ?? null,
        data.audioMimeType || 'audio/wav',
        params.npcName,
        params.npcRole,
        shouldCloseOnFinish,
        Boolean(data.ttsGenderProcessed)
      );
    } catch {
      const fallbackTranscript = (params.playerText || 'Здравствуй!').trim();
      const localCognitive = evaluateNpcCognitiveTurn({
        npcName: params.npcName,
        npcRole: params.npcRole,
        npcId: persona.id,
        biomeName: params.biomeName,
        questTitle: params.questTitle,
        playerText: fallbackTranscript,
        socialAction: params.socialAction ?? 'chat',
        currentRelationship: currentRel,
        history: existingHistory,
      });

      this.relationshipsByNpc.set(relKey, localCognitive.updatedRelationship);

      const updatedHistory: VoiceChatTurn[] = [
        ...existingHistory,
        {
          id: `p-${Date.now()}`,
          sender: 'player' as const,
          speakerName: 'Корвус',
          text: fallbackTranscript,
          timestamp: Date.now(),
        },
        {
          id: `n-${Date.now() + 1}`,
          sender: 'npc' as const,
          speakerName: params.npcName,
          text: localCognitive.replyText,
          thought: localCognitive.thoughtProcess,
          timestamp: Date.now() + 1,
        },
      ].slice(-14);

      this.historiesByNpc.set(npcKey, updatedHistory);
      this.status.lastPlayerTranscript = fallbackTranscript;
      this.status.lastUserTranscript = fallbackTranscript;
      this.status.lastNpcReply = localCognitive.replyText;
      this.status.lastNpcThought = localCognitive.thoughtProcess;
      this.status.isProcessing = false;
      this.onStateChange();

      if (params.onNpcReply) {
        params.onNpcReply(localCognitive.replyText, fallbackTranscript);
      }

      await this.playNpcVoice(
        localCognitive.replyText,
        null,
        'audio/wav',
        params.npcName,
        params.npcRole,
        localCognitive.isFarewell,
        false
      );
    }
  }

  /**
   * Client-side Hann-windowed WSOLA time-compressor used when raw unshifted female fallback audio
   * needs to be converted into a male baritone in browser memory without slowing down speech tempo.
   */
  private applyClientWsolaTimeCompress(
    ctx: AudioContext,
    inputBuffer: AudioBuffer,
    speedupFactor: number
  ): AudioBuffer {
    if (Math.abs(speedupFactor - 1.0) < 0.04) return inputBuffer;
    const sampleRate = inputBuffer.sampleRate;
    const inData = inputBuffer.getChannelData(0);
    const inLen = inData.length;
    const outLen = Math.max(256, Math.floor(inLen / speedupFactor));
    const outBuffer = ctx.createBuffer(1, outLen, sampleRate);
    const outData = outBuffer.getChannelData(0);

    const winSize = Math.floor(sampleRate * 0.024); // 24ms window
    const halfWin = Math.floor(winSize / 2);
    const searchRange = Math.floor(sampleRate * 0.008); // 8ms pitch alignment search
    let outPos = 0;

    while (outPos + winSize < outLen) {
      const targetInPos = Math.floor(outPos * speedupFactor);
      let bestOffset = 0;
      if (outPos > 0 && targetInPos + winSize + searchRange < inLen) {
        let bestCorr = -Infinity;
        for (let d = -searchRange; d <= searchRange; d += 2) {
          const cand = targetInPos + d;
          if (cand < 0 || cand + halfWin >= inLen) continue;
          let corr = 0;
          for (let k = 0; k < halfWin; k += 4) {
            corr += outData[outPos + k] * inData[cand + k];
          }
          if (corr > bestCorr) {
            bestCorr = corr;
            bestOffset = d;
          }
        }
      }

      const actualIn = Math.max(0, Math.min(inLen - winSize, targetInPos + bestOffset));
      for (let i = 0; i < winSize; i++) {
        const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
        outData[outPos + i] += inData[actualIn + i] * hann;
      }
      outPos += halfWin;
    }

    return outBuffer;
  }

  /**
   * Plays the NPC's Russian voice response with strict gender accuracy:
   * - Male NPCs ('male') are voiced by a male baritone / bass-baritone / tenor-baritone voice.
   * - Female NPCs ('female') are voiced by a female mezzo-soprano / soprano voice.
   */
  public async playNpcVoice(
    replyText: string,
    audioBase64: string | null,
    audioMimeType = 'audio/wav',
    npcName = '',
    npcRole = '',
    autoCloseAfterFinish = false,
    ttsGenderProcessed = false
  ): Promise<void> {
    const playReqId = ++this.speechRequestId;
    const resolvedName = npcName || this.status.activeNpcName;
    const resolvedRole = npcRole || this.status.activeNpcRole;
    const profile = resolveNpcVoiceProfile(resolvedName, resolvedRole);

    this.stopSpeaking(false);
    this.pendingAutoCloseOnFinish = autoCloseAfterFinish;
    this.status.activeNpcGender = profile.gender;
    this.status.activeNpcVoiceLabel = profile.voiceLabelRu;
    this.status.isSpeaking = true;
    this.onStateChange();

    let finished = false;
    const finishSpeaking = () => {
      if (finished) return;
      finished = true;
      if (this.speechFallbackTimer !== null && typeof window !== 'undefined') {
        window.clearTimeout(this.speechFallbackTimer);
        this.speechFallbackTimer = null;
      }
      const shouldAutoClose = this.pendingAutoCloseOnFinish;
      this.pendingAutoCloseOnFinish = false;
      this.status.isSpeaking = false;
      this.activeAudioElement = null;
      this.activeBufferSource = null;
      this.onStateChange();
      if (shouldAutoClose) {
        this.schedulePostVoiceAutoClose(true);
      }
    };

    // If the server already shaped the gender & formants (via Gemini TTS or server FFmpeg),
    // play at 1.0x so we never double-shift; otherwise apply client-side pitch & WSOLA shaping.
    const effectivePlaybackRate = ttsGenderProcessed
      ? 1.0
      : profile.neuralPitchMultiplier;

    // 1. Primary: Decode and play via Web Audio API AudioContext
    if (audioBase64) {
      const ctx = this.getOrCreateAudioContext();
      if (ctx) {
        try {
          if (ctx.state === 'suspended') {
            void ctx.resume().catch(() => {});
          }
          const binaryString = window.atob(audioBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const decodedBuffer = await Promise.race([
            ctx.decodeAudioData(bytes.buffer.slice(0)),
            new Promise<AudioBuffer>((_, reject) =>
              setTimeout(() => reject(new Error('decodeAudioData timeout')), 450)
            ),
          ]);
          if (playReqId !== this.speechRequestId || !this.status.isSpeaking) {
            return;
          }

          // If server did not pre-process gender for a male NPC, time-compress via WSOLA first
          // so resampling at neuralPitchMultiplier (0.71..0.77) shifts pitch+formants to male baritone at 1.0x speed
          const playBuffer =
            !ttsGenderProcessed && profile.gender === 'male'
              ? this.applyClientWsolaTimeCompress(
                  ctx,
                  decodedBuffer,
                  profile.speakingTempo / profile.neuralPitchMultiplier
                )
              : decodedBuffer;

          const source = ctx.createBufferSource();
          source.buffer = playBuffer;
          source.playbackRate.value = effectivePlaybackRate;

          // Gender-tuned vocal EQ filter (warm chest resonance for male, clear presence for female)
          const eqFilter = ctx.createBiquadFilter();
          if (profile.gender === 'male') {
            eqFilter.type = 'lowshelf';
            eqFilter.frequency.value = 145;
            eqFilter.gain.value = ttsGenderProcessed ? 2.2 : profile.chestBassDb;
          } else {
            eqFilter.type = 'highshelf';
            eqFilter.frequency.value = 3000;
            eqFilter.gain.value = 1.5;
          }

          const gainNode = ctx.createGain();
          gainNode.gain.value = 1.2;
          source.connect(eqFilter);
          eqFilter.connect(gainNode);
          gainNode.connect(ctx.destination);

          this.activeBufferSource = source;
          source.onended = () => {
            if (this.activeBufferSource === source) {
              finishSpeaking();
            }
          };

          // Guaranteed completion timer in case browser AudioContext is suspended/throttled
          const durationMs = Math.max(
            600,
            Math.min(
              14000,
              Math.ceil((playBuffer.duration / effectivePlaybackRate) * 1000) + 250
            )
          );
          if (typeof window !== 'undefined') {
            this.speechFallbackTimer = window.setTimeout(() => {
              finishSpeaking();
            }, durationMs);
          }

          source.start(0);
          return;
        } catch {
          this.activeBufferSource = null;
        }
      }

      if (playReqId !== this.speechRequestId || !this.status.isSpeaking) {
        return;
      }

      // 2. Secondary: HTMLAudioElement fallback
      if (typeof Audio !== 'undefined') {
        try {
          const audio = new Audio(`data:${audioMimeType};base64,${audioBase64}`);
          if (!ttsGenderProcessed) {
            (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = false;
          }
          audio.playbackRate = effectivePlaybackRate;
          this.activeAudioElement = audio;
          audio.onended = () => finishSpeaking();
          audio.onerror = () => {
            this.activeAudioElement = null;
            this.speakWithBrowserRussianTTS(replyText, profile, finishSpeaking);
          };
          await Promise.race([
            audio.play(),
            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error('audio.play timeout')), 350)
            ),
          ]);
          return;
        } catch {
          this.activeAudioElement = null;
        }
      }
    }

    if (playReqId !== this.speechRequestId || !this.status.isSpeaking) {
      return;
    }

    // 3. Tertiary: Browser Russian SpeechSynthesis + WebAudio vocal resonance
    this.speakWithBrowserRussianTTS(replyText, profile, finishSpeaking);
  }

  private speakWithBrowserRussianTTS(
    text: string,
    profile: NpcVoiceProfile,
    onDone: () => void
  ): void {
    // Emit subtle WebAudio vocal formant cadence matched to the NPC's gender
    this.playFormantVocalCadence(text, profile);

    const estDurationMs = Math.max(1400, Math.min(7500, text.length * 52));
    if (typeof window !== 'undefined') {
      this.speechFallbackTimer = window.setTimeout(() => {
        onDone();
      }, estDurationMs);
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = Math.max(0.88, Math.min(1.12, profile.speakingTempo));
      utterance.pitch = profile.gender === 'female' ? 1.16 : 0.68;

      const voices = window.speechSynthesis.getVoices();
      const ruVoices = voices.filter((v) => v.lang.toLowerCase().includes('ru'));
      if (ruVoices.length > 0) {
        const preferredGenderTokens =
          profile.gender === 'male'
            ? ['dmitry', 'pavel', 'yuri', 'maxim', 'boris', 'aleksandr', 'male', 'муж']
            : ['svetlana', 'dariya', 'irina', 'katya', 'elena', 'milena', 'tatyana', 'female', 'жен'];
        const genderMatchedVoice = ruVoices.find((v) => {
          const n = v.name.toLowerCase();
          return preferredGenderTokens.some((tok) => n.includes(tok));
        });
        utterance.voice = genderMatchedVoice ?? ruVoices[0];
      }

      utterance.onend = () => onDone();
      utterance.onerror = () => onDone();

      window.speechSynthesis.speak(utterance);
    } catch {
      // Timer will invoke onDone()
    }
  }

  /**
   * Synthesizes a gender-accurate formant voice cadence in Web Audio API as a hardware-independent
   * backup when offline or when the OS lacks Russian speech packs.
   */
  private playFormantVocalCadence(text: string, profile: NpcVoiceProfile): void {
    const ctx = this.getOrCreateAudioContext();
    if (!ctx) return;
    try {
      const syllables = Math.max(3, Math.min(18, Math.ceil(text.length / 7)));
      const baseFreq = profile.formantBaseHz;
      const formantCenterBase = profile.gender === 'female' ? 680 : 440;
      const now = ctx.currentTime;

      for (let i = 0; i < syllables; i++) {
        const start = now + i * 0.13;
        const dur = 0.095;
        const osc = ctx.createOscillator();
        const formant = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        const charCode = text.charCodeAt((i * 5) % text.length) || 1072;
        const semitoneOffset = ((charCode % 7) - 3) * 0.7;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(
          baseFreq * Math.pow(2, semitoneOffset / 12),
          start
        );

        formant.type = 'bandpass';
        formant.frequency.setValueAtTime(
          formantCenterBase + (charCode % 5) * (profile.gender === 'female' ? 160 : 110),
          start
        );
        formant.Q.setValueAtTime(3.2, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.035, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(formant);
        formant.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur + 0.01);
      }
    } catch {
      // Ignore audio errors
    }
  }

  public stopSpeaking(triggerPendingAutoClose = true): void {
    if (this.speechFallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.speechFallbackTimer);
      this.speechFallbackTimer = null;
    }
    if (this.activeBufferSource) {
      try {
        this.activeBufferSource.onended = null;
        this.activeBufferSource.stop();
        this.activeBufferSource.disconnect();
      } catch {
        // Ignore
      }
      this.activeBufferSource = null;
    }
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.onended = null;
        this.activeAudioElement.onerror = null;
        this.activeAudioElement.pause();
        this.activeAudioElement.currentTime = 0;
      } catch {
        // Ignore
      }
      this.activeAudioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    const wasAutoClosePending = this.pendingAutoCloseOnFinish;
    this.pendingAutoCloseOnFinish = false;
    if (this.status.isSpeaking) {
      this.status.isSpeaking = false;
      this.onStateChange();
    }
    if (triggerPendingAutoClose && wasAutoClosePending) {
      this.schedulePostVoiceAutoClose(true);
    }
  }

  public dispose(): void {
    this.clearTimers();
    this.stopSpeaking(false);
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.unlockAudioBound);
      window.removeEventListener('keydown', this.unlockAudioBound);
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore
      }
    }
    this.mediaRecorder = null;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.voiceAudioCtx) {
      this.voiceAudioCtx.close().catch(() => {});
      this.voiceAudioCtx = null;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = typeof reader.result === 'string' ? reader.result : '';
        const commaIdx = res.indexOf(',');
        resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  }
}
