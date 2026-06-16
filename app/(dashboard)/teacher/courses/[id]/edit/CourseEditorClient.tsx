"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LessonEditor } from "@/components/courses/LessonEditor";
import { LessonViewer } from "@/components/courses/LessonViewer";
import { FaIcon } from "@/components/ui/FaIcon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  faPlus, faTrash, faChevronUp, faChevronDown,
  faPaperPlane, faEdit, faArrowLeft, faSave,
  faEye, faCircleCheck, faClock, faArchive, faXmark,
  faChevronDown as faAccordionDown,
} from "@fortawesome/free-solid-svg-icons";
import {
  updateCourseAction,
  updateLessonAction,
  deleteLessonAction,
  reorderLessonsAction,
  submitCourseForReviewAction,
  deleteCourseAction,
} from "@/lib/courses/actions";

type Lesson = {
  id: string;
  title: string;
  content: string;
  videoUrl: string | null;
  order: number;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  thumbnail: string | null;
  status: string;
  isFree: boolean;
  subject: { id: string; name: string };
  lessons: Lesson[];
  _count: { enrollments: number; reviews: number };
};

// color = hex ngữ nghĩa; chip dùng tint color-mix nên đọc tốt cả light/dark.
const STATUS_INFO: Record<string, { label: string; color: string; icon: typeof faCircleCheck }> = {
  DRAFT: { label: "Nháp", color: "#64748b", icon: faEdit },
  PENDING: { label: "Chờ duyệt", color: "#d97706", icon: faClock },
  PUBLISHED: { label: "Đã xuất bản", color: "#16a34a", icon: faCircleCheck },
  ARCHIVED: { label: "Đã ẩn", color: "#dc2626", icon: faArchive },
};

