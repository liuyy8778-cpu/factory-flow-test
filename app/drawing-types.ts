import {blankGroove,grooveError,grooveSummary,type Groove} from './groove-types';
export type EndCut={mode:'machine'|'unchanged'|'pending';diameter:string;cut_length:string;diameter_tolerance:string;cut_length_tolerance:string};
export type EndDrawing={format:'ends-v1';groove?:Groove;operation_code?:string;length:string;length_tolerance:string;note:string;ends:{drive:EndCut;work:EndCut}};
export const blankEnd=():EndCut=>({mode:'pending',diameter:'',cut_length:'',diameter_tolerance:'',cut_length_tolerance:''});
export function editDrawing(d:Record<string,any>):EndDrawing{return {format:'ends-v1',groove:d.groove||blankGroove(),operation_code:d.operation_code||'',length:d.length||'',length_tolerance:d.length_tolerance||'',note:d.note||'',ends:d.format==='ends-v1'?d.ends:{drive:blankEnd(),work:blankEnd()}}}
export function endSummary(e:EndCut|undefined){if(!e||e.mode==='pending')return '待確認';if(e.mode==='unchanged')return '不加工（保留來料）';return `Ø${e.diameter}（${e.diameter_tolerance}），從端面往內 ${e.cut_length}L（${e.cut_length_tolerance}）`}
export function drawingSummary(d:Record<string,any>|null|undefined){if(!d)return '待確認圖面';if(d.format==='ends-v1')return `完成總長 ${d.length}L（${d.length_tolerance}）；方孔端：${endSummary(d.ends?.drive)}；工作端：${endSummary(d.ends?.work)}；${grooveSummary(d.groove)}`;return `完成總長 ${d.length}L；舊圖外徑 Ø${d.diameter}（端別未記錄）`}
export function drawingReady(d:Record<string,any>|null|undefined){return !!d&&!grooveError(d.groove,d.length)&&(d.format!=='ends-v1'||(d.ends?.drive?.mode!=='pending'&&d.ends?.work?.mode!=='pending'&&!!d.ends?.drive&&!!d.ends?.work))}
export function drawingMatches(d:Record<string,any>,specId:string){return d.spec_id===specId||(d.spec_ids||[]).includes(specId)}
export function drawingChoice(d:Record<string,any>,specId:string):Record<string,any>{return {...d,preferred:d.preferred_spec_ids?d.preferred_spec_ids.includes(specId):!!d.preferred}}
