import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDefaultFloorPlanImage } from '../services/floor-plan-image-service.js';

let testRoot: string | null = null;

afterEach(() => {
  if (testRoot) {
    rmSync(testRoot, { recursive: true, force: true });
    testRoot = null;
  }
});

describe('ensureDefaultFloorPlanImage', () => {
  it('容器重建后 uploads 目录不存在时应恢复默认 SVG 底图', () => {
    testRoot = mkdtempSync(join(tmpdir(), 'seat-mgmt-runtime-assets-'));
    const uploadsDir = join(testRoot, 'uploads');

    const imagePath = ensureDefaultFloorPlanImage(uploadsDir);

    expect(existsSync(imagePath)).toBe(true);
    expect(readFileSync(imagePath, 'utf-8')).toContain('<svg');

    rmSync(uploadsDir, { recursive: true, force: true });
    expect(existsSync(imagePath)).toBe(false);

    expect(ensureDefaultFloorPlanImage(uploadsDir)).toBe(imagePath);
    expect(readFileSync(imagePath, 'utf-8')).toContain('<svg');
  });
});
