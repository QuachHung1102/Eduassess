"use client";

import { useState } from "react";
import { assignClassTeachersAction } from "@/lib/classes/actions";
import { PeoplePickerModal } from "@/components/staff/PeoplePickerModal";

interface Teacher {
  id: string;
  name: string | null;
  email: string | null;
}

export function AssignTeacherForm({
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
        className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        + Phân công
      </button>

      <PeoplePickerModal
        open={open}
        onClose={() => setOpen(false)}
        title="Phân giáo viên vào lớp"
        description="Chọn một hoặc nhiều giáo viên để phụ trách lớp này."
        confirmLabel="Phân công"
        emptyText="Không còn giáo viên để phân công."
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
