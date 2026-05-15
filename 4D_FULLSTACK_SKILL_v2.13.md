# SKILL: 4D Full-Stack Development Framework
**Version:** 2.13 | **Maintainer:** ANNAITECH SOLUTIONS (ATS) | Chennai  
**Scope:** Web · Mobile · AI Agents · Frontend · Backend · Security · Compliance  
**Classification:** Internal Engineering Standard — All Projects

---

## TABLE OF CONTENTS

```
00. HOW TO USE THIS SKILL
01. PHASE 1 — DEFINE
    1.1  Requirement Capture
    1.2  Stakeholder & Actor Mapping
    1.3  System Constraint Matrix
    1.4  STRIDE Threat Modeling
    1.5  Compliance Identification
    1.6  Define Gate Checklist

02. PHASE 2 — DESIGN
    2.1  Architecture Patterns
    2.2  System Design Standards
    2.3  Database Design
    2.4  API Contract Design
    2.5  Frontend Architecture
    2.6  Mobile Architecture
    2.7  AI Agent Architecture
    2.8  Security Architecture
    2.9  Infrastructure Design
    2.10 Design Gate Checklist

03. PHASE 3 — DEVELOP
    3.1  Universal Code Standards
    3.2  Frontend Development (Web)
    3.3  Mobile Development
    3.4  Backend Development
    3.5  AI Agent Development
    3.6  Database Development
    3.7  API Development
    3.8  Security Coding Standards
    3.9  State Management
    3.10 Real-Time Systems
    3.11 File & Media Handling
    3.12 Background Jobs & Queues
    3.13 Third-Party Integration Standards
    3.14 Develop Gate Checklist

04. PHASE 4 — DEBUG
    4.1  Testing Strategy & Pyramid
    4.2  Unit Testing
    4.3  Integration Testing
    4.4  End-to-End Testing
    4.5  Mobile Testing
    4.6  AI Agent Testing
    4.7  Security Testing (OWASP)
    4.8  Performance Testing
    4.9  Accessibility Testing
    4.10 Debug Methodology
    4.11 Code Review Standards
    4.12 Pre-Deploy Checklist
    4.13 Debug Gate Checklist

05. SECURITY MASTER REFERENCE
    5.1  Authentication & Authorization
    5.2  Data Protection
    5.3  Network Security
    5.4  Infrastructure Security
    5.5  Secrets Management
    5.6  Security Headers Matrix
    5.7  Vulnerability Management

06. COMPLIANCE FRAMEWORKS
    6.1  GDPR
    6.2  PCI-DSS
    6.3  HIPAA
    6.4  SOC 2
    6.5  ISO 27001
    6.6  India — IT Act & DPDP
    6.7  RBI / NPCI / UPI Guidelines
    6.8  WCAG 2.2 Accessibility

07. OBSERVABILITY & OPERATIONS
    7.1  Logging Standards
    7.2  Metrics & Monitoring
    7.3  Alerting
    7.4  Tracing
    7.5  Incident Response

08. CI/CD & DEVOPS
    8.1  Pipeline Standards
    8.2  Environment Strategy
    8.3  Container Standards
    8.4  IaC Standards
    8.5  Release Management

09. TECH STACK DEFAULTS (ATS)
10. ANTI-PATTERNS — NEVER DO
11. QUICK REFERENCE TABLES
```

---

## 00. HOW TO USE THIS SKILL

When this skill is active, Claude operates as a **Senior Principal Engineer + Security Architect**. Every response related to software development follows the 4D phases in order. No phase is optional.

**Activation:** Mention "4D skill", "use ATS standard", or paste this file into context.

**Claude behaviour when skill is active:**
1. Restate requirement as AAO before writing any code
2. Call out STRIDE threats before designing
3. Apply naming/structure/error rules from §3 verbatim
4. Flag any anti-pattern from §10 found in user code
5. Append the relevant gate checklist after deliverables
6. Never produce code with hardcoded secrets, missing error handling, or unvalidated inputs
7. For AI agent tasks, always include tool call safety checks and prompt injection guards
8. Cite the compliance section when regulated domains are detected

---

## 01. PHASE 1 — DEFINE

> *Clarity before code. Ambiguous input always produces wrong output.*

### 1.1 Requirement Capture

**AAO Model** — Every feature, task, or bug must be framed as:
```
[Actor] → [Action] → [Outcome] → [Constraint]

Examples:
  [Registered customer] → [scans palm at POS] → [payment deducted from UPI account] → [<2s, offline fallback required]
  [Admin] → [bulk-imports users via CSV] → [accounts created with role assignment] → [10k rows, async, email notification]
  [AI Agent] → [reads support ticket] → [classifies + routes to correct team] → [zero PII in logs]
```

**Edge Case Enumeration (Mandatory):**
```
For every feature list:
  - Null / empty inputs
  - Maximum / minimum boundary values  
  - Concurrent users performing same action
  - Network failure mid-operation
  - Partial success (e.g., 3 of 10 items saved)
  - Expired tokens / sessions mid-flow
  - Duplicate submission (double-tap, double-click)
  - Malformed data from third parties
  - Time zone edge cases
  - Character encoding edge cases (emoji, RTL, CJK)
  - Accessibility (keyboard-only, screen reader)
```

### 1.2 Stakeholder & Actor Mapping

| Actor Type | Privilege Level | Auth Method | Rate Limit |
|---|---|---|---|
| Anonymous | None | N/A | Low |
| End User | Standard | OAuth/OTP | Medium |
| Power User | Elevated | MFA Required | High |
| Admin | High | MFA + IP Restrict | High |
| Super Admin | Full | Hardware Key + MFA | Very High |
| Service / API | Service | API Key / mTLS | Configurable |
| AI Agent | Service | Scoped API Key | Strict |
| Webhook | Service | HMAC Signature | Per-source |

### 1.3 System Constraint Matrix

| Dimension | Questions | Impact |
|---|---|---|
| **Performance** | Max P99 latency? Peak RPS? Data size? | Architecture, caching, DB indexes |
| **Availability** | SLA (99.9 / 99.99%)? Planned downtime acceptable? | Multi-AZ, failover, circuit breakers |
| **Scalability** | Current users? 12-month growth? Burst events? | Auto-scaling, queue-based decoupling |
| **Consistency** | Strong or eventual? Financial transactions? | DB choice, saga vs 2PC |
| **Platform** | Browser versions? Mobile OS min? Node/Python version? | Polyfills, build targets |
| **Offline** | Must work offline? Partial or full? | Service workers, local DB (SQLite/MMKV) |
| **Internationalization** | Multi-language? RTL? Date/number formats? | i18n library, locale middleware |
| **Accessibility** | WCAG level? Govt requirement? | Component standards, ARIA, color contrast |
| **Budget / Time** | Hard constraints? MVP vs full? | Feature flags, phased delivery |
| **Vendor Lock-in** | Cloud-agnostic required? | Abstraction layers, open standards |

### 1.4 STRIDE Threat Modeling (Mandatory Before Design)

For every new system or feature, complete the STRIDE matrix:

| Threat | Description | Mitigations to Design In |
|---|---|---|
| **Spoofing** | Impersonating a user or service | Strong auth, token binding, mTLS for services |
| **Tampering** | Modifying data in transit or at rest | HMAC signatures, encryption, DB audit log |
| **Repudiation** | Denying an action occurred | Immutable audit trail, signed logs, non-repudiation tokens |
| **Information Disclosure** | Exposing data to unauthorized parties | RBAC, field-level encryption, response filtering |
| **Denial of Service** | Exhausting resources | Rate limiting, input size caps, circuit breakers, WAF |
| **Elevation of Privilege** | Gaining unintended permissions | Least privilege, RBAC enforcement, privilege audit |

**Attack Surface Inventory:**
```
Document every entry point:
  □ Public API endpoints
  □ Admin endpoints
  □ Webhook receivers
  □ File upload endpoints
  □ OAuth redirect URIs
  □ WebSocket connections
  □ AI agent tool call boundaries
  □ Background job triggers
  □ Third-party callbacks
  □ Mobile deep links
```

### 1.5 Compliance Identification

Check all that apply at project start. Each checked item activates its section in §06.

```
□ GDPR          — EU users or EU company data involved
□ PCI-DSS       — Payment card data processed or stored
□ HIPAA         — US health/medical data involved
□ SOC 2         — B2B SaaS with enterprise customers
□ ISO 27001     — Enterprise security certification required
□ DPDP Act      — Indian users' personal data (active 2024+)
□ IT Act 2000   — Any India-hosted system
□ RBI / NPCI    — Payments, UPI, prepaid instruments
□ SEBI          — Investment / brokerage data
□ IRDAI         — Insurance data
□ WCAG 2.2 AA   — Public sector, accessibility commitment, or US/EU requirement
□ COPPA         — Users under 13 years old
□ FERPA         — Student education records
```

### 1.6 Define Gate Checklist
```
□ Problem stated in one sentence
□ AAO model written for each actor
□ Edge cases enumerated (min. 8 per major feature)
□ STRIDE matrix completed
□ Compliance frameworks identified
□ Tech stack constraints captured
□ Performance/availability SLAs defined
□ Out-of-scope items explicitly listed
```

---

## 02. PHASE 2 — DESIGN

### 2.1 Architecture Patterns

Select ONE primary pattern and justify. Document trade-offs explicitly.

| Pattern | Use When | Trade-Offs |
|---|---|---|
| **Monolith** | MVP, small team, internal tool | Simple deploy; hard to scale parts independently |
| **Modular Monolith** | Growing team, domain clarity needed | Good balance; still single deploy |
| **Microservices** | Independent scaling, multiple teams, mature ops | Complex infra; network latency; distributed tracing needed |
| **Serverless** | Event-driven, unpredictable load, cost-sensitive | Cold starts; vendor lock-in; debug complexity |
| **Hexagonal (Ports & Adapters)** | Testability, domain purity, replaceable adapters | More boilerplate upfront |
| **Event-Driven / CQRS** | High read/write asymmetry, audit trail, eventual consistency OK | Complexity; eventual consistency edge cases |
| **BFF (Backend for Frontend)** | Multiple clients (web/mobile/partner) with different data needs | Extra service to maintain |
| **Edge Computing** | Latency-critical, geo-distributed users | Limited runtime, stateless only |

**Decision record template:**
```
Architecture: [Pattern Name]
Reason: [2-3 sentences]
Trade-offs accepted: [list]
Future migration path if scale exceeds this: [brief]
```

### 2.2 System Design Standards

```
Domain Boundaries
  - Define bounded contexts before writing any service
  - Each domain owns its data — no cross-domain direct DB access
  - Communicate across domains via: Events | APIs | Shared read models

Coupling Rules
  - Aim for loose coupling, high cohesion within modules
  - No circular dependencies between modules
  - External services isolated behind an adapter/gateway interface

Scalability Patterns to Design In From Day 1
  - Stateless services (session in Redis, not in-process)
  - Idempotent API operations (safe to retry)
  - Optimistic locking for concurrent writes
  - Async for anything > 200ms (queues, background jobs)
  - Graceful degradation (feature flags, circuit breakers)
```

### 2.3 Database Design

#### Relational (PostgreSQL Standard)
```
Primary Keys
  - Use UUID v7 (time-ordered) for all PKs — never sequential integers for exposed IDs
  - Exception: internal join tables may use composite PKs

Naming Conventions
  - Tables: snake_case plural (user_accounts, payment_transactions)
  - Columns: snake_case (created_at, user_id)
  - Indexes: idx_{table}_{columns} (idx_users_email)
  - FKs: fk_{table}_{ref_table} (fk_orders_users)
  - Constraints: chk_{table}_{rule} (chk_users_age_positive)

Mandatory Columns (every table)
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  deleted_at  TIMESTAMPTZ NULL  -- soft delete, never hard delete PII until retention period
  created_by  UUID REFERENCES users(id)

Sensitive Data Classification
  [PII]       — Name, email, phone, address, IP, device ID
  [ENCRYPTED] — National ID (Aadhaar), passport, card number, bank account
  [HASHED]    — Passwords (Argon2id), security answers
  [MASKED]    — Partial display (****1234), store full encrypted separately
  [SENSITIVE] — Salary, medical, legal, auth tokens

Index Strategy
  - Index every FK column
  - Index every column used in WHERE / ORDER BY / GROUP BY
  - Partial indexes for soft-deleted exclusions: WHERE deleted_at IS NULL
  - Never index low-cardinality columns (boolean, enum with <5 values)
  - Run EXPLAIN ANALYZE on all queries before shipping

Migration Rules
  - Every migration has an UP and DOWN script
  - Migrations must be backward-compatible (no column renames without alias)
  - Never DROP COLUMN in same migration as data migration
  - Lock-safe: use ADD COLUMN with DEFAULT not NOT NULL directly
  - Test migrations on staging with production-volume data
```

