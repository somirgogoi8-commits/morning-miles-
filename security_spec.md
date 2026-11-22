# Morning Miles Club — Firestore Security Specification

## 1. Data Invariants
1. **No Public PII Exposure**: `registrations` and `payments` contain sensitive PII (phone numbers, emails, emergency contacts, financial references) and MUST NEVER be readable (`get` or `list`) by unauthenticated visitors or non-admin users.
2. **Server-Authoritative Payment Confirmation**: Public registration creation MUST enforce `status == 'PENDING PAYMENT'`, `paymentStatus == 'PENDING'`, and `checkedIn == false`. Unauthenticated callers cannot create or update a registration directly to `CONFIRMED` or `checkedIn: true`.
3. **Referential Integrity on Registration**: Every `registrations/{registrationId}` create MUST verify that `events/{eventId}` exists and `registrationOpen == true`, and that the participant has accepted both `rulesAccepted == true` and `conditionsAccepted == true` (plus `guardianPermission == true` for minors).
4. **No Self-Promoted Admins**: Only an existing verified `PRIMARY_ADMIN` can create, update, or deactivate records in `/admins/{adminEmail}`. Regular users cannot write to `/admins` or `/auditLogs`.
5. **Immutable Financial & Audit Trails**: `payments` and `auditLogs` cannot be deleted or modified once recorded (`auditLogs` is append-only for admins; `payments` allows reconciliation updates only by Primary Admins).
6. **Permission-Gated Media**: `mediaHighlights` are publicly readable ONLY when `permissionConfirmed == true`.
7. **Strict Key & Size Limits**: Every document write validates exact allowed keys (`hasAll` / `hasOnly`), string `.size()` bounds, numeric ranges, and valid ID regexes (`^[a-zA-Z0-9_\\-]+$`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Forged Confirmation on Create**: Creating `/registrations/REG-999` with `status: "CONFIRMED"`, `paymentStatus: "VERIFIED"`, `checkedIn: true` -> **REJECTED** (`PERMISSION_DENIED`).
2. **Shadow Field Injection on Registration**: Creating `/registrations/REG-998` with valid fields plus ghost field `isAdminBypass: true` -> **REJECTED** via `keys().hasOnly(...)`.
3. **Orphaned Registration**: Creating `/registrations/REG-997` referencing non-existent `eventId: "fake-event-999"` -> **REJECTED** via `exists(/databases/$(database)/documents/events/...)`.
4. **Rulebook Bypass**: Creating `/registrations/REG-996` with `rulesAccepted: false` -> **REJECTED**.
5. **Unauthenticated PII Read**: Calling `get` or `list` on `/registrations` without admin credentials -> **REJECTED**.
6. **Privilege Escalation**: Writing `/admins/attacker@example.com` with `role: "PRIMARY_ADMIN"` as non-admin -> **REJECTED**.
7. **Unverified Admin Email Spoof**: Request with matching admin email where `request.auth.token.email_verified == false` -> **REJECTED**.
8. **Event Host Creating Admin**: `EVENT_HOST` attempting to write to `/admins/{email}` or read `/auditLogs` -> **REJECTED**.
9. **Audit Log Tampering**: Any user (even `PRIMARY_ADMIN`) attempting `update` or `delete` on `/auditLogs/{logId}` -> **REJECTED**.
10. **Payment Deletion**: Any user attempting `delete` on `/payments/{paymentId}` -> **REJECTED**.
11. **Unconsented Media Leak**: Public `get` or `list` on `/mediaHighlights/{id}` where `permissionConfirmed == false` -> **REJECTED**.
12. **Resource Exhaustion / ID Poisoning**: Creating `/registrations/<1500-char-id>` or `fullName` > 100 chars -> **REJECTED** by `isValidId()` and `.size()` limits.
