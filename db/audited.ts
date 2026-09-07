// Context and business writes share one D1 transaction; concurrent requests cannot mix actors.
export function auditedDatabase(db:D1Database,req?:Request):D1Database {
 if(!req)return db;
 const actor=JSON.stringify({id:decodeURIComponent(req.headers.get('oai-authenticated-user-id')||'')||'unavailable',email:decodeURIComponent(req.headers.get('oai-authenticated-user-email')||'')||''});
 const originals=new WeakMap<object,D1PreparedStatement>();
 const batch=async(statements:D1PreparedStatement[])=>{const results=await db.batch([db.prepare("INSERT INTO audit_context(id,actor) VALUES('current',?) ON CONFLICT(id) DO UPDATE SET actor=excluded.actor").bind(actor),...statements.map(s=>originals.get(s)||s),db.prepare("DELETE FROM audit_context WHERE id='current'")]);return results.slice(1,-1)};
 const wrap=(stmt:D1PreparedStatement):D1PreparedStatement=>{const proxy=new Proxy(stmt,{get(target,key){if(key==='bind')return (...args:unknown[])=>wrap(target.bind(...args));if(key==='run')return async()=> (await batch([target]))[0];const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}});originals.set(proxy,stmt);return proxy};
 return new Proxy(db,{get(target,key){if(key==='prepare')return (sql:string)=>wrap(target.prepare(sql));if(key==='batch')return batch;const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}});
}
