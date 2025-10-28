import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const file = path.join(process.cwd(), ".data", "tts-usage.json");
    const txt = await fs.readFile(file, "utf8");
    const data = JSON.parse(txt);
    const ym = new Date().toISOString().slice(0, 7);
    const monthTotal = Number(data[ym] || 0);
    return new Response(JSON.stringify({ month: ym, chars: monthTotal, raw: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ month: new Date().toISOString().slice(0, 7), chars: 0 }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
