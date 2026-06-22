"use client";

import { useState, useMemo } from "react";
import { enrollStudentsAction } from "@/lib/classes/actions/enrollment";
import { PeoplePickerModal, type PickablePerson } from "@/components/staff/PeoplePickerModal";
import { FaIcon } from "@/components/ui/FaIcon";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
}

export function AddStudentsButton({
  classId,
  students,
  suggestedIds = [],
}: {
  classId: string;
  students: Student[];
  /** Học sinh phù hợp trình độ mục tiêu — đẩy lên đầu và đánh dấu. */
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
        className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
        style={{ color: "var(--primary)" }}
      >
        <FaIcon icon={faUserPlus} className="text-xs" />
        {students.length === 0 ? "Đã thêm hết học sinh" : "Thêm học sinh"}
      </button>

      <PeoplePickerModal
        open={open}
        onClose={() => setOpen(false)}
        title="Thêm học sinh vào lớp"
        description="Học sinh được đánh dấu “Phù hợp” khớp trình độ mục tiêu của lớp."
        confirmLabel="Thêm vào lớp"
        emptyText="Tất cả học sinh đã được thêm."
        searchPlaceholder="Tìm học sinh..."
        people={people}
        onConfirm={async (ids) => {
          const res = await enrollStudentsAction(classId, ids);
          return res.error ?? null;
        }}
      />
    </>
  );
}
