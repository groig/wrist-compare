/* MIT: Wrist Calc contributors (2026), and Wrist Suite contributors (2026).
 * Small platform-free input, display and geometry helpers. No arithmetic rounding.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WristShared=factory();}(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function finite(n){return typeof n==='number'&&isFinite(n);}
function checked(n){if(!finite(n))throw Error('Out of range');return n===0?0:n;}
function decimal(text){
 if(typeof text!=='string'||!/^[-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))throw Error('Enter a complete number');
 return checked(Number(text));
}
function format(n,precision){
 checked(n);if(n===0)return '0';
 var p=precision||8, s=Number(n.toPrecision(p)).toString();
 if(s.length<=12)return s;
 return n.toExponential(Math.min(p-1,5)).replace(/\.?0+e/,'e').replace('e+','e');
}
function edit(text,key,signed,integer){
 if(key==='AC')return '';
 if(key==='DEL')return text.slice(0,-1);
 if(key==='+/-'&&signed)return text.charAt(0)==='-'?text.slice(1):'-'+text;
 if(key==='.'&&!integer&&text.indexOf('.')<0)return text+'.';
 if(/^\d$/.test(key)){
  if(text.replace(/[-.]/g,'').length>=12)throw Error('12 digit limit');
  if(text==='0')return key;if(text==='-0')return '-'+key;
  return text+key;
 }
 return text;
}
function canvas(){
 var els=[];
 function add(text,x,y,w,h,action,value,tone,font,lines){
  var a=action||'',t=tone||(a?'button':'plain');
  els.push({id:String(els.length),text:String(text),x:x,y:y,w:w,h:h,action:a,value:value===undefined?'':String(value),tone:t,font:font||18,lines:lines||1,
   background:t==='accent'?'#70dbc5':t==='button'?'#191f25':t==='secondary'?'#232a30':'#000000',
   color:t==='accent'?'#09251f':t==='muted'?'#a4b3b8':t==='teal'?'#70dbc5':'#f5f7f8',radius:a?10:0});
 }
 return {elements:els,add:add,
  text:function(t,y,h,font,tone,lines){add(t,16,y,180,h,'','',tone||'plain',font,lines);},
  button:function(t,y,action,value,tone,h){add(t,16,y,180,h||50,action,value,tone||'button',18);},
  pair:function(a,b,y){add(a[0],12,y,92,44,a[1],a[2],a[3]||'secondary',15);add(b[0],108,y,92,44,b[1],b[2],b[3]||'secondary',15);},
  keypad:function(title,draft,error,signed,integer,extra){
   this.text(title,68,24,17,'muted');this.text(draft||'—',98,38,draft.length>11?22:30);
   this.text(error||'',139,26,12,'teal',2);
   ['AC','DEL',signed?'+/-':extra?'Mode':'','Cancel'].forEach(function(k,i){if(k)add(k,12+i*48,170,44,40,k==='Cancel'?'cancel':k==='Mode'?'mode':'key',k,'secondary',k==='Cancel'?11:14);});
   var keys=integer?['7','8','9','4','5','6','1','2','3','','0','Done']:['7','8','9','4','5','6','1','2','3','.','0','Done'];
   keys.forEach(function(k,i){if(k)add(k,12+(i%3)*64,242+Math.floor(i/3)*56,60,50,k==='Done'?'done':'key',k,k==='Done'?'accent':'button',k==='Done'?15:26);});
  }
 };
}
return {finite:finite,checked:checked,decimal:decimal,format:format,edit:edit,canvas:canvas};
}));
