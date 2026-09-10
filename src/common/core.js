(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./shared.js'));else root.WristCore=factory(root.WristShared);}(typeof globalThis!=='undefined'?globalThis:this,function(U){
'use strict';
// Exact international mass and US liquid-volume definitions, represented as doubles.
var dimensions={mass:{label:'Mass',units:[['g','g',1],['kg','kg',1000],['oz','oz',28.349523125],['lb','lb',453.59237]],bases:[['kg','per kg',1000],['100g','per 100 g',100]]},volume:{label:'Volume',units:[['ml','mL',1],['l','L',1000],['usfloz','US fl oz',29.5735295625]],bases:[['l','per L',1000],['100ml','per 100 mL',100]]},count:{label:'Count',units:[['items','items',1]],bases:[['item','per item',1]]}};
function dimension(id){if(!Object.prototype.hasOwnProperty.call(dimensions,id))throw Error('Invalid dimension');return dimensions[id];}
function unit(dim,id){var list=dimension(dim).units;for(var i=0;i<list.length;i++)if(list[i][0]===id)return list[i];throw Error('Choose a valid unit');}
function validatePackage(p,dim){
 if(!p||!U.finite(p.price)||p.price<0)throw Error('Enter a price of 0 or more');
 if(!U.finite(p.quantity)||p.quantity<=0)throw Error('Quantity must be > 0');
 if(dim==='count'&&Math.floor(p.quantity)!==p.quantity)throw Error('Use whole items');
 var q=U.checked(p.quantity*unit(dim,p.unit)[2]);if(q<=0)throw Error('Quantity out of range');
 var rate=U.checked(p.price/q);if(p.price>0&&rate===0)throw Error('Rate out of range');return rate;
}
function compare(input,basis){
 var d=dimension(input.dimension),a=validatePackage(input.a,input.dimension),b=validatePackage(input.b,input.dimension),selected=d.bases[0];
 if(basis){selected=d.bases.filter(function(x){return x[0]===basis;})[0];if(!selected)throw Error('Invalid display basis');}
 var high=Math.max(a,b),equal=a===b||Math.abs(a-b)<=1e-12*high,winner=equal?'equal':a<b?'A':'B';
 var saving=equal?0:100*((high-Math.min(a,b))/high);
 return {winner:winner,saving:U.checked(saving),unitPriceA:a,unitPriceB:b,rateA:U.checked(a*selected[2]),rateB:U.checked(b*selected[2]),basis:selected[1],lowerTotal:input.a.price===input.b.price?'equal':input.a.price<input.b.price?'A':'B'};
}
function createApp(){
 var dim='mass',bases={mass:'kg',volume:'l',count:'item'},a={price:null,quantity:null,unit:'g'},b={price:null,quantity:null,unit:'g'},screen='overview',error='',draft='',draftUnit='',field='',returnScreen='overview',pending='',touched=false;
 function pack(id){return id==='A'?a:b;}
 function dispatch(act){
  if(!act||typeof act.type!=='string')return snapshot();
  if(act.type==='restore'){
   if(!touched&&act.value){if(Object.prototype.hasOwnProperty.call(dimensions,act.value.dimension)){dim=act.value.dimension;a.unit=b.unit=dimension(dim).units[0][0];}
    Object.keys(bases).forEach(function(k){var n=act.value.bases&&act.value.bases[k];if(dimension(k).bases.some(function(x){return x[0]===n;}))bases[k]=n;});}
   return snapshot();
  }
  touched=true;error='';
  try{
   if(act.type==='edit'){
    returnScreen=screen==='results'||screen==='details'?'results':'overview';field=act.value;
    var p=pack(field.charAt(0)),key=field.slice(1);if(key!=='price'&&key!=='quantity')throw Error('Invalid field');
    draft=p[key]===null?'':String(p[key]);draftUnit=p.unit||dimension(dim).units[0][0];screen='editor';
   }
   else if(act.type==='key'&&screen==='editor')draft=U.edit(draft,act.value,false,dim==='count'&&field.slice(1)==='quantity');
   else if(act.type==='mode'&&screen==='editor'&&field.slice(1)==='quantity')screen='units';
   else if(act.type==='unit'){unit(dim,act.value);draftUnit=act.value;screen='editor';}
   else if(act.type==='done'&&screen==='editor'){
    var n=U.decimal(draft),p=pack(field.charAt(0)),key=field.slice(1);
    if(key==='price'){if(n<0)throw Error('Price must be 0 or more');p.price=n;}
    else {validatePackage({price:0,quantity:n,unit:draftUnit},dim);p.quantity=n;p.unit=draftUnit;}
    screen=returnScreen;
   }
   else if(act.type==='cancel'||act.type==='back')screen=screen==='units'?'editor':screen==='editor'?returnScreen:'overview';
   else if(act.type==='compare'){compare({dimension:dim,a:a,b:b},bases[dim]);screen='results';}
   else if(act.type==='overview')screen='overview';
   else if(act.type==='details')screen='details';
   else if(act.type==='basis'){var opts=dimension(dim).bases;bases[dim]=opts[(opts.findIndex(function(x){return x[0]===bases[dim];})+1)%opts.length][0];}
   else if(act.type==='dimensions')screen='dimensions';
   else if(act.type==='dimension'){
    dimension(act.value);if(act.value===dim)screen='overview';
    else if(a.quantity!==null||b.quantity!==null){pending=act.value;screen='confirmDimension';}
    else {dim=act.value;a.unit=b.unit=null;screen='overview';}
   }
   else if(act.type==='reset'){screen=a.price!==null||a.quantity!==null||b.price!==null||b.quantity!==null?'confirmReset':'overview';}
   else if(act.type==='confirm'){
    if(screen==='confirmDimension'){dim=pending;a.quantity=b.quantity=null;a.unit=b.unit=null;}
    else if(screen==='confirmReset'){a={price:null,quantity:null,unit:dimension(dim).units[0][0]};b={price:null,quantity:null,unit:dimension(dim).units[0][0]};}
    screen='overview';
   }
  }catch(e){error=e.message||'Check the values';}
  return snapshot();
 }
 function amount(p,key){return p[key]===null?'Tap to enter':U.format(p[key]);}
 function quantityText(p){return amount(p,'quantity')+(p.unit?' '+unit(dim,p.unit)[1]:'');}
 function snapshot(){
  var v=U.canvas(),d=dimension(dim),r=null;
  if(screen==='editor'){
   var isQty=field.slice(1)==='quantity';v.keypad(field.charAt(0)+(isQty?' quantity · '+unit(dim,draftUnit)[1]:' price'),draft,error,false,isQty&&dim==='count',isQty&&dim!=='count');
   if(isQty){v.text('Total quantity in this package',214,22,11,'muted');var modeButton=v.elements.filter(function(x){return x.action==='mode';})[0];if(modeButton)modeButton.text='Unit';}
  }else if(screen==='units'||screen==='dimensions'){
   v.text(screen==='units'?'Quantity unit':'Compare by',68,28,20,'muted');
   var opts=screen==='units'?d.units:Object.keys(dimensions).map(function(k){return [k,dimensions[k].label];});
   opts.forEach(function(o,i){v.button(o[1],112+i*60,screen==='units'?'unit':'dimension',o[0]);});
   v.button('Cancel',402,'cancel','','secondary',44);
  }else if(screen==='confirmDimension'||screen==='confirmReset'){
   v.text(screen==='confirmReset'?'Reset comparison?':'Change dimension?',76,58,22,'plain',2);
   v.text(screen==='confirmReset'?'Both packages will be cleared.':'Quantities and units will be cleared. Prices stay.',166,92,19,'muted',4);
   v.button('Confirm',330,'confirm','','accent');v.button('Cancel',396,'cancel');
  }else if(screen==='results'){
   try{r=compare({dimension:dim,a:a,b:b},bases[dim]);}catch(e){error=e.message;}
   if(r){v.text(r.winner==='equal'?'Equal per unit':r.winner+' is better\nper unit',68,50,20,'teal',2);
    v.button(r.basis,125,d.bases.length>1?'basis':'details','','secondary',36);
    v.text('A  '+U.format(r.rateA),173,40,U.format(r.rateA).length>9?20:27);v.text('B  '+U.format(r.rateB),221,40,U.format(r.rateB).length>9?20:27);
    var sameDisplay=U.format(r.rateA)===U.format(r.rateB)&&r.winner!=='equal';
    var percent=U.format(r.saving,6);if(percent==='100'&&Math.min(r.unitPriceA,r.unitPriceB)>0)percent='~100';
    v.text(r.winner==='equal'?'Same rate within tolerance':percent+'% cheaper per unit\nthan '+(r.winner==='A'?'B':'A'),274,60,17,'muted',3);
    if(sameDisplay)v.text('Small difference; rates rounded',333,20,11,'teal');
   }
   v.button('Package totals',358,'details','','secondary',42);v.pair(['Edit','overview'],['Reset','reset'],412);
  }else if(screen==='details'){
   v.text('Package totals',72,30,22,'muted');
   v.text('A  price '+amount(a,'price'),124,40,19);v.text(quantityText(a),166,34,19,'teal');
   v.text('B  price '+amount(b,'price'),230,40,19);v.text(quantityText(b),272,34,19,'teal');
   v.text('Unit value differs from\ntotal cash to buy today.',327,44,14,'muted',2);
   v.pair(['Results','compare'],['Edit','overview'],405);
  }else{
   v.button(d.label,68,'dimensions','','secondary',40);
   v.text('Same currency for A and B',113,28,12,'muted');
   [['A',a],['B',b]].forEach(function(pair,i){var id=pair[0],p=pair[1];v.add(id+' price\n'+amount(p,'price'),16,148+i*120,180,52,'edit',id+'price','button',18,2);v.add(id+' quantity\n'+quantityText(p),16,206+i*120,180,52,'edit',id+'quantity','button',18,2);});
   v.text(error,381,24,12,'teal',2);v.pair(['Compare','compare','','accent'],['Reset','reset'],412);
  }
  return {screen:screen,dimension:dim,a:Object.assign({},a),b:Object.assign({},b),draft:draft,draftUnit:draftUnit,error:error,result:r,preferences:{dimension:dim,bases:Object.assign({},bases)},elements:v.elements};
 }
 return {dispatch:dispatch,snapshot:snapshot};
}
return {dimensions:dimensions,compare:compare,createApp:createApp};
}));
