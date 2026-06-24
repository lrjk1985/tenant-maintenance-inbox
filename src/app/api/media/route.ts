import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket") ?? "maintenance-media";
  const path = url.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing media path." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 10);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Media URL could not be created." },
      { status: 404 },
    );
  }

  return NextResponse.redirect(data.signedUrl, {
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}
