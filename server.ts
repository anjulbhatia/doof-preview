import { Hono } from "hono";
import { GoogleGenAI } from "@google/genai";
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { join } from "path";

const app = new Hono();

// Use environment PORT or default to 3000
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Initialize Gemini
let genAI: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("✓ Gemini ready");
  } else {
    console.warn("⚠ No GEMINI_API_KEY - API will return errors");
  }
} catch (err) {
  console.error("✗ Gemini init failed:", err);
}

// Storage in /tmp for serverless environments, or local storage dir
const STORAGE_DIR = process.env.VERCEL 
  ? join("/tmp", "storage")
  : join(process.cwd(), "..", "storage");

interface ProjectInstance {
  id: string;
  title: string;
  description: string;
  result: string;
  createdAt: string;
}

async function generateInatorName(title: string, description: string): Promise<string> {
  if (!genAI) {
    throw new Error("Gemini not initialized - check GEMINI_API_KEY");
  }
  
  const prompt = `Create a funny -inator name for: ${title}. Description: ${description}. Must end with -inator. Keep it creative and Doofenshmirtz-style.`;
  
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "The Generic-inator";
}

async function saveInstance(title: string, description: string, result: string): Promise<ProjectInstance> {
  await mkdir(STORAGE_DIR, { recursive: true });
  
  const instance: ProjectInstance = {
    id: Date.now().toString(),
    title,
    description,
    result,
    createdAt: new Date().toISOString(),
  };

  await writeFile(
    join(STORAGE_DIR, `${instance.id}.json`),
    JSON.stringify(instance, null, 2)
  );

  return instance;
}

async function loadInstances(): Promise<ProjectInstance[]> {
  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    const files = await readdir(STORAGE_DIR);
    
    const instances = await Promise.all(
      files
        .filter(f => f.endsWith(".json"))
        .map(async f => {
          const content = await readFile(join(STORAGE_DIR, f), "utf-8");
          return JSON.parse(content);
        })
    );

    return instances.sort((a, b) => parseInt(b.id) - parseInt(a.id));
  } catch {
    return [];
  }
}

// Health check
app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    gemini: !!genAI,
    storage: STORAGE_DIR 
  });
});

// Serve index.html
app.get("/", async (c) => {
  try {
    const html = await readFile(join(process.cwd(), "index.html"), "utf-8");
    return c.html(html);
  } catch (err) {
    console.error("Failed to serve index.html:", err);
    return c.text("Server error", 500);
  }
});

app.post("/api/generate", async (c) => {
  try {
    if (!genAI) {
      return c.json({ error: "Service unavailable - API key not configured" }, 503);
    }
    
    const body = await c.req.json();
    const { title, description } = body;
    
    if (!title?.trim() || !description?.trim()) {
      return c.json({ error: "Required" }, 400);
    }

    const result = await generateInatorName(title, description);
    const instance = await saveInstance(title, description, result);

    return c.json(instance);
  } catch (error) {
    console.error("Generate error:", error);
    return c.json({ error: "Failed", message: String(error) }, 500);
  }
});

app.get("/api/history", async (c) => {
  try {
    const instances = await loadInstances();
    return c.json(instances);
  } catch (error) {
    console.error("History error:", error);
    return c.json({ error: "Failed" }, 500);
  }
});

console.log(`🎭 Server starting on port ${PORT}`);
console.log(`   Storage: ${STORAGE_DIR}`);
console.log(`   Gemini: ${genAI ? "✓" : "✗"}`);

export default { port: PORT, fetch: app.fetch };
