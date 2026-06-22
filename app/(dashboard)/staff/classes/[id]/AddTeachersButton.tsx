"use client";

import { useState } from "react";
import { assignClassTeachersAction } from "@/lib/classes/actions/enrollment";
import { PeoplePickerModal } from "@/components/staff/PeoplePickerModal";
import { FaIcon } from "@/components/ui/FaIcon";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

interface Teacher {
  id: string;
  name: string | null;
  email: string | null;
}

export function AddTeachersButton({
  classId,
  teachers,
}: {
  classId: string;
  teachers: Teacher[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={teachers.length === 0}
        className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
        style={{ color: "var(--primary)" }}
      >
        <FaIcon icon={faPlus} className="text-xs" />
        {teachers.length === 0 ? "Đã phân hết giáo viên" : "Phân giáo viên"}
      </button>

      <PeoplePickerModal
        open={open}
        onClose={() => setOpen(false)}
        title="Phân giáo viên vào lớp"
        description="Chọn một hoặc nhiều giáo viên để phụ trách lớp này."
        confirmLabel="Phân công"
        emptyText="Tất cả giáo viên đã được phân công."
        searchPlaceholder="Tìm giáo viên..."
        people={teachers}
        onConfirm={async (ids) => {
          const res = await assignClassTeachersAction(classId, ids);
          return res.error ?? null;
        }}
      />
    </>
  );
}