#### NoSQL (MongoDB / DynamoDB)
```
MongoDB
  - Embed if: sub-document always read with parent, max 16MB, no independent update
  - Reference if: large sub-document, independently updated, shared across docs
  - Always index fields used in $match, $sort, $lookup
  - Validate with JSON Schema at collection level
  - Never use $where (server-side JS execution — security risk)
  - Use transactions for multi-document writes that must be atomic

DynamoDB
  - Design access patterns BEFORE defining table
  - Single-table design where possible
  - Use composite sort key for range queries
  - GSI for alternate access patterns
  - Always set TTL for temporary/session data
  - Never use Scan in production
```

#### Redis
```
Key naming: {namespace}:{entity}:{id}:{attribute}
  Examples: session:user:abc123, cache:product:p789:details, ratelimit:ip:192.168.1.1

TTL rules:
  - ALL keys must have TTL — no eternal keys except explicit config
  - Sessions: 15-30 min (sliding)
  - Cache: per data freshness requirement
  - Rate limit counters: 1 min / 1 hour window
  - OTP: 5-10 min max

Never store: plain passwords, full PAN, unencrypted PII in Redis
Eviction policy: allkeys-lru for cache, noeviction for sessions
```

### 2.4 API Contract Design

#### REST Standards
```
URL Design
  /api/v{n}/resources           Collection
  /api/v{n}/resources/{id}      Resource
  /api/v{n}/resources/{id}/sub  Sub-resource
  /api/v{n}/resources/actions/bulk-update  Non-CRUD action (noun, not verb)

HTTP Methods
  GET     → Read (idempotent, no body)
  POST    → Create or non-idempotent action
  PUT     → Full replace (idempotent)
  PATCH   → Partial update (idempotent if designed correctly)
  DELETE  → Delete (idempotent)

Status Codes (use correctly)
  200 OK              — Success with body
  201 Created         — Resource created (include Location header)
  202 Accepted        — Async operation queued
  204 No Content      — Success, no body (DELETE, some PATCHes)
  400 Bad Request     — Client validation error
  401 Unauthorized    — Not authenticated
  403 Forbidden       — Authenticated but not authorized
  404 Not Found       — Resource doesn't exist
  409 Conflict        — Duplicate / state conflict
  422 Unprocessable   — Semantically invalid (failed business rule)
  429 Too Many Requests — Rate limited
  500 Internal Server — Server error (never expose details)
  502/503/504         — Gateway/upstream errors

Standard Response Envelope
  Success:
  {
    "success": true,
    "data": { ... },
    "meta": {
      "requestId": "req_abc123",
      "timestamp": "2026-05-07T10:30:00Z",
      "version": "1.0"
    }
  }

  Error:
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable message",
      "details": [{ "field": "email", "issue": "Invalid format" }],
      "requestId": "req_abc123"
    }
  }

  Paginated:
  {
    "success": true,
    "data": [...],
    "pagination": {
      "cursor": "eyJpZCI6IjEyMyJ9",
      "hasMore": true,
      "total": 1430
    }
  }

Versioning
  - URL versioning for public APIs (/v1/, /v2/)
  - Header versioning for internal: X-API-Version: 2
  - Deprecation header: Sunset: Sat, 31 Dec 2026 00:00:00 GMT
  - Support old version min 6 months after deprecation notice
```

#### GraphQL Standards
```
- Schema-first development (write SDL before resolvers)
- Use DataLoader for all N+1 prevention
- Implement query depth limit (max 7 levels)
- Implement query complexity scoring + limits
- Disable introspection in production
- Never expose internal IDs directly; use opaque Relay-style IDs
- Mutations return the mutated resource
- Use subscriptions for real-time (not polling)
- Persisted queries in production for known clients
```

#### WebSocket Standards
```
- Authenticate on connection (JWT in first message or query param — never URL path)
- Heartbeat/ping every 30s; disconnect on 2 missed pongs
- Message schema: { type, payload, requestId, timestamp }
- Rate limit messages per connection
- Max message size: 64KB (configurable per use case)
- Graceful reconnection with exponential backoff on client
- Never trust message payloads — validate same as REST input
```

### 2.5 Frontend Architecture

```
Component Architecture
  Atomic Design hierarchy:
    atoms/        — Button, Input, Icon, Badge (no business logic)
    molecules/     — SearchBar, FormField, CardHeader
    organisms/     — UserCard, ProductGrid, NavBar
    templates/     — PageLayout, DashboardLayout
    pages/         — Route-level components, data fetching boundary

State Management Layers
  Server State    → TanStack Query / SWR (remote data, cache, sync)
  UI State        → useState / useReducer (local component state)
  Global UI       → Zustand / Jotai (theme, modal stack, notifications)
  Form State      → React Hook Form + Zod (never useState per field)
  URL State       → URL params / search params (shareable state)

Routing Standards
  - File-based routing preferred (Next.js App Router / Expo Router)
  - Route guards for auth — redirect, don't hide
  - Layouts for shared UI — no prop drilling for nav/sidebar
  - Code-split at route level (lazy loading mandatory for routes)
  - 404 and error boundaries on every route

Rendering Strategy
  SSR   — SEO-critical, user-personalised, auth-gated pages
  SSG   — Marketing, docs, blog (built at deploy time)
  ISR   — Frequently updated but not real-time
  CSR   — Dashboards, highly interactive, auth-only tools
  Edge  — Geo-personalised, A/B testing, auth redirects

Performance Budget
  Core Web Vitals targets:
    LCP  < 2.5s   (Largest Contentful Paint)
    INP  < 200ms  (Interaction to Next Paint)
    CLS  < 0.1    (Cumulative Layout Shift)
  Bundle size limits:
    Initial JS:   < 150KB gzipped
    Initial CSS:  < 30KB gzipped
    Per route:    < 80KB gzipped
  Images:         WebP/AVIF, lazy-loaded, width/height set (no CLS)
```

### 2.6 Mobile Architecture

```
Architecture: Feature-Sliced Design or Clean Architecture
  presentation/   — Screens, components, navigation
  domain/         — Business logic, use cases, entities
  data/           — Repositories, APIs, local storage
  core/           — Utils, constants, theme, i18n

Navigation
  React Native: Expo Router (file-based) or React Navigation v7
  Deep links: Universal Links (iOS) / App Links (Android) — HTTPS-based
  Auth flow: separate navigator stack, never conditionally render screens

Offline Strategy
  - Define: fully offline, offline-read, or online-only for each feature
  - Local DB: SQLite via Drizzle ORM or WatermelonDB for complex data
  - Simple KV: MMKV (faster than AsyncStorage)
  - Sync: last-write-wins or conflict resolution strategy documented
  - Background sync: Expo Background Fetch / WorkManager (Android)

Performance
  - FlashList instead of FlatList for large lists
  - Memoize expensive renders (React.memo, useMemo, useCallback — only where profiled)
  - Avoid inline styles on list items (creates new objects each render)
  - Image: Expo Image with caching (not plain <Image>)
  - Heavy computation: offload to web worker / native thread
  - Target: 60fps on mid-range devices (Moto G / iPhone SE class)

Push Notifications
  - Expo Notifications (wraps FCM/APNs)
  - Never send PII in notification payload (payload fetched on open)
  - Store token in backend with user_id and platform
  - Handle token refresh (onTokenRefresh)
  - Permission request: explain value before requesting

Biometric Auth
  - expo-local-authentication (FaceID/Fingerprint/Iris)
  - Never store biometric templates — use OS-managed keystore
  - Fallback: PIN / password always available
  - Re-authenticate for sensitive actions regardless of session state

App Security
  - Certificate pinning for sensitive apps (expo-crypto / native module)
  - Obfuscate bundle in production (metro config)
  - No secrets in JS bundle — use environment configs + secure fetch
  - Root/jailbreak detection for payment or health apps
  - Screenshot prevention on sensitive screens (FLAG_SECURE / iOS blur)
```

### 2.7 AI Agent Architecture

```
Agent Patterns
  ReAct      — Reason + Act loop; good for multi-step tool use
  Plan-Act   — Plan full chain first, then execute; better for deterministic flows
  Reflection — Agent critiques its own output; better accuracy, higher latency
  Multi-Agent — Orchestrator + specialist agents; complex parallel tasks

Core Components to Design
  1. System Prompt        — Role, constraints, output format, safety rules
  2. Tool Registry        — All tools with schemas, permissions, rate limits
  3. Memory Layer         — Short-term (context), Long-term (vector/DB), Entity
  4. Guardrails           — Input/output validation, PII filter, toxicity filter
  5. Observability        — Full trace per run (input → reasoning → tool calls → output)
  6. Cost Control         — Token budget per run, model fallback chain
  7. Human-in-the-Loop    — Escalation triggers, approval gates for high-risk actions

Tool Design Rules
  Every tool MUST have:
    - Explicit JSON schema for input + output
    - Idempotency key support (safe to retry)
    - Timeout defined (never unbounded)
    - Permission scope (what agent can/cannot do with this tool)
    - Audit log entry on every call

  Tool permission tiers:
    READ_ONLY   — DB queries, file reads, API GETs
    WRITE       — DB writes, file writes, API POSTs (requires justification in trace)
    DESTRUCTIVE — Delete, send email/SMS, charge payment (requires human approval gate)
    EXTERNAL    — Any call to internet/third-party (logged, rate-limited)

Prompt Injection Defense
  - Never concatenate user input directly into system prompt
  - Sanitize all tool results before feeding back to agent
  - Use structural delimiters (XML tags, JSON boundaries) not prose
  - Validate that agent output matches expected schema before acting on it
  - Rate limit tool calls per agent run (max N tool calls)
  - Canary strings in context to detect prompt extraction attempts

Memory Architecture
  Conversation Memory: last N turns (sliding window)
  Semantic Memory: vector DB (Pinecone, pgvector, Chroma) — retrieved by relevance
  Entity Memory: structured KV (user preferences, extracted facts)
  Episodic Memory: past run summaries — compressed by importance

LLM Selection Matrix
  | Task                     | Model Choice           |
  |--------------------------|------------------------|
  | Simple classification    | Haiku / GPT-4o-mini    |
  | Complex reasoning        | Sonnet / GPT-4o        |
  | Long document analysis   | Claude (200k context)  |
  | Code generation          | Sonnet / Codex         |
  | Embeddings               | text-embedding-3-small |
  | Image understanding      | Claude Vision / GPT-4V |

RAG Pipeline Design
  Ingestion:  Chunk → Embed → Store (metadata: source, timestamp, access_level)
  Retrieval:  Query embed → Top-K similarity → Re-rank → Context assembly
  Generation: Retrieved context + user query → LLM → Output validation
  Eval:       Faithfulness + Relevance + Groundedness scores per run

Agentic Safety Rules
  - Principle of Least Privilege: agent gets only tools it needs for current task
  - Dry-run mode: log what agent WOULD do before production activation
  - Kill switch: per-agent circuit breaker (disable without redeploy)
  - Cost ceiling: hard token + API call budget per user/session
  - Never allow agent to modify its own system prompt or tool registry
  - All external-facing agent outputs go through output validation layer
```

### 2.8 Security Architecture

```
Authentication Stack
  Primary:      OAuth 2.0 + OIDC (Auth0, Supabase, Cognito, Keycloak)
  Fallback:     Email/OTP or Magic Link (no SMS-only auth for high-value)
  MFA:          TOTP (Google Authenticator) or WebAuthn / Passkeys (preferred)
  Service-to-Service: mTLS or short-lived JWT (no long-lived API keys for internal)
  Mobile:       Biometric + device-bound token (not SMS OTP alone)

Token Architecture
  Access Token:  JWT, signed RS256, exp ≤ 15 min, minimal claims
  Refresh Token: Opaque, stored httpOnly cookie, rotation on every use
  API Key:       For external partners — hashed in DB (SHA-256), prefix visible (sk_live_xxxx)
  Session:       Server-side session in Redis for server-rendered apps

Authorization Model
  Choose ONE: RBAC | ABAC | ReBAC (relationship-based)
  RBAC:   roles → permissions → resources (simple, most apps)
  ABAC:   attribute policies (user.department == resource.department)
  ReBAC:  Google Zanzibar model (complex sharing, Google Drive-style)

  Always check: Authentication → then Authorization — never skip either step
  Ownership check: user.id == resource.owner_id for user-owned resources
  Never derive permissions client-side — always enforce server-side

Zero Trust Principles
  - Verify every request — no implicit internal network trust
  - Encrypt service-to-service traffic (mTLS or internal JWT)
  - Segment networks: public → DMZ → app → data layers
  - Audit all access — log who accessed what, when
```

### 2.9 Infrastructure Design

