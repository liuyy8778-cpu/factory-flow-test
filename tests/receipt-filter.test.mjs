import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['app/receipt-filter.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {receiptGroups,matchesReceipt,initial}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('receipts use document identity; combined filters retain full document and match one line',()=>{
 const m={material:'6140',name:'RS-短套',drive:'1/2',size:'M10',profile:'6P',raw_length:'40',raw_diameter:'23.5',style:'一般品'};
 const line={id:'a',document_id:'d1',receipt_number:'SAME',date:'2026-09-06',customer_id:'c1',supplier_id:'s1',material_snapshot:m,drawing_id:'',dispatched:0};
 const groups=receiptGroups([line,{...line,id:'b',material_snapshot:{...m,size:'M09'},drawing_id:'drawing'},{...line,id:'c',document_id:'d2',customer_id:'c2'}]);
 assert.equal(groups.length,2);assert.equal(groups[0].lines.length,2);
 assert.equal(matchesReceipt(groups[0],{...initial,customers:['c1'],from:'2026-09-06',to:'2026-09-06',supplier:'s1',spec:'0410',status:'待圖面'}),true);
 assert.equal(matchesReceipt(groups[0],{...initial,spec:'0410',status:'待派工'}),false);
 assert.equal(matchesReceipt(groups[1],{...initial,customers:['c1']}),false);
 assert.equal(matchesReceipt(groups[0],{...initial,from:'2026-09-07',to:'2026-09-06'}),false);
 assert.equal(matchesReceipt(groups[0],{...initial,spec:'0410'}),true);
 assert.equal(groups[0].lines.length,2);
});
