import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSource } from '../../src/parser/parse.ts';
test('regression: no string/comment false positive',()=>{
  const s="const s = `import { Horizon } from 'stellar-sdk'`\n// require('stellar-sdk')\n/* bogus: import x from 'stellar-sdk' */";
  assert.deepEqual(parseSource('main.js',s).imports,[]);
});
test('regression: malformed import never returns partial binding',()=>{
  const r=parseSource('main.ts',"import { Horizon } from 'stellar-sdk';\nconst foo = (");
  assert.equal(r.status,'incomplete');assert.equal(r.imports.length,0);
});
test('regression: dynamic require path not accepted as resolved SDK import',()=>{
  const r=parseSource('main.ts',"const S=require(process.env.SDK_NAME)");
  assert.equal(r.imports.length,0);assert.equal(r.status,'incomplete');
});
test('regression: source-specific secret strings never enter parser facts or diagnostics',()=>{
  const s="const secret='sk_123456789';\nimport { Horizon } from '@stellar/stellar-sdk';";
  assert.ok(!JSON.stringify(parseSource('main.ts',s)).includes('sk_123456789'));
});
