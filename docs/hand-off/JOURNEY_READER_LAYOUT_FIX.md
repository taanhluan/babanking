# Journey reader layout — Development only

2026-09-21: Owner requested a minimum Development fix for unequal prose/table cards and sticky navigation disappearing behind the header.

- Prose card now fills the available column, matching table cards. Inner prose retains its readable line-length limit.
- Canonical Journey and Payments portal outer wrappers use overflow-x-clip instead of overflow-hidden. Clipping no longer creates a non-scrolling scroll container that traps descendant sticky navigation.
- CMS JSON, whitespace, publication, scopes and Production are unchanged.
- Focused renderer tests, ESLint and TypeScript passed. Desktop/mobile visual acceptance remains to be checked by the owner; no Production deployment of this fix.

Previous release completed: SME/Enterprise deployment dpl_Ax17XtPyPVPzJg3Z1hu2SvtTjgcq is READY at babanking.vercel.app. Production read-back matched 20 Journey hashes/scopes and two Segment hashes. Retail pointer cmu8dyar10003gm7dnshiuol5 and canonical hash 2e7811e638e5857c5f1bbc1485b4aaa9761fc44fd20368084d5137356bce9b7f stayed unchanged. Three temporary promotion variables were removed. Authenticated browser confirmed 10 SME cards, 10 Enterprise cards and a 13-module Enterprise lending reader.
