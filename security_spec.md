# Security Specification & Test-Driven Security Design (TDD)

## 1. Data Invariants

1. **Root Lockdown (Catch-All Deny)**: No document in any collection can be read or written unless governed by an explicit `allow` block.
2. **Bootstrapped Admin Guarantee**: The primary engineer `minakhairat1@gmail.com` or users with a verified document in `/admins/{uid}` hold administrative authority across all lines, workers, settings, and users.
3. **Identity & Role Integrity**: A non-admin user cannot self-assign the `admin` role or modify `admins/{uid}` records.
4. **Line Partitioning & Supervisor Boundaries**: A supervisor whose Google email is assigned to a specific line (`line.supervisorEmail == request.auth.token.email`) can only edit that specific line and the workers belonging to that line (`worker.lineId == lineId`). They cannot alter lines or workers assigned to other supervisors.
5. **Worker-Line Relationship**: A worker must belong to a valid `lineId` and cannot be moved across lines by a line supervisor unless authorized.
6. **Immutable Fields**: Document primary identifiers (`id`, `uid`, `lineId`) and creation provenance cannot be tampered with after creation.
7. **Temporal Integrity**: State update timestamps must be valid strings bounded in length.
8. **Volumetric Boundaries**: Names, IDs, notes, and strings must observe strict size limits to prevent wallet-draining and denial-of-service payloads.

---

## 2. The "Dirty Dozen" Adversarial Payloads

The following 12 adversarial test cases represent exploit attempts designed to break Identity, RBAC, Data Integrity, and State Boundaries:

1. **Payload 1 (Self-Promotion Attack)**: An unprivileged supervisor attempts to write their own UID into `/admins/{myUid}` with `{ "role": "admin" }`.
   - *Expected*: `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Spoofing)**: A user with `email_verified == false` attempts an admin or supervisor write operation.
   - *Expected*: `PERMISSION_DENIED`
3. **Payload 3 (Cross-Line Supervisor Tampering)**: Supervisor of Line 1 (`sup1@plant.com`) attempts to update or delete Line 2 (`/lines/LINE-B`).
   - *Expected*: `PERMISSION_DENIED`
4. **Payload 4 (Ghost Field / Shadow Field Injection)**: A user writes a line update containing an undeclared ghost field `{ "__bypassAuth": true }`.
   - *Expected*: `PERMISSION_DENIED`
5. **Payload 5 (Oversized Payload / Denial of Wallet Attack)**: A user writes a worker note with a 50KB junk string exceeding the 500-char boundary.
   - *Expected*: `PERMISSION_DENIED`
6. **Payload 6 (Cross-Line Worker Hijack)**: Supervisor of Line 1 attempts to create or edit a worker with `lineId: "LINE-B"` (Line 2).
   - *Expected*: `PERMISSION_DENIED`
7. **Payload 7 (Unauthenticated Read Attack)**: An unauthenticated client attempts to query or read documents from `/workers` or `/lines`.
   - *Expected*: `PERMISSION_DENIED`
8. **Payload 8 (Global Settings Defacement)**: A line supervisor attempts to modify `/settings/plant_config` targets or leadership names.
   - *Expected*: `PERMISSION_DENIED`
9. **Payload 9 (ID Poisoning Attack)**: A malicious user attempts to target a document with an ID containing path-traversal or invalid characters `/lines/../../malicious`.
   - *Expected*: `PERMISSION_DENIED`
10. **Payload 10 (Immutable ID Mutation)**: An update to a worker document attempts to change its immutable `id` or `code`.
    - *Expected*: `PERMISSION_DENIED`
11. **Payload 11 (Audit Log Tampering / Deletion)**: A user attempts to delete or overwrite historical audit log records in `/audit_logs/{logId}`.
    - *Expected*: `PERMISSION_DENIED`
12. **Payload 12 (Supervisor Privilege Escalation on Line)**: A supervisor attempts to change the `supervisorEmail` field of their own line to transfer ownership to an external rogue email without admin approval.
    - *Expected*: `PERMISSION_DENIED`

---

## 3. Test Runner Design (`firestore.rules.test.ts`)

The rules enforce:
- `isAdmin()` verification via `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` or matching bootstrapped admin `minakhairat1@gmail.com` with `email_verified == true`.
- Line supervisor permission verified via `resource.data.supervisorEmail == request.auth.token.email`.
- Workers edit permission verified via line lookup: `get(/databases/$(database)/documents/lines/$(resource.data.lineId)).data.supervisorEmail == request.auth.token.email`.
- Strict schema validation with `isValid[Entity]()` helper functions.
