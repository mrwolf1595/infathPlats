# SaaS Launch Plan (Without Changing Current Logic)

## Goal
Launch the current project as a SaaS platform for auction companies and institutions, while **preserving the existing business logic, generation flow, and input method exactly as-is**.

## Non-Negotiable Constraint
- No changes to current PDF generation logic.
- No changes to current user input flow/structure.
- All SaaS and security capabilities are added as external layers around the current core.

---

## Phase 1: SaaS Product Plan (First)

### 1. Preserve Core Engine
- Treat the current generator as an immutable core service.
- Add a wrapper layer (middleware/gateway) for SaaS features without touching core generation behavior.

### 2. Multi-Tenant Foundation
- Create `Organizations` (companies/institutions).
- Link each `User` to an organization.
- Enforce strict tenant isolation in all reads/writes.
- Suggested initial roles:
  - `Owner`
  - `Admin`
  - `Operator`
  - `Viewer`

### 3. User Journey and Identity Paths
- Onboarding flow:
  - Create organization
  - Create first owner/admin
- Team management:
  - Invite users by email
  - Assign/revoke roles
- User profile:
  - Personal info
  - Password management
  - MFA setup
  - Session/device management

### 4. Organization Workspace
- Organization settings:
  - Company profile
  - Brand settings (if applicable)
  - Allowed templates
- Generation history:
  - List of generated boards/PDF jobs
  - Filters and search
- Operational visibility:
  - Last activity
  - Usage counters

### 5. SaaS Dashboard Modules
- Overview dashboard:
  - Total generated boards
  - Active users
  - Recent activity
- Team and access dashboard
- Plan and billing dashboard
- Audit dashboard (security-sensitive actions)

### 6. API and Integration Layer (No Logic Change)
- Add AuthN/AuthZ middleware before existing endpoints.
- Resolve tenant context per request.
- Apply quotas and rate limits at gateway level.
- Keep existing generation endpoint behavior/function unchanged.

### 7. Delivery Roadmap
- Sprint 1:
  - Auth + Organizations + Roles + Profiles
- Sprint 2:
  - Team invites + Dashboard + History + Audit log
- Sprint 3:
  - Billing + Usage limits + Admin controls

---

## Phase 2: Security Plan (After SaaS Plan)

### 1. Identity Security
- Strong password policy.
- MFA required for `Owner` and `Admin`.
- Session timeout and remote session revoke.
- Optional enterprise SSO (OIDC/SAML) for larger customers.

### 2. Authorization and Tenant Isolation
- RBAC checks on every protected action.
- Tenant-scoped queries only.
- Prevent cross-tenant access by design at API and DB layers.

### 3. Data Protection
- TLS for all traffic.
- Encryption at rest for DB and storage.
- Secret management for keys/tokens.
- Optional field-level encryption for sensitive values.

### 4. File and Upload Protection
- Strict file type and size validation.
- Malware scanning for uploaded assets.
- Signed URLs with short TTL for downloads/uploads.

### 5. API and Abuse Protection
- Rate limiting per user and per organization.
- Brute-force login protection.
- Basic WAF/bot mitigation.
- Anomaly detection for suspicious usage.

### 6. Monitoring, Logging, and Incident Readiness
- Immutable audit logs for critical actions.
- Security alerts for high-risk events.
- Incident response runbook.
- Regular backup/restore verification.

### 7. Compliance Readiness
- Data retention and deletion policies.
- Export/delete workflows for customer data requests.
- Roadmap alignment for ISO 27001 / SOC 2 readiness.

---

## Implementation Principle
All upcoming implementation must be additive and layered, not intrusive:
- Add new modules around the current system.
- Do not alter existing generation logic.
- Do not alter current input behavior.
