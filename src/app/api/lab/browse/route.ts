import { labBrowse } from "@/lib/lab/client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let url = "";
  try {
    const j = (await req.json()) as { url?: string };
    url = String(j.url ?? "").trim();
  } catch {
    return Response.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است" }, { status: 400 });
  }
  if (!url) return Response.json({ ok: false, error: "آدرس را وارد کن" }, { status: 400 });

  const result = await labBrowse(url);
  return Response.json(result);
}
