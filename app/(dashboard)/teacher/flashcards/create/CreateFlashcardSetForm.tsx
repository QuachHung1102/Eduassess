import { FlashcardSetForm } from "@/components/flashcards/FlashcardSetForm";

type Subject = {
  id: string;
  name: string;
};

type Grade = {
  id: string;
  level: "PRIMARY" | "MIDDLE" | "HIGH";
  gradeNumber: number;
};

export function CreateFlashcardSetForm({
  subjects,
  grades,
}: {
  subjects: Subject[];
  grades: Grade[];
}) {
  return <FlashcardSetForm role="teacher" subjects={subjects} grades={grades} />;
}
