"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Zap,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface ArchitectureInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: (architecture: string) => void;
  onReset: () => void;
  isLoading: boolean;
}

const ARCHITECTURE_PRESETS = [
  {
    label: "Fintech Web App",
    content: `Fintech Web App
Frontend:
- Next.js customer portal and React Native mobile app
- CDN delivery with WAF and bot mitigation
Identity:
- OAuth 2.0 login, MFA, and device-bound session management
Platform:
- API gateway to Node.js services for accounts, transfers, and notifications
Data:
- PostgreSQL for balances, Redis for sessions, S3 for statements
Integrations:
- Plaid for bank linking, Stripe for payments, Twilio for customer alerts`,
  },
  {
    label: "SaaS Platform",
    content: `SaaS Platform
Frontend:
- Multi-tenant React app for admins and end users
- Role-based dashboards for billing, support, and workspace settings
Identity:
- SAML SSO for enterprise tenants and email/password with MFA for SMB tenants
Platform:
- Next.js frontend, API gateway, and TypeScript services on Kubernetes
Data:
- PostgreSQL for tenant data, Redis for cache, object storage for uploads
Integrations:
- Stripe billing, SendGrid email, Datadog logging and alerting`,
  },
  {
    label: "AI SaaS System",
    content: `AI SaaS System
Frontend:
- Next.js web app with shared workspaces and usage analytics
- Real-time chat and document upload workflows
Identity:
- OIDC login, workspace roles, admin break-glass accounts with MFA
Platform:
- API gateway, Python inference workers, retrieval service, background job queue
Data:
- PostgreSQL metadata store, vector database, Redis cache, S3 document storage
Integrations:
- OpenAI or Gemini model API, Stripe billing, audit logs in SIEM`,
  },
  {
    label: "Banking API Platform",
    content: `Banking API Platform
Clients:
- Partner web portals and mobile clients connect through public APIs
- Internal operations console for disputes and payment investigations
Identity:
- OAuth 2.0 client credentials for partners and workforce SSO with hardware MFA
Platform:
- API gateway, Java and Node.js services, service mesh with mTLS
Data:
- Core ledger database, Kafka event streams, Redis rate limiting, encrypted object storage
Integrations:
- ACH processor, card network, fraud engine, customer messaging provider`,
  },
] as const;

type ArchitectureSummary = {
  services: string[];
  dataStores: string[];
  integrations: string[];
};

const SERVICE_PATTERNS = [
  { pattern: /\bapi gateway\b/i, label: "API Gateway" },
  { pattern: /\bpayment service\b/i, label: "Payment Service" },
  { pattern: /\bnotification service\b/i, label: "Notification Service" },
  { pattern: /\bportfolio service\b/i, label: "Portfolio Service" },
  { pattern: /\btrading service\b/i, label: "Trading Service" },
  { pattern: /\baudit service\b/i, label: "Audit Service" },
  { pattern: /\badmin service\b/i, label: "Admin Service" },
  { pattern: /\bretrieval service\b/i, label: "Retrieval Service" },
  { pattern: /\bapplication service\b/i, label: "Application Service" },
];

const DATA_STORE_PATTERNS = [
  { pattern: /\bpostgres(?:ql)?\b/i, label: "PostgreSQL" },
  { pattern: /\bmysql\b/i, label: "MySQL" },
  { pattern: /\bredis\b/i, label: "Redis" },
  { pattern: /\bs3\b/i, label: "S3" },
  { pattern: /\bdynamodb\b/i, label: "DynamoDB" },
];

const INTEGRATION_PATTERNS = [
  { pattern: /\bstripe\b/i, label: "Stripe" },
  { pattern: /\bplaid\b/i, label: "Plaid" },
  { pattern: /\btwilio\b/i, label: "Twilio" },
  { pattern: /\bsendgrid\b/i, label: "SendGrid" },
];

function extractArchitectureSummary(value: string): ArchitectureSummary {
  const text = value.trim();

  if (!text) {
    return {
      services: [],
      dataStores: [],
      integrations: [],
    };
  }

  const collectMatches = (patterns: Array<{ pattern: RegExp; label: string }>) =>
    patterns
      .filter(({ pattern }) => pattern.test(text))
      .map(({ label }) => label)
      .filter((label, index, all) => all.indexOf(label) === index);

  return {
    services: collectMatches(SERVICE_PATTERNS),
    dataStores: collectMatches(DATA_STORE_PATTERNS),
    integrations: collectMatches(INTEGRATION_PATTERNS),
  };
}

export default function ArchitectureInput({
  value,
  onChange,
  onGenerate,
  onReset,
  isLoading,
}: ArchitectureInputProps) {
  const [expanded, setExpanded] = useState(true);
  const summary = useMemo(() => extractArchitectureSummary(value), [value]);

  const handleSubmit = () => {
    if (!value.trim() || isLoading) {
      return;
    }

    onGenerate(value.trim());
    setExpanded(false);
  };

  const charCount = value.length;
  const isReady = charCount >= 50 && !isLoading;

  return (
    <div className="overflow-hidden rounded-xl border border-surface-700 bg-surface-900">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setExpanded((current) => !current);
          }
        }}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-surface-800/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-700">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">System Architecture</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {charCount > 0
                ? `${charCount.toLocaleString()} characters`
                : "Paste your architecture description or start from a preset"}
            </p>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-surface-700/50 px-5 pb-5">
          <div className="mt-4 rounded-lg border border-surface-700/70 bg-surface-950/50 p-3">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Architecture Presets
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ARCHITECTURE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onChange(preset.content);
                    setExpanded(true);
                  }}
                  className="rounded-full border border-surface-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:text-cyan-300"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`Describe your system architecture...

Include services, databases, auth mechanisms, third-party integrations, network topology, and trust boundaries.

Example: Next.js frontend, API gateway, Node.js microservices, PostgreSQL, Redis, S3, OIDC with MFA, Stripe and Plaid integrations.`}
            className="mt-4 h-52 w-full resize-none rounded-lg border border-surface-700 bg-surface-950 px-4 py-3 font-mono text-sm leading-relaxed text-slate-300 transition-colors placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
            spellCheck={false}
          />

          {(summary.services.length > 0 ||
            summary.dataStores.length > 0 ||
            summary.integrations.length > 0) && (
            <div className="mt-4 rounded-lg border border-surface-700/70 bg-surface-950/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Architecture Summary
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <SummarySection title="Services" items={summary.services} />
                <SummarySection title="Data Stores" items={summary.dataStores} />
                <SummarySection title="External Integrations" items={summary.integrations} />
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {charCount < 50 && charCount > 0 && (
                <p className="text-xs text-amber-500/70">
                  {50 - charCount} more characters needed
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1.5 rounded-lg border border-surface-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-surface-600 hover:bg-surface-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isReady}
                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200 ${
                  isReady
                    ? "cursor-pointer bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
                    : "cursor-not-allowed bg-surface-700 text-slate-600"
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    Generate Risk Register
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummarySection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-lg border border-surface-700/60 bg-surface-900/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-surface-700 bg-surface-950 px-2 py-1 text-sm text-slate-300"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-600">None detected</p>
      )}
    </div>
  );
}
