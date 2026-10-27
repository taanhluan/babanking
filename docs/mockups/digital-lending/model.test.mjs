import test from 'node:test';
import assert from 'node:assert/strict';
import {POLICY,DAY,newState,flow,applyPersona,applyCustomerType,validate,completeStep,evaluateEligibility,runEligibility,
 approveException,switchProduct,runIdentity,runScreening,complianceOutcome,runBureau,runAppraisal,requirements,uploadDocument,
 activeUpload,runAffordability,affordabilityReview,runEngine,underwriterOutcome,proposal,simulate,allowedAmount,respondOffer,
 issueOtp,verifyOtp,signAgreement,invalidateFrom,revalidateOnResume,outcomes,emi,apr,ageOn,maturityAge,prepareDemoAt,DEEP_LINK_STEPS} from './model.mjs';
const T=Date.UTC(2026,9,27,3);
function start(product='CREDIT',persona='prime'){const s=newState(T);applyPersona(s,persona);s.product=product;
 if(product==='REPEAT'){s.data.customerType='Existing';s.data.cif='DEMO-CIF-001';applyCustomerType(s);}
 Object.assign(s.data,{terms:true,privacy:true,bureauConsent:true,confirmed:true,kfs:true,agreement:true,signature:s.data.name});return s;}
const DOC_FOR={income:'payslips',business:'business',statement:'statement',address:'address',collateral:'vehicle'};
// Drives the application through the real actions until `target` is the current step.
function driveTo(s,target){
 for(let guard=0;guard<30&&s.step!==target&&!s.terminal;guard++){
  switch(s.step){
   case 'registration':s.verifiedPhone=s.data.phone;s.verifiedEmail=s.data.email;break;
   case 'identity':assert.equal(runIdentity(s,T).ok,true);break;
   case 'screening':runScreening(s,T);if(s.screeningOutcome==='referred')complianceOutcome(s,'clear',T);break;
   case 'eligibility':runEligibility(s,T);break;
   case 'bureau':runBureau(s,T);break;
   case 'collateral':runAppraisal(s,T);break;
   case 'documents':for(const r of requirements(s))uploadDocument(s,r.key,DOC_FOR[r.key],T);break;
   case 'affordability':runAffordability(s,T);break;
   case 'decision':runEngine(s,T);if(s.terminal)return s;if(s.decision.outcome==='REFER')underwriterOutcome(s,'approve',T);break;
   case 'offer':assert.equal(respondOffer(s,'ACCEPTED',T).ok,true);break;
  }
  const r=completeStep(s,T);assert.equal(r.ok,true,`${s.step}: ${JSON.stringify(r)}`);
 }
 return s;}
