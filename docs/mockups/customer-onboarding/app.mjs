import {POLICY,PRODUCTS,SAMPLE,newState,flow,validate,needsReview,issueOtp,verifyOtp,isSubmissionAuthenticated,
  invalidateFrom,completeStep,provision,revalidateOnResume,record} from './model.mjs';

const $=id=>document.getElementById(id),KEY='ba-onboarding-concept-v2';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let s=newState(),restored=false,errors={},otpInput='',resumeNote='',virtualOffset=0,resumeLastActivity=0;
const now=()=>Date.now()+virtualOffset;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===2&&saved.data&&Array.isArray(saved.done)&&Array.isArray(saved.events)&&typeof saved.ref==='string'){
  const safeData={...SAMPLE};for(const [key,defaultValue]of Object.entries(SAMPLE)){const v=saved.data[key];if(typeof v===typeof defaultValue&&String(v).length<=500)safeData[key]=v;}
  s={...newState(),...saved,data:safeData};if(!flow(s).includes(s.step)||saved.events.some(e=>typeof e.message!=='string'||!Number.isFinite(e.at)))throw Error('Invalid saved state');restored=!!s.product&&!s.terminal;
}}catch{localStorage.removeItem(KEY);s=newState();}
const meta={
 product:['Choose what comes next.','Start with a product. Your onboarding steps adapt to your choice.','Product eligibility & routing'],
 contact:['Let’s stay connected.','Verify both sample contacts before we begin. OTPs appear in the mock inbox.','Contact verification'],
 eligibility:['A quick check before we start.','Confirm eligibility for the product you selected.','Initiation & Eligibility'],
 identity:['Let’s make sure it’s you.','Try sample document and selfie checks, including retry scenarios.','Identity & document verification'],
 information:['Your details. Carefully checked.','Review the fictional details extracted from the sample identity document.','Customer Information Service'],
 screening:['A safer start, together.','Screening receives the information and records a distinct review outcome.','Compliance & risk'],
 linked:['Connect your existing account.','A standalone debit card needs an eligible funding account.','Debit Card · account dependency'],
 financial:['A card that fits your finances.','Explore illustrative income, obligations and credit-limit checks.','Credit Card · financial assessment'],
 configuration:['Make it yours.','Configure the selected product and its applicable options.','Product & service configuration'],
 digital:['Your bank, wherever you are.','Choose your demo username and digital channels.','Digital Banking Enrollment Service'],
 consent:['Clear choices. In your control.','Review the current sample terms and confirm your fictional declaration.','Consent & Agreement Service'],
 authentication:['One final verification.','Verify a new mock mobile OTP bound to this application and its current details.','Submission authentication'],
 review:['A moment to review.','Every prerequisite is revalidated before approval and provisioning.','Application review & submission'],
 provisioning:['Approved. Ready to create.','Approval and successful service creation are different outcomes.','Account / Card provisioning'],
 complete:['Ready for your next chapter.','Your sample product is provisioned. Explore the result and activity below.','Completed onboarding']
};
const labels={product:'Select product',contact:'Contact & OTP',eligibility:'Eligibility',identity:'Verify identity',information:'Your information',
 screening:'Screening & review',linked:'Link account',financial:'Financial details',configuration:'Product options',digital:'Digital banking',
 consent:'Agreements',authentication:'Submission OTP',review:'Review & submit',provisioning:'Create product',complete:'Your dashboard'};
