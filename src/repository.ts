import { isFrameDocument } from './domain';
import { EMPTY_DOCUMENT, type FrameDocument } from './model';
import type { StorageService } from './service';

export interface FrameRepository {
  load(): FrameDocument;
  save(document: FrameDocument): void;
}

export class LocalFrameRepository implements FrameRepository {
  constructor(private readonly storage: StorageService) {}

  load(): FrameDocument {
    const raw = this.storage.read();
    if (!raw) return structuredClone(EMPTY_DOCUMENT);
    try {
      const parsed: unknown = JSON.parse(raw);
      return isFrameDocument(parsed) ? parsed : structuredClone(EMPTY_DOCUMENT);
    } catch {
      return structuredClone(EMPTY_DOCUMENT);
    }
  }

  save(document: FrameDocument): void {
    this.storage.write(JSON.stringify(document));
  }
}
