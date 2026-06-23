import { NextResponse } from "next/server";
import { buildManifest } from "@/lib/pwa";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const manifest = buildManifest({
    workspaceName: "Better Body Academy",
    shortName: "BBA",
    themeColor: "#00AEEF",
    backgroundColor: "#0A0A0A"
  });

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
