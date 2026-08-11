import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks=vi.hoisted(()=>({getAccessibleContentIds:vi.fn(),contentFindMany:vi.fn(),scopeFindMany:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/server/access-control/knowledge-access-repository',()=>({getAccessibleContentIds:mocks.getAccessibleContentIds}));
vi.mock('@/lib/membership',()=>({requirePremiumAccess:vi.fn()}));
vi.mock('@/server/access-control/require-knowledge-access',()=>({requireContentSlugAccess:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{contentItem:{findMany:mocks.contentFindMany},knowledgeScope:{findMany:mocks.scopeFindMany}}}));
import { ContentRepository } from './repository';

const records=[
  {id:'allowed',type:'BANKING_JOURNEY' as const,slug:'allowed',previewJson:JSON.stringify({title:'Authorized Journey',summary:'Visible'}),publishedRevision:{publishedAt:new Date('2026-08-09'),updatedAt:new Date('2026-08-09')},isArchived:false,publishedRevisionId:'published'},
  {id:'unauthorized',type:'BANKING_JOURNEY' as const,slug:'secret',previewJson:JSON.stringify({title:'Unauthorized Journey',summary:'Secret'}),publishedRevision:{publishedAt:new Date('2026-08-10'),updatedAt:new Date('2026-08-10')},isArchived:false,publishedRevisionId:'published'},
  {id:'archived',type:'BANKING_JOURNEY' as const,slug:'archived',previewJson:JSON.stringify({title:'Archived Journey',summary:'Archived'}),publishedRevision:{publishedAt:new Date('2026-08-08'),updatedAt:new Date('2026-08-08')},isArchived:true,publishedRevisionId:'published'},
  {id:'draft',type:'BANKING_JOURNEY' as const,slug:'draft',previewJson:JSON.stringify({title:'Draft Journey',summary:'Draft'}),publishedRevision:null,isArchived:false,publishedRevisionId:null},
];

describe('Member Home repository boundary',()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.getAccessibleContentIds.mockResolvedValue(['allowed','archived','draft']);mocks.contentFindMany.mockImplementation(({where}:{where:{id:{in:string[]};isArchived:boolean;publishedRevisionId:{not:null}}})=>Promise.resolve(records.filter(item=>where.id.in.includes(item.id)&&item.isArchived===where.isArchived&&item.publishedRevisionId!==null)));mocks.scopeFindMany.mockResolvedValue([{code:'PAYMENTS',nameEn:'Payments',nameVi:'Thanh toán',descriptionEn:'Payment knowledge',descriptionVi:'Kiến thức thanh toán'}])});
  it('queries display metadata only for authorized IDs and excludes archived/unpublished records',async()=>{const result=await ContentRepository.getMemberHomeData('member-1','en');expect(mocks.getAccessibleContentIds).toHaveBeenCalledWith('member-1',{permission:'VIEW'});expect(mocks.contentFindMany).toHaveBeenCalledWith(expect.objectContaining({where:{id:{in:['allowed','archived','draft']},isArchived:false,publishedRevisionId:{not:null}}}));expect(result.recentlyUpdated.map(item=>item.title)).toEqual(['Authorized Journey']);expect(JSON.stringify(result)).not.toContain('Unauthorized Journey');expect(JSON.stringify(result)).not.toContain('Archived Journey');expect(JSON.stringify(result)).not.toContain('Draft Journey')});
  it('does not expose English recently-updated previews under Vietnamese locale',async()=>{const result=await ContentRepository.getMemberHomeData('member-1','vi');expect(result.recentlyUpdated).toEqual([]);expect(result.domains[0]?.name).toBe('Thanh toán')});
  it('does not query protected display metadata when no content is authorized',async()=>{mocks.getAccessibleContentIds.mockResolvedValue([]);expect(await ContentRepository.getMemberHomeData('member-1','en')).toEqual({permittedTypes:[],domains:[],recentlyUpdated:[]});expect(mocks.contentFindMany).not.toHaveBeenCalled();expect(mocks.scopeFindMany).not.toHaveBeenCalled()});
});
