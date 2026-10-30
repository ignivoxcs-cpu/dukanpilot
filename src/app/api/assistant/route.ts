import { NextResponse } from "next/server";
import { z } from "zod";
import { getBusinessData } from "@/lib/data";
import { parseIntent } from "@/lib/assistant/intents";
import { answerIntent } from "@/lib/assistant/answer";

const Body = z.object({ message: z.string().trim().min(1).max(300) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please type a question (up to 300 characters)." }, { status: 400 });

  try {
    // Data is always loaded for the signed-in business only (RLS in Phase 2).
    const data = await getBusinessData();
    const reply = answerIntent(parseIntent(parsed.data.message), data);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("assistant error", e);
    // Never invent an answer if the data couldn't be loaded.
    return NextResponse.json(
      { error: "I couldn't load your business records just now, so I can't answer that. Please try again." },
      { status: 500 },
    );
  }
}
