import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const browser=await chromium.connectOverCDP(process.env.CORE_CDP_URL||'http://127.0.0.1:9223',{timeout:120_000});
const context=browser.contexts()[0];
let page=context.pages().find(candidate=>candidate.url().startsWith('http://localhost:3000'));
if(!page)page=await context.newPage();
const env=Object.fromEntries(fs.readFileSync(path.resolve('.env.local'),'utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')&&line.includes('=')).map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1)];}));
const supabaseUrl=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const authStorageKey=`sb-${supabaseUrl.hostname.split('.')[0]}-auth-token`;
const now=Math.floor(Date.now()/1000);
const user={id:'00000000-0000-4000-8000-000000000002',aud:'authenticated',role:'authenticated',email:'audit.admin@example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'Audit Administrator'},created_at:new Date().toISOString()};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({aud:'authenticated',exp:now+3600,iat:now,sub:user.id,email:user.email,role:'authenticated',aal:'aal1',amr:[{method:'password',timestamp:now}]})}.fixture`;
const session={access_token:token,refresh_token:'fixture-refresh-token',expires_in:3600,expires_at:now+3600,token_type:'bearer',user};
const original=await page.evaluate(key=>({design:localStorage.getItem('myoffice_design'),theme:localStorage.getItem('myoffice_theme'),auth:localStorage.getItem(key)}),authStorageKey);
const restore=async()=>page.evaluate(({original,authStorageKey})=>{for(const [key,value] of Object.entries({myoffice_design:original.design,myoffice_theme:original.theme,[authStorageKey]:original.auth})){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}},{original,authStorageKey});
await page.evaluate(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:authStorageKey,session});