```
Environment Strategy
  local     → developer machines (.env, docker-compose)
  dev       → shared integration (auto-deploy on PR merge to develop)
  staging   → production mirror (auto-deploy on release branch)
  prod      → production (manual approval gate in CI/CD)

Cloud Architecture (AWS Default)
  Compute:    ECS Fargate (containers) | Lambda (serverless) | EC2 (stateful)
  Database:   RDS Aurora PostgreSQL (Multi-AZ) | DynamoDB (NoSQL)
  Cache:      ElastiCache Redis (cluster mode for prod)
  Storage:    S3 (objects, static assets, backups)
  CDN:        CloudFront (static + API edge caching)
  Queue:      SQS + SNS (async tasks, fan-out)
  Search:     OpenSearch / Typesense (full-text search)
  Secrets:    AWS Secrets Manager + KMS
  Networking: VPC with private subnets for DB/cache; NAT gateway for outbound
  WAF:        AWS WAF on CloudFront + ALB

Disaster Recovery
  RTO (Recovery Time Objective):  define per system (e.g., ≤4h for payment)
  RPO (Recovery Point Objective): define per system (e.g., ≤5 min for payment)
  Backup:     Automated daily + point-in-time recovery for all DBs
  Failover:   Multi-AZ RDS (auto), ECS across 2+ AZs, S3 Cross-Region Replication
  Runbook:    Document restore procedure and test quarterly
```

### 2.10 Design Gate Checklist
```
□ Architecture pattern chosen + ADR written
□ Domain boundaries defined
□ ERD / data model with sensitivity classification
□ All PII/encrypted fields identified
□ API contracts written (method, auth, input schema, output schema, rate limit)
□ Auth strategy (OAuth/JWT/session) documented
□ Secrets management strategy defined
□ Infrastructure topology diagram (even rough)
□ DR/backup strategy defined
□ Performance budget set (web vitals / API latency / throughput)
□ AI agent tool registry with permissions (if applicable)
□ Compliance requirements mapped to design decisions
```

---

## 03. PHASE 3 — DEVELOP

### 3.1 Universal Code Standards

#### Naming Conventions
```
Variables:       camelCase, semantic  (userId, orderTotal, isVerified)
Functions:       verb + noun          (getUserById, validateToken, sendOtpEmail)
Classes:         PascalCase           (UserService, PaymentProcessor)
Interfaces/Types:PascalCase + I/T     (IUserRepository, TApiResponse)
Constants:       UPPER_SNAKE_CASE     (MAX_RETRY_COUNT, DEFAULT_PAGE_SIZE)
Enums:           PascalCase + values  (UserRole.ADMIN, PaymentStatus.FAILED)
Files (TS/JS):   kebab-case           (user-service.ts, payment.controller.ts)
Files (Python):  snake_case           (user_service.py, payment_handler.py)
DB tables:       snake_case plural    (user_accounts, payment_transactions)
CSS classes:     BEM or Tailwind      (.card__header, bg-blue-500)
Git branches:    type/ATS-{id}-slug   (feat/ATS-123-palm-auth, fix/ATS-456-null-crash)
```

#### Function Rules
```
Max lines per function:   30 (extract sub-functions if longer)
Max parameters:           3  (use object/options param if more needed)
Single Responsibility:    one function does exactly ONE thing
Return early:             guard clauses over nested if-else pyramids
Pure functions preferred: no hidden side effects; same input → same output
Async consistency:        don't mix callbacks and promises in same codebase
Immutability:             prefer const, avoid mutation of parameters

Bad:
  function handle(user, data, flag, type, ctx, cb) {
    if (user) { if (data) { if (flag) { ... } } }
  }

Good:
  function processOrder(input: ProcessOrderInput): Result<Order, OrderError> {
    if (!input.user)  return err('USER_REQUIRED');
    if (!input.items?.length) return err('EMPTY_CART');
    return orderDomain.create(input);
  }
```

#### Module / Folder Structure (Full-Stack)
```
project-root/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App router (pages, layouts)
│   │   ├── components/         # Atomic design components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── stores/             # Client state (Zustand/Jotai)
│   │   ├── styles/             # Global CSS, design tokens
│   │   └── public/             # Static assets
│   ├── mobile/                 # React Native (Expo)
│   │   ├── app/                # Expo Router screens
│   │   ├── components/
│   │   ├── hooks/
│   │   └── assets/
│   └── api/                    # Backend server
│       ├── src/
│       │   ├── config/         # Env, constants, feature flags
│       │   ├── domain/         # Business logic — ZERO framework imports
│       │   │   ├── user/       # Each domain is a vertical slice
│       │   │   │   ├── user.entity.ts
│       │   │   │   ├── user.service.ts
│       │   │   │   ├── user.repository.interface.ts
│       │   │   │   └── user.errors.ts
│       │   │   └── payment/
│       │   ├── infrastructure/ # DB, Redis, S3, queues, external APIs
│       │   │   ├── db/         # Migrations, ORM config, seeder
│       │   │   ├── cache/
│       │   │   ├── storage/
│       │   │   └── integrations/
│       │   ├── api/            # HTTP/WS layer
│       │   │   ├── middleware/ # Auth, rate-limit, logger, error handler
│       │   │   ├── validators/ # Zod/Joi schemas per route
│       │   │   ├── routes/
│       │   │   └── docs/       # OpenAPI spec
│       │   └── workers/        # Background jobs, event handlers
│       └── tests/              # Mirrors src/ structure
├── packages/                   # Shared packages (monorepo)
│   ├── shared-types/           # Shared TS types/interfaces
│   ├── shared-utils/           # Pure utility functions
│   └── shared-ui/              # Design system components
├── infra/                      # IaC (Terraform / CDK)
├── .github/workflows/          # CI/CD pipelines
├── docs/                       # ADRs, API docs, runbooks
└── docker-compose.yml          # Local dev stack
```

### 3.2 Frontend Development (Web)

```
Component Rules
  - Functional components only (no class components)
  - Custom hooks for: data fetching, complex state, side effects
  - Co-locate styles, tests, types with component (not in separate /styles)
  - No business logic in components — delegate to hooks or services
  - Prop types: always TypeScript interfaces, no inline types in JSX
  - Default export: only pages/screens; named export: everything else

Performance Patterns
  - Code-split every route: dynamic(() => import('./HeavyComponent'))
  - Virtualize lists > 50 items (TanStack Virtual / react-window)
  - Debounce search inputs (300ms), throttle scroll handlers
  - Avoid render-blocking in initial load (defer non-critical scripts)
  - useMemo/useCallback: only after profiling — not preemptively
  - Images: next/image or <img loading="lazy"> with explicit dimensions

Accessibility (WCAG 2.2 AA — Non-Negotiable)
  - Semantic HTML: <button> not <div onClick>, <nav> not <div>, <main> landmark
  - All interactive elements keyboard-focusable (Tab order logical)
  - Focus indicators: visible, min 3:1 contrast ratio
  - Color: never use color alone to convey meaning
  - Text contrast: min 4.5:1 (AA) | 7:1 (AAA for body)
  - aria-label on icon-only buttons, aria-describedby for complex inputs
  - Form errors: linked to field via aria-describedby, not just color
  - Skip-to-content link as first focusable element
  - Screen reader testing: NVDA (Windows) / VoiceOver (Mac/iOS)

Forms (React Hook Form + Zod)
  const schema = z.object({
    email: z.string().email(),
    amount: z.number().positive().max(100000),
  });
  
  - Validate on submit + on blur for UX
  - Show field-level errors below each input
  - Disable submit during submission (prevent double-submit)
  - Show loading state during async validation/submission
  - Clear form on unmount to prevent memory leaks

Styling Standards
  - Design tokens: CSS custom properties or Tailwind config
  - No magic numbers: use token (--spacing-4, not margin: 16px)
  - Dark mode: CSS prefers-color-scheme + class toggle
  - Responsive: mobile-first (min-width breakpoints)
  - No inline styles in production code (performance + CSP)
  - Animation: respect prefers-reduced-motion

i18n Standards
  - All user-facing strings in translation files (never hardcoded)
  - Pluralization: use ICU message format
  - Date/number: use Intl API with locale
  - RTL: use logical CSS properties (margin-inline-start not margin-left)
```

### 3.3 Mobile Development

```
Expo / React Native Standards
  - Use Expo SDK (managed workflow for most, bare only if native module unavailable)
  - TypeScript strict mode always
  - Expo Router for navigation (file-based, type-safe)
  - expo-secure-store for all sensitive data (tokens, keys) — never AsyncStorage
  - expo-crypto for random number generation (not Math.random)

Screen Component Structure
  screens/
    UserProfileScreen/
      index.tsx          — screen component (UI only)
      useUserProfile.ts  — data fetching + logic hook
      UserProfile.test.ts

Gesture & Animation
  - react-native-reanimated for complex animations (UI thread, no JS bridge)
  - react-native-gesture-handler for gestures (replaces built-in)
  - No heavy animations in list items (causes frame drops)

Connectivity Handling
  - expo-network for connectivity status
  - Always handle: offline, slow connection, request timeout
  - Retry with exponential backoff: 1s → 2s → 4s → 8s (max 3 retries)
  - User feedback: "No internet connection" with retry CTA (not silent fail)

Storage Strategy
  | Data Type          | Storage          |
  |--------------------|------------------|
  | Auth tokens        | expo-secure-store|
  | User preferences   | MMKV             |
  | Offline data       | SQLite (Drizzle) |
  | Cached images      | expo-image cache |
  | Large binary files | FileSystem       |

OTA Updates
  - expo-updates for JS-only changes (no native code changes)
  - Never push breaking changes via OTA
  - Rollback plan: expo-updates channel strategy (production/staging/rollback)
```

### 3.4 Backend Development

```
Fastify (Node.js) Standards
  - Use TypeBox schemas for route validation + OpenAPI generation
  - Register plugins in order: security → DB → auth → routes
  - Error handler plugin: centralized, structured, no stack trace to client
  - Rate limiting: @fastify/rate-limit with Redis store for distributed
  - CORS: @fastify/cors with explicit origin whitelist
  - Helmet: @fastify/helmet for security headers
  - Request IDs: auto-generated UUID on every request (X-Request-Id header)

FastAPI (Python) Standards
  - Pydantic v2 models for all request/response schemas
  - Dependency injection for: DB session, current user, permissions
  - Background tasks: Celery + Redis (not FastAPI BackgroundTasks for >1s work)
  - SQLAlchemy 2.0 with async sessions
  - Alembic for migrations
  - Structured logging: structlog with request_id in every log

Service Layer Pattern
  class UserService:
    def __init__(self, repo: UserRepository, events: EventBus):
      # dependencies injected — no direct DB access in service
    
    async def register(self, input: RegisterInput) -> User:
      # 1. Validate business rules (not HTTP concerns)
      # 2. Check uniqueness
      # 3. Hash password (never plain)
      # 4. Save via repository
      # 5. Emit domain event
      # 6. Return domain entity (not DB model)

Repository Pattern
  - Repository abstracts all DB access from domain
  - Domain layer depends on interface — not concrete implementation
  - This makes testing trivial (mock the interface)
  - One repository per aggregate root

Domain Events
  - Emit events for important state changes (user.registered, payment.completed)
  - Events are immutable value objects (never mutate after creation)
  - Handlers in separate listeners — domain code doesn't know about email/SMS/audit
  - Use transactional outbox pattern for reliable event delivery
```

### 3.5 AI Agent Development

```
System Prompt Engineering
  Structure:
    [ROLE]        — Who the agent is
    [CONTEXT]     — What it has access to, what it knows
    [TASK]        — What it must do
    [CONSTRAINTS] — What it must never do
    [FORMAT]      — Expected output structure
    [EXAMPLES]    — Few-shot if needed

  Rules:
    - System prompts are code — version-controlled, reviewed, tested
    - Define output format as JSON schema, not prose
    - Include explicit negative constraints ("never make up data", "never call X tool without Y condition")
    - No user-controlled input in system prompt — use user turn only

Tool Implementation Standards
  Every tool must:
    □ Have Pydantic/TypeBox schema for input validation
    □ Return structured response: { success, data, error }
    □ Have timeout (default 10s, max 60s)
    □ Log: tool_name, input_hash, duration, success/error to audit trail
    □ Be idempotent where possible
    □ Handle errors gracefully — agent must be able to recover
    □ Include rate limiting (per tool, per agent, per user)

Context Window Management
  - Count tokens before sending (tiktoken / Anthropic token counter)
  - Summarize old messages when approaching 70% context limit
  - Prioritize: [system prompt] > [recent messages] > [retrieved context] > [old history]
  - Never truncate mid-message — summarize complete exchanges

Output Validation
  - Parse LLM output as structured JSON (never trust free text for actions)
  - Schema validation before any tool call or final response
  - Confidence scoring: low confidence → escalate to human
  - Hallucination checks: verify factual claims against retrieved sources
  - PII filter on all outgoing responses

Evaluation Framework
  Metric            Target    Tool
  Faithfulness      > 0.9     RAGAS / TruLens
  Answer Relevance  > 0.85    RAGAS
  Context Recall    > 0.8     RAGAS
  Tool Call Accuracy> 0.95    Custom eval
  Latency P95       < 5s      APM
  Cost per Run      < budget  Token counter
```

### 3.6 Database Development

