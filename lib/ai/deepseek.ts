import OpenAI from 'openai'

// Groq is OpenAI SDK-compatible and offers a free tier with Llama 3.3 70B
const aiClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
})

// Model: llama-3.3-70b-versatile — fast, free tier, high quality
const AI_MODEL = 'llama-3.3-70b-versatile'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Generate a text embedding vector.
 * Groq does not offer embedding models — returns null to signal
 * the caller should skip vector search and fall back to profile context only.
 */
export async function generateEmbedding(_text: string): Promise<number[] | null> {
  return null
}

/**
 * Non-streaming chat completion via Groq.
 */
export async function chatCompletion(
  messages: ChatMessage[],
): Promise<string> {
  const response = await aiClient.chat.completions.create({
    model: AI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
  })
  return response.choices[0].message.content ?? ''
}

/**
 * Streaming chat completion via Groq.
 * Returns a ReadableStream compatible with Next.js StreamingTextResponse patterns.
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const stream = await aiClient.chat.completions.create({
    model: AI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
  })

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) {
          controller.enqueue(encoder.encode(text))
        }
      }
      controller.close()
    },
  })
}

export default aiClient
