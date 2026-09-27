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

interface DeferredRead {
  resolve: (asset: ImageAsset) => void;
  reject: (error: Error) => void;
}

class ControlledImageService implements ImageService {
  readonly reads: DeferredRead[] = [];
  demoAsset: ImageAsset = { src: 'data:image/svg+xml,demo', width: 1200, height: 800, name: 'demo.svg' };
  readFile() {
    return new Promise<ImageAsset>((resolve, reject) => { this.reads.push({ resolve, reject }); });
  }
  demo() { return this.demoAsset; }
}

function asset(name: string): ImageAsset {
  return { src: `data:image/svg+xml,${name}`, width: 800, height: 600, name };
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

  describe('并发导入', () => {
    let service: ControlledImageService;
    beforeEach(() => { service = new ControlledImageService(); vm = new FrameSenseViewModel(repository, service); });

    it('先发起的导入晚到时被丢弃，不覆盖后发起的导入', async () => {
      void vm.importImage(new File([], 'a-slow.png'));
      void vm.importImage(new File([], 'b-fast.png'));
      service.reads[1].resolve(asset('b-fast.png'));
      await Promise.resolve();
      expect(vm.getSnapshot().document.image?.name).toBe('b-fast.png');
      service.reads[0].resolve(asset('a-slow.png'));
      await Promise.resolve();
      expect(vm.getSnapshot().document.image?.name).toBe('b-fast.png');
      expect(repository.document.image?.name).toBe('b-fast.png');
    });

    it('示例图载入后，挂起的导入结果不再生效', async () => {
      void vm.importImage(new File([], 'a-slow.png'));
      vm.loadDemo();
      service.reads[0].resolve(asset('a-slow.png'));
      await Promise.resolve();
      expect(vm.getSnapshot().document.image?.name).toBe('demo.svg');
    });

    it('导入过程中提示正在处理的文件名', () => {
      void vm.importImage(new File([], 'a-slow.png'));
      expect(vm.getSnapshot().phase).toBe('loading');
      expect(vm.getSnapshot().notice).toContain('a-slow.png');
    });

    it('当前导入失败时保留已显示的图片', async () => {
      vm.loadDemo();
      void vm.importImage(new File([], 'broken.png'));
      service.reads[0].reject(new Error('图片格式无法识别。'));
      await Promise.resolve();
      expect(vm.getSnapshot().document.image?.name).toBe('demo.svg');
      expect(vm.getSnapshot().phase).toBe('editing');
      expect(vm.getSnapshot().error).toContain('图片格式无法识别。');
    });

    it('过期导入的失败不影响当前状态', async () => {
      void vm.importImage(new File([], 'a-fail.png'));
      void vm.importImage(new File([], 'b-ok.png'));
      service.reads[0].reject(new Error('图片读取失败。'));
      await Promise.resolve();
      expect(vm.getSnapshot().error).toBeNull();
      service.reads[1].resolve(asset('b-ok.png'));
      await Promise.resolve();
      expect(vm.getSnapshot().document.image?.name).toBe('b-ok.png');
      expect(vm.getSnapshot().phase).toBe('editing');
    });
  });
});
