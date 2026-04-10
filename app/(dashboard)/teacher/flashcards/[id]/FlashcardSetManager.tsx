import { FlashcardSetEditor } from "@/components/flashcards/FlashcardSetEditor";

type Card = {
  id: string;
  order: number;
  imageUrl: string;
  caption: string | null;
};

export function FlashcardSetManager({
  setId,
  cards,
  canManage,
}: {
  setId: string;
  cards: Card[];
  canManage: boolean;
}) {
  return <FlashcardSetEditor setId={setId} cards={cards} role="teacher" readOnly={!canManage} />;
}
