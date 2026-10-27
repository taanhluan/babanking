// Prototype policy and state only. No real bank, identity, bureau, scoring, signing or disbursement service.
// Every threshold below is an illustrative demo value taken from, or labelled against, the Lending Journey examples.
export const POLICY = Object.freeze({ otpTtl:120000, cooldown:30000, otpAttempts:5, lockDuration:60000, maxSends:3,
  identityDays:30, screeningDays:14, bureauDays:30, inactivityDays:30, offerDays:7, consentVersion:'LEND-DEMO-3',
  ruleSet:'ELIG-DEMO-2026.10', scorecard:'SCORE-DEMO-1', minAge:18, maxMaturityAge:65, minIncome:8000000,
  securedMinIncome:5000000, salariedTenure:3, selfEmployedTenure:12, repeatRelationship:12, minAmount:10000000,
  amountStep:1000000, minTenor:6, maxTenor:60, dsrAccept:30, dsrMax:40, dtiAccept:45, dtiMax:55, residualBuffer:3000000,
  secondaryShare:.5, cutoff:500, factorMax:800, maxFileMb:10, maxEnquiries:2, originationFee:.01, protectionRate:.005 });
export const PRODUCTS={CREDIT:'Personal credit loan',COLLATERAL:'Collateral loan',REPEAT:'Repeat-customer top-up'};
export const CATALOG_MAX={CREDIT:500000000,COLLATERAL:2000000000,REPEAT:300000000};
// Indicative (pre-decision) annual rate used only for the affordability test, before a risk grade exists.
export const INDICATIVE_RATE={CREDIT:17,COLLATERAL:14,REPEAT:16};
export const GRADES=Object.freeze([{grade:'Platinum',min:850,cap:500000000,tenor:60,rate:11.5},
  {grade:'Gold',min:700,cap:300000000,tenor:48,rate:14},{grade:'Silver',min:600,cap:200000000,tenor:36,rate:17},
  {grade:'Bronze',min:500,cap:100000000,tenor:24,rate:21}]);
export const LTV={Car:.7,'Residential property':.75};
export const APPRAISAL_FEE={Car:1500000,'Residential property':3000000};
export const PURPOSES=['Home improvement','Education','Medical expenses','Car purchase','Debt consolidation','Speculative investment (restricted demo)'];
export const FILES={
  payslips:{name:'payslips-jul-sep.pdf',format:'PDF',size:1.4,purpose:'income'},
  payslipPhoto:{name:'payslip-photo.heic',format:'HEIC',size:2.8,purpose:'income'},
  payslipLocked:{name:'payslips-locked.pdf',format:'PDF',size:1.1,purpose:'income',encrypted:true},
  payslipBlurry:{name:'payslip-scan-blurry.jpg',format:'JPG',size:0.7,purpose:'income',unreadable:true},
  statement:{name:'business-statement-6m.pdf',format:'PDF',size:3.2,purpose:'statement'},
  statementLarge:{name:'business-statement-full-scan.pdf',format:'PDF',size:14.6,purpose:'statement'},
  business:{name:'business-registration.jpg',format:'JPG',size:0.9,purpose:'business'},
  address:{name:'utility-bill-sep.pdf',format:'PDF',size:0.4,purpose:'address'},
  vehicle:{name:'vehicle-registration.png',format:'PNG',size:1.6,purpose:'collateral'},
  property:{name:'land-use-certificate.pdf',format:'PDF',size:2.2,purpose:'collateral'}};
export const SAMPLE={persona:'prime',customerType:'New',cif:'',channel:'Mobile app',purpose:'Home improvement',
  amount:'120000000',tenor:'36',phone:'0900000000',email:'alex@example.test',
  documentType:'National ID',documentNo:'DEMO-ID-001',documentName:'Alex Demo',documentDob:'1990-04-12',
  documentExpiry:'2031-12-31',front:true,back:true,selfie:true,quality:'Clear',liveness:'Pass',
  screeningSample:'No match',pep:false,terms:false,privacy:false,bureauConsent:false,dataSharing:false,marketing:false,
  name:'Alex Demo',dob:'1990-04-12',residency:'Resident',marital:'Married',dependants:'1',residenceType:'Owned',
  addressYears:'4',street:'12 Example Avenue',city:'Ho Chi Minh City',employment:'Salaried',employer:'Example Company',
  businessName:'',occupation:'Low-volatility',contract:'Permanent',tenureMonths:'38',payFrequency:'Monthly',
  income:'35000000',secondaryIncome:'4000000',expenses:'9000000',obligations:'3000000',clarification:'',confirmed:false,
  internalConduct:'No internal history',relationshipMonths:'0',bureauProfile:'Clean file',extObligations:'3000000',
  inquiries90:'1',inquiries30:'1',utilization:'20',enquiryReason:'',collateralType:'Car',collateralValue:'600000000',
  collateralOwner:'Applicant',appraisalSample:'Matches declaration',ownerConsent:false,evidencedIncome:'35000000',
  exceptionReason:'',acceptedAmount:'',acceptedTenor:'',protection:false,kfs:false,agreement:false,
  mandate:'Auto-debit from DEMO-CASA-001',signature:'',reworkReason:''};
// Personas patch the sample so reviewers can reach different Journey outcomes quickly.
export const PERSONAS={
  prime:{label:'Alex · salaried, clean file (expected Platinum)',patch:{}},
  borderline:{label:'Binh · tighter budget, cured late payment (expected counter-offer)',patch:{name:'Binh Demo',documentName:'Binh Demo',
    email:'binh@example.test',dob:'1988-02-03',documentDob:'1988-02-03',income:'14000000',secondaryIncome:'0',evidencedIncome:'14000000',
    expenses:'5000000',obligations:'2500000',extObligations:'2500000',amount:'150000000',tenor:'48',tenureMonths:'10',
    occupation:'Moderate-volatility',bureauProfile:'Minor cured delinquency',inquiries90:'4',inquiries30:'2',utilization:'60',addressYears:'0'}},
  thin:{label:'Chi · new to credit, thin bureau file',patch:{name:'Chi Demo',documentName:'Chi Demo',email:'chi@example.test',
    dob:'2002-05-20',documentDob:'2002-05-20',marital:'Single',dependants:'0',residenceType:'Rented',income:'12000000',secondaryIncome:'0',
    evidencedIncome:'12000000',expenses:'4000000',obligations:'0',extObligations:'0',amount:'40000000',tenor:'24',tenureMonths:'8',
    bureauProfile:'Thin / no file',inquiries90:'0',inquiries30:'0',utilization:'0'}},
  declined:{label:'Dung · recent external default (expected decline)',patch:{name:'Dung Demo',documentName:'Dung Demo',
    email:'dung@example.test',dob:'1985-09-09',documentDob:'1985-09-09',bureauProfile:'Recent default (12 months)',
    inquiries90:'7',inquiries30:'3',utilization:'88'}}};
export const DAY=86400000;
export function newState(now=Date.now()){return {version:1,ref:'LOAN-'+Math.random().toString(36).slice(2,8).toUpperCase(),
  product:'',step:'product',done:[],data:{...SAMPLE},scenario:'standard',identityAt:0,identityAttempts:0,screeningAt:0,
  screeningOutcome:'',verifiedPhone:'',verifiedEmail:'',consent:null,profileFlag:false,eligibility:null,exception:null,
  bureau:null,enquiries:0,collateral:null,uploads:[],affordability:null,affordabilityReview:'',decision:null,underwriting:'',
  simulation:null,offer:null,offerCount:0,signFingerprint:'',signAttempts:0,otp:null,otpSends:{},events:[],createdAt:now,
  updatedAt:now,paused:false,terminal:'',terminalReason:'',result:null,notification:'pending'};}
