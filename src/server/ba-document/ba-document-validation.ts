import { baDocumentContentSchema, artifactIdPattern, type BaDocumentContentV1 } from './ba-document-domain';

export type BaDocumentValidationCategory = 'JSON_PARSE' | 'SCHEMA' | 'ARTIFACT_ID' | 'REFERENCE' | 'BUSINESS_RULE';
export type BaDocumentValidationIssue = {
  category: BaDocumentValidationCategory;
  path: string;
  moduleId?: string;
  sectionId?: string;
  blockId?: string;
  artifactId?: string;
  field?: string;
  code: string;
  message: string;
};
export type BaDocumentValidationResult = {
  status: 'VALID' | 'INVALID_JSON' | 'INVALID_SCHEMA' | 'INVALID_REFERENCES';
  issueCount: number;
  groups: { blocks: number; artifacts: number; other: number };
  nonCanonicalBlockCount: number;
  issues: BaDocumentValidationIssue[];
  content?: BaDocumentContentV1;
};

function record(value: unknown): Record<string, unknown> | undefined { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function at(value: unknown, path: PropertyKey[]) { let current=value; for(const part of path){if(current==null||typeof current!=='object')return undefined;current=(current as Record<PropertyKey,unknown>)[part];} return current; }
function category(path:string,message:string):BaDocumentValidationCategory {
  if(path.endsWith('.id')&&/pattern|artifact/i.test(message))return 'ARTIFACT_ID';
  if(/dependency|missing artifact reference|wrong-kind artifact reference|reference is required/i.test(message))return 'REFERENCE';
  if(/rationale|source|outcome|condition|logic|classification|responsibility/i.test(message))return 'BUSINESS_RULE';
  return 'SCHEMA';
}
function clearerMessage(path:string,message:string,value:unknown) {
  if(path.endsWith('.id')&&typeof value==='string'&&!artifactIdPattern.test(value))return `Invalid stable artifact ID "${value}". Expected Journey-prefix first, for example ONB-FR-001.`;
  if(message.startsWith('Invalid input: expected')&&message.includes('received undefined'))return `Missing required field "${path.split('.').at(-1)}".`;
  if(path.endsWith('.schemaVersion'))return 'Missing or invalid schemaVersion. Canonical blocks require schemaVersion: 1.';
  if(path.endsWith('.blockType'))return 'Missing or unsupported blockType. Use an approved canonical block type.';
  if(path.endsWith('.payload'))return 'Missing payload. Canonical blocks require a payload object.';
  return message;
}

export function validateBaDocumentJson(text:string):BaDocumentValidationResult {
  let input:unknown;
  try{input=JSON.parse(text);}catch(error){return {status:'INVALID_JSON',issueCount:1,groups:{blocks:0,artifacts:0,other:1},nonCanonicalBlockCount:0,issues:[{category:'JSON_PARSE',path:'$',code:'invalid_json',message:error instanceof Error?`Invalid JSON: ${error.message}`:'Invalid JSON.'}]};}
  const result=baDocumentContentSchema.safeParse(input);
  if(result.success)return {status:'VALID',issueCount:0,groups:{blocks:0,artifacts:0,other:0},nonCanonicalBlockCount:0,issues:[],content:result.data};
  const legacyBlocks=new Set<string>();
  const issues=result.error.issues.map((issue):BaDocumentValidationIssue=>{
    const path=issue.path.map(String).join('.'); const value=at(input,issue.path);
    const moduleIndex=Number(issue.path[1]),sectionIndex=Number(issue.path[3]),blockIndex=Number(issue.path[5]);
    const moduleValue=record(at(input,['modules',moduleIndex])),section=record(at(input,['modules',moduleIndex,'sections',sectionIndex])),block=record(at(input,['modules',moduleIndex,'sections',sectionIndex,'blocks',blockIndex]));
    if(block&&typeof block.type==='string'&&(!('schemaVersion' in block)||!('blockType' in block)||!('payload' in block)))legacyBlocks.add(`modules.${moduleIndex}.sections.${sectionIndex}.blocks.${blockIndex}`);
    const artifact=issue.path[0]==='artifacts'?record(at(input,issue.path.slice(0,3))):undefined;
    return {category:category(path,issue.message),path:path||'$',moduleId:typeof moduleValue?.id==='string'?moduleValue.id:undefined,sectionId:typeof section?.id==='string'?section.id:undefined,blockId:typeof block?.id==='string'?block.id:undefined,artifactId:typeof artifact?.id==='string'?artifact.id:undefined,field:issue.path.length?String(issue.path.at(-1)):undefined,code:issue.code,message:clearerMessage(path,issue.message,value)};
  });
  const groups={blocks:issues.filter(i=>i.path.startsWith('modules.')).length,artifacts:issues.filter(i=>i.path.startsWith('artifacts.')).length,other:issues.filter(i=>!i.path.startsWith('modules.')&&!i.path.startsWith('artifacts.')).length};
  for(const blockPath of legacyBlocks){const block=record(at(input,blockPath.split('.').map(part=>/^\d+$/.test(part)?Number(part):part)));issues.unshift({category:'SCHEMA',path:blockPath,blockId:typeof block?.id==='string'?block.id:undefined,code:'non_canonical_block',message:`Non-canonical block shape${typeof block?.type==='string'?` "${block.type}"`:''}. Expected id + schemaVersion + blockType + payload.`});}
  const references=issues.some(issue=>issue.category==='REFERENCE');
  return {status:references?'INVALID_REFERENCES':'INVALID_SCHEMA',issueCount:result.error.issues.length,groups,nonCanonicalBlockCount:legacyBlocks.size,issues};
}
