import type { ScenarioFromServer } from "@/types";

export const MOCK_ARCHITECTURE = `FinVault Digital Investment and Banking Platform
Frontend:
- React SPA on CloudFront and React Native mobile apps
- WebSocket channels for live portfolio and transfer status updates
Identity:
- OAuth 2.0 and OIDC with internal IdP, JWT access tokens, refresh tokens in HttpOnly cookies
- TOTP MFA for retail users and SAML SSO for enterprise customers
Platform:
- API Gateway with WAF, Node.js and Python services on ECS Fargate, service mesh with mTLS
Data:
- PostgreSQL for customer and transaction records, Redis for sessions, S3 for KYC documents
Integrations:
- Plaid for bank linking, Stripe for payments, Twilio for SMS, SendGrid for email, Persona for KYC`;

export const DEMO_SCENARIOS: ScenarioFromServer[] = [
  {
    id: "demo-001",
    title: "Session Refresh Token Reuse After Stored XSS in Portfolio Notes",
    attackVector:
      "Stored cross-site scripting in portfolio notes enables replay of privileged actions against active sessions",
    severity: "Critical",
    description:
      "If rich text rendering is not consistently sanitized, an attacker can plant malicious markup in a shared portfolio note. When a privileged user views the note, the browser session can be abused to trigger authenticated API calls that persist access through refresh token rotation gaps.",
    mitreTactic: "Credential Access",
    mitreId: "T1539",
    estimatedImpact:
      "Customer account takeover, unauthorized fund movement, and a material incident requiring regulator and customer notification.",
    attackChain: [
      "Attacker stores malicious markup in a portfolio note shared with support staff",
      "A privileged browser renders the note and executes the unsafe payload path",
      "Authenticated session actions are replayed against account and payment endpoints",
      "Access persists because refresh token rotation and anomaly detection do not trigger"
    ],
    defensePlaybook: [
      "Sanitize user-authored HTML on write and render paths",
      "Enforce a strict CSP and block inline script execution",
      "Rotate refresh tokens on every use and invalidate on reuse detection",
      "Require step-up approval for new device payment actions"
    ],
    assumptions: [
      "Portfolio notes are rendered in at least one privileged workflow",
      "Token reuse telemetry is not currently tied to automated response"
    ],
    evidence: [
      "Architecture includes rich client rendering and long-lived refresh tokens",
      "Customer support workflows have broad access to account actions"
    ],
    confidence: 0.78,
    controlGaps: [
      "No explicit content sanitization control is documented",
      "No mention of refresh token reuse detection"
    ],
    ownerRole: "Security",
    likelihood: "High",
    impact: "High",
    riskScore: 9.9,
  },
  {
    id: "demo-002",
    title: "Replay of Plaid Settlement Webhooks Triggers Premature Fund Release",
    attackVector:
      "Weak webhook verification and replay handling in the payment service allows stale settlement events to be re-accepted",
    severity: "Critical",
    description:
      "The payment service accepts partner webhooks to move transfers through settlement states. If signature verification is incomplete or replay windows are not enforced, a captured valid event can be reused to release funds before actual settlement completes.",
    mitreTactic: "Defense Evasion",
    mitreId: "T1562",
    estimatedImpact:
      "Fraudulent fund release, payment reconciliation failures, and escalated operational and compliance review.",
    attackChain: [
      "Attacker observes or captures a previously valid webhook request",
      "The same event is replayed against the webhook endpoint",
      "The payment service accepts the request due to weak replay controls",
      "Funds are released before the banking network confirms settlement"
    ],
    defensePlaybook: [
      "Use constant-time signature checks and vendor SDK validation",
      "Reject duplicate event IDs with bounded retention",
      "Apply strict timestamp windows to all webhook events",
      "Reconcile settlement against the provider API before release"
    ],
    assumptions: [
      "Webhook state transitions can trigger downstream release logic"
    ],
    evidence: [
      "The architecture depends on Plaid ACH lifecycle events"
    ],
    confidence: 0.74,
    controlGaps: [
      "No replay cache is documented for webhook IDs"
    ],
    ownerRole: "Platform",
    likelihood: "High",
    impact: "High",
  },
  {
    id: "demo-003",
    title: "Support Tool IDOR Exposes Regional KYC Documents",
    attackVector:
      "Predictable customer resource identifiers allow over-broad support account access to regulated documents",
    severity: "High",
    description:
      "A compromised support account can enumerate customer-specific document endpoints if the admin tool authorizes only on broad role membership. Without region, case, or account ownership checks, a single support compromise can expose a large volume of regulated KYC data.",
    mitreTactic: "Collection",
    mitreId: "T1530",
    estimatedImpact:
      "Large-scale PII disclosure with mandatory breach response and customer trust damage.",
    attackChain: [
      "Support credentials are phished or reused from another compromise",
      "The attacker enumerates predictable customer identifiers",
      "KYC document endpoints return records without scope validation",
      "Sensitive identity documents are exfiltrated in bulk"
    ],
    defensePlaybook: [
      "Enforce ABAC checks tied to queue, region, and case ownership",
      "Replace predictable identifiers with opaque external IDs",
      "Rate limit sensitive record access and alert on bursts",
      "Require step-up MFA for regulated document access"
    ],
    assumptions: [
      "Support tooling exposes direct object references to customer records"
    ],
    evidence: [
      "The architecture includes internal ops dashboards and KYC document storage"
    ],
    confidence: 0.67,
    controlGaps: [
      "No resource-scoped authorization model is described"
    ],
    ownerRole: "Compliance",
    likelihood: "Medium",
    impact: "High",
  },
  {
    id: "demo-004",
    title: "Model Prompt Leakage From Shared Retrieval Context in AI Advisory Features",
    attackVector:
      "Cross-tenant context bleed in AI-assisted portfolio recommendations exposes sensitive prompt context and generated guidance",
    severity: "High",
    description:
      "If retrieval or prompt assembly for AI advisory features reuses cache entries across tenants, customer prompts and recommendation context can leak into another session. The immediate harm is exposure of sensitive investment intent and a governance failure in AI-driven product features.",
    mitreTactic: "Collection",
    mitreId: "T1213",
    estimatedImpact:
      "Cross-tenant data disclosure, trust erosion in advisory features, and urgent product and legal review.",
    attackChain: [
      "A cached retrieval context is incorrectly keyed across tenants",
      "A second customer request reuses stale prompt context",
      "The AI output contains another tenant's data or recommendations",
      "Sensitive customer intent is disclosed to an unrelated user"
    ],
    defensePlaybook: [
      "Scope prompt caches and retrieval stores by tenant and session",
      "Add redaction and leakage checks before model response delivery",
      "Log prompt assembly provenance for incident review",
      "Require human approval for high-impact AI-generated guidance changes"
    ],
    assumptions: [
      "The product includes AI-assisted recommendations with retrieval support"
    ],
    evidence: [
      "The architecture references AI SaaS and customer-specific workflows"
    ],
    confidence: 0.58,
    controlGaps: [
      "No explicit tenant isolation controls are documented for AI context assembly"
    ],
    ownerRole: "Product",
    likelihood: "Medium",
    impact: "High",
  },
];
