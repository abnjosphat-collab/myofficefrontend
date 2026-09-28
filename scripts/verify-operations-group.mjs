import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser=await chromium.connectOverCDP(process.env.OPERATIONS_CDP_URL||'http://127.0.0.1:9223',{timeout:120_000});
const context=browser.contexts()[0];
let page=context.pages().find(candidate=>candidate.url().startsWith('http://localhost:3000'));
if(!page)page=await context.newPage();
const env=Object.fromEntries(fs.readFileSync(path.resolve('.env.local'),'utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')&&line.includes('=')).map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1)];}));
const supabaseUrl=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const projectRef=supabaseUrl.hostname.split('.')[0];
const authStorageKey=`sb-${projectRef}-auth-token`;
const now=Math.floor(Date.now()/1000);
const testUser={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'audit@example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'Audit Verifier'},created_at:new Date().toISOString()};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken=`${encode({alg:'HS256',typ:'JWT'})}.${encode({aud:'authenticated',exp:now+3600,iat:now,sub:testUser.id,email:testUser.email,role:'authenticated',aal:'aal1',amr:[{method:'password',timestamp:now}]})}.fixture`;
const testSession={access_token:accessToken,refresh_token:'fixture-refresh-token',expires_in:3600,expires_at:now+3600,token_type:'bearer',user:testUser};
const blockedWrites=[];const responses=[];const failures=new Set();
const background=new Map([['/api/breakdowns/get-breakdowns',[]],['/api/breakdowns/dashboard/overview',{}],['/api/maintenance/work-orders',[]],['/api/maintenance/work-orders/stats/summary',{}],['/api/overtime',[]],['/api/tasks-events',[]],['/api/sheq',[]],['/api/equipment',[]],['/api/notices',[]]]);
const fixtures=new Map([
  ['/api/standby',[{id:1,employee_id:'E-001',employee_name:'Audit Employee',designation:'Fitter',department:'Engineering',section:'Mechanical',shift_type:'5-2',on_days:5,off_days:2,cycle_start_date:'2026-09-28',is_active:true,day_overrides:[],created_at:'2026-09-28T08:00:00Z'}]],
  ['/api/employees',[{id:'employee-1',employee_id:'E-001',first_name:'Audit',last_name:'Employee',designation:'Fitter',department:'Engineering',section:'Mechanical'}]],
  ['/api/leaves',[]],
  ['/api/pachedu/',[{id:'p-1',location:'Main workshop',date:'2026-09-28',activityObserved:'Pump maintenance',whatDidYouSee:'Isolation applied correctly',reasons:'Good practice',behaviourType:'Intentional',impacts:[],whatDidYouDo:'Recognised the team',observerName:'Audit Observer',dept:'Engineering',sdwt:'',sectionChoice:'Mechanical',checklist:[],status:'submitted',created_at:'2026-09-28T08:00:00Z'}]],
  ['/api/pachedu/stats/overview',{total:1,bySection:{Mechanical:1,Electrical:0},byDept:{Engineering:1},byBehaviour:{Intentional:1,Unintentional:0},totalImpacts:0,totalChecklist:0,draftCount:0,submittedCount:1,reviewedCount:0,closedCount:0}],
  ['/api/spares',[{id:1,stock_code:'SP-001',description:'Audit pump seal',category:'Pump parts',categories:['Pump parts'],machine_type:'Pump',current_quantity:4,min_quantity:2,max_quantity:8,unit_price:25,unit_of_measure:'EA',priority:'medium',storage_location:'A1',supplier:'Audit supplier',safety_stock:false,notes:''}]],
  ['/api/spares/saved-requisitions',[]],
]);
await page.route(`${supabaseUrl.origin}/**`,async route=>{const pathname=new URL(route.request().url()).pathname;if(pathname==='/rest/v1/user_profiles'){await route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/1'},body:JSON.stringify([{id:testUser.id,email:testUser.email,full_name:'Audit Verifier',avatar_url:null,role:'admin',is_active:true,created_at:testUser.created_at}])});return;}if(pathname==='/auth/v1/user'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(testUser)});return;}await route.fulfill({status:200,contentType:'application/json',body:'{}'});});
await page.route('**/api/**',async route=>{const request=route.request();const pathname=new URL(request.url()).pathname;if(request.method()!=='GET'){blockedWrites.push({method:request.method(),pathname});await route.abort('blockedbyclient');return;}if(failures.has(pathname)){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Service unavailable while Supabase wakes up'})});return;}if(fixtures.has(pathname)){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures.get(pathname))});return;}if(background.has(pathname)){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(background.get(pathname))});return;}await route.continue();});
page.on('response',response=>{const pathname=new URL(response.url()).pathname;if(fixtures.has(pathname))responses.push({pathname,status:response.status()});});
const check=(value,message)=>{if(!value)throw new Error(message);};
const waitText=text=>page.getByText(text,{exact:false}).first().waitFor({state:'visible',timeout:60_000});
const overflow=locator=>locator.evaluate(element=>element.scrollWidth-element.clientWidth);
const original=await page.evaluate(key=>({design:localStorage.getItem('myoffice_design'),theme:localStorage.getItem('myoffice_theme'),auth:localStorage.getItem(key)}),authStorageKey);
const setAppearance=async theme=>page.evaluate(theme=>{localStorage.setItem('myoffice_design','dallaglio');localStorage.setItem('myoffice_theme',theme);},theme);
const restore=async()=>page.evaluate(({original,authStorageKey})=>{for(const [key,value] of Object.entries({myoffice_design:original.design,myoffice_theme:original.theme,[authStorageKey]:original.auth})){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}},{original,authStorageKey});
await page.evaluate(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:authStorageKey,session:testSession});

async function verifyRoute(config){
  await setAppearance('light');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(`http://localhost:3000${config.route}`,{waitUntil:'domcontentloaded',timeout:120_000});
  await waitText(config.recordText);
  const live={recordVisible:await page.getByText(config.recordText,{exact:false}).first().isVisible()};

  failures.add(config.primaryPath);
  await page.getByRole('button',{name:config.refreshName}).first().click();
  await waitText(config.staleText);
  const quiet={warning:true,recordPreserved:await page.getByText(config.recordText,{exact:false}).first().isVisible(),falseEmpty:(await page.locator('body').innerText()).includes(config.emptyText)};
  failures.delete(config.primaryPath);
  await page.getByRole('button',{name:'Try again',exact:true}).first().click();
  await page.getByText(config.staleText,{exact:false}).waitFor({state:'hidden',timeout:60_000});

  failures.add(config.primaryPath);
  await page.reload({waitUntil:'domcontentloaded',timeout:120_000});
  await waitText(config.unavailableText);
  const initialText=await page.locator('body').innerText();
  const initial={unavailable:true,falseEmpty:initialText.includes(config.emptyText),createDisabled:await page.getByRole('button',{name:config.createName,exact:true}).isDisabled()};
  failures.delete(config.primaryPath);
  await page.getByRole('button',{name:'Try again',exact:true}).first().click();
  await waitText(config.recordText);

  await setAppearance('dark');
  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'domcontentloaded',timeout:120_000});
  await waitText(config.recordText);
  const mobile={documentOverflow:await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),mainOverflow:await overflow(page.locator('main').last())};
  await page.getByRole('button',{name:config.createName,exact:true}).click();
  const dialog=page.getByRole('dialog').last();
  await dialog.waitFor({state:'visible'});
  mobile.dialogOverflow=await overflow(dialog);
  await page.screenshot({path:path.join(os.tmpdir(),`myoffice-${config.slug}-dark-mobile.png`),fullPage:true});
  await dialog.getByRole('button',{name:'Cancel',exact:true}).first().click();
  return {live,quiet,initial,mobile};
}

try{
  const shifts=await verifyRoute({route:'/shifts',slug:'shifts',primaryPath:'/api/standby',recordText:'Audit Employee',staleText:'Shift roster may be out of date',unavailableText:'Shift roster unavailable',emptyText:'No assignments yet',refreshName:'Refresh shifts',createName:'Assign Shift'});
  const pachedu=await verifyRoute({route:'/pachedu',slug:'pachedu',primaryPath:'/api/pachedu/',recordText:'Pump maintenance',staleText:'Pachedu reports may be out of date',unavailableText:'Pachedu reports unavailable',emptyText:'No care observations found',refreshName:/Refresh/i,createName:'New care observation'});
  const spares=await verifyRoute({route:'/spares',slug:'spares',primaryPath:'/api/spares',recordText:'Audit pump seal',staleText:'Spares register may be out of date',unavailableText:'Spares register unavailable',emptyText:'No spare parts found',refreshName:/Refresh/i,createName:'Add spare'});
  await restore();
  const evidence={shifts,pachedu,spares,blockedWrites,responses:{total:responses.length,successful:responses.filter(item=>item.status===200).length,simulatedFailures:responses.filter(item=>item.status===503).length}};
  fs.writeSync(1,`${JSON.stringify(evidence,null,2)}\n`);
  for(const [name,result] of Object.entries({shifts,pachedu,spares})){
    check(result.live.recordVisible,`${name} fixture did not render.`);check(result.quiet.warning&&result.quiet.recordPreserved&&!result.quiet.falseEmpty,`${name} quiet failure was misleading.`);check(result.initial.unavailable&&!result.initial.falseEmpty&&result.initial.createDisabled,`${name} initial failure was unsafe.`);check(Object.values(result.mobile).every(value=>value===0),`${name} overflowed at 390px.`);
  }
}catch(error){await restore().catch(()=>{});fs.writeSync(2,`${error instanceof Error?error.stack||error.message:String(error)}\n`);process.exit(1);}process.exit(0);
