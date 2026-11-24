# Security Specification — DENZZ CLIENT

## 1. Data Invariants
- Only verified Google administrators (`request.auth.token.email == 'dezzzzzz2007@gmail.com' && email_verified == true` or UID present in `/admins/{uid}`) may create or update `/siteStatus/{statusId}`.
- `/siteStatus/{statusId}` supports single-document `get` (e.g., `siteStatus/current`) and blocks collection `list`.
- Every write to `/siteStatus/{statusId}` enforces strict key allowlisting (`online`, `message`, `updatedAt`, `updatedBy`), `message.size() <= 240`, `updatedAt == request.time`, and `updatedBy == request.auth.token.email`.
- `/admins/{adminUid}` PII (`email`) is readable only by the matching UID or the bootstrap admin, with `list` disabled.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Unauthenticated `create` on `/siteStatus/current` -> `PERMISSION_DENIED`.
2. Non-admin verified Google user `update` on `/siteStatus/current` -> `PERMISSION_DENIED`.
3. Spoofed admin email with `email_verified: false` -> `PERMISSION_DENIED`.
4. Shadow update adding `isAdmin: true` to `/siteStatus/current` -> `PERMISSION_DENIED`.
5. `online` set to `"false"` (string instead of boolean) -> `PERMISSION_DENIED`.
6. `message` exceeding 240 chars -> `PERMISSION_DENIED`.
7. Client-forged `updatedAt` timestamp (`!= request.time`) -> `PERMISSION_DENIED`.
8. Forged `updatedBy` email (`!= request.auth.token.email`) -> `PERMISSION_DENIED`.
9. Collection `list` on `/siteStatus` or `/admins` -> `PERMISSION_DENIED`.
10. Non-owner reading `/admins/{otherUid}` -> `PERMISSION_DENIED`.
11. Self-registering into `/admins/{selfUid}` as non-bootstrap user -> `PERMISSION_DENIED`.
12. Mutating immutable `createdAt` on `/admins/{uid}` -> `PERMISSION_DENIED`.
