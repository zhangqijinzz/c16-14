import { beforeEach, describe, expect, it } from 'vitest';
import { FrameSenseViewModel } from '../viewModel';
import { EMPTY_DOCUMENT, type FrameDocument, type ImageAsset } from '../model';
import type { FrameRepository } from '../repository';
import type { ImageService } from '../service';

class MemoryRepository implements FrameRepository {
  document: FrameDocument = structuredClone(EMPTY_DOCUMENT);
  fail = false;
  load() { return structuredClone(this.document); }
  save(document: FrameDocument) { if (this.fail) throw new Error('no storage'); this.document = structuredClone(document); }
}

class FakeImageService implements ImageService {
  asset: ImageAsset = { src: 'data:image/svg+xml,test', width: 1200, height: 800, name: 'test.svg' };
  readFile() { return Promise.resolve(this.asset); }
  demo() { return this.asset; }
}

class DeferredImageService implements ImageService {
  private pending = new Map<string, { resolve: (asset: ImageAsset) => void; reject: (error: Error) => void }>();
  private readonly demoAsset: ImageAsset = { src: 'data:image/svg+xml,demo', width: 1200, height: 800, name: 'demo.svg' };
  readFile(file: File) {
    return new Promise<ImageAsset>((resolve, reject) => {
      this.pending.set(file.name, { resolve, reject });
    });
  }
  resolveImport(name: string) {
    this.pending.get(name)?.resolve({ src: `data:${name}`, width: 800, height: 600, name });
    this.pending.delete(name);
  }
  rejectImport(name: string, message: string) {
    this.pending.get(name)?.reject(new Error(message));
    this.pending.delete(name);
  }
  demo() { return this.demoAsset; }
}

describe('FrameSenseViewModel', () => {
  let repository: MemoryRepository;
  let vm: FrameSenseViewModel;
  beforeEach(() => { repository = new MemoryRepository(); vm = new FrameSenseViewModel(repository, new FakeImageService()); });

  it('initializes empty and loads a demo image', async () => {
    await vm.initialize();
    expect(vm.getSnapshot().phase).toBe('ready');
    vm.loadDemo();
    expect(vm.getSnapshot().document.image?.name).toBe('test.svg');
    expect(repository.document.image).not.toBeNull();
  });

  it('updates guides, subject, ratio, and variants', () => {
    vm.loadDemo();
    vm.toggleGuide('center');
    vm.markSubject(0.2, 0.8);
    vm.setRatio('1:1');
    vm.saveVariant();
    expect(vm.getSnapshot().document.guides.center).toBe(true);
    expect(vm.getSnapshot().document.subject).toEqual({ x: 0.2, y: 0.8 });
    expect(vm.getSnapshot().document.crop.ratio).toBe('1:1');
    expect(vm.getSnapshot().document.variants).toHaveLength(1);
  });

  it('keeps edits in memory and reports persistence failure', () => {
    repository.fail = true;
    vm.loadDemo();
    expect(vm.getSnapshot().phase).toBe('error');
    expect(vm.getSnapshot().document.image).not.toBeNull();
    expect(vm.getSnapshot().error).toContain('本地保存失败');
  });
});

describe('FrameSenseViewModel 异步导入竞态', () => {
  let repository: MemoryRepository;
  let images: DeferredImageService;
  let vm: FrameSenseViewModel;
  const file = (name: string) => new File(['x'], name, { type: 'image/png' });
  beforeEach(() => { repository = new MemoryRepository(); images = new DeferredImageService(); vm = new FrameSenseViewModel(repository, images); });

  it('shows which file is loading without clearing the current image', () => {
    vm.loadDemo();
    void vm.importImage(file('big.png'));
    expect(vm.getSnapshot().phase).toBe('loading');
    expect(vm.getSnapshot().notice).toContain('big.png');
    expect(vm.getSnapshot().document.image?.name).toBe('demo.svg');
  });

  it('discards a late import result that arrives after loadDemo', async () => {
    const slow = vm.importImage(file('slow.png'));
    vm.loadDemo();
    images.resolveImport('slow.png');
    await slow;
    expect(vm.getSnapshot().document.image?.name).toBe('demo.svg');
    expect(vm.getSnapshot().phase).toBe('editing');
  });

  it('applies only the newest import when two are in flight', async () => {
    const first = vm.importImage(file('first.png'));
    const second = vm.importImage(file('second.png'));
    images.resolveImport('first.png');
    await first;
    expect(vm.getSnapshot().document.image).toBeNull();
    expect(vm.getSnapshot().phase).toBe('loading');
    images.resolveImport('second.png');
    await second;
    expect(vm.getSnapshot().document.image?.name).toBe('second.png');
    expect(vm.getSnapshot().phase).toBe('editing');
  });

  it('keeps the usable image when the current import fails', async () => {
    vm.loadDemo();
    const failing = vm.importImage(file('broken.png'));
    images.rejectImport('broken.png', '图片格式无法识别。');
    await failing;
    expect(vm.getSnapshot().document.image?.name).toBe('demo.svg');
    expect(vm.getSnapshot().phase).toBe('editing');
    expect(vm.getSnapshot().error).toBe('图片格式无法识别。');
  });

  it('ignores a stale import failure after a newer load', async () => {
    const stale = vm.importImage(file('stale.png'));
    vm.loadDemo();
    images.rejectImport('stale.png', '图片读取失败。');
    await stale;
    expect(vm.getSnapshot().document.image?.name).toBe('demo.svg');
    expect(vm.getSnapshot().error).toBeNull();
    expect(vm.getSnapshot().phase).toBe('editing');
  });
});
