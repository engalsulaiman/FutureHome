import { NextRequest, NextResponse } from "next/server";
import { createRequest, listRequests } from "@/lib/repository";
import { parseRequestInput } from "@/lib/validation";

export async function GET() {
  const requests = listRequests();
  return NextResponse.json(requests);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const input = parseRequestInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Missing or invalid required fields." },
      { status: 400 }
    );
  }
  const created = createRequest(input);
  return NextResponse.json(created, { status: 201 });
}
