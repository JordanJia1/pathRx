import { NextResponse } from "next/server";
import { searchDataset } from "@/lib/dataset/search";

export async function POST(req: Request) {
  try {
    const { query, k = 6 } = (await req.json()) as { query: string; k?: number };
    const results = await searchDataset(query ?? "", k);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "dataset search failed" },
      { status: 500 }
    );
  }
}
