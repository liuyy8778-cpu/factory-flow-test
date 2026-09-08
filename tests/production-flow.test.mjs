import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { build } from 'esbuild';

// Exercise the actual API handlers with SQLite, using D1-compatible atomic batches.
const sqlite=new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
const migrations=readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort();
sqlite.exec(readFileSync(`drizzle/${migrations[0]}`,'utf8'));
sqlite.exec("INSERT INTO partners (id,name,kind,contact,phone,tax_id,address) VALUES ('existing','既有客戶','customer','','','','')");
sqlite.exec("INSERT INTO documents VALUES ('existing-document','OUT-EXISTING','out','existing','2026-09-01','[]',10000,500,10500,'原始單據',NULL)");
for(const file of migrations.slice(1))sqlite.exec(readFileSync(`drizzle/${file}`,'utf8'));
function statement(sql,values=[]){return {bind(...next){return statement(sql,next)},async first(){return sqlite.prepare(sql).get(...values)||null},async all(){return {results:sqlite.prepare(sql).all(...values)}},async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}}},execute(){const rows=sqlite.prepare(sql).all(...values);return {results:rows,meta:{changes:sqlite.prepare('SELECT changes() AS n').get().n}}}}}
globalThis.__productionTestDb={prepare:sql=>statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const r=statements.map(s=>s.execute());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}};
async function api(file){const r=await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'test-d1',setup(b){b.onResolve({filter:/^@\/storage$/},()=>({path:'test-env',namespace:'test-env'}));b.onLoad({filter:/.*/,namespace:'test-env'},()=>({contents:'export const storage=globalThis.__productionTestBucket'}));b.onResolve({filter:/^@\/db\/raw$/},()=>({path:'test-db',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export function database(req){return globalThis.__productionAuditDb(globalThis.__productionTestDb,req)}'}))}}]});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'))}
const blobs=new Map();globalThis.__productionTestBucket={async put(key,bytes){blobs.set(key,bytes)},async get(key){return blobs.has(key)?{body:blobs.get(key),async arrayBuffer(){return blobs.get(key)}}:null},async delete(key){blobs.delete(key)}};
const auditBuild=await build({entryPoints:['db/audited.ts'],bundle:true,platform:'node',format:'esm',write:false});
globalThis.__productionAuditDb=(await import('data:text/javascript;base64,'+Buffer.from(auditBuild.outputFiles[0].text).toString('base64'))).auditedDatabase;
const materials=await api('app/api/materials/route.ts');
const drawingFile=await api('app/api/drawing-file/route.ts');
const production=await api('app/api/production/route.ts');
const accounting=await api('app/api/data/route.ts');
const series=await api('app/api/series/route.ts');
async function post(handler,payload,status=200){const original=console.error;if(status!==200)console.error=()=>{};try{const r=await handler.POST(new Request('https://factory.example/api',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://factory.example'},body:JSON.stringify({request_id:crypto.randomUUID(),...payload})}));const b=await r.json();assert.equal(r.status,status,JSON.stringify(b));return b}finally{console.error=original}}
test('order → dispatch → reporting → partial shipping → invoice → settlement, with guards and safe retries',async()=>{
 assert.equal(sqlite.prepare('SELECT note FROM documents WHERE id=?').get('existing-document').note,'原始單據');
 const order={action:'order',partner_id:'existing',date:'2026-09-05',due:'2026-09-10',product:'17 mm 套筒',spec:'50BV30',quantity:10,unit:'支',price:12.5,note:''};
 await post(production,{...order,quantity:1.5},400);
 await post(production,{...order,due:'2026-02-30'},400);
 await post(production,{...order,partner_id:'missing'},400);
 const so=await post(production,order);
 const job=await post(production,{action:'work_order',order_id:so.id,machine:'',operator:''});
 const duplicate=await post(production,{action:'work_order',order_id:so.id,machine:'',operator:''});
 assert.equal(duplicate.id,job.id);
 await post(production,{action:'state',id:job.id,state:'running'},400);
 await post(production,{action:'report',id:job.id,good:1,defective:0,note:''},400);
 await post(production,{action:'assign',id:job.id,machine:'車床 02',operator:'阿明'});
 await post(production,{action:'state',id:job.id,state:'running'});
 const report={action:'report',request_id:crypto.randomUUID(),id:job.id,good:4,defective:2,note:'首批'};
 await post(production,report);await post(production,report);
 assert.equal(sqlite.prepare('SELECT good FROM work_orders WHERE id=?').get(job.id).good,4);
 await post(production,{action:'state',id:job.id,state:'completed'},400);
 await post(production,{action:'state',id:job.id,state:'paused'});
 await post(production,{action:'report',id:job.id,good:1,defective:0,note:''},400);
 await post(production,{action:'assign',id:job.id,machine:'車床 03',operator:'志成'});
 await post(production,{action:'state',id:job.id,state:'running'});
 await post(production,{action:'report',id:job.id,good:7,defective:0,note:''},400);
 await post(production,{action:'report',id:job.id,good:6,defective:1,note:'完成'});
 const ship={action:'ship',id:job.id,date:'2026-09-06',quantity:6,tax_rate:5,note:'第一批'};
 await post(production,ship,400);
 await post(production,{action:'state',id:job.id,state:'completed'});
 await post(production,{action:'state',id:job.id,state:'running'},400);
 const request={...ship,request_id:crypto.randomUUID()};
 const doc=await post(production,request);await post(production,request);
 assert.equal(sqlite.prepare('SELECT shipped FROM work_orders WHERE id=?').get(job.id).shipped,6);
 assert.equal(sqlite.prepare('SELECT total FROM documents WHERE id=?').get(doc.id).total,7875);
 await post(production,{...ship,quantity:5},400);
 const doc2=await post(production,{...ship,quantity:4});
 const jobRow=sqlite.prepare('SELECT * FROM work_orders WHERE id=?').get(job.id);
 assert.deepEqual([jobRow.good,jobRow.defective,jobRow.shipped],[10,3,10]);
 await post(accounting,{action:'invoice',ids:[doc.id,doc2.id],date:'2026-09-06',due:'2026-10-06'});
 await post(accounting,{action:'invoice',ids:[doc.id],date:'2026-09-06',due:'2026-10-06'},400);
 const invoice=sqlite.prepare('SELECT * FROM invoices ORDER BY rowid DESC').get();
 assert.equal(invoice.total,13125);
 await post(accounting,{action:'payment',invoice_id:invoice.id,date:'2026-09-07',amount:100,note:'第一次'});
 await post(accounting,{action:'payment',invoice_id:invoice.id,date:'2026-09-07',amount:32,note:''},400);
 await post(accounting,{action:'payment',invoice_id:invoice.id,date:'2026-09-08',amount:31.25,note:'結清'});
 assert.equal(sqlite.prepare('SELECT paid FROM invoices WHERE id=?').get(invoice.id).paid,13125);
 const result=await (await production.GET()).json();
 assert.equal(result.orders[0].work_order_id,job.id);
 assert.equal(result.jobs[0].shipped,10);
 assert.equal(result.reports.length,2);
});

test('incoming material, diameter, specification, quantity and package count survive reload',async()=>{
 const item={material:'50BV30A',name:'套筒',diameter:'22φ',spec:'1/2 × 10M × 6P × 40L 雙R角',qty:10400,unit:'支',packages:16,price:0};
 sqlite.exec("INSERT INTO partners (id,name,kind,contact,phone,tax_id,address) VALUES ('vendor','進貨廠商','supplier','','','','')");
 await post(accounting,{action:'document',kind:'in',partner_id:'vendor',date:'2026-09-06',lines:[item],tax_rate:5,note:''});
 const data=await (await accounting.GET()).json();
 assert.deepEqual(data.documents.find(x=>x.kind==='in').lines[0],item);
 await post(accounting,{action:'document',kind:'in',partner_id:'vendor',date:'2026-09-06',lines:[{...item,packages:0}],tax_rate:5,note:''},400);
});

test('customer-owned incoming material uses saved drawing snapshots and dispatches without manual orders',async()=>{
 await post(materials,{action:'defaults'});
 await post(materials,{action:'option',field:'size',value:'E20'});
 const raw={material:'50BV30',name:'RS-短套',drive:'1/2',size:'E20',profile:'6p',raw_length:'40',raw_diameter:'22',style:'雙R角'};
 const spec=await post(materials,{action:'spec',code:'TEST-E20',data:raw});
 sqlite.exec("INSERT INTO partners (id,name,kind,contact,phone,tax_id,address) VALUES ('second-customer','第二客戶','customer','','','','')");
 const target={length:'38',diameter:'21.8',length_tolerance:'+0 / -0.1',diameter_tolerance:'±0.05',note:'依圖加工'};
 const drawing={action:'drawing',customer_id:'existing',spec_id:spec.id,number:'DRAW-001',version:'A',data:target,preferred:true};
 await post(materials,{...drawing,data:{...target,length:'41'}},400);
 const dr=await post(materials,drawing);
 const other=await post(materials,{...drawing,customer_id:'second-customer'});
 const receipt={action:'receipt',customer_id:'existing',supplier_id:'vendor',date:'2026-09-06',number:'115050710',note:'來料測試',lines:[{spec_id:spec.id,drawing_id:dr.id,quantity:500,packages:1,due:'2026-09-10',fee:12}]};
 await post(materials,{...receipt,lines:[{...receipt.lines[0],drawing_id:other.id}]},400);
 const receiptRequest={...receipt,request_id:crypto.randomUUID()};
 await post(materials,receiptRequest);await post(materials,receiptRequest);
 let state=await (await materials.GET()).json();
 const intake=state.intakes[0];assert.equal(state.intakes.length,1);
 assert.equal(intake.material_snapshot.raw_length,'40');assert.equal(intake.drawing_snapshot.length,'38');
 // A new master version does not change this already-received batch.
 const drB=await post(materials,{...drawing,version:'B',data:{...target,length:'37'}});
 state=await (await materials.GET()).json();
 assert.equal(state.intakes[0].drawing_snapshot.version,'A');
 assert.equal(state.drawings.filter(d=>d.customer_id==='existing'&&d.preferred).length,1);
 await post(materials,{action:'terms',id:intake.id,fee:15,due:'2026-09-11'});
 const dispatch={action:'dispatch',id:intake.id,machine:'車床 08',operator:'測試員'};
 const job=await post(materials,dispatch);const retry=await post(materials,dispatch);assert.equal(retry.id,job.id);
 await post(materials,{action:'bind',id:intake.id,drawing_id:drB.id},400);
 await post(materials,{action:'terms',id:intake.id,fee:16,due:'2026-09-11'},400);
 const productionData=await (await production.GET()).json();
 const j=productionData.jobs.find(j=>j.id===job.id);assert.equal(j.drawing_snapshot.version,'A');assert.equal(j.material_snapshot.raw_length,'40');assert.equal(j.drawing_snapshot.length,'38');assert.equal(j.price,1500);
 assert(!productionData.orders.some(o=>o.id===intake.id));
 await post(production,{action:'state',id:job.id,state:'running'});
 await post(production,{action:'report',id:job.id,good:500,defective:0,note:''});
 await post(production,{action:'state',id:job.id,state:'completed'});
 const out=await post(production,{action:'ship',id:job.id,date:'2026-09-10',quantity:500,tax_rate:5,note:''});
 const document=sqlite.prepare('SELECT * FROM documents WHERE id=?').get(out.id);assert.equal(document.total,787500);assert(JSON.parse(document.lines)[0].spec.includes('38L'));
 // Missing drawing can be received, but cannot be dispatched until bound.
 await post(materials,{...receipt,number:'PENDING',lines:[{...receipt.lines[0],drawing_id:''}]});
 state=await (await materials.GET()).json();const pending=state.intakes[0];
 await post(materials,{action:'dispatch',id:pending.id,machine:'車床 01',operator:'測試員'},400);
 await post(materials,{action:'bind',id:pending.id,drawing_id:other.id},400);
 await post(materials,{action:'bind',id:pending.id,drawing_id:drB.id});
 await post(materials,{action:'dispatch',id:pending.id,machine:'車床 01',operator:'測試員'});
 // Uploaded drawing can be opened through the exact stored version.
 const uploadId=crypto.randomUUID();const form=new FormData();form.set('payload',JSON.stringify({...drawing,request_id:uploadId,version:'C'}));form.set('file',new File(['%PDF-1.4\nexample'], '加工圖面.pdf',{type:'application/pdf'}));
 const uploaded=await materials.POST(new Request('https://factory.example/api',{method:'POST',headers:{origin:'https://factory.example'},body:form}));assert.equal(uploaded.status,200);
 const fetched=await drawingFile.GET(new Request('https://factory.example/api/drawing-file?id='+uploadId));assert.equal(fetched.status,200);assert.equal(fetched.headers.get('content-type'),'application/pdf');assert((await fetched.text()).startsWith('%PDF'));
});

test('batch material creation skips normalized duplicates, preserves variants and persists drafts',async()=>{
 const raw={material:'50BV30',name:'批次測試料',drive:'1/2',size:'M10',profile:'6p',raw_length:'40',raw_diameter:'22',style:'雙R角'};
 const existingRaw={...raw,size:'10',profile:'6P',raw_length:'40.0',raw_diameter:'22.0'};
 sqlite.prepare('INSERT INTO material_specs (id,code,data) VALUES (?,?,?)').run('legacy-batch','LEGACY-BATCH',JSON.stringify(existingRaw));
 const rows=[raw,{...raw,profile:'12p'},{...raw,raw_diameter:'23'},{...raw,raw_diameter:'23.5'},{...raw,raw_diameter:'23.50'}];
 const result=await post(materials,{action:'batch_specs',rows});assert.equal(result.created,3);assert.equal(result.skipped,2);
 const repeat=await post(materials,{action:'batch_specs',rows});assert.equal(repeat.created,0);assert.equal(repeat.skipped,5);
 const count=sqlite.prepare('SELECT COUNT(*) AS n FROM material_specs').get().n;
 await post(materials,{action:'batch_specs',rows:[{...raw,size:'M32'},{...raw,size:'M33',raw_diameter:''}]},400);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM material_specs').get().n,count);
 const imperial=await post(materials,{action:'batch_specs',rows:[{...raw,name:'英制測試',size:'1-1/4'},{...raw,name:'英制測試',size:'5/4'}]});assert.equal(imperial.created,1);assert.equal(imperial.skipped,1);
 const distinct=await post(materials,{action:'batch_specs',rows:[{...raw,size:'H06'},{...raw,size:'E06'},{...raw,size:'M06'}]});assert.equal(distinct.created,3);
 const single=await post(materials,{action:'spec',code:'SHOULD-NOT-DUPLICATE',data:{...raw,raw_diameter:'23.500'}});assert.equal(single.created,0);assert.equal(single.skipped,1);
 const draft={series:'metric',common:{material:'50BV30',name:'RS-短套',raw_length:'40',style:'雙R角'},selected:['M08','M09'],rows:[{id:'draft-row',...raw,raw_diameter:'',profiles:['6p','12p']}]};
 await post(materials,{action:'draft',data:draft});
 const loaded=await (await materials.GET()).json();assert.equal(loaded.draft.data.rows[0].raw_diameter,'');assert.deepEqual(loaded.draft.data.rows[0].profiles,['6p','12p']);
 assert(loaded.options.some(o=>o.field==='raw_diameter'&&o.value==='23.5'));
});

test('readable codes, automatic receipt numbers, barrel linkage, corrections, audit and void guards',async()=>{
 const barrels=await api('app/api/barrels/route.ts');
 const codes=await api('app/material-types.ts');
 const raw={material:'50BV30',name:'RS-短套',drive:'1/2',size:'M10',profile:'6p',raw_length:'40',raw_diameter:'23.5',style:'雙R角'};
 assert.equal(codes.materialCode(raw),'0410-RS-6P-D235-L400-50BV30');
 assert.equal(codes.searchCode({...raw,size:'5/16',name:'RS-英制短套'}),'04S10');
 assert.equal(codes.searchCode({...raw,size:'1',name:'RS-英制短套'}),'04S32');
 assert.equal(codes.searchCode({...raw,size:'H06'}),'04H06');
 assert.equal(codes.searchCode({...raw,drive:'3/8'}),'0310');
 assert.equal(codes.dimensionCode('8'),'080');assert.equal(codes.dimensionCode('100'),'1000');
 const spec=await post(materials,{action:'spec',data:raw});
 sqlite.prepare('UPDATE partners SET code=? WHERE id=?').run('ES','existing');
 const receipt={action:'receipt',customer_id:'existing',supplier_id:'vendor',date:'2026-08-20',number:'',barrels:3,note:'同桶兩規格',lines:[{spec_id:spec.id,drawing_id:'',quantity:100,packages:3,package_unit:'桶',due:'2026-09-10',fee:0},{spec_id:spec.id,drawing_id:'',quantity:100,packages:3,package_unit:'桶',due:'2026-09-10',fee:0}]};
 const request={...receipt,request_id:crypto.randomUUID()};const first=await post(materials,request);await post(materials,request);
 const second=await post(materials,{...receipt,barrels:0,lines:[{...receipt.lines[0],package_unit:'包'}]});
 assert.equal(sqlite.prepare('SELECT number FROM documents WHERE id=?').get(first.id).number,'ES-20260820-001');
 assert.equal(sqlite.prepare('SELECT number FROM documents WHERE id=?').get(second.id).number,'ES-20260820-002');
 let state=await (await barrels.GET()).json();let entry=state.entries.find(x=>x.document_id===first.id);
 assert.equal(entry.incoming,3);assert.equal(state.entries.filter(x=>x.document_id===first.id).length,1);
 assert.equal(sqlite.prepare('SELECT package_unit FROM intakes WHERE document_id=?').get(first.id).package_unit,'桶');
 const edit={action:'edit',request_id:crypto.randomUUID(),id:entry.id,version:entry.version,incoming:2,outgoing:0,date:entry.date,note:'核對後兩桶',reason:'原本多算一桶'};
 await post(barrels,edit);await post(barrels,edit);
 assert.equal(sqlite.prepare('SELECT barrels FROM documents WHERE id=?').get(first.id).barrels,2);
 await post(barrels,{...edit,request_id:crypto.randomUUID()},400);
 const voidRequest={...edit,action:'void',request_id:crypto.randomUUID(),version:2,reason:'整單誤建'};await post(barrels,voidRequest);await post(barrels,voidRequest);
 assert.equal(sqlite.prepare('SELECT voided FROM documents WHERE id=?').get(first.id).voided,1);
 assert.equal((await (await materials.GET()).json()).intakes.some(i=>i.document_id===first.id),false);
 state=await (await barrels.GET()).json();assert.equal(state.audit.filter(a=>a.entry_id===first.id).length,3);
 const blank={action:'manual',request_id:crypto.randomUUID(),customer_id:'existing',date:'2026-08-20',kind:'empty_out',incoming:0,outgoing:2,note:'退空桶'};await post(barrels,blank);await post(barrels,blank);
 const outRequest={action:'document',request_id:crypto.randomUUID(),kind:'out',partner_id:'existing',date:'2026-09-09',barrels:5,lines:[{name:'套筒',spec:'M10',qty:50,unit:'支',packages:5,package_unit:'桶',price:0}],tax_rate:0,note:''};
 await post(accounting,outRequest);await post(accounting,outRequest);
 assert.equal(sqlite.prepare('SELECT outgoing FROM barrel_entries WHERE document_id=?').get(outRequest.request_id).outgoing,5);
 await post(accounting,{action:'invoice',ids:[outRequest.request_id],date:'2026-09-09',due:'2026-09-10'});
 await post(barrels,{...edit,action:'void',id:outRequest.request_id,request_id:crypto.randomUUID(),version:1,incoming:0,outgoing:5,date:'2026-09-09'},400);
 const dispatched=sqlite.prepare('SELECT e.* FROM barrel_entries e JOIN intakes i ON i.document_id=e.document_id WHERE i.dispatched=1 LIMIT 1').get();
 await post(barrels,{...edit,action:'void',id:dispatched.id,request_id:crypto.randomUUID(),version:1,incoming:0,outgoing:0,date:dispatched.date},400);
});

test('voiding an unbilled shipment reverses stock once and permits corrected shipment',async()=>{
 const barrels=await api('app/api/barrels/route.ts');
 const so=await post(production,{action:'order',partner_id:'existing',date:'2026-09-05',due:'2026-09-10',product:'測試作廢',spec:'M10',quantity:2,unit:'支',price:1,note:''});
 const job=await post(production,{action:'work_order',order_id:so.id,machine:'車床',operator:'測試'});
 await post(production,{action:'state',id:job.id,state:'running'});await post(production,{action:'report',id:job.id,good:2,defective:0,note:''});await post(production,{action:'state',id:job.id,state:'completed'});
 const ship={action:'ship',id:job.id,date:'2026-09-06',quantity:2,barrels:1,packages:1,package_unit:'桶',tax_rate:0,note:''};
 const doc=await post(production,ship);
 const cancel={action:'void',request_id:crypto.randomUUID(),id:doc.id,version:1,incoming:0,outgoing:1,date:ship.date,note:'',reason:'重開出貨'};
 await post(barrels,cancel);await post(barrels,cancel);
 assert.equal(sqlite.prepare('SELECT shipped FROM work_orders WHERE id=?').get(job.id).shipped,0);
 await post(accounting,{action:'invoice',ids:[doc.id],date:ship.date,due:ship.date},400);
 await post(production,ship);assert.equal(sqlite.prepare('SELECT shipped FROM work_orders WHERE id=?').get(job.id).shipped,2);
});

test('bulk receipt drafts retain row order, quantities and drawings through posting and reload',async()=>{
 const receiptDraft=await api('app/api/receipt-draft/route.ts');
 const raw={material:'6140',name:'RS-短套',drive:'1/2',size:'M25',profile:'6p',raw_length:'45',raw_diameter:'35',style:'一般品'};
 const a=await post(materials,{action:'spec',data:raw});const b=await post(materials,{action:'spec',data:{...raw,size:'M26'}});
 const drawing=await post(materials,{action:'drawing',customer_id:'existing',spec_id:a.id,number:'REORDER-A',version:'A',preferred:true,data:{length:'40',diameter:'33',length_tolerance:'±0.1',diameter_tolerance:'±0.1',note:''}});
 const draft={request_id:crypto.randomUUID(),customer_id:'existing',supplier_id:'vendor',date:'2026-09-06',number:'BULK-ORDER-TEST',note:'排序核對',barrels:'2',barrels_manual:true,lines:[{key:'second',spec_id:b.id,drawing_id:'',quantity:'260',packages:'1',package_unit:'包',fee:'12',due:'2026-09-10'},{key:'first',spec_id:a.id,drawing_id:drawing.id,quantity:'250',packages:'2',package_unit:'桶',fee:'15',due:'2026-09-12'}]};
 await post(receiptDraft,{...draft,lines:[{...draft.lines[0],quantity:''},draft.lines[1]]});
 assert.equal((await (await receiptDraft.GET()).json()).draft.data.lines[0].quantity,'');
 await post(receiptDraft,draft);
 const reloaded=(await (await receiptDraft.GET()).json()).draft.data;
 assert.deepEqual(reloaded.lines.map(l=>l.key),['second','first']);
 const receipt=await post(materials,{...reloaded,action:'receipt',barrels:2,lines:reloaded.lines.map(l=>({...l,quantity:Number(l.quantity),packages:Number(l.packages),fee:Number(l.fee)}))});
 const intakes=(await (await materials.GET()).json()).intakes.filter(i=>i.document_id===receipt.id);
 assert.deepEqual(intakes.map(i=>i.spec_id),[b.id,a.id]);assert.deepEqual(intakes.map(i=>i.quantity),[260,250]);assert.equal(intakes[1].drawing_snapshot.number,'REORDER-A');assert.equal(intakes[1].fee,1500);
 const doc=sqlite.prepare('SELECT * FROM documents WHERE id=?').get(receipt.id);assert.deepEqual(JSON.parse(doc.lines).map(l=>l.qty),[260,250]);
 assert.equal((await (await receiptDraft.GET()).json()).draft,null);
 const large=await post(materials,{...draft,request_id:crypto.randomUUID(),number:'BULK-50',action:'receipt',barrels:0,lines:Array.from({length:50},(_,i)=>({...draft.lines[0],quantity:i+1,packages:1,fee:12}))});
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM intakes WHERE document_id=?').get(large.id).n,50);
 const rows=(await (await materials.GET()).json()).intakes.filter(i=>i.document_id===large.id);assert.equal(rows[0].quantity,1);assert.equal(rows[49].quantity,50);
});

test('partial material admission saves incomplete draft and validates before any write',async()=>{
 const raw={material:'6140',name:'RS-短套',drive:'1/2',size:'M27',profile:'12p',raw_length:'45',raw_diameter:'35',style:'一般品'};
 const pending={series:'metric',common:{material:'6140',name:'RS-短套',raw_length:'45',style:'一般品'},selected:[],rows:[{...raw,id:'pending27',size:'M28',raw_diameter:'',profiles:['6p','12p']}]};
 const before=sqlite.prepare('SELECT COUNT(*) AS n FROM material_specs').get().n;
 await post(materials,{action:'batch_specs',rows:[raw],remaining_draft:{invalid:true}},400);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM material_specs').get().n,before);
 const result=await post(materials,{action:'batch_specs',rows:[raw],remaining_draft:pending});assert.equal(result.created,1);
 const draft=(await (await materials.GET()).json()).draft;assert.equal(draft.data.rows[0].size,'M28');assert.equal(draft.data.rows[0].raw_diameter,'');
});

test('numeric diameter operators and descending size groups use real values',async()=>{
 const f=await api('app/catalog-filter.ts');
 assert(f.diameterMatches('23.50',{op:'eq',value:'23.5',end:''}));assert(!f.diameterMatches('22',{op:'gt',value:'22',end:''}));assert(f.diameterMatches('22',{op:'ge',value:'22',end:''}));assert(f.diameterMatches('22',{op:'le',value:'22',end:''}));assert(f.diameterMatches('22',{op:'lt',value:'23.5',end:''}));assert(f.diameterMatches('23.5',{op:'range',value:'22',end:'23.5'}));assert(!f.diameterMatches('23',{op:'range',value:'24',end:'22'}));assert(!f.diameterMatches('23',{op:'gt',value:'',end:''}));
 const raw={material:'6140',name:'RS-短套',drive:'1/2',size:'M08',profile:'6p',raw_length:'40',raw_diameter:'22',style:'一般品'};
 const rows=['M08','M12','M10','M12'].map((size,i)=>({id:String(i),code:String(i),data:{...raw,size}}));assert.deepEqual(f.selectCatalog(rows,f.emptyFilters,'','size_desc').map(r=>r.data.size),['M12','M12','M10','M08']);
});

test('split one intake into independent drawing allocations, prevent over-allocation, preserve source and correct mistaken material',async()=>{
 sqlite.exec("INSERT INTO partners(id,name,kind,contact,phone,tax_id,address) VALUES ('split-c','分配客戶','customer','','','',''),('split-v','鍛造廠','supplier','','','','')");
 const raw={material:'6140',name:'RS-短套',drive:'1/2',size:'M22',profile:'6P',raw_length:'44',raw_diameter:'30',style:'一般品'};
 const spec=await post(materials,{action:'spec',data:raw});const correct=await post(materials,{action:'spec',data:{...raw,size:'M23'}});
 const target={length:'38',diameter:'29',length_tolerance:'±0.1',diameter_tolerance:'±0.1',note:''};
 const a=await post(materials,{action:'drawing',customer_id:'split-c',spec_id:correct.id,number:'A',version:'1',preferred:false,data:target});
 const b=await post(materials,{action:'drawing',customer_id:'split-c',spec_id:correct.id,number:'B',version:'1',preferred:false,data:{...target,length:'36'}});
 const receipt={action:'receipt',customer_id:'split-c',supplier_id:'split-v',date:'2026-09-06',number:'SPLIT',barrels:2,note:'',lines:[{spec_id:spec.id,drawing_id:'',quantity:3000,packages:2,package_unit:'桶',due:'2026-09-10',fee:1}]};
 const d=await post(materials,receipt);const intake=d.id+':0';
 const replace={action:'replace_material',request_id:crypto.randomUUID(),id:intake,spec_id:correct.id,expected_spec_id:spec.id,reason:'KEY錯'};
 const callReplace=()=>materials.POST(new Request('https://factory.example/api',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'test-owner'},body:JSON.stringify(replace)}));
 assert.equal((await callReplace()).status,200);assert.equal((await callReplace()).status,200);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM intake_audit WHERE intake_id=?').get(intake).n,1);
 assert.match(sqlite.prepare('SELECT lines FROM documents WHERE id=?').get(d.id).lines,/M23/);
 const allocation={action:'allocate',id:intake,drawing_id:a.id,quantity:1000,fee:2,due:'2026-09-10'};
 const one=await post(materials,allocation);const two=await post(materials,{...allocation,drawing_id:b.id,quantity:1500});
 await post(materials,{...allocation,quantity:501},400);
 await post(materials,{action:'dispatch',id:intake,machine:'01',operator:'甲'},400);
 const job1=await post(materials,{action:'dispatch_allocation',id:one.id,machine:'01',operator:'甲'});
 const retry=await post(materials,{action:'dispatch_allocation',id:one.id,machine:'01',operator:'甲'});assert.equal(job1.id,retry.id);
 await post(materials,{action:'remove_allocation',id:one.id},400);
 const job2=await post(materials,{action:'dispatch_allocation',id:two.id,machine:'02',operator:'乙'});
 const jobs=await (await production.GET()).json();assert.equal(jobs.jobs.find(j=>j.id===job1.id).drawing_snapshot.length,'38');assert.equal(jobs.jobs.find(j=>j.id===job2.id).drawing_snapshot.length,'36');assert.equal(jobs.jobs.find(j=>j.id===job2.id).quantity,1500);
 const last=await post(materials,{...allocation,quantity:500});await post(materials,{action:'remove_allocation',id:last.id});
 const list=await (await materials.GET()).json();const row=list.intakes.filter(i=>i.id===intake);assert.equal(row.length,1);assert.equal(row[0].allocations.length,2);assert.equal(row[0].quantity,3000);assert.equal(row[0].packages,2);
 assert.equal(sqlite.prepare('SELECT incoming FROM barrel_entries WHERE document_id=?').get(d.id).incoming,2);
 const second=await post(materials,{...receipt,lines:[{...receipt.lines[0],spec_id:correct.id}]});
 await post(materials,{...allocation,id:second.id+':0',quantity:3000});
 assert.equal(sqlite.prepare('SELECT SUM(quantity) AS n FROM intake_allocations WHERE intake_id=?').get(intake).n,2500);
});

test('two-ended drawings preserve per-end diameters, cut lengths and tolerances through receipt and work order',async()=>{
 const raw={material:'50BV30',name:'RS-短套',drive:'1/2',size:'M10',profile:'6P',raw_length:'40',raw_diameter:'22',style:'一般品'};
 const spec=await post(materials,{action:'spec',data:raw});
 const drive={mode:'unchanged',diameter:'',cut_length:'',diameter_tolerance:'',cut_length_tolerance:''};
 const work={mode:'machine',diameter:'15.5',cut_length:'19',diameter_tolerance:'+0/-0.1',cut_length_tolerance:'±0.2'};
 const data={format:'ends-v1',length:'38',length_tolerance:'±0.1',note:'兩端分開量測',ends:{drive,work}};
 const base={action:'drawing',customer_id:'split-c',spec_id:spec.id,number:'TWO-ENDS',version:'A',preferred:false,data};
 await post(materials,{...base,data:{...data,ends:{drive,work:{...work,cut_length:'39'}}}},400);
 await post(materials,{...base,data:{...data,ends:{drive,work:{...work,diameter:'23'}}}},400);
 await post(materials,{...base,data:{...data,ends:{drive,work:{...work,cut_length_tolerance:''}}}},400);
 const dr=await post(materials,base);
 const pending=await post(materials,{...base,version:'pending',data:{...data,ends:{drive:{...drive,mode:'pending'},work}}});
 const r=await post(materials,{action:'receipt',customer_id:'split-c',supplier_id:'split-v',date:'2026-09-06',number:'ENDS',barrels:1,note:'',lines:[{spec_id:spec.id,drawing_id:dr.id,quantity:100,packages:1,package_unit:'桶',due:'2026-09-10',fee:1},{spec_id:spec.id,drawing_id:pending.id,quantity:100,packages:1,package_unit:'包',due:'2026-09-10',fee:1}]});
 const batch={action:'allocate',id:r.id+':0',drawing_id:dr.id,quantity:100,fee:1,due:'2026-09-10'};
 const allocation=await post(materials,batch);
 await post(materials,{...batch,id:r.id+':1',drawing_id:pending.id},400);
 await post(materials,{action:'dispatch',id:r.id+':1',machine:'01',operator:'甲'},400);
 const job=await post(materials,{action:'dispatch_allocation',id:allocation.id,machine:'02',operator:'乙'});
 const output=await (await production.GET()).json();const saved=output.jobs.find(j=>j.id===job.id);
 assert.deepEqual(saved.drawing_snapshot.ends,{drive,work});assert.equal(saved.drawing_snapshot.length,'38');
 assert.match(saved.spec,/工作端：Ø15.5/);assert.match(saved.spec,/19L/);assert.match(saved.spec,/方孔端：不加工/);
 const snapshotBefore=sqlite.prepare('SELECT drawing_snapshot FROM intake_allocations WHERE id=?').get(allocation.id).drawing_snapshot;
 await post(materials,{...base,version:'B',data:{...data,ends:{drive,work:{...work,cut_length:'18'}}}});
 assert.equal(sqlite.prepare('SELECT drawing_snapshot FROM intake_allocations WHERE id=?').get(allocation.id).drawing_snapshot,snapshotBefore);
});

test('batch drawing drafts with files, partial admission and shared 6P/12P drawings persist and work in receipt, binding and allocation',async()=>{
 const batchApi=await api('app/api/drawing-batch/route.ts');
 const raw={material:'50BV30',name:'RS-短套',drive:'1/2',size:'M18',profile:'6P',raw_length:'40',raw_diameter:'26',style:'一般品'};
 const s6=await post(materials,{action:'spec',data:raw}),s12=await post(materials,{action:'spec',data:{...raw,profile:'12P'}}),small=await post(materials,{action:'spec',data:{...raw,raw_diameter:'20'}});
 const end={mode:'unchanged',diameter:'',cut_length:'',diameter_tolerance:'',cut_length_tolerance:''};
 const data={format:'ends-v1',length:'38',length_tolerance:'±0.1',note:'共用圖面',ends:{drive:end,work:{mode:'machine',diameter:'24',cut_length:'19',diameter_tolerance:'±0.1',cut_length_tolerance:'±0.2'}}};
 const row={key:crypto.randomUUID(),spec_ids:[s6.id,s12.id],number:'SHARED-BATCH',version:'A',preferred:true,data,file:null};
 const incomplete={...row,key:crypto.randomUUID(),number:'',spec_ids:[small.id]};
 async function call(mode,draft,{file=false,id=crypto.randomUUID(),status=200}={}){const form=new FormData();form.append('payload',JSON.stringify({request_id:id,mode,draft}));if(file)form.append('file:'+row.key,new File(['test drawing'],'shared.pdf',{type:'application/pdf'}));const prior=console.error;if(status!==200)console.error=()=>{};try{const r=await batchApi.POST(new Request('https://factory.example/api',{method:'POST',body:form}));const b=await r.json();assert.equal(r.status,status,JSON.stringify(b));return b}finally{console.error=prior}}
 const saved=await call('draft',{customer_id:'split-c',rows:[row,incomplete]},{file:true});assert.ok(saved.draft.data.rows[0].file.key);assert.ok(blobs.has(saved.draft.data.rows[0].file.key));
 const loaded=await (await batchApi.GET()).json();assert.equal(loaded.draft.data.rows.length,2);
 const requestId=crypto.randomUUID(),commit=await call('commit',loaded.draft.data,{id:requestId});assert.equal(commit.created,1);assert.equal(commit.draft.data.rows.length,1);
 const repeat=await call('commit',loaded.draft.data,{id:requestId});assert.equal(repeat.created,1);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM drawings WHERE id=?').get(row.key).n,1);
 const catalog=await (await materials.GET()).json();const shared=catalog.drawings.find(d=>d.id===row.key);assert.deepEqual(shared.spec_ids,[s6.id,s12.id]);assert.deepEqual(shared.preferred_spec_ids,[s6.id,s12.id]);
 const fileResponse=await drawingFile.GET(new Request('https://factory.example/api/drawing-file?id='+row.key));assert.equal(fileResponse.status,200);
 const receipt=await post(materials,{action:'receipt',customer_id:'split-c',supplier_id:'split-v',date:'2026-09-06',number:'SHARED-RECEIPT',barrels:0,note:'',lines:[{spec_id:s12.id,drawing_id:row.key,quantity:100,packages:1,package_unit:'包',due:'2026-09-10',fee:1}]});
 await post(materials,{action:'bind',id:receipt.id+':0',drawing_id:row.key});
 const allocation=await post(materials,{action:'allocate',id:receipt.id+':0',drawing_id:row.key,quantity:100,fee:1,due:'2026-09-10'});assert.ok(allocation.id);
 await call('commit',{customer_id:'split-c',rows:[{...row,key:crypto.randomUUID(),spec_ids:[small.id],number:'TOO-SMALL'}]},{status:400});
 await call('draft',{customer_id:'split-c',rows:[{...row,file:{key:'private/unrelated',name:'bad.pdf',type:'application/pdf'}}]},{status:400});
 // Additional-spec uniqueness is enforced even outside the batch preflight.
 await post(materials,{action:'drawing',customer_id:'split-c',spec_id:s12.id,number:row.number,version:'A',preferred:false,data},400);
});

test('groove requirements persist from cloud draft to allocated job label source, with original received quantity',async()=>{
 const batchApi=await api('app/api/drawing-batch/route.ts');
 const raw={material:'6140',name:'RS-短套',drive:'1/2',size:'M16',profile:'12P',raw_length:'40',raw_diameter:'23',style:'一般品'};
 const spec=await post(materials,{action:'spec',data:raw});
 const end={mode:'machine',diameter:'21.5',cut_length:'10',diameter_tolerance:'±0.1',cut_length_tolerance:'±0.1'};
 const groove={kind:'round',name:'',base:'drive',reference:'center',position:'6',width:'2',measure:'diameter',value:'20',radius:'1',tolerance:'±0.1',note:'去毛邊'};
 const data={format:'ends-v1',length:'38',length_tolerance:'±0.1',note:'首件核對',operation_code:'F',groove,ends:{drive:end,work:{...end,cut_length:'8'}}};
 const row={key:crypto.randomUUID(),spec_ids:[spec.id],number:'ROUND-GROOVE',version:'A',preferred:true,data};
 const send=async(mode,draft)=>{const form=new FormData();form.append('payload',JSON.stringify({mode,request_id:crypto.randomUUID(),draft}));const r=await batchApi.POST(new Request('https://factory.example/api',{method:'POST',body:form}));const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));return b};
 await send('draft',{customer_id:'split-c',rows:[row]});const draft=(await (await batchApi.GET()).json()).draft.data;assert.deepEqual(draft.rows[0].data.groove,groove);
 await send('commit',draft);
 const receipt=await post(materials,{action:'receipt',customer_id:'split-c',supplier_id:'split-v',date:'2026-09-06',number:'LABEL-SOURCE',barrels:1,note:'',lines:[{spec_id:spec.id,drawing_id:row.key,quantity:3000,packages:1,package_unit:'桶',due:'2026-09-10',fee:1}]});
 const allocation=await post(materials,{action:'allocate',id:receipt.id+':0',drawing_id:row.key,quantity:1000,fee:1,due:'2026-09-10'});
 const job=await post(materials,{action:'dispatch_allocation',id:allocation.id,machine:'01',operator:'甲'});
 const saved=(await (await production.GET()).json()).jobs.find(j=>j.id===job.id);assert.equal(saved.quantity,1000);assert.equal(saved.intake_quantity,3000);assert.deepEqual(saved.drawing_snapshot.groove,groove);assert.equal(saved.drawing_snapshot.operation_code,'F');
 const base={action:'drawing',customer_id:'split-c',spec_id:spec.id,number:'ROUND-GROOVE',version:'B',preferred:false,data};
 await post(materials,{...base,data:{...data,groove:{...groove,position:'38'}}},400);
 await post(materials,{...base,data:{...data,groove:{...groove,value:'22'}}},400);
 await post(materials,{...base,data:{...data,groove:{...groove,tolerance:''}}},400);
 await post(materials,{...base,data:{...data,groove:{...groove,kind:'none'}}});
 const again=(await (await production.GET()).json()).jobs.find(j=>j.id===job.id);assert.equal(again.drawing_snapshot.version,'A');assert.equal(again.drawing_snapshot.groove.kind,'round');
});

test('drawing management audits edits, rejects stale and used edits, disables new selection and preserves snapshots',async()=>{
 const raw={material:'6140',name:'RS-短套',drive:'1/2',size:'M27',profile:'6P',raw_length:'44',raw_diameter:'30',style:'一般品'};
 const s=await post(materials,{action:'spec',data:raw});
 const data={length:'38',diameter:'29',length_tolerance:'±0.1',diameter_tolerance:'±0.1',note:''};
 const dr=await post(materials,{action:'drawing',customer_id:'split-c',spec_id:s.id,number:'EDITABLE',version:'A',preferred:false,data});
 const call=async(payload,status=200)=>{const old=console.error;if(status!==200)console.error=()=>{};try{const r=await materials.POST(new Request('https://factory.example/api',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'owner@example.test'},body:JSON.stringify({request_id:crypto.randomUUID(),id:dr.id,reason:'輸入更正',...payload})}));const body=await r.json();assert.equal(r.status,status,JSON.stringify(body));return body}finally{console.error=old}};
 const edit={action:'edit_drawing',expected_revision:1,number:'EDITED',version:'A',data:{...data,length:'37'},request_id:crypto.randomUUID()};
 await call(edit);await call(edit);assert.equal(sqlite.prepare('SELECT count(*) AS n FROM drawing_audit WHERE drawing_id=?').get(dr.id).n,1);
 assert.equal(sqlite.prepare('SELECT revision FROM drawings WHERE id=?').get(dr.id).revision,2);
 await call({...edit,request_id:crypto.randomUUID()},400);
 await call({action:'drawing_status',expected_revision:2,disabled:true});
 const receipt={action:'receipt',customer_id:'split-c',supplier_id:'split-v',date:'2026-09-06',number:'MANAGE',barrels:0,note:'',lines:[{spec_id:s.id,drawing_id:dr.id,quantity:100,packages:1,package_unit:'包',due:'2026-09-10',fee:1}]};
 await post(materials,receipt,400);
 const doc=await post(materials,{...receipt,lines:[{...receipt.lines[0],drawing_id:''}]});
 const allocation={action:'allocate',id:doc.id+':0',drawing_id:dr.id,quantity:50,fee:1,due:'2026-09-10'};
 await post(materials,allocation,400);await post(materials,{action:'bind',id:doc.id+':0',drawing_id:dr.id},400);
 await call({action:'drawing_status',expected_revision:3,disabled:false});
 const alloc=await post(materials,allocation);
 const before=sqlite.prepare('SELECT drawing_snapshot FROM intake_allocations WHERE id=?').get(alloc.id).drawing_snapshot;
 await call({...edit,request_id:crypto.randomUUID(),expected_revision:4},400);
 await call({action:'drawing_status',expected_revision:4,disabled:true});
 assert.equal(sqlite.prepare('SELECT drawing_snapshot FROM intake_allocations WHERE id=?').get(alloc.id).drawing_snapshot,before);
 const list=await (await materials.GET()).json(),drawing=list.drawings.find(d=>d.id===dr.id);
 assert.equal(drawing.in_use,1);assert.equal(drawing.disabled,1);assert.equal(drawing.audit.length,4);assert.match(drawing.audit[0].actor,/owner@example.test/);
 assert.equal(list.intakes.find(i=>i.id===doc.id+':0').allocations[0].drawing_snapshot.length,'37');
 await post(materials,{action:'remove_allocation',id:alloc.id});
 await call({...edit,request_id:crypto.randomUUID(),expected_revision:5},400);
 assert.equal(sqlite.prepare('SELECT used FROM drawings WHERE id=?').get(dr.id).used,1);
});

