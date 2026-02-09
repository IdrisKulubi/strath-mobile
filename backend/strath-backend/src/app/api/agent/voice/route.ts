import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

// ============================================
// SPEECH-TO-TEXT API — POST /api/agent/voice
// ============================================
// Receives audio (base64) from mobile, sends to Gemini for transcription.
// Returns the transcript text which the client then feeds to /api/agent/search.
//
// Why Gemini instead of Whisper/Deepgram?
// - We already have the API key
// - No extra SDK dependency
// - Gemini Flash handles audio natively via multimodal
// - Single provider simplifies billing and maintenance

async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse("Unauthorized", 401);
        }

        const body = await request.json();
        const { audio, mimeType = "audio/webm" } = body;

        if (!audio || typeof audio !== "string") {
            return errorResponse("audio (base64) is required", 400);
        }

        // Max ~10 seconds of audio (~200KB base64)
        if (audio.length > 500_000) {
            return errorResponse("Audio too large. Keep it under 10 seconds.", 400);
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return errorResponse("GEMINI_API_KEY not configured", 500);
        }

        // Use Gemini Flash multimodal to transcribe audio
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inlineData: {
                                    mimeType,
                                    data: audio,
                                },
                            },
                            {
                                text: `Transcribe this audio exactly as spoken. This is a voice query for a dating app search — the user is describing what kind of person they're looking for. Return ONLY the transcribed text, nothing else. No quotes, no explanations, no formatting. If the audio is unclear or empty, return "unclear".`,
                            },
                        ],
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 256,
                    },
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error("[Voice API] Gemini error:", response.status, err);
            return errorResponse("Transcription failed", 500);
        }

        const data = await response.json();
        const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!transcript || transcript === "unclear") {
            return errorResponse("Could not understand the audio. Please try again.", 400);
        }

        return successResponse({
            transcript,
            confidence: data?.candidates?.[0]?.avgLogprobs ? 
                Math.min(1, Math.max(0, 1 + (data.candidates[0].avgLogprobs / 5))) : null,
        });
    } catch (error) {
        console.error("[Voice API] Error:", error);
        return errorResponse("Voice transcription failed", 500);
    }
}
