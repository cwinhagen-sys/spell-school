import OpenAI from 'openai'
import { OPENAI_API_KEY } from './env'

export function getOpenAI() {
  const apiKey = OPENAI_API_KEY()
  return new OpenAI({ apiKey })
}