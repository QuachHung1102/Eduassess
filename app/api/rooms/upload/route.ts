import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAny } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/permission-keys";
import cloudinary from "@/lib/cloudinary";

/**
 * Upload ảnh sơ đồ vị trí phòng (RoomLayoutImage) lên Cloudinary.
 * Chỉ người có quyền tạo/sửa phòng mới upload được.
 * Trả về { url, publicId } để form gửi kèm khi tạo/sửa phòng — publicId
 * dùng để xóa ảnh cũ khi thay (cleanup) ở server action.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await canAny(session.user, [
    PERMISSIONS.ROOM_CREATE.key,
    PERMISSIONS.ROOM_UPDATE.key,
  ]);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Thiếu tệp ảnh" }, { status: 400 });
  }

  // 10 MB limit
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File quá lớn (tối đa 10MB)" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Chỉ hỗ trợ ảnh JPG, PNG, WebP, GIF" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "eduassess/rooms", resource_type: "image" },
          (err, result) => {
            if (err || !result) reject(err ?? new Error("Upload failed"));
            else resolve(result as { secure_url: string; public_id: string });
          },
        )
        .end(buffer);
    },
  );

  return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
}
