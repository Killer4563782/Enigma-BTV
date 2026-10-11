import { useState } from 'react';
import { useKeydown, useBodyScrollLock } from '../../../core/hooks/index.js';

export function useChapterModal() {
  const [openChapter, setOpenChapter] = useState(null);

  const isOpen = openChapter !== null;

  useBodyScrollLock(isOpen);
  useKeydown('Escape', () => { if (isOpen) setOpenChapter(null); }, [isOpen]);

  return {
    openChapter,
    openModal:  (chapter) => setOpenChapter(chapter),
    closeModal: ()         => setOpenChapter(null),
  };
}
