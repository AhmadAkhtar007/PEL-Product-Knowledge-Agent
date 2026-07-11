import { NextRequest, NextResponse } from "next/server";

type BackendRagResponse = {
  answer?: string;
  response?: string;
  escalate?: boolean;
  metadata?: Array<{
    file?: string;
    source?: string;
    page?: number;
  }>;
};

type Source = {
  file: string;
  page?: number;
};

const backendRagUrl =
  process.env.BACKEND_RAG_URL ?? "http://127.0.0.1:8000/rag/query";
const backendTimeoutMs = Number(
  process.env.BACKEND_RAG_TIMEOUT_MS ?? 60_000,
);

function normalizeSources(data: BackendRagResponse): Source[] {
  if (!Array.isArray(data.metadata)) {
    return [];
  }

  return data.metadata
    .map((item) => {
      const file = item.file ?? item.source;
      if (!file) {
        return null;
      }

      return {
        file,
        page: item.page,
      };
    })
    .filter((item): item is Source => item !== null);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json(
      {
        error: "Query is required.",
        answer: "Please enter a question before sending.",
        sources: [],
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(backendRagUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(backendTimeoutMs),
    });

    const data = (await response.json().catch(() => null)) as
      | BackendRagResponse
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "PEL backend returned an error.",
          answer:
            "The PEL backend responded with an error. Please try again after the API is healthy.",
          sources: [],
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      answer:
        data?.answer ??
        data?.response ??
        "I could not find an answer for that question.",
      sources: data ? normalizeSources(data) : [],
      escalate: Boolean(data?.escalate),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";

    return NextResponse.json(
      {
        error: timedOut
          ? "PEL backend timed out."
          : "PEL backend is offline.",
        answer:
          timedOut
            ? "The PEL backend is taking longer than expected to answer. Please try again in a moment."
            : "The PEL backend is not running on port 8000 yet. Start the backend API, then send the question again.",
        sources: [],
      },
      { status: timedOut ? 504 : 503 },
    );
  }
}
