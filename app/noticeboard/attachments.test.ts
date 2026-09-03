import { describe, it, expect } from 'vitest';
import { attachmentKind, isPreviewableImage } from './attachments';

describe('attachmentKind', () => {
  it('classifies images', () => {
    expect(attachmentKind('photo.jpg')).toBe('image');
    expect(attachmentKind('photo.JPEG')).toBe('image'); // case-insensitive
    expect(attachmentKind('scan.heic')).toBe('image');
  });
  it('classifies video and audio', () => {
    expect(attachmentKind('briefing.mp4')).toBe('video');
    expect(attachmentKind('note.mp3')).toBe('audio');
  });
  it('classifies pdf, spreadsheet, document, archive distinctly', () => {
    expect(attachmentKind('policy.pdf')).toBe('pdf');
    expect(attachmentKind('budget.xlsx')).toBe('spreadsheet');
    expect(attachmentKind('memo.docx')).toBe('document');
    expect(attachmentKind('bundle.zip')).toBe('archive');
  });
  it('falls back to "file" for an unrecognized or missing extension', () => {
    expect(attachmentKind('README')).toBe('file');
    expect(attachmentKind('mystery.xyz')).toBe('file');
  });
  it('reads the extension off a full URL, ignoring query/hash', () => {
    expect(attachmentKind('https://cdn.example.com/notices/abc.png?token=123')).toBe('image');
    expect(attachmentKind('https://cdn.example.com/notices/abc.pdf#page=2')).toBe('pdf');
  });
});

describe('isPreviewableImage', () => {
  it('is true only for image kinds', () => {
    expect(isPreviewableImage('photo.png')).toBe(true);
    expect(isPreviewableImage('memo.pdf')).toBe(false);
  });
});
