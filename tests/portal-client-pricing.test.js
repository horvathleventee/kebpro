const test=require('node:test'),assert=require('node:assert/strict');
const {getUnitPrice,getLinePrice,summarizeCart}=require('../portal/client/order-pricing.cjs');
test('Pricing uses the partner-visible unit price, supports zero and rounds a line in forints',()=>{
 const products=[{id:'a',prices:{kg:1500,db:0}}];
 assert.equal(getUnitPrice(products,{productId:'a',unit:'kg'}),1500);
 assert.equal(getLinePrice(products,{productId:'a',unit:'kg',quantity:1.25}),1875);
 assert.equal(getLinePrice(products,{productId:'a',unit:'db',quantity:2}),0);
 assert.match(summarizeCart(products,[{productId:'a',unit:'kg',quantity:1.25}]),/1[\s\u00a0]?875/);
});
test('Pricing refuses to display a total when any unit price is missing',()=>{
 const products=[{id:'a',prices:{kg:1500}}];
 assert.equal(getUnitPrice(products,{productId:'a',unit:'karton'}),null);
 assert.equal(getLinePrice(products,{productId:'missing',unit:'kg',quantity:1}),null);
 assert.match(summarizeCart(products,[{productId:'a',unit:'kg',quantity:1},{productId:'a',unit:'db',quantity:1}]),/Hiányzó ár/);
 assert.equal(summarizeCart(products,[]),'');
});
test('Pricing preserves zero totals, explicitly null prices and centesimal quantity rounding',()=>{
 const products=[{id:'a',prices:{kg:1234,db:0,karton:null}},{id:'b'}];
 assert.equal(getLinePrice(products,{productId:'a',unit:'kg',quantity:1.234}),1518);
 assert.match(summarizeCart(products,[{productId:'a',unit:'db',quantity:5}]),/Nettó összesen: 0 Ft/);
 assert.equal(getUnitPrice(products,{productId:'a',unit:'karton'}),null);
 assert.equal(getUnitPrice(products,{productId:'b',unit:'kg'}),null);
});