```
Query Standards
  - ALWAYS use parameterized queries / ORM — zero string concatenation with user data
  - SELECT only required columns — never SELECT *
  - LIMIT all queries (no unbounded fetch)
  - Soft delete: set deleted_at timestamp (never hard delete without policy)
  - Transactions: wrap multi-step writes in explicit transaction
  - Connection pooling: PgBouncer (PostgreSQL), connection pool config in ORM
  - Read replicas: route heavy reports/analytics to read replica

ORM Standards (Prisma / TypeORM / SQLAlchemy)
  - Generate types from schema — never hand-write DB types
  - Use ORM's migration system for schema changes
  - Never call raw query methods unless documented exception with audit trail
  - Eager load vs lazy load: explicit — never rely on ORM default

Data Seeding
  - Seed data in /infrastructure/db/seeds/
  - Dev seeds: realistic fake data (faker.js / Faker.py)
  - Test seeds: minimal deterministic fixtures
  - Never seed production with dev data
  - Seed scripts are idempotent (safe to run multiple times)
```

### 3.7 API Development

```
Request Lifecycle (enforce this order in middleware stack)
  1. Rate Limiting      — reject early before any processing
  2. Request ID         — attach unique ID to all logs/responses
  3. Request Logging    — log method, path, IP, user-agent (masked)
  4. Body Parsing       — parse and size-limit request body
  5. Input Validation   — schema validation (Zod/TypeBox/Pydantic)
  6. Authentication     — verify token/session
  7. Authorization      — check permissions for this resource
  8. Business Logic     — domain processing
  9. Response Shaping   — strip internal fields, format envelope
  10. Response Logging  — log status, duration, response size

Pagination Standards
  Cursor-based (preferred for large/real-time data):
    GET /orders?cursor=eyJpZCI6IjEyMyJ9&limit=20
    
  Offset (acceptable for small, stable datasets):
    GET /orders?page=2&per_page=20&total=true
    
  Always:
    - Default and max page size documented
    - Consistent sort order (use created_at + id for stable cursor)
    - Never allow client to specify unlimited results

File Upload Standards
  - Validate MIME type server-side (magic bytes, not extension or header alone)
  - Virus scan before storage (ClamAV or cloud equivalent)
  - Size limit enforced at API gateway + application level
  - Store in S3 with pre-signed URLs (never serve via app server)
  - File names: regenerate UUIDs for storage keys (never use client filename)
  - Image processing: sharp (Node) / Pillow (Python) — strip EXIF data (contains GPS/device info)

Idempotency
  - POST endpoints that create/charge must support Idempotency-Key header
  - Store key + response hash in cache (TTL 24h)
  - Return cached response if same key submitted again
  - Critical for: payment, email sending, order creation
```

### 3.8 Security Coding Standards

#### Input Validation
```
RULE: Validate at the boundary — every external input, every time.

Validation layers:
  API Gateway level:  request size, content-type, rate limit
  Controller level:   schema validation (types, formats, lengths, enums)
  Service level:      business rule validation (uniqueness, state machine)
  DB level:           constraints, check constraints (last defense)

Whitelist approach:
  ✅ Define what IS allowed (e.g., email: string, format email, max 255)
  ❌ Never blacklist (regex for "bad" characters always has gaps)

Specific rules:
  Strings:    max length always set, trim whitespace, validate charset
  Numbers:    min/max range, integer vs float, no NaN/Infinity
  Dates:      ISO 8601, validate range (not year 9999), not in past if required
  Files:      MIME type (magic bytes), max size, filename sanitized
  URLs:       whitelist allowed domains for redirects, block internal IPs (SSRF)
  HTML:       DOMPurify (client) / bleach (server) — NEVER regex sanitization
  SQL:        Parameterized ALWAYS — no exception
  Shell:      Never execute user input as shell — if unavoidable, use arg array
```

#### Authentication & Authorization
```
Passwords
  Hash:       Argon2id (preferred) or bcrypt (cost ≥ 12)
  Never:      MD5, SHA1, SHA256, plain, base64 — these are NOT password hashing
  Storage:    Hash only in DB — never plaintext, never reversible encryption
  
Tokens
  JWT signing:   RS256 (asymmetric) — never HS256 in multi-service
  Expiry:        access ≤ 15min, refresh ≤ 7 days (rotate on use)
  Storage:       httpOnly + Secure + SameSite=Strict cookie (not localStorage)
  Revocation:    maintain blocklist in Redis for logout/rotation
  Claims:        minimal (sub, iat, exp, jti, roles) — no PII in payload

Session Management
  Session ID:     cryptographically random (min 128 bits)
  Regenerate:     on privilege change (login, role change)
  Invalidate:     on logout, password change, suspicious activity
  Idle timeout:   15-30 min for sensitive apps
  Absolute timeout: 8-24 hours regardless of activity

Authorization Checks
  ✅ Check on EVERY request — no "secure by default for this route group"
  ✅ Check ownership: user.id === resource.owner_id
  ✅ Check role: user.role includes required permission
  ✅ Check tenant: resource.tenant_id === user.tenant_id (multi-tenant)
  ❌ Never derive permissions from data the client sends
  ❌ Never skip auth on "internal" routes exposed to any network
```

#### Injection Prevention
```
SQL         → Parameterized queries / ORM ALWAYS. Zero exceptions.
NoSQL       → Validate that operators ($where, $expr) aren't from user input
Shell       → Use arg arrays, not string interpolation. Never shell=True.
LDAP        → Escape DN and search filter special chars
XSS         → Escape HTML output; use innerText not innerHTML; CSP headers
SSRF        → Validate + allowlist URLs; block 169.254.x.x, 10.x, 172.16.x, localhost
XML/XXE     → Disable external entities in XML parser
Path Traversal → Resolve canonical path; verify it's within allowed directory
Template Injection → Never render user input through template engine
```

#### Cryptography Standards
```
Symmetric encryption:   AES-256-GCM (authenticated encryption)
Asymmetric encryption:  RSA-4096 or ECDSA P-256
Key derivation:         Argon2id (passwords) | PBKDF2-SHA256 (other KDF)
Hashing:                SHA-256 or SHA-3 (integrity); SHA-512 (HMAC)
Random:                 crypto.randomBytes (Node) | secrets module (Python) — NEVER Math.random
TLS:                    1.2 minimum; 1.3 preferred
Certificate:            Min RSA-2048 or ECDSA P-256; automated renewal (Let's Encrypt / ACM)

Key Management
  - Keys in AWS KMS / HashiCorp Vault — never hardcoded, never in .env for prod
  - Key rotation: automated (annual minimum for data keys, more for signing keys)
  - Envelope encryption: data key encrypted by master key (KMS envelope)
  - Key access audit logged
```

#### Secrets Management
```
Development:    .env file (gitignored) — docker-compose passes to container
Staging/Prod:   AWS Secrets Manager or Doppler — injected at runtime
CI/CD:          GitHub Actions Secrets / Vault — never in workflow YAML values

Pre-commit hooks (mandatory):
  gitleaks      — scans for secrets in commits
  detect-secrets — baseline + diff scan

Secret rotation:
  DB passwords:    auto-rotate every 30-90 days via Secrets Manager
  API keys:        rotate every 90 days or on personnel change
  JWT private key: rotate annually; support dual-key for zero-downtime rotation

What counts as a secret (never commit):
  Database credentials, API keys, JWT secrets, private keys, OAuth client secrets,
  webhook signing keys, SMTP passwords, cloud provider credentials, Stripe/Razorpay keys
```

### 3.9 State Management

```
State Taxonomy
  Server State:    remote data (fetched, cached, synchronized)
                   → TanStack Query / SWR
  Form State:      controlled form fields, validation
                   → React Hook Form + Zod
  Navigation State: current route, history
                   → Router (Next.js / Expo Router)
  URL State:       filters, pagination, search — shareable
                   → nuqs / useSearchParams
  Local UI State:  modals, tooltips, component-specific
                   → useState / useReducer
  Global UI State: theme, sidebar open, toast queue
                   → Zustand (small atoms) or Jotai

Rules
  - Derive state where possible (don't store what can be computed)
  - Server state ≠ client state (don't copy server data into Zustand)
  - Optimistic updates: apply immediately, rollback on error
  - Never store PII in URL params (visible in logs, analytics, history)
```

### 3.10 Real-Time Systems

```
Technology Selection
  WebSocket:   bi-directional, persistent (chat, live dashboards, collaboration)
  SSE:         server-to-client stream (notifications, logs, AI streaming)
  Long Poll:   fallback for restricted environments
  WebRTC:      peer-to-peer media (video calls — use mediasoup or LiveKit)

Scaling Real-Time
  - WebSocket servers are stateful — sticky sessions OR pub/sub adapter
  - Use Redis Pub/Sub or Kafka for message fan-out across server instances
  - Never broadcast to all connections (filter by room/user/tenant)
  - Connection limit per user: max 3 concurrent connections

Streaming AI Responses
  - SSE for LLM streaming (text/event-stream)
  - Client must handle: partial chunks, reconnect, final event
  - Server must handle: client disconnect mid-stream (cancel upstream LLM call)
  - Never stream PII or sensitive field values
```

### 3.11 File & Media Handling

```
Upload Flow
  1. Client requests pre-signed S3 URL from API (with metadata validation)
  2. Client uploads directly to S3 (bypass app server bandwidth)
  3. S3 triggers Lambda/SQS on completion
  4. Background worker: virus scan → EXIF strip → thumbnail generate → DB record

Security
  MIME validation:   magic bytes server-side (file-type library / python-magic)
  Filename:          never use client-provided filename in storage key
  Storage key:       UUID + extension only (s3://bucket/uploads/{uuid}.{ext})
  ACL:               private by default; serve via pre-signed URL (TTL 1h)
  Virus scan:        ClamAV (self-hosted) or Cloudmersive/VirusTotal (cloud)
  Image processing:  strip EXIF with sharp/Pillow before storing user-uploaded images
  Size limits:       enforce at API gateway + S3 bucket policy

Pre-Signed URL Rules
  - Short TTL: images 1h, documents 15min, downloads prompt = 5min
  - Scope to specific object key (not bucket-wide)
  - Content-Disposition: attachment for forced downloads
  - Log access: use S3 access logs + CloudFront logs
```

### 3.12 Background Jobs & Queues

```
Queue Selection
  BullMQ (Node.js):   Redis-backed, rich features, UI dashboard
  Celery (Python):    battle-tested, RabbitMQ or Redis broker
  AWS SQS:            managed, FIFO option, DLQ built-in
  Temporal:           durable workflows, long-running processes, sagas

Job Design Rules
  - Every job MUST be idempotent (safe to run multiple times)
  - Jobs MUST NOT rely on in-memory state from the enqueuing process
  - Input: serialize minimal data (IDs only, not full objects)
  - Max runtime: set timeout, fail if exceeded
  - Retry: exponential backoff, max 3-5 retries
  - DLQ: all failed jobs go to Dead Letter Queue with full context
  - Concurrency: set max concurrent workers per queue type
  - Priority queues: critical (payment) > standard (email) > low (analytics)

Monitoring
  - Dashboard: Bull Board (BullMQ) / Flower (Celery) / SQS console
  - Alerts: queue depth > threshold, DLQ size > 0, job failure rate > 1%
  - Metrics: jobs queued, processing, failed, duration P50/P95

Scheduled Jobs (Cron)
  - Cron expressions: document in human-readable comment
  - Distributed cron: one job runs per schedule (not N instances)
  - Leader election: use DB advisory lock or Redis lock (Redlock)
  - Log start + end + outcome of every scheduled run
```

### 3.13 Third-Party Integration Standards

```
API Client Pattern
  - Wrap every external API in an adapter class
  - Domain code depends on interface — not the SDK directly
  - This allows: mocking in tests, swapping vendors, feature flags

Resilience Patterns
  Timeout:         Always set (default 5s, 30s max for slow upstreams)
  Retry:           Idempotent requests only; exponential backoff; max 3
  Circuit Breaker: Open after 5 failures; half-open probe after 30s
  Fallback:        Return cached data or graceful degradation message

Webhook Handling
  - Verify signature on every incoming webhook (HMAC-SHA256 or vendor-specific)
  - Respond 200 immediately, process async (never slow-ack a webhook)
  - Idempotency: store webhook event ID, skip duplicates
  - Retry tolerance: handle vendor retrying same event up to 72h later
  - Log full raw payload (useful for debugging disputes)

Payment Integration (Razorpay / Stripe)
  - Never handle raw card data — use PCI-compliant JS SDK + server-side confirmation
  - Always verify payment server-side via webhook (not client callback alone)
  - Idempotency key on every charge attempt
  - Reconciliation job: daily cross-check of DB vs payment gateway records
  - Test mode: separate API keys, separate DB records (never mix test+live data)
```

