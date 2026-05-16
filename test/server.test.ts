import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { parse, roll } from '../src/server.js';

test('parses 1d20', () => {
  const p = parse('1d20');
  assert.deepEqual(p.terms, [{ count: 1, sides: 20 }]);
  assert.equal(p.modifier, 0);
  assert.equal(p.multiplier, 1);
});

test('parses 4d6+3', () => {
  const p = parse('4d6+3');
  assert.deepEqual(p.terms, [{ count: 4, sides: 6 }]);
  assert.equal(p.modifier, 3);
});

test('parses 2d10*5', () => {
  const p = parse('2d10*5');
  assert.equal(p.multiplier, 5);
});

test('parses multiple terms', () => {
  const p = parse('1d20+1d4-2');
  assert.equal(p.terms.length, 2);
  assert.equal(p.modifier, -2);
});

test('roll 1d20 in [1, 20]', () => {
  for (let i = 0; i < 50; i++) {
    const r = roll('1d20');
    assert.ok(r.total >= 1 && r.total <= 20, `out of range: ${r.total}`);
  }
});

test('roll 4d6+3 in [7, 27]', () => {
  for (let i = 0; i < 50; i++) {
    const r = roll('4d6+3');
    assert.ok(r.total >= 7 && r.total <= 27, `out of range: ${r.total}`);
  }
});

test('roll respects multiplier', () => {
  for (let i = 0; i < 20; i++) {
    const r = roll('2d2*3');
    // 2d2 sums in [2, 4], times 3 → [6, 12]
    assert.ok(r.total >= 6 && r.total <= 12);
  }
});

test('rejects empty expression', () => {
  assert.throws(() => parse(''));
});

test('rejects expression with no dice term', () => {
  assert.throws(() => parse('just text'));
});

test('rejects out-of-range count/sides', () => {
  assert.throws(() => parse('2000d6'));
  assert.throws(() => parse('1d1'));
});
