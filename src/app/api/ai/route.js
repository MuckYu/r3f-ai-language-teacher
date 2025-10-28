import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

// small examples per language to guide structure
const EXAMPLES = {
  "ja-JP": {
    nativeExample: [
      { word: "日本", reading: "にほん" },
      { word: "に" },
      { word: "住んで", reading: "すんで" },
      { word: "います" },
      { word: "か" },
      { word: "?" },
    ],
    grammarExample: [
      {
        english: "Do you live in Japan?",
        native: [
          { word: "日本", reading: "にほん" },
          { word: "に" },
          { word: "住んで", reading: "すんで" },
          { word: "います" },
          { word: "か" },
          { word: "?" },
        ],
        chunks: [
          { native: [{ word: "日本", reading: "にほん" }], meaning: "Japan", grammar: "Noun" },
          { native: [{ word: "に" }], meaning: "in", grammar: "Particle" },
          { native: [{ word: "住んで", reading: "すんで" }, { word: "います" }], meaning: "live", grammar: "Verb + て form + います" },
        ],
      },
    ],
  },
  "en-US": {
    nativeExample: [{ word: "Have" }, { word: "you" }, { word: "ever" }, { word: "been" }, { word: "to" }, { word: "Japan" }, { word: "?" }],
    grammarExample: [
      {
        english: "Have you ever been to Japan?",
        native: [{ word: "Have" }, { word: "you" }, { word: "ever" }, { word: "been" }, { word: "to" }, { word: "Japan" }, { word: "?" }],
        chunks: [
          { native: [{ word: "Have you ever been" }], meaning: "experience", grammar: "Present perfect" },
          { native: [{ word: "to Japan" }], meaning: "location", grammar: "prepositional phrase" },
        ],
      },
    ],
  },
  // Filipino example (simple tokenization)
  "fil-PH": {
    nativeExample: [{ word: "Kumusta" }, { word: "ka" }, { word: "?" }],
    grammarExample: [
      {
        english: "How are you?",
        native: [{ word: "Kumusta" }, { word: "ka" }, { word: "?" }],
        chunks: [{ native: [{ word: "Kumusta" }], meaning: "How (are you)", grammar: "Greeting" }],
      },
    ],
  },
};

export async function GET(req) {
  try {
    const url = req.nextUrl;
    const speech = url.searchParams.get("speech") || "formal";
    const lang = url.searchParams.get("lang") || "ja-JP";
    const src = url.searchParams.get("src") || "en-US";
    const question = url.searchParams.get("question") || "Have you ever been to Japan?";

    console.log("[API/ai] start", { question: question.slice(0,200), speech, lang, src });

    const example = EXAMPLES[lang] || EXAMPLES["en-US"];

    const systemPrompt = `
You are a strict language teacher. Respond ONLY with valid JSON (no surrounding text).
Return these keys exactly:
- english: string (translation of the input into English)
- target: array of { word: string, reading?: string }  — tokens in the TARGET language (the language specified by "Language (target)"); include "reading" only for Japanese.
- source: array of { word: string, reading?: string }  — tokens of the ORIGINAL input (in the source language)
- grammarBreakdown: array of sections { english, target: [...], chunks: [{ target: [...], meaning: string, grammar: string }] }

Important:
- "target" must always contain the translation tokens in the target language (not the source).
- Use the example shapes below to match tokenization for the target language.

native example (for token shape): ${JSON.stringify(example.nativeExample)}
grammar example: ${JSON.stringify(example.grammarExample)}
Language (target): ${lang}
Source language: ${src}
Speech style: ${speech}
Input sentence: ${question}
`;

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please produce the JSON described above for: "${question}"` },
      ],
    });

    const raw = chatCompletion.choices?.[0]?.message?.content;
    let parsed;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error("[API/ai] parse error", e, raw?.slice?.(0,1000));
      return Response.json({ error: "AI returned invalid JSON", raw }, { status: 502 });
    }

    // normalize keys to english/target/grammarBreakdown/source
    const answer = {
      english: parsed.english || parsed.translation || "",
      target: parsed.target || parsed.native || parsed.japanese || [],
      source: parsed.source || parsed.original || [],
      grammarBreakdown: parsed.grammarBreakdown || parsed.grammar_breakdown || parsed.grammar || [],
    };

    return Response.json(answer);
  } catch (err) {
    console.error("[API/ai] error", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
