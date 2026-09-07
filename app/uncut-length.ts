/** Axial length retaining the incoming outside diameter, measured from an unchanged end. */
export function uncutLength(d:Record<string,any>|null|undefined,side:'drive'|'work'):number|null{
 if(d?.format!=='ends-v1'||d.ends?.[side]?.mode!=='unchanged')return null;
 const positive=(v:unknown)=>typeof v==='string'&&/^\d+(\.\d+)?$/.test(v)&&Number(v)>0&&Number.isFinite(Number(v));
 if(!positive(d.length))return null;
 const other=d.ends?.[side==='drive'?'work':'drive'];
 if(other?.mode==='unchanged')return Number(d.length);
 if(other?.mode!=='machine'||!positive(other.cut_length)||!positive(other.diameter)||Number(other.cut_length)>Number(d.length))return null;
 return Math.round((Number(d.length)-Number(other.cut_length))*1e6)/1e6;
}
