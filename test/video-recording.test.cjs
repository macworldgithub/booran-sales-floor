const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { hookHarness, nodes, fakeTimers } = require('./helpers/hook-harness.cjs');
const compile = file => ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('recorder falls back between encoders and preserves the actual MIME type and every final chunk', () => {
  const attempts = [];
  class Recorder {
    static isTypeSupported() { return true; }
    constructor(stream, options) { attempts.push(options.mimeType); if (options.mimeType !== 'video/mp4') throw Error('Encoder unavailable'); this.mimeType = options.mimeType; }
  }
  const mod = { exports: {} };
  new Function('module', 'exports', 'MediaRecorder', compile('lib/video-recording.ts'))(mod, mod.exports, Recorder);
  const recorder = mod.exports.createRecorder({});
  assert.equal(recorder.mimeType, 'video/mp4'); assert.equal(attempts.length, 3);
  const file = mod.exports.makeRecordedFile([new Blob(['header'], { type: 'video/webm' }), new Blob(['final'])], recorder.mimeType, 'portrait');
  assert.equal(file.type, 'video/mp4'); assert.equal(file.name, 'customer-video-portrait.mp4'); assert.equal(file.size, 11);
  assert.throws(() => mod.exports.makeRecordedFile([], 'video/mp4', 'portrait'), /finish/);
});

test('recorded clip survives failed upload, blocks duplicate saves and can retry the same file', async () => {
  const harness = hookHarness(), timers = fakeTimers(), saved = [], revoked = [], listeners = new Map();
  let recorder, complete, now = 1000, closed = 0;
  const track = { kind: 'video', stop() {} }, audio = { kind: 'audio', stop() {} };
  class Stream { constructor(tracks) { this.tracks = tracks; } getTracks() { return this.tracks; } getVideoTracks() { return this.tracks.filter(track => track.kind === 'video'); } getAudioTracks() { return this.tracks.filter(track => track.kind === 'audio'); } }
  class Recorder {
    static isTypeSupported(type) { return type.startsWith('video/webm'); }
    constructor(stream, options) { recorder = this; this.mimeType = options.mimeType; this.state = 'inactive'; }
    start() { this.state = 'recording'; this.ondataavailable({ data: new Blob(['header']) }); }
    stop() { this.state = 'inactive'; this.ondataavailable({ data: new Blob(['final']) }); this.onstop(); }
  }
  const helper = { exports: {} };
  new Function('module', 'exports', 'MediaRecorder', compile('lib/video-recording.ts'))(helper, helper.exports, Recorder);
  const capture = { exports: {} }; new Function('module', 'exports', compile('lib/video-capture.ts'))(capture, capture.exports);
  const window = { ...timers, innerWidth: 1000, innerHeight: 700, requestAnimationFrame: () => 1, cancelAnimationFrame() {} };
  const document = { hidden: false, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), createElement: () => ({ getContext: () => ({ drawImage() {} }), captureStream: () => new Stream([track]) }) };
  const mocks = { react: harness.react, '@/lib/use-dialog': { useDialog: () => ({ current: null }) }, '@/lib/video-capture': capture.exports, '@/lib/video-recording': helper.exports };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'window', 'document', 'navigator', 'MediaStream', 'URL', 'performance', compile('components/customer/VideoRecorder.tsx'))(id => mocks[id] || require(id), mod, mod.exports, window, document, { mediaDevices: { getUserMedia: async () => new Stream([track, audio]) } }, Stream, { createObjectURL: () => 'blob:clip', revokeObjectURL: url => revoked.push(url) }, { now: () => now });
  const props = { onClose: () => closed++, onSave: (file, details) => { saved.push({ file, details }); return new Promise((resolve, reject) => { complete = { resolve, reject }; }); } };
  let tree; const render = () => { tree = harness.render(() => mod.exports.VideoRecorder(props)); };
  const button = label => nodes(tree).find(node => node.type === 'button' && node.props.children === label);
  render();
  const preview = nodes(tree).find(node => node.props['aria-label'] === 'Camera preview');
  preview.props.ref.current = { play: async () => {}, videoWidth: 1280, videoHeight: 720 };
  await settle(); preview.props.ref.current.onloadedmetadata(); render();
  button('Start recording').props.onClick(); now = 3000; render();
  button('Stop and review').props.onClick(); render();
  assert.equal(recorder.state, 'inactive'); assert.equal(listeners.size, 0);
  button('Use this video').props.onClick(); button('Use this video').props.onClick(); render();
  assert.equal(saved.length, 1); assert.equal(button('Cancel').props.disabled, true);
  button('Cancel').props.onClick(); assert.equal(closed, 0);
  complete.reject(Error('Disconnected')); await settle(); render();
  assert.match(nodes(tree).find(node => node.props.role === 'alert').props.children, /still here/);
  assert.equal(revoked.length, 0); assert.equal(saved[0].details.durationMs, 2000);
  assert.equal(await saved[0].file.text(), 'headerfinal');
  button('Retry upload').props.onClick(); assert.equal(saved[1].file, saved[0].file);
  complete.resolve(); await settle(); render();
  harness.cleanup(); assert.deepEqual(revoked, ['blob:clip']);
});
