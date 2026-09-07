import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['app/uncut-length.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {uncutLength}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('retained axial length is derived only from confirmed end information',()=>{
 const d={format:'ends-v1',length:'38',ends:{drive:{mode:'unchanged'},work:{mode:'machine',cut_length:'18',diameter:'22.5'}}};
 assert.equal(uncutLength(d,'drive'),20);assert.equal(uncutLength(d,'work'),null);
 assert.equal(uncutLength({...d,length:'38.2'},'drive'),20.2);
 assert.equal(uncutLength({...d,length:'10'},'drive'),null);
 assert.equal(uncutLength({...d,ends:{...d.ends,work:{mode:'pending'}}},'drive'),null);
 assert.equal(uncutLength({...d,ends:{...d.ends,work:{...d.ends.work,cut_length:''}}},'drive'),null);
 assert.equal(uncutLength({length:'38'},'drive'),null);
});
