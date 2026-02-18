import { Hono } from "hono";
import { GoogleGenAI } from "@google/genai";
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { join } from "path";

// Debug: Check environment
console.log("Environment check:");
console.log("  GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
console.log("  GEMINI_API_KEY length:", process.env.GEMINI_API_KEY?.length || 0);
console.log("  Current directory:", process.cwd());

const app = new Hono();

// Initialize Gemini with error handling
let genAI: GoogleGenAI;
try {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in environment");
  }
  genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("✓ Gemini initialized");
} catch (err) {
  console.error("✗ Failed to initialize Gemini:", err);
  process.exit(1);
}

const STORAGE_DIR = join(process.cwd(), "..", "storage");

interface ProjectInstance {
  id: string;
  title: string;
  description: string;
  result: string;
  createdAt: string;
}

async function generateInatorName(title: string, description: string): Promise<string> {
  console.log("Generating name for:", title);
  
  const prompt = `Create a funny -inator name for: ${title}. Description: ${description}. Must end with -inator. Keep it creative and Doofenshmirtz-style.`;
  
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    console.log("Response received:", response.text ? "OK" : "EMPTY");
    return response.text || "The Generic-inator";
  } catch (err) {
    console.error("Gemini API error:", err);
    throw err;
  }
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

// Serve index.html
app.get("/", async (c) => {
  const html = await readFile(join(process.cwd(), "index.html"), "utf-8");
  return c.html(html);
});

app.post("/api/generate", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Request body:", body);
    
    const { title, description } = body;
    
    if (!title?.trim() || !description?.trim()) {
      console.log("Validation failed: missing fields");
      return c.json({ error: "Required" }, 400);
    }

    console.log("Calling generateInatorName...");
    const result = await generateInatorName(title, description);
    console.log("Result:", result);
    
    const instance = await saveInstance(title, description, result);
    console.log("Instance saved:", instance.id);

    return c.json(instance);
  } catch (error) {
    console.error("Generate endpoint error:", error);
    return c.json({ error: "Failed", details: String(error) }, 500);
  }
});

app.get("/api/history", async (c) => {
  try {
    const instances = await loadInstances();
    return c.json(instances);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed" }, 500);
  }
});

const port = 3000;
console.log(`🎭 http://localhost:${port}`);

export default { port, fetch: app.fetch };
