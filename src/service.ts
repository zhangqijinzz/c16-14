import type { ImageAsset } from './model';

export const STORAGE_KEY = 'framesense.document.v1';

export interface StorageService {
  read(): string | null;
  write(value: string): void;
}

export class BrowserStorageService implements StorageService {
  read(): string | null {
    return window.localStorage.getItem(STORAGE_KEY);
  }

  write(value: string): void {
    window.localStorage.setItem(STORAGE_KEY, value);
  }
}

export interface ImageService {
  readFile(file: File): Promise<ImageAsset>;
  demo(): ImageAsset;
}

export class BrowserImageService implements ImageService {
  readFile(file: File): Promise<ImageAsset> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('图片读取失败，请换一张图片重试。'));
      reader.onload = () => {
        const src = typeof reader.result === 'string' ? reader.result : '';
        const image = new Image();
        image.onerror = () => reject(new Error('图片格式无法识别。'));
        image.onload = () => resolve({ src, width: image.naturalWidth, height: image.naturalHeight, name: file.name });
        image.src = src;
      };
      reader.readAsDataURL(file);
    });
  }

  demo(): ImageAsset {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#f9c86b"/><stop offset=".56" stop-color="#e88965"/><stop offset="1" stop-color="#39485f"/></linearGradient></defs><rect width="1200" height="800" fill="url(#sky)"/><circle cx="820" cy="260" r="115" fill="#ffe4a1" opacity=".9"/><path d="M0 650 260 430l180 110 190-250 420 360 150-90v240H0Z" fill="#233344"/><path d="M0 715 230 560l145 72 238-178 280 230 140-95 167 126H0Z" fill="#15232e" opacity=".9"/><text x="70" y="120" fill="#fff4dd" font-family="sans-serif" font-size="34" letter-spacing="8">FRAME STUDY 01</text></svg>`;
    return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, width: 1200, height: 800, name: 'FrameSense 示例风景.svg' };
  }
}