### 3.14 Develop Gate Checklist
```
□ Code passes linting (zero errors, zero warnings allowed in prod)
□ TypeScript strict mode enabled (no any, no ts-ignore without comment)
□ All inputs validated at entry point with schema
□ Error handling on all async operations (no unhandled rejections)
□ Sensitive data masked in logs and API responses
□ No hardcoded secrets (gitleaks scan passed)
□ All new dependencies audited (npm audit / pip-audit — no high/critical)
□ API response envelopes consistent with standard
□ Database queries parameterized (no raw string concat)
□ File uploads: MIME validated, virus scan, EXIF stripped
□ Background jobs: idempotent, have DLQ, retry configured
□ AI agent tools: have schema, timeout, audit log entry
□ PR description: What → Why → How → Test steps → Checklist
```

---

## 04. PHASE 4 — DEBUG

### 4.1 Testing Strategy & Pyramid

```
                    ┌──────────────┐
                    │   E2E Tests  │  ~10%  Critical user journeys (Playwright/Detox)
                  ┌─┴──────────────┴─┐
                  │ Integration Tests │  ~30%  API contracts, DB, queue flows
                ┌─┴──────────────────┴─┐
                │      Unit Tests       │  ~60%  Domain logic, utils, transformers
                └───────────────────────┘

Coverage Minimums (enforced in CI — fail build if not met)
  Domain / Business Logic:   ≥ 90%
  API Controllers:           ≥ 75%
  Infrastructure Adapters:   ≥ 70%
  Utility Functions:         ≥ 95%
  AI Agent Tools:            ≥ 85%
  DB Migrations:             100% (UP and DOWN tested)
  Critical Paths (auth, payment, PII): 100%
```

### 4.2 Unit Testing

```
Framework: Vitest (TS/JS) | pytest (Python) | Jest (legacy)

Rules:
  - Test the domain/service layer — not the framework
  - Given / When / Then structure (or Arrange / Act / Assert)
  - One assertion per test case (multiple OK if testing one behaviour)
  - Mock at infrastructure boundaries (DB, HTTP, queues)
  - Test file mirrors source: user.service.ts → user.service.test.ts
  - No sleep() in tests — use fake timers or stub async calls
  - Descriptive names: describe('UserService.register') + it('should return error when email already exists')

What to unit test:
  ✅ Business logic, edge cases, error branches
  ✅ Data transformations, formatters
  ✅ Validation schemas (valid + invalid inputs)
  ✅ Domain entity invariants
  ✅ Pure utility functions

What NOT to unit test:
  ❌ Framework boilerplate (route registration, ORM setup)
  ❌ Third-party library internals
  ❌ Simple getters/setters with zero logic
```

### 4.3 Integration Testing

```
API Integration Tests (Supertest / HTTPX / pytest)
  - Start real server against test DB (transactions rolled back after each test)
  - Test the full HTTP cycle: request → middleware → controller → service → DB → response
  - Test: 200 happy path, 400 validation errors, 401/403 auth/authz, 404, 409, 500

What to test:
  ✅ Auth flows (register, login, token refresh, logout)
  ✅ CRUD operations with DB
  ✅ Queue job enqueue + processing
  ✅ Webhook signature verification
  ✅ File upload + storage
  ✅ Rate limiting (assert 429 after N requests)
  ✅ Pagination (first page, last page, cursor consistency)

DB Integration Tests
  - Use test DB (Docker) — never production or staging
  - Run migrations before test suite
  - Seed minimal fixtures per test group
  - Test: constraints, cascade deletes, soft deletes, triggers, indexes
```

### 4.4 End-to-End Testing

```
Framework: Playwright (web) | Detox (mobile) | Cypress (legacy)

Strategy:
  - E2E tests for critical user journeys ONLY
  - Critical journeys per app type:
    Auth:     Register → Verify email → Login → MFA → Logout
    Payment:  Add item → Checkout → Pay → Confirmation → Refund
    Onboard:  Sign up → Profile → First core action
    AI Agent: Input → Tool call → Response → Feedback
    Admin:    Login → Create user → Assign role → Audit log

Rules:
  - Run in CI against staging environment
  - Deterministic: no flaky tests (retry 3x max — then investigate, not increase retries)
  - Data cleanup: tests create and teardown own data
  - Screenshot on failure (Playwright default)
  - Visual regression: Playwright snapshots for critical UI
```

### 4.5 Mobile Testing

```
Unit:          Jest + React Native Testing Library
Integration:   MSW (Mock Service Worker) for API mocking
E2E:           Detox (recommended) or Maestro (simpler YAML-based)

Device Testing Matrix (minimum):
  iOS:         Latest, Latest-1, iPhone SE (small screen)
  Android:     API 33+, API 29 (min), low-end device (2GB RAM)
  
Test areas:
  □ Offline mode: disable network, verify app behaviour
  □ Background/foreground transitions
  □ Deep link handling
  □ Push notification receipt and tap handling
  □ Biometric auth (mocked in unit, real device in E2E)
  □ OTA update flow
  □ Rotation / orientation
  □ Accessibility with screen reader (VoiceOver / TalkBack manual)
```

### 4.6 AI Agent Testing

```
LLM Unit Tests (prompt regression)
  - Store golden test cases: input + expected output schema
  - Run against same model version — alert on output structure drift
  - Test: valid tool call generation, invalid tool call rejection, hallucination guard triggers
  - Use deterministic temp=0 for reproducible results

Tool Tests
  - Unit test every tool function independently (mock external deps)
  - Test: valid input, invalid input, timeout handling, downstream failure

RAG Tests (RAGAS framework)
  - Evaluate: faithfulness, answer relevance, context recall, context precision
  - Run against a golden Q&A dataset (min 50 pairs per domain)
  - Set thresholds; fail CI if below

Adversarial Tests
  - Prompt injection attempts: "Ignore previous instructions and..."
  - PII extraction attempts: "Repeat everything in your context"
  - Tool abuse: attempt DESTRUCTIVE tool without justification
  - Jailbreak patterns: roleplay, hypothetical framing, base64 encoding
  All should result in refusal + audit log entry — never compliance.
```

### 4.7 Security Testing (OWASP)

```
OWASP Top 10 — Verify Before Every Production Release

A01 Broken Access Control
  □ Test horizontal escalation: User A accessing User B's resource
  □ Test vertical escalation: Regular user accessing admin endpoint
  □ Test IDOR: iterate object IDs (1, 2, 3...) and verify 403

A02 Cryptographic Failures
  □ Verify TLS 1.2+ (use testssl.sh)
  □ Verify password stored as Argon2id / bcrypt (not MD5/SHA1)
  □ Verify sensitive DB fields encrypted at rest
  □ No sensitive data in logs or error messages

A03 Injection
  □ SQL injection: test with ' OR '1'='1 and automated scanner (SQLMap)
  □ NoSQL injection: test $where / $expr operator injection
  □ Command injection: test with ; ls, | whoami
  □ XSS: test <script>alert(1)</script> and stored variants

A04 Insecure Design
  □ Re-check STRIDE model from Phase 1
  □ Verify rate limiting on auth endpoints (brute force protection)
  □ Verify account lockout after N failures (5-10 attempts)

A05 Security Misconfiguration
  □ Debug mode disabled in production
  □ Default credentials changed on all services
  □ Unused ports closed, services disabled
  □ Directory listing disabled
  □ Error messages don't expose stack traces

A06 Vulnerable Components
  □ npm audit — zero high/critical
  □ pip-audit — zero high/critical
  □ Docker base image: scan with Trivy or Grype
  □ No abandoned packages (zero maintenance for 2+ years)

A07 Authentication Failures
  □ Brute force: rate limit + lockout on /auth/login
  □ Token replay: test using expired token
  □ Token reuse: test using refresh token twice
  □ Session fixation: verify session ID changes after login

A08 Software and Data Integrity Failures
  □ Dependency hashes pinned in lockfile
  □ CI pipeline validates artifact signatures
  □ Webhook signatures verified
  □ Deserialization: no pickle/marshal/YAML.load with user input

A09 Security Logging and Monitoring Failures
  □ Auth failures logged (login fail, token invalid)
  □ Privilege escalation attempts logged
  □ Large data exports logged
  □ Alerts configured for anomalies

A10 Server-Side Request Forgery (SSRF)
  □ Test with URL inputs: http://169.254.169.254 (AWS metadata)
  □ Test with: http://localhost, http://127.0.0.1, http://0.0.0.0
  □ Verify URL allowlisting blocks internal IPs
```

#### Automated Security Scanning
```
SAST (Static Analysis):
  Semgrep:    custom + community rules for injection, hardcoded secrets
  ESLint security plugin (JS/TS)
  Bandit:     Python

Dependency Scanning:
  Dependabot: automated PRs for vulnerable deps
  npm audit / pip-audit: in CI (fail on high/critical)
  Trivy:      Docker image scanning

Dynamic Testing (pre-production):
  OWASP ZAP: spider + active scan on staging
  Burp Suite: manual testing for high-value flows (payment, auth)

Penetration Testing:
  Annual external pentest for production systems
  Post-major-feature pentest for auth/payment changes
```

### 4.8 Performance Testing

```
Tools: k6 | Locust | Artillery | Apache JMeter

Test Types
  Load Test:    Expected normal + peak load. Verify SLA met.
  Stress Test:  Gradually increase until failure. Find breaking point.
  Spike Test:   Sudden 10x traffic. Verify graceful degradation.
  Soak Test:    Sustained load for 2-4h. Detect memory leaks.

Performance Targets (default — override per project)
  API P50 latency:      < 100ms
  API P95 latency:      < 500ms
  API P99 latency:      < 2000ms
  Web page LCP:         < 2.5s
  Mobile app launch:    < 3s cold start
  DB query P95:         < 50ms
  Queue job P95:        < 5s

Database Performance Checklist
  □ EXPLAIN ANALYZE on all queries added in PR
  □ No sequential scans on tables > 10k rows
  □ N+1 query check (use query logger / ORM debug mode)
  □ Connection pool sized correctly (CPU cores × 2 + effective_spindle_count)

Frontend Performance Checklist
  □ Lighthouse score: Performance > 90, Accessibility > 90
  □ Bundle analyzer run: no unexpected large packages
  □ No render-blocking resources on critical path
  □ Images optimized, lazy loaded, sized
```

### 4.9 Accessibility Testing

```
Automated (CI)
  axe-core (via @axe-core/playwright or jest-axe):  zero violations on critical pages

Manual
  Keyboard navigation:  Tab through entire page — every action reachable
  Screen reader (NVDA + Chrome / VoiceOver + Safari):  test key flows
  Zoom 200%:            no overflow, no horizontal scroll, no broken layout
  High contrast mode:   Windows High Contrast — all elements visible

WCAG 2.2 AA Checklist
  □ 1.1.1 Non-text content: alt text on all images
  □ 1.3.1 Info and relationships: semantic markup (headings, lists, tables)
  □ 1.4.3 Contrast: min 4.5:1 for text, 3:1 for UI components
  □ 2.1.1 Keyboard: all functionality available via keyboard
  □ 2.4.3 Focus order: logical, meaningful sequence
  □ 2.4.7 Focus visible: visible focus indicator
  □ 3.1.1 Language of page: lang attribute set
  □ 3.3.1 Error identification: errors described in text, not color alone
  □ 4.1.2 Name, Role, Value: custom components have ARIA roles/states
  □ 2.5.3 Label in Name: visible label matches accessible name
```

### 4.10 Debug Methodology

```
The 6-Step Protocol — No Random Guessing Allowed

STEP 1 — REPRODUCE
  Create the minimal reproduction.
  Document: exact input, exact environment, exact steps to trigger.
  If you cannot reproduce → you cannot fix → investigate environment first.

STEP 2 — ISOLATE
  Binary search: System → Service → Module → Function → Line
  Use structured logging and debugger — not console.log scatter-shot.
  Add temporary verbose logging at decision points.

STEP 3 — HYPOTHESIZE
  State ONE hypothesis: "I believe [X] causes [Y] because [Z]"
  Write it down. Do not fix multiple things simultaneously.

STEP 4 — VERIFY
  Design a targeted test or trace that proves or disproves the hypothesis.
  If disproved → back to Step 2, not guess again.
  If proved → proceed.

STEP 5 — FIX
  Minimal change that addresses root cause (not the symptom).
  Ask: "Does this fix introduce new risk?"
  Ask: "Does this fix break any existing tests?"
  Ask: "What monitoring will catch this if it regresses?"

STEP 6 — DOCUMENT
  Add a test that would have caught this bug.
  Add a comment explaining the non-obvious fix.
  If production-impacting: write a brief postmortem (5 Why's).
  Update runbook if operational change needed.
```

### 4.11 Code Review Standards

