const React = require('react');

// Deterministic hook lifecycle for logic/race tests. It does not simulate browser layout.
function hookHarness() {
  const slots = [];
  let cursor = 0;
  const effects = [];
  const react = {
    ...React,
    useState(initial) {
      const index = cursor++;
      slots[index] ||= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, (next) => { slots[index].value = typeof next === 'function' ? next(slots[index].value) : next; }];
    },
    useRef(initial) { const index = cursor++; slots[index] ||= { value: { current: initial } }; return slots[index].value; },
    useCallback(fn, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, i) => !Object.is(value, slots[index].dependencies[i]))) slots[index] = { value: fn, dependencies };
      return slots[index].value;
    },
    useEffect(fn, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
        effects.push(() => { previous?.cleanup?.(); slots[index] = { dependencies, cleanup: fn() }; });
      }
    },
  };
  return {
    react,
    render(callback) { cursor = 0; const result = callback(); while (effects.length) effects.shift()(); return result; },
    cleanup() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  return node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
}
function fakeTimers() {
  let id = 0;
  const timers = new Map();
  return {
    setTimeout(callback) { timers.set(++id, callback); return id; },
    clearTimeout(key) { timers.delete(key); },
    run() { const [key, callback] = timers.entries().next().value || []; if (!callback) throw new Error('No timer scheduled'); timers.delete(key); return callback(); },
  };
}
module.exports = { hookHarness, nodes, fakeTimers };
