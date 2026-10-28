const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {create}=require('../portal/public/drafts');
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const draft=()=>({cart:[{productId:'p1',name:'Termék',quantity:2,unit:'kg'}],note:'Kapucsengő',orderDate:'2026-10-23',requestId:'stable-id',editing:null});
test('Draft survives a new storage instance and isolates partner accounts',()=>{const s=storage();create(s,'a').save(draft());assert.deepEqual(create(s,'a').read().cart,draft().cart);assert.equal(create(s,'a').read().note,'Kapucsengő');assert.equal(create(s,'b').read(),null);create(s,'b').clear();assert.ok(create(s,'a').read());});
test('Empty completed draft removes persisted data; edits retain revision and request ID',()=>{const s=storage(),d=create(s,'a');d.save({...draft(),editing:{id:'response',revision:2}});assert.equal(d.read().editing.revision,2);assert.equal(d.read().requestId,'stable-id');d.save({...draft(),cart:[],note:'',editing:null});assert.equal(d.read(),null);});
test('Corrupt drafts and storage quota failures are surfaced, not reported as saved',()=>{const s=storage(),d=create(s,'a');s.setItem('kebpro-order-draft-v1:a','{bad');assert.throws(()=>d.read());const failing=create({setItem(){throw Error('quota');}},'a');assert.throws(()=>failing.save(draft()));});
function controller(saved,history=[],s=storage()){
 if(saved)create(s,'a').save(saved);
 const source=fs.readFileSync(require.resolve('../portal/public/portal.js'),'utf8').split('const esc =')[0];
 const c=vm.createContext({KebproDrafts:{create},localStorage:s,crypto:require('node:crypto'),document:{body:{dataset:{role:'partner'}},querySelector:()=>({content:'csrf'}),getElementById:()=>null},console});
 vm.runInContext(source+`;function chosenDelivery(){return {date:orderDate||'2026-10-23',open:true};}function toast(){};data={id:'a',history:${JSON.stringify(history)}};restoreDraft();`,c);return {c,s};
}
test('Controller restores draft without sending it and preserves stable retry identity',()=>{const {c}=controller(draft());assert.equal(vm.runInContext('cart[0].quantity',c),2);assert.equal(vm.runInContext('requestId',c),'stable-id');vm.runInContext("note='Új megjegyzés';saveDraft()",c);assert.equal(vm.runInContext('draftStore.read().note',c),'Új megjegyzés');});
test('Lost success response is reconciled on reload using original or modification request ID',()=>{for(const response of [{requestId:'stable-id'},{changeIds:['stable-id']}]){const {c,s}=controller(draft(),[response]);assert.equal(vm.runInContext('cart.length',c),0);assert.equal(create(s,'a').read(),null);}});
test('Controller shows persistence failure and only clears after explicit completion',()=>{const {c}=controller(draft());vm.runInContext("draftStore={save(){throw Error('quota')}};note='Changed';saveDraft()",c);assert.match(vm.runInContext('draftError',c),/Nem sikerült/);assert.equal(vm.runInContext('cart.length',c),1);});