export function applyPersona(s,key){if(!PERSONAS[key])return;s.data={...SAMPLE,...PERSONAS[key].patch,persona:key};
  s.verifiedPhone='';s.verifiedEmail='';}
export function flow(s){if(!PRODUCTS[s.product])return ['product'];return ['product','registration','identity','screening','consent',
  'profile','eligibility','bureau',...(s.product==='COLLATERAL'?['collateral']:[]),'documents','affordability','decision',
  'simulation','offer','signing','complete'];}
export function record(s,message,now=Date.now()){s.events.push({message,at:now});s.events=s.events.slice(-80);s.updatedAt=now;}
export const num=x=>/^\d+$/.test(String(x??'').trim())?Number(String(x).trim()):NaN;
const norm=x=>String(x??'').trim().replace(/\s+/g,' ').toLowerCase();
const pct=x=>Math.round(x*1000)/10;
export function ageOn(dob,at=Date.now()){if(!/^\d{4}-\d{2}-\d{2}$/.test(dob))return NaN;const d=new Date(dob+'T00:00:00Z'),t=new Date(at);
  if(Number.isNaN(+d)||d.toISOString().slice(0,10)!==dob||d>t)return NaN;
  return t.getUTCFullYear()-d.getUTCFullYear()-((t.getUTCMonth()<d.getUTCMonth()||t.getUTCMonth()===d.getUTCMonth()&&t.getUTCDate()<d.getUTCDate())?1:0);}
export function addMonths(at,months){const d=new Date(at);d.setUTCMonth(d.getUTCMonth()+months);return +d;}
export function maturityAge(dob,tenor,now=Date.now()){return ageOn(dob,addMonths(now,tenor));}
export function validPhone(phone){return /^(0[35789]\d{8}|\+84[35789]\d{8})$/.test(phone);}
export function emi(principal,rate,months){const r=rate/1200;if(!(principal>0&&months>0))return 0;
  return Math.round(r?principal*r/(1-(1+r)**-months):principal/months);}
export function presentValue(installment,rate,months){const r=rate/1200;if(!(installment>0&&months>0))return 0;
  return r?installment*(1-(1+r)**-months)/r:installment*months;}
// APR from net proceeds (principal minus mandatory fee) against the installment stream; optional protection is excluded.
export function apr(principal,fee,installment,months){const net=principal-fee;let lo=0,hi=1;
  for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(presentValue(installment,mid*1200,months)>net)lo=mid;else hi=mid;}
  return Math.round((lo+hi)/2*1200*100)/100;}
export function requirements(s){const d=s.data,r=[];
  if(d.employment==='Self-employed'){
    r.push({key:'business',label:'Business registration certificate',purpose:'business',why:'Self-employed income source'});
    r.push({key:'statement',label:'Business bank statements (6 months)',purpose:'statement',why:'Self-employed income evidence'});
  }else if(s.product!=='REPEAT')r.push({key:'income',label:'Payslips (last 3 months)',purpose:'income',why:'Salaried income evidence'});
  if(num(d.addressYears)<1)r.push({key:'address',label:'Proof of current address',purpose:'address',why:'Less than 12 months at the current address'});
  if(s.product==='COLLATERAL')r.push({key:'collateral',label:d.collateralType==='Car'?'Vehicle registration certificate':'Property ownership certificate',
    purpose:'collateral',why:'Secured product prerequisite'});
  return r;}
export function activeUpload(s,req){return s.uploads.find(u=>u.req===req&&u.status==='PENDING_REVIEW')||null;}
const fresh=(at,days,now)=>!!at&&now-at<=days*DAY;
export function evaluateEligibility(s,now=Date.now()){
  const d=s.data,rules=[],add=(rule,result,text)=>rules.push({rule,result,text});
  const age=ageOn(d.dob,now),tenor=num(d.tenor),maturity=maturityAge(d.dob,tenor,now),primary=num(d.income),tenure=num(d.tenureMonths);
  const minTenure=d.employment==='Self-employed'?POLICY.selfEmployedTenure:POLICY.salariedTenure;
  add('Age at application',age>=POLICY.minAge?'pass':'fail',`Age ${age}; minimum ${POLICY.minAge}.`);
  add('Age at maturity',maturity<=POLICY.maxMaturityAge?'pass':'fail',`Age ${maturity} at the end of a ${tenor}-month term; maximum ${POLICY.maxMaturityAge}. A shorter term may qualify.`);
  add('Residency',d.residency==='Resident'?'pass':'fail','Resident status is required for the digital route.');
  add('Serviceable area',d.city!=='Outside service area (demo)'?'pass':'fail',`${d.city}.`);
  add('Employment status',['Salaried','Self-employed'].includes(d.employment)?'pass':'fail',`${d.employment}.`);
  add('Employment tenure',tenure>=minTenure?'pass':'fail',`${tenure} months; minimum ${minTenure} for ${d.employment.toLowerCase()} applicants.`);
  add('Occupation',d.occupation!=='Prohibited (demo)'?'pass':'fail',`${d.occupation}.`);
  if(s.product==='REPEAT')add('Existing relationship',num(d.relationshipMonths)>=POLICY.repeatRelationship?'pass':'fail',
    `${num(d.relationshipMonths)} months; top-up requires at least ${POLICY.repeatRelationship}.`);
  const minimum=s.product==='COLLATERAL'?POLICY.securedMinIncome:POLICY.minIncome;let alternative='';
  if(primary>=minimum)add('Minimum income',primary<minimum*1.1?'near':'pass',`Primary income ${money(primary)}; minimum ${money(minimum)}${primary<minimum*1.1?' (within 10% of the threshold)':''}.`);
  else if(s.product!=='COLLATERAL'&&primary>=POLICY.securedMinIncome){alternative='COLLATERAL';
    add('Minimum income','redirect',`Primary income ${money(primary)} is below ${money(minimum)}, but meets the collateral loan minimum.`);}
  else add('Minimum income','fail',`Primary income ${money(primary)}; minimum ${money(minimum)}.`);
  if(d.contract==='Probation')add('Contract type (discretionary)','refer','Probation contracts need an authorised exception with a recorded reason.');
  const has=r=>rules.some(x=>x.result===r);
  const outcome=has('fail')?'NOT_ELIGIBLE':alternative?'REDIRECT':has('refer')?'REFERRED':'ELIGIBLE';
  return {outcome,rules,alternative,ruleSet:POLICY.ruleSet,at:now};}
export function money(x){return Number.isFinite(x)?Math.round(x).toLocaleString('en-US')+' VND':'—';}
export function affordabilityKey(s){const d=s.data;return JSON.stringify([s.product,d.amount,d.tenor,d.income,d.secondaryIncome,
  d.evidencedIncome,d.expenses,d.obligations,s.bureau?.at||0]);}
