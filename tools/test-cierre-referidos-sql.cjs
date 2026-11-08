'use strict';
// Executes the exact migration on local PostgreSQL/WASM. Only pg_cron and the wall clock
// are explicit test shims. No production services, accounts or files are changed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const repo=path.resolve(__dirname,'..');
const original=fs.readFileSync(path.join(repo,'supabase/migrations/20261108194504_cierre_automatico_referidos.sql'),'utf8');
const clockInitial='2026-11-08T20:00:00Z',cutoff='2026-11-09T03:00:00Z';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),checks=[];
const record=(label,condition)=>{assert(condition,label);checks.push(label);};
const execSql=original.replace(/^create extension if not exists pg_cron with schema pg_catalog;$/m,'-- explicit cron shim in test fixture').replace(/\bclock_timestamp\(\)/g,'golden_internal.test_clock()');
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create schema golden_internal;
  create table auth.users(id uuid primary key,created_at timestamptz not null,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table public.farms(user_id uuid primary key,name text,data jsonb,updated_at timestamptz default now());
  create table golden_internal.equipo_accesos(user_id uuid primary key,active boolean);
  create table golden_internal.discord_links(user_id uuid primary key,discord_name text);
  create schema cron;
  create table cron.job(jobid bigint generated always as identity primary key,jobname text,username text default current_user,schedule text,command text);
  create function cron.schedule(text,text,text) returns bigint language plpgsql as $$declare n bigint;begin insert into cron.job(jobname,schedule,command)values($1,$2,$3)returning jobid into n;return n;end$$;
  create function cron.unschedule(bigint) returns boolean language plpgsql as $$begin delete from cron.job where jobid=$1;return found;end$$;
  create function golden_internal.test_clock() returns timestamptz language sql volatile as $$select current_setting('test.referral_clock')::timestamptz$$;
  select set_config('test.referral_clock','${clockInitial}',false);`);
 await db.exec(fs.readFileSync(path.join(repo,'sql/referidos.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(repo,'sql/referidos-manual.sql'),'utf8'));
 const q=async(sql,params=[])=>db.query(sql,params);
 const clock=async value=>q("select set_config('test.referral_clock',$1,false)",[value]);
 const who=async n=>q("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);
 const person=async(n,{confirmed=true,level=3,farm=true,name='Player '+n,created='2026-11-01T00:00:00Z',confirmAt='2026-11-02T00:00:00Z'}={})=>{
  await q('insert into auth.users(id,created_at,email_confirmed_at) values($1,$2,$3)',[id(n),created,confirmed?confirmAt:null]);
  if(farm)await q('insert into public.farms(user_id,name,data)values($1,$2,$3)',[id(n),name,JSON.stringify({level,plata:27,res:{madera:9},skills:{sword:42}})]);
 };
 const attribute=async(invited,inviter)=>q('update golden_internal.referrals set invited_by=$1 where user_id=$2',[id(inviter),id(invited)]);
 const snap=async()=>((await q('select golden_internal.referral_event_snapshot_20261108() s')).rows[0].s);
 const own=async n=>{await who(n);return(await q('select public.my_referral() r')).rows[0].r;};
 const install=async()=>db.exec(execSql);
 return{db,q,clock,who,person,attribute,snap,own,install};
}
async function capAndExclusions(){
 const t=await fixture();try{
  await t.person(1);for(let n=2;n<=8;n++){await t.person(n);await t.attribute(n,1);}
  await t.person(9,{confirmed:false});await t.attribute(9,1);
  await t.person(10,{level:2});await t.attribute(10,1);
  await t.person(11); // deliberately unattributed until after the deadline
  await t.person(12,{created:'2026-11-09T03:00:00Z'});await t.attribute(12,1);
  await t.person(20,{farm:false});await t.person(21);await t.attribute(21,20);
  const originalRows=(await t.q("select (select jsonb_agg(to_jsonb(f)order by user_id)from farms f) farms,(select jsonb_agg(to_jsonb(u)order by id)from auth.users u) users,(select jsonb_agg(to_jsonb(r)order by user_id)from golden_internal.referrals r)refs")).rows[0];
  await t.q("select cron.schedule('unrelated-original-job','0 0 * * *','select 1;')");
  await t.install();
  const after=(await t.q("select (select jsonb_agg(to_jsonb(f)order by user_id)from farms f) farms,(select jsonb_agg(to_jsonb(u)order by id)from auth.users u) users,(select jsonb_agg(to_jsonb(r)order by user_id)from golden_internal.referrals r)refs")).rows[0];
  record('installation leaves original Auth, farms, referral attribution, balances and skills exact',JSON.stringify(originalRows)===JSON.stringify(after));
  let s=await t.snap(),r=s.rows.find(x=>x.inviter_id===id(1));
  record('preannouncement confirmed level3 referrals are backfilled: seven valid with five-ticket cap',r.raffle_valid===7&&r.tickets===5&&r.valid_preannouncement===7);
  record('inviter without farm receives no event tickets',!s.rows.some(x=>x.inviter_id===id(20))&&s.confirmed_inviter_without_farm===1);
  await t.q('insert into public.farms(user_id,name,data)values($1,$2,$3)',[id(20),'New farm',JSON.stringify({level:1})]);
  record('inviter creating own farm before deadline becomes eligible',(await t.snap()).rows.find(x=>x.inviter_id===id(20)).tickets===1);
  await t.q('insert into golden_internal.equipo_accesos values($1,true)',[id(2)]);
  await t.q("update farms set name='QA-Suren' where user_id=$1",[id(3)]);
  s=await t.snap();r=s.rows.find(x=>x.inviter_id===id(1));
  record('staff and QA invitees excluded before deadline',r.raffle_valid===5&&r.tickets===5);
  await t.q('insert into golden_internal.equipo_accesos values($1,true)',[id(1)]);
  record('staff inviter excluded before deadline',!(await t.snap()).rows.some(x=>x.inviter_id===id(1)));
  await t.q('update golden_internal.equipo_accesos set active=false where user_id=$1',[id(1)]);
  record('staff change before deadline updates captured facts',(await t.snap()).rows.some(x=>x.inviter_id===id(1)));
  const early=await t.own(1);record('public event shows only own capped ticket count and retains permanent fields',early.event.tickets===5&&early.code&&early.registered===9&&!JSON.stringify(early).includes('inviter_id')&&!JSON.stringify(early).includes('candidate_edges'));
  await t.clock(cutoff);const closed=await t.own(1);
  record('exact exclusive boundary is closed',closed.event.status==='closed');
  const sealed=(await t.q('select sealed_snapshot,closed_at,sealed_at from golden_internal.referral_events')).rows[0];
  record('seal records effective deadline separately from actual seal time',Date.parse(sealed.closed_at)===Date.parse(cutoff)&&!!sealed.sealed_at);
  await t.q('update auth.users set email_confirmed_at=$1 where id=$2',[cutoff,id(9)]);
  await t.q("update farms set data=jsonb_set(data,'{level}','3') where user_id=$1",[id(10)]);
  const code=(await t.q('select code from golden_internal.referrals where user_id=$1',[id(1)])).rows[0].code;
  await t.who(11);await t.q('select public.set_my_referrer($1)',[code]);
  await t.person(30,{created:cutoff,confirmAt:cutoff});await t.attribute(30,1);
  const later=await t.own(1);
  record('late email confirmation, level3 and invitation do not add any frozen ticket',later.event.tickets===5&&later.event.my_qualified===5);
  record('permanent inviter assignment and confirmed counter still work after event close',later.registered===12&&(await t.q('select invited_by from golden_internal.referrals where user_id=$1',[id(11)])).rows[0].invited_by===id(1));
  await t.q('delete from auth.users where id=$1',[id(4)]);
  await t.q('update golden_internal.referrals set invited_by=null where user_id=$1',[id(5)]);
  await t.q("update farms set name='Changed later',data='{\"level\":25}' where user_id=$1",[id(1)]);
  await t.q('update golden_internal.equipo_accesos set active=true where user_id=$1',[id(1)]);
  await t.q('select golden_internal.close_referral_event_20261108()');
  const stable=(await t.q('select sealed_snapshot from golden_internal.referral_events')).rows[0].sealed_snapshot;
  record('postclose account deletion, attribution, name, staff and repeated close preserve sealed evidence',JSON.stringify(stable)===JSON.stringify(sealed.sealed_snapshot));
  const jobs=(await t.q('select jobname from cron.job')).rows;
  record('closure removes only event job and preserves unrelated cron job',jobs.length===1&&jobs[0].jobname==='unrelated-original-job');
  const acl=(await t.q(`select has_table_privilege('authenticated','golden_internal.referral_event_people','SELECT') facts,
   has_table_privilege('service_role','golden_internal.referral_events','UPDATE') settings,
   has_function_privilege('anon','public.my_referral()','EXECUTE') anonymous,
   has_function_privilege('authenticated','public.my_referral()','EXECUTE') signed_in,
   has_function_privilege('authenticated','golden_internal.close_referral_event_20261108()','EXECUTE') closer`)).rows[0];
  record('private evidence/settings/closure not callable by API roles; authenticated own RPC retained',!acl.facts&&!acl.settings&&!acl.anonymous&&acl.signed_in&&!acl.closer);
  const rls=(await t.q("select bool_and(relrowsecurity) yes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='golden_internal' and relname in('referral_events','referral_event_people')")).rows[0].yes;
  record('both new private tables have RLS enabled',rls);
 }finally{await t.db.close();}
}
async function boundariesAndClock(){
 const t=await fixture();try{
  await t.person(1);await t.person(2,{confirmed:false});await t.attribute(2,1);await t.person(3,{level:2});await t.attribute(3,1);await t.install();
  await t.clock('2026-11-09T02:59:59.999Z');await t.q('update auth.users set email_confirmed_at=$1 where id=$2',['2026-11-09T02:59:59.999Z',id(2)]);
  await t.q("update farms set data=jsonb_set(data,'{level}','3') where user_id=$1",[id(3)]);
  record('last millisecond email and level changes count',(await t.own(1)).event.tickets===2);
  await t.db.exec('begin');await t.clock('2026-11-09T03:00:00Z');await t.person(4);await t.attribute(4,1);
  const oldTx=await t.own(1);await t.db.exec('commit');
  record('transaction begun before cutoff cannot use transaction-start time to add late entrant',oldTx.event.status==='closed'&&oldTx.event.tickets===2);
  await t.clock('2026-11-08T19:00:00Z');record('sealed event stays closed even if controlled test wall clock goes backwards',(await t.own(1)).event.status==='closed');
 }finally{await t.db.close();}
}
(async()=>{
 await capAndExclusions();await boundariesAndClock();
 record('production SQL capture checks clock after per-person lock and after materialized source read',original.indexOf('at_time:=clock_timestamp();')>original.indexOf('pg_advisory_xact_lock(pg_catalog.hashtextextended')&&original.indexOf('person_exists:=found;')<original.indexOf('at_time:=clock_timestamp();',original.indexOf('person_exists:=found;')));
 record('capture uses shared event lock and closer uses nonblocking exclusive lock',original.includes('pg_advisory_xact_lock_shared(734852,20261108)')&&original.includes('pg_try_advisory_xact_lock(734852,20261108)'));
 const report={passed:true,checkedAt:new Date().toISOString(),sqlSha256:crypto.createHash('sha256').update(original).digest('hex'),checks,shims:['pg_cron local functions/table instead of extension','clock_timestamp replaced only in in-memory SQL with controlled wall clock'],limitations:['PGlite runs a single connection; actual multi-connection lock contention is structurally inspected, not reproduced'],productionWrites:0};
 console.log(JSON.stringify(report));
})().catch(error=>{const report={passed:false,checkedAt:new Date().toISOString(),sqlSha256:crypto.createHash('sha256').update(original).digest('hex'),checks,error:error.message,productionWrites:0};fs.writeFileSync(path.join(__dirname,'independent-sql-result.json'),JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;});
