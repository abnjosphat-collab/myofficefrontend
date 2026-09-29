# Tools & Equipment system specification

**Status:** implemented baseline with documented policy gaps  
**Scope:** the `/tools` workspace, `/api/tools-workspace` API, and dedicated Tools tables in the shared MyOffice Supabase project  
**Source requirements:** Portable Tools and Equipment Management Procedure, management approval brief, user workflow decisions, and the dated audit record

This document formalises the engineering lifecycle for the system that is already implemented. It is a traceable baseline for future changes, not a claim that one consolidated specification existed before the original implementation.

## 1. Requirements analysis

### 1.1 Operational goals

1. Maintain one authoritative register for company and contractor portable tools and equipment.
2. Identify every item with a structured, unique register number.
3. Show ownership, technical identity, home storage, current location, storage conditions, maintenance requirements and operational status.
4. Issue equipment only to an eligible employee who is trained, qualified and authorised for the item or its category, with all qualifications still current.
5. Track custody, transfers, returns, due dates, overdue escalation and complete movement history.
6. Schedule and evidence pre-use, weekly, monthly, quarterly, calibration, maintenance, storage-audit and repair checks as applicable.
7. Quarantine failed or unsafe equipment until an authorised user records an adequate return-to-service resolution.
8. Record loss, damage, theft, missing components and late returns, including investigation and approved recovery details.
9. Control external movement through a signed gate-pass sequence: HOS, HOD, Security, optional Finance and General Manager.
10. Preserve source registers and supporting evidence without replacing the structured live register.

### 1.2 Actors and permissions

| Actor | Read | Register and compliance | Custody movements | Account administration | Gate-pass signing |
|---|---|---|---|---|---|
| Viewer | All permitted registers | No | No | No | Only when assigned an approval role |
| Issuer | Department-scoped operational data | Department-scoped | Department-scoped | No | Only when assigned an approval role |
| Administrator | All Tools data | All departments | No, unless separately assigned an Issuer account | Yes | Only when assigned an approval role |

Approval roles are independent of the account's workspace role. Signing requires reauthentication using the account password or configured numeric signing PIN.

### 1.3 Business rules

- Register number format is `<site>-<area>-<department>-<activity>-<sequence>`, for example `PP-UG-ENG-TW-01`.
- Sequence allocation must be atomic per prefix; duplicate numbers are rejected.
- A contractor-owned item requires a contractor name.
- Equipment eligibility requires `trained && qualified && authorised` and no expired training, qualification or authorisation date.
- A required pre-use check must be confirmed before issue.
- Issued equipment has one current custody record embedded in the equipment state and immutable movement events in history.
- Overdue status is derived from custody dates. A separate six-hour overdue alert is derived without requiring a scheduler.
- Failed inspections place equipment in attention status. Return to service requires an explicit resolution note.
- Repair eligibility is derived from the procedure's repair-versus-replacement threshold using the recorded repair quote and new-equipment price.
- Gate-pass approvals are sequential. Finance is inserted only when required. A rejection ends the active approval flow.
- Operational mutations must be idempotent, version-aware and atomically produce the updated equipment record, history event and reversible change record.

### 1.4 Non-functional requirements

- Use the existing MyOffice repository, Vercel frontend, Render backend and shared Supabase project.
- Keep provider credentials and service-role access backend-only.
- Never render a failed request as an empty register or plausible zero metric.
- Load independent workspace sources progressively so one slow source cannot block the equipment register.
- Preserve loaded records during a failed refresh and reject stale responses.
- Support desktop and phone layouts, light and dark appearances, keyboard operation and user text scaling.
- Preserve an auditable actor, timestamp and evidence trail for operational changes.
- Do not depend on process memory in production; in-memory state exists only as a test seam.

### 1.5 Matters outside the E-System

- Physical inspection quality, training delivery, supervisor competence and security verification remain human responsibilities.
- The mine must approve its official quarterly colour convention before the provisional mapping is treated as policy.
- Legal authority for payroll recovery, negligence findings and final gate-pass signatories must be confirmed by management and HR/Finance policy.
- CCTV, GPS, locks, storage suitability and physical labels must be installed and maintained outside the software.