```
Reviewer Responsibilities
  - Review within 4 business hours of assignment
  - Be constructive: "Consider X because Y" not "This is wrong"
  - Distinguish: blocker (must fix) vs suggestion (consider) vs nit (optional)
  - Approve only when ALL blockers resolved

PR Checklist (Author — do before requesting review)
  Correctness
    □ Code does what the ticket requires
    □ Edge cases handled (from Define phase)
    □ Error paths covered and tested
    □ No regressions in existing tests

  Security
    □ No secrets in code
    □ Inputs validated at entry points
    □ Auth/authz checked on all protected operations
    □ No injection vectors (SQL, shell, XSS)
    □ Sensitive data masked in logs and responses
    □ Dependencies added: audited and justified

  Quality
    □ Names are clear, consistent with conventions
    □ No functions > 30 lines
    □ No commented-out dead code
    □ No TODOs without linked issue and owner
    □ No duplicate logic (DRY, but not over-abstracted)

  Tests
    □ New logic has tests
    □ Bugfix has regression test
    □ Coverage gate met
    □ CI green (lint + tests + audit)

  Ops
    □ DB migrations reversible
    □ No breaking API changes without versioning + notice
    □ Feature flags for risky rollouts
    □ Observability: logs, metrics, alerts for new critical paths
```

### 4.12 Pre-Deploy Checklist

```
Environment
  □ All env vars set in target environment (Secrets Manager / Doppler)
  □ No .env file committed or shipped in container image
  □ DB migrations tested on staging with production-size data
  □ Secrets rotated from dev → prod API keys
  □ Debug / verbose logging disabled in production config
  □ Feature flags configured for new features

Database
  □ Migration has been dry-run on staging
  □ Backup taken before running production migration
  □ Migration is backward-compatible (old code can run against new schema)
  □ Rollback migration (DOWN) written and tested

Security
  □ Security headers configured (see §5.6)
  □ CORS origins whitelisted for production domains
  □ Rate limits configured
  □ WAF rules reviewed
  □ SSL certificate valid (auto-renew configured)

Monitoring
  □ Health check endpoint responds (/health returns 200)
  □ APM / tracing configured and receiving data
  □ Error alerting configured (PagerDuty / Slack)
  □ Log aggregation flowing to platform (CloudWatch / Datadog)
  □ Dashboard for new critical metrics created

Performance
  □ Load test run on staging (results meet SLA targets)
  □ N+1 queries checked in new code paths
  □ Cache warming strategy for cold start (if applicable)

Rollback
  □ Previous container image tagged and retained
  □ DB rollback procedure documented
  □ Traffic rollback tested (blue/green or canary stop)
  □ Rollback runbook linked in release notes

Sign-Off
  □ QA / UAT passed by product/stakeholder
  □ Security checklist passed
  □ Release notes written
  □ On-call engineer aware of deployment
```

### 4.13 Debug Gate Checklist (Definition of Done)
```
□ All unit tests pass
□ All integration tests pass
□ E2E critical journey tests pass
□ Security scan: zero high/critical vulnerabilities
□ OWASP checklist reviewed for changed surface
□ Performance test results meet SLA
□ Accessibility: axe-core zero violations
□ Code review approved by ≥ 1 reviewer (≥ 2 for auth/payment changes)
□ Pre-deploy checklist signed off
□ Postmortem filed (if production-impacting bug)
```

---

## 05. SECURITY MASTER REFERENCE

### 5.1 Authentication & Authorization

```
OAuth 2.0 + OIDC Flow
  Authorization Code + PKCE:  Web and mobile clients (always use PKCE)
  Client Credentials:          Server-to-server (no user context)
  Device Flow:                 CLI tools, IoT devices

Token Validation (every request, every time)
  1. Signature valid (verify with public key)
  2. exp not in past
  3. iss matches expected issuer
  4. aud matches this service
  5. jti not in revocation blocklist
  6. User still exists and is active (cache this check, not every request)

Multi-Factor Authentication
  TOTP (RFC 6238):    Google Authenticator compatible — preferred
  WebAuthn/Passkey:   Phishing-resistant — preferred for high-value apps
  SMS OTP:            Acceptable for low-risk; vulnerable to SIM swap — document risk
  Email OTP:          Lower security than TOTP; acceptable for low-value actions
  Recovery Codes:     Always provide 8-10 single-use codes at MFA setup

Password Policy
  Minimum length:   12 characters
  Complexity:       Check against HaveIBeenPwned API (not just regex rules)
  History:          Prevent last 5 passwords
  Lockout:          5 failed attempts → 15 min lockout; alert user via email
  Reset:            Time-limited token (15 min), single-use, sent to verified email
```

### 5.2 Data Protection

```
Data Classification
  Level 0 — Public:       Marketing content, public APIs — no controls
  Level 1 — Internal:     Business data, metrics — standard access control
  Level 2 — Confidential: User data, financials — RBAC + audit log
  Level 3 — Restricted:   PII, health, payment — encryption + strict RBAC + DLP
  Level 4 — Secret:       Credentials, keys, biometrics — HSM/KMS + MFA access only

Encryption at Rest
  DB sensitive fields (Level 3-4): AES-256-GCM, application-level encryption
  DB backups: encrypted at snapshot level (RDS encryption enabled)
  Object storage: S3 SSE-KMS
  Logs: encrypt at aggregation platform level

Encryption in Transit
  All external traffic: TLS 1.2+ (TLS 1.3 preferred)
  Internal service traffic: TLS (mTLS for sensitive internal)
  No plain HTTP anywhere — enforce HTTPS redirect + HSTS

Data Minimization (GDPR/DPDP Principle)
  - Collect only data necessary for stated purpose
  - Don't log fields you don't need to debug
  - Return only fields client needs (no over-fetching from API)
  - Purge data after retention period (automated job)

Right to Erasure / Data Deletion
  - Soft delete first: mark deleted_at
  - Hard delete schedule: run 30 days after soft delete (or per compliance)
  - Anonymization alternative: replace PII with pseudonym (retain analytics)
  - Cascade: verify related records also handled (comments, logs, exports)
  - Deletion request: logged with timestamp, confirmed via email
```

### 5.3 Network Security

```
Ingress Controls
  WAF:           AWS WAF / Cloudflare WAF (OWASP managed ruleset enabled)
  DDoS:          AWS Shield Standard (free) / Cloudflare (minimum)
  Rate Limiting: API Gateway level + app level (defense in depth)
  IP Allowlist:  For admin endpoints and internal APIs
  Bot Protection:Cloudflare Bot Management / reCAPTCHA v3

Network Segmentation
  Public Subnet:    Load balancer, NAT gateway only
  Private Subnet:   Application servers — no direct internet access
  Isolated Subnet:  DB, cache, queue — reachable only from app subnet
  Management:       Bastion host or VPN for admin access — no direct SSH

CORS Policy
  Development:  localhost:3000, localhost:8080 etc.
  Production:   Explicit whitelist of production domains ONLY
  Never:        Access-Control-Allow-Origin: * for authenticated endpoints
  Preflight:    Verify OPTIONS handler configured correctly

DNS Security
  DNSSEC:       Enable on all production domains
  CAA Records:  Restrict which CAs can issue certificates for your domain
  SPF/DKIM/DMARC: Configure for all sending domains (email security)
```

### 5.4 Infrastructure Security

```
Container Security
  Base image:     Official, minimal (alpine or distroless preferred)
  Run as non-root:USER node (or app) in Dockerfile — never root
  Read-only FS:   --read-only flag where possible
  Capabilities:   Drop all, add back only required (--cap-drop ALL --cap-add NET_BIND_SERVICE)
  Secrets:        Injected via environment at runtime — never baked into image
  Scanning:       Trivy in CI pipeline — fail on HIGH/CRITICAL
  Registry:       Private ECR — never public for production images

EC2 / VM Hardening
  OS patches:     Automated (AWS Systems Manager Patch Manager)
  SSH:            Key-based only, disable password auth, non-default port
  Firewall:       Security groups allow only required ports
  IMDSv2:         Enforce IMDSv2 on all EC2 instances (prevents SSRF to metadata)
  Monitoring:     CloudWatch Agent + GuardDuty

IAM Least Privilege
  - No wildcard (*) in production IAM policies
  - Service roles scoped to specific resources and actions
  - No long-term user access keys — use roles everywhere
  - Access key rotation: 90 days max (prefer roles)
  - IAM Access Analyzer: review external access quarterly
```

### 5.5 Secrets Management

```
Hierarchy
  Local Dev:    .env (gitignored, never committed)
  CI/CD:        GitHub Actions Secrets / Vault
  Runtime:      AWS Secrets Manager (auto-rotation) or Doppler

Pre-Commit Enforcement
  gitleaks:      Blocks commits containing secrets (regex + entropy)
  detect-secrets:Baseline file committed; CI fails on new secrets
  
Secret Categories + Rotation Schedule
  DB passwords:         Auto-rotate 30-90 days (Secrets Manager)
  JWT signing keys:     Rotate 90 days; dual-key for zero-downtime
  External API keys:    Rotate 90 days or on team member offboarding
  Internal service keys:Rotate 30 days
  Encryption data keys: Rotate 1 year (envelope encryption via KMS)
  
Access Audit
  - Every secret access logged (who, what, when, from where)
  - Alert on: first access from new IP, bulk access, access outside business hours
```

### 5.6 Security Headers Matrix

```http
# Apply to all web responses via middleware

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
Content-Security-Policy:
  default-src 'self';
  script-src  'self' 'nonce-{random}';
  style-src   'self' 'unsafe-inline';
  img-src     'self' data: https://cdn.yourapp.com;
  connect-src 'self' https://api.yourapp.com wss://ws.yourapp.com;
  font-src    'self';
  frame-src   'none';
  object-src  'none';
  base-uri    'self';
  form-action 'self';
  upgrade-insecure-requests;

# API responses only
Cache-Control: no-store
Pragma: no-cache

# Additional for sensitive pages (auth, payment)
Clear-Site-Data: "cache", "cookies", "storage"  (on logout)
```

### 5.7 Vulnerability Management

```
Continuous Scanning
  Code:           Semgrep / CodeQL (GitHub Advanced Security) on every PR
  Dependencies:   Dependabot auto-PRs for vulnerable deps
  Containers:     Trivy in CI + ECR image scanning
  Infrastructure: Prowler (AWS) quarterly

Severity Response SLA
  Critical:  Patch within 24 hours. Incident declared.
  High:      Patch within 72 hours.
  Medium:    Patch within 2 weeks (next sprint).
  Low:       Backlog; patch within 90 days.
  
Bug Bounty / Responsible Disclosure
  - security.txt at /.well-known/security.txt
  - Dedicated security@annaitech.com email
  - Response commitment: acknowledge 48h, triage 7 days
```

---

## 06. COMPLIANCE FRAMEWORKS

### 6.1 GDPR (EU General Data Protection Regulation)

```
Applies when: EU users' personal data processed or EU company client

Lawful Basis (must have ONE for each processing activity)
  Consent:          Explicit, informed, withdrawable, documented
  Contract:         Necessary to fulfil service agreement
  Legal Obligation: Required by law
  Legitimate Interest: Proportionate, documented, privacy impact assessed

Technical Requirements
  □ Privacy notice accessible before data collection
  □ Consent logged (timestamp, version, IP hash)
  □ Right to access: export user's data within 30 days of request
  □ Right to erasure: delete or anonymize within 30 days
  □ Right to portability: export in machine-readable format (JSON/CSV)
  □ Data minimization: collect only what's necessary
  □ Privacy by design: default settings most privacy-preserving
  □ DPA (Data Processing Agreement) with all processors (AWS, Stripe etc.)
  □ Breach notification: report to DPA within 72 hours if >250 people affected
  □ DPO appointment: required if large-scale systematic processing

Data Retention Matrix (document per data type)
  Account data:     duration of account + legal hold period
  Transaction logs: 7 years (accounting requirement)
  Marketing emails: until unsubscribe + 30 days
  Access logs:      90 days (security), then anonymize
  Biometric data:   as short as technically possible + consent duration
```

### 6.2 PCI-DSS v4.0 (Payment Card Industry)

```
Applies when: card data processed, stored, or transmitted

Scope Reduction Strategy (most important step)
  - Use tokenization: never store raw PAN (Primary Account Number)
  - Use hosted fields (Stripe Elements, Razorpay SDK) — card data never touches your server
  - Achieve SAQ A (simplest assessment) by outsourcing all card handling

If in scope — Critical Requirements
  Req 2:  No default passwords on any system component
  Req 3:  No stored cardholder data unless absolutely necessary; if stored → encrypted
  Req 4:  TLS 1.2+ for all cardholder data transmission
  Req 6:  Vulnerability management (patch within 1 month for critical)
  Req 7:  Least privilege access to cardholder data environment
  Req 8:  Unique IDs for all users; MFA for all admin access
  Req 10: Audit logs for all access to cardholder data (retain 12 months)
  Req 11: Quarterly vulnerability scans + annual penetration test
  Req 12: Information security policy documented and trained annually

Technical Controls
  □ No PAN in logs, URLs, or error messages — ever
  □ PAN masked in display (first 6 + last 4 maximum)
  □ CVV: never stored after authorization — zero exceptions
  □ Card data encrypted with AES-256 if stored
  □ Network segmentation: CDE isolated from general systems
  □ File integrity monitoring on all CDE systems
```

