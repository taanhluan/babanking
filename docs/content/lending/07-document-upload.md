# 7. Document Upload

> Digital Lending Onboarding — module 7 of 10. Exported from Development `lending` v6.

[← Digital Lending Onboarding](README.md) · [Previous: Loan Product & Simulation](06-loan-product-simulation.md) · [Next: Risk Assessment](08-risk-assessment.md)

## Contents

- [7.1 Business Definition](#71-business-definition)
- [7.2 Business Responsibilities](#72-business-responsibilities)
- [7.3 Relationship with Other Domains](#73-relationship-with-other-domains)
- [7.4 Business Purpose](#74-business-purpose)
- [7.5 Upload Stages](#75-upload-stages)
- [7.6 Typical Upload Outcomes](#76-typical-upload-outcomes)
- [7.7 Upload Inputs and Controls](#77-upload-inputs-and-controls)
- [7.8 Overview: Uploading Documents in the Lending Journey](#78-overview-uploading-documents-in-the-lending-journey)
- [7.9 Common Document Types Uploaded](#79-common-document-types-uploaded)
- [7.10 Upload Methods](#710-upload-methods)
- [7.11 Business Rules](#711-business-rules)
- [7.12 Overview: How Document Upload Is Used for Decision Making and Process Progression](#712-overview-how-document-upload-is-used-for-decision-making-and-process-progression)
- [7.13 Decision Uses](#713-decision-uses)
- [7.14 Typical Decision Logic Patterns](#714-typical-decision-logic-patterns)
- [7.15 Example Scenarios](#715-example-scenarios)
- [7.16 Key Business Concepts](#716-key-business-concepts)

## 7.1 Business Definition

The Document Upload Domain manages the business capability that enables required and supporting documents to be submitted into the lending process in a controlled, usable, and traceable way.

In a digital lending journey, this domain:
- Accepts customer and staff uploaded files
- Associates uploaded files to the correct application, applicant, requirement, and process stage
- Performs technical and basic business validation on uploaded files
- Stores document metadata and file references for downstream use
- Supports replacement, re-upload, and version handling where permitted
- Publishes uploaded document availability and status to downstream domains

Document Upload does not itself:
- Define which documents must be requested from the customer
- Perform full document content review or business approval
- Make lending decisions, grades, or offers
- Disburse funds
- Manage customer follow-up or reminder workflows

Instead, it produces a structured uploaded-document record, technical validation result, metadata set, version history, and availability status that downstream domains can consume.

## 7.2 Business Responsibilities

- Receive uploaded documents from supported customer, staff, and system-assisted channels
- Validate whether the file is technically acceptable, complete, readable, and policy-permitted for upload
- Link each uploaded file to the correct lending context, including case, applicant, requirement, and stage
- Record metadata such as file type, source, uploader, timestamp, format, and version indicators
- Support replacement and re-upload when prior submissions are invalid, outdated, or incorrectly attached
- Maintain version traceability so current and prior uploads can be distinguished clearly
- Provide upload outcomes and availability status for downstream use
- Make valid uploaded documents accessible to permitted review, verification, assessment, operations, and pre-disbursement processes
- Retain upload history, validation results, and actor actions for auditability

## 7.3 Relationship with Other Domains

The Document Upload Domain operates as part of the wider digital lending journey. It receives upload actions from customer and employee channels, validates and registers files, and provides uploaded document availability to downstream processes without itself determining business acceptance.

| Business Domain | Relationship to Document Upload | What Is Exchanged |
|---|---|---|
| Retail Lending Customer Portal | Provides customer upload actions and receives upload outcomes | Customer-submitted files; Upload confirmations; Technical error messages; And document status updates. |
| Employee Portal / Review Workflow | Supports assisted and operational upload actions | Staff-uploaded files; Replacement actions; Upload history; And document availability status. |
| Application Management | Provides case and stage context | Application identifier; Applicant identifiers; Product context; And current stage. |
| Document Requirements / Checklist | Provides document-purpose mapping and expected evidence context | Requirement identifiers; Expected document type; Mandatory or optional indicators; And stage applicability. |
| Document Review / Verification | Consumes uploaded documents for business assessment | File references; Metadata; Upload timestamps; Validation outcomes; And version history. |
| Identity Verification | Consumes uploaded identity evidence | ID document uploads; Proof-of-address uploads; And associated metadata. |
| Income & Affordability | Consumes supporting financial evidence readiness | Payslips; Bank statements; Tax documents; And evidence availability status. |
| Risk Assessment | Consumes evidence availability and document status as assessment input | Whether required uploads exist; Whether files are usable; And whether evidence is available. For assessment in 8. Risk Assessment |
| Decision Engine | Consumes document readiness indicators as part of progression control | Blocking conditions; Upload validity indicators; And evidence readiness signals. Used before or alongside decision logic in 9. Decision Engine |
| Core Lending / Loan Origination | Uses documents before fulfillment and disbursement | Signed forms; Final supporting documents; And operational document references. |
| Notification Services | Consumes upload outcome triggers | Upload success events; Upload failure events; And status changes. Requiring customer follow-up |

## 7.4 Business Purpose

The Document Upload Domain ensures that supporting documents can enter the lending process in a way that is reliable, traceable, policy-aligned, and usable by downstream business functions from application registration through disbursement.

This domain serves five core business purposes:

| Business Purpose | Why It Matters |
|---|---|
| Evidence Availability | Ensures required supporting files can enter the process and become available for review, verification, assessment, and operations |
| Process Continuity | Prevents applications from stalling because files are uploaded incorrectly, linked wrongly, or become unavailable to downstream users |
| Operational Control | Provides a structured way to track what was uploaded, replaced, rejected, or failed across the lending journey |
| Risk Reduction | Helps avoid reliance on corrupted, incomplete, misclassified, or out-of-stage documents in downstream assessment and decisioning |
| Audit and Traceability | Supports explainability by preserving document upload history, uploader actions, file lineage, and validation outcomes throughout the case lifecycle |

## 7.5 Upload Stages

| # | Stage | Objective | Possible Outcome |
|---|---|---|---|
| 1 | Upload Initiation | Capture the actor, case, and document context before transfer begins | Continue to file transfer, or stop if the upload is not permitted for the actor, case, or stage |
| 2 | File Transfer | Receive the file from the originating channel with transport integrity and completion controls | Transfer failed, or continue to technical validation |
| 3 | Technical Validation | Determine whether the uploaded file is technically acceptable for use | Invalid file, rejected for technical reasons, or continue to registration |
| 4 | Context Registration | Link the accepted file to the correct application, applicant, requirement, and document purpose | Rejected for current context, or continue to availability publication |
| 5 | Availability Publication | Publish the uploaded file and metadata for permitted downstream use | Uploaded successfully, pending downstream review, or restricted by downstream state rules |
| 6 | Replacement or Re-upload | Accept a corrected or newer file while preserving prior upload history | Uploaded with replacement, superseded prior version, or rejected if replacement is not permitted |

STAGE 1: UPLOAD INITIATION

This stage begins when a customer, staff user, or supported system action attempts to submit a document for a lending case.

▸ Purpose
To capture the upload request in the correct business context before file transfer starts.

▸ What this stage commonly reviews
- Who is attempting the upload
- Which application or case the file belongs to
- Which applicant or party the file relates to
- Which requirement or document purpose the upload is intended to satisfy
- Whether the current process stage allows the upload

▸ Typical smaller steps
- Capture actor and channel context
- Capture application and applicant context
- Capture intended document category or requirement mapping
- Check whether upload initiation is permitted for the current role and stage
- Create the initial upload request record

STAGE 2: FILE TRANSFER

This stage transmits the selected file from the upload channel into the upload service.

▸ Purpose
To receive the file completely and reliably before any business use is attempted.

▸ What this stage commonly reviews
- Transfer completion
- Transport success
- Basic file receipt integrity
- System response handling if transfer fails

▸ Typical smaller steps
- Start the file transmission
- Monitor transfer progress and completeness
- Detect interrupted or incomplete transfer
- Store the received file temporarily for validation
- Produce a transfer success or failure result

STAGE 3: TECHNICAL VALIDATION

Once the file is received, the domain determines whether it is technically usable.

▸ Purpose
To stop technically unacceptable files before they are registered for downstream use.

▸ What this stage commonly reviews
- Supported format
- File size limits
- Corruption or unreadable structure
- Password protection or encryption restrictions
- Upload completeness
- Basic readability, such as whether the image is too blurry, dark, cropped, or rotated incorrectly

▸ Typical smaller steps
- Check file format against supported types
- Check file size and basic structural integrity
- Detect corruption, encryption, or password protection issues
- Assess basic readability and usability constraints
- Produce a technical validation result

STAGE 4: CONTEXT REGISTRATION

If the file passes technical validation, the domain links it to the correct lending context.

▸ Purpose
To ensure the uploaded file is attached to the right business object and can be interpreted correctly downstream.

▸ What this stage commonly reviews
- Application identifier
- Applicant identifier
- Requirement or checklist item
- Document category and purpose
- Stage relevance
- Uploader identity and source channel

▸ Typical smaller steps
- Retrieve the target case context
- Confirm the intended requirement or document category
- Record metadata and uploader details
- Link the file reference to the correct lending context
- Reject the registration if the context is invalid or no longer allowed

STAGE 5: AVAILABILITY PUBLICATION

After registration, the uploaded document becomes visible to permitted downstream users and systems.

▸ Purpose
To make usable uploaded evidence available without implying business approval.

▸ What this stage commonly reviews
- Permissions for downstream access
- Current upload status
- Whether the document should be exposed for review, verification, assessment, operations, or pre-disbursement use
- Whether downstream controls require the file to remain pending review

▸ Typical smaller steps
- Publish file reference and metadata
- Expose upload status to permitted consumers
- Mark the file as pending downstream review where appropriate
- Enable visibility in downstream workflow or servicing tools
- Record publication timing and status

STAGE 6: REPLACEMENT OR RE-UPLOAD

If a file is outdated, invalid, unclear, or incorrectly attached, a corrected or newer version may be submitted.

▸ Purpose
To preserve upload continuity while maintaining clear lineage between prior and current submissions.

▸ What this stage commonly reviews
- Whether replacement is allowed for the current stage
- Why the prior upload is being replaced
- Which upload becomes the active version
- How prior file history should remain visible

▸ Typical smaller steps
- Receive the replacement request
- Validate that replacement is permitted
- Accept and validate the new file
- Mark the older upload as superseded where appropriate
- Preserve lineage, timestamps, and actor history

## 7.6 Typical Upload Outcomes

| Upload State | Category | Description |
|---|---|---|
| Uploaded Successfully | USABLE | The file was received, passed technical validation, linked correctly, and made available for downstream use |
| Upload Failed | NEGATIVE | The file could not be received or stored because transfer or system processing failed |
| Invalid File | NEGATIVE | The file was submitted but did not meet technical acceptance rules such as supported format, size, integrity, or readability standards |
| Uploaded with Replacement | USABLE | A new valid file superseded a prior upload while preserving history |
| Pending Downstream Review | WAITING | The upload is complete and usable at the upload level, but downstream review or verification has not yet determined business acceptance |
| Rejected for Current Context | NEGATIVE | The file may be technically valid but is not permitted for the current application stage, actor role, or requirement mapping |

## 7.7 Upload Inputs and Controls

The six-step flow depends on reliable context, approved channels, and technical controls. Before and across the steps, the domain should maintain the following controls:

- Use only approved customer, staff, and system-assisted upload channels
- Check application, applicant, and requirement context before final registration
- Validate file structure, size, format, and basic readability before downstream publication
- Enforce stage and role permissions for upload, replacement, and access
- Preserve version history and active-version indicators when a file is replaced
- Retain timestamps, uploader identity, validation outcomes, and audit history for traceability

## 7.8 Overview: Uploading Documents in the Lending Journey

In digital lending, document upload usually happens progressively as the application moves from registration through assessment, approval preparation, and pre-disbursement operations. The aim is to let supporting files enter the process at the point they become needed, while ensuring each upload is usable and correctly tied to the case.

Upload design typically balances three needs: customer simplicity, operational control, and downstream usability. Simple journeys may only need a few guided uploads, while more complex applications may require repeated uploads, corrected versions, and different document types across multiple stages.

## 7.9 Common Document Types Uploaded

| Document Category | Typical Information Uploaded |
|---|---|
| Identity Documents | National ID; Passport; Driver license; Residence permit. |
| Address Evidence | Utility bill; Bank statement; Residence confirmation. |
| Income Evidence | Payslips; Bank statements; Tax filings; Employer letters. |
| Employment or Business Evidence | Employment contracts; Business registration documents; Invoices; Business financial records. |
| Application Support Documents | Signed forms; Declarations; Consent documents; Product-specific supporting files. |
| Pre-Disbursement Documents | Final signed agreements; Conditions-precedent evidence; Banking details proof where required. |

## 7.10 Upload Methods

- Customer upload through digital portal: The customer submits files directly during application progression
- Staff-assisted upload: Bank employees upload documents received through assisted servicing or branch-supported journeys
- Replacement upload: A corrected or newer file is submitted to replace a prior unusable or outdated upload
- Stage-specific upload: Certain files are uploaded only when the case reaches underwriting, approval preparation, or pre-disbursement stages
- Multi-party upload: Co-applicants, guarantors, or internal users may upload documents tied to the same lending case under controlled permissions

## 7.11 Business Rules

- Uploads must be linked to a valid lending context: A file must be associated with the correct application, applicant, and intended document purpose
- Technical acceptance rules apply before downstream use: Unsupported, oversized, incomplete, corrupted, or restricted files should not progress as usable uploads
- Upload permissions are stage and role dependent: The ability to upload, replace, or view a document may depend on application state and user role
- One requirement may allow multiple files: Some document needs are satisfied by a set of pages or multiple supporting files rather than a single upload
- Replacement must preserve history: When a file is re-uploaded, prior submissions should remain traceable even if they are no longer current
- Successful upload does not equal business acceptance: A technically valid upload may still later fail review, verification, or policy checks
- Document availability may block progression: Certain lending stages cannot proceed until required uploads are present and usable
- Pre-disbursement uploads are still in scope: Final document submission before funds release remains part of the upload capability up to disbursement

## 7.12 Overview: How Document Upload Is Used for Decision Making and Process Progression

Once documents are uploaded successfully, their availability becomes an important input into lending progression. Upload status helps determine whether the application can proceed to review, verification, risk assessment, decisioning, approval preparation, fulfillment, or disbursement readiness.

## 7.13 Decision Uses

| Decision Use | How the Upload Status Is Used |
|---|---|
| Process Readiness Check | Confirms whether required supporting documents have been uploaded for the current stage |
| Verification Enablement | Allows identity, income, employment, or compliance review to begin because the needed files are available |
| Risk Assessment Input | Provides evidence availability and supporting documents needed for assessment inputs, validation, and reassessment |
| Decision Engine Gating | Provides blocking or readiness indicators used before or alongside automated decision logic |
| Underwriting Support | Provides underwriters and reviewers access to the latest document set and upload history |
| Exception Triggering | Flags upload failures, invalid files, missing stage-critical uploads, or mismapped documents for intervention |
| Conditional Progression | Supports moving the case forward only after corrected or replacement files are uploaded |
| Pre-Disbursement Control | Confirms that final required documents have been uploaded before the loan can move to disbursement |
| Audit Support | Provides a traceable record of which document versions were available at each operational or assessment step |

## 7.14 Typical Decision Logic Patterns

Although exact policy varies by bank and product, digital lending commonly uses document upload information in patterns such as:
- Pass: Required documents have been uploaded successfully and are available for the next process step
- Pause: Progression stops because a required upload is missing, failed, or technically invalid
- Conditional path: The case may continue after replacement files or stage-specific additional uploads are completed
- Refer: Operational or manual handling is triggered where uploads are unusual, duplicated, mismapped, or submitted by an exceptional route

Document Upload is rarely just a file-transfer event in mature lending journeys. It is part of operational control over evidence readiness, assessment support, application progression, and pre-disbursement completeness.

## 7.15 Example Scenarios

| Scenario | Upload Outcome | Likely Process Impact |
|---|---|---|
| Customer uploads clear payslips in the correct format during affordability review | Uploaded Successfully | Supports downstream income assessment if other checks also pass |
| Customer uploads a password-protected bank statement that cannot be processed | Invalid File | Application pauses until a usable replacement file is submitted |
| Staff uploads final signed agreement before funds release | Uploaded Successfully | Supports pre-disbursement completion if all remaining conditions are met |
| Customer replaces an outdated proof-of-address document with a newer version | Uploaded with Replacement | Latest file becomes active while prior upload remains in history |
| Document is uploaded against the wrong applicant within a joint application | Rejected for Current Context | Requires correction before downstream review can rely on the file |

## 7.16 Key Business Concepts

| Concept | Definition |
|---|---|
| Document Upload | The submission of a file into the digital lending process so it can be associated with a case and used downstream |
| Uploaded Document | A file that has been received by the system and registered against a lending context |
| Document Metadata | Descriptive information about an uploaded file such as type, uploader, timestamp, format, and linked application |
| Technical Validation | Checks that determine whether a file is structurally acceptable for use, such as size, format, integrity, and basic readability tests |
| Document Requirement Mapping | The association between an uploaded file and the specific document need or checklist item it is intended to satisfy |
| Replacement Upload | A newer or corrected file submitted to supersede a prior upload while preserving history |
| Active Version | The current uploaded document version intended for downstream use |
| Upload Status | The state of an upload, such as successful, failed, invalid, superseded, or pending review |
| Upload Audit Trail | The historical record of upload events, validations, replacements, and actor actions related to a document |
| Stage-Specific Document | A document that is uploaded only when the application reaches a defined point such as underwriting or pre-disbursement |
| Usable Upload | A file that has passed upload-level acceptance and is available for downstream business processes |
| Pre-Disbursement Document | A final supporting file required before funds can be released |

FAQ

Is successful upload the same as document approval? No. Successful upload only means the file was received and passed upload-level checks. The document may still need business review, verification, or policy assessment before it is accepted for lending purposes.

Can a document be uploaded more than once? Yes. Re-upload and replacement are common when a prior file is outdated, unclear, invalid, or attached to the wrong requirement. Good upload design preserves version history while clearly identifying the active file.

Why can an uploaded document still block application progress? An uploaded file may still block progression if it is technically invalid, mapped incorrectly, not allowed for the current stage, missing for a mandatory requirement, or not sufficient for the downstream process that depends on it.

---

[← Digital Lending Onboarding](README.md) · [Previous: Loan Product & Simulation](06-loan-product-simulation.md) · [Next: Risk Assessment](08-risk-assessment.md)
