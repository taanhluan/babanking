# Phase 0 — Knowledge Content Model

## Hierarchy

```text
Journey
  └── Module
        └── Section
              └── Block
                    └── Asset reference
```

## Journey

Conceptual metadata: stable key, slug, title, summary, difficulty, estimated time, tags, prerequisites, target audience, owner, visibility, locale availability, and publication status.

## Module

A meaningful learning/reading group inside a Journey, such as Business Overview, Payment Process, Architecture, API, Business Rules, Case Study, or Downloads. Modules are structure only; they do not create separate access permissions.

## Section

An ordered subsection inside a Module, with a stable key, title, display order, and optional presentation metadata.

## Block

The smallest rendered content unit. Initial types: Rich Text, Table, Image, Diagram, API, Code, Download, Reference, and Callout. Blocks must carry a type and schema version; detailed payload schemas are Phase 1 design work.

## Translation

English and Vietnamese are independent content representations with independent status and publication lifecycle.

## Revision

An immutable snapshot of a translation. Editing creates a new draft revision; only a published revision is public.

## Asset

Neon stores metadata and storage key. Object Storage stores PNG, SVG, PDF, Excel, PPT, ZIP, Draw.io, Visio, OpenAPI, and Postman binaries. Assets are reachable only through an authorized Journey download flow.