### 6.3 HIPAA (US Health Insurance Portability and Accountability Act)

```
Applies when: PHI (Protected Health Information) of US patients

PHI Definition: Any health information + 18 identifiers (name, DOB, phone, IP, etc.)

Technical Safeguards Required
  □ Access Control: unique user ID, auto-logoff, encryption/decryption mechanism
  □ Audit Controls: log all PHI access (read, write, delete) with user + timestamp
  □ Integrity:      detect unauthorized PHI modification (checksums, version history)
  □ Transmission Security: TLS for all PHI in transit — no exceptions
  □ Authentication: verify identity before PHI access

Operational Requirements
  □ Business Associate Agreement (BAA) with all vendors who touch PHI (AWS, etc.)
  □ Minimum necessary: access limited to what's needed for the function
  □ Breach notification: notify HHS and patients within 60 days of discovery
  □ Risk analysis: documented, annual, comprehensive
  □ Workforce training: annual HIPAA training for all staff with PHI access

Data Rules
  □ PHI never in logs (even for debugging)
  □ PHI encrypted at rest (AES-256) and in transit (TLS 1.2+)
  □ PHI not in development/test environments (anonymize or synthetic data)
  □ De-identification: remove all 18 identifiers for research use
```

### 6.4 SOC 2 Type II

```
Applies when: B2B SaaS with enterprise customers or processing customer data

Five Trust Services Criteria
  Security (CC):         Mandatory — logical and physical access, change management
  Availability (A):      SLA commitments, uptime, incident response
  Confidentiality (C):   Protecting confidential customer data
  Processing Integrity:  Accurate, complete, timely data processing
  Privacy (P):           Collection, use, retention, disclosure of personal info

Key Controls to Implement
  □ Change management: all changes via PR, reviewed, tested before production
  □ Access reviews: quarterly review of all system and data access
  □ Vendor management: assess third-party security posture
  □ Incident response plan: documented, tested annually
  □ Vulnerability management: scanning + patch SLA
  □ Penetration testing: annual
  □ Backup and recovery: tested quarterly
  □ Encryption: at rest and in transit
  □ Availability monitoring: uptime tracking, SLA reporting
  □ Security awareness training: annual for all staff

Audit Evidence
  - Maintain evidence for every control (screenshots, logs, policies)
  - Common evidence: CloudTrail logs, access review records, training records, PR history
```

### 6.5 ISO 27001

```
Applies when: Enterprise security certification required

Key Domains (Annex A Controls)
  A.5  Information Security Policies: documented, approved, communicated
  A.6  Organisation: defined roles, separation of duties
  A.7  Human Resources: screening, contracts, offboarding
  A.8  Asset Management: inventory, classification, handling
  A.9  Access Control: policy, user management, privilege management
  A.10 Cryptography: policy on use of controls
  A.11 Physical Security: secure areas, equipment
  A.12 Operations: procedures, malware protection, logging, backup
  A.13 Network Security: controls, information transfer
  A.14 System Development: SDLC security, change control
  A.15 Supplier Relationships: security in supplier agreements
  A.16 Incident Management: response, reporting, learning
  A.17 Business Continuity: planning, BCP/DR
  A.18 Compliance: legal, regulatory, technical review
```

### 6.6 India — IT Act & DPDP

```
IT Act 2000 + Amendments
  Section 43A: Reasonable security practices for sensitive personal data
  Section 72A: Penalty for disclosure of personal information in breach of contract
  SPDI Rules 2011: Rules for sensitive personal data (financial, health, biometric, passwords)

DPDP Act 2023 (Digital Personal Data Protection)
  Applies to: Processing of digital personal data of Indian residents

  Key Requirements
  □ Consent notice: clear, plain language, before data collection
  □ Consent mechanism: affirmative, granular, withdrawable
  □ Data fiduciary registration (when notified)
  □ Data Principal rights: access, correction, erasure, grievance
  □ Purpose limitation: use data only for specified purpose
  □ Data localisation: significant data fiduciaries — critical data in India
  □ Data Protection Officer: appoint DPO if significant data fiduciary
  □ Breach notification: within 72 hours to Data Protection Board
  □ Cross-border transfer: permitted to notified countries only

Penalties: up to ₹250 Crore for significant breaches
```

### 6.7 RBI / NPCI / UPI Guidelines

```
Applies when: Payment processing, UPI, prepaid instruments, lending in India

Key Requirements for UPI / Payment Systems
  □ Device binding: UPI transaction tied to registered device
  □ OTP: 2FA required for registration and high-value transactions
  □ Transaction limits: honour NPCI-defined per-transaction and daily limits
  □ PIN security: encrypted at device, never stored in plain text
  □ Fraud monitoring: real-time anomaly detection, suspicious pattern alerting
  □ Reconciliation: daily settlement reconciliation with NPCI
  □ Audit trail: complete transaction audit log (5-year retention)
  □ Uptime SLA: 99.5%+ availability for payment services
  □ Incident reporting: report to NPCI within 6 hours for significant incidents
  □ RBI IT framework: governance, risk management, business continuity

Biometric Payments (relevant for palm vein projects)
  □ UIDAI compliance if Aadhaar-linked
  □ FIDO2 or vendor-certified biometric standards
  □ Biometric template: stored only on device or certified hardware — not in cloud
  □ Liveness detection: required to prevent spoofing
  □ Fallback: always provide non-biometric fallback (PIN/OTP)
```

### 6.8 WCAG 2.2 Accessibility

```
Level AA Compliance — Minimum for all public-facing products

Perceivable
  1.1 Text alternatives for all non-text content
  1.2 Captions for all video/audio
  1.3 Adaptable: content presentable in different ways without losing meaning
  1.4 Distinguishable: color, contrast, resize, spacing

Operable
  2.1 Keyboard accessible: all functionality via keyboard
  2.2 Enough time: adjustable timeouts, no time-limited content
  2.3 No seizures: no flashing > 3 times per second
  2.4 Navigable: skip links, page titles, focus order, link purpose
  2.5 Input modalities: pointer gestures have keyboard alternative

Understandable
  3.1 Readable: language identified, unusual words explained
  3.2 Predictable: consistent navigation, no unexpected context changes
  3.3 Input assistance: error identification, labels, suggestions

Robust
  4.1 Compatible: valid HTML, name/role/value for all components
  
New in WCAG 2.2 (additional to 2.1)
  2.4.11 Focus not obscured (min): focused element not completely hidden
  2.4.12 Focus not obscured (enhanced): completely visible when focused
  2.5.3 Dragging movements: functionality also available without drag
  2.5.7 Target size (minimum): at least 24×24 CSS pixels
  3.2.6 Consistent help: help mechanisms in same relative location
  3.3.7 Redundant entry: don't ask for same info twice in same session
  3.3.8 Accessible authentication: no cognitive tests unless alternatives exist
```

---

## 07. OBSERVABILITY & OPERATIONS

### 7.1 Logging Standards

```
Structured Logging (JSON format, every log line)
{
  "timestamp": "2026-05-07T10:30:00.123Z",  // ISO 8601 always
  "level": "info",                           // error | warn | info | debug
  "service": "payment-service",
  "version": "1.4.2",
  "requestId": "req_7x9abc",
  "userId": "usr_***xyz",                    // masked last 3 chars
  "action": "payment.initiated",
  "duration_ms": 145,
  "message": "Payment initiated successfully",
  "metadata": { "amount": 1500, "currency": "INR" }
}

Log Levels
  ERROR:  Unexpected failures requiring immediate attention. Alert triggered.
  WARN:   Degraded state, retry occurred, suspicious activity. Investigate.
  INFO:   Key business events. Who did what (high signal, not verbose).
  DEBUG:  Detailed trace. ONLY in development. Never ship to production.

What to log (INFO level)
  ✅ Auth events: login success/fail, logout, MFA, token refresh
  ✅ Business events: order created, payment processed, user registered
  ✅ Security events: permission denied, invalid token, rate limit hit
  ✅ External calls: start + end + status + duration
  ✅ Job execution: start + end + outcome
  ✅ Errors: with requestId, stack trace (sanitized)

What NEVER to log
  ❌ Passwords (plain or hashed)
  ❌ Auth tokens, session IDs, API keys
  ❌ Full credit card numbers, CVV
  ❌ Aadhaar, PAN, passport numbers (or any national ID)
  ❌ Medical or biometric data
  ❌ OTPs / 2FA codes
  ❌ Private keys or secrets of any kind

Log Retention
  Application logs:   30 days hot, 1 year archive
  Security/audit logs:1 year hot, 5 years archive (compliance)
  Access logs:        90 days, then anonymize
  Payment audit:      7 years (financial regulation)
```

### 7.2 Metrics & Monitoring

```
Golden Signals (monitor ALL four for every service)
  Latency:    P50, P95, P99 response time
  Traffic:    Requests per second (by endpoint, by status)
  Errors:     Error rate % (4xx and 5xx separately)
  Saturation: CPU %, memory %, queue depth, DB connections used

Business Metrics (instrument in code, not just infra)
  DAU / MAU, conversion funnel, payment success rate,
  AI agent success rate, feature adoption, user retention

Dashboards (create at feature launch)
  Service dashboard:  golden signals per service
  Business dashboard: key business KPIs
  Security dashboard: failed auth, rate limit hits, WAF blocks
  Infra dashboard:    CPU, memory, disk, network per server/container

Alerting (define at design phase, not after incidents)
  P1 - Critical:  5xx error rate > 1%, payment failures, service down → PagerDuty immediately
  P2 - High:      Error rate trending up, latency > 2x baseline → Slack #alerts
  P3 - Medium:    Queue depth growing, disk > 80% → Slack #infra
  P4 - Low:       Slow queries, cache miss rate increase → ticket created
```

### 7.3 Alerting Rules

```
Alert Anti-Patterns (avoid)
  Alert fatigue:    Too many low-signal alerts → team ignores ALL alerts
  Missing context:  Alert fires but no dashboard/runbook linked
  No owner:         Alert fires but nobody knows who to page
  Always on:        Alert is always firing → becomes wallpaper

Alert Best Practices
  Every alert must have: condition, severity, owner, runbook link
  Test alert routing monthly (fire test alert, verify it reaches on-call)
  Review + prune alerts quarterly (remove stale, tune thresholds)
  Anomaly detection for: traffic drops (not just spikes), unusual access hours
```

### 7.4 Tracing

```
Distributed Tracing: OpenTelemetry (OTEL) → Jaeger / Datadog / X-Ray

Trace every request across services:
  - HTTP requests (auto-instrumented via OTEL SDK)
  - DB queries (capture query, duration — not values for PII queries)
  - External API calls
  - Queue enqueue + dequeue
  - Cache hit / miss
  - Background job execution

Trace IDs:
  - Generated at entry point (API gateway or first service)
  - Propagated to ALL downstream services (W3C Trace Context headers)
  - Included in all log lines (correlate logs ↔ traces)
  - Returned as X-Request-Id in response headers (useful for support)

AI Agent Tracing (LangSmith / custom)
  - Trace every agent run: input → planning → tool calls → output
  - Log: model used, token count, latency, tool call results
  - Flag runs: error, slow, high cost, low confidence
  - Retain traces for 30 days for debugging and eval
```

### 7.5 Incident Response

```
Severity Levels
  P1 - Critical:  Production down, data breach, payment failure
                  Response: 15 min, war room immediately
  P2 - High:      Significant feature degraded, latency > 3x
                  Response: 30 min, assign owner
  P3 - Medium:    Non-critical feature degraded, workaround exists
                  Response: 2 hours during business hours
  P4 - Low:       Minor issue, no user impact
                  Response: Next sprint planning

Incident Response Runbook
  1. DETECT    — Alert fires or user report received
  2. ASSESS    — Determine severity, affected scope, data risk
  3. DECLARE   — Open incident channel, page on-call, notify stakeholders
  4. MITIGATE  — Restore service (rollback, scale up, disable feature flag)
  5. RESOLVE   — Root cause identified and fixed
  6. POSTMORTEM— Written within 48h: timeline, root cause, 5 Whys, action items

Postmortem Culture
  - Blameless: focus on systems and processes, not people
  - Action items: each has an owner and due date
  - Shared: published internally for learning
  - Tracked: action items reviewed in next sprint
```

---

## 08. CI/CD & DEVOPS

### 8.1 Pipeline Standards

