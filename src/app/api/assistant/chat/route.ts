import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { askChatbot, ChatbotRequest } from "@/lib/ai/chatbot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce strict authentication & tenant isolation
    const session = await requireAuth(req);

    // 2. Parse and validate request body
    const body: ChatbotRequest = await req.json();

    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Message content is required and cannot be empty." },
        { status: 400 }
      );
    }

    if (body.message.length > 2000) {
      return NextResponse.json(
        { error: "Message exceeds maximum allowed length of 2,000 characters." },
        { status: 400 }
      );
    }

    // 3. Process chatbot inquiry with Gemini & safe read-only tenant context
    const response = await askChatbot(body, session.organizationId);

    return NextResponse.json(response);
  } catch (error: any) {
    return handleAuthError(error);
  }
}
