import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 3000;
const root = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(root, "dist")));

const demoPlan = {
  title: "A thoughtful weekend in Kyoto",
  summary: "A gentle introduction to Kyoto's quiet lanes, timeless temples, and excellent food.",
  destination: "Kyoto, Japan",
  duration: "3 days",
  days: [
    { day: 1, title: "Old Kyoto, slowly", mood: "Culture & wandering", stops: [
      { id: "gion", time: "09:00", title: "Fushimi Inari Taisha", location: "Fushimi", type: "Explore", duration: "2 hrs", note: "Arrive early for the vermilion torii gates and a quieter trail." },
      { id: "lunch", time: "12:30", title: "Nishiki Market", location: "Downtown Kyoto", type: "Eat", duration: "1.5 hrs", note: "Snack your way through the city's kitchen." },
      { id: "kamo", time: "15:00", title: "Philosopher's Path", location: "Higashiyama", type: "Wander", duration: "2 hrs", note: "Follow the canal north toward Nanzen-ji." }
    ]},
    { day: 2, title: "Gardens & tea", mood: "Quiet moments", stops: [
      { id: "kinkaku", time: "08:30", title: "Kinkaku-ji", location: "Kita", type: "Explore", duration: "1.5 hrs", note: "Beat the crowds at the Golden Pavilion." },
      { id: "tea", time: "11:00", title: "Tea ceremony", location: "Gion", type: "Experience", duration: "1 hr", note: "Learn the beautiful rhythm of matcha preparation." },
      { id: "pontocho", time: "18:30", title: "Pontocho dinner", location: "Pontocho Alley", type: "Eat", duration: "2 hrs", note: "Book a small counter spot for seasonal kaiseki." }
    ]},
    { day: 3, title: "A little further out", mood: "Forest & fresh air", stops: [
      { id: "arashiyama", time: "08:00", title: "Arashiyama bamboo grove", location: "Arashiyama", type: "Explore", duration: "2 hrs", note: "Continue to Tenryu-ji's gardens after the grove." },
      { id: "river", time: "12:00", title: "Riverside lunch", location: "Arashiyama", type: "Eat", duration: "1 hr", note: "Choose a terrace overlooking the Katsura River." }
    ]}
  ]
};

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  return JSON.parse(candidate.slice(start, end + 1));
}

function getGeminiModel() {
  const model = (process.env.OPENROUTER_MODEL || "gemini-2.0-flash")
    .replace(/^google\//, "")
    .replace(/:free$/, "");
  return model === "gemini-2.0-flash-exp" ? "gemini-2.0-flash" : model;
}

app.post("/api/plan", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "Tell us where you want to go first." });

  if (!process.env.OPENROUTER_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 850));
    return res.json(demoPlan);
  }

  try {
    const model = getGeminiModel();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.OPENROUTER_API_KEY)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You create practical travel itineraries. Return ONLY valid JSON matching this shape: {title:string,summary:string,destination:string,duration:string,days:[{day:number,title:string,mood:string,stops:[{id:string,time:string,title:string,location:string,type:string,duration:string,note:string}]}]}. Include 2-4 realistic stops per day. Never use markdown." }]
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" }
      })
    });
    const body = await response.text();
    let data;
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      throw new Error(`Gemini returned a non-JSON response (${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini request failed (${response.status}).`);
    }
    const content = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("");
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Gemini returned no candidate content.");
    }
    return res.json(extractJson(content));
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: "The travel model returned an unusable plan. Try again." });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  return res.sendFile(path.join(root, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Roamwise listening on port ${port}`);
});

export default app;
