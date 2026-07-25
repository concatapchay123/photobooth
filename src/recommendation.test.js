import test from 'node:test';
import assert from 'node:assert';
import {
  clampScore,
  normalizeTag,
  extractJsonObject,
  validateProfile,
  EMPTY_SCORES,
  PROFILE_SCHEMA_VERSION
} from './recommendation.js';

test('clampScore function', () => {
  assert.strictEqual(clampScore(120), 100);
  assert.strictEqual(clampScore(-10), 0);
  assert.strictEqual(clampScore(45.6), 46);
  assert.strictEqual(clampScore(undefined), 0);
});

test('normalizeTag function', () => {
  assert.strictEqual(normalizeTag('  Pink - Card  '), 'pink-card');
  assert.strictEqual(normalizeTag('dâu tây mèo và thỏ'), 'dau-tay-meo-va-tho');
  assert.strictEqual(normalizeTag(''), '');
  assert.strictEqual(normalizeTag(null), '');
});

test('extractJsonObject function', () => {
  assert.deepStrictEqual(
    extractJsonObject('some text ```json {"key": "value"} ``` text'),
    { key: 'value' }
  );
  assert.strictEqual(extractJsonObject('invalid json string'), null);
});

test('validateProfile function', () => {
  const input = {
    source: 'ai-custom',
    scores: {
      cute: 85,
      romantic: 40
    },
    lighting: {
      brightness: 70
    }
  };
  const profile = validateProfile(input);
  assert.strictEqual(profile.schema, PROFILE_SCHEMA_VERSION);
  assert.strictEqual(profile.source, 'ai-custom');
  assert.strictEqual(profile.scores.cute, 85);
  assert.strictEqual(profile.scores.romantic, 40);
  assert.strictEqual(profile.scores.vintage, 0); // Default empty score
  assert.strictEqual(profile.lighting.brightness, 70);
  assert.strictEqual(profile.lighting.contrast, 50); // Default lighting
});