test('batch copy reuses only verified source attachments and conflicting shared edits roll back audit',async()=>{
 const batch=await api('app/api/drawing-batch/route.ts');
 const catalog=await (await materials.GET()).json();const source=catalog.drawings.find(d=>d.number==='SHARED-BATCH');
 const row={key:crypto.randomUUID(),source_drawing_id:source.id,spec_ids:source.spec_ids,number:'COPIED-SHARED',version:'A',preferred:false,data:source.data,file:{key:source.file_key,name:source.file_name,type:source.file_type}};
 const call=async(r,status=200)=>{const form=new FormData();form.append('payload',JSON.stringify({request_id:crypto.randomUUID(),mode:'commit',draft:{customer_id:source.customer_id,rows:[r]}}));const old=console.error;if(status!==200)console.error=()=>{};try{const res=await batch.POST(new Request('https://factory.example/api',{method:'POST',body:form}));const body=await res.json();assert.equal(res.status,status,JSON.stringify(body));return body}finally{console.error=old}};
 await call({...row,source_drawing_id:'wrong'},400);await call(row);
 assert.equal(sqlite.prepare('SELECT file_key FROM drawings WHERE id=?').get(row.key).file_key,source.file_key);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM drawing_specs WHERE drawing_id=?').get(row.key).n,1);
 const original=console.error;console.error=()=>{};try{const r=await materials.POST(new Request('https://factory.example/api',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'test-owner'},body:JSON.stringify({action:'edit_drawing',request_id:crypto.randomUUID(),id:row.key,expected_revision:1,reason:'重複測試',number:source.number,version:source.version,data:source.data})}));assert.equal(r.status,400)}finally{console.error=original}
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM drawing_audit WHERE drawing_id=?').get(row.key).n,0);
 assert.equal(sqlite.prepare('SELECT number FROM drawings WHERE id=?').get(row.key).number,'COPIED-SHARED');
});