export function assessAffordability(s){
  const d=s.data,primary=num(d.income),evidenced=num(d.evidencedIncome),secondary=num(d.secondaryIncome),expenses=num(d.expenses),
    declared=num(d.obligations),bureauObligations=s.bureau?.extObligations??0,amount=num(d.amount),tenor=num(d.tenor),reasons=[];
  if(![primary,evidenced,secondary,expenses,declared,amount,tenor].every(Number.isFinite)||!s.bureau)
    return {outcome:'PENDING',reasons:['Financial inputs or the bureau result are missing.'],key:affordabilityKey(s)};
  const gap=primary>0?(primary-evidenced)/primary:0,mismatch=gap>.3?'material':gap>.1?'minor':'none';
  if(mismatch!=='none')reasons.push(`Evidenced income is ${pct(gap)}% below the declared value; the evidenced value is used and the declaration is retained.`);
  const usable=Math.min(primary,evidenced)+Math.round(secondary*POLICY.secondaryShare);
  const obligations=Math.max(declared,bureauObligations);
  if(bureauObligations>declared)reasons.push('Bureau obligations exceed the declared obligations; the higher value is used.');
  const rate=INDICATIVE_RATE[s.product],installment=emi(amount,rate,tenor);
  const dsr=pct(installment/usable),dti=pct((obligations+installment)/usable),residual=usable-expenses-obligations-installment;
  let outcome='ACCEPTABLE';
  if(mismatch==='material'){outcome='REFERRED';reasons.push('Material declared-versus-evidenced mismatch needs specialist review.');}
  else if(dsr>POLICY.dsrMax||dti>POLICY.dtiMax||residual<0){outcome='INSUFFICIENT';reasons.push('Repayment burden is outside the demo tolerance. Reduce the amount or extend the term.');}
  else if(dsr>POLICY.dsrAccept||dti>POLICY.dtiAccept||residual<POLICY.residualBuffer){outcome='BORDERLINE';reasons.push('Close to threshold; the case proceeds with a borderline signal.');}
  return {outcome,usable,obligations,installment,rate,dsr,dti,residual,mismatch,reasons,key:affordabilityKey(s)};}
function factor(list,component,condition,points){list.push({component,condition,points});}
export function runDecision(s,now=Date.now()){
  const d=s.data,b=s.bureau,a=s.affordability,internal=[],external=[],refer=[];
  if(!b||!a?.usable)return {outcome:'PENDING',stage:'INPUTS',reasons:['Bureau and affordability results are required.']};
  for(const rule of evaluateEligibility(s,now).rules)if(rule.result==='fail')internal.push(rule.rule+': '+rule.text);
  if(d.internalConduct==='Active arrears 30+ DPD')internal.push('Current internal arrears: an active facility is 30+ days past due.');
  if(d.internalConduct==='Write-off in last 24 months')internal.push('Recent internal write-off within 24 months.');
  const steps=[{name:'Internal risk assessment',result:internal.length?'Reject':'Continue',reasons:internal}];
  if(internal.length)return {outcome:'REJECT',stage:'INTERNAL',steps,reasons:internal,at:now};
  if(b.profile==='Recent default (12 months)')external.push('Recent external default within 12 months.');
  if(b.profile==='Two obligations 60+ DPD')external.push('Two or more active external obligations above 60 days past due.');
  if(b.utilization>95)external.push('Revolving utilization above 95%.');
  if(b.extObligations/a.usable*100>POLICY.dtiMax)external.push('External obligations alone exceed the maximum debt burden.');
  steps.push({name:'External risk assessment',result:external.length?'Reject':'Continue',reasons:external});
  if(external.length)return {outcome:'REJECT',stage:'EXTERNAL',steps,reasons:external,at:now};
  const f=[],conduct=d.internalConduct,ext=b.profile,dti=a.dti,util=b.utilization,tenure=num(d.tenureMonths),rel=num(d.relationshipMonths);
  if(conduct==='No internal history')factor(f,'Internal repayment','No internal lending history (demo neutral value)',55);
  else factor(f,'Internal repayment',conduct,{'Clean internal history':120,'Minor cured late payment':80,'Repeated late payment':35}[conduct]??0);
  factor(f,'External credit',ext,{'Clean file':140,'Minor cured delinquency':90,'Disputed entry':90,'Thin / no file':55}[ext]??40);
  factor(f,'Debt burden',`DTI ${dti}% after the requested facility`,dti<25?110:dti<=40?75:25);
  factor(f,'Revolving utilization',`${util}%`,util<40?70:util<=75?45:10);
  factor(f,'Income stability',`${d.employment}, ${tenure} months`,d.employment==='Salaried'?(tenure>=24?85:tenure>=6?55:20):(tenure>=24?70:20));
  factor(f,'Relationship',rel?`${rel} months`:'New relationship',rel>=36?60:rel>=12?40:15);
  factor(f,'Profile consistency',{none:'Consistent across sources',minor:'Minor explainable mismatch',material:'Unresolved mismatch'}[a.mismatch],{none:65,minor:40,material:10}[a.mismatch]);
  factor(f,'Recent inquiries',`${b.inquiries90} in 90 days`,b.inquiries90<=2?45:b.inquiries90<=5?25:5);
  const age=ageOn(d.dob,now),maturity=maturityAge(d.dob,num(d.tenor),now);
  factor(f,'Age band',`${age} now, ${maturity} at maturity`,age>=25&&age<=55&&maturity<=60?35:15);
  factor(f,'Address stability',`${num(d.addressYears)} years at address`,num(d.addressYears)>=1?30:10);
  factor(f,'Occupation risk',d.occupation,{'Low-volatility':40,'Moderate-volatility':25,'High-volatility':5}[d.occupation]??0);
  const points=f.reduce((t,x)=>t+x.points,0),score=Math.min(1000,Math.round(points*1000/POLICY.factorMax));
  steps.push({name:'Scoring',result:score<POLICY.cutoff?'Reject':'Continue',reasons:[`${points} factor points scaled to ${score} / 1000; cut-off ${POLICY.cutoff}.`]});
  if(score<POLICY.cutoff)return {outcome:'REJECT',stage:'SCORE',steps,factors:f,points,score,reasons:[`Score ${score} is below the ${POLICY.cutoff} cut-off.`],at:now};
  const grade=GRADES.find(g=>score>=g.min).grade;steps.push({name:'Grading',result:grade,reasons:[`Score ${score} maps to ${grade}.`]});
  if(b.inquiries30>10)refer.push('More than 10 bureau inquiries in 30 days.');
  if(b.status==='FLAGGED')refer.push('A disputed bureau entry is unresolved.');
  if(a.outcome==='BORDERLINE'&&grade==='Bronze')refer.push('Borderline affordability combined with the lowest passing grade.');
  if(s.exception)refer.push('Eligibility passed on an authorised exception.');
  return {outcome:refer.length?'REFER':'CONTINUE',stage:'GRADED',steps,factors:f,points,score,grade,reasons:refer,scorecard:POLICY.scorecard,at:now};}
export function gradeTerms(s){const g=GRADES.find(x=>x.grade===s.decision?.grade);if(!g)return null;
  const rate=g.rate+(s.product==='COLLATERAL'?-3:0)+(s.product==='REPEAT'?-1:0);
  const cap=Math.min(CATALOG_MAX[s.product],s.product==='COLLATERAL'?CATALOG_MAX.COLLATERAL:g.cap,s.product==='COLLATERAL'?s.collateral?.maxAmount??0:Infinity);
  return {grade:g.grade,rate,tenorCap:g.tenor,cap};}
// Returns the binding cap so a counter-offer can explain which limit applied.
export function amountCaps(s,tenor){const t=gradeTerms(s),a=s.affordability;if(!t||!a?.usable)return {allowed:0,binding:'missing inputs'};
  const maxInstallment=Math.min(a.usable*POLICY.dsrMax/100,a.usable*POLICY.dtiMax/100-a.obligations);
  const caps=[[CATALOG_MAX[s.product],'product catalogue maximum'],[s.product==='COLLATERAL'?s.collateral?.maxAmount??0:Infinity,'collateral LTV cap'],
    [s.product==='COLLATERAL'?Infinity:GRADES.find(g=>g.grade===t.grade).cap,`${t.grade} amount cap`],
    [presentValue(Math.max(0,maxInstallment),t.rate,Math.min(tenor,t.tenorCap)),'affordability limit (DSR 40% / DTI 55%)']];
  const [value,binding]=caps.reduce((m,c)=>c[0]<m[0]?c:m);
  return {allowed:Math.floor(value/POLICY.amountStep)*POLICY.amountStep,binding};}
