# Security Specification: Finexa Cloud Financial Synchronization

## 1. Data Invariants
- Each user's financial record is stored at `/user_financials/{userKey}`.
- `userKey` must be a sanitized alphanumeric identifier matching `^[a-zA-Z0-9_\\-]+$` under 128 characters.
- Blanket list reads are strictly forbidden (`allow list: if false;`) to prevent enumeration or data harvesting of multiple users.
- Individual document `get` is restricted to valid path IDs.
- On create or update, data must adhere to structural boundaries:
  - `email` is a string <= 100 chars.
  - `lastUpdated` is a string <= 50 chars.
  - `accounts`, `transactions`, and `debts` are valid lists bounded by size limits (`accounts` <= 50, `transactions` <= 5000, `debts` <= 100).
  - Unbounded arrays or oversized payloads are rejected to prevent wallet denial / storage exhaustion attacks.

## 2. Dirty Dozen Payloads (Targeting State, Identity & Resource Bounds)
1. Injected path ID with junk / script characters: `/user_financials/<script>alert(1)</script>` -> REJECTED (Invalid ID).
2. Document ID exceeding 128 characters -> REJECTED.
3. Attempting to list all users' financial records (`getDocs(collection(db, 'user_financials'))`) -> REJECTED (List denied).
4. Payload missing required `email` field -> REJECTED.
5. Payload with non-string `email` (e.g. integer or boolean) -> REJECTED.
6. Payload with email exceeding 100 characters -> REJECTED.
7. Payload with accounts array containing > 50 items -> REJECTED.
8. Payload with transactions array containing > 5000 items -> REJECTED.
9. Payload with debts array containing > 100 items -> REJECTED.
10. Payload with non-string `lastUpdated` timestamp -> REJECTED.
11. Attempting to write into unknown collections `/admins/attack` -> REJECTED (Global deny-all).
12. Attempting to execute unauthorized batch mutations across arbitrary collections -> REJECTED.
