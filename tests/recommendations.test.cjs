const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies) {
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => dependencies[name],
    console: { log() {}, warn() {}, error() {}, table() {} } });
  return exports;
}

test('cold recommendations appear before images; image failures preserve ranking and places', async () => {
  let active = 0, maxActive = 0, requests = 0, published = false;
  const supabase = { from: () => ({ update: () => ({ eq: async () => ({}) }) }) };
  const { getRecommendations } = load('src/lib/recommend/getRecommendations.ts', {
    '@/lib/supabase': { supabase },
    '@/lib/google/places': { getPlaceImage: async () => {
      assert.ok(published, 'ranked results must render before image requests');
      requests++; active++; maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      active--; throw new Error('mobile image network unavailable');
    } },
  });
  const places = Array.from({ length: 10 }, (_, i) => ({
    att_id: i, name_th: `Place ${i}`, province: 'Chiang Mai',
    travel_type: ['mountain'], activities: i === 9 ? ['hiking'] : [],
    images: i === 0 ? ['https://example.com/existing.jpg'] : [],
  }));
  const result = await getRecommendations({ travel_type: ['mountain'], activities: ['hiking'] }, places, ranked => {
    assert.equal(ranked.length, 10);
    assert.equal(ranked[0].att_id, 9);
    published = true;
  });
  assert.equal(result.length, 10);
  assert.equal(result[0].att_id, 9);
  assert.equal(requests, 9, 'existing photos should not be refetched');
  assert.ok(maxActive <= 4);
  assert.equal(result.find(p => p.att_id === 0).images[0], 'https://example.com/existing.jpg');
});

test('attraction query failures propagate instead of becoming cacheable empty results', async () => {
  const { getRecommendations } = load('src/lib/recommend/getRecommendations.ts', {
    '@/lib/supabase': { supabase: { from: () => ({ select: () => ({ range: async () => ({ error: new Error('offline') }) }) }) } },
    '@/lib/google/places': {},
  });
  await assert.rejects(getRecommendations({ travel_type: ['mountain'] }), /offline/);
});
