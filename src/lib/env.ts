export const requireEnv = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const OPENAI_API_KEY = (): string => requireEnv('OPENAI_API_KEY')
export const ELEVENLABS_API_KEY = (): string => requireEnv('ELEVENLABS_API_KEY')
export const AZURE_SPEECH_KEY = (): string => requireEnv('AZURE_SPEECH_KEY')
export const AZURE_SPEECH_REGION = (): string => requireEnv('AZURE_SPEECH_REGION')