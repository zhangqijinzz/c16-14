interface EmptyStateProps {
  onDemo: () => void;
}

export function EmptyState({ onDemo }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <div className="empty-orbit" aria-hidden="true"><span /><span /><span /></div>
      <p className="eyebrow">COMPOSITION LAB / 01</p>
      <h2>先把一张照片放进画框</h2>
      <p>叠加构图辅助线，找到主体的视觉重心，再保存不同裁切版本。</p>
      <button className="primary-button" onClick={onDemo}>载入示例图片</button>
      <span className="empty-hint">也可以从左上角导入本地图片</span>
    </section>
  );
}
