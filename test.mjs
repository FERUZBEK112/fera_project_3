import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'chiq-test-'));process.env.DATA_DIR=dir;
const {server,plan,calculate}=await import('./server.mjs');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const req=async(path,body)=>{const r=await fetch(base+'/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
after(async()=>{await new Promise(r=>server.close(r));/* SQLite owns its files until process exit. */});
test('Seeded challenge uses identical rounds and all modes are complete',()=>{assert.deepEqual(plan(42,'all'),plan(42,'all'));assert.notDeepEqual(plan(42,'all'),plan(43,'all'));assert.equal(plan(42,'all').length,14);assert.equal(plan(42,'reaction').length,3);assert.equal(plan(42,'memory').length,3);assert.equal(plan(42,'color').length,8);});
test('Server scores answers, rejects invalid timing and early taps',()=>{assert.equal(calculate([{type:'reaction'}],[{value:true,ms:250}]),750);assert.equal(calculate([{type:'reaction'}],[{value:true,ms:10}]),0);assert.equal(calculate([{type:'memory',value:'123'}],[{value:'123',ms:1000}]),950);assert.equal(calculate([{type:'color',ink:2}],[{value:1,ms:100}]),0);assert.throws(()=>calculate([{type:'reaction'}],[{value:true,ms:-2}]));assert.throws(()=>calculate([{type:'reaction'}],[]));});
test('Play, persist, challenge, leaderboard, token replay prevention',async()=>{const start=await req('start',{name:'Tester',mode:'color'});assert.equal(start.status,201);const answers=start.data.steps.map(s=>({value:s.ink,ms:500}));const finish=await req('finish',{token:start.data.token,answers});assert.equal(finish.status,201);assert.equal(finish.data.score,950);assert.equal((await req('finish',{token:start.data.token,answers})).status,400);const challenge=await req('challenge/'+finish.data.id);assert.equal(challenge.data.name,'Tester');const challenger=await req('start',{name:'Friend',challenge:finish.data.id});assert.deepEqual(challenger.data.steps,start.data.steps);const board=await req('leaderboard?mode=color');assert.equal(board.data[0].score,950);assert.equal((await req('challenge/missing')).status,404);});
test('Rooms have valid codes; unknown rooms fail',async()=>{const room=await req('rooms',{});assert.match(room.data.code,/^[A-F0-9]{6}$/);assert.equal((await req('rooms/'+room.data.code)).status,200);assert.equal((await req('start',{room:'NOPE'})).status,404);assert.equal((await req('leaderboard?room='+room.data.code)).data.length,0);});
test('Page and static assets serve correctly; traversal and unknown paths rejected',async()=>{const home=await fetch(base);assert.equal(home.status,200);assert.match(await home.text(),/lang="uz"/);assert.match(home.headers.get('Content-Security-Policy'),/default-src/);assert.equal((await fetch(base+'/app.js')).status,200);assert.equal((await fetch(base+'/style.css')).status,200);assert.equal((await fetch(base+'/missing')).status,404);assert.equal((await req('health')).data.ok,true);});

