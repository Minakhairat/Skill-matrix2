# Security Specification & Test-Driven Security Design (TDD)

## 1. Data Invariants

1. **Root Lockdown (Catch-All Deny)**: No document in any collection can be read or written unless governed by an explicit `allow` block.
2. **Workspace & Admin Isolation**: Every production line, worker, and plant setting belongs to a specific Admin identified by `adminEmail` and `adminId`. An admin can ONLY view, edit, or delete their own workspace data.
3. **Supervisor Scoping**: A supervisor whose Google email is assigned to a specific line (`line.supervisorEmail == request.auth.token.email`) can ONLY view and update that specific line and its associated workers. They CANNOT see other lines or unassigned lines.
4. **No Cross-Admin Contamination on Role Switching**: When a supervisor switches to Admin mode, they query only data where `adminEmail == request.auth.token.email`. If they have not created any data as Admin, NO data is returned, preventing any leakage of another Admin's workspace.
5. **Supervisor Self-Promotion Prevention**: A supervisor cannot promote themselves to access another admin's data, cannot reassign `adminEmail` or `adminId`, and cannot delete lines or workers.
6. **Immutable Fields**: Document primary identifiers (`id`, `adminEmail`, `adminId`, `lineId`) cannot be altered during updates.
7. **Temporal & Schema Integrity**: State update timestamps must be valid strings bounded in length. All entities undergo strict schema validation via `isValid[Entity]()`.
8. **Volumetric Boundaries**: Names, IDs, notes, and strings observe strict size limits to prevent wallet-draining and denial-of-service payloads.

---

## 2. The "Dirty Dozen" Adversarial Payloads

The following 12 adversarial test cases represent exploit attempts designed to break Identity, RBAC, Multi-Admin Isolation, and State Boundaries:

1. **Payload 1 (Cross-Admin Workspace Snoop)**: Admin B (`adminB@gmail.com`) attempts to query or read Line documents where `adminEmail == "adminA@gmail.com"`.
   - *Expected*: `PERMISSION_DENIED`
2. **Payload 2 (Supervisor Line Hijack)**: Supervisor S attempts to update a line where `supervisorEmail` does NOT match their verified email.
   - *Expected*: `PERMISSION_DENIED`
3. **Payload 3 (Supervisor Admin Promotion / Field Escalation)**: A supervisor attempts to update a line by setting `adminEmail` to their own email.
   - *Expected*: `PERMISSION_DENIED`
4. **Payload 4 (Supervisor Deleting Line)**: A supervisor attempts to delete an assigned line document.
   - *Expected*: `PERMISSION_DENIED`
5. **Payload 5 (Unassigned Supervisor Access)**: A user in supervisor role attempts to read lines when no admin has added their email to `supervisorEmail`.
   - *Expected*: `PERMISSION_DENIED` (List returns empty/0 records or denied)
6. **Payload 6 (Cross-Admin Worker Poisoning)**: Admin B attempts to update or delete workers belonging to `adminEmail == "adminA@gmail.com"`.
   - *Expected*: `PERMISSION_DENIED`
7. **Payload 7 (Unverified Email Spoofing)**: A user with `email_verified == false` attempts an admin or supervisor write operation.
   - *Expected*: `PERMISSION_DENIED`
8. **Payload 8 (Ghost Field / Shadow Field Injection)**: A user writes a line update containing an undeclared ghost field `{ "__bypassAuth": true }`.
   - *Expected*: `PERMISSION_DENIED`
9. **Payload 9 (Oversized Payload / Denial of Wallet Attack)**: A user writes a worker note with a 50KB junk string exceeding the 500-char boundary.
   - *Expected*: `PERMISSION_DENIED`
10. **Payload 10 (Immutable Admin Mutation)**: An update to a worker document attempts to change its immutable `adminEmail` or `adminId`.
    - *Expected*: `PERMISSION_DENIED`
11. **Payload 11 (Audit Log Tampering / Deletion)**: A user attempts to delete or overwrite historical audit log records in `/audit_logs/{logId}`.
    - *Expected*: `PERMISSION_DENIED`
12. **Payload 12 (Self-Assigned Admin Escalation in Admins Collection)**: A supervisor attempts to write their own UID into `/admins/{uid}` without pre-approved credentials.
    - *Expected*: `PERMISSION_DENIED`
