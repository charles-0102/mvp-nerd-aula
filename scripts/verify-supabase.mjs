// Teste HTTP real, opt-in. Cria somente dados fictícios prefixados da dinâmica.
// Não acessa Auth Admin nem usa chave privilegiada. O SQL de limpeza inclui só os IDs criados aqui.
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import WebSocket from 'ws'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

if (!process.argv.includes('--run')) throw new Error('Execute com --run após confirmar o projeto. Este teste cria registros fictícios da dinâmica.')
const env=loadEnv('development',process.cwd(),'')
assert.ok(/^[a-z0-9]{20}$/.test(env.SUPABASE_PROJECT_REF ?? ''),'Configure a referência do projeto autorizado no .env')
assert.ok(env.VITE_SUPABASE_URL===`https://${env.SUPABASE_PROJECT_REF}.supabase.co`,'URL pública diferente do projeto autorizado no .env')
assert.ok(env.SUPABASE_DATABASE_PREFIX==='dinamica_nerd_aula_' && env.SUPABASE_PRIVATE_SCHEMA==='dinamica_nerd_aula_private','O escopo configurado não corresponde às migrations desta aplicação')
assert.ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ADMIN_EMAIL ?? ''),'Configure ADMIN_EMAIL no .env para verificar que o e-mail não concede administração')
const create=()=>createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:WebSocket}})
const client=create(), prefix=env.SUPABASE_DATABASE_PREFIX, profiles=[]
const run=Date.now().toString(36)
let checks=0
function ok(value,message){ assert.ok(value,message); checks++ }
async function call(name,args,instance=client){ const r=await instance.rpc(prefix+name,args); if(r.error)throw new Error(`${name}: ${r.error.code} ${r.error.message}`); return r.data }
async function denied(name,args){ const r=await client.rpc(prefix+name,args); ok(Boolean(r.error),`${name} deveria recusar`); return r.error }
async function register(email){ const r=await call('register_participant',{p_email:email}); profiles.push(r.profile.id); ok(r.profile.role==='requester' && r.profile.auth_user_id===null,'papel controlado'); return r }
await mkdir('artifacts',{recursive:true})
try {
  const ana=await register(`teste-http-${run}@demonstracao.invalid`)
  const beto=await register(`teste-http-${run}@demonstracao.invalid`)
  const spoof=await register(env.ADMIN_EMAIL)
  ok(spoof.profile.role==='requester','email administrativo não promove')
  ok(ana.profile.id!==beto.profile.id,'identidades diferentes para email repetido')
  ok((await call('list_requests',{p_token:ana.token})).length===0,'primeiro acesso vazio')
  await denied('counts',{})
  await denied('counts',{p_token:'a'.repeat(64)})
  await denied('register_participant',{p_email:' '})
  await denied('create_request',{p_title:'t',p_description:'d',p_priority:'critical',p_token:ana.token})
  await denied('create_request',{p_title:' ',p_description:'d',p_priority:'medium',p_token:ana.token})
  await denied('create_request',{p_title:'t'.repeat(121),p_description:'d',p_priority:'medium',p_token:ana.token})
  const request=await call('create_request',{p_title:`[TESTE AUTOMÁTICO ${run}] Teclado e mouse`,p_description:'Registro fictício gerado pela verificação HTTP; será removido após o teste.',p_priority:'medium',p_token:ana.token})
  ok(request.status==='open' && request.priority==='medium' && request.author_id===ana.profile.id,'autoria e valores iniciais')
  ok(Boolean(request.number.match(/^DEM-[A-F0-9]{8}$/)),'número gerado')
  const persisted=await call('get_request',{p_request_id:request.id,p_token:ana.token},create())
  ok(persisted.id===request.id,'persistência consultada por nova instância')
  for(const priority of ['low','high','critical']) {
    const r=await call('create_request',{p_title:`[TESTE AUTOMÁTICO ${run}] ${priority}`,p_description:'Teste fictício.',p_priority:priority,p_reason:priority==='critical'?'Bloqueio de trabalho sem alternativa.':null,p_token:ana.token})
    ok(r.priority===priority,`abertura ${priority}`)
    if(priority==='critical') {
      const comments=await call('list_comments',{p_request_id:r.id,p_token:ana.token})
      ok(comments.length===1 && comments[0].kind==='critical_opening' && comments[0].author_id===ana.profile.id,'justificativa crítica persistida')
    }
  }
  await denied('get_request',{p_request_id:request.id,p_token:beto.token})
  await denied('list_comments',{p_request_id:request.id,p_token:beto.token})
  await denied('add_comment',{p_request_id:request.id,p_body:'Não autorizado',p_token:beto.token})
  ok((await call('list_requests',{p_token:beto.token})).length===0,'Beto não vê pedidos de Ana')
  const counts=await call('counts',{p_token:beto.token})
  ok(Object.values(counts).every(v=>v===0),'contagens isoladas')
  await denied('add_comment',{p_request_id:request.id,p_body:' '.repeat(2),p_token:ana.token})
  const comment=await call('add_comment',{p_request_id:request.id,p_body:'Comentário fictício do teste HTTP.',p_token:ana.token})
  ok(comment.kind==='comment' && comment.author_id===ana.profile.id,'comentário com autoria confiável')
  await denied('revise_priority',{p_request_id:request.id,p_priority:'high',p_reason:'Tentativa',p_expected_version:1,p_expected_priority:'medium'})
  await denied('advance_status',{p_request_id:request.id,p_next_status:'in_progress',p_expected_version:1})
  const direct=await client.from(prefix+'requests').select('*')
  ok(Boolean(direct.error),'tabelas não aceitam leitura direta de visitante')
  const update=await client.from(prefix+'requests').update({priority:'critical'}).eq('id',request.id)
  ok(Boolean(update.error),'sem escrita direta')
  const forge=await client.from(prefix+'comments').insert({request_id:request.id,author_id:ana.profile.id,author_label:'Forjado',body:'x',kind:'priority_change',previous_priority:'medium',new_priority:'high'})
  ok(Boolean(forge.error),'sem decisão forjada')
  const report={projectConfiguration:'SUPABASE_PROJECT_REF',date:new Date().toISOString(),checks,scope:'HTTP real do solicitante; administrador depende de login visual. Nenhuma alteração no Auth compartilhado.',success:true}
  await writeFile('artifacts/supabase-http-report.json',JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
} finally {
  if(profiles.length){
    for(const id of profiles)assert.match(id,/^[a-f0-9-]{36}$/)
    const ids=profiles.map(id=>`'${id}'::uuid`).join(',')
    const cleanup=`-- Somente identidades fictícias criadas nesta execução: ${run}\nbegin;\ndelete from public.${prefix}comments where author_id in (${ids}) or request_id in (select id from public.${prefix}requests where author_id in (${ids}));\ndelete from public.${prefix}requests where author_id in (${ids});\ndelete from dinamica_nerd_aula_private.participant_sessions where profile_id in (${ids});\ndelete from public.${prefix}profiles where id in (${ids}) and role='requester';\ncommit;\n`
    await writeFile('artifacts/cleanup-http-test.sql',cleanup)
  }
}
