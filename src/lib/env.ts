export const requireEnv = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const OPENAI_API_KEY = (): string => requireEnv('OPENAI_API_KEY')