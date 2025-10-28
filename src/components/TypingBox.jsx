import { useAITeacher, languages } from "@/hooks/useAITeacher";
import { useState, useEffect, useRef } from "react";
import LanguageSelector from "./LanguageSelector";
import InputLanguageSelector from "./InputLanguageSelector";

export const TypingBox = () => {
  const askAI = useAITeacher((state) => state.askAI);
  const loading = useAITeacher((state) => state.loading);
  const inputLanguage = useAITeacher((s) => s.inputLanguage);
  const language = useAITeacher((s) => s.language);
  const [question, setQuestion] = useState("");

  const ask = () => {
    if (!question) return;
    askAI(question);
    setQuestion("");
  };

  // helper to get friendly language name
  const getLangName = (code) =>
    languages.find((l) => l.code === code)?.name || code;

  const srcName = getLangName(inputLanguage);
  const tgtName = getLangName(language);

  // UI text in the source (input) language
  const UI_BY_SRC = {
    "en-US": {
      heading: `How to say in ${tgtName}?`,
      subtitle: `Type a sentence in ${srcName} and the Virtual Teacher will translate it to ${tgtName}.`,
    },
    "ja-JP": {
      heading: `${tgtName}では何と言いますか？`,
      subtitle: `${srcName}で文を入力すると、Virtual Teacherが${tgtName}に翻訳します。`,
    },
    "es-ES": {
      heading: `¿Cómo se dice en ${tgtName}?`,
      subtitle: `Escribe una frase en ${srcName} y el Profesor Virtual la traducirá a ${tgtName}.`,
    },
    "fr-FR": {
      heading: `Comment le dire en ${tgtName} ?`,
      subtitle: `Tapez une phrase en ${srcName} et le Professeur Virtuel la traduira en ${tgtName}.`,
    },
    "de-DE": {
      heading: `Wie sagt man das auf ${tgtName}?`,
      subtitle: `Gib einen Satz auf ${srcName} ein und der virtuelle Lehrer übersetzt ihn ins ${tgtName}.`,
    },
    "fil-PH": {
      heading: `Paano sabihin sa ${tgtName}?`,
      subtitle: `I-type ang pangungusap sa ${srcName} at isasalin ito ng Virtual Teacher sa ${tgtName}.`,
    },
  };

  const uiText = UI_BY_SRC[inputLanguage] || UI_BY_SRC["en-US"];

  // neutral sample sets (arrays for random picks)
  const SAMPLE_SET = {
    "en-US": [
      "How are you?",
      "What time is it?",
      "Where is the station?",
      "I like coffee.",
    ],
    "ja-JP": [
      "元気ですか？",
      "今何時ですか？",
      "駅はどこですか？",
      "コーヒーが好きです。",
    ],
    "es-ES": [
      "¿Cómo estás?",
      "¿Qué hora es?",
      "¿Dónde está la estación?",
      "Me gusta el café.",
    ],
    "fr-FR": [
      "Comment ça va ?",
      "Quelle heure est-il ?",
      "Où est la gare ?",
      "J'aime le café.",
    ],
    "de-DE": [
      "Wie geht's?",
      "Wie spät ist es?",
      "Wo ist der Bahnhof?",
      "Ich mag Kaffee.",
    ],
    "fil-PH": [
      "Kumusta ka?",
      "Anong oras na?",
      "Nasaan ang estasyon?",
      "Gusto ko ng kape.",
    ],
  };

  // typing/preview state
  const [fullPreview, setFullPreview] = useState(() => {
    const arr = SAMPLE_SET[inputLanguage] || ["Type a sentence..."];
    return arr[Math.floor(Math.random() * arr.length)];
  });
  const [displayedPreview, setDisplayedPreview] = useState("");
  const typingRef = useRef(null);
  const cycleRef = useRef(null);

  // start typing animation for a given text
  const startTyping = (text) => {
    clearInterval(typingRef.current);
    setDisplayedPreview("");
    let i = 0;
    const speed = 40; // ms per char
    typingRef.current = setInterval(() => {
      i++;
      setDisplayedPreview(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typingRef.current);
      }
    }, speed);
  };

  // cycle preview every few seconds and animate typing
  useEffect(() => {
    // pick initial fullPreview and start typing
    const arr = SAMPLE_SET[inputLanguage] || ["Type a sentence..."];
    const pickRandom = () => arr[Math.floor(Math.random() * arr.length)];
    const start = pickRandom();
    setFullPreview(start);
    startTyping(start);

    // cycle interval: every 6-8s pick new sample
    clearInterval(cycleRef.current);
    cycleRef.current = setInterval(() => {
      const next = pickRandom();
      setFullPreview(next);
      startTyping(next);
    }, 7000); // every 7s

    return () => {
      clearInterval(typingRef.current);
      clearInterval(cycleRef.current);
    };
  }, [inputLanguage]); // restart when input language changes

  // accessibility: allow clicking preview to fill input
  const onPreviewClick = () => {
    setQuestion(fullPreview);
  };

  return (
    <div className="z-10 max-w-[600px] flex space-y-4 flex-col bg-gradient-to-tr from-slate-300/30 via-gray-400/30 to-slate-600-400/30 p-4 backdrop-blur-md rounded-xl border-slate-100/30 border">
      {/* badge moved to fixed bottom-right; no local rendering here */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">{uiText.heading}</h2>
          <p className="text-white/65">{uiText.subtitle}</p>
        </div>
        <div className="flex items-center">
          <InputLanguageSelector />
          <LanguageSelector />
        </div>
      </div>

      <div className="text-sm text-white/60 mb-1 select-none">
        <span className="opacity-60">Preview: </span>
        <button
          onClick={onPreviewClick}
          className="inline-block ml-2 text-white/90 underline-offset-2 hover:underline"
          aria-label="Use preview sentence"
        >
          <span>{displayedPreview}</span>
          <span className="animate-blink">|</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
          </span>
        </div>
      ) : (
        <div className="gap-3 flex">
          <input
            className="focus:outline focus:outline-white/80 flex-grow bg-slate-800/60 p-2 px-4 rounded-full text-white placeholder:text-white/50 shadow-inner shadow-slate-900/60"
            placeholder={fullPreview}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                ask();
              }
            }}
          />
          <button
            className="bg-slate-100/20 p-2 px-6 rounded-full text-white"
            onClick={ask}
          >
            Ask
          </button>
        </div>
      )}

      <style jsx>{`
        .animate-blink {
          display: inline-block;
          width: 8px;
          margin-left: 2px;
          animation: blink 1s steps(2, start) infinite;
        }
        @keyframes blink {
          to {
            visibility: hidden;
          }
        }
      `}</style>
    </div>
  );
};