## 2. Domain model

### 2.1 Core entities

| Entity | Purpose | Key relationships |
|---|---|---|
| Account | Authentication, workspace role and approval roles | Sessions, inspections, gate-pass signatures |
| Employee | Person who may receive equipment | Competencies, custody, incidents |
| Equipment | Authoritative register item and current state | History, evidence, inspections, incidents, gate-pass items |
| Competency | Trained, qualified and authorised decision | Employee plus equipment or category scope |
| Inspection | Time-stamped check, outcome and next due date | Equipment and inspector account |
| Incident | Loss/damage/theft/late-return investigation | Equipment and optional employee |
| Gate pass | External/internal movement request | Equipment items and ordered approvals |
| Approval | One signed decision in the gate-pass chain | Gate pass and signer account |
| History event | Immutable human-readable operational event | Equipment |
| Change | Before/after snapshot for controlled restore | Equipment |
| Idempotency record | Mutation replay protection | Mutation key and prior result |
| Source register | Preserved uploaded source document | Department and uploader |
| Evidence | Supporting files attached to equipment | Equipment and uploader |

### 2.2 State models

**Equipment:** `available -> issued -> overdue`; any operational state may enter `attention`; archived equipment is excluded from active workflows. `attention -> available` requires mark-ready evidence.

**Gate pass:** `draft -> pending -> approved` or `pending -> rejected`; future cancellation and closure values are represented in the schema but do not yet have complete user workflows.

**Incident:** `open -> investigating -> closed`; the current API creates `open` records and closes them directly after investigation data is supplied.

## 3. Contracts and type signatures

### 3.1 Backend request contracts

The authoritative runtime validators are Pydantic models in `backend/app/routers/tools_workspace.py`:

- `ToolInput` and `ToolUpdate`: register identity, storage, maintenance, inspection flags, value, criticality, safeguards, PPE, ownership and OEM reference.
- `MovementInput`: issue, return, transfer or extend command with employee, location, due date, pre-use confirmation and idempotency key.
- `CompetencyInput`: employee/item or employee/category scope and the three eligibility criteria with evidence and expiry dates.
- `InspectionInput`: inspection type, outcome, dates, defects, notes and repair economics.
- `IncidentInput` and `IncidentCloseInput`: report and investigation outcome.
- `GatePassInput` and `GatePassDecision`: movement request and credential-protected approval decision.
- `AccountRoleUpdate` and `SigningPinInput`: role separation, department scope, approval roles and signing credential setup.

### 3.2 Frontend contracts

- `ServerTool`, `ServerEmployee`, `ServerHistory`, `ServerAccount`, `ToolNotification` and `WorkspaceLoadValues` are defined in `app/tools/workspaceLoad.ts`.
- `CompetencyRecord`, `InspectionRecord`, `IncidentRecord`, `GatePassApproval`, `GatePass` and `ComplianceData` are defined in `app/tools/complianceTypes.ts`.
- UI-domain `Tool`, `Employee`, `Movement`, `Evidence` and `WorkspaceAccount` types are defined in `app/tools/prototype.ts`.
- API requests flow through `toolsApi`; successful workspace responses are shape-checked before entering state.

### 3.3 Core function signatures and responsibilities

```text
loadToolsWorkspace(token, role, get?, signal?, onSourceSettled?)
  -> Promise<WorkspaceLoadResult>

_register_number(body: ToolInput) -> str
_is_eligible(employee, tool, competencies?) -> bool
_inspection_due(tool, inspections?) -> list[str]
_inspection_colour(type, outcome, inspected_at) -> str
_default_next_due(type, inspected_at, tool) -> Optional[str]
_effective_status(tool, now?) -> str
_verify_signing_credential(account, credential) -> "password" | "pin"
_apply_change(before, after, action, actor, detail?, employee?, idempotency_key?)
  -> persisted tool/change result
```

Pure selection, counting, search and reducer logic stays outside the page component so it can be tested independently.

## 4. Persistence model

### 4.1 Existing base tables

The base Tools migration owns accounts, sessions, employees, equipment, history, changes, idempotency, evidence, source registers, usage, errors, feedback and notification-read records.

