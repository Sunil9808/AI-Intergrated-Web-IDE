import { useRef, useCallback } from 'react';

interface ResizableOptions {
  direction: 'horizontal' | 'vertical';
  min: number;
  max: number;
  onResize: (size: number) => void;
  initialSize: number;
}

export function useResizable({ direction, min, max, onResize, initialSize }: ResizableOptions) {
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(initialSize);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = initialSize;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      const newSize = Math.max(min, Math.min(max, startSize.current + delta));
      onResize(newSize);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [direction, min, max, onResize, initialSize]);

  return { onMouseDown, isDragging };
}
