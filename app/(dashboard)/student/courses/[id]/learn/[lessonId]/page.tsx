import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getLessonForStudent } from "@/lib/courses/queries";
import { LessonViewer } from "@/components/courses/LessonViewer";
import { FaIcon } from "@/components/ui/FaIcon";
import {
  faChevronLeft, faChevronRight, faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { MarkCompleteButton } from "./MarkCompleteButton";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getLessonForStudent(lessonId, session.user.id!);
  if (!data) notFound();

  // Redirect non-enrolled students
  if (!data.isEnrolled) redirect(`/student/courses/${id}`);

  const { lesson, prev, next, isCompleted } = data;

  // Extract YouTube embed URL if videoUrl is a youtube link
  function getYouTubeEmbed(url: string): string | null {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href={`/student/courses/${id}`}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 self-start"
      >
        <FaIcon icon={faArrowLeft} /> Về trang khóa học
      </Link>

      {/* Lesson header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
      </div>

      {/* Video */}
      {lesson.videoUrl && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--border-soft)" }}>
          {getYouTubeEmbed(lesson.videoUrl) ? (
            <div className="relative" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={getYouTubeEmbed(lesson.videoUrl)!}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ) : (
            <video
              src={lesson.videoUrl}
              controls
              className="w-full max-h-96 bg-black"
            />
          )}
        </div>
      )}

      {/* Content */}
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "var(--surface-strong)",
          border: "1.5px solid var(--border-soft)",
        }}
      >
        <LessonViewer content={lesson.content} />
      </div>

      {/* Footer: navigation + mark complete */}
      <div className="flex items-center justify-between py-2">
        {prev ? (
          <Link
            href={`/student/courses/${id}/learn/${prev.id}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaIcon icon={faChevronLeft} /> {prev.title}
          </Link>
        ) : (
          <div />
        )}

        <MarkCompleteButton
          lessonId={lessonId}
          courseId={id}
          nextLessonId={next?.id}
          isCompleted={isCompleted}
        />

        {next ? (
          <Link
            href={`/student/courses/${id}/learn/${next.id}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {next.title} <FaIcon icon={faChevronRight} />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