function persist(){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{toast('Local save unavailable. Keep this tab open to retain progress.');}}
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),4500);}
function btn(label,action,primary=false,disabled=false){return `<button type="button" class="${primary?'primary':'secondary'}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;}
function hint(key){return `<span class="field-error" id="err-${key}">${esc(errors[key]||'')}</span>`;}
function field(key,label,type='text',note='',extra='') {return `<label class="field">${label}<input data-field="${key}" id="field-${key}" name="${key}" type="${type}" value="${esc(s.data[key])}" aria-label="${esc(label)}" aria-invalid="${!!errors[key]}" aria-describedby="err-${key}" ${extra}>${note?`<span class="field-hint">${esc(note)}</span>`:''}${hint(key)}</label>`;}
function select(key,label,options){return `<label class="field">${label}<select data-field="${key}" id="field-${key}" name="${key}" aria-label="${esc(label)}" aria-invalid="${!!errors[key]}" aria-describedby="err-${key}">${options.map(v=>{const [value,text]=Array.isArray(v)?v:[v,v];return `<option value="${esc(value)}" ${s.data[key]===value?'selected':''}>${esc(text)}</option>`;}).join('')}</select>${hint(key)}</label>`;}
function check(key,label){return `<label class="check"><input type="checkbox" data-field="${key}" id="field-${key}" ${s.data[key]?'checked':''} aria-label="${esc(label)}" aria-describedby="err-${key}"><span>${label}${hint(key)}</span></label>`;}
function task(label,result,ok=true){return `<div class="task"><span>${label}</span><span class="${ok?'ok':'pending'}">${esc(result)}</span></div>`;}
function notice(text,type=''){return `<div class="notice ${type}">${text}</div>`;}
function capture(){document.querySelectorAll('#panel [data-field]').forEach(el=>{s.data[el.dataset.field]=el.type==='checkbox'?el.checked:el.value;});}
function status(){return s.terminal||(s.pendingActionAt?'PENDING CUSTOMER ACTION':s.approved?'APPROVED':s.step==='screening'&&needsReview(s)&&!s.screeningAt?'PENDING BANK REVIEW':s.step==='product'?'DRAFT':s.paused?'SAVED':'IN PROGRESS');}
function showErrors(e){errors=e;render();const box=$('error');if(box){box.classList.remove('hidden');box.focus();} }
function forwardBlockReason(){
 if(s.paused)return 'Authenticate to resume before continuing.';
 if(!['contact','identity','screening','authentication','review','provisioning'].includes(s.step))return '';
 return Object.values(validate(s,s.step==='provisioning'?'review':s.step,now()))[0]||'';
}
function syncForwardGate(){
 const button=document.querySelector('#panel [data-action="continue"],#panel [data-action="provision"]');
 const hint=$('progress-blocked-hint');if(!button||!hint)return;
 const reason=forwardBlockReason();button.disabled=!!reason;
 if(reason)button.setAttribute('aria-describedby','progress-blocked-hint');else button.removeAttribute('aria-describedby');
 hint.textContent=reason;hint.hidden=!reason;
}
function render(){
 const f=flow(s),i=f.indexOf(s.step),m=meta[s.step],closed=!!s.terminal;
 $('reference').textContent=s.product?s.ref:'Reference assigned when you start';$('status').textContent=status();
 $('progress').style.width=(s.terminal==='COMPLETED'?100:i/Math.max(1,f.length-1)*100)+'%';
 $('title').textContent=m[0];$('eyebrow').textContent=s.product?PRODUCTS[s.product]+' · FICTIONAL APPLICATION':'PRODUCT-LED ONBOARDING · CONCEPT V2';
 $('subtitle').textContent=m[1];$('stagecount').textContent=String(i+1).padStart(2,'0')+' / '+String(f.length).padStart(2,'0');
 $('context-title').textContent=m[2];$('context-copy').textContent=context();$('next-copy').textContent=i<f.length-1?'Next: '+labels[f[i+1]]:'No banking transaction is performed by this prototype.';
 $('steps').innerHTML=f.map((k,n)=>`<button class="step ${k===s.step?'active':s.done.includes(k)?'done':''}" data-step="${k}" ${!s.done.includes(k)&&k!==s.step||closed?'disabled':''} ${k===s.step?'aria-current="step"':''}><span class="num">${s.done.includes(k)?'✓':n+1}</span><span class="name">${labels[k]}</span></button>`).join('');
 $('scenario').value=s.scenario;$('scenario').disabled=s.step!=='product'||closed;
 const hardClosed=closed&&s.terminal!=='COMPLETED';
 $('panel').innerHTML=hardClosed?`<h2>Application ${esc(s.terminal.toLowerCase())}.</h2>${notice('This sample record is closed. A new demo is required to proceed.','warning')}${btn('Start a new demo','reset',true)}`:
  body()+`<div id="error" class="error ${Object.keys(errors).length?'':'hidden'}" role="alert" tabindex="-1">${Object.keys(errors).length?'<strong>Please resolve these checks:</strong><ul>'+Object.values(errors).map(v=>`<li>${esc(v)}</li>`).join('')+'</ul>':''}</div>`+
  (!closed&&s.step!=='complete'?`<div class="bottom">${i>0?btn('← Back','back'): '<span class="muted">Choose a product to begin.</span>'}${btn(s.step==='product'?'Start selected journey →':s.step==='review'?'Submit sample application →':s.step==='provisioning'?'Create sample product →':'Continue →',s.step==='provisioning'?'provision':'continue',true,!!forwardBlockReason())}</div><p class="field-hint" id="progress-blocked-hint" hidden></p>`:'');
 $('save').disabled=closed||!s.product;$('withdraw').disabled=closed||!s.product;
 $('rules').innerHTML=rules();$('inbox').innerHTML=inbox();
 document.querySelectorAll('[data-field]').forEach(el=>{
  const onEdit=()=>{const key=el.dataset.field,old=s.data[key],value=el.type==='checkbox'?el.checked:el.value;if(old===value)return;
   s.data[key]=value;s.authFingerprint='';if(key==='phone'){s.verifiedPhone='';if(s.otp?.purpose!=='email')s.otp=null;}
   if(key==='email'){s.verifiedEmail='';if(s.otp?.purpose==='email')s.otp=null;}
   // A confirmed information snapshot is edited only after explicit rework.
   if(key==='documentDob'||key==='documentName'||key==='documentNo'||key==='documentExpiry'||['front','back','selfie','quality','liveness'].includes(key))s.identityAt=0;
   if(key==='country'){s.verifiedPhone='';s.otp=null;}
   if(['pep','occupation','usPerson','multiTax','taxCountry','otherTaxCountry','funds','employment','nationality'].includes(key)){s.screeningAt=0;s.reviewOutcome='';}
   record(s,`Demo field updated: ${key}`,now());persist();
   const current=validate(s,s.step,now());const err=$('err-'+key);if(err)err.textContent=current[key]||'';el.setAttribute('aria-invalid',String(!!current[key]));
   if(s.step==='contact'&&['phone','email'].includes(key)){
    const purpose=key==='phone'?'mobile':'email';
    const box=document.querySelector(`[data-otp-purpose="${purpose}"]`);
    if(box)box.outerHTML=otpBox(purpose,purpose==='mobile'?'Verify your mobile':'Verify your email');
    $('inbox').innerHTML=inbox();
   }
   $('rules').innerHTML=rules();
   syncForwardGate();
   if(el.tagName==='SELECT'||el.type==='checkbox'){errors={};render();}
  };
  el.addEventListener('input',()=>{if(el.tagName==='INPUT'&&el.type!=='checkbox')onEdit();});
  el.addEventListener('change',onEdit);
 });
 if(s.infoLocked&&s.step==='information')document.querySelectorAll('#info-fields [data-field]').forEach(el=>el.disabled=true);
 const active=$('otp-code');if(active){active.value=otpInput;active.addEventListener('input',()=>otpInput=active.value);}
 syncForwardGate();updateClock();
}
function context(){const contexts={
 product:'Product choice triggers the relevant route. CASA creates an account; Debit Card links an existing account; Credit Card includes financial assessment. Card branches are explicit prototype extensions, not newly approved Journey policy.',
 contact:'Both email and mobile are verified with purpose-bound mock challenges. Changing a contact invalidates its verification.',
 identity:'Sample images, expiry, readability and liveness must pass. Three failed captures stop automatic retry.',
 information:'Legal name and date of birth match eKYC. Employment, tax and delivery fields are conditionally mandatory. Country/occupation inconsistencies trigger review.',
 screening:'A review flag pauses progression. A simulated bank outcome records cleared, request-information or rejected separately.',
 linked:'Only the fictional customer’s active VND account can fund this standalone Debit Card. No new CASA account is created.',
 financial:'All income thresholds, credit multiples and affordability checks here are labelled demo policy, not real underwriting or lending advice.',
 consent:'Product-specific sample terms are versioned. Marketing stays optional. A typed sample declaration is not a real signature.',
 authentication:'Two-minute OTP, 30-second resend cooldown, five attempts, 60-second lock and three sends per purpose/contact. Previous codes are invalid after resend.',
 provisioning:'Prerequisites are checked again before provisioning. Retry uses the same reference and creates only one simulated product.',
 complete:'Notification retries do not recreate the product. The result and activity are fictional and stored in this browser only.'};
 return contexts[s.step]||'The application records domain outcomes. Return to earlier stages with controlled rework; later confirmations and authentication are invalidated.';}
function rules(){if(s.terminal)return `<p>Application closed: ${esc(s.terminal)}.</p>`;const e=validate(s,s.step,now());return `<p>${Object.keys(e).length?Object.keys(e).length+' checks remain.':'Current step checks are satisfied.'}</p><ul>${Object.values(e).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>Ready for the next step.</li>'}</ul><p>Thresholds marked “demo” are configurable examples.</p>`;}
function inbox(){const o=s.otp;if(!o)return '<p>No mock message yet. Send an OTP from a verification step.</p>';if(o.used)return `<div class="micro">MOCK ${o.purpose==='email'?'EMAIL':'SMS'} · ${esc(o.purpose)}</div><p class="masked">${esc(mask(o.target))}</p><p class="ok">Verification complete ✓</p><p>This one-time challenge has been consumed.</p>`;return `<div class="micro">MOCK ${o.purpose==='email'?'EMAIL':'SMS'} · ${esc(o.purpose)}</div><p class="masked">${esc(mask(o.target))}</p><strong class="mock-code">${esc(o.code)}</strong><p>Use this fictional code in the verification form.</p><div id="otp-clock" class="muted"></div><div class="row clock-controls">${btn('Demo: expire OTP','expire-otp')}${btn('Demo: advance 30s','advance-30')}${btn('Demo: advance 60s','advance-60')}</div><p>Clock controls simulate time only. They do not call an authentication service.</p>`;}
function mask(target){return target.includes('@')?target.slice(0,2)+'•••@'+target.split('@')[1]:target.slice(0,3)+'••••'+target.slice(-3);}
function otpBox(purpose,title){
 const o=s.otp,active=o?.purpose===purpose&&!o.used;
 const verified=purpose==='mobile'?!!s.verifiedPhone&&s.verifiedPhone===s.data.phone:
  purpose==='email'?!!s.verifiedEmail&&s.verifiedEmail===s.data.email:
  isSubmissionAuthenticated(s);
 const heading=`<div class="otp-box" data-otp-purpose="${purpose}"><h3>${title}</h3>`;
 const result=purpose==='mobile'?task('Mobile',verified?'Verified ✓':'Not verified',verified):
  purpose==='email'?task('Email',verified?'Verified ✓':'Not verified',verified):task('Submission',verified?'Verified ✓':'Not verified',verified);
 if(verified)return heading+result+'<p class="muted">Verification complete. Changing the verified details will require a new OTP.</p></div>';
 return heading+result+`<div class="row">${btn(active?'Resend mock OTP':'Send mock '+(purpose==='email'?'email':'mobile')+' OTP','send-'+purpose)}</div>${active?`<div class="notice inline-mock"><span class="micro">Mock ${purpose==='email'?'email':'SMS'} · ${purpose}</span><strong class="mock-code">${esc(o.code)}</strong><span class="field-hint">Fictional code · 120-second validity · Never enter a real OTP.</span></div><label class="field" style="margin-top:15px">Mock OTP code<input id="otp-code" class="otp" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="6 digits" aria-describedby="otp-help"><span id="otp-help" class="field-hint">Read the mock inbox below. Never enter a real OTP.</span></label><div class="row" style="margin-top:12px">${btn('Verify mock OTP','verify-'+purpose,true)}</div>`:''}</div>`;
}
function productChoices(){return `<div class="welcome-art" aria-hidden="true"><div class="art-card"><div class="card-wordmark"><span class="datum-symbol"><img src="./assets/datum-logo-white.png" alt="" width="282" height="83"></span>Datum Bank</div><small>EVERYDAY BANKING</small><strong>Built around you.</strong></div></div><div class="choices">${Object.entries(PRODUCTS).map(([k,title])=>`<label class="choice"><input type="radio" name="product" value="${k}" ${s.product===k?'checked':''}><span><strong>${title}</strong><small>${k==='CASA'?'New account · optional debit card · digital banking':k==='DEBIT'?'Existing active CASA required · card selection · delivery':'Financial information · demo credit eligibility · credit consent'}</small></span><span class="badge">${k==='CASA'?'NEW ACCOUNT':k==='DEBIT'?'EXISTING ACCOUNT':'CREDIT'}</span></label>`).join('')}</div>${notice('Select a product to reveal its required stages. All product terms, fees and thresholds are illustrative.')}`;}
function body(){const d=s.data;switch(s.step){
 case 'product':return productChoices();
 case 'contact':return `<h2>Where should we reach you?</h2><p class="muted">Only fictional values. Both contact methods need their own OTP.</p><div class="fields">${select('country','Country of residence',['Vietnam','United States'])}${field('phone','Mobile number','tel')}${field('email','Email','email','Example: alex@example.test')}</div>${otpBox('mobile','Verify your mobile')}${otpBox('email','Verify your email')}`;
 case 'eligibility':return `<h2>Eligibility for ${esc(PRODUCTS[s.product])}</h2>${notice(`Demo policy: minimum age ${s.product==='CREDIT'?POLICY.creditMinAge:POLICY.minAge}; resident digital onboarding. Non-resident cases require assisted review.`)}<div class="fields">${field('dob','Date of birth','date')}${select('residency','Residency',['Resident','Non-resident'])}${select('nationality','Nationality',['Vietnam','United States'])}${select('channel','Application channel',['Web','Mobile app','Branch assisted'])}</div>${check('eligible','I am using a fictional customer who meets the displayed demo eligibility.')}${check('requirements','I have reviewed the illustrative product requirements.')}`;
 case 'identity':return `<h2>A sample identity, verified carefully.</h2>${notice('No camera or upload. Toggle sample evidence and outcomes to explore validations.')}<div class="fields">${select('documentType','Document type',['National ID','Passport'])}${field('documentNo','Sample document reference')}${field('documentName','Name on sample document')}${field('documentDob','Date of birth on document','date')}${field('documentExpiry','Document expiry','date')}${select('quality','Image quality',['Clear','Blurred'])}${select('liveness','Liveness result',['Pass','Fail'])}</div>${check('front','Front / passport sample provided')}${d.documentType==='National ID'?check('back','Back of National ID sample provided'):''}${check('selfie','Selfie sample provided')}${task('Identity verification',s.identityAt?'Verified ✓':`Not verified · ${s.identityAttempts}/3 failed attempts`,!!s.identityAt)}<div class="row" style="margin-top:20px">${btn('Run sample eKYC','identity',true)}</div>`;
 case 'information':return `<h2>Details that stay consistent.</h2>${s.infoLocked?notice('This confirmed snapshot is read-only. Request rework with a reason to change it.','warning'):notice('All editable sample information is retained locally for Save & Resume.')}<div id="info-fields"><div class="fields">${field('name','Legal name')}${field('dob','Date of birth','date')}${field('street','Residential street')}${field('city','City / district')}${select('employment','Employment',['Employed','Self-employed','Student','Unemployed'])}${d.employment==='Employed'?field('employer','Employer name'):''}${select('funds','Source of funds',[['','Select a source'],'Salary','Business income','Family support','Savings'])}${select('occupation','Occupation risk (demo)',['Standard','High-risk (demo)'])}${select('taxCountry','Tax residency',['Vietnam','United States'])}</div>${taxFields(false)}${check('multiTax','I have an additional tax residency (demo).')}${d.multiTax?`<div class="fields">${select('otherTaxCountry','Second tax residency',['United States','Vietnam'])}</div>${taxFields(true)}`:''}${check('usPerson','US Person declaration (demo; triggers compliance review)')}${check('confirmed','I explicitly confirm the prefilled identity and declared details.')}</div><hr class="divider">${field('reworkReason','Reason for information / identity rework','text','At least 10 characters; records a simulated Operations handoff.')}<div class="row" style="margin-top:15px">${btn('Request information rework','rework-information')}${btn('Request identity rework','rework-identity')}</div>`;
 case 'screening':return `<h2>${needsReview(s)?'A closer look is needed.':'Let’s check the application.'}</h2>${check('pep','PEP declaration (demo; requires bank review)')}${task('Sample screening',s.screeningAt?'Cleared ✓':needsReview(s)?'Pending bank review':'Not run',!!s.screeningAt)}${task('Review outcome',s.reviewOutcome||'Not recorded',s.reviewOutcome==='cleared')}${needsReview(s)&&!s.screeningAt?notice('This application cannot auto-pass. Use a labelled bank-review outcome below.','warning'):''}<div class="row" style="margin-top:18px">${needsReview(s)?btn('Demo bank: clear review','review-clear')+btn('Demo bank: request information','review-rework')+btn('Demo bank: reject','review-reject'):btn('Run sample screening','screen',true)}</div>`;
 case 'linked':return `<h2>Choose an eligible funding account.</h2><div class="fields full">${select('linkedAccount','Funding account',[
 ['DEMO-CASA-001','DEMO-CASA-001 · Alex Demo · Active · VND'],['DEMO-FROZEN','DEMO-FROZEN · Alex Demo · Frozen · VND'],
 ['DEMO-OTHER','DEMO-OTHER · Other customer · Active · VND'],['DEMO-USD','DEMO-USD · Alex Demo · Active · USD']])}</div>${notice('This Card-only application links an existing sample account. It never creates a new CASA account.')}`;
 case 'financial':return `<h2>Your financial picture.</h2>${notice('Illustrative demo only: minimum monthly income 10m VND; requested limit 5m–3× income. This is not a lending offer or real credit decision.','warning')}<div class="fields">${field('income','Monthly income (VND)','number')}${field('commitments','Monthly commitments (VND)','number')}${field('creditLimit','Requested credit limit (VND)','number')}${select('incomeEvidence','Income evidence (sample)',['Available','Missing'])}</div>`;
 case 'configuration':return `<h2>${esc(PRODUCTS[s.product])}, your way.</h2><div class="fields">${s.product==='CASA'?select('accountType','CASA product',['Everyday Current','Flexible Savings']):''}${select('currency','Currency',['VND','USD'])}${select('card',s.product==='CASA'?'Optional debit card':'Card format',s.product==='CASA'?['Virtual','Physical','None']:['Virtual','Physical'])}${d.card!=='None'?field('printedName','Name on card','text','Demo: uppercase Latin letters, maximum 26 characters.'):''}${d.card==='Physical'?select('delivery','Delivery destination',['Registered address','Different address']):''}${d.card==='Physical'&&d.delivery==='Different address'?field('deliveryStreet','Delivery street')+field('deliveryCity','Delivery city'):''}</div>${task('Product boundary',s.product==='CASA'?'Creates a new CASA':s.product==='DEBIT'?'Links existing CASA':'Creates a credit-card request')}`;
 case 'digital':return `<h2>Choose how to stay in control.</h2><div class="fields">${field('username','Demo username','text','6–20 characters. “alex.taken” simulates a conflict.')}</div>${check('mobile','Enable mobile banking (demo)')}${check('internet','Enable internet banking (demo)')}${notice('No real password or device enrollment is collected. Notification preferences do not grant marketing consent.')}`;
 case 'consent':return `<h2>Your product. Your informed choice.</h2><div class="terms" tabindex="0"><strong>${esc(PRODUCTS[s.product])} sample terms · ${POLICY.consentVersion}</strong><p>These illustrative notices do not form a legal contract or open a bank relationship.</p><p>Selected: ${esc(s.product==='CASA'?d.accountType:PRODUCTS[s.product])}. Card: ${esc(d.card)}. Currency: ${esc(d.currency)}.</p><p>A real implementation must display approved, current disclosures before recording actual consent.</p></div>${check('agreement','I acknowledge the current sample product terms (demo only).')}${check('privacy','I acknowledge the separate sample data/privacy notice.')}${s.product==='CREDIT'?check('creditConsent','I acknowledge the demo credit-assessment notice.'):''}${check('marketing','Optional: receive product offers (simulated).')}<div class="fields">${field('signature','Fictional legal name declaration','text','Type '+d.name+'. No real signature is collected.')}</div>`;
 case 'authentication':return `<h2>Confirm this application.</h2>${notice('This OTP is for submission, separate from contact verification and resume. Editing details invalidates it.')} ${otpBox('submission','Submission authentication')}${task('Application confirmation',isSubmissionAuthenticated(s)?'Authenticated ✓':'Not authenticated',isSubmissionAuthenticated(s))}`;
 case 'review':return `<h2>Review before you submit.</h2>${summary()}${notice('Submission rechecks every applicable stage, evidence freshness, product eligibility and current consent.')}<details class="activity"><summary>View demo activity</summary>${activities()}</details>`;
 case 'provisioning':return `<h2>Approved, ready for provisioning.</h2>${summary()}${notice(s.provisionAttempts?'The previous simulated request timed out. Approval is retained; retry uses the same application reference.':'Provisioning revalidates the approved payload. It is idempotent within this saved demo.',s.provisionAttempts?'warning':'')} ${task('Request identity',s.ref+'-'+s.product)}`;
 case 'complete':return `<div class="complete" aria-hidden="true">✓</div><h2>${s.product==='CASA'?'Your account is ready.':'Your card is ready.'}</h2><div class="money-card"><div class="micro">${esc(PRODUCTS[s.product])} · FICTIONAL</div><div class="balance">${s.product==='CREDIT'?Number(d.creditLimit).toLocaleString('en-US'):'0'}<span style="font-size:14px"> VND</span></div><div class="details"><span>${esc(s.result?.id)}</span><span>ACTIVE · DEMO</span></div></div>${task('CASA account',s.result?.account||'No CASA created')}${task('Card',s.result?.card?'Created (demo)':'Not requested')}${task('Welcome notification',s.notification,s.notification==='delivered')}${s.notification==='failed'?btn('Retry notification only','notify'):''}<details class="activity"><summary>View demo activity</summary>${activities()}</details>${notice('No real product, account, card, message or transaction was created.')} ${btn('Start a new demo','reset')}`;
 }}
function taxFields(other){const tin=other?'otherTin':'tin',ex=other?'otherExempt':'tinExempt',reason=other?'otherReason':'tinReason';return `${check(ex,'Demo TIN exemption'+(other?' for second country':''))}<div class="fields">${s.data[ex]?select(reason,'Documented exemption reason',[['','Select a reason'],'Not issued','Not legally required']):field(tin,other?'Second jurisdiction TIN':'Tax identification number','text','Fictional digits only.')}</div>`;}
function summary(){return `<table class="summary"><tbody>${[['Application',s.ref],['Product',PRODUCTS[s.product]],['Customer',s.data.name],['CASA',s.product==='DEBIT'?s.data.linkedAccount:s.product==='CASA'?s.data.accountType:'No CASA requested'],['Card',s.data.card],['Terms',s.consent?.version||'Not acknowledged'],['Contact','Mobile + email verified']].map(([a,b])=>`<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`;}
function activities(){return `<div class="trail">${s.events.slice().reverse().map(e=>`<div class="event">${esc(e.message)}<small>${new Date(e.at).toLocaleString()}</small></div>`).join('')}</div>`;}
function go(key){errors={};otpInput='';s.step=key;persist();render();$('title').focus();window.scrollTo({top:0,behavior:'smooth'});}
function action(action){
 capture();errors={};
 if(action==='continue'){
  if(s.paused)return toast('Authenticate to resume first.');const r=completeStep(s,now());if(r.errors)return showErrors(r.errors);if(r.error)return toast(r.error);persist();go(s.step);return;
 }
 if(action==='back'){const f=flow(s),i=f.indexOf(s.step);if(i>0&&!s.terminal){invalidateFrom(s,f[i-1],now());go(f[i-1]);}return;}
 if(action.startsWith('send-')){otpInput='';const purpose=action.slice(5);const r=issueOtp(s,purpose,now());if(r.error)return showErrors({otp:r.error});persist();render();toast('Mock OTP delivered to the demo inbox.');return;}
 if(action.startsWith('verify-')){const r=verifyOtp(s,otpInput,action.slice(7),now());persist();if(r.error)return showErrors({otp:r.error});otpInput='';render();toast('Mock OTP verified.');return;}
 switch(action){
 case 'identity':{
  const e=validate(s,'identity',now());delete e.identity;
  if(s.identityAttempts>=3&&!s.identityAt)return showErrors({identity:'Capture retry limit reached. Reset the demo or use assisted support.'});
  if(s.scenario==='identity'&&s.identityAttempts===0)e.quality='Demo first capture is unclear. Retry the sample verification.';
  if(Object.keys(e).length){s.identityAttempts++;persist();return showErrors(e);}
  s.identityAt=now();record(s,'Sample eKYC verified',now());persist();render();toast('Sample identity and liveness passed.');break;}
 case 'screen':if(needsReview(s))return showErrors({screening:'Bank review is required.'});s.screeningAt=now();record(s,'Sample screening cleared',now());persist();render();break;
 case 'review-clear':s.reviewOutcome='cleared';s.screeningAt=now();record(s,'Independent bank-review outcome simulated: cleared',now());persist();render();break;
 case 'review-rework':s.infoLocked=false;invalidateFrom(s,'information',now());s.pendingActionAt=now();record(s,'Pending customer action: sample information requested',now());go('information');break;
 case 'review-reject':s.reviewOutcome='rejected';s.terminal='REJECTED';record(s,'Demo bank-review outcome: rejected',now());persist();render();break;
 case 'rework-information':case 'rework-identity':{
  if(s.data.reworkReason.trim().length<10)return showErrors({reworkReason:'Provide a rework reason of at least 10 characters.'});
  const target=action==='rework-identity'?'identity':'information';s.infoLocked=false;invalidateFrom(s,target,now());record(s,'Simulated Operations rework authorized: '+s.data.reworkReason,now());go(target);break;}
 case 'provision':{const r=provision(s,now());persist();if(r.errors)return showErrors(r.errors);if(r.error)return showErrors({provisioning:r.error});go(s.step);break;}
 case 'notify':s.notification='delivered';record(s,'Welcome notification retried; product unchanged',now());persist();render();break;
 case 'reset':localStorage.removeItem(KEY);if($('pause').open)$('pause').close();s=newState();restored=false;errors={};otpInput='';virtualOffset=0;persist();render();window.scrollTo({top:0});break;
 case 'expire-otp':if(s.otp)s.otp.expiresAt=now()-1;persist();render();toast('Mock OTP expired for testing.');break;
 case 'advance-30':virtualOffset+=30000;render();break;
 case 'advance-60':virtualOffset+=60000;render();break;
 case 'close-withdraw':$('withdraw-dialog').close();break;
 case 'withdraw-confirm':s.terminal='WITHDRAWN';record(s,'Customer withdrew demo application',now());persist();$('withdraw-dialog').close();render();break;
 }
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el){e.preventDefault();action(el.dataset.action);return;}const nav=e.target.closest('[data-step]');if(nav&&!nav.disabled){capture();const k=nav.dataset.step;if(k!==s.step&&s.done.includes(k)){invalidateFrom(s,k,now());go(k);}}});
document.addEventListener('change',e=>{if(e.target.name!=='product')return;const product=e.target.value;if(!PRODUCTS[product])return;s.product=product;
 invalidateFrom(s,'product',now());s.infoLocked=false;record(s,'Product route selected: '+product,now());errors={};persist();render();});
$('scenario').onchange=e=>{s.scenario=e.target.value;persist();render();};
$('reset').onclick=()=>action('reset');$('withdraw').onclick=()=>$('withdraw-dialog').showModal();
$('save').onclick=()=>{capture();s.paused=true;record(s,'Demo application saved and session paused',now());persist();openResume();};
function openResume(){if(!restored&&!s.paused)return;resumeLastActivity=s.updatedAt;s.paused=true;s.otp=null;s.authFingerprint='';otpInput='';persist();$('pause').showModal();renderResume();}
function renderResume(message=''){$('resume-body').innerHTML=`<h2>Resume your saved application.</h2><p class="muted">Progress and fictional details are stored locally. A separate mock OTP is required to resume.</p>${notice(esc(s.ref)+' · '+esc(PRODUCTS[s.product]))}<p class="field-hint">Demo-only SMS inbox appears below after sending.</p><div class="row">${btn('Send resume OTP','unused')}${btn('Reset saved demo','reset')}</div><div id="resume-challenge"></div><p id="resume-error" class="field-error" role="alert">${esc(message)}</p>`;
 $('resume-body').querySelector('button').onclick=()=>{const r=issueOtp(s,'resume',now());persist();if(r.error)return renderResume(r.error);drawResumeChallenge();};
}
function drawResumeChallenge(){const o=s.otp;$('resume-challenge').innerHTML=`<div class="notice"><div class="micro">MOCK SMS · RESUME</div><strong class="mock-code">${esc(o.code)}</strong><p>Expires in 120s; old session OTPs are invalid.</p></div><label class="field">Resume OTP<input id="resume-code" inputmode="numeric" maxlength="6"></label><button id="resume-verify" class="primary" style="margin-top:15px">Verify & resume</button>`;$('resume-verify').onclick=()=>{const r=verifyOtp(s,$('resume-code').value,'resume',now());persist();if(r.error){$('resume-error').textContent=r.error;return;}s.updatedAt=resumeLastActivity;resumeNote=revalidateOnResume(s,now());s.paused=false;restored=false;record(s,'Application resumed with fresh mock authentication',now());persist();$('pause').close();render();toast(resumeNote);};}
function updateClock(){const el=$('otp-clock'),o=s.otp;if(!el||!o)return;const lock=Math.max(0,Math.ceil((o.lockedUntil-now())/1000)),ttl=Math.max(0,Math.ceil((o.expiresAt-now())/1000)),cool=Math.max(0,Math.ceil((o.resendAt-now())/1000));el.textContent=lock?`Locked: ${lock}s`:`Expires: ${ttl}s · Resend: ${cool}s · Attempts: ${o.attempts}/${POLICY.otpAttempts}`;}
$('pause').addEventListener('cancel',e=>e.preventDefault());
setInterval(updateClock,1000);render();if(restored||s.paused)openResume();