test('product selection builds distinct routes; collateral adds its own stage',()=>{
 assert.deepEqual(flow(newState(T)),['product']);
 assert.ok(!flow(start('CREDIT')).includes('collateral'));assert.ok(flow(start('COLLATERAL')).includes('collateral'));
 const f=flow(start('COLLATERAL'));assert.ok(f.indexOf('bureau')<f.indexOf('collateral')&&f.indexOf('collateral')<f.indexOf('documents'));
 assert.deepEqual(f.slice(-4),['simulation','offer','signing','complete']);
});
test('segmentation gating, customer number, purpose and amount/tenor boundaries',()=>{
 const s=start('REPEAT');assert.deepEqual(validate(s,'product',T),{});
 s.data.customerType='New';applyCustomerType(s);assert.match(validate(s,'product',T).customerType,/first-time/);
 const c=start();c.data.customerType='Existing';c.data.cif='DEMO-CIF-999';assert.match(validate(c,'product',T).cif,/No sample relationship/);
 c.data.cif='DEMO-CIF-001';c.data.purpose='Speculative investment (restricted demo)';assert.ok(validate(c,'product',T).purpose);
 c.data.purpose='Education';c.data.amount='10500000';assert.ok(validate(c,'product',T).amount);
 c.data.amount='9000000';assert.ok(validate(c,'product',T).amount);c.data.amount='500000000';c.data.tenor='61';
 assert.deepEqual(Object.keys(validate(c,'product',T)),['tenor']);
});
test('age at application and at maturity use exact birthdays',()=>{
 assert.equal(ageOn('2008-10-27',T),18);assert.equal(ageOn('2008-10-28',T),17);
 assert.equal(maturityAge('1966-10-27',36,T),63);
 const s=start();s.data.dob=s.data.documentDob='1965-10-27';s.data.tenor='60';
 assert.equal(evaluateEligibility(s,T).outcome,'NOT_ELIGIBLE');s.data.tenor='24';assert.equal(evaluateEligibility(s,T).outcome,'ELIGIBLE');
});
test('identity: new customers need full evidence, existing customers a selfie; three failures stop onboarding',()=>{
 const s=start();s.data.back=false;assert.ok(validate(s,'identity',T).back);
 const e=start('REPEAT');e.data.documentNo='bad';e.data.back=false;delete validate(e,'identity',T).identity;
 assert.deepEqual(Object.keys(validate(e,'identity',T)),['identity']);
 const f=start();f.data.liveness='Fail';for(let i=0;i<3;i++)assert.ok(runIdentity(f,T).errors);assert.equal(f.terminal,'NOT VERIFIED');
 const r=start();r.scenario='identity';assert.ok(runIdentity(r,T).errors);assert.equal(runIdentity(r,T).ok,true);
});
test('screening outcomes stay separate from credit outcomes',()=>{
 const s=start();s.identityAt=T;s.data.screeningSample='Confirmed sanctions match';runScreening(s,T);
 assert.equal(s.terminal,'COMPLIANCE RESTRICTED');assert.match(s.terminalReason,/not a credit decline/);
 const p=start();p.identityAt=T;p.data.pep=true;runScreening(p,T);assert.equal(p.screeningOutcome,'referred');
 assert.match(validate(p,'screening',T).screening,/Compliance review/);complianceOutcome(p,'clear',T);assert.deepEqual(validate(p,'screening',T),{});
});
test('consent is explicit, versioned and required before any bureau enquiry',()=>{
 const s=start();s.data.bureauConsent=false;assert.ok(validate(s,'consent',T).bureauConsent);
 assert.match(runBureau(s,T).error,/No valid bureau consent/);assert.equal(s.enquiries,0);
 const c=driveTo(start(),'profile');assert.equal(c.consent.version,POLICY.consentVersion);assert.equal(c.consent.marketing,false);
});
test('profile cross-checks identity, conditional employment fields and implausible declarations',()=>{
 const s=start();s.data.name='Other Person';assert.match(validate(s,'profile',T).name,/match/);
 s.data.name='Alex Demo';s.data.employment='Self-employed';assert.ok(validate(s,'profile',T).businessName);
 s.data.employment='Salaried';s.data.expenses='40000000';assert.ok(validate(s,'profile',T).clarification);
 s.data.clarification='Household costs shared with spouse income';assert.deepEqual(validate(s,'profile',T),{});
});
test('eligibility: redirect to an alternative product, discretionary exception, mandatory failure',()=>{
 const s=driveTo(start(),'eligibility');s.data.income='6000000';runEligibility(s,T);
 assert.equal(s.eligibility.outcome,'REDIRECT');assert.ok(validate(s,'eligibility',T).eligibility);
 assert.equal(switchProduct(s,'COLLATERAL',T).ok,true);assert.ok(flow(s).includes('collateral'));assert.equal(s.eligibility.outcome,'ELIGIBLE');
 const p=driveTo(start(),'eligibility');p.data.contract='Probation';runEligibility(p,T);assert.equal(p.eligibility.outcome,'REFERRED');
 assert.ok(approveException(p,T).errors);p.data.exceptionReason='Confirmed permanent offer letter';assert.equal(approveException(p,T).ok,true);
 assert.deepEqual(validate(p,'eligibility',T),{});
 const n=driveTo(start(),'eligibility');n.data.occupation='Prohibited (demo)';runEligibility(n,T);assert.equal(n.eligibility.outcome,'NOT_ELIGIBLE');
});
test('bureau: timeout retry reuses the enquiry, refresh needs a reason, enquiries are capped',()=>{
 const s=driveTo(start(),'bureau');s.scenario='bureau';runBureau(s,T);assert.equal(s.bureau.status,'WAITING');assert.ok(validate(s,'bureau',T).bureau);
 runBureau(s,T);assert.equal(s.bureau.status,'COMPLETE');assert.equal(s.enquiries,1);
 assert.ok(runBureau(s,T).errors.enquiryReason);s.data.enquiryReason='Material change in obligations';runBureau(s,T);
 assert.equal(s.enquiries,2);assert.match(runBureau(s,T).error,/limit/);
 const t=driveTo(start('CREDIT','thin'),'bureau');runBureau(t,T);assert.equal(t.bureau.status,'LIMITED');
 t.data.inquiries30='5';t.data.inquiries90='2';t.bureau=null;t.enquiries=0;assert.ok(runBureau(t,T).errors.inquiries30);
});
test('document requirements depend on product, employment and address history',()=>{
 const keys=s=>requirements(s).map(r=>r.key);
 assert.deepEqual(keys(start()),['income']);assert.deepEqual(keys(start('REPEAT')),[]);
 const c=start('COLLATERAL');c.data.employment='Self-employed';c.data.addressYears='0';
 assert.deepEqual(keys(c),['business','statement','address','collateral']);
});
test('upload technical validation, context registration, replacement lineage and transfer failure',()=>{
 const s=driveTo(start(),'documents');
 for(const [file,re] of [['payslipPhoto',/HEIC/],['payslipLocked',/Password/],['payslipBlurry',/blurred/],['address',/does not satisfy/]])
  assert.match(uploadDocument(s,'income',file,T).error,re);
 assert.ok(validate(s,'documents',T)['doc-income']);
 const first=uploadDocument(s,'income','payslips',T).upload,second=uploadDocument(s,'income','payslips',T+1).upload;
 assert.equal(first.status,'SUPERSEDED');assert.equal(second.replaces,first.id);assert.equal(activeUpload(s,'income').id,second.id);
 assert.deepEqual(validate(s,'documents',T),{});assert.match(uploadDocument(s,'collateral','vehicle',T).error,/does not apply/);
 const f=driveTo(start(),'documents');f.scenario='upload';assert.match(uploadDocument(f,'income','payslips',T).error,/interruption/);
 assert.equal(uploadDocument(f,'income','payslips',T).ok,true);
 const big=driveTo(start('CREDIT'),'documents');big.data.employment='Self-employed';assert.match(uploadDocument(big,'statement','statementLarge',T).error,/10 MB/);
});
test('affordability uses evidenced income, the higher obligation source and DSR/DTI bands',()=>{
 const s=driveTo(start(),'affordability');runAffordability(s,T);assert.equal(s.affordability.outcome,'ACCEPTABLE');
 assert.equal(s.affordability.usable,37000000);
 s.data.evidencedIncome='30000000';runAffordability(s,T);assert.equal(s.affordability.mismatch,'minor');assert.equal(s.affordability.usable,32000000);
 s.data.evidencedIncome='20000000';runAffordability(s,T);assert.equal(s.affordability.outcome,'REFERRED');
 assert.ok(validate(s,'affordability',T).affordability);affordabilityReview(s,'accept',T);assert.deepEqual(validate(s,'affordability',T),{});
 s.data.evidencedIncome='35000000';s.data.amount='500000000';s.data.tenor='24';assert.match(validate(s,'affordability',T).affordability,/current request/);
 runAffordability(s,T);assert.equal(s.affordability.outcome,'INSUFFICIENT');
 const o=driveTo(start(),'affordability');o.bureau.extObligations=6000000;runAffordability(o,T);assert.equal(o.affordability.obligations,6000000);
});
test('decision engine: internal and external hard rules, score cut-off and grades',()=>{
 const p=driveTo(start(),'simulation');assert.equal(p.decision.grade,'Platinum');assert.ok(p.decision.score>=850);
 const d=driveTo(start('CREDIT','declined'),'simulation');assert.equal(d.terminal,'DECLINED');assert.equal(d.decision.stage,'EXTERNAL');
 const i=driveTo(start('REPEAT'),'decision');i.data.internalConduct='Active arrears 30+ DPD';runEngine(i,T);assert.equal(i.decision.stage,'INTERNAL');
 const r=driveTo(start(),'decision');r.bureau.inquiries30=11;r.bureau.inquiries90=12;runEngine(r,T);assert.equal(r.decision.outcome,'REFER');
 assert.ok(validate(r,'decision',T).decision);underwriterOutcome(r,'approve',T);assert.deepEqual(validate(r,'decision',T),{});
 const w=driveTo(start(),'decision');Object.assign(w.data,{internalConduct:'Repeated late payment',occupation:'High-volatility',tenureMonths:'4',addressYears:'0'});
 Object.assign(w.bureau,{profile:'Thin / no file',utilization:90,inquiries90:8});runEngine(w,T);assert.equal(w.decision.stage,'SCORE');assert.ok(w.decision.score<500);
});
test('simulation applies grade caps, affordability caps and counter-offers',()=>{
 const s=driveTo(start('CREDIT','borderline'),'simulation');const sim=simulate(s);
 assert.ok(['Silver','Bronze','Gold'].includes(sim.grade));assert.equal(sim.proposal.outcome,'ADJUSTED');
 assert.ok(sim.tenor<=sim.tenorCap);assert.match(sim.proposal.adjusted.join(' '),/Bronze amount cap|affordability limit/);assert.ok(sim.amount<=allowedAmount(s,sim.tenor));
 s.data.acceptedAmount=String(allowedAmount(s,sim.tenor)+POLICY.amountStep);assert.ok(validate(s,'simulation',T).acceptedAmount);
 s.data.acceptedTenor=String(sim.tenorCap+1);assert.ok(validate(s,'simulation',T).acceptedTenor);
 const p=driveTo(start(),'simulation');const ps=simulate(p);assert.equal(ps.proposal.outcome,'AVAILABLE');
 assert.equal(ps.schedule.at(-1).balance,0);assert.ok(ps.apr>ps.rate);assert.equal(ps.totalPayable,ps.installment*ps.tenor+ps.fee);
 assert.equal(emi(120000000,0,12),10000000);assert.ok(Math.abs(apr(100000000,0,emi(100000000,12,24),24)-12)<.01);
});
test('collateral caps the amount by appraised value and LTV',()=>{
 const s=start('COLLATERAL');s.data.amount='550000000';s.data.tenor='60';driveTo(s,'collateral');s.data.appraisalSample='Lower than declared (−20%)';
 s.data.collateralOwner='Third party';assert.ok(runAppraisal(s,T).errors.ownerConsent);s.data.ownerConsent=true;runAppraisal(s,T);
 assert.equal(s.collateral.maxAmount,336000000);driveTo(s,'simulation');assert.ok(simulate(s).amount<=336000000);assert.match(proposal(s).adjusted.join(' '),/collateral LTV cap/);
});
test('offer requires key facts acknowledgement, expires and can be declined',()=>{
 const s=driveTo(start(),'offer');assert.ok(s.offer.version.endsWith('OFFER-v1'));s.data.kfs=false;
 assert.ok(respondOffer(s,'ACCEPTED',T).errors.kfs);s.data.kfs=true;
 const x=structuredClone(s);respondOffer(x,'ACCEPTED',T+POLICY.offerDays*DAY);assert.equal(x.terminal,'OFFER EXPIRED');
 const y=structuredClone(s);respondOffer(y,'DECLINED',T);assert.equal(y.terminal,'OFFER DECLINED');
 invalidateFrom(s,'simulation',T);assert.equal(s.offer,null);
});
test('signing OTP is bound to the accepted offer and agreement; signing is idempotent after a timeout',()=>{
 const s=driveTo(start(),'signing');s.scenario='signing';assert.match(validate(s,'signing',T).otp,/signing OTP/);
 issueOtp(s,'signing',T);const code=s.otp.code;s.data.mandate='Manual transfer';assert.match(verifyOtp(s,code,'signing',T+1).error,/changed/);
 s.otp=null;issueOtp(s,'signing',T+31000);assert.equal(verifyOtp(s,s.otp.code,'signing',T+31001).ok,true);
 assert.match(signAgreement(s,T+2).error,/timeout/);assert.equal(s.result,null);
 const r=signAgreement(s,T+3);assert.equal(r.ok,true);assert.equal(s.terminal,'COMPLETED');assert.equal(signAgreement(s,T+4).reused,true);
 assert.equal(s.result.offerVersion,s.offer.version);
});
test('OTP lifecycle: purpose, expiry, cooldown, send limit and lock',()=>{
 const s=start();assert.ok(issueOtp(s,'unknown',T).error);issueOtp(s,'email',T,()=>.1);const code=s.otp.code;
 assert.match(verifyOtp(s,code,'mobile',T+1).error,/Request/);assert.equal(verifyOtp(s,code,'email',T+2).ok,true);
 assert.match(verifyOtp(s,code,'email',T+3).error,/already used/);
 const m=start();issueOtp(m,'mobile',T);assert.match(issueOtp(m,'mobile',T+1).error,/cooldown/);
 for(let i=0;i<5;i++)verifyOtp(m,'000000','mobile',T+10);assert.match(verifyOtp(m,m.otp.code,'mobile',T+20).error,/locked/);
 const e=start();issueOtp(e,'mobile',T);assert.match(verifyOtp(e,e.otp.code,'mobile',T+POLICY.otpTtl).error,/expired/);
});
test('resume revalidates stale evidence and expired offers',()=>{
 const s=driveTo(start(),'documents');s.updatedAt=T;assert.match(revalidateOnResume(s,T+20*DAY),/Screening is stale/);assert.equal(s.step,'screening');
 const b=driveTo(start(),'documents');b.screeningAt=T+25*DAY;b.identityAt=T+25*DAY;b.updatedAt=T+25*DAY;
 assert.match(revalidateOnResume(b,T+31*DAY),/bureau/);assert.equal(b.step,'bureau');
 const o=driveTo(start(),'offer');o.updatedAt=T+7*DAY;assert.equal(revalidateOnResume(o,T+8*DAY),'OFFER EXPIRED');
 const i=driveTo(start(),'profile');assert.equal(revalidateOnResume(i,T+31*DAY),'EXPIRED');
});
test('domain outcomes follow the Journey taxonomy',()=>{
 const s=driveTo(start(),'offer');const rows=Object.fromEntries(outcomes(s).map(([k,...v])=>[k,v]));
 assert.deepEqual(rows['Registration & Onboarding'],['Verified and permitted','USABLE']);
 assert.equal(rows['Risk Assessment'][1],'USABLE');assert.deepEqual(rows['Offer & Agreement'],['Offer generated','USABLE']);
 assert.equal(proposal(s).outcome,'AVAILABLE');
});
test('deep links prepare a consistent sample application at every linked step',()=>{
 for(const step of DEEP_LINK_STEPS){const s=prepareDemoAt(step,T);assert.ok(s,step);assert.equal(s.step,step);
  assert.deepEqual(s.done,flow(s).slice(0,flow(s).indexOf(step)),step);assert.equal(s.terminal,'');}
 assert.equal(prepareDemoAt('collateral',T).product,'COLLATERAL');assert.equal(prepareDemoAt('complete',T),null);
 assert.equal(prepareDemoAt('toString',T),null);
 const sign=prepareDemoAt('signing',T);assert.equal(sign.offer.response,'ACCEPTED');assert.ok(validate(sign,'signing',T).agreement);
});
