import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { DEFAULT_GEMINI_MODEL, STAFF_SYSTEM_PROMPT } from './api/_staffPrompt.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function readJsonBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return []

  return messages
    .filter((message) => message && typeof message.content === 'string')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))
}

function getGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim() || ''
  )
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geminiApiKey = env.GEMINI_API_KEY
  const geminiModel = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL

  return {
    plugins: [
      react(),
      {
        name: 'staff-gemini-api',
        configureServer(server) {
          server.middlewares.use('/api/chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            if (!geminiApiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                error: 'Missing GEMINI_API_KEY in .env',
                errorCode: 'MISSING_GEMINI_KEY',
              }))
              return
            }

            try {
              const body = await readJsonBody(req)
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    systemInstruction: {
                      parts: [{ text: STAFF_SYSTEM_PROMPT }],
                    },
                    contents: normalizeMessages(body.messages),
                    generationConfig: {
                      maxOutputTokens: 350,
                      temperature: 0.4,
                    },
                  }),
                }
              )

              const data = await response.json()

              if (!response.ok) {
                const isLimit =
                  response.status === 429 ||
                  data?.error?.status === 'RESOURCE_EXHAUSTED' ||
                  /quota|rate|resource/i.test(data?.error?.message || '')

                res.statusCode = response.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  error: isLimit
                    ? 'AI limit reached. Try again later.'
                    : data?.error?.message || 'Gemini request failed.',
                  errorCode: isLimit ? 'AI_LIMIT_REACHED' : 'GEMINI_ERROR',
                }))
                return
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ text: getGeminiText(data) || 'No response.' }))
            } catch (error) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
                errorCode: 'SERVER_ERROR',
              }))
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
