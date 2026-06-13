import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { compressImage } from '../utils/imageCompressor';

describe('compressImage Utility', () => {
  let originalImage;

  beforeEach(() => {
    originalImage = global.Image;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  test('returns the original file if the file is not an image type', async () => {
    const textFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const result = await compressImage(textFile);
    expect(result).toBe(textFile);
  });

  test('returns the original file if file is undefined or null', async () => {
    const result = await compressImage(null);
    expect(result).toBeNull();
  });

  test('returns the original file if load fails', async () => {
    const mockObjectURL = 'blob:http://localhost/mock';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockObjectURL);
    const revokeObjectURLMock = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const imgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

    class MockImage {
      constructor() {
        // Trigger onerror on next tick
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Load error'));
        }, 0);
      }
    }
    global.Image = MockImage;

    const result = await compressImage(imgFile);
    expect(result).toBe(imgFile); // Falls back to original file
    expect(revokeObjectURLMock).toHaveBeenCalledWith(mockObjectURL);
  });

  test('compresses JPEG image successfully when it is larger', async () => {
    const mockObjectURL = 'blob:http://localhost/mock';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockObjectURL);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Create a 10KB dummy JPEG
    const dummyData = new Uint8Array(10000);
    const imgFile = new File([dummyData], 'test.jpg', { type: 'image/jpeg' });

    class MockImage {
      constructor() {
        this.naturalWidth = 2048;
        this.naturalHeight = 1024;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    }
    global.Image = MockImage;

    // Mock Canvas toBlob to return a smaller 2KB Blob
    const mockBlob = new Blob([new Uint8Array(2000)], { type: 'image/jpeg' });
    const mockContext = {
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn().mockImplementation((callback, type, quality) => {
        // Verify output parameters
        expect(type).toBe('image/jpeg');
        expect(quality).toBe(0.8);
        callback(mockBlob);
      }),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return {};
    });

    const result = await compressImage(imgFile, { maxSize: 1024, quality: 0.8 });
    
    // Canvas dimensions should be resized to max 1024px while keeping aspect ratio (2048x1024 -> 1024x512)
    expect(mockCanvas.width).toBe(1024);
    expect(mockCanvas.height).toBe(512);
    expect(mockContext.drawImage).toHaveBeenCalled();
    
    // Result should be the compressed file (smaller size)
    expect(result).not.toBe(imgFile);
    expect(result.size).toBe(2000);
    expect(result.type).toBe('image/jpeg');
  });
});
