import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only ADMIN and TEACHER can upload
  if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { paramsToSign?: Record<string, string> };
  const paramsToSign = body.paramsToSign;

  if (!paramsToSign || typeof paramsToSign !== "object") {
    return NextResponse.json({ error: "Missing paramsToSign" }, { status: 400 });
  }

  if (!process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Cloudinary API secret is not configured" }, { status: 500 });
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );

  return NextResponse.json({ signature });
}