export function allowedAmount(s,tenor){return amountCaps(s,tenor).allowed;}
export function proposal(s){const t=gradeTerms(s);if(!t)return null;const reqAmount=num(s.data.amount),reqTenor=num(s.data.tenor);
  const tenor=Math.min(reqTenor,t.tenorCap),{allowed,binding}=amountCaps(s,tenor),amount=Math.min(reqAmount,allowed),adjusted=[];
  if(tenor<reqTenor)adjusted.push(`Term reduced from ${reqTenor} to the ${t.grade} maximum of ${t.tenorCap} months.`);
  if(amount<reqAmount)adjusted.push(`Amount reduced from ${money(reqAmount)} to ${money(amount)} by the ${binding}.`);
  return {amount,tenor,adjusted,outcome:amount<POLICY.minAmount?'NOT_AVAILABLE':adjusted.length?'ADJUSTED':'AVAILABLE'};}
export function simulate(s){const t=gradeTerms(s),p=proposal(s);if(!t||!p)return null;
  const amount=num(s.data.acceptedAmount),tenor=num(s.data.acceptedTenor),installment=emi(amount,t.rate,tenor);
  const fee=Math.round(amount*POLICY.originationFee),protection=s.data.protection?Math.round(amount*POLICY.protectionRate*tenor/12):0;
  const schedule=[];let balance=amount;const r=t.rate/1200;
  for(let n=1;n<=tenor&&Number.isFinite(amount);n++){const interest=Math.round(balance*r),principal=n===tenor?balance:installment-interest;
    balance-=principal;if(n<=3||n===tenor)schedule.push({n,installment:principal+interest,principal,interest,balance:Math.max(0,balance)});}
  return {...t,proposal:p,amount,tenor,installment,fee,protection,totalInterest:installment*tenor-amount,
    totalPayable:installment*tenor+fee+protection,apr:apr(amount,fee,installment,tenor),schedule,allowed:allowedAmount(s,tenor),
    appraisalFee:s.product==='COLLATERAL'?APPRAISAL_FEE[s.data.collateralType]:0};}
export function agreementFingerprint(s){const d=s.data;return JSON.stringify([s.ref,s.offer?.version,s.offer?.amount,s.offer?.tenor,
  s.offer?.installment,d.mandate,d.agreement,norm(d.signature),s.consent?.version]);}
export function isSigningAuthenticated(s){const o=s.otp,current=agreementFingerprint(s);
  return !s.paused&&!!s.signFingerprint&&s.signFingerprint===current&&o?.purpose==='signing'&&o.used===true
    &&o.target===s.data.phone&&o.binding===current;}
