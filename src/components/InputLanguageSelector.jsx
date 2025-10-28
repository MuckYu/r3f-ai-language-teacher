import React from "react";
import { languages, useAITeacher } from "@/hooks/useAITeacher";

export default function InputLanguageSelector() {
  const inputLanguage = useAITeacher((s) => s.inputLanguage);
  const setInputLanguage = useAITeacher((s) => s.setInputLanguage);

  return (
    <select
      value={inputLanguage}
      onChange={(e) => setInputLanguage(e.target.value)}
      className="bg-slate-800/60 text-white p-2 rounded-full mr-2 font-sans"
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );
}