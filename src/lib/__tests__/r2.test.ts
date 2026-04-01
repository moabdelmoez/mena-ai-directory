import { describe, it, expect } from 'vitest';
import { validateMediaFile } from '../r2';

describe('validateMediaFile', () => {
  it('accepts valid PNG image', () => {
    const file = new File(['data'], 'screenshot.png', { type: 'image/png' });
    const result = validateMediaFile(file);
    expect(result.error).toBeNull();
    expect(result.fileType).toBe('image');
    expect(result.ext).toBe('png');
  });

  it('accepts valid JPEG image', () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const result = validateMediaFile(file);
    expect(result.error).toBeNull();
    expect(result.fileType).toBe('image');
    expect(result.ext).toBe('jpg');
  });

  it('accepts valid WebP image', () => {
    const file = new File(['data'], 'image.webp', { type: 'image/webp' });
    const result = validateMediaFile(file);
    expect(result.error).toBeNull();
    expect(result.fileType).toBe('image');
    expect(result.ext).toBe('webp');
  });

  it('accepts valid MP4 video', () => {
    const file = new File(['data'], 'demo.mp4', { type: 'video/mp4' });
    const result = validateMediaFile(file);
    expect(result.error).toBeNull();
    expect(result.fileType).toBe('video');
    expect(result.ext).toBe('mp4');
  });

  it('accepts valid WebM video', () => {
    const file = new File(['data'], 'demo.webm', { type: 'video/webm' });
    const result = validateMediaFile(file);
    expect(result.error).toBeNull();
    expect(result.fileType).toBe('video');
    expect(result.ext).toBe('webm');
  });

  it('accepts valid PDF document', () => {
    const file = new File(['data'], 'pitch.pdf', { type: 'application/pdf' });
    const result = validateMediaFile(file);
    expect(result.error).toBeNull();
    expect(result.fileType).toBe('document');
    expect(result.ext).toBe('pdf');
  });

  it('rejects unsupported file type', () => {
    const file = new File(['data'], 'script.exe', { type: 'application/x-msdownload' });
    const result = validateMediaFile(file);
    expect(result.error).toContain('Unsupported file type');
  });

  it('rejects image over 5MB', () => {
    const largeData = new Uint8Array(5.1 * 1024 * 1024);
    const file = new File([largeData], 'huge.png', { type: 'image/png' });
    const result = validateMediaFile(file);
    expect(result.error).toContain('5MB');
  });

  it('rejects video over 50MB', () => {
    const largeData = new Uint8Array(50.1 * 1024 * 1024);
    const file = new File([largeData], 'huge.mp4', { type: 'video/mp4' });
    const result = validateMediaFile(file);
    expect(result.error).toContain('50MB');
  });

  it('rejects PDF over 10MB', () => {
    const largeData = new Uint8Array(10.1 * 1024 * 1024);
    const file = new File([largeData], 'huge.pdf', { type: 'application/pdf' });
    const result = validateMediaFile(file);
    expect(result.error).toContain('10MB');
  });
});
