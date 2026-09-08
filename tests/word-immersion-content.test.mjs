import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImmersionSegments } from '../server/word-immersion-content.mjs';
const words = [{word:'challenge', translation:'挑战'}];
test('exact spans preserve source, repeated occurrences and learned hints', () => {
  const source='2026年，我们迎接挑战。\n这是新的挑战！';
  const segments=buildImmersionSegments(JSON.stringify({replacements:[{original:'挑战',word:'challenge',occurrence:2}]}),source,words,[{word:'challenge',knownStatus:'known'}]);
  assert.equal(segments.map(s=>s.type==='word'?s.original:s.text).join(''),source);
  assert.equal(segments.find(s=>s.type==='word').text,'challenge');
  assert.match(segments[0].text,/迎接挑战/);
});
test('invalid, overlapping and fabricated replacements cannot rewrite the source',()=>{
  for(const replacements of [[{word:'challenge',original:'不存在'}],[{word:'invented',original:'挑战'}],[{word:'challenge',original:'2026'}],[{word:'challenge',original:'挑战'},{word:'challenge',original:'挑战'}]]) {
    assert.throws(()=>buildImmersionSegments(JSON.stringify({replacements}),'2026年的挑战',words),/IMMERSION_INVALID_MODEL_OUTPUT/);
  }
  assert.deepEqual(buildImmersionSegments('{"replacements":[]}','没有合适词汇',words),[{type:'normal',text:'没有合适词汇'}]);
});
