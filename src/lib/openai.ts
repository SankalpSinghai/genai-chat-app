import OpenAI from 'openai';

 if (!process.env.OPENAI_API_KEY) {
    throw new Error(
    "Missing OPENAI_API_KEY environment variable. Please add it to your .env.local file."
  );
  }

export const openai = new OpenAI({
    apiKey: process.env.OPEN_API_KEY,
})