export function CourseEditorClient({
  course,
  subjects,
  userRole,
}: {
  course: Course;
  subjects: { id: string; name: string }[];
  userRole: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [subjectId, setSubjectId] = useState(course.subjectId);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaMsg, setMetaMsg] = useState("");
  const [metaOpen, setMetaOpen] = useState(false);

  const [lessons, setLessons] = useState<Lesson[]>(course.lessons);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(lessons[0]?.id ?? null);
  const [editingLesson, setEditingLesson] = useState<{
    title: string; content: string; videoUrl: string;
  } | null>(null);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonMsg, setLessonMsg] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  async function saveMeta() {
    setMetaSaving(true); setMetaMsg("");
    const r = await updateCourseAction(course.id, { title, description, subjectId });
    setMetaSaving(false);
    setMetaMsg("error" in r ? `Lỗi: ${r.error}` : "Đã lưu ✓");
    setTimeout(() => setMetaMsg(""), 2500);
  }

  function startEditLesson(lesson: Lesson) {
    setActiveLessonId(lesson.id);
    setEditingLesson({ title: lesson.title, content: lesson.content, videoUrl: lesson.videoUrl ?? "" });
    setLessonMsg("");
  }

  async function saveLesson(lessonId: string) {
    if (!editingLesson) return;
    setLessonSaving(true); setLessonMsg("");
    const r = await updateLessonAction(lessonId, {
      title: editingLesson.title,
      content: editingLesson.content,
      videoUrl: editingLesson.videoUrl || undefined,
    });
    setLessonSaving(false);
    if ("error" in r) { setLessonMsg(`Lỗi: ${r.error}`); }
    else {
      setLessons((prev) => prev.map((l) => l.id === lessonId ? { ...l, ...editingLesson, videoUrl: editingLesson.videoUrl || null } : l));
      setLessonMsg("Đã lưu ✓");
      setTimeout(() => setLessonMsg(""), 2500);
    }
  }

  async function deleteLesson(lessonId: string) {
    if (
      !(await confirm({
        title: "Xóa bài giảng",
        message: "Bài giảng này sẽ bị xóa vĩnh viễn. Tiếp tục?",
        confirmLabel: "Xóa",
        variant: "danger",
      }))
    )
      return;
    const r = await deleteLessonAction(lessonId);
    if (!("error" in r)) {
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      if (activeLessonId === lessonId) {
        const remaining = lessons.filter((l) => l.id !== lessonId);
        setActiveLessonId(remaining[0]?.id ?? null);
        setEditingLesson(null);
      }
    }
  }

  async function moveLesson(idx: number, dir: -1 | 1) {
    const newList = [...lessons];
    const target = idx + dir;
    if (target < 0 || target >= newList.length) return;
    [newList[idx], newList[target]] = [newList[target], newList[idx]];
    const updated = newList.map((l, i) => ({ ...l, order: i + 1 }));
    setLessons(updated);
    await reorderLessonsAction(course.id, updated.map((l) => l.id));
  }

  async function submitForReview() {
    if (
      !(await confirm({
        title: "Gửi duyệt",
        message: "Gửi khóa học này cho admin duyệt? Khi đang chờ duyệt bạn sẽ không sửa được trạng thái.",
        confirmLabel: "Gửi duyệt",
      }))
    )
      return;
    setSubmitting(true); setSubmitMsg("");
    const r = await submitCourseForReviewAction(course.id);
    setSubmitting(false);
    if ("error" in r) { setSubmitMsg(r.error); } else { router.refresh(); }
  }

  async function handleDelete() {
    if (
      !(await confirm({
        title: "Xóa khóa học",
        message: `Xóa vĩnh viễn khóa học "${title}"? Mọi bài giảng và dữ liệu liên quan sẽ mất.`,
        confirmLabel: "Xóa khóa học",
        variant: "danger",
      }))
    )
      return;
    const r = await deleteCourseAction(course.id);
    if (!("error" in r)) router.push("/teacher/courses");
  }

  const si = STATUS_INFO[course.status] ?? STATUS_INFO.DRAFT;
  const activeLesson = lessons.find((l) => l.id === activeLessonId);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link href="/teacher/courses" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <FaIcon icon={faArrowLeft} /> Khóa học
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5"
            style={{
              backgroundColor: `color-mix(in srgb, ${si.color} 14%, transparent)`,
              color: si.color,
            }}
          >
            <FaIcon icon={si.icon} /> {si.label}
          </span>
          {course.status === "PUBLISHED" && (
            <Link href={"/student/courses/" + course.id} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <FaIcon icon={faEye} /> Xem
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--border-soft)" }}>
            <button type="button" onClick={() => setMetaOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-black/5 transition-colors"
              style={{ backgroundColor: "var(--surface-strong)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-gray-700 truncate">{title}</span>
                {metaMsg && <span className="text-xs text-green-600 shrink-0">{metaMsg}</span>}
              </div>
              <FaIcon icon={faAccordionDown} className={"text-gray-400 text-xs shrink-0 ml-2 transition-transform duration-200 " + (metaOpen ? "rotate-180" : "")} />
            </button>
            {metaOpen && (
              <div className="px-4 pb-4 pt-3 space-y-3 border-t" style={{ borderColor: "var(--border-soft)", backgroundColor: "var(--surface-strong)" }}>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tên</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Môn học</label>
                  <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Mô tả</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <button type="button" onClick={saveMeta} disabled={metaSaving}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-1.5">
                  <FaIcon icon={faSave} /> {metaSaving ? "Đang lưu…" : "Lưu thông tin"}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border-soft)" }}>
              <h2 className="font-semibold text-sm text-gray-700">Bài giảng <span className="text-gray-400 font-normal">({lessons.length})</span></h2>
              <Link
                href={`/teacher/courses/${course.id}/lessons/new`}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <FaIcon icon={faPlus} /> Thêm
              </Link>
            </div>
            {lessons.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6 px-4">Chưa có bài giảng nào.</p>
            )}
            <ul className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
              {lessons.map((l, idx) => (
                <li key={l.id} className="group flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer"
                  style={{ backgroundColor: activeLessonId === l.id ? "color-mix(in srgb, var(--primary) 8%, var(--surface-strong))" : "transparent" }}
                  onClick={() => startEditLesson(l)}>
                  <span className="text-xs text-gray-400 w-4 shrink-0 text-center">{l.order}</span>
                  <span className="flex-1 text-sm truncate text-gray-800">{l.title}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveLesson(idx, -1); }} disabled={idx === 0}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">
                      <FaIcon icon={faChevronUp} />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveLesson(idx, 1); }} disabled={idx === lessons.length - 1}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">
                      <FaIcon icon={faChevronDown} />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteLesson(l.id); }}
                      className="w-5 h-5 flex items-center justify-center rounded text-red-400 hover:text-red-600 text-xs">
                      <FaIcon icon={faTrash} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            {course.status === "DRAFT" && userRole === "TEACHER" && (
              <button type="button" onClick={submitForReview} disabled={submitting || lessons.length === 0}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                <FaIcon icon={faPaperPlane} /> {submitting ? "Đang gửi…" : "Gửi duyệt"}
              </button>
            )}
            {submitMsg && <p className="text-xs text-red-600 text-center">{submitMsg}</p>}
            <button type="button" onClick={handleDelete}
              className="w-full border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
              <FaIcon icon={faTrash} /> Xóa khóa học
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          {activeLesson && editingLesson ? (
            <LessonEditPanel lesson={activeLesson} editingLesson={editingLesson} setEditingLesson={setEditingLesson}
              saving={lessonSaving} msg={lessonMsg} onSave={() => saveLesson(activeLesson.id)} onPreview={() => setPreviewOpen(true)} />
          ) : (
            <div className="flex items-center justify-center h-48 rounded-xl"
              style={{ backgroundColor: "var(--surface-strong)", border: "1.5px dashed var(--border-soft)" }}>
              <p className="text-sm text-gray-400">Chọn một bài giảng để chỉnh sửa</p>
            </div>
          )}
        </div>
      </div>

      {previewOpen && editingLesson && (
        <div className="fixed inset-0 z-50 bg-black/75 flex flex-col overflow-auto" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-2xl mx-auto my-6 w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden"
            style={{ minHeight: "min(90vh, 600px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border-soft)" }}>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Xem trước • học sinh sẽ thấy như sau</p>
                <h2 className="text-lg font-bold text-gray-900">{editingLesson.title}</h2>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)}
                className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors shrink-0">
                <FaIcon icon={faXmark} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {editingLesson.videoUrl && (() => {
                const ytMatch = editingLesson.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                return ytMatch ? (
                  <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--border-soft)" }}>
                    <div className="relative" style={{ paddingBottom: "56.25%" }}>
                      <iframe src={"https://www.youtube.com/embed/" + ytMatch[1]}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen className="absolute inset-0 w-full h-full" />
                    </div>
                  </div>
                ) : (
                  <video src={editingLesson.videoUrl} controls className="w-full rounded-xl max-h-80 bg-black" />
                );
              })()}
              <div className="rounded-xl p-5" style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}>
                {editingLesson.content ? <LessonViewer content={editingLesson.content} /> : <p className="text-sm italic text-gray-400">Chưa có nội dung.</p>}
              </div>
              <p className="text-xs text-center text-gray-400 pb-2">Đây là giao diện mà học sinh sẽ thấy khi học bài này</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LessonEditPanel({ lesson, editingLesson, setEditingLesson, saving, msg, onSave, onPreview }: {
  lesson: Lesson;
  editingLesson: { title: string; content: string; videoUrl: string };
  setEditingLesson: React.Dispatch<React.SetStateAction<typeof editingLesson | null>>;
  saving: boolean; msg: string;
  onSave: () => void; onPreview: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl" style={{ backgroundColor: "var(--surface-strong)", border: "1.5px solid var(--border-soft)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-gray-800 truncate max-w-xs">{lesson.title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {msg && <span className="text-xs text-green-600">{msg}</span>}
          <button type="button" onClick={onPreview}
            className="border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5">
            <FaIcon icon={faEye} /> Xem trước
          </button>
          <button type="button" onClick={onSave} disabled={saving}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-1.5">
            <FaIcon icon={faSave} /> {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tiêu đề bài</label>
        <input value={editingLesson.title} onChange={(e) => setEditingLesson((prev) => prev && ({ ...prev, title: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nội dung (Markdown)</label>
        <LessonEditor value={editingLesson.content} onChange={(v) => setEditingLesson((prev) => prev && ({ ...prev, content: v }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">URL video (YouTube / Cloudinary — tuỳ chọn)</label>
        <input value={editingLesson.videoUrl} onChange={(e) => setEditingLesson((prev) => prev && ({ ...prev, videoUrl: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://youtube.com/watch?v=..." />
      </div>
    </div>
  );
}
