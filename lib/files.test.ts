import { describe, expect, it } from 'vitest';
import { fileExtension, fileProblem } from './files';

const RULES = { maxBytes: 20 * 1024 * 1024, extensions: ['jpg', 'png', 'pdf'] };
const file = (name: string, size: number) => ({ name, size });

describe('fileExtension', () => {
  it('reads the lowercase extension off tricky names', () => {
    expect(fileExtension('PHOTO.JPG')).toBe('jpg');
    expect(fileExtension('archive.tar.gz')).toBe('gz');
    expect(fileExtension('  scan.Pdf  ')).toBe('pdf');
  });

  it('says empty when there is no extension', () => {
    expect(fileExtension('README')).toBe('');
    expect(fileExtension('.hidden')).toBe('');
  });
});

describe('fileProblem', () => {
  it('passes a file inside every rule, including exactly at the limit', () => {
    expect(fileProblem(file('a.jpg', 100), RULES)).toBeNull();
    expect(fileProblem(file('a.jpg', 20 * 1024 * 1024), RULES)).toBeNull();
  });

  it('refuses a bad extension before looking at anything else', () => {
    expect(fileProblem(file('notes.exe', 100), RULES)).toBe('.exe files are not accepted here.');
    expect(fileProblem(file('notes.exe', 0), RULES)).toBe('.exe files are not accepted here.');
    expect(fileProblem(file('README', 100), RULES)).toBe('Files without an extension are not accepted.');
  });

  it('refuses an empty file, with an overridable message', () => {
    expect(fileProblem(file('a.jpg', 0), RULES)).toBe('The file is empty.');
    expect(fileProblem(file('a.jpg', 0), { ...RULES, emptyMessage: 'The register was empty.' })).toBe('The register was empty.');
  });

  it('refuses an oversized file, naming the limit', () => {
    expect(fileProblem(file('a.jpg', 20 * 1024 * 1024 + 1), RULES)).toBe('Larger than the 20 MB limit.');
  });

  it('leaves the type open when no extensions are given', () => {
    expect(fileProblem(file('anything.xyz', 100), { maxBytes: 5 })).toBe('Larger than the 5 B limit.');
    expect(fileProblem(file('anything.xyz', 4), { maxBytes: 5 })).toBeNull();
  });
});
