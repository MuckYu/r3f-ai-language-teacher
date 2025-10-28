import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { PassThrough } from "stream";
import fs from "fs/promises";
import path from "path";

async function synthesizeSsmlWithVoice(speechConfig, ssml, voiceName) {
  return new Promise((resolve, reject) => {
    const visemes = [];
    const cfg = sdk.SpeechConfig.fromSubscription(
      speechConfig.subscriptionKey,
      speechConfig.region
    );
    // copy options (most important: voice)
    cfg.speechSynthesisVoiceName = voiceName;

    const synthesizer = new sdk.SpeechSynthesizer(cfg);
    synthesizer.visemeReceived = (_, e) => {
      visemes.push([e.audioOffset / 10000, e.visemeId]);
    };

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        try {
          const { audioData, reason } = result;
          synthesizer.close();
          if (reason !== sdk.ResultReason.SynthesizingAudioCompleted) {
            return reject(new Error("Synthesis did not complete: " + reason));
          }
          const bufferStream = new PassThrough();
          bufferStream.end(Buffer.from(audioData));
          resolve({ audioStream: bufferStream, visemes });
        } catch (err) {
          synthesizer.close();
          reject(err);
        }
      },
      (err) => {
        synthesizer.close();
        reject(err);
      }
    );
  });
}

async function recordUsage(chars) {
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "tts-usage.json");
  let data = {};
  try {
    const txt = await fs.readFile(file, "utf8");
    data = JSON.parse(txt);
  } catch (e) {
    data = {};
  }
  const ym = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  data[ym] = (data[ym] || 0) + chars;
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export async function GET(req) {
  try {
    const url = req.nextUrl;
    const teacher = url.searchParams.get("teacher") || "Nanami";
    const text = url.searchParams.get("text") || "I'm excited to try text to speech";
    const lang = url.searchParams.get("lang") || "ja-JP";

    // count Unicode codepoints (approx characters Azure charges)
    const chars = [...text].length;

    console.log("[API/tts] start", { teacher, lang, text: text.slice(0, 200) });

    const key = process.env["SPEECH_KEY"];
    const region = process.env["SPEECH_REGION"];
    if (!key || !region) {
      console.error("[API/tts] missing env SPEECH_KEY / SPEECH_REGION");
      return new Response(JSON.stringify({ error: "Missing speech env" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // build candidate voice names per language / teacher
    const voiceCandidatesByLang = {
      "ja-JP": [`ja-JP-${teacher}Neural`],
      "en-US": ["en-US-AriaNeural"],
      "es-ES": ["es-ES-ElviraNeural"],
      "fr-FR": ["fr-FR-DeniseNeural"],
      "de-DE": ["de-DE-KatjaNeural"],
      // prefer the 3-suffixed voices first, then fallback without '3'
      "fil-PH": teacher === "Nanami"
        ? ["fil-PH-BlessicaNeural3", "fil-PH-BlessicaNeural"]
        : ["fil-PH-AngeloNeural3", "fil-PH-AngeloNeural"],
    };

    const candidates = voiceCandidatesByLang[lang] || voiceCandidatesByLang["en-US"];

    const speechConfigInfo = { subscriptionKey: key, region };

    const mapXmlLang = {
      "ja-JP": "ja-JP",
      "en-US": "en-US",
      "es-ES": "es-ES",
      "fr-FR": "fr-FR",
      "de-DE": "de-DE",
      "fil-PH": "fil-PH",
    };
    const xmlLang = mapXmlLang[lang] || "en-US";

    const ssml = `<speak version='1.0' xml:lang='${xmlLang}'><voice name='${candidates[0]}'>${text}</voice></speak>`;

    // Try candidates in sequence until one works
    let lastErr = null;
    for (const voiceName of candidates) {
      try {
        console.log("[API/tts] trying voice", voiceName);
        // replace voice in SSML for attempt
        const attemptSsml = `<speak version='1.0' xml:lang='${xmlLang}'><voice name='${voiceName}'>${text}</voice></speak>`;
        const { audioStream, visemes } = await synthesizeSsmlWithVoice(speechConfigInfo, attemptSsml, voiceName);

        // record usage (best-effort; does not affect response)
        try {
          await recordUsage(chars);
          console.log("[API/tts] usage recorded", { ym: new Date().toISOString().slice(0,7), chars });
        } catch (e) {
          console.warn("[API/tts] failed to record usage", e);
        }

        console.log("[API/tts] audio ready with voice", voiceName, "visemes:", visemes.length);

        const response = new Response(audioStream, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": `inline; filename=tts.mp3`,
            "Access-Control-Expose-Headers": "visemes",
            visemes: JSON.stringify(visemes),
          },
        });
        return response;
      } catch (err) {
        lastErr = err;
        console.error("[API/tts] voice attempt failed", { voiceName, err: err?.message || err });
        // try next candidate
      }
    }

    // all candidates failed
    console.error("[API/tts] all voice attempts failed", { lastError: lastErr && lastErr.message });
    return new Response(JSON.stringify({ error: "All voice attempts failed", details: String(lastErr) }), { status: 502, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[API/tts] error", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
