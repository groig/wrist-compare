const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),m=require('../src/manifest.json'),p=require('../package.json');
assert.equal(m.package,'org.roig.'+p.name.replace('-',''));assert.equal(m.versionName,p.version);assert.ok(Number.isSafeInteger(m.versionCode) && m.versionCode > 0, 'versionCode must be a positive integer');
assert.equal(m.config.designWidth,212);assert.equal(m.minAPILevel,1);assert.deepEqual(m.deviceTypeList,['watch']);assert.deepEqual(m.features,[{name:'system.storage'}]);assert.deepEqual(m.permissions,[]);
assert.equal(m.router.entry,'pages/'+p.name.slice(6));
for(const [route,setting]of Object.entries(m.router.pages)){const ux=fs.readFileSync(path.join(root,'src',route,setting.component+'.ux'),'utf8');assert.ok(ux.includes('<template>')&&ux.includes('<script>')&&ux.includes('<style>'));assert.ok(ux.includes("require('../../common/core.js')"));assert.equal((ux.match(/onclick=/g)||[]).length,1);}
const icon=fs.readFileSync(path.join(root,'src',m.icon));assert.equal(icon.readUInt32BE(16),192);assert.equal(icon.readUInt32BE(20),192);
for(const name of ['core','shared','preferences']){const source=fs.readFileSync(path.join(root,'src/common',name+'.js'),'utf8');assert.ok(!/\beval\s*\(|\bnew\s+Function\s*\(|\bfetch\s*\(/.test(source));}
const preview=fs.readFileSync(path.join(root,'preview.html'),'utf8');assert.ok(preview.includes(m.name));for(const n of ['core','shared','preferences'])assert.ok(preview.includes(fs.readFileSync(path.join(root,'src/common',n+'.js'),'utf8')),'Regenerate preview after source changes');
console.log(m.name+': identity, route, features, native bindings, icon, offline core and preview passed.');