const employee={id:1,employee_id:'E-001',first_name:'Audit',last_name:'Employee',designation:'Fitter',position:'Fitter',department:'Engineering',section:'Mechanical',employment_type:'NEC',employee_class:'Permanent',phone:'+263 700 000 001',email:'audit.employee@example.invalid',archived:false,is_active:true,date_of_engagement:'2020-01-01'};
const fixtures=new Map([
  ['/api/employees',[employee]],
  ['/api/timesheets',[]],
  ['/api/leaves',[]],
  ['/api/overtime',[]],
  ['/api/standby',[]],
  ['/api/documents/folders',[]],
  ['/api/documents',[{id:'doc-1',name:'Audit plan.pdf',original_name:'Audit plan.pdf',file_type:'pdf',category_id:'3',category_name:'Planning',folder_id:'Risk Management',folder_path:'Planning/Risk Management',file_size:4096,starred:false,description:'Read-only audit fixture',created_at:'2026-09-28T08:00:00Z',updated_at:'2026-09-28T08:00:00Z',file_url:'https://example.invalid/audit-plan.pdf',storage_path:'fixtures/audit-plan.pdf',mime_type:'application/pdf'}]],
  ['/api/notices',[{id:'notice-1',title:'Audit safety notice',content:'Read-only notice fixture',date:'2026-09-28',category:'Safety',priority:'High',status:'Active',is_pinned:true,requires_acknowledgment:false,author:'Audit Administrator',department:'Operations',expires_at:null,target_audience:'All Employees',notification_type:'General Announcement',attachments:[],created_at:'2026-09-28T08:00:00Z'}]],
  ['/api/admin/users',[{id:user.id,email:'audit.admin@example.invalid',full_name:'Audit Administrator',avatar_url:null,role:'super_admin',is_active:true,created_at:user.created_at},{id:'00000000-0000-4000-8000-000000000003',email:'audit.user@example.invalid',full_name:'Audit User',avatar_url:null,role:'user',is_active:true,created_at:user.created_at}]],
]);
const objectFixtures=new Map([['/api/breakdowns/dashboard/overview',{}],['/api/maintenance/work-orders/stats/summary',{}]]);
const emptyFixtures=new Set(['/api/breakdowns/get-breakdowns','/api/maintenance/work-orders','/api/tasks-events','/api/sheq','/api/equipment']);
const failures=new Set();const blockedWrites=[];const responses=[];
await page.route(`${supabaseUrl.origin}/**`,async route=>{const pathname=new URL(route.request().url()).pathname;if(pathname==='/rest/v1/user_profiles'){await route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/1'},body:JSON.stringify({id:user.id,email:user.email,full_name:'Audit Administrator',avatar_url:null,role:'super_admin',is_active:true,created_at:user.created_at})});return;}if(pathname==='/auth/v1/user'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)});return;}await route.fulfill({status:200,contentType:'application/json',body:'{}'});});
await page.route('**/api/**',async route=>{const request=route.request();const pathname=new URL(request.url()).pathname;if(request.method()!=='GET'){blockedWrites.push({method:request.method(),pathname});await route.abort('blockedbyclient');return;}if(failures.has(pathname)){responses.push({pathname,status:503});await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Service unavailable while Supabase wakes up'})});return;}if(fixtures.has(pathname)){responses.push({pathname,status:200});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures.get(pathname))});return;}if(objectFixtures.has(pathname)){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(objectFixtures.get(pathname))});return;}if(emptyFixtures.has(pathname)){await route.fulfill({status:200,contentType:'application/json',body:'[]'});return;}await route.fulfill({status:200,contentType:'application/json',body:'[]'});});

const waitText=text=>page.getByText(text,{exact:false}).first().waitFor({state:'visible',timeout:60_000});
const bodyText=()=>page.locator('body').innerText();
const overflow=locator=>locator.evaluate(element=>element.scrollWidth-element.clientWidth);
const setAppearance=theme=>page.evaluate(theme=>{localStorage.setItem('myoffice_design','dallaglio');localStorage.setItem('myoffice_theme',theme);},theme);
const check=(value,message)=>{if(!value)throw new Error(message);};
const mobile=async(slug,openDialog)=>{await setAppearance('dark');await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'domcontentloaded',timeout:120_000});await openDialog();const dialog=page.getByRole('dialog').last();await dialog.waitFor({state:'visible'});const accessibilityUnnamed=await page.evaluate(()=>[...document.querySelectorAll('button,a[href],input,textarea,select')].filter(element=>{const style=getComputedStyle(element);if(style.display==='none'||style.visibility==='hidden'||element.getClientRects().length===0)return false;const labelledBy=element.getAttribute('aria-labelledby');const labelledText=labelledBy?.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();const labels='labels' in element&&element.labels?[...element.labels].map(label=>label.textContent||'').join(' ').trim():'';const name=(element.getAttribute('aria-label')||labelledText||labels||element.getAttribute('title')||(['BUTTON','A'].includes(element.tagName)?element.textContent:'')||'').trim();return !name;}).length);const result={documentOverflow:await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),mainOverflow:await overflow(page.locator('main').last()),dialogOverflow:await overflow(dialog),accessibilityUnnamed};await page.screenshot({path:path.join(os.tmpdir(),`myoffice-${slug}-core-dark-mobile.png`),fullPage:true});const cancel=dialog.getByRole('button',{name:/Cancel|Close/,exact:true}).first();if(await cancel.isVisible().catch(()=>false))await cancel.click();else await page.keyboard.press('Escape');return result;};

async function verifyTimesheets(){
  await setAppearance('light');await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:3000/timesheets',{waitUntil:'domcontentloaded',timeout:120_000});await page.getByRole('button',{name:'NEC',exact:true}).click();await waitText('Audit Employee');
  failures.add('/api/employees');await page.getByTitle('Refresh timesheets').click();await waitText('Could not load timesheets');const quiet={recordPreserved:await page.getByText('Audit Employee',{exact:false}).first().isVisible(),falseEmpty:(await bodyText()).includes('No employees on this roster')};failures.delete('/api/employees');await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByText('Could not load timesheets',{exact:false}).waitFor({state:'hidden'});
  failures.add('/api/employees');await page.reload({waitUntil:'domcontentloaded',timeout:120_000});await waitText('Could not load timesheets');const initial={falseEmpty:(await bodyText()).includes('No employees on this roster'),createDisabled:await page.getByRole('button',{name:'Bulk Entry',exact:true}).isDisabled()};failures.delete('/api/employees');await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('button',{name:'NEC',exact:true}).click();await waitText('Audit Employee');
  const phone=await mobile('timesheets',async()=>{await page.getByRole('button',{name:'NEC',exact:true}).click();await waitText('Audit Employee');await page.getByRole('button',{name:'Bulk Entry',exact:true}).click();});return {quiet,initial,mobile:phone};
}

async function verifyEmployees(){
  await setAppearance('light');await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:3000/employees',{waitUntil:'domcontentloaded',timeout:120_000});await waitText('Audit Employee');
  failures.add('/api/employees');await page.getByTitle('Refresh').click();await waitText('Service unavailable while Supabase wakes up');const quiet={recordPreserved:await page.getByText('Audit Employee',{exact:false}).first().isVisible(),falseEmpty:(await bodyText()).includes('No employees yet')};failures.delete('/api/employees');await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByText('Service unavailable while Supabase wakes up',{exact:false}).waitFor({state:'hidden'});
  failures.add('/api/employees');await page.reload({waitUntil:'domcontentloaded',timeout:120_000});await waitText('Personnel records could not load');const initial={falseEmpty:(await bodyText()).includes('No employees yet'),createDisabled:await page.getByRole('button',{name:'Add Employee',exact:true}).first().isDisabled()};failures.delete('/api/employees');await page.getByRole('button',{name:'Retry',exact:true}).click();await waitText('Audit Employee');
  const phone=await mobile('employees',async()=>{await waitText('Audit Employee');await page.getByRole('button',{name:'Add Employee',exact:true}).first().click();});return {quiet,initial,mobile:phone};
}

async function openDocumentFixture(){await page.getByText('Planning',{exact:true}).first().click();await page.getByText('Risk Management',{exact:true}).first().click();}
async function verifyDocuments(){
  await setAppearance('light');await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:3000/documents',{waitUntil:'domcontentloaded',timeout:120_000});await openDocumentFixture();await waitText('Audit plan.pdf');
  failures.add('/api/documents');await page.getByTitle('Refresh documents').click();await waitText('Documents may be out of date');const quiet={recordPreserved:await page.getByText('Audit plan.pdf',{exact:false}).first().isVisible(),falseEmpty:(await bodyText()).includes('No files found')};failures.delete('/api/documents');await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('Documents may be out of date',{exact:false}).waitFor({state:'hidden'});
  await page.goto('http://localhost:3000/documents',{waitUntil:'domcontentloaded',timeout:120_000});failures.add('/api/documents');await openDocumentFixture();await waitText('Could not load files');const initial={falseEmpty:(await bodyText()).includes('No files found'),createDisabled:await page.getByRole('button',{name:'Upload',exact:true}).first().isDisabled()};failures.delete('/api/documents');await page.getByRole('button',{name:'Try again',exact:true}).click();await waitText('Audit plan.pdf');
  const phone=await mobile('documents',async()=>{await openDocumentFixture();await waitText('Audit plan.pdf');await page.getByRole('button',{name:'Upload',exact:true}).first().click();});return {quiet,initial,mobile:phone};
}

async function verifyNoticeboard(){
  await setAppearance('light');await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:3000/noticeboard',{waitUntil:'domcontentloaded',timeout:120_000});await waitText('Audit safety notice');
  failures.add('/api/notices');await page.getByTitle('Refresh notices').click();await waitText('Notices may be out of date');const quiet={recordPreserved:await page.getByText('Audit safety notice',{exact:false}).first().isVisible(),falseEmpty:(await bodyText()).includes('No notices found')};failures.delete('/api/notices');await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('Notices may be out of date',{exact:false}).waitFor({state:'hidden'});
  failures.add('/api/notices');await page.reload({waitUntil:'domcontentloaded',timeout:120_000});await waitText("Couldn't load notices");const initial={falseEmpty:(await bodyText()).includes('No notices found'),createDisabled:await page.getByRole('button',{name:'Create Notice',exact:true}).isDisabled()};failures.delete('/api/notices');await page.getByRole('button',{name:'Retry',exact:true}).click();await waitText('Audit safety notice');
  const phone=await mobile('noticeboard',async()=>{await waitText('Audit safety notice');await page.getByRole('button',{name:'Create Notice',exact:true}).click();});return {quiet,initial,mobile:phone};
}

async function verifyAdmin(){
  await setAppearance('light');await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:3000/admin',{waitUntil:'domcontentloaded',timeout:120_000});await waitText('audit.user@example.invalid');
  failures.add('/api/admin/users');await page.getByRole('button',{name:'Refresh',exact:true}).click();await waitText('Accounts may be out of date');const quiet={recordPreserved:await page.getByText('audit.user@example.invalid',{exact:false}).first().isVisible(),falseEmpty:(await bodyText()).includes('No users found')};failures.delete('/api/admin/users');await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('Accounts may be out of date',{exact:false}).waitFor({state:'hidden'});
  failures.add('/api/admin/users');await page.reload({waitUntil:'domcontentloaded',timeout:120_000});await waitText('Users unavailable');const initial={falseEmpty:(await bodyText()).includes('No users found'),createDisabled:await page.getByRole('button',{name:'Invite user',exact:true}).isDisabled()};failures.delete('/api/admin/users');await page.getByRole('button',{name:'Try again',exact:true}).click();await waitText('audit.user@example.invalid');
  const phone=await mobile('admin',async()=>{await waitText('audit.user@example.invalid');await page.getByRole('button',{name:'Invite user',exact:true}).click();});return {quiet,initial,mobile:phone};
}

try{
  const evidence={timesheets:await verifyTimesheets(),employees:await verifyEmployees(),documents:await verifyDocuments(),noticeboard:await verifyNoticeboard(),admin:await verifyAdmin()};
  await restore();evidence.blockedWrites=blockedWrites;evidence.responses={total:responses.length,successful:responses.filter(item=>item.status===200).length,simulatedFailures:responses.filter(item=>item.status===503).length};
  fs.writeSync(1,`${JSON.stringify(evidence,null,2)}\n`);
  for(const [name,result] of Object.entries(evidence).filter(([,value])=>value&&typeof value==='object'&&'quiet' in value)){check(result.quiet.recordPreserved&&!result.quiet.falseEmpty,`${name} quiet failure was misleading.`);check(!result.initial.falseEmpty&&result.initial.createDisabled,`${name} initial failure was unsafe.`);check(Object.values(result.mobile).every(value=>value===0),`${name} overflowed at 390px.`);}
}catch(error){await restore().catch(()=>{});fs.writeSync(2,`${error instanceof Error?error.stack||error.message:String(error)}\n`);process.exit(1);}process.exit(0);
