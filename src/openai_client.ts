import AsyncOpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const client = new AsyncOpenAI({
    baseURL: 'https://api.studio.nebius.com/v1/',
    apiKey: process.env.NEBIUS,
});

export default client