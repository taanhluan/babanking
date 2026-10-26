// Prototype policy and state only. No real bank, identity, credit or auth service.
export const POLICY = Object.freeze({ otpTtl:120000, cooldown:30000, otpAttempts:5,
  lockDuration:60000, maxSends:3, identityDays:30, screeningDays:14,
  inactivityDays:30, pendingActionDays:14, consentVersion:'DEMO-2', minAge:18, creditMinAge:21,
  creditMinIncome:10000000, creditIncomeMultiple:3 });
export const PRODUCTS={CASA:'CASA account',DEBIT:'Debit Card',CREDIT:'Credit Card'};
export const SAMPLE={name:'Alex Demo',dob:'1994-06-15',phone:'0900000000',email:'alex@example.test',
  country:'Vietnam',nationality:'Vietnam',residency:'Resident',street:'12 Example Avenue',city:'Demo District',
  employment:'Employed',employer:'Example Company',funds:'Salary',occupation:'Standard',taxCountry:'Vietnam',
  tin:'1234567890',tinExempt:false,tinReason:'',multiTax:false,otherTaxCountry:'United States',otherTin:'123456789',
  otherExempt:false,otherReason:'',usPerson:false,confirmed:false,eligible:false,requirements:false,channel:'Web',
  documentType:'National ID',documentNo:'DEMO-ID-001',documentName:'Alex Demo',documentDob:'1994-06-15',
  documentExpiry:'2030-12-31',front:true,back:true,selfie:true,quality:'Clear',liveness:'Pass',
  pep:false,sourceReview:false,accountType:'Everyday Current',currency:'VND',card:'Virtual',
  delivery:'Registered address',deliveryStreet:'',deliveryCity:'',printedName:'ALEX DEMO',
  linkedAccount:'DEMO-CASA-001',username:'alex.demo',mobile:true,internet:true,notifyEmail:true,
  income:'20000000',commitments:'2000000',creditLimit:'30000000',incomeEvidence:'Available',
  agreement:false,privacy:false,creditConsent:false,marketing:false,signature:'',reworkReason:''};
export const DAY=86400000;
export function newState(now=Date.now()) {return {version:2,ref:'DEMO-'+Math.random().toString(36).slice(2,8).toUpperCase(),
  product:'',step:'product',done:[],data:{...SAMPLE},scenario:'standard',identityAt:0,screeningAt:0,
  verifiedPhone:'',verifiedEmail:'',identityAttempts:0,reviewOutcome:'',consent:null,authFingerprint:'',
  otp:null,otpSends:{},events:[],createdAt:now,updatedAt:now,paused:false,terminal:'',approved:false,
  result:null,provisionAttempts:0,notification:'pending',infoLocked:false,pendingActionAt:0};}
export function flow(s){if(!PRODUCTS[s.product])return ['product'];return ['product','contact','eligibility','identity','information','screening',
  ...(s.product==='DEBIT'?['linked']:[]),...(s.product==='CREDIT'?['financial']:[]),'configuration',
  ...(s.product==='CASA'?['digital']:[]),'consent','authentication','review','provisioning','complete'];}
export function record(s,message,now=Date.now()){s.events.push({message,at:now});s.events=s.events.slice(-80);s.updatedAt=now;}
export function fingerprint(s){return JSON.stringify([s.product,s.data,s.verifiedPhone,s.verifiedEmail,s.identityAt,s.screeningAt,s.consent]);}
export function isSubmissionAuthenticated(s){
 const o=s.otp,current=fingerprint(s);
 return !s.paused&&!!s.authFingerprint&&s.authFingerprint===current&&o?.purpose==='submission'
  &&o.used===true&&o.target===s.data.phone&&o.binding===current;
}
export function ageOn(dob,now=Date.now()){if(!/^\d{4}-\d{2}-\d{2}$/.test(dob))return NaN;const d=new Date(dob+'T00:00:00Z'),t=new Date(now);
  if(Number.isNaN(+d)||d.toISOString().slice(0,10)!==dob||d>t)return NaN;
  return t.getUTCFullYear()-d.getUTCFullYear()-((t.getUTCMonth()<d.getUTCMonth()||t.getUTCMonth()===d.getUTCMonth()&&t.getUTCDate()<d.getUTCDate())?1:0);}
const norm=x=>String(x??'').trim().replace(/\s+/g,' ').toLowerCase();
export function validPhone(phone,country){return country==='Vietnam'?/^(0[35789]\d{8}|\+84[35789]\d{8})$/.test(phone):/^\+[1-9]\d{7,14}$/.test(phone);}
export function validate(s,step,now=Date.now()) {
 const d=s.data,e={};const add=(key,msg)=>{e[key]=msg;};const min=s.product==='CREDIT'?POLICY.creditMinAge:POLICY.minAge;
 if(step==='product'){if(!PRODUCTS[s.product])add('product','Choose CASA, Debit Card or Credit Card to build your journey.');}
 if(step==='contact'){
  if(!validPhone(d.phone,d.country))add('phone',d.country==='Vietnam'?'Use a valid demo Vietnam mobile (e.g. 0900000000).':'Use international format, e.g. +12025550100.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||d.email.length>254)add('email','Enter a valid sample email address.');
  if(s.scenario==='duplicate')add('phone','Demo duplicate: an active application already uses this contact. Reset to a standard scenario to continue.');
  if(s.verifiedPhone!==d.phone)add('mobileOtp','Verify the current mobile number using mock OTP.');
  if(s.verifiedEmail!==d.email)add('emailOtp','Verify the current email using mock OTP.');
 }
 if(step==='eligibility'){
  const age=ageOn(d.dob,now);if(!Number.isFinite(age))add('dob','Enter a valid date of birth, not in the future.');
  else if(age<min||age>120)add('dob',`This demo product requires age ${min}–120. Product thresholds are illustrative.`);
  if(d.residency!=='Resident')add('residency','Non-resident onboarding needs assisted review in this demo. Select Resident for the standard digital path.');
  if(!d.eligible)add('eligible','Confirm the demo eligibility requirements.');if(!d.requirements)add('requirements','Acknowledge the sample product requirements.');
 }
 if(step==='identity'){
  if(!/^DEMO-(ID|PP)-[A-Z0-9-]{3,20}$/.test(d.documentNo))add('documentNo','Use a fictional document reference such as DEMO-ID-001.');
  if(!d.front)add('front','The front sample document is required.');if(d.documentType==='National ID'&&!d.back)add('back','The back of the sample National ID is required.');
  if(!d.selfie)add('selfie','Provide the sample selfie.');if(d.quality!=='Clear')add('quality','The sample document must be clear and readable.');
  if(d.liveness!=='Pass')add('liveness','Sample liveness must pass. Retry or use assisted support.');
  const expiry=new Date(d.documentExpiry+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.documentExpiry)||!Number.isFinite(+expiry)||expiry.toISOString().slice(0,10)!==d.documentExpiry||d.documentExpiry<new Date(now).toISOString().slice(0,10))add('documentExpiry','Use a valid, unexpired sample document.');
  if(!Number.isFinite(ageOn(d.documentDob,now)))add('documentDob','The document date of birth must be valid.');
  if(!/^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(d.documentName.trim()))add('documentName','Provide a sample document name of 2–80 letters.');
  if(s.identityAttempts>=3&&!s.identityAt)add('identity','Three identity attempts reached. Reset or seek simulated assisted support.');
  if(!s.identityAt||now-s.identityAt>POLICY.identityDays*DAY)add('identity','Run a successful sample eKYC check.');
 }
 if(step==='information'){
  if(!/^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(d.name.trim()))add('name','Enter 2–80 letters; numbers are not accepted in this demo name.');
  if(norm(d.name)!==norm(d.documentName))add('name','Legal name must match the verified sample document. Resolve the discrepancy before continuing.');
  if(d.dob!==d.documentDob)add('dob','Date of birth differs from eKYC. Request rework to the identity stage.');
  if(d.street.trim().length<5||/p\.?\s*o\.?\s*box|post office box/i.test(d.street))add('street','Provide a physical street address, not a P.O. Box.');
  if(d.city.trim().length<2)add('city','City / district is required.');
  if(!d.country)add('country','Country of residence is required.');
  if(d.employment==='Employed'&&d.employer.trim().length<2)add('employer','Employer name is required when employed.');
  if(!d.funds)add('funds','Declare the primary source of funds.');
  taxCheck('tin','tinExempt','tinReason',d.taxCountry);
  if(d.multiTax){if(d.otherTaxCountry===d.taxCountry)add('otherTaxCountry','The second tax jurisdiction must differ.');taxCheck('otherTin','otherExempt','otherReason',d.otherTaxCountry);}
  if(!d.confirmed)add('confirmed','Explicitly confirm the prefilled and declared information.');
  if(s.verifiedEmail!==d.email||s.verifiedPhone!==d.phone)add('contact','Current contact details must be OTP verified.');
 }
 function taxCheck(tin,exempt,reason,country){if(d[exempt]){if(!['Not issued','Not legally required'].includes(d[reason]))add(reason,'Select a documented demo exemption reason.');}
  else if(!(country==='Vietnam'?/^\d{10}(\d{3})?$/:/^\d{9}$/).test(d[tin]))add(tin,country==='Vietnam'?'Demo Vietnam TIN: 10 or 13 digits, or document an exemption.':'Demo US TIN: 9 digits, or document an exemption.');}
 if(step==='screening'){
  if(!s.identityAt||now-s.identityAt>POLICY.identityDays*DAY)add('identity','eKYC is missing or stale. Return to identity verification.');
  if(s.reviewOutcome==='rejected')add('screening','Demo bank review rejected the application.');
  if(!s.screeningAt||now-s.screeningAt>POLICY.screeningDays*DAY)add('screening',needsReview(s)?'Manual review is required. Simulate an independent review outcome.':'Run sample screening before continuing.');
 }
 if(step==='linked'&&d.linkedAccount!=='DEMO-CASA-001')add('linkedAccount','Debit Card requires your active VND CASA account. Closed, frozen and other-owner samples cannot be linked.');
 if(step==='financial'){
  const income=Number(d.income),commitments=Number(d.commitments),limit=Number(d.creditLimit);
  if(!Number.isFinite(income)||income<POLICY.creditMinIncome)add('income','Demo minimum monthly income: 10,000,000 VND.');
  if(String(d.commitments).trim()===''||!Number.isFinite(commitments)||commitments<0||commitments>=income)add('commitments','Monthly commitments are required and must be non-negative and lower than income.');
  if(!Number.isFinite(limit)||limit<5000000||limit>income*POLICY.creditIncomeMultiple)add('creditLimit','Demo limit: at least 5,000,000 VND and no more than 3× monthly income.');
  if(d.incomeEvidence!=='Available')add('incomeEvidence','Sample income evidence is required for this credit-card demo.');
 }
 if(step==='configuration'){
  if(s.scenario==='unavailable')add('product','Selected product is unavailable in this scenario. Choose the standard scenario in a new demo.');
  if(s.product==='CASA'&&!['Everyday Current','Flexible Savings'].includes(d.accountType))add('accountType','Select an available demo CASA product.');
  if(d.currency!=='VND')add('currency','Only VND is supported by this demo product catalogue.');
  if(s.product!=='CASA'&&d.card==='None')add('card','A standalone Card application requires a card format.');
  if(d.card!=='None'&&!/^[A-Z][A-Z .'-]{1,25}$/.test(d.printedName))add('printedName','Card name: 2–26 uppercase Latin letters and permitted separators.');
  if(d.card==='Physical'&&d.delivery==='Different address'){
   if(d.deliveryStreet.trim().length<5||/p\.?\s*o\.?\s*box/i.test(d.deliveryStreet))add('deliveryStreet','A complete physical delivery street is required.');
   if(d.deliveryCity.trim().length<2)add('deliveryCity','Delivery city is required.');
  }
 }
 if(step==='digital'){
  if(!/^[a-zA-Z][a-zA-Z0-9._]{5,19}$/.test(d.username))add('username','Username: 6–20 characters, start with a letter; letters, digits, dot and underscore only.');
  if(['admin','support','alex.taken'].includes(d.username.toLowerCase()))add('username','This sample username is reserved or already used.');
  if(!d.mobile&&!d.internet)add('channels','Select at least one digital banking channel.');
 }
 if(step==='consent'){
  if(!d.agreement)add('agreement','Acknowledge the current sample product terms.');if(!d.privacy)add('privacy','Acknowledge the separate sample privacy notice.');
  if(s.product==='CREDIT'&&!d.creditConsent)add('creditConsent','Acknowledge the separate demo credit-assessment notice.');
  if(norm(d.signature)!==norm(d.name))add('signature','Type the fictional legal name exactly as the sample declaration.');
 }
 if(step==='authentication'&&!isSubmissionAuthenticated(s))add('otp','Verify a fresh submission OTP for the current application details.');
 if(step==='review'){
  for(const key of flow(s).slice(1,flow(s).indexOf('review'))){const x=validate(s,key,now);for(const [k,v]of Object.entries(x))e[`${key}.${k}`]=v;}
  if(s.consent?.version!==POLICY.consentVersion)add('consent','The sample terms changed. Reconfirm the current version.');
 }
 return e;
}
export function needsReview(s){const d=s.data;return s.scenario==='review'||d.pep||d.occupation==='High-risk (demo)'||d.usPerson||d.multiTax||d.taxCountry!==d.country||d.nationality!==d.country||d.employment==='Student'&&d.funds==='Business income';}
export function issueOtp(s,purpose,now=Date.now(),random=Math.random){
 if(!['mobile','email','submission','resume'].includes(purpose))return {error:'Unsupported mock OTP purpose.'};
 if(s.terminal||s.result)return {error:'This application is closed; no new OTP can be issued.'};
 const target=purpose==='email'?s.data.email:s.data.phone;const key=purpose+':'+target;const old=s.otp;
 if(purpose==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)||purpose!=='email'&&!validPhone(target,s.data.country))return {error:'Provide a valid demo contact before sending OTP.'};
 if(old&&now<old.lockedUntil)return {error:'Too many attempts. Wait for the demo lock to end.'};
 if(old?.key===key&&now<old.resendAt)return {error:'Resend cooldown is active. Wait or use the labelled demo clock control.'};
 if((s.otpSends[key]||0)>=POLICY.maxSends)return {error:'Three sends reached for this purpose/contact. Reset the demo to start again.'};
 let code=String(Math.floor(100000+random()*900000));if(code===old?.code)code=String(100000+(Number(code)-100000+1)%900000);
 s.otp={purpose,target,key,code,expiresAt:now+POLICY.otpTtl,resendAt:now+POLICY.cooldown,attempts:0,lockedUntil:0,used:false,binding:purpose==='submission'?fingerprint(s):''};
 s.otpSends[key]=(s.otpSends[key]||0)+1;record(s,`Mock ${purpose} OTP issued (${s.otpSends[key]}/${POLICY.maxSends})`,now);return {ok:true};
}
export function verifyOtp(s,code,purpose,now=Date.now()){
 const o=s.otp;if(!o||o.purpose!==purpose)return {error:'Request an OTP for this verification first.'};
 if(now<o.lockedUntil)return {error:'OTP is locked after five failed attempts.'};
 if(o.used)return {error:'This OTP was already used. Request a new challenge.'};
 if(now>=o.expiresAt)return {error:'OTP expired. Request a new code.'};
 if(o.target!==(purpose==='email'?s.data.email:s.data.phone))return {error:'Contact changed. Request an OTP for the current contact.'};
 if(purpose==='submission'&&o.binding!==fingerprint(s))return {error:'Application changed. Request a fresh submission OTP.'};
 if(!/^\d{6}$/.test(code)||code!==o.code){o.attempts++;if(o.attempts>=POLICY.otpAttempts)o.lockedUntil=now+POLICY.lockDuration;return {error:o.lockedUntil?'Five incorrect attempts. OTP locked for 60 seconds.':`Incorrect six-digit code. ${POLICY.otpAttempts-o.attempts} attempts remaining.`};}
 o.used=true;if(purpose==='mobile')s.verifiedPhone=s.data.phone;if(purpose==='email')s.verifiedEmail=s.data.email;
 if(purpose==='submission')s.authFingerprint=fingerprint(s);record(s,`Mock ${purpose} OTP verified`,now);return {ok:true};
}
export function invalidateFrom(s,key,now=Date.now()){
 const f=flow(s),i=f.indexOf(key);s.done=s.done.filter(k=>f.indexOf(k)<i);s.authFingerprint='';s.otp=null;s.approved=false;
 if(i<=f.indexOf('identity'))s.identityAt=0;if(i<=f.indexOf('screening')){s.screeningAt=0;s.reviewOutcome='';}
 if(i<=f.indexOf('consent')){s.consent=null;s.data.agreement=false;s.data.privacy=false;s.data.creditConsent=false;s.data.signature='';}
 record(s,`Rework: ${key}; downstream verification invalidated`,now);
}
export function completeStep(s,now=Date.now()){
 if(s.terminal||s.result)return {error:'This application is read-only.'};
 if(s.paused)return {error:'Authenticate to resume before continuing.'};
 const prior=flow(s).slice(0,flow(s).indexOf(s.step));
 if(prior.some(key=>!s.done.includes(key)))return {error:'Complete the preceding product-specific stages first.'};
 const errors=validate(s,s.step,now);if(Object.keys(errors).length)return {errors};
 if(s.step==='information'){s.infoLocked=true;s.pendingActionAt=0;}
 if(s.step==='consent')s.consent={version:POLICY.consentVersion,at:now,product:s.product};
 if(s.step==='review')s.approved=true;
 if(!s.done.includes(s.step))s.done.push(s.step);record(s,`${s.step} completed`,now);const f=flow(s);s.step=f[Math.min(f.indexOf(s.step)+1,f.length-1)];return {ok:true};
}
export function provision(s,now=Date.now()){
 if(s.result)return {ok:true,result:s.result,reused:true};
 if(s.paused)return {error:'Authenticate to resume before provisioning.'};
 if(s.terminal||!s.approved||s.step!=='provisioning'||!s.done.includes('review'))return {error:'A current approved application is required.'};
 const errors=validate(s,'review',now);if(Object.keys(errors).length){s.approved=false;return {errors};}
 s.provisionAttempts++;if(s.scenario==='provisioning'&&s.provisionAttempts===1){record(s,'Provisioning timeout; approved request retained',now);return {error:'Simulated timeout. Approval is retained. Retry the same request.'};}
 s.result={id:`${s.ref}-${s.product}`,kind:s.product,account:s.product==='CASA'?`${s.ref}-CASA`:s.product==='DEBIT'?s.data.linkedAccount:null,
  card:s.product==='CASA'&&s.data.card==='None'?null:`${s.ref}-CARD`,at:now};s.notification=s.scenario==='notification'?'failed':'delivered';s.terminal='COMPLETED';s.step='complete';record(s,'Provisioning completed once; application closed',now);return {ok:true,result:s.result};
}
export function revalidateOnResume(s,now=Date.now()){
 s.otp=null;s.authFingerprint='';
 if(s.terminal)return s.terminal;
 if(s.pendingActionAt&&now-s.pendingActionAt>POLICY.pendingActionDays*DAY){s.terminal='EXPIRED';return 'EXPIRED';}
 if(now-s.updatedAt>POLICY.inactivityDays*DAY){s.terminal='EXPIRED';return 'EXPIRED';}
 if(s.identityAt&&(now-s.identityAt>POLICY.identityDays*DAY||s.data.documentExpiry<new Date(now).toISOString().slice(0,10))){invalidateFrom(s,'identity',now);s.step='identity';return 'Identity evidence is stale or expired. Verify again.';}
 if(s.screeningAt&&now-s.screeningAt>POLICY.screeningDays*DAY){invalidateFrom(s,'screening',now);s.step='screening';return 'Screening is stale. Run checks again.';}
 if(s.consent&&s.consent.version!==POLICY.consentVersion){invalidateFrom(s,'consent',now);s.step='consent';return 'Terms version changed. Reconfirm consent.';}
 if(['review','provisioning'].includes(s.step)){s.approved=false;s.done=s.done.filter(x=>!['authentication','review'].includes(x));s.step='authentication';return 'Fresh submission authentication is required after resume.';}
 return 'Saved progress restored. Previous session OTPs were invalidated.';
}
