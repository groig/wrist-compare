/* Best-effort string storage. Platform API is injected; tests use fake callbacks. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WristPreferences=factory();}(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function connect(storage,key,app,render){
 var alive=true,touched=false,busy=false,pending=null,last=JSON.stringify(app.snapshot().preferences);
 function flush(){
  if(!alive||busy||pending===null)return;
  var value=pending;pending=null;busy=true;
  function finish(){if(!busy)return;busy=false;flush();}
  try{if(!storage||typeof storage.set!=='function'){finish();return;}storage.set({key:key,value:value,success:finish,fail:finish});}catch(e){finish();}
 }
 try{if(storage&&typeof storage.get==='function')storage.get({key:key,default:'',success:function(raw){
  if(!alive||touched)return;
  try{app.dispatch({type:'restore',value:JSON.parse(raw)});}catch(e){}
  last=JSON.stringify(app.snapshot().preferences);render();
 },fail:function(){}});}catch(e){}
 return {dispatch:function(action){
  if(!alive)return;
  touched=true;app.dispatch(action);var next=JSON.stringify(app.snapshot().preferences);
  if(next!==last){last=next;pending=next;flush();}render();
 },destroy:function(){alive=false;pending=null;}};
}
return {connect:connect};
}));
