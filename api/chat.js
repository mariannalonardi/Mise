import { DEFAULT_GEMINI_MODEL, STAFF_SYSTEM_PROMPT } from "./_staffPrompt.js";

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
}

function getGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    res.status(500).json({
      error: "Missing GEMINI_API_KEY. Add it in Vercel Environment Variables.",
      errorCode: "MISSING_GEMINI_KEY",
    });
    return;
  }

  const contents = normalizeMessages(req.body?.messages);

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: STAFF_SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            maxOutputTokens: 350,
            temperature: 0.4,
          },
        }),
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const status = geminiResponse.status;
      const isLimit =
        status === 429 ||
        data?.error?.status === "RESOURCE_EXHAUSTED" ||
        /quota|rate|resource/i.test(data?.error?.message || "");

      res.status(status).json({
        error: isLimit
          ? "AI limit reached. Try again later."
          : data?.error?.message || "Gemini request failed.",
        errorCode: isLimit ? "AI_LIMIT_REACHED" : "GEMINI_ERROR",
      });
      return;
    }

    res.status(200).json({ text: getGeminiText(data) || "No response." });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "SERVER_ERROR",
    });
  }
}
