import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomInt} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const root=dirname(fileURLToPath(import.meta.url));
const data=process.env.DATA_DIR||join(root,'data'); mkdirSync(data,{recursive:true});
const db=new DatabaseSync(join(data,'arena.db'));
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS results(id TEXT PRIMARY KEY,name TEXT,score INTEGER,mode TEXT,seed INTEGER,room TEXT,day TEXT,created INTEGER); CREATE INDEX IF NOT EXISTS results_rank ON results(day,mode,score DESC); CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY,seed INTEGER,created INTEGER);`);
const sessions=new Map(), rates=new Map();
const id=()=>randomBytes(12).toString('hex');
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function plan(seed,mode){let n=seed>>>0;const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}; const steps=[];
 if(mode==='all'||mode==='reaction')for(let i=0;i<3;i++)steps.push({type:'reaction',delay:1200+Math.floor(rnd()*2200)});
 if(mode==='all'||mode==='memory')for(let i=0;i<3;i++)steps.push({type:'memory',value:String(Math.floor((1+rnd()*8)*10**(i+2))),show:1200+i*300});
 if(mode==='all'||mode==='color')for(let i=0;i<8;i++)steps.push({type:'color',ink:Math.floor(rnd()*4),word:Math.floor(rnd()*4)});
 return steps;}
export function calculate(steps,answers){if(!Array.isArray(answers)||answers.length!==steps.length)throw Error('Sinov to‘liq tugamadi.');let score=0;for(let i=0;i<steps.length;i++){const s=steps[i],a=answers[i];if(!a||typeof a.ms!=='number'||!Number.isFinite(a.ms)||a.ms<0||a.ms>60000)throw Error('Noto‘g‘ri natija.');if(s.type==='reaction'){if(a.value===true&&a.ms>=90)score+=Math.max(0,Math.round(1000-a.ms));}else if(s.type==='memory'){if(String(a.value)===s.value)score+=Math.max(200,1000-Math.round(a.ms/20));}else if(a.value===s.ink)score+=Math.max(200,1000-Math.round(a.ms/10));}return Math.round(score/steps.length);}
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function send(res,status,value){res.writeHead(status,headers);res.end(JSON.stringify(value));}
async function body(req){let str='';for await(const chunk of req){str+=chunk;if(str.length>16000)throw Error('So‘rov juda katta.');}return JSON.parse(str||'{}');}
function cleanName(value){return String(value||'').replace(/[\p{C}<>]/gu,'').trim().slice(0,20)||'Sirli o‘yinchi';}
const pick=db.prepare('SELECT id,name,score,mode,seed,room,day FROM results WHERE id=?');
export const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),p=url.pathname;
 res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 if(p.startsWith('/api/')){
  const ip=req.socket.remoteAddress||'unknown';let rate=rates.get(ip);if(!rate||rate.time<Date.now()-60000){rate={time:Date.now(),count:0};rates.set(ip,rate);}if(++rate.count>240)return send(res,429,{error:'Biroz kutib, yana urinib ko‘ring.'});
  if(p==='/api/health')return send(res,200,{ok:true});
  if(p==='/api/leaderboard'&&req.method==='GET'){const mode=['all','reaction','memory','color'].includes(url.searchParams.get('mode'))?url.searchParams.get('mode'):'all';const room=url.searchParams.get('room');if(room)return send(res,200,db.prepare('SELECT name,score,id FROM results WHERE room=? ORDER BY score DESC LIMIT 8').all(room));return send(res,200,db.prepare('SELECT name,MAX(score) score FROM results WHERE day=? AND mode=? AND room IS NULL GROUP BY name ORDER BY score DESC LIMIT 10').all(day(),mode));}
  if(p.startsWith('/api/challenge/')&&req.method==='GET'){const result=pick.get(p.split('/').pop());return send(res,result?200:404,result||{error:'Challenge topilmadi.'});}
  if(p==='/api/rooms'&&req.method==='POST'){const code=randomBytes(3).toString('hex').toUpperCase(),seed=randomInt(1,2**31);db.prepare('INSERT INTO rooms VALUES(?,?,?)').run(code,seed,Date.now());return send(res,201,{code,seed});}
  if(p.startsWith('/api/rooms/')&&req.method==='GET'){const room=db.prepare('SELECT code,seed FROM rooms WHERE code=? AND created>?').get(p.split('/').pop().toUpperCase(),Date.now()-86400000);return send(res,room?200:404,room||{error:'Xona topilmadi yoki 24 soati tugagan.'});}
  if(p==='/api/start'&&req.method==='POST'){
   const b=await body(req);let mode=['all','reaction','memory','color'].includes(b.mode)?b.mode:'all';let seed=randomInt(1,2**31),room=null;
   if(b.daily)seed=Number(day().replaceAll('-',''));
   if(b.challenge){const c=pick.get(String(b.challenge));if(!c)return send(res,404,{error:'Challenge topilmadi.'});seed=c.seed;mode=c.mode;}
   if(b.room){const r=db.prepare('SELECT * FROM rooms WHERE code=? AND created>?').get(String(b.room).toUpperCase(),Date.now()-86400000);if(!r)return send(res,404,{error:'Xona topilmadi.'});if(db.prepare('SELECT COUNT(*) n FROM results WHERE room=?').get(r.code).n>=8)return send(res,409,{error:'Xonadagi 8 ta urinish ishlatildi. Yangi xona oching.'});room=r.code;seed=r.seed;mode='all';}
   const token=id(),steps=plan(seed,mode);sessions.set(token,{name:cleanName(b.name),mode,seed,room,steps,created:Date.now()});return send(res,201,{token,steps,mode});
  }
  if(p==='/api/finish'&&req.method==='POST'){const b=await body(req),s=sessions.get(b.token);if(!s||Date.now()-s.created>600000)return send(res,400,{error:'Urinish muddati tugadi. Qayta o‘ynang.'});const score=calculate(s.steps,b.answers);const elapsed=Date.now()-s.created;const minimum=s.steps.reduce((n,x,i)=>n+(x.type==='memory'?x.show: x.type==='reaction'&&b.answers[i].value===true?x.delay:0),0);if(elapsed<minimum)return send(res,400,{error:'Urinish vaqti noto‘g‘ri.'});if(s.room&&db.prepare('SELECT COUNT(*) n FROM results WHERE room=?').get(s.room).n>=8)return send(res,409,{error:'Xona to‘ldi. Yangi xona oching.'});sessions.delete(b.token);const result={id:id(),name:s.name,score,mode:s.mode,seed:s.seed,room:s.room,day:day()};db.prepare('INSERT INTO results VALUES(?,?,?,?,?,?,?,?)').run(result.id,result.name,score,s.mode,s.seed,s.room,result.day,Date.now());return send(res,201,result);}
  return send(res,404,{error:'Sahifa topilmadi.'});
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
 if(p==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('User-agent: *\nAllow: /\n');}
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/icon.svg':'icon.svg','/share.svg':'share.svg'};
 if(!files[p]){res.writeHead(404);return res.end('Topilmadi');}const file=files[p],ext=file.split('.').pop();res.writeHead(200,{'Content-Type':({html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'})[ext],'Cache-Control':ext==='html'?'no-cache':'public, max-age=3600','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:readFileSync(join(root,file)));
 }catch(e){send(res,400,{error:e instanceof SyntaxError?'So‘rov noto‘g‘ri.':e.message||'Xatolik yuz berdi.'});}});
const sweep=setInterval(()=>{const cutoff=Date.now()-600000;for(const[k,v]of sessions)if(v.created<cutoff)sessions.delete(k);for(const[k,v]of rates)if(v.time<cutoff)rates.delete(k);db.prepare('DELETE FROM results WHERE created<?').run(Date.now()-30*86400000);db.prepare('DELETE FROM rooms WHERE created<?').run(Date.now()-86400000);},60000);sweep.unref();
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('CHIQ CHIQ: http://localhost:'+(process.env.PORT||3000)));