export function validate(s,step,now=Date.now()){
  const d=s.data,e={},add=(key,msg)=>{e[key]=msg;};
  if(step==='product'){
    if(!PRODUCTS[s.product])add('product','Choose a loan product to build your journey.');
    if(d.customerType==='Existing'&&d.cif!=='DEMO-CIF-001')add('cif',/^DEMO-CIF-\d{3}$/.test(d.cif)?'No sample relationship found. Use DEMO-CIF-001.':'Use a fictional customer number such as DEMO-CIF-001.');
    if(s.product==='REPEAT'&&d.customerType!=='Existing')add('customerType','Repeat-customer products cannot be selected by first-time applicants.');
    if(!PURPOSES.includes(d.purpose))add('purpose','Choose a loan purpose.');
    else if(d.purpose.startsWith('Speculative'))add('purpose','This purpose is outside the permitted lending purposes in this demo.');
    const amount=num(d.amount),tenor=num(d.tenor),max=CATALOG_MAX[s.product]||CATALOG_MAX.CREDIT;
    if(!Number.isFinite(amount)||amount<POLICY.minAmount||amount>max||amount%POLICY.amountStep)
      add('amount',`Amount: ${money(POLICY.minAmount)}–${money(max)} in steps of ${money(POLICY.amountStep)}.`);
    if(!Number.isFinite(tenor)||tenor<POLICY.minTenor||tenor>POLICY.maxTenor)add('tenor',`Term: ${POLICY.minTenor}–${POLICY.maxTenor} months.`);
  }
  if(step==='registration'){
    if(!validPhone(d.phone))add('phone','Use a valid demo Vietnam mobile (e.g. 0900000000).');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||d.email.length>254)add('email','Enter a valid sample email address.');
    if(s.verifiedPhone!==d.phone)add('mobileOtp','Verify the current mobile number using mock OTP.');
    if(s.verifiedEmail!==d.email)add('emailOtp','Verify the current email using mock OTP.');
  }
  if(step==='identity'){
    if(d.customerType==='New'){
      if(!/^DEMO-(ID|PP)-[A-Z0-9-]{3,20}$/.test(d.documentNo))add('documentNo','Use a fictional document reference such as DEMO-ID-001.');
      if(!d.front)add('front','The front of the sample document is required.');
      if(d.documentType==='National ID'&&!d.back)add('back','The back of the sample National ID is required.');
      if(d.quality!=='Clear')add('quality','The sample document must be clear and readable.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d.documentExpiry)||d.documentExpiry<new Date(now).toISOString().slice(0,10))add('documentExpiry','Use a valid, unexpired sample document.');
      if(!Number.isFinite(ageOn(d.documentDob,now)))add('documentDob','The document date of birth must be valid.');
      if(!/^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(d.documentName.trim()))add('documentName','Provide a sample document name of 2–80 letters.');
    }
    if(!d.selfie)add('selfie','Provide the sample selfie.');
    if(d.liveness!=='Pass')add('liveness','Sample liveness must pass. Retry or use assisted support.');
    if(s.identityAttempts>=3&&!s.identityAt)add('identity','Three identity attempts reached. Onboarding cannot continue on the current evidence.');
    if(!fresh(s.identityAt,POLICY.identityDays,now))add('identity','Run a successful sample identity check.');
  }
  if(step==='screening'){
    if(!fresh(s.identityAt,POLICY.identityDays,now))add('identity','Identity evidence is missing or stale.');
    if(!fresh(s.screeningAt,POLICY.screeningDays,now))add('screening',s.screeningOutcome==='referred'?'Compliance review is pending. Record a simulated compliance outcome.':'Run sample AML, sanctions and PEP screening.');
  }
  if(step==='consent'){
    if(!d.terms)add('terms','Acknowledge the current sample lending terms.');
    if(!d.privacy)add('privacy','Acknowledge the separate sample privacy notice.');
    if(!d.bureauConsent)add('bureauConsent','Credit bureau enquiry consent is required before any bureau check.');
  }
  if(step==='profile'){
    if(!/^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u.test(d.name.trim()))add('name','Enter 2–80 letters.');
    else if(norm(d.name)!==norm(d.documentName))add('name','Legal name must match the verified identity.');
    if(d.dob!==d.documentDob)add('dob','Date of birth differs from the verified identity.');
    const dependants=num(d.dependants);if(!Number.isFinite(dependants)||dependants>15)add('dependants','Dependants: a whole number from 0 to 15.');
    if(!Number.isFinite(num(d.addressYears))||num(d.addressYears)>80)add('addressYears','Years at address: a whole number from 0 to 80.');
    if(d.street.trim().length<5||/p\.?\s*o\.?\s*box|post office box/i.test(d.street))add('street','Provide a physical street address, not a P.O. Box.');
    if(d.employment==='Salaried'&&d.employer.trim().length<2)add('employer','Employer name is required for salaried applicants.');
    if(d.employment==='Self-employed'&&d.businessName.trim().length<2)add('businessName','Business name is required for self-employed applicants.');
    const tenure=num(d.tenureMonths);if(['Salaried','Self-employed'].includes(d.employment)&&(!Number.isFinite(tenure)||tenure>600))add('tenureMonths','Tenure: whole months, 0–600.');
    const income=num(d.income),secondary=num(d.secondaryIncome),expenses=num(d.expenses),obligations=num(d.obligations);
    if(!(income>0))add('income','Primary monthly income must be a whole VND amount above 0.');
    if(!Number.isFinite(secondary))add('secondaryIncome','Enter 0 if there is no secondary income.');
    if(!Number.isFinite(expenses))add('expenses','Monthly living expenses are required (whole VND).');
    if(!Number.isFinite(obligations))add('obligations','Enter existing monthly repayments, or 0.');
    const implausible=expenses+obligations>=income+secondary||expenses<1000000*(1+(dependants||0));
    if(Number.isFinite(income+secondary+expenses+obligations)&&implausible&&d.clarification.trim().length<15)
      add('clarification','Declared values look implausible (spending vs. income or household size). Correct them or explain in at least 15 characters.');
    if(!d.confirmed)add('confirmed','Confirm the pre-filled and declared information.');
  }
  if(step==='eligibility'){const r=s.eligibility;
    if(!r)add('eligibility',`Apply rule set ${POLICY.ruleSet} to this application.`);
    else if(r.outcome==='NOT_ELIGIBLE')add('eligibility','Not eligible: '+r.rules.filter(x=>x.result==='fail').map(x=>x.rule).join(', ')+'. Return to earlier stages to change the request.');
    else if(r.outcome==='REDIRECT')add('eligibility','The requested product is not available; accept the alternative product to continue.');
    else if(r.outcome==='REFERRED'&&!s.exception)add('eligibility','A discretionary criterion needs a simulated approver decision.');
  }
  if(step==='bureau'){const b=s.bureau;
    if(!s.consent?.bureau||s.consent.version!==POLICY.consentVersion)add('consent','No valid, current bureau consent is recorded.');
    if(!b)add('bureau','Run the sample bureau enquiry.');
    else if(b.status==='WAITING')add('bureau','The bureau response is pending. Retry the same enquiry.');
    else if(!fresh(b.at,POLICY.bureauDays,now))add('bureau','The bureau result is older than 30 days. A refresh enquiry is required.');
  }
  if(step==='collateral'){const value=num(d.collateralValue);
    if(!(value>=50000000))add('collateralValue','Declared collateral value: at least 50,000,000 VND.');
    if(d.collateralOwner==='Third party'&&!d.ownerConsent)add('ownerConsent','A third-party owner must consent to the pledge.');
    if(!s.collateral)add('collateral','Run the sample collateral appraisal.');
  }
  if(step==='documents')for(const r of requirements(s))if(!activeUpload(s,r.key))add('doc-'+r.key,`Upload an accepted file for “${r.label}”.`);
  if(step==='affordability'){const a=s.affordability;
    if(!Number.isFinite(num(d.evidencedIncome)))add('evidencedIncome','Enter the evidenced monthly income (whole VND).');
    if(!a||a.key!==affordabilityKey(s))add('affordability','Calculate affordability for the current request and evidence.');
    else if(a.outcome==='INSUFFICIENT')add('affordability','Affordability is insufficient. Reduce the amount or extend the term, then recalculate.');
    else if(a.outcome==='REFERRED'&&s.affordabilityReview!=='accepted')add('affordability','Specialist affordability review is required.');
    else if(a.outcome==='PENDING')add('affordability','Additional financial information is required.');
  }
  if(step==='decision'){const r=s.decision;
    if(!r)add('decision','Run the sample decision engine.');
    else if(r.outcome==='REFER'&&s.underwriting!=='approved')add('decision','The case is referred. Record a simulated underwriter outcome.');
    else if(r.outcome==='PENDING')add('decision',r.reasons[0]);
  }
  if(step==='simulation'){const t=gradeTerms(s),amount=num(d.acceptedAmount),tenor=num(d.acceptedTenor);
    if(!t)add('simulation','A risk grade is required before simulation.');
    else{
      if(!Number.isFinite(tenor)||tenor<POLICY.minTenor||tenor>t.tenorCap)add('acceptedTenor',`Term: ${POLICY.minTenor}–${t.tenorCap} months for ${t.grade}.`);
      else if(maturityAge(d.dob,tenor,now)>POLICY.maxMaturityAge)add('acceptedTenor','This term breaches the maximum age at maturity.');
      const allowed=Number.isFinite(tenor)?allowedAmount(s,tenor):0;
      if(!Number.isFinite(amount)||amount<POLICY.minAmount||amount%POLICY.amountStep||amount>allowed)
        add('acceptedAmount',`Amount: ${money(POLICY.minAmount)}–${money(allowed)} in ${money(POLICY.amountStep)} steps at this term.`);
    }
  }
  if(step==='offer'){const o=s.offer;
    if(!o)add('offer','No current offer exists.');
    else if(now>=o.expiresAt)add('offer','This offer has expired.');
    else{if(!d.kfs)add('kfs','Confirm you have read the key facts statement.');
      if(o.response!=='ACCEPTED')add('offer','Accept the offer to continue to agreement signing.');}
  }
  if(step==='signing'){
    for(const key of flow(s).slice(1,flow(s).indexOf('signing'))){const x=validate(s,key,now);for(const [k,v]of Object.entries(x))e[`${key}.${k}`]=v;}
    if(!d.agreement)add('agreement','Acknowledge the sample loan agreement generated from the accepted offer.');
    if(!d.mandate)add('mandate','Choose a repayment method.');
    if(norm(d.signature)!==norm(d.name))add('signature','Type the fictional legal name exactly.');
    if(s.consent?.version!==POLICY.consentVersion)add('consent','The sample terms changed. Reconfirm the current version.');
    if(!e.agreement&&!e.signature&&!isSigningAuthenticated(s))add('otp','Verify a fresh signing OTP bound to this agreement.');
  }
  return e;}
export function issueOtp(s,purpose,now=Date.now(),random=Math.random){
  if(!['mobile','email','signing','resume'].includes(purpose))return {error:'Unsupported mock OTP purpose.'};
  if(s.terminal||s.result)return {error:'This application is closed; no new OTP can be issued.'};
  const target=purpose==='email'?s.data.email:s.data.phone,key=purpose+':'+target,old=s.otp;
  if(purpose==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)||purpose!=='email'&&!validPhone(target))return {error:'Provide a valid demo contact before sending OTP.'};
  if(old&&now<old.lockedUntil)return {error:'Too many attempts. Wait for the demo lock to end.'};
  if(old?.key===key&&now<old.resendAt)return {error:'Resend cooldown is active. Wait or use the labelled demo clock control.'};
  if((s.otpSends[key]||0)>=POLICY.maxSends)return {error:'Three sends reached for this purpose/contact. Reset the demo to start again.'};
  let code=String(Math.floor(100000+random()*900000));if(code===old?.code)code=String(100000+(Number(code)-100000+1)%900000);
  s.otp={purpose,target,key,code,expiresAt:now+POLICY.otpTtl,resendAt:now+POLICY.cooldown,attempts:0,lockedUntil:0,used:false,
    binding:purpose==='signing'?agreementFingerprint(s):''};
  s.otpSends[key]=(s.otpSends[key]||0)+1;record(s,`Mock ${purpose} OTP issued (${s.otpSends[key]}/${POLICY.maxSends})`,now);return {ok:true};}