test('complete backup restores into a new SQLite copy with every row, sequence, reference and attachment',async()=>{
 const backupApi=await api('app/api/backup/route.ts');
 assert.equal((await backupApi.GET(new Request('https://factory.example/api/backup'))).status,401);
 const request=new Request('https://factory.example/api/backup',{headers:{'oai-authenticated-user-id':'test-owner'}});
 const response=await backupApi.GET(request);const backup=await response.json();assert.equal(response.status,200,JSON.stringify(backup));
 const {mkdtempSync,writeFileSync,existsSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const root=mkdtempSync(join(tmpdir(),'factory-backup-'));const {restoreCopy}=await import('../public/backup-restore.mjs');
 const report=await restoreCopy(backup,join(root,'restored'));
 assert.equal(report.all_rows_match,true);assert.ok(report.files>=1);assert.equal(report.production_modified,false);
 const restored=new DatabaseSync(join(root,'restored','factory-flow.sqlite'));
 for(const table of Object.keys(backup.payload.tables))assert.equal(restored.prepare('SELECT count(*) AS n FROM "'+table+'"').get().n,backup.payload.tables[table].length);
 assert.equal(restored.prepare('PRAGMA foreign_key_check').all().length,0);
 assert.ok(existsSync(join(root,'restored','report.json')));assert.equal(restored.prepare('SELECT count(*) AS n FROM audit_context').get().n,0);
 assert.throws(()=>restored.exec("DELETE FROM partners WHERE id='split-c'"));restored.close();
 await assert.rejects(()=>restoreCopy(backup,join(root,'restored')),/已存在/);
 const broken=structuredClone(backup);broken.payload.tables.intakes[0].quantity+=1;await assert.rejects(()=>restoreCopy(broken,join(root,'broken')),/檢查碼/);assert.equal(existsSync(join(root,'broken')),false);
 const key=blobs.keys().next().value,bytes=blobs.get(key);blobs.delete(key);const original=console.error;console.error=()=>{};try{const r=await backupApi.GET(request);assert.equal(r.status,400)}finally{console.error=original;blobs.set(key,bytes)}
});

test('actor audit is atomic and removed allocations can be restored once without exceeding intake quantity',async()=>{
 const safety=await api('app/api/safety/route.ts');const headers={'Content-Type':'application/json','oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'owner@example.test'};
 const dr=sqlite.prepare("SELECT * FROM drawings WHERE number='ROUND-GROOVE' AND version='A'").get();
 const receipt=await post(materials,{action:'receipt',customer_id:'split-c',supplier_id:'split-v',date:'2026-09-06',number:'RECOVER',barrels:0,note:'',lines:[{spec_id:dr.spec_id,drawing_id:'',quantity:100,packages:1,package_unit:'包',due:'2026-09-10',fee:1}]});
 const allocation=await post(materials,{action:'allocate',id:receipt.id+':0',drawing_id:dr.id,quantity:80,fee:1,due:'2026-09-10'});
 const rm=await materials.POST(new Request('https://factory.example/api',{method:'POST',headers,body:JSON.stringify({action:'remove_allocation',request_id:crypto.randomUUID(),id:allocation.id})}));assert.equal(rm.status,200);
 const audit=sqlite.prepare("SELECT * FROM operation_audit WHERE record_id=? AND action='delete' ORDER BY rowid DESC LIMIT 1").get(allocation.id);assert.match(audit.actor,/owner@example.test/);
 const recover=()=>safety.POST(new Request('https://factory.example/api/safety',{method:'POST',headers,body:JSON.stringify({audit_id:audit.id,reason:'誤刪復原'})}));
 const another=await post(materials,{action:'allocate',id:receipt.id+':0',drawing_id:dr.id,quantity:30,fee:1,due:'2026-09-10'});
 const denied=await recover();assert.equal(denied.status,400);assert.equal(sqlite.prepare("SELECT count(*) AS n FROM operation_audit WHERE record_id=? AND action='restore'").get(allocation.id).n,0);
 await post(materials,{action:'remove_allocation',id:another.id});assert.equal((await recover()).status,200);assert.equal((await recover()).status,200);
 assert.equal(sqlite.prepare('SELECT quantity FROM intake_allocations WHERE id=?').get(allocation.id).quantity,80);
 assert.equal(sqlite.prepare("SELECT count(*) AS n FROM operation_audit WHERE record_id=? AND action='restore'").get(allocation.id).n,1);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM audit_context').get().n,0);
 const current=(await (await safety.GET(new Request('https://factory.example/api/safety',{headers}))).json());assert.ok(!current.trash.some(a=>a.record_id===allocation.id));
 assert.throws(()=>sqlite.prepare('DELETE FROM documents WHERE id=?').run(receipt.id));
});

test('simplified flow: complete_ship marks the job done, records shortage as defective and ships in one step',async()=>{
 const so=await post(production,{action:'order',partner_id:'existing',date:'2026-09-05',due:'2026-09-10',product:'簡易套筒',spec:'',quantity:10,unit:'支',price:10,note:''});
 const job=await post(production,{action:'work_order',order_id:so.id,machine:'',operator:'阿明'});
 const ship=(quantity,status=200)=>post(production,{action:'complete_ship',id:job.id,date:'2026-09-07',barrels:1,packages:1,package_unit:'桶',quantity,tax_rate:5,note:''},status);
 await ship(11,400);
 const shipped=await ship(8);
 assert.deepEqual({...sqlite.prepare('SELECT status,good,defective,shipped FROM work_orders WHERE id=?').get(job.id)},{status:'completed',good:8,defective:2,shipped:8});
 assert.deepEqual({...sqlite.prepare('SELECT kind,subtotal,total,barrels FROM documents WHERE id=?').get(shipped.id)},{kind:'out',subtotal:8000,total:8400,barrels:1});
 assert.equal(sqlite.prepare('SELECT note FROM production_reports WHERE work_order_id=?').get(job.id).note,'出貨即完工');
 await ship(1,400);
 const again=await post(production,{action:'complete_ship',request_id:shipped.id,id:job.id,date:'2026-09-07',barrels:1,packages:1,package_unit:'桶',quantity:8,tax_rate:5,note:''});
 assert.equal(again.id,shipped.id,'retrying the same request is safe');
});

test('series drawing: one pasted table generates a standard drawing per size, shared across profiles, with guards',async()=>{
 const spec=(size,profile,raw_diameter='22')=>post(materials,{action:'spec',data:{material:'S45C',name:'RS-短套',drive:'1/2',size,profile,raw_length:'40',raw_diameter,style:'棒材'}});
 const m10a=await spec('M10','6p'),m10b=await spec('M10','12p');
 const rows=[{size:'10',style:'A',turn_end:'work',turn_diameter:'15.0',step_length:'20',total_length:'38',groove_gap:'',thread_depth:'8',note:''},{size:'20',style:'B',turn_end:'drive',turn_diameter:'23.2',step_length:'17',total_length:'38',groove_gap:'2',thread_depth:'17',note:''}];
 const head={action:'create',customer_id:'existing',number:'無溝6140',version:'A',name:'1/2" 手動套筒',material:'6140',drive:'1/2',drawing_date:'2022-05-31',note:''};
 const created=await post(series,{...head,rows});
 assert.equal(created.created,1,'only size 10 has a material spec yet');
 assert.equal(created.warnings.length,1);
 const d=sqlite.prepare('SELECT * FROM drawings WHERE id=?').get(created.id+':0');
 assert.equal(d.preferred,1);assert.equal(d.number,'無溝6140');
 const linked=[d.spec_id,...sqlite.prepare('SELECT spec_id FROM drawing_specs WHERE drawing_id=?').all(created.id+':0').map(x=>x.spec_id)];
 assert.ok(linked.includes(m10a.id)&&linked.includes(m10b.id),'6p and 12p of the same size share one drawing');
 const data=JSON.parse(d.data);
 assert.equal(data.series.size,'10');assert.equal(data.ends.work.diameter,'15.0');assert.equal(data.ends.work.cut_length,'18');assert.equal(data.ends.drive.mode,'unchanged');assert.equal(data.groove.kind,'none');assert.equal(data.length,'38');
 assert.equal(sqlite.prepare('SELECT drawing_id FROM series_drawing_rows WHERE series_id=? AND position=1').get(created.id).drawing_id,null);
 const listed=await (await series.GET()).json();
 assert.equal(listed.series[0].rows.length,2);
 await spec('M20','6p','30');
 const again=await post(series,{action:'regenerate',id:created.id});
 assert.equal(again.created,1);
 const d20=JSON.parse(sqlite.prepare('SELECT data FROM drawings WHERE id=?').get(created.id+':1').data);
 assert.equal(d20.ends.drive.diameter,'23.2');assert.equal(d20.ends.drive.cut_length,'17');assert.equal(d20.groove.kind,'custom');assert.equal(d20.series.groove_gap,'2');
 await post(series,{...head,rows},400);
 const tooLong=await post(series,{...head,version:'B',rows:[{...rows[0],total_length:'45'}]},400);
 assert.match(tooLong.error,/總長/);
 const tooWide=await post(series,{...head,version:'B',rows:[{...rows[0],turn_diameter:'25'}]},400);
 assert.match(tooWide.error,/外徑/);
});
