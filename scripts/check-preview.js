async (page) => {
 const reports={}; const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function click(type,value){let s='#screen button[data-action="'+type+'"]';if(value!==undefined)s+='[data-value="'+value+'"]';await page.locator(s).first().click();}
 async function state(){return page.evaluate(()=>wristApp.snapshot());}
 async function check(label,shot=false){
  const issues=await page.evaluate(()=>{const issues=[];document.querySelectorAll('#screen .element').forEach(el=>{const r=el.getBoundingClientRect(),t=el.firstChild.getBoundingClientRect();if(t.width>r.width+1||t.height>r.height+1||t.left<r.left-1||t.right>r.right+1||t.top<r.top-1||t.bottom>r.bottom+1)issues.push({text:el.textContent,box:[r.width,r.height],textBox:[t.width,t.height]});});return issues;});
  const s=await state();reports[label]={screen:s.screen,issues};
  if(shot)await page.locator('#screen').screenshot({path:'output/playwright/'+label+'.png'});
  if(issues.length)console.log('FIT '+label+' '+JSON.stringify(issues));
 }
 function equal(a,b,message){if(a!==b)throw Error(message+': '+a+' != '+b);}
 await page.locator('#screen').waitFor();
 await page.evaluate(() => localStorage.removeItem('org.roig.wristcompare.preferences-v1'));await page.reload();
 await page.locator('body').ariaSnapshot();await check('compare-home',true);
 async function field(id,value,unit){await click('edit',id);await click('key','AC');for(const k of value)await click('key',k);if(unit){await click('mode');await check('compare-units-'+unit);await click('unit',unit);}await check('compare-editor-'+id);await click('done');}
 await field('Aprice','4');await field('Aquantity','500');await field('Bprice','5.5');await field('Bquantity','750');await click('compare');equal((await state()).result.winner,'B','worked example');await check('compare-results',true);await click('basis');await check('compare-results-basis',true);await click('details');await check('compare-details',true);await click('overview');await click('dimensions');await check('compare-dimensions',true);await click('dimension','volume');await check('compare-dimension-confirm',true);await click('confirm');equal((await state()).a.quantity,null,'dimension clears quantity');await field('Aquantity','999999999999','usfloz');await field('Bquantity','.00000000001','l');await check('compare-long-overview',true);await click('compare');await check('compare-long-results',true);await click('details');await check('compare-long-details',true);
 await click('overview');await click('reset');await check('compare-reset',true);await click('confirm');await click('dimensions');await click('dimension','count');await field('Aprice','6');await field('Aquantity','12');await field('Bprice','8');await field('Bquantity','20');await click('compare');equal((await state()).result.winner,'B','count comparison');await check('compare-count',true);
 await page.setViewportSize({width:390,height:850});await check('compare-mobile');
 equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile width');
 await page.setViewportSize({width:1100,height:1250});await page.locator('#zoom').click();await check('compare-enlarged',true);
 if(errors.length)throw Error(errors.join(';'));
 const failures=Object.values(reports).filter(r=>r.issues.length);if(failures.length)throw Error(JSON.stringify(failures));
 return {reports,pageErrors:errors};
}