export function verifyOtp(s,code,purpose,now=Date.now()){
  const o=s.otp;if(!o||o.purpose!==purpose)return {error:'Request an OTP for this verification first.'};
  if(now<o.lockedUntil)return {error:'OTP is locked after five failed attempts.'};
  if(o.used)return {error:'This OTP was already used. Request a new challenge.'};
  if(now>=o.expiresAt)return {error:'OTP expired. Request a new code.'};
  if(o.target!==(purpose==='email'?s.data.email:s.data.phone))return {error:'Contact changed. Request an OTP for the current contact.'};
  if(purpose==='signing'&&o.binding!==agreementFingerprint(s))return {error:'Agreement details changed. Request a fresh signing OTP.'};
  if(!/^\d{6}$/.test(code)||code!==o.code){o.attempts++;if(o.attempts>=POLICY.otpAttempts)o.lockedUntil=now+POLICY.lockDuration;
    return {error:o.lockedUntil?'Five incorrect attempts. OTP locked for 60 seconds.':`Incorrect six-digit code. ${POLICY.otpAttempts-o.attempts} attempts remaining.`};}
  o.used=true;if(purpose==='mobile')s.verifiedPhone=s.data.phone;if(purpose==='email')s.verifiedEmail=s.data.email;
  if(purpose==='signing')s.signFingerprint=agreementFingerprint(s);record(s,`Mock ${purpose} OTP verified`,now);return {ok:true};}
const before=(s,key,step)=>{const f=flow(s);return f.indexOf(key)<=f.indexOf(step)&&f.includes(step);};
export function invalidateFrom(s,key,now=Date.now()){
  const f=flow(s),i=f.indexOf(key);s.done=s.done.filter(k=>f.indexOf(k)<i);s.otp=null;s.signFingerprint='';
  if(before(s,key,'identity'))s.identityAt=0;
  if(before(s,key,'screening')){s.screeningAt=0;s.screeningOutcome='';}
  if(before(s,key,'consent')){s.consent=null;Object.assign(s.data,{terms:false,privacy:false,bureauConsent:false});}
  if(before(s,key,'eligibility')){s.eligibility=null;s.exception=null;}
  if(before(s,key,'bureau'))s.bureau=null;
  if(before(s,key,'collateral'))s.collateral=null;
  if(before(s,key,'affordability')){s.affordability=null;s.affordabilityReview='';}
  if(before(s,key,'decision')){s.decision=null;s.underwriting='';}
  if(before(s,key,'simulation'))s.simulation=null;
  if(before(s,key,'offer')&&s.offer){record(s,`Offer ${s.offer.version} superseded`,now);s.offer=null;s.data.kfs=false;}
  if(before(s,key,'signing'))Object.assign(s.data,{agreement:false,signature:''});
  record(s,`Rework: ${key}; downstream results invalidated`,now);}
export function completeStep(s,now=Date.now()){
  if(s.terminal||s.result)return {error:'This application is read-only.'};
  if(s.paused)return {error:'Authenticate to resume before continuing.'};
  const f=flow(s);if(f.slice(0,f.indexOf(s.step)).some(key=>!s.done.includes(key)))return {error:'Complete the preceding stages first.'};
  if(s.step==='signing')return {error:'Use the signing action to execute the agreement.'};
  const errors=validate(s,s.step,now);if(Object.keys(errors).length)return {errors};
  if(s.step==='consent')s.consent={version:POLICY.consentVersion,at:now,terms:true,privacy:true,bureau:true,dataSharing:!!s.data.dataSharing,marketing:!!s.data.marketing};
  if(s.step==='profile'){const d=s.data;s.profileFlag=d.clarification.trim().length>=15;}
  if(s.step==='decision'){const p=proposal(s);if(p.outcome==='NOT_AVAILABLE'){s.terminal='DECLINED';s.terminalReason='No offer can be simulated within the product and affordability limits.';record(s,'Simulation not available; application closed',now);return {ok:true};}
    s.data.acceptedAmount=String(p.amount);s.data.acceptedTenor=String(p.tenor);}
  if(s.step==='simulation'){const sim=simulate(s);s.simulation=sim;s.offerCount++;
    s.offer={version:`${s.ref}-OFFER-v${s.offerCount}`,amount:sim.amount,tenor:sim.tenor,rate:sim.rate,apr:sim.apr,installment:sim.installment,
      fee:sim.fee,protection:sim.protection,totalPayable:sim.totalPayable,grade:sim.grade,adjusted:sim.amount<num(s.data.amount)||sim.tenor<num(s.data.tenor),
      presentedAt:now,expiresAt:now+POLICY.offerDays*DAY,response:''};
    record(s,`Offer ${s.offer.version} constructed and presented`,now);}
  if(!s.done.includes(s.step))s.done.push(s.step);record(s,`${s.step} completed`,now);s.step=f[Math.min(f.indexOf(s.step)+1,f.length-1)];return {ok:true};}
export function runIdentity(s,now=Date.now()){
  const e=validate(s,'identity',now);delete e.identity;
  if(s.identityAttempts>=3&&!s.identityAt)return {errors:{identity:'Capture retry limit reached. Onboarding cannot continue on the current evidence.'}};
  if(s.scenario==='identity'&&s.identityAttempts===0)e.quality='Demo first capture has low match confidence. Retry the sample verification.';
  if(Object.keys(e).length){s.identityAttempts++;if(s.identityAttempts>=3){s.terminal='NOT VERIFIED';s.terminalReason='Identity could not be established to the required standard.';}
    record(s,`Identity attempt failed (${s.identityAttempts}/3)`,now);return {errors:e};}
  s.identityAt=now;record(s,s.data.customerType==='New'?'Sample eKYC and liveness verified':'Existing profile re-verified with selfie and liveness',now);return {ok:true};}
// Existing customers reuse bank-held profile and internal position (sample values only).
export function applyCustomerType(s){const d=s.data;
  if(d.customerType==='Existing')Object.assign(d,{internalConduct:'Clean internal history',relationshipMonths:'40'});
  else Object.assign(d,{cif:'',internalConduct:'No internal history',relationshipMonths:'0'});}
export function runScreening(s,now=Date.now()){
  if(!fresh(s.identityAt,POLICY.identityDays,now))return {error:'Identity evidence is missing or stale.'};
  const sample=s.data.screeningSample;
  if(sample==='Confirmed sanctions match'){s.terminal='COMPLIANCE RESTRICTED';s.terminalReason='A confirmed screening match prevents the bank from proceeding. This is a compliance outcome, not a credit decline.';
    record(s,'Screening: confirmed match; compliance restricted',now);return {ok:true};}
  if(sample==='Potential name match'||s.data.pep||s.scenario==='compliance'){s.screeningOutcome='referred';record(s,'Screening: referred for compliance review',now);return {ok:true};}
  s.screeningOutcome='cleared';s.screeningAt=now;record(s,'Screening cleared',now);return {ok:true};}
export function complianceOutcome(s,outcome,now=Date.now()){
  if(s.screeningOutcome!=='referred')return {error:'There is no pending compliance review.'};
  if(outcome==='clear'){s.screeningOutcome='cleared';s.screeningAt=now;record(s,'Compliance review cleared (simulated, independent of credit)',now);}
  else{s.terminal='COMPLIANCE RESTRICTED';s.terminalReason='Compliance review restricted the relationship. This is not a credit decline.';record(s,'Compliance review restricted',now);}
  return {ok:true};}
