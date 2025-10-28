const { create } = require("zustand");

export const teachers = ["Nanami", "Naoki", "Daichi"];

export const languages = [
  { code: "ja-JP", name: "Japanese", script: "jp" },
  { code: "en-US", name: "English", script: "latin" },
  { code: "es-ES", name: "Spanish", script: "latin" },
  { code: "fr-FR", name: "French", script: "latin" },
  { code: "de-DE", name: "German", script: "latin" },
  { code: "fil-PH", name: "Filipino", script: "latin" },
];

export const useAITeacher = create((set, get) => ({
  messages: [],
  currentMessage: null,
  teacher: teachers[0],
  language: languages[0].code, // default target language
  // input/source language for the typed text
  inputLanguage: languages[1].code, // default to en-US
  setTeacher: (teacher) => {
    set(() => ({
      teacher,
      messages: get().messages.map((message) => {
        message.audioPlayer = null; // New teacher, new Voice
        return message;
      }),
    }));
  },
  setLanguage: (langCode) => set(() => ({ language: langCode })),
  setInputLanguage: (langCode) => set(() => ({ inputLanguage: langCode })),
  classroom: "default",
  setClassroom: (classroom) => {
    set(() => ({
      classroom,
    }));
  },
  loading: false,
  furigana: true,
  setFurigana: (furigana) => {
    set(() => ({
      furigana,
    }));
  },
  english: true,
  setEnglish: (english) => {
    set(() => ({
      english,
    }));
  },
  speech: "formal",
  setSpeech: (speech) => {
    set(() => ({
      speech,
    }));
  },
  askAI: async (question) => {
    if (!question) {
      return;
    }
    const message = {
      question,
      id: get().messages.length,
    };
    set(() => ({
      loading: true,
    }));

    const speech = get().speech;
    const language = get().language;
    const srcLang = get().inputLanguage;

    console.log("[AI] askAI:start", { id: message.id, question, speech });

    // Try to unlock audio synchronously while still in the user gesture
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        window.__r3f_audio_ctx = window.__r3f_audio_ctx || new AudioCtx();
        // resume() is allowed during a user gesture
        window.__r3f_audio_ctx.resume && window.__r3f_audio_ctx.resume().catch(() => {});
        console.log("[audio] attempted to resume AudioContext");
      } else {
        // fallback quick play/pause
        const _unlock = new Audio();
        _unlock.play && _unlock.play().then(() => _unlock.pause()).catch(() => {});
        console.log("[audio] attempted quick play/pause unlock");
      }
    } catch (e) {
      console.warn("[audio] unlock failed", e);
    }

    // Ask AI
    try {
      const res = await fetch(
        `/api/ai?question=${encodeURIComponent(question)}&speech=${encodeURIComponent(
          speech
        )}&lang=${encodeURIComponent(language)}&src=${encodeURIComponent(srcLang)}`
      );
      console.log("[AI] askAI:fetchDone", { id: message.id, status: res.status });

      const data = await res.json();
      console.log("[AI] askAI:parsed", { id: message.id, data });

      message.answer = data;
      message.speech = speech;

      // add message to list
      set((state) => ({
        messages: [...state.messages, message],
        loading: false,
      }));

      // trigger usage update
      window.dispatchEvent(new Event("tts-usage-updated"));

      console.log("[AI] askAI:addedMessage", { id: message.id });

      // Trigger playback automatically (fallback: user can still press Play)
      try {
        console.log("[AI] askAI:autoPlay:trigger", { id: message.id });
        get().playMessage(message);
      } catch (e) {
        console.warn("[AI] askAI:autoPlay:failed", { id: message.id, e });
      }
    } catch (err) {
      console.error("[AI] askAI:error", { id: message.id, err });
      set(() => ({ loading: false }));
    }
  },
  playMessage: async (message) => {
    console.log("[TTS] playMessage:start", { id: message?.id });
    try {
      // Keep loading indicator while preparing/trying to play
      set(() => ({ loading: true }));

      if (!message?.answer) {
        console.warn("[TTS] playMessage:noAnswer", { id: message?.id });
        set(() => ({ loading: false }));
        return;
      }

      if (!message.audioPlayer) {
        set(() => ({ loading: true }));

        // prefer target (normalized by /api/ai), fallback to native/japanese, then english/question
        const targetArr =
          message.answer?.target || message.answer?.native || message.answer?.japanese || [];
        let text = targetArr.map((word) => word.word).join(" ");
        if (!text || text.trim().length === 0) {
          text = message.answer?.english || message.question || "";
        }

        console.log("[TTS] fetch:start", { id: message.id, teacher: get().teacher, text });

        const audioRes = await fetch(
          `/api/tts?teacher=${encodeURIComponent(get().teacher)}&text=${encodeURIComponent(
            text
          )}&lang=${encodeURIComponent(get().language)}`
        );

        console.log("[TTS] fetch:done", {
          id: message.id,
          status: audioRes.status,
          contentType: audioRes.headers.get("content-type"),
        });

        if (!audioRes.ok) {
          throw new Error(`TTS request failed: ${audioRes.status}`);
        }

        // Safely parse visemes header (may be missing or invalid)
        let visemes = [];
        try {
          const visemesHeader = audioRes.headers.get("visemes");
          console.log("[TTS] visemes:header", { id: message.id, visemesHeader });
          visemes = visemesHeader ? JSON.parse(visemesHeader) : [];
        } catch (err) {
          console.warn("[TTS] visemes:parseFailed", { id: message.id, err });
          visemes = [];
        }

        const audioBlob = await audioRes.blob();
        console.log("[TTS] blob:received", { id: message.id, size: audioBlob.size });

        const audioUrl = URL.createObjectURL(audioBlob);
        console.log("[TTS] objectURL:created", { id: message.id, audioUrl });

        const audioPlayer = new Audio(audioUrl);

        // ensure we revoke URL when finished or on error
        const revoke = () => {
          try {
            URL.revokeObjectURL(audioUrl);
            console.log("[TTS] objectURL:revoked", { id: message.id });
          } catch (e) {
            console.warn("[TTS] objectURL:revokeFailed", { id: message.id, e });
          }
        };

        message.visemes = visemes;
        message.audioPlayer = audioPlayer;

        message.audioPlayer.onended = () => {
          console.log("[TTS] audio:onended", { id: message.id });
          revoke();
          set(() => ({ currentMessage: null }));
        };

        message.audioPlayer.onerror = (e) => {
          console.error("[TTS] audio:onerror", { id: message.id, e });
          revoke();
          set(() => ({ currentMessage: null }));
        };

        // persist audioPlayer into messages list
        set(() => ({
          loading: false,
          messages: get().messages.map((m) => (m.id === message.id ? message : m)),
        }));

        console.log("[TTS] audioPlayer:attached", { id: message.id });
      }

      // play (reset to start) and handle promise rejection (autoplay policies)
      try {
        console.log("[TTS] audio:playAttempt", { id: message.id });
        message.audioPlayer.currentTime = 0;
        await message.audioPlayer.play();
        console.log("[TTS] audio:playSuccess", { id: message.id });

        // mark current playing message
        set(() => ({ currentMessage: message, loading: false }));
      } catch (playErr) {
        console.warn("[TTS] audio:playFailed", { id: message.id, playErr });
        // play was blocked (likely autoplay). Clear loading and show Play button for user
        set(() => ({ loading: false, currentMessage: null }));
      }
    } catch (err) {
      console.error("[TTS] playMessage:error", { id: message?.id, err });
      set(() => ({ loading: false }));
    }
  },
  stopMessage: (message) => {
    console.log("[TTS] stopMessage:start", { id: message?.id });
    // guard against undefined audioPlayer (identity mismatches or missing audio)
    try {
      if (message?.audioPlayer && typeof message.audioPlayer.pause === "function") {
        console.log("[TTS] stopMessage:pausing", { id: message.id });
        message.audioPlayer.pause();
      } else {
        console.log("[TTS] stopMessage:noAudioPlayer", { id: message?.id });
      }
    } catch (e) {
      console.warn("[TTS] stopMessage:failedToPause", { id: message?.id, e });
    } finally {
      set(() => ({
        currentMessage: null,
      }));
      console.log("[TTS] stopMessage:done", { id: message?.id });
    }
  },
}));
