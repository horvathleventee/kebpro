const test=require('node:test'),assert=require('node:assert/strict');
const {createDraftController}=require('../portal/client/draft-controller.cjs');
const {create}=require('../portal/public/drafts');
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const draft=()=>({cart:[{productId:'p',name:'Termék',quantity:2,unit:'kg'}],note:'Megjegyzés',orderDate:'2026-10-23',requestId:'stable-id',editing:null});
function setup(saved,history=[],storageInstance=storage()){
 if(saved)create(storageInstance,'a').save(saved);const state={data:{id:'a',history},cart:[],note:'',orderDate:'2026-10-23',editing:null,requestId:'new'},errors=[],messages=[];
 const controller=createDraftController({role:'partner',getStorage:()=>storageInstance,createStore:create,getState:()=>state,setState:changes=>Object.assign(state,changes),setError:error=>errors.push(error),chosenDelivery:()=>({date:state.orderDate}),toast:message=>messages.push(message),showStatus:()=>{}});
 return {state,controller,storageInstance,errors,messages};
}
test('React draft controller restores and preserves changes locally',()=>{const x=setup(draft());x.controller.restore();assert.equal(x.state.requestId,'stable-id');assert.equal(x.state.cart[0].quantity,2);x.state.note='Új';x.controller.save();assert.equal(create(x.storageInstance,'a').read().note,'Új');});
test('React draft controller clears confirmed requests rather than re-submitting',()=>{const x=setup(draft(),[{changeIds:['stable-id']}]);x.controller.restore();assert.equal(create(x.storageInstance,'a').read(),null);assert.equal(x.state.cart.length,0);});
test('React draft controller reports unavailable local storage',()=>{const x=setup(null,[],{getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){}});x.controller.restore();assert.match(x.errors.at(-1),/nem sikerült betölteni/);x.state.note='Megjegyzés';x.controller.save();assert.match(x.errors.at(-1),/Nem sikerült menteni/);});
test('draft recovery clears a request already recorded as the original order',()=>{const x=setup(draft(),[{requestId:'stable-id'}]);x.controller.restore();assert.equal(create(x.storageInstance,'a').read(),null);assert.equal(x.state.cart.length,0);});
