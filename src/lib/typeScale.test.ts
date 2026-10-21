import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/** Source files of the shipped site (the dev-only admin page is exempt). */
function sources(): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.includes('.dev.')) out.push({ file: path.relative(process.cwd(), p), text: fs.readFileSync(p, 'utf8') });
    }
  };
  walk(path.join(process.cwd(), 'src'));
  return out;
}

describe('type scale and colours', () => {
  const files = sources();

  it('no arbitrary text size under 12px: use text-2xs (captions) or text-3xs (single-glyph badges)', () => {
    const bad: string[] = [];
    for (const { file, text } of files) for (const m of text.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) if (Number(m[1]) < 12) bad.push(`${file}: ${m[0]}`);
    expect(bad).toEqual([]);
  });

  it('text-3xs is only for single-glyph badges (font-black), never for words', () => {
    const bad: string[] = [];
    for (const { file, text } of files) text.split('\n').forEach((line, i) => { if (/text-3xs/.test(line) && !/font-black/.test(line)) bad.push(`${file}:${i + 1}`); });
    expect(bad).toEqual([]);
  });

  it('the scale is defined once, in CSS variables that grow on phones', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
    expect(css).toMatch(/--fs-2xs:\s*0\.6875rem/);
    expect(css).toMatch(/@media \(max-width: 767px\)\s*{\s*:root\s*{\s*--fs-2xs:\s*0\.75rem/);
    const config = fs.readFileSync(path.join(process.cwd(), 'tailwind.config.ts'), 'utf8');
    expect(config).toContain("'2xs': 'var(--fs-2xs)'");
  });

  it('no text uses a near-invisible white tint (text-white/10 to /40)', () => {
    const bad: string[] = [];
    for (const { file, text } of files) for (const m of text.matchAll(/(?<![\w-])text-white\/(?:10|15|20|25|30|35|40)\b/g)) bad.push(`${file}: ${m[0]}`);
    expect(bad).toEqual([]);
  });

  it('controls that reveal on hover also show on touch screens', () => {
    const bad: string[] = [];
    for (const { file, text } of files) text.split('\n').forEach((line, i) => {
      if (/(?<![\w:-])opacity-0 /.test(line) && /group-hover:opacity-100/.test(line) && !/md:opacity-0/.test(line)) bad.push(`${file}:${i + 1}`);
    });
    expect(bad).toEqual([]);
  });
});
