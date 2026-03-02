export const MOCK_ARCHITECTURE = `FinVault — Digital Investment & Banking Platform

## Frontend
- React 18 SPA served via AWS CloudFront CDN
- Mobile apps: React Native (iOS + Android)
- WebSocket connections for real-time portfolio updates

## Authentication & Identity
- OAuth 2.0 / OpenID Connect with internal identity provider
- JWT access tokens (15-min TTL) + refresh tokens (30-day TTL) stored in HttpOnly cookies
- TOTP-based MFA (Google Authenticator / Authy)
- Biometric auth on mobile (Face ID / Fingerprint)
- SSO integration for corporate accounts (SAML 2.0)

## API Layer
- AWS API Gateway (REST + WebSocket) with WAF rules
- Rate limiting: 1,000 req/min per authenticated user, 100 req/min unauthenticated
- Internal service mesh via AWS App Mesh (mTLS between services)

## Backend Microservices (ECS Fargate, Node.js / Python)
- **user-service**: KYC/AML verification, account management, document uploads (S3)
- **portfolio-service**: Holdings, performance calculations, tax-loss harvesting
- **trading-service**: Order routing to Alpaca brokerage API, market data ingestion
- **payment-service**: ACH transfers (Plaid), wire transfers, Stripe card processing
- **notification-service**: Email (SendGrid), SMS (Twilio), push notifications
- **audit-service**: Immutable transaction log (DynamoDB + S3 Glacier archival)
- **admin-service**: Internal ops dashboard, customer support tools, manual overrides

## Data Layer
- **PostgreSQL (RDS Multi-AZ)**: User PII, account balances, transaction records
- **Redis (ElastiCache)**: Session cache, rate-limit counters, real-time price cache
- **DynamoDB**: Audit logs, notification history
- **S3**: KYC documents, trade confirmations, tax forms (encrypted at rest)

## Third-Party Integrations
- Plaid (bank account linking & ACH initiation)
- Stripe (card processing & fraud scoring)
- Alpaca (brokerage / trade execution)
- Twilio (SMS OTP)
- SendGrid (transactional email)
- Persona (KYC identity verification)

## Internal Infrastructure
- VPC with public/private subnets; bastion host for SSH access
- Jenkins CI/CD pipeline with GitHub webhooks
- Grafana + Prometheus monitoring; PagerDuty alerting
- Secrets stored in AWS Secrets Manager
- Employee access via Okta SSO + hardware MFA (YubiKey)

## Compliance & Regulatory
- SOC 2 Type II certified
- PCI DSS Level 1 (card data handled by Stripe, out-of-scope for most systems)
- FINTRAC (Canadian AML reporting)
- PIPEDA / provincial privacy law compliance
- Annual penetration tests by third-party firm`;

export const MOCK_SCENARIOS_FALLBACK = [
  {
    id: "scn-001",
    title: "Refresh Token Theft via XSS in Portfolio Notes",
    attackVector:
      "Stored XSS in user-generated portfolio annotation field → cookie exfiltration",
    severity: "Critical" as const,
    description:
      "The portfolio-service allows users to annotate holdings with rich-text notes. If the frontend fails to sanitize HTML entities before rendering, an attacker can inject a <script> tag that exfiltrates the HttpOnly refresh token via a DNS exfil channel or forged fetch request with credentials. With a 30-day refresh token, the attacker gains persistent account access long after the session appears closed.",
    mitreTactic: "Credential Access",
    mitreId: "T1539",
    estimatedImpact:
      "Full account takeover, unauthorized trades, ACH transfer initiation to attacker-controlled bank account. Average account balance exposure: $45,000.",
    defensePlaybook: [
      "Enforce strict Content-Security-Policy: no 'unsafe-inline', restrict script-src to trusted CDN hashes",
      "Sanitize all user-generated content server-side with DOMPurify before storage and on read",
      "Rotate refresh tokens on every use (refresh token rotation) and detect reuse as compromise signal",
      "Bind refresh tokens to device fingerprint (user-agent + IP subnet); invalidate on mismatch",
      "Implement anomaly detection: flag trades or transfers initiated within 60 seconds of a new device refresh",
      "Add out-of-band confirmation (SMS/email) for any ACH transfer > $1,000 initiated from a new device",
    ],
  },
  {
    id: "scn-002",
    title: "Plaid Webhook Replay Attack → Unauthorized Fund Transfers",
    attackVector:
      "HMAC signature bypass on Plaid webhook endpoint in payment-service",
    severity: "Critical" as const,
    description:
      "The payment-service receives Plaid webhooks to confirm ACH transfer statuses. If webhook signature verification uses a timing-vulnerable string comparison (== instead of crypto.timingSafeEqual), an attacker who can observe a single valid webhook can replay it or forge signatures with a timing oracle. A replayed 'TRANSFER_EVENTS_UPDATE' event with status 'settled' could mark a pending transfer as complete, triggering fund release before actual settlement.",
    mitreTactic: "Defense Evasion",
    mitreId: "T1562",
    estimatedImpact:
      "Fraudulent fund releases up to configured ACH limits ($25,000/day). Regulatory reporting obligations under FINTRAC for suspicious transactions.",
    defensePlaybook: [
      "Replace all HMAC comparisons with crypto.timingSafeEqual() or equivalent constant-time comparison",
      "Implement idempotency keys: log every processed webhook event ID in Redis with 48h TTL; reject duplicates",
      "Validate Plaid-Verification-Token on every webhook using Plaid's official verification SDK",
      "Add webhook replay window: reject any event with timestamp older than 5 minutes",
      "Monitor for duplicate event_id values across webhook logs; alert on any replay attempt",
      "Test in staging with Plaid's webhook verification test suite before every payment-service deployment",
    ],
  },
  {
    id: "scn-003",
    title: "IDOR on Admin Service → Bulk Customer Data Exfiltration",
    attackVector:
      "Horizontal privilege escalation via predictable customer ID enumeration in admin-service REST API",
    severity: "High" as const,
    description:
      "The admin-service exposes endpoints like GET /admin/customers/{customerId}/kyc-documents that are protected only by checking if the requester has an 'admin' role — but does not verify that the support agent is assigned to that customer's region or tier. A compromised low-privilege support account (gained via phishing) can enumerate sequential customer IDs and download KYC documents (passports, SIN numbers) for all customers.",
    mitreTactic: "Collection",
    mitreId: "T1530",
    estimatedImpact:
      "Full PII exposure for entire customer base. PIPEDA breach notification required within 72 hours. Class action exposure and potential FINTRAC sanctions.",
    defensePlaybook: [
      "Implement attribute-based access control (ABAC): support agents can only access customers in their assigned segment",
      "Replace sequential integer IDs with non-guessable UUIDs (v4) in all external-facing admin endpoints",
      "Add rate limiting specifically on admin enumeration endpoints: max 60 customer lookups/hour per agent",
      "Log and alert on: any agent accessing >20 customer records in a 10-minute window",
      "Require step-up MFA (YubiKey touch) for accessing sensitive fields: SIN, passport number, bank account",
      "Implement a data access audit trail reviewable by compliance team; quarterly access reviews",
    ],
  },
];
