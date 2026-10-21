import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// The generator is plain ESM next to the build scripts.
import { build, CLASS_RE } from '../../scripts/build-light-accents.mjs';

describe('light-theme accent colours', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'light-accents.css'), 'utf8');

  it('the committed CSS is what the generator produces (rerun scripts/build-light-accents.mjs)', () => {
    expect(css).toBe(build());
  });

  it('every accent text class used in the source has a light-theme rule', () => {
    const used = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(CLASS_RE as RegExp)) used.add(m[0]);
      }
    };
    walk(path.join(process.cwd(), 'src'));
    expect(used.size).toBeGreaterThan(30);
    for (const cls of used) expect(css, cls).toContain(cls.replace(/[:/]/g, (c) => '\\' + c));
  });

  it('only applies when the light theme is on screen', () => {
    for (const line of css.split('\n').filter((l) => l.startsWith('['))) expect(line).toMatch(/^\[data-resolved='light'\]/);
  });
});
