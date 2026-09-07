export type Material = {material:string;name:string;drive:string;size:string;profile:string;raw_length:string;raw_diameter:string;style:string};
export const fields: [keyof Material,string][]=[['material','材質'],['name','品名'],['drive','分'],['size','規格1'],['profile','規格2 / 角數'],['raw_length','來料長度（mm）'],['raw_diameter','來料外徑（mm）'],['style','來料型式']];
export const defaults:Record<keyof Material,string[]>={material:['50BV30','50BV30A'],name:['RS-短套','RS-英制短套','ES-短套'],drive:['1/2'],size:['09','10','12','13','17','18','3/8','5/8','E12','E18'],profile:['6p','12p','不適用'],raw_length:['40'],raw_diameter:['22','24','26'],style:['雙R角','R角','未指定']};
export const specLabel=(s:Material)=>`${s.material} · ${s.name} · ${s.drive} × ${s.size} × ${s.profile} · ${s.raw_length}L / Ø${s.raw_diameter} · ${s.style}`;

// Normalize notation only; material grade, product type, hole form and raw dimensions remain distinct.
export function materialKey(m:Material){
 const clean=(v:string)=>v.trim().replace(/\s+/g,' ').toUpperCase();
 const fraction=(v:string)=>{const s=clean(v).replace(/^(\d+)\s+(\d+\/\d+)$/,'$1-$2');const a=s.match(/^(?:(\d+)-)?(\d+)\/(\d+)$/);if(!a||!Number(a[3]))return s;let n=Number(a[1]||0)*Number(a[3])+Number(a[2]),d=Number(a[3]);const gcd=(x:number,y:number):number=>y?gcd(y,x%y):x;const g=gcd(n,d);n/=g;d/=g;return d===1?String(n):`${n}/${d}`};
 const size=clean(m.size);const numbered=size.match(/^(M|H|E)?0*(\d+)$/);
 const keySize=numbered?`${numbered[1]==='M'?'':numbered[1]||''}${Number(numbered[2])}`:fraction(size);
 return JSON.stringify([clean(m.material),clean(m.name),fraction(m.drive),keySize,clean(m.profile),String(Number(m.raw_length)),String(Number(m.raw_diameter)),clean(m.style)]);
}

function fractionValue(s:string){const a=s.trim().match(/^(?:(\d+)[- ]+)?(\d+)\/(\d+)$/);return a?Number(a[1]||0)+Number(a[2])/Number(a[3]):Number(s)}
export function searchCode(m:Material){
 const drive=fractionValue(m.drive)*8;const d=Number.isInteger(drive)&&drive>0?String(drive).padStart(2,'0'):m.drive;
 const s=m.size.trim().toUpperCase();const n=s.match(/^(M|H|E)?0*(\d+)$/);
 if(/^\d+$/.test(s)&&m.name.includes('英制'))return d+'S'+String(Number(s)*32).padStart(2,'0');
 if(n)return d+(n[1]==='M'?'':n[1]||'')+String(Number(n[2])).padStart(2,'0');
 const imperial=fractionValue(s)*32;
 return d+(Number.isInteger(imperial)&&imperial>0?'S'+String(imperial).padStart(2,'0'):s);
}
export function dimensionCode(s:string){const n=Number(s);if(!s||!Number.isFinite(n)||n<=0)return '?';const tenth=n*10;return Math.abs(tenth-Math.round(tenth))<1e-7?String(Math.round(tenth)).padStart(3,'0'):s.replace('.','P')}
export function materialCode(m:Material){return [searchCode(m),m.name.split('-')[0].trim(),m.profile==='不適用'?'':m.profile.toUpperCase(),'D'+dimensionCode(m.raw_diameter),'L'+dimensionCode(m.raw_length),m.material.toUpperCase()].filter(Boolean).join('-')}
