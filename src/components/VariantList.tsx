import type { CropVariant, ImageAsset } from '../model';

interface VariantListProps {
  variants: CropVariant[];
  image: ImageAsset;
  current: CropVariant;
  onSave: () => void;
  onSelect: (id: string) => void;
}

export function VariantList({ variants, image, current, onSave, onSelect }: VariantListProps) {
  return (
    <section className="variants-panel">
      <div className="panel-heading"><div><p className="eyebrow">SAVED FRAMES</p><h3>裁切方案 <span>{variants.length}</span></h3></div><button className="save-button" onClick={onSave}>保存当前</button></div>
      {variants.length === 0 ? <div className="variant-empty"><span>◇</span><p>还没有保存的方案</p><small>调整画框后保存，比较不同构图取舍。</small></div> : <div className="variant-list">{variants.map((variant, index) => <button className={`variant-card ${current.x === variant.x && current.y === variant.y && current.width === variant.width ? 'selected' : ''}`} key={variant.id} onClick={() => onSelect(variant.id)}><span className="variant-thumb"><img src={image.src} alt="" style={{ objectPosition: `${variant.x * 100}% ${variant.y * 100}%` }} /></span><span><strong>方案 {String(index + 1).padStart(2, '0')}</strong><small>{variant.ratio === 'free' ? '自由裁切' : variant.ratio} · {Math.round(variant.width * 100)}%</small></span><em>→</em></button>)}</div>}
      <div className="variant-tip"><span>✦</span><p>建议保存至少 3 个版本：<br />保守、平衡、实验性。</p></div>
    </section>
  );
}