export function runEligibility(s,now=Date.now()){s.eligibility=evaluateEligibility(s,now);s.exception=null;
  record(s,`Eligibility ${s.eligibility.outcome} under ${POLICY.ruleSet}`,now);return {ok:true};}
export function approveException(s,now=Date.now()){
  if(s.eligibility?.outcome!=='REFERRED')return {error:'Only a referred discretionary criterion can be excepted.'};
  if(s.data.exceptionReason.trim().length<10)return {errors:{exceptionReason:'Record an exception reason of at least 10 characters.'}};
  s.exception={reason:s.data.exceptionReason.trim(),at:now};record(s,'Eligible with exception: '+s.exception.reason,now);return {ok:true};}
export function switchProduct(s,product,now=Date.now()){
  if(s.eligibility?.outcome!=='REDIRECT'||s.eligibility.alternative!==product)return {error:'No alternative product is offered.'};
  const step=s.step;s.product=product;invalidateFrom(s,'eligibility',now);s.step=step;
  s.data.amount=String(Math.min(num(s.data.amount),CATALOG_MAX[product]));
  record(s,`Customer accepted alternative product: ${PRODUCTS[product]}`,now);runEligibility(s,now);return {ok:true};}
export function runBureau(s,now=Date.now()){const d=s.data;
  if(!s.consent?.bureau||s.consent.version!==POLICY.consentVersion)return {error:'No valid bureau consent. The enquiry was not made.'};
  const retry=s.bureau?.status==='WAITING';
  if(!retry&&s.enquiries>=POLICY.maxEnquiries)return {error:'Enquiry limit reached for this application.'};
  if(!retry&&s.enquiries>=1&&d.enquiryReason.trim().length<10)return {errors:{enquiryReason:'A further enquiry needs an authorised reason (10+ characters).'}};
  const values={extObligations:num(d.extObligations),inquiries90:num(d.inquiries90),inquiries30:num(d.inquiries30),utilization:num(d.utilization)};
  for(const [k,v]of Object.entries(values))if(!Number.isFinite(v)||k==='utilization'&&v>150)return {errors:{[k]:'Enter a whole, non-negative sample value.'}};
  if(values.inquiries30>values.inquiries90)return {errors:{inquiries30:'30-day inquiries cannot exceed 90-day inquiries.'}};
  if(!retry)s.enquiries++;
  const ref=`${s.ref}-BUR-${s.enquiries}`;
  if(s.scenario==='bureau'&&!retry&&s.enquiries===1){s.bureau={status:'WAITING',ref,at:now};record(s,`Bureau enquiry ${ref} pending (simulated timeout)`,now);return {ok:true};}
  const profile=d.bureauProfile,status=profile==='Thin / no file'?'LIMITED':profile==='Disputed entry'?'FLAGGED':'COMPLETE';
  s.bureau={status,ref,profile,...values,purpose:s.enquiries>1?'Refresh: '+d.enquiryReason.trim():'Application assessment',at:now};
  record(s,`Bureau enquiry ${ref}: ${status}`,now);return {ok:true};}
export function runAppraisal(s,now=Date.now()){const d=s.data,value=num(d.collateralValue);
  const e=validate(s,'collateral',now);delete e.collateral;if(Object.keys(e).length)return {errors:e};
  const appraised=Math.round(value*(d.appraisalSample==='Lower than declared (−20%)'?.8:1)),ltv=LTV[d.collateralType];
  s.collateral={type:d.collateralType,declared:value,appraised,ltv,maxAmount:Math.floor(appraised*ltv/POLICY.amountStep)*POLICY.amountStep,at:now};
  record(s,`Collateral appraised at ${money(appraised)} (max LTV ${ltv*100}%)`,now);return {ok:true};}
export function uploadDocument(s,req,fileKey,now=Date.now()){
  if(s.terminal||s.paused)return {error:'Uploads are not permitted for this application state.'};
  if(s.step!=='documents')return {error:'Uploads are permitted only at the document stage in this demo.'};
  const need=requirements(s).find(r=>r.key===req);if(!need)return {error:'This requirement does not apply to the current application.'};
  const file=FILES[fileKey];if(!file)return {error:'Choose a sample file.'};
  const upload={id:`DOC-${String(s.uploads.length+1).padStart(3,'0')}`,req,file:file.name,at:now,status:'PENDING_REVIEW',
    reason:'Registered and available for downstream review. Upload success is not business acceptance.'};
  const fail=(status,reason)=>Object.assign(upload,{status,reason});
  if(s.scenario==='upload'&&!s.uploads.some(u=>u.status==='UPLOAD_FAILED'))fail('UPLOAD_FAILED','Simulated transfer interruption. Nothing was registered; retry the upload.');
  else if(!['PDF','JPG','PNG'].includes(file.format))fail('INVALID',`Unsupported format ${file.format}. Use PDF, JPG or PNG.`);
  else if(file.size>POLICY.maxFileMb)fail('INVALID',`${file.size} MB exceeds the ${POLICY.maxFileMb} MB limit.`);
  else if(file.encrypted)fail('INVALID','Password-protected files cannot be read.');
  else if(file.unreadable)fail('INVALID','The image is too blurred to read.');
  else if(file.purpose!==need.purpose)fail('REJECTED_CONTEXT',`Technically valid, but this file does not satisfy “${need.label}”.`);
  if(upload.status==='PENDING_REVIEW'){const prior=activeUpload(s,req);if(prior){prior.status='SUPERSEDED';prior.supersededBy=upload.id;upload.replaces=prior.id;}}
  s.uploads.push(upload);s.uploads=s.uploads.slice(-40);
  record(s,`${upload.id} ${file.name} → ${need.label}: ${upload.status}${upload.replaces?' (replaces '+upload.replaces+')':''}`,now);
  return upload.status==='PENDING_REVIEW'?{ok:true,upload}:{error:upload.reason,upload};}
export function runAffordability(s,now=Date.now()){s.affordability=assessAffordability(s);s.affordabilityReview='';
  record(s,`Affordability ${s.affordability.outcome}${s.affordability.dsr!==undefined?` (DSR ${s.affordability.dsr}%, DTI ${s.affordability.dti}%)`:''}`,now);return {ok:true};}
export function affordabilityReview(s,outcome,now=Date.now()){
  if(s.affordability?.outcome!=='REFERRED')return {error:'No affordability referral is pending.'};
  if(outcome==='accept'){s.affordabilityReview='accepted';record(s,'Affordability specialist accepted evidenced income',now);}
  else{s.terminal='DECLINED';s.terminalReason='Available evidence does not support the declared repayment capacity.';record(s,'Affordability specialist declined',now);}
  return {ok:true};}
export function runEngine(s,now=Date.now()){const r=runDecision(s,now);s.decision=r;s.underwriting='';
  // Customers see a neutral message; reason codes stay internal (shown separately in the demo).
  if(r.outcome==='REJECT'){s.terminal='DECLINED';s.terminalReason='The application could not be approved on the current information.';}
  record(s,`Decision engine: ${r.outcome}${r.grade?` · ${r.grade} ${r.score}`:''}${r.stage?` · ${r.stage}`:''}`,now);return {ok:true};}
export function underwriterOutcome(s,outcome,now=Date.now()){
  if(s.decision?.outcome!=='REFER')return {error:'No referral is pending.'};
  if(outcome==='approve'){s.underwriting='approved';record(s,'Underwriter approved the referred case (simulated)',now);}
  else{s.terminal='DECLINED';s.terminalReason='Declined after manual underwriting review.';record(s,'Underwriter declined (simulated)',now);}
  return {ok:true};}
