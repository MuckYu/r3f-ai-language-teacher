import React from "react";
import { languages, useAITeacher } from "@/hooks/useAITeacher";

export default function LanguageSelector() {
  const language = useAITeacher((s) => s.language);
  const setLanguage = useAITeacher((s) => s.setLanguage);

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className="bg-slate-800/60 text-white p-2 rounded-full font-sans"
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );
}