import { useEffect, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { EmptyState } from './components/EmptyState';
import { Toolbar } from './components/Toolbar';
import { VariantList } from './components/VariantList';
import { LocalFrameRepository } from './repository';
import { BrowserImageService, BrowserStorageService } from './service';
import type { CropVariant, ImageAsset, Ratio } from './model';
import { useFrameSenseViewModel } from './viewModel';

const repository = new LocalFrameRepository(new BrowserStorageService());
const imageService = new BrowserImageService();

export default function App() {
  const [viewModel, state] = useFrameSenseViewModel(repository, imageService);
  const [showInfo, setShowInfo] = useState(false);
  useEffect(() => { void viewModel.initialize(); }, [viewModel]);
  const { document } = state;
  const handleImport = (file: File) => { void viewModel.importImage(file); };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">◒</span><span>Frame<span>Sense</span></span><small>COMPOSITION PRACTICE</small></div>
        <div className="topbar-status"><span className={`status-dot ${state.phase === 'error' ? 'error' : ''}`} />{state.phase === 'loading' ? '处理中…' : state.phase === 'error' ? '需要注意' : document.image ? '工作台已就绪' : '等待一张图片'}<button className="info-button" aria-label="关于 FrameSense" onClick={() => setShowInfo(!showInfo)}>i</button></div>
      </header>
      {showInfo && <div className="info-popover"><strong>FrameSense</strong><p>把构图规则变成可以移动、比较和保存的辅助层。所有图片只在本地处理。</p></div>}
      <main className="workspace">
        <Toolbar guides={document.guides} ratio={document.crop.ratio} onImport={handleImport} onDemo={() => viewModel.loadDemo()} onToggleGuide={(guide) => viewModel.toggleGuide(guide)} onRatio={(ratio: Ratio) => viewModel.setRatio(ratio)} onCompare={() => viewModel.toggleCompare()} compareOpen={state.compareOpen} />
        <section className="work-area">
          <div className="work-heading"><div><p className="eyebrow">WORKSPACE / {document.image ? 'EDITING' : 'READY'}</p><h1>{document.image ? document.image.name : '构图工作台'}</h1></div><div className="notice" role="status">{state.error ?? state.notice}</div></div>
          {!document.image ? <EmptyState onDemo={() => viewModel.loadDemo()} /> : state.compareOpen ? <Comparison image={document.image} variants={document.variants} /> : <CanvasStage image={document.image} guides={document.guides} crop={document.crop} subject={document.subject} onSubject={(x, y) => viewModel.markSubject(x, y)} onMoveCrop={(dx, dy) => viewModel.moveCrop(dx, dy)} onResizeCrop={(width, height) => viewModel.resizeCrop(width, height)} />}
          {document.image && !state.compareOpen && <div className="editor-footer"><span><b>当前比例</b> {document.crop.ratio === 'free' ? '自由裁切' : document.crop.ratio}</span><span><b>辅助层</b> {Object.values(document.guides).filter(Boolean).length} 个开启</span><span><b>主体</b> {document.subject ? '已标记' : '点击画面添加'}</span></div>}
        </section>
        {document.image && <VariantList variants={document.variants} image={document.image} current={document.crop} onSave={() => viewModel.saveVariant()} onSelect={(id) => viewModel.selectVariant(id)} />}
      </main>
      <footer className="footer"><span>FrameSense · 原图不会被修改</span><span>本地自动保存 · {document.variants.length}/8 方案</span></footer>
    </div>
  );
}

function Comparison({ image, variants }: { image: ImageAsset; variants: CropVariant[] }) {
  return <div className="comparison"><div className="compare-intro"><p className="eyebrow">SIDE BY SIDE / {variants.length} FRAMES</p><h2>把取舍放在一起看</h2><p>保存的每个版本都保留原图，只改变裁切窗口。</p></div>{variants.length === 0 ? <div className="compare-empty">先在工作台保存至少一个裁切方案。</div> : <div className="comparison-grid">{variants.map((variant, index) => <article key={variant.id}><div className="compare-image"><img src={image.src} alt={`方案 ${index + 1}`} style={{ objectPosition: `${variant.x * 100}% ${variant.y * 100}%` }} /><span>方案 {String(index + 1).padStart(2, '0')}</span></div><div><strong>{variant.ratio === 'free' ? '自由裁切' : variant.ratio}</strong><small>{Math.round(variant.width * 100)}% × {Math.round(variant.height * 100)}%</small></div></article>)}</div>}</div>;
}
