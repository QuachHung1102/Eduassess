"use client";

import { useState, useMemo } from "react";
import { enrollStudentsAction } from "@/lib/classes/actions/enrollment";
import { PeoplePickerModal, type PickablePerson } from "@/components/staff/PeoplePickerModal";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
}

export function AssignStudentForm({
  classId,
  students,
  suggestedIds = [],
}: {
  classId: string;
  students: Student[];
  suggestedIds?: string[];
}) {
  const [open, setOpen] = useState(false);

  const people = useMemo<PickablePerson[]>(() => {
    const suggested = new Set(suggestedIds);
    return [...students]
      .map((s) => ({ ...s, highlighted: suggested.has(s.id) }))
      .sort((a, b) => Number(b.highlighted) - Number(a.highlighted));
  }, [students, suggestedIds]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={students.length === 0}
        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        + Thêm học sinh
      </button>

      <PeoplePickerModal
        open={open}
        onClose={() => setOpen(false)}
        title="Thêm học sinh vào lớp"
        description='Học sinh được đánh dấu "Phù hợp" khớp trình độ mục tiêu của lớp.'
        confirmLabel="Thêm vào lớp"
        emptyText="Không còn học sinh để thêm."
        searchPlaceholder="Tìm theo tên hoặc email..."
        people={people}
        onConfirm={async (ids) => {
          const res = await enrollStudentsAction(classId, ids);
          return res.error ?? null;
        }}
      />
    </>
  );
}
