import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {ticketToken} from '../ticket-token.js';
const source=(await readFile(new URL('../checkin.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
function ui({online=true,fetchImpl}={}){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='gate'?'MAIN':'',textContent:'',className:'',disabled:false});return nodes.get(id)};
 const context={document:{getElementById:node},navigator:{onLine:online},location:{search:''},URLSearchParams,window:{addEventListener(){}},sessionStorage:{getItem:()=> 'test-admin-token'},localStorage:{getItem:()=>''},ticketToken,AbortSignal,fetch:fetchImpl||(()=>{throw Error('unexpected network')})};
 vm.runInNewContext(source,context);
 node('token').value='01234567-89ab-4cde-8f01-23456789abcd';
 return node;
}
test('offline checkin sends nothing and never shows success',async()=>{
 let calls=0;const node=ui({online:false,fetchImpl:async()=>calls++});
 await node('go').onclick();assert.equal(calls,0);assert.match(node('result').textContent,/離線/);assert.equal(node('result').className,'show bad');
});
test('lost response reports unknown result; button unlocks for deliberate retry',async()=>{
 const node=ui({fetchImpl:async()=>{throw Error('connection lost')}});
 await node('go').onclick();assert.match(node('result').textContent,/結果尚未確認/);assert.equal(node('go').disabled,false);
});
test('double click while request pending issues only one checkin',async()=>{
 let resolve,calls=0;const node=ui({fetchImpl:()=>{calls++;return new Promise(r=>resolve=r)}});
 const first=node('go').onclick();await node('go').onclick();assert.equal(calls,1);
 resolve({ok:true,json:async()=>({ok:true,ticket_no:'QA'})});await first;
 assert.match(node('result').textContent,/報到成功/);
});
