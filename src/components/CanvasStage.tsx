import { useRef, useState, type PointerEvent } from 'react';
import type { CropVariant, GuideKey, ImageAsset } from '../model';

interface CanvasStageProps {
  image: ImageAsset;
  guides: Record<GuideKey, boolean>;
  crop: CropVariant;
  subject: { x: number; y: number } | null;
  onSubject: (x: number, y: number) => void;
  onMoveCrop: (dx: number, dy: number) => void;
  onResizeCrop: (width: number, height: number) => void;
}

export function CanvasStage({ image, guides, crop, subject, onSubject, onMoveCrop, onResizeCrop }: CanvasStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: 'move' | 'resize'; x: number; y: number; crop: CropVariant } | null>(null);
  const [dragging, setDragging] = useState(false);

  const pointFromEvent = (event: PointerEvent): { x: number; y: number } | null => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  };

  const startDrag = (event: PointerEvent, mode: 'move' | 'resize') => {
    event.stopPropagation();
    const point = pointFromEvent(event);
    if (!point) return;
    dragRef.current = { mode, x: point.x, y: point.y, crop };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent) => {
    if (!dragRef.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const { mode, x, y, crop: start } = dragRef.current;
    if (mode === 'move') onMoveCrop(point.x - x, point.y - y);
    else onResizeCrop(start.width + point.x - x, start.height + point.y - y);
    dragRef.current = { ...dragRef.current, x: point.x, y: point.y, crop: { ...crop } };
  };

  const stopDrag = () => { dragRef.current = null; setDragging(false); };

  const clickStage = (event: PointerEvent) => {
    if (dragging || (event.target as HTMLElement).closest('.crop-frame')) return;
    const point = pointFromEvent(event);
    if (point) onSubject(point.x, point.y);
  };

  return (
    <div className="stage-shell">
      <div className="canvas-stage" ref={stageRef} style={{ aspectRatio: `${image.width} / ${image.height}` }} onPointerDown={clickStage}>
        <img src={image.src} alt={image.name} draggable={false} />
        <div className="image-wash" />
        {guides.thirds && <div className="guide thirds-guide"><i /><i /><b /><b /></div>}
        {guides.center && <div className="guide center-guide"><i /><i /></div>}
        {guides.diagonal && <div className="guide diagonal-guide"><i /><i /></div>}
        {guides.golden && <div className="guide golden-guide"><i /><i /></div>}
        {subject && <div className="subject-pin" style={{ left: `${subject.x * 100}%`, top: `${subject.y * 100}%` }}><span>主体</span></div>}
        <div className={`crop-frame ${dragging ? 'dragging' : ''}`} style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }} onPointerDown={(event) => startDrag(event, 'move')} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
          <div className="crop-label">{crop.ratio === 'free' ? '自由裁切' : crop.ratio}</div>
          <button className="resize-handle" aria-label="调整裁切大小" onPointerDown={(event) => startDrag(event, 'resize')} onClick={(event) => event.stopPropagation()} />
        </div>
      </div>
      <div className="stage-caption"><span>点击画面标记主体 · 拖动画框调整位置</span><span>{image.width} × {image.height}px</span></div>
    </div>
  );
}
