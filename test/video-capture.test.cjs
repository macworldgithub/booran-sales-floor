const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(readFileSync('lib/video-capture.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', compiled)(mod, mod.exports);

test('portrait and landscape capture fill the requested frame without stretching or letterboxing', () => {
  for (const [width, height] of [[1920, 1080], [1080, 1920], [640, 480]]) {
    for (const orientation of ['portrait', 'landscape']) {
      const target = mod.exports.captureSize(orientation), crop = mod.exports.captureCrop(width, height, orientation);
      assert.ok(Math.abs(crop.width / crop.height - target.width / target.height) < 0.00001);
      assert.ok(crop.x >= 0 && crop.y >= 0 && crop.width <= width && crop.height <= height);
      assert.ok(Math.abs(crop.x * 2 + crop.width - width) < 0.00001);
      assert.ok(Math.abs(crop.y * 2 + crop.height - height) < 0.00001);
    }
  }
});
