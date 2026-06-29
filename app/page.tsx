// app/page.tsx
'use client';
import { useEffect } from 'react';
import useStudioStore from '@/lib/store/studioStore';
import { createComposition } from '@/lib/composition/defaults';
import { EditorShell } from '@/components/editor/EditorShell';

export default function Page() {
  const loadComposition = useStudioStore((s) => s.loadComposition);
  const composition = useStudioStore((s) => s.composition);

  useEffect(() => {
    if (!composition) loadComposition(createComposition('untitled'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EditorShell />;
}
