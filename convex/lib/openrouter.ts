/**
 * OpenRouter API Client
 * 
 * Modular wrapper for AI model access via OpenRouter.
 * Change models by setting SECURITY_SCAN_MODEL env var.
 * 
 * @see https://openrouter.ai/docs
 */

// Default model - can be overridden via env var
// Using Claude 3.5 Haiku for better security analysis quality
const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku'

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
}

export interface OpenRouterResponse {
  id: string
  model: string
  choices: {
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface AIAnalysisResult {
  content: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Get the configured model from environment or use default
 */
export function getDefaultModel(): string {
  return process.env.SECURITY_SCAN_MODEL ?? DEFAULT_MODEL
}

/**
 * Send a prompt to OpenRouter and get a response
 */
export async function analyzeWithAI(
  prompt: string,
  options?: OpenRouterOptions
): Promise<AIAnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const model = options?.model ?? getDefaultModel()
  
  const requestBody: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options?.maxTokens ?? 1024,
    temperature: options?.temperature ?? 0.1, // Low temp for consistent security analysis
  }

  // Enable JSON mode if requested (model-dependent support)
  if (options?.jsonMode) {
    requestBody.response_format = { type: 'json_object' }
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://clawdtm.com',
      'X-Title': 'ClawdTM Security Scanner',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as OpenRouterResponse

  if (!data.choices || data.choices.length === 0) {
    throw new Error('OpenRouter returned no choices')
  }

  return {
    content: data.choices[0].message.content,
    model: data.model,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
  }
}

/**
 * Send a multi-turn conversation to OpenRouter
 */
export async function chatWithAI(
  messages: OpenRouterMessage[],
  options?: OpenRouterOptions
): Promise<AIAnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const model = options?.model ?? getDefaultModel()
  
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    max_tokens: options?.maxTokens ?? 1024,
    temperature: options?.temperature ?? 0.1,
  }

  if (options?.jsonMode) {
    requestBody.response_format = { type: 'json_object' }
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://clawdtm.com',
      'X-Title': 'ClawdTM Security Scanner',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as OpenRouterResponse

  if (!data.choices || data.choices.length === 0) {
    throw new Error('OpenRouter returned no choices')
  }

  return {
    content: data.choices[0].message.content,
    model: data.model,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
  }
}

/**
 * Available models with their approximate costs (per 1M tokens)
 * Update this list based on OpenRouter pricing
 */
export const AVAILABLE_MODELS = {
  // Fast and cheap
  'google/gemini-2.0-flash-lite-preview': { cost: 0.02, speed: 'very fast', notes: 'Cheapest option' },
  'google/gemini-2.0-flash-001': { cost: 0.10, speed: 'fast', notes: 'Good balance' },
  
  // Better reasoning
  'anthropic/claude-3.5-haiku': { cost: 0.80, speed: 'fast', notes: 'Better reasoning' },
  'anthropic/claude-3.5-sonnet': { cost: 3.00, speed: 'medium', notes: 'Best accuracy' },
  
  // Open source
  'meta-llama/llama-3.3-70b-instruct': { cost: 0.40, speed: 'medium', notes: 'Open source' },
  'mistralai/mistral-large-2411': { cost: 2.00, speed: 'medium', notes: 'Strong performance' },
} as const