export function respondOffer(s,response,now=Date.now()){const o=s.offer;
  if(!o||s.step!=='offer'||s.terminal)return {error:'No current offer is awaiting a response.'};
  if(now>=o.expiresAt){s.terminal='OFFER EXPIRED';s.terminalReason='The customer did not respond within the offer window.';record(s,`Offer ${o.version} expired`,now);return {ok:true};}
  if(response==='ACCEPTED'){if(!s.data.kfs)return {errors:{kfs:'Confirm you have read the key facts statement before accepting.'}};
    o.response='ACCEPTED';o.respondedAt=now;record(s,`Offer ${o.version} accepted`,now);return {ok:true};}
  if(response==='DECLINED'){o.response='DECLINED';s.terminal='OFFER DECLINED';s.terminalReason='The customer declined the offered terms.';record(s,`Offer ${o.version} declined by customer`,now);return {ok:true};}
  return {error:'Unsupported response.'};}
export function signAgreement(s,now=Date.now()){
  if(s.result)return {ok:true,result:s.result,reused:true};
  if(s.paused)return {error:'Authenticate to resume before signing.'};
  if(s.terminal||s.step!=='signing')return {error:'A current accepted offer is required.'};
  if(s.offer&&now>=s.offer.expiresAt){s.terminal='OFFER EXPIRED';s.terminalReason='The offer expired before signing completed.';return {ok:true};}
  const errors=validate(s,'signing',now);if(Object.keys(errors).length)return {errors};
  s.signAttempts++;
  if(s.scenario==='signing'&&s.signAttempts===1){record(s,'Signing provider timeout; agreement not executed',now);return {error:'Simulated signing timeout. The agreement was not executed. Retry the same package.'};}
  s.result={agreementRef:`${s.ref}-AGR`,offerVersion:s.offer.version,signedAt:now};s.notification=s.scenario==='notification'?'failed':'delivered';
  s.terminal='COMPLETED';s.done.push('signing');s.step='complete';record(s,`Agreement ${s.result.agreementRef} signed for ${s.offer.version}`,now);return {ok:true,result:s.result};}
export function revalidateOnResume(s,now=Date.now()){
  s.otp=null;s.signFingerprint='';
  if(s.terminal)return s.terminal;
  if(now-s.updatedAt>POLICY.inactivityDays*DAY){s.terminal='EXPIRED';s.terminalReason='The saved application expired after inactivity.';return 'EXPIRED';}
  if(s.offer&&now>=s.offer.expiresAt){s.terminal='OFFER EXPIRED';s.terminalReason='The offer window closed while the application was saved.';return 'OFFER EXPIRED';}
  if(s.identityAt&&(!fresh(s.identityAt,POLICY.identityDays,now)||s.data.customerType==='New'&&s.data.documentExpiry<new Date(now).toISOString().slice(0,10))){invalidateFrom(s,'identity',now);s.step='identity';return 'Identity evidence is stale or expired. Verify again.';}
  if(s.screeningAt&&!fresh(s.screeningAt,POLICY.screeningDays,now)){invalidateFrom(s,'screening',now);s.step='screening';return 'Screening is stale. Run checks again.';}
  if(s.consent&&s.consent.version!==POLICY.consentVersion){invalidateFrom(s,'consent',now);s.step='consent';return 'Terms version changed. Reconfirm consent.';}
  if(s.bureau?.at&&!fresh(s.bureau.at,POLICY.bureauDays,now)){invalidateFrom(s,'bureau',now);s.step='bureau';return 'The bureau result is stale. A refresh enquiry is required.';}
  if(s.step==='signing')return 'Saved progress restored. A fresh signing OTP is required.';
  return 'Saved progress restored. Previous session OTPs were invalidated.';}
const ELIGIBILITY_LABEL={ELIGIBLE:['Eligible','USABLE'],REDIRECT:['Eligible for alternative product','REDIRECT'],REFERRED:['Refer for manual review','REFERRED'],NOT_ELIGIBLE:['Not eligible','NEGATIVE']};
const BUREAU_LABEL={COMPLETE:['Complete credit picture','USABLE'],LIMITED:['Limited credit history','LIMITED'],FLAGGED:['Disputed information present','FLAGGED'],WAITING:['Pending bureau response','WAITING']};
const AFFORD_LABEL={ACCEPTABLE:['Acceptable','USABLE'],BORDERLINE:['Borderline','REVIEW'],INSUFFICIENT:['Insufficient','NEGATIVE'],REFERRED:['Refer for manual review','REFERRED'],PENDING:['Pending additional information','WAITING']};
// Domain outcome taxonomy from the Journey, shown beside the application.
export function outcomes(s){const rows=[],done=k=>s.done.includes(k),f=flow(s),reached=k=>f.indexOf(k)>=0&&f.indexOf(k)<=f.indexOf(s.step);
  if(!s.product)return rows;
  rows.push(['Registration & Onboarding',...(s.terminal==='COMPLIANCE RESTRICTED'?['Compliance restricted','BLOCKED']:s.terminal==='NOT VERIFIED'?['Not verified','NEGATIVE']
    :done('consent')?['Verified and permitted','USABLE']:s.screeningOutcome==='referred'?['Refer for manual review','REFERRED']:['Pending additional verification','WAITING'])]);
  if(reached('profile'))rows.push(['Profile & Information',...(done('profile')?[s.profileFlag?'Complete (clarified)':'Complete','USABLE']:['Pending additional information','WAITING'])]);
  if(s.eligibility)rows.push(['Eligibility Check',...(s.exception?['Eligible with exception','CONDITIONAL']:ELIGIBILITY_LABEL[s.eligibility.outcome])]);
  if(s.bureau)rows.push(['Credit Assessment',...BUREAU_LABEL[s.bureau.status]]);
  if(s.collateral)rows.push(['Collateral',`Appraised ${money(s.collateral.appraised)}`,'USABLE']);
  if(reached('documents')&&s.step!=='documents'||done('documents'))rows.push(['Document Upload','Pending downstream review','WAITING']);
  if(s.affordability)rows.push(['Income & Affordability',...AFFORD_LABEL[s.affordability.outcome]]);
  if(s.decision?.stage==='INTERNAL')rows.push(['Risk Assessment','Rejected at internal assessment','NEGATIVE']);
  else if(s.decision?.stage==='EXTERNAL')rows.push(['Risk Assessment','Rejected at external assessment','NEGATIVE']);
  else if(s.decision?.stage==='SCORE')rows.push(['Risk Assessment','Rejected at score cut-off','NEGATIVE']);
  else if(s.decision?.grade)rows.push(['Risk Assessment',`Passed and graded ${s.decision.grade} (${s.decision.score})`,'USABLE']);
  if(s.decision?.outcome&&s.decision.outcome!=='PENDING')rows.push(['Decision Engine',s.decision.outcome==='REFER'?(s.underwriting==='approved'?'Refer → approved':'Refer'):s.decision.outcome==='REJECT'?'Reject':'Continue',
    s.decision.outcome==='REJECT'?'NEGATIVE':s.decision.outcome==='REFER'&&s.underwriting!=='approved'?'REFERRED':'USABLE']);
  if(s.offer)rows.push(['Loan Product & Simulation',s.offer.adjusted?'Available with adjusted terms':'Simulation available','USABLE']);
  if(s.offer)rows.push(['Offer & Agreement',...(s.result?['Agreement signed','USABLE']:s.terminal==='OFFER DECLINED'?['Offer declined by customer','NEGATIVE']
    :s.terminal==='OFFER EXPIRED'?['Offer expired','NEGATIVE']:s.offer.response==='ACCEPTED'?['Offer accepted','USABLE']:['Offer generated','USABLE'])]);
  return rows;}
