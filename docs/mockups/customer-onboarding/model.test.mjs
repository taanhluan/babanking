import test from 'node:test';
import assert from 'node:assert/strict';
import {POLICY,DAY,newState,flow,ageOn,validPhone,validate,needsReview,issueOtp,verifyOtp,
 completeStep,provision,invalidateFrom,revalidateOnResume,fingerprint,isSubmissionAuthenticated,prepareDemoAt,DEEP_LINK_STEPS} from './model.mjs';
const T=Date.UTC(2026,9,26,3);
function sample(product='CASA'){const s=newState(T);s.product=product;Object.assign(s.data,{eligible:true,requirements:true,confirmed:true,agreement:true,privacy:true,creditConsent:true,signature:'Alex Demo'});return s;}
function ready(product='CASA'){
 const s=sample(product);s.verifiedPhone=s.data.phone;s.verifiedEmail=s.data.email;s.identityAt=T;s.screeningAt=T;
 for(const step of flow(s).slice(0,-2)){s.step=step;if(step==='authentication'){
   assert.equal(issueOtp(s,'submission',T).ok,true);assert.equal(verifyOtp(s,s.otp.code,'submission',T).ok,true);
  }
  const r=completeStep(s,T);assert.equal(r.ok,true,JSON.stringify(r));}
 assert.equal(s.step,'provisioning');return s;
}
test('product selection builds three distinct routes and no default CASA route',()=>{
 assert.deepEqual(flow(newState(T)),['product']);
 assert.ok(flow(sample('CASA')).includes('digital'));assert.ok(!flow(sample('CASA')).includes('financial'));
 assert.ok(flow(sample('DEBIT')).includes('linked'));assert.ok(!flow(sample('DEBIT')).includes('digital'));
 assert.ok(flow(sample('CREDIT')).includes('financial'));assert.ok(!flow(sample('CREDIT')).includes('linked'));
});
test('age uses the birthday boundary and rejects future or impossible dates',()=>{
 assert.equal(ageOn('2008-10-26',T),18);assert.equal(ageOn('2008-10-27',T),17);
 assert.ok(Number.isNaN(ageOn('2026-02-30',T)));assert.ok(Number.isNaN(ageOn('2027-01-01',T)));
 const s=sample('CREDIT');s.data.dob='2006-10-26';assert.ok(validate(s,'eligibility',T).dob);
});
test('contact format, duplicate active contact, and separate mobile/email verification',()=>{
 assert.equal(validPhone('0900000000','Vietnam'),true);assert.equal(validPhone('0000000000','Vietnam'),false);
 assert.equal(validPhone('+12025550100','United States'),true);
 const s=sample();assert.ok(validate(s,'contact',T).mobileOtp);assert.ok(validate(s,'contact',T).emailOtp);
 s.verifiedPhone=s.data.phone;s.verifiedEmail=s.data.email;assert.deepEqual(validate(s,'contact',T),{});
 s.scenario='duplicate';assert.ok(validate(s,'contact',T).phone);
});
test('OTP expires, is purpose-bound and can be consumed only once',()=>{
 assert.ok(issueOtp(sample(),'unknown',T).error);
 const s=sample();issueOtp(s,'email',T,()=>.1);const code=s.otp.code;
 assert.match(verifyOtp(s,code,'mobile',T+1).error,/Request/);
 assert.equal(verifyOtp(s,code,'email',T+2).ok,true);
 assert.match(verifyOtp(s,code,'email',T+3).error,/already used/);
 const s2=sample();issueOtp(s2,'mobile',T);assert.match(verifyOtp(s2,s2.otp.code,'mobile',T+POLICY.otpTtl).error,/expired/);
});
test('resend cooldown, invalid old code and maximum send count',()=>{
 const s=sample();issueOtp(s,'mobile',T,()=>.1);const old=s.otp.code;
 assert.match(issueOtp(s,'mobile',T+1).error,/cooldown/);
 assert.equal(issueOtp(s,'mobile',T+30000,()=>.1).ok,true);assert.notEqual(s.otp.code,old);
 assert.match(verifyOtp(s,old,'mobile',T+30001).error,/Incorrect/);
 assert.equal(issueOtp(s,'mobile',T+60000).ok,true);
 assert.match(issueOtp(s,'mobile',T+90000).error,/Three sends/);
});
test('five wrong codes lock verification and resend, even with the right code',()=>{
 const s=sample();issueOtp(s,'mobile',T,()=>.1);const code=s.otp.code;
 for(let i=0;i<5;i++)assert.ok(verifyOtp(s,'000000','mobile',T+10+i).error);
 assert.match(verifyOtp(s,code,'mobile',T+20).error,/locked/);
 assert.match(issueOtp(s,'email',T+20).error,/Too many/);
 assert.equal(issueOtp(s,'mobile',T+60020).ok,true);
});
test('changing contact or application details invalidates issued OTP binding',()=>{
 const s=sample();issueOtp(s,'mobile',T);s.data.phone='0910000000';assert.match(verifyOtp(s,s.otp.code,'mobile',T+1).error,/Contact changed/);
 const s2=sample();issueOtp(s2,'submission',T);s2.data.card='Physical';assert.match(verifyOtp(s2,s2.otp.code,'submission',T+1).error,/Application changed/);
});
test('document front/back, expiry, quality and liveness are independent blockers',()=>{
 const s=sample();s.identityAt=T;assert.deepEqual(validate(s,'identity',T),{});
 Object.assign(s.data,{front:false,back:false,selfie:false,quality:'Blurred',liveness:'Fail',documentExpiry:'2025-01-01'});
 const e=validate(s,'identity',T);for(const k of ['front','back','selfie','quality','liveness','documentExpiry'])assert.ok(e[k]);
 s.data.documentType='Passport';assert.equal(validate(s,'identity',T).back,undefined);
});
test('identity attempts stop at three and stale identity cannot pass',()=>{
 const s=sample();s.identityAttempts=3;assert.ok(validate(s,'identity',T).identity);
 s.identityAt=T-31*DAY;assert.ok(validate(s,'identity',T).identity);
});
test('name and DOB must match verified identity; physical address is mandatory',()=>{
 const s=ready();s.data.name='Other Demo';s.data.dob='1990-01-01';s.data.street='P.O. Box 12';s.data.city='';
 const e=validate(s,'information',T);for(const k of ['name','dob','street','city'])assert.ok(e[k]);
});
test('employment and tax fields become required conditionally',()=>{
 const s=ready();Object.assign(s.data,{employer:'',tin:'',multiTax:true,otherTin:''});
 let e=validate(s,'information',T);for(const k of ['employer','tin','otherTin'])assert.ok(e[k]);
 Object.assign(s.data,{employer:'Demo Co',tinExempt:true,tinReason:'Not issued',otherExempt:true,otherReason:'Not legally required'});
 assert.deepEqual(validate(s,'information',T),{});
 s.data.otherTaxCountry='Vietnam';assert.ok(validate(s,'information',T).otherTaxCountry);
});
test('student/business source, PEP, US person and multiple tax residencies trigger review',()=>{
 for(const d of [{employment:'Student',funds:'Business income'},{pep:true},{usPerson:true},{multiTax:true},{nationality:'United States'}]){
  const s=sample();Object.assign(s.data,d);assert.equal(needsReview(s),true);assert.ok(validate(s,'screening',T).screening);
 }
});
test('Debit Card rejects frozen, other-owner and wrong-currency funding accounts',()=>{
 const s=sample('DEBIT');assert.deepEqual(validate(s,'linked',T),{});
 for(const account of ['DEMO-FROZEN','DEMO-OTHER','DEMO-USD']){s.data.linkedAccount=account;assert.ok(validate(s,'linked',T).linkedAccount);}
});
test('credit demonstration requires evidence, affordable commitments and bounded limit',()=>{
 const s=sample('CREDIT');assert.deepEqual(validate(s,'financial',T),{});
 Object.assign(s.data,{income:'5000000',commitments:'6000000',creditLimit:'99000000',incomeEvidence:'Missing'});
 const e=validate(s,'financial',T);for(const k of ['income','commitments','creditLimit','incomeEvidence'])assert.ok(e[k]);
});
test('physical card delivery validation applies only when relevant; standalone card cannot be omitted',()=>{
 const s=sample('DEBIT');s.data.card='None';assert.ok(validate(s,'configuration',T).card);
 Object.assign(s.data,{card:'Physical',delivery:'Different address',deliveryStreet:'',deliveryCity:''});
 assert.ok(validate(s,'configuration',T).deliveryStreet);assert.ok(validate(s,'configuration',T).deliveryCity);
 s.data.card='Virtual';assert.equal(validate(s,'configuration',T).deliveryStreet,undefined);
});
test('username conflict, channel selection and product availability are checked',()=>{
 const s=sample();Object.assign(s.data,{username:'alex.taken',mobile:false,internet:false});
 assert.ok(validate(s,'digital',T).username);assert.ok(validate(s,'digital',T).channels);
 s.scenario='unavailable';assert.ok(validate(s,'configuration',T).product);
});
test('marketing is optional; privacy, terms, declaration and credit notice are separate',()=>{
 const s=sample('CREDIT');s.data.marketing=false;assert.deepEqual(validate(s,'consent',T),{});
 Object.assign(s.data,{agreement:false,privacy:false,signature:'Someone else',creditConsent:false});
 const e=validate(s,'consent',T);for(const k of ['agreement','privacy','signature','creditConsent'])assert.ok(e[k]);assert.equal(e.marketing,undefined);
});
test('cannot skip preceding stages and downstream authentication invalidates on rework',()=>{
 const s=sample();s.step='configuration';assert.ok(completeStep(s,T).error);
 const r=ready();assert.ok(r.authFingerprint);invalidateFrom(r,'information',T+1);
 assert.equal(r.authFingerprint,'');assert.equal(r.screeningAt,0);assert.equal(r.consent,null);assert.equal(r.approved,false);
});
test('all three complete routes create only their intended products and provisioning is idempotent',()=>{
 for(const product of ['CASA','DEBIT','CREDIT']){
  const s=ready(product);const r=provision(s,T+1);assert.equal(r.ok,true);assert.equal(s.terminal,'COMPLETED');
  if(product==='CASA')assert.match(r.result.account,/-CASA$/);if(product==='DEBIT')assert.equal(r.result.account,'DEMO-CASA-001');
  if(product==='CREDIT')assert.equal(r.result.account,null);assert.equal(provision(s,T+2).result.id,r.result.id);assert.equal(s.provisionAttempts,1);
 }
});
test('provisioning timeout retains approval; retry does not create two results',()=>{
 const s=ready();s.scenario='provisioning';assert.ok(provision(s,T+1).error);assert.equal(s.approved,true);assert.equal(s.result,null);
 assert.equal(provision(s,T+2).ok,true);assert.equal(provision(s,T+3).reused,true);assert.equal(s.provisionAttempts,2);
});
test('changed or stale data fail the final pre-provisioning revalidation',()=>{
 const s=ready();s.data.phone='0910000000';assert.ok(provision(s,T+1).errors);assert.equal(s.result,null);
 const r=ready();assert.ok(provision(r,T+15*DAY).errors);assert.equal(r.result,null);
});
test('resume invalidates session OTP and returns stale identity/screening/consent to rework',()=>{
 const identity=ready();identity.updatedAt=T+30*DAY;assert.match(revalidateOnResume(identity,T+31*DAY),/Identity/);assert.equal(identity.step,'identity');
 const screen=ready();screen.updatedAt=T+14*DAY;assert.match(revalidateOnResume(screen,T+15*DAY),/Screening/);assert.equal(screen.step,'screening');
 const terms=ready();terms.consent.version='OLD';assert.match(revalidateOnResume(terms,T+1),/Terms/);assert.equal(terms.step,'consent');
 const r=ready();issueOtp(r,'submission',T);revalidateOnResume(r,T+1);assert.equal(r.otp,null);assert.equal(r.authFingerprint,'');assert.equal(r.step,'authentication');
});
test('inactivity expires a saved application; withdrawn/rejected cannot provision',()=>{
 const s=sample();assert.equal(revalidateOnResume(s,T+31*DAY),'EXPIRED');assert.ok(issueOtp(s,'resume',T+31*DAY).error);
 for(const terminal of ['WITHDRAWN','REJECTED']){const r=ready();r.terminal=terminal;assert.ok(provision(r,T+1).error);assert.ok(completeStep(r,T+1).error);}
});
test('pending customer action expires after 14 days even with recent general activity',()=>{
 const s=sample();s.pendingActionAt=T;s.updatedAt=T+14*DAY;assert.equal(revalidateOnResume(s,T+15*DAY),'EXPIRED');
});
function atAuthentication(){const s=ready();invalidateFrom(s,'authentication',T+1);s.step='authentication';return s;}
test('submission step cannot advance before OTP issuance or after a wrong/expired code',()=>{
 const s=atAuthentication();assert.ok(completeStep(s,T+2).errors.otp);assert.equal(s.step,'authentication');
 issueOtp(s,'submission',T+2);assert.ok(verifyOtp(s,'000000','submission',T+3).error);
 assert.ok(completeStep(s,T+3).errors.otp);assert.equal(s.step,'authentication');
 assert.ok(verifyOtp(s,s.otp.code,'submission',T+2+POLICY.otpTtl).error);
 assert.ok(completeStep(s,T+2+POLICY.otpTtl).errors.otp);
});
test('contact and resume OTPs cannot satisfy submission authentication',()=>{
 for(const purpose of ['mobile','email','resume']){
  const s=atAuthentication();issueOtp(s,purpose,T+2);assert.equal(verifyOtp(s,s.otp.code,purpose,T+3).ok,true);
  assert.equal(isSubmissionAuthenticated(s),false);assert.ok(completeStep(s,T+4).errors.otp);
 }
});
test('a stored fingerprint without a consumed matching submission challenge does not authenticate',()=>{
 const s=atAuthentication();s.authFingerprint=fingerprint(s);assert.equal(isSubmissionAuthenticated(s),false);
 assert.ok(completeStep(s,T+2).errors.otp);issueOtp(s,'submission',T+2);
 s.authFingerprint=fingerprint(s);assert.equal(isSubmissionAuthenticated(s),false);
 assert.ok(completeStep(s,T+3).errors.otp);
});
test('only verified current submission OTP unlocks review; payload changes block approval and creation',()=>{
 const s=atAuthentication();issueOtp(s,'submission',T+2);verifyOtp(s,s.otp.code,'submission',T+3);
 assert.equal(isSubmissionAuthenticated(s),true);assert.equal(completeStep(s,T+4).ok,true);assert.equal(s.step,'review');
 assert.equal(completeStep(s,T+5).ok,true);s.data.card='Physical';
 assert.equal(isSubmissionAuthenticated(s),false);assert.ok(provision(s,T+6).errors['authentication.otp']);assert.equal(s.result,null);
});
test('paused applications cannot continue or provision without resume authentication',()=>{
 const s=ready();s.paused=true;assert.equal(isSubmissionAuthenticated(s),false);
 assert.match(completeStep(s,T+1).error,/resume/);assert.match(provision(s,T+1).error,/resume/);
});
test('deep links prepare a consistent sample application at every linked step',()=>{
 for(const target of DEEP_LINK_STEPS){const s=prepareDemoAt(target,T),step=target==='card'?'configuration':target;assert.ok(s,target);
  assert.equal(s.step,step,target);assert.equal(s.openedFrom,step);assert.deepEqual(s.done,flow(s).slice(0,flow(s).indexOf(step)),target);assert.equal(s.terminal,'');}
 assert.equal(prepareDemoAt('card',T).product,'DEBIT');assert.equal(prepareDemoAt('financial',T).product,'CREDIT');
 assert.equal(prepareDemoAt('digital',T).product,'CASA');assert.equal(prepareDemoAt('complete',T),null);assert.equal(prepareDemoAt('toString',T),null);
 const prov=prepareDemoAt('provisioning',T);assert.equal(prov.approved,true);assert.equal(provision(prov,T).ok,true);
 assert.ok(validate(prepareDemoAt('identity',T),'identity',T).identity);
});