### 4.2 SOP-control additions

`backend/supabase_migration_tools_workspace_sop_controls.sql` adds:

- Account signing-PIN fields and approval roles.
- Twenty-one equipment control fields for numbering, storage, checks, maintenance, value, safeguards, PPE and ownership.
- `tools_workspace_number_sequences`.
- `tools_workspace_competencies` with one equipment/category scope constraint and a unique scope index.
- `tools_workspace_inspections` with due-date indexes.
- `tools_workspace_incidents` with open-investigation indexing.
- `tools_workspace_gate_passes`, `tools_workspace_gate_pass_items` and `tools_workspace_gate_pass_approvals`.
- Row-level security on all seven new tables.

### 4.3 Transaction functions

- `tools_workspace_next_register_number(text)` atomically increments a prefix sequence.
- `tools_workspace_apply_change(jsonb)` enforces idempotency and optimistic versioning while writing equipment, history and change records atomically.
- `tools_workspace_restore_change(uuid, text, boolean)` restores a prior snapshot without discarding fields introduced after an older snapshot.

## 5. Functional decomposition

1. **Authentication and authorisation:** session validation, workspace roles, department scope and approval roles.
2. **Register:** create, edit, archive, restore, search, filter, grid/list presentation and technical details.
3. **Custody:** issue, return, transfer, extend, pre-use confirmation, due dates and overdue derivation.
4. **People and competence:** employee register, autofill, evidence/expiry data and issue eligibility.
5. **Compliance:** inspection requirements, due-state calculation, colour status, maintenance and return to service.
6. **Incidents:** operational reporting, investigation deadline, negligence outcome and controlled recovery details.
7. **Gate passes:** request, ordered approvals, credential verification, signed PDF and verification code.
8. **Evidence and source records:** private permanent storage plus metadata register.
9. **Notifications:** per-account reads and independently recoverable alert loading.
10. **Observability:** usage, client error and feedback capture without blocking operational registers.

## 6. Implementation and verification map

| Concern | Implementation | Evidence |
|---|---|---|
| Frontend workspace | `app/tools/page.tsx` and focused components | Tools Vitest suites and `scripts/verify-tools.mjs` |
| Progressive loading | `app/tools/workspaceLoad.ts` | Loader and reducer regression tests |
| API and rules | `backend/app/routers/tools_workspace.py` | `backend/tests/test_tools_workspace_router.py` |
| Database controls | Tools base migrations and SOP migration | Production migration verification in the audit record |
| Operational UI | Register, People, Compliance and Gate-pass components | Read-only desktop/mobile browser verification |
| Audit evidence | `docs/DALLAGLIO_AUDIT_2026-09-26.md` | Dated commands, results and limitations |

## 7. Delivery sequence for future changes

1. Identify the SOP clause, actor, trigger, decision, output and evidence requirement.
2. Add or amend the business rule and acceptance criteria in this specification.
3. Update the domain/state model and identify data ownership and retention.
4. Define request/response types, validation constraints and permission checks before UI work.
5. Design additive schema changes, indexes, RLS and transaction boundaries.
6. Implement backend rules and focused tests first when integrity is server-owned.
7. Implement the UI with truthful loading, empty, stale, error and permission states.
8. Run focused unit/API tests, TypeScript, lint, read-only browser verification and the production build.
9. Record actual evidence and unresolved risks in the audit; never mark an unverified workflow complete.

## 8. Known gaps and decisions required

- Confirm and configure the mine's official quarterly inspection colours; the current quarter mapping is provisional.
- Confirm whether Finance is determined only per pass or automatically by value/ownership thresholds.
- Confirm formal authority and evidence requirements for negligence and payroll recovery decisions.
- Add complete cancel and close workflows for approved gate passes if operations require lifecycle closure in the system.
- Decide whether incident `investigating` needs a separate transition and assignment workflow.
- Add scheduled notifications only if the mine requires alerts outside active user sessions; current due and overdue status is derived when data is requested.
- Perform supervised acceptance testing with real HOS, HOD, Security, Finance, General Manager and Issuer users before treating the workflow as operationally signed off.