```
Every PR must pass ALL stages before merge:

Stage 1 — Fast Checks (< 2 min)
  □ Lint (ESLint / Ruff / golangci-lint) — zero errors
  □ Type check (tsc --noEmit)
  □ Secret scan (gitleaks)
  □ Commit message format (conventional commits)

Stage 2 — Tests (< 10 min)
  □ Unit tests
  □ Integration tests
  □ Coverage gates enforced

Stage 3 — Security (< 5 min)
  □ Dependency audit (npm audit / pip-audit — fail on high/critical)
  □ SAST scan (Semgrep)
  □ Container scan (Trivy) if Dockerfile changed

Stage 4 — Build & Package (< 5 min)
  □ Production build
  □ Container image build + push (tagged with git SHA)

Stage 5 — Deploy to Staging (automated)
  □ Deploy to staging environment
  □ Run smoke tests against staging
  □ Run E2E critical path tests

Stage 6 — Deploy to Production (manual approval gate)
  □ Manual approval required (on-call + tech lead)
  □ Canary or blue/green deploy
  □ Monitor golden signals for 15 min before full rollout
  □ Automated rollback if error rate > 2% during rollout
```

### 8.2 Environment Strategy

```
Environment   Branch         Deploy Trigger    DB
local         feature/*      manual            docker-compose
dev           develop         PR merge          shared dev DB
staging       release/*       auto              staging DB (prod mirror)
production    main            manual approval   production DB

Feature Flags
  Tool: LaunchDarkly / Unleash / custom Redis flags
  New features: always behind flag in production
  Flag naming: {team}_{feature}_{action} (payments_biometric_enabled)
  Cleanup: remove flag and dead code within 2 sprints of full rollout

Release Strategy
  Standard features:  Direct deploy (< 5% risk)
  High-risk changes:  Canary (5% → 25% → 100% with monitoring gates)
  Experimental:       Feature flag for % of users
  Database changes:   Expand-Contract pattern (backward-compatible migrations)
```

### 8.3 Container Standards

```
Dockerfile Best Practices
  FROM node:20-alpine AS base        # Minimal base, pinned version
  
  # Multi-stage builds (dev deps not in prod image)
  FROM base AS deps
  COPY package*.json ./
  RUN npm ci --only=production
  
  FROM base AS final
  RUN addgroup -g 1001 appgroup &&  \
      adduser  -u 1001 -G appgroup -S appuser
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY --chown=appuser:appgroup . .
  USER appuser                         # Non-root!
  EXPOSE 3000
  CMD ["node", "dist/server.js"]

Rules
  - Pin base image to specific digest (not just tag) for production
  - Multi-stage: production image contains ZERO dev dependencies
  - Non-root user ALWAYS
  - .dockerignore: exclude node_modules, .env, .git, tests
  - No secrets baked into layers (use runtime env injection)
  - Health check in Dockerfile: HEALTHCHECK CMD curl -f /health || exit 1
  - One process per container (no supervisor/cron inside app container)

Image Tagging Strategy
  :latest         — Never use in production (unpredictable)
  :{git-sha}      — Use for production deploys (deterministic, traceable)
  :{semver}       — Tag after successful prod deploy for rollback reference
  :staging        — Points to latest staging-tested image
```

### 8.4 IaC Standards (Terraform)

```
Structure
  infra/
  ├── modules/          # Reusable modules (vpc, rds, ecs-service)
  ├── environments/
  │   ├── dev/
  │   ├── staging/
  │   └── production/
  └── global/           # Route53, IAM, shared resources

Rules
  - Remote state: S3 backend + DynamoDB locking
  - Workspace or directory per environment (never single workspace for all envs)
  - terraform plan required before terraform apply in CI
  - Production apply: requires PR approval + manual confirm
  - No hardcoded values: variables for everything environment-specific
  - Secrets: use aws_secretsmanager_secret data source — never in .tfvars
  - Tagging: all resources tagged (project, environment, team, cost-center)
  - Module versioning: pin modules to specific git tag
  
Drift Detection
  - Scheduled CI job: terraform plan on production, alert on any drift
  - Remediate: never make manual console changes — update IaC
```

### 8.5 Release Management

```
Semantic Versioning: MAJOR.MINOR.PATCH
  MAJOR: Breaking API changes
  MINOR: New backward-compatible features
  PATCH: Bug fixes

Conventional Commits (enforced in CI)
  feat:     New feature (bumps MINOR)
  fix:      Bug fix (bumps PATCH)
  BREAKING: Breaking change (bumps MAJOR)
  chore:    Build/tooling (no version bump)
  docs:     Documentation only
  test:     Tests only
  perf:     Performance improvement
  refactor: No functional change

Release Notes (auto-generated from conventional commits)
  - Every release has CHANGELOG.md entry
  - Grouped: Features | Fixes | Breaking Changes | Dependencies
  - Include migration guide for MAJOR versions
  - Deprecation notices: 1 major version in advance
```

---

## 09. TECH STACK DEFAULTS (ATS)

```
Layer             Default                         Alternative / When
─────────────────────────────────────────────────────────────────────────────
Backend API       Node.js + Fastify + TypeScript   Python + FastAPI (ML-heavy)
                                                   Go + Gin (high-throughput)
Frontend          Next.js 15 + TypeScript          Vite + React (SPAs)
Mobile            React Native + Expo SDK 51+      Flutter (native perf critical)
Desktop           Electron + React                 Tauri (smaller bundle)
Database          PostgreSQL (Aurora Serverless v2) MongoDB (truly schema-less)
Cache             Redis (ElastiCache cluster)       Memcached (simple K/V only)
Search            Typesense (self-hosted fast)      OpenSearch (complex queries)
Queue             BullMQ (Node) / Celery (Python)  AWS SQS (cloud-native)
Realtime          Socket.io / native WebSocket     Ably / Pusher (managed)
Object Storage    AWS S3                           Cloudflare R2 (egress-free)
CDN               CloudFront                       Cloudflare
Auth              Auth0 / Supabase Auth             Custom JWT (small projects)
Email             Resend / AWS SES                 SendGrid
SMS               Twilio / MSG91 (India)           AWS SNS
Push Notif        Expo Notifications (FCM/APNs)    OneSignal
AI / LLM          Anthropic Claude (via API)       OpenAI GPT-4o
AI Framework      LangChain / LangGraph            Custom orchestration
Vector DB         pgvector (PostgreSQL ext)         Pinecone / Weaviate
Embeddings        text-embedding-3-small           Cohere embed
ORM               Prisma (Node) / SQLAlchemy        Drizzle (edge/perf)
Migrations        Prisma Migrate / Alembic         Flyway
IaC               Terraform                        AWS CDK (TypeScript)
Container         Docker + AWS ECS Fargate         Kubernetes (large scale)
CI/CD             GitHub Actions                   GitLab CI
Secrets           AWS Secrets Manager + KMS        Doppler (simpler)
APM               Datadog                          New Relic / OpenTelemetry
Logging           CloudWatch + structured JSON     ELK Stack
Error Tracking    Sentry                           Rollbar
Feature Flags     LaunchDarkly                    Unleash (self-hosted)
Testing (Unit)    Vitest + Testing Library         Jest
Testing (E2E)     Playwright (web) + Detox (mobile)Cypress
Load Testing      k6                              Locust
Design System     Tailwind CSS + shadcn/ui         Chakra UI / MUI
Form Validation   React Hook Form + Zod            Formik (legacy)
State (server)    TanStack Query                   SWR
State (client)    Zustand                          Jotai
API Docs          OpenAPI 3.1 + Swagger UI         Redoc
```

---

## 10. ANTI-PATTERNS — NEVER DO THESE

```
Security Anti-Patterns
  ❌ Hardcode secrets, API keys, or DB credentials in source code
  ❌ Store plain-text passwords (use Argon2id / bcrypt only)
  ❌ Use Math.random() for security tokens (use crypto.randomBytes / secrets)
  ❌ Store JWT in localStorage (CSRF attack vector — use httpOnly cookie)
  ❌ Disable SSL certificate verification (verify=False, rejectUnauthorized: false)
  ❌ Wildcard CORS in production (Access-Control-Allow-Origin: *)
  ❌ Return stack traces or raw DB errors to the client
  ❌ Trust client-provided user ID or role in request body
  ❌ Build SQL queries via string concatenation with user input
  ❌ Use eval(), exec(), or Function() with user-controlled input
  ❌ Pass user input directly to shell commands
  ❌ Skip auth checks on "internal" or "trusted" network endpoints
  ❌ Use MD5 or SHA1 for password hashing
  ❌ Log passwords, tokens, full PAN, Aadhaar, OTPs, or secrets

Code Quality Anti-Patterns
  ❌ God objects / God functions — one class/function doing everything
  ❌ Magic numbers — use named constants with meaning
  ❌ Deep nesting (> 3 levels) — extract or return early
  ❌ Copy-paste code instead of abstracting
  ❌ Commented-out dead code in production branches
  ❌ TODOs without an owner and issue link
  ❌ Catch(e) {} with empty body — silently swallows errors
  ❌ console.log / print debug statements shipped to production
  ❌ Return HTTP 200 with error in body (use correct status codes)
  ❌ SELECT * from database (always specify columns)
  ❌ Unbounded queries (always set LIMIT)
  ❌ Circular dependencies between modules

Architecture Anti-Patterns
  ❌ Cross-domain direct DB access (domain A reads domain B's table)
  ❌ Synchronous blocking calls for operations > 200ms in request path
  ❌ N+1 queries in any API endpoint
  ❌ Shared mutable state across concurrent request handlers
  ❌ Deploying migrations without a tested rollback script
  ❌ Hard-deleting user data without checking retention/compliance policy
  ❌ Storing user files on application server disk (use S3/object storage)
  ❌ Using app server memory for sessions (use Redis)
  ❌ Building without feature flags for risky production changes
  ❌ Making manual console changes to production infrastructure

AI Agent Anti-Patterns
  ❌ Concatenating user input directly into system prompt
  ❌ Giving agent DESTRUCTIVE tools without human approval gate
  ❌ No timeout on agent tool calls (infinite hang possible)
  ❌ Acting on raw LLM output without schema validation
  ❌ No kill switch or circuit breaker for runaway agents
  ❌ Logging full LLM responses containing PII
  ❌ No audit trail for agent tool calls (unaccountable automation)
  ❌ Letting agent modify its own system prompt or tool permissions
  ❌ No cost ceiling — agents can burn unlimited API budget
  ❌ Single agent for everything — no separation of concerns

Operational Anti-Patterns
  ❌ Deploying without monitoring in place
  ❌ No runbook for common failure modes
  ❌ Silencing alerts because they're "always firing" (fix the root cause)
  ❌ No DLQ for background jobs (failed jobs silently dropped)
  ❌ Not testing backups (untested backups are not backups)
  ❌ Running production containers as root
  ❌ Using :latest tag in production deployments
  ❌ No rollback plan for every production deploy
  ❌ On-call without a documented escalation path
```

---

## 11. QUICK REFERENCE TABLES

### 4D Phase Gate Summary

| Phase | Entry Condition | Key Outputs | Exit Gate |
|---|---|---|---|
| **DEFINE** | Ticket / request received | AAO, STRIDE, compliance flags, constraints | §1.6 checklist complete |
| **DESIGN** | Define gate passed | Architecture ADR, ERD, API contracts, auth strategy | §2.10 checklist complete |
| **DEVELOP** | Design gate passed | Clean code, validated inputs, structured errors, tests | §3.14 checklist complete |
| **DEBUG** | PR submitted | All tests pass, security scan clean, review approved | §4.13 checklist complete |

### HTTP Status Code Quick Reference

| Code | Meaning | Use Case |
|---|---|---|
| 200 | OK | Successful GET, PATCH response |
| 201 | Created | POST created a resource |
| 202 | Accepted | Async operation queued |
| 204 | No Content | DELETE success |
| 400 | Bad Request | Schema validation failure |
| 401 | Unauthorized | No / invalid token |
| 403 | Forbidden | Valid token, insufficient permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate record |
| 422 | Unprocessable | Business rule violation |
| 429 | Too Many Requests | Rate limit hit |
| 500 | Server Error | Unexpected server fault |

### Compliance Quick-Scan

| Domain | Regulation | Key Technical Requirement |
|---|---|---|
| EU users | GDPR | Consent, erasure, data minimization |
| Card payments | PCI-DSS | No raw PAN storage, TLS, audit logs |
| US health | HIPAA | PHI encryption, audit trail, BAA |
| B2B SaaS | SOC 2 | Change mgmt, access reviews, pen test |
| India personal data | DPDP Act | Consent, data principal rights |
| India payments | RBI / NPCI | 2FA, device binding, reconciliation |
| Public web | WCAG 2.2 AA | Keyboard, contrast, screen reader |

### Severity → Response Matrix

| Severity | Vuln SLA | Incident Response | Deploy Approval |
|---|---|---|---|
| Critical | 24 hours | War room + 15 min | Emergency — CEO/CTO |
| High | 72 hours | 30 min assign | P1: Tech Lead + On-call |
| Medium | 2 weeks | 2 hours business day | Standard PR process |
| Low | 90 days | Next sprint | Standard PR process |

---

*SKILL — 4D Full-Stack Development Framework*  
*Version 2.13 | ANNAITECH SOLUTIONS | Chennai, India*  
*All projects at ATS are governed by this standard. Deviations require written ADR.*
