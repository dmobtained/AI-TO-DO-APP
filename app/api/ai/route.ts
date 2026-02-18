import OpenAI from "openai"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const prompt = typeof body?.prompt === "string" ? body.prompt : ""
    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI is niet geconfigureerd." },
        { status: 503 }
      )
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
      return NextResponse.json(
        { error: "Geen antwoord van het model." },
        { status: 502 }
      )
    }

    return NextResponse.json({ result: content })
  } catch (err) {
    console.error("[api/ai]", err)
    return NextResponse.json(
      { error: "Interne serverfout." },
      { status: 500 }
    )
  }
}
