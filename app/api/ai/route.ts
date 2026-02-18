import OpenAI from "openai"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const { prompt } = await req.json()

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a structured productivity assistant." },
      { role: "user", content: prompt },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (content == null) {
    throw new Error("No completion content")
  }

  return NextResponse.json({
    result: content,
  })
}
