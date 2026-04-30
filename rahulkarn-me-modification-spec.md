# rahulkarn.me — Portfolio Repositioning Spec

**For:** Claude Code execution
**Repo:** rahulkarn.me (the personal portfolio site)
**Goal:** Reposition the site from "Enterprise Systems Architect / consulting" to "Senior .NET Engineer · InsurTech & Financial Systems / open to senior remote engineering roles."

---

## 1. Context — Read this first

The current site is well-designed but positions the owner (Rahul Karn) as an independent enterprise architecture consultant selling fixed-scope engagements (F-01 through F-04). This positioning overstates current capability and points at the wrong market.

The new positioning targets **remote senior .NET engineering roles** at InsurTech and FinServ companies. The unique differentiator is **8+ years of life-insurance-domain depth + working .NET production experience + MSc Data Science (Coventry) + MBA Finance (IGNOU)** — an uncommon combination that is genuinely strong for InsurTech employers.

The case studies on the site are real and stay. The architect framing, consulting service catalog, and aspirational "engagements" are what change.

This spec mirrors the just-finalized resume — keep them in sync. If anything in the codebase contradicts the resume, the resume wins.

---

## 2. Core positioning changes (master reference)

Use this table as the ground-truth find/replace reference for the whole site:

| Old (current site) | New (replacement) |
|---|---|
| `Enterprise Systems Architect` | `Senior .NET Engineer` |
| `Senior .NET Engineer · InsurTech & Financial Services` (subtitle variant) | `Senior .NET Engineer · InsurTech & Financial Systems` |
| `working architect, not a slide-deck consultant` | `working engineer, not a slide-deck consultant` |
| `Independent · W-8BEN ready` | `Open to remote roles · W-8BEN ready` |
| `Open for engagement · 2026 Q2` | `Open to senior remote roles · 2026` |
| `Available for US-remote consulting` | `Open to senior remote engineering roles` |
| `Independent contractor; W-8BEN ready` | `4+ hrs/day US-Eastern overlap. W-8BEN ready for contract roles.` |
| `architect new systems from the ground up, modernize legacy platforms` | `build new systems from the ground up and modernize legacy platforms` |
| `production-ready system designs: C4 blueprints, domain models, security architectures, data-platform strategies, and phased execution plans` | `production systems handling regulated financial transactions, with ownership of architecture decisions, security posture, and database performance` |
| `I produce designs my own engineering teams have to build` | `I build production systems and lead the engineers shipping alongside me` |
| `Most engagements open with the F-01 review` | (delete — see Section 6 below) |

**Tone shift:** Throughout the site, replace consulting/architect framing with engineering/builder framing. The owner *builds and ships* systems with a team — they don't just *design blueprints other people execute*.

---

## 3. Document/site metadata

Update the visible site metadata block (it appears near the top of the cover section as `Document v 4.2 / Issued 2026-04`):

- Bump version to `v 5.0` (signals major rewrite)
- Update issue date to current month/year at time of execution
- Subtitle of document: change `Rahul Karn — Enterprise Systems Architect` to `Rahul Karn — Senior .NET Engineer`

Update HTML `<title>` and any meta description tags:

- **`<title>`**: `Rahul Karn — Senior .NET Engineer · InsurTech & Financial Systems`
- **meta description**: `Senior .NET engineer with 8+ years building production insurance and financial systems — policy admin, claims, payments, agent portals — at one of Nepal's largest life insurers. Open to senior remote engineering roles.`
- **OG title / OG description**: same as above
- **OG image**: leave unchanged unless one references "architect" in alt text

---

## 4. Section 00 — Cover / Hero

### Current hero copy (find and replace):

**Current:**
> **Platforms for operators where downtime costs money, security failure costs trust, and migration risk costs both.**
>
> Eight years inside one of Nepal's largest insurance estates — designing and modernizing **policy admin, claims, payments, agent portals, asset management**. Working US-Eastern hours. Producing blueprints engineers can build.

**Replace with:**
> **Production .NET systems for insurance and finance — where downtime costs money, security failure costs trust, and migration risk costs both.**
>
> Eight years inside one of Nepal's largest insurance estates — building and modernizing **policy admin, claims, payments, agent portals, asset management**. Working US-Eastern hours. Shipping systems that handle real money, real users, and real regulatory scrutiny.

### Hero buttons / CTAs:

- Keep `Selected Work →`, `CV ↓`, `Contact →` buttons.
- **Remove or rename `Engagements →` button** — change to `Experience →` and link to the experience section instead. (The Engagements section is being deleted; see Section 6.)

### Hero stats block ("Dossier — Selected Numbers"):

Keep all four stats — they're real. Make these specific edits:

- `Years — Insurance & FinServ — 8+` → keep as-is
- `Active Users — Enterprise platform — 90k` → keep as-is
- `Query Latency — P95 reduction — 50%` → change to `Query Latency — Reduction across Oracle/SQL Server — ~50%` (softens the specific P95 framing to match the resume)
- `Portfolio Assets — NPR · transaction volume — 100B+` → keep as-is

---

## 5. Section 01 — Profile

### Current heading:

> A working architect, *not a slide-deck consultant.*

**Replace with:**

> A working engineer, *not a slide-deck consultant.*

### Current profile body:

> I produce designs my own engineering teams have to build — which keeps the diagrams honest and the migration plans buildable.
>
> **Enterprise Systems Architect** with 8+ years designing, building, and modernizing mission-critical platforms in insurance and financial services. I architect new systems from the ground up, modernize legacy platforms onto .NET 10/8 LTS and cloud-native stacks, and embed AI/ML into core business workflows — underwriting, claims, fraud detection, predictive analytics.
>
> Engagements produce production-ready system designs: C4 blueprints, domain models, security architectures, data-platform strategies, and phased execution plans. Proven at scale across a 90,000-user platform, a 50% database performance program, NPR 100B+ asset portfolio systems, and 6+ engineer teams led through complex transformations.
>
> Based in Kathmandu, deep in Nepal's insurance infrastructure since 2017 — working US-Eastern hours and shipping systems that handle real money, real users, and real regulatory scrutiny.

### Replace entire profile body with:

> I build production systems alongside the engineers shipping them — which keeps the architecture honest and the migration plans buildable.
>
> **Senior .NET engineer** with 8+ years building, modernizing, and operating mission-critical platforms in insurance and financial services. I build new systems from the ground up, modernize legacy platforms onto modern .NET stacks, and bring data and AI thinking into core business workflows — underwriting, claims, payments, fraud, predictive analytics.
>
> Proven at scale across a 90,000-user platform, a ~50% database performance program, NPR 100B+ asset portfolio systems, and a 6+ engineer team coordinated through phased modernization.
>
> Combining hands-on engineering with formal training in data science (MSc, Coventry) and finance (MBA, IGNOU) — bringing analytical and business depth uncommon in core engineering roles.
>
> Based in Kathmandu, deep in Nepal's insurance infrastructure since 2017 — working US-Eastern hours and shipping systems that handle real money, real users, and real regulatory scrutiny.

### Profile sidebar / contact card:

**Current:**
> Rahul Karn
> Enterprise Systems Architect
> Kathmandu, Nepal · UTC+5:45
> Independent · W-8BEN ready

**Replace with:**
> Rahul Karn
> Senior .NET Engineer · InsurTech & Financial Systems
> Kathmandu, Nepal · UTC+5:45
> Open to remote roles · W-8BEN ready

---

## 6. Section 02 — Selected Work (Case Studies)

**Keep all three case studies.** They're real, they're the strongest evidence on the site, and they should remain. Apply only the targeted edits below.

### Case Study 1: 90,000-User Enterprise Portal

- **Heading:** `90,000-User Enterprise Portal — Monolith to Modular` → keep as-is
- **My Role section:** Replace `Owned end-to-end architecture` with `Owned the technical design and build` — small framing shift toward engineering.
- Everything else in this case study stays.

### Case Study 2: 50% Database Performance Gain

This case has specific numbers (P95 1,200ms → 580ms, DB CPU 92% → 54%, etc.) that should be softened to match the resume's positioning. The improvement is real; the precise framing should not lock down numbers that may need to be defended in interviews.

- **Heading:** `50% Database Performance Gain — Oracle & SQL Server at Scale` → change to `~50% Database Performance Gain — Oracle & SQL Server at Scale`
- **Tag chip showing `P95 1200 → 580 ms`:** Replace with `Query latency reduced ~50%` (drop the specific ms numbers from the chip).
- **Before/After table:** Keep the table but adjust the specific values:
  - `P95 query latency: 1,200 ms → 580 ms` → change to `Query latency: significantly reduced (~50%)`
  - `DB CPU peak: 92% → 54%` → change to `DB CPU at peak: substantially lower under same load`
  - `Timeouts / week: 12+ → < 1` → keep as-is (this is a directional pattern, not a precise measurement)
  - `Peak-hour throughput: 1× → 2×` → change to `Peak-hour throughput: meaningfully higher`

The point of these edits: keep the achievement, drop unverifiable precision.

### Case Study 3: Billion-Rupee Payment Architecture

- **Heading and the `NPR 100B+` chip:** keep as-is.
- **Before/After table:**
  - `Duplicate rate ~0.3% → 0%` → change to `Duplicate transactions: eliminated by idempotency keys` (drops the specific 0.3% baseline claim)
  - `Reconciliation time: 2 days → Real-time` → keep as-is
  - `Failed-payment recovery: Days → Minutes` → keep as-is
  - `Audit-prep time: 2 weeks → 1 day` → keep as-is
- **My Role section:** Replace `Owned the payment-flow architecture` with `Owned the design and build of the payment flow` — engineering framing.

---

## 7. Section 03 — Engagements (DELETE ENTIRELY)

**This entire section gets removed.** It contains the consulting service catalog (F-01 Architecture Review, F-02 Modernization Blueprint, F-03 Database Performance Audit, F-04 Insurance AI Roadmap) which is the core consulting positioning we are replacing.

### Action:

- Locate the section anchored by `§ 03 / Engagements` (heading text: "Architecture engagements, *not staff augmentation.*").
- **Delete the entire `<section>`** (or equivalent component/element), including the heading, the descriptive paragraph, the catalogue table with F-01 through F-04, and any associated styling specific to this section.
- Remove the corresponding entry from the page navigation/index menu (the `03 Engagements` link).
- After deletion, renumber subsequent sections in the navigation so they remain sequential:
  - `04 Deliverables` becomes `03 Deliverables` (and the section heading `§ 04` becomes `§ 03`)
  - `05 Practice` becomes `04 Practice`
  - `06 Experience` becomes `05 Experience`
  - `07 Education` becomes `06 Education`
  - `08 Contact` becomes `07 Contact`

  Update both the in-page anchor labels (e.g., `§ 04 / Deliverables` → `§ 03 / Deliverables`) and any nav menu items that reference these.

- Update any internal links that point to the deleted Engagements anchor (e.g., the hero CTA `Engagements →`) — redirect them to the Experience section instead, as noted in Section 4 above.

---

## 8. Section 04 (now 03) — Deliverables (REFRAME)

The Deliverables section currently positions the listed items as consulting deliverables ("artifacts your team can build against" implies a client). Reframe as **artifacts produced over the course of building production systems**.

### Section heading:

**Current:**
> Artifacts your team can *build against.*
>
> Every engagement leaves a body of documentation — not a slide deck, not a PowerPoint with boxes and arrows.

**Replace with:**
> Artifacts I've produced *while shipping production systems.*
>
> Documentation, decision records, and reference materials produced over 8 years of building and operating insurance platforms — not slide decks, not consulting deck residue.

### Three deliverable cards (D-01, D-02, D-03):

Keep all three cards. Edit copy as follows:

#### D-01 · System Architecture
- Heading: keep `System Architecture`
- Body: Replace `C4 diagrams, domain models, capability maps, service boundaries, data-ownership matrices.` with `Domain models, service boundaries, data-ownership maps, and architecture decision records covering integration, reliability, and technology choices.`
- Tag chips: replace with: `Domain Models & Bounded Contexts`, `Service & Data Boundaries`, `Architecture Decision Records`

#### D-02 · Security & API Design
- Heading: keep
- Body: Replace `OWASP-aligned controls, RBAC / ABAC models, API governance, threat models, compliance checklists.` with `OWASP-aligned controls, RBAC models, API versioning and error contracts, and security review practices established for regulated financial systems.`
- Tag chips: replace with: `API Versioning & Error Model`, `OWASP Review Practices`, `RBAC Design`

#### D-03 · AI & Transformation
- Heading: change from `AI & Transformation` to `Modernization & Roadmaps`
- Body: Replace `Executive AI use-case playbooks, modernization plans with business cases, phased timelines, ROI projections.` with `Phased modernization plans (monolith → modular), AI/ML use-case exploration for insurance, and roadmaps grounded in what the system can actually become.`
- Tag chips: replace with: `Phased Modernization Plans`, `AI/ML Use-Case Exploration`, `Pragmatic Roadmaps`

**Why:** the original D-03 leaned heavily on "executive AI playbooks" and "ROI projections" — consulting language for capabilities not yet at consulting depth. The reframe keeps the artifact category honest.

---

## 9. Section 05 (now 04) — Practice Areas

The current practice areas (P-01 through P-06) include several capability claims that overstate current depth. Trim to what is genuinely defensible.

### Section heading:

**Current:**
> Capabilities, grouped by *what they solve.*

**Keep heading as-is.**

### Edit each practice card:

#### P-01 System Design — KEEP, lighter touch
- Heading: keep
- Body: Replace `Greenfield and brownfield architecture, capability mapping, bounded contexts, event-driven and CQRS patterns.` with `Domain modeling, service boundaries, and architecture for new and legacy systems in insurance and finance.`
- Tag chips: **remove** `CQRS`, `Event-Driven`, `GoF Patterns` (claims not yet defensible at production depth). Keep: `DDD`, `C4 Model`, `ADRs`. Add: `Modular Monolith`, `API Design`.

#### P-02 Platform & Data — KEEP
- Heading: keep
- Body: keep largely intact. Replace `API-first design, gateway patterns, idempotency, payment protocols, database architecture, query optimization, ETL/ELT.` with `API design, idempotency for payment flows, database architecture, query optimization, and ETL — across Oracle and SQL Server estates.`
- Tag chips: **remove** `YARP`, `gRPC` (not in current production use). Keep: `API-First`, `Oracle`, `SQL Server`, `Azure SQL`, `ETL`.

#### P-03 Security & Identity — TRIM CAREFULLY
- Heading: keep
- Body: Replace `Zero-trust design, OAuth2/OIDC, RBAC/ABAC, OWASP Top 10, STRIDE threat modeling, encryption, secrets, audit trails.` with `OAuth2/OIDC and RBAC for regulated financial platforms, OWASP-aligned controls, encryption, secrets management, and audit logging.`
- Tag chips: **remove** `Zero-Trust`, `Duende IdentityServer`, `STRIDE`, `mTLS` (overstated depth). Keep: `OAuth2`, `OIDC`, `RBAC`, `OWASP`. Add: `Audit Logging`.

#### P-04 AI/ML for Insurance — REFRAME
- Heading: change from `AI/ML for Insurance` to `Data & AI/ML for Insurance`
- Body: Replace `ML pipelines for fraud detection, predictive underwriting, claims automation, risk scoring — RAG and Semantic Kernel.` with `Applied data and ML for insurance — exploring fraud detection, claims triage, and predictive underwriting on real policy and claims data.`
- Tag chips: **remove** `MLOps`, `Vector DBs`, `Semantic Kernel` (claimed but shallow). Keep: `ML.NET`, `Python`, `RAG`. Add: `pandas`, `scikit-learn`.

#### P-05 InsurTech & FinServ — KEEP (this is the strongest card)
- Heading: keep
- Body: keep
- Tag chips: keep all — these are genuinely defensible domain claims.

#### P-06 Cloud & Delivery — TRIM
- Heading: keep
- Body: Replace `Azure (App Services, Functions, Key Vault, AD), Docker, Kubernetes, CI/CD, Terraform, infrastructure as code, observability.` with `Azure (App Services, SQL, Key Vault), Docker, Git Flow, CI/CD pipelines, structured logging, and observability for production workloads.`
- Tag chips: **remove** `Kubernetes`, `Terraform` (not in current production use at depth). Keep: `Azure`, `Docker`, `CI/CD`, `OpenTelemetry`. Add: `Git Flow`.

**Rationale:** Every chip on this section is something a senior engineer might be asked to discuss in a 45-minute technical interview. Anything not yet defensible at interview depth comes off.

---

## 10. Section 06 (now 05) — Experience

The Experience section copy must match the resume exactly. Update each role's bullets to mirror the final resume content.

### Role 1: Nepal Life Insurance — Jan 2023 to Present

**Current title:** `Officer · Lead Architect & Platform Engineer Nepal Life Insurance Co. Ltd. / Kathmandu`

**Replace with:** `Senior .NET Developer / Tech Lead — Nepal Life Insurance Co., Kathmandu`

**Replace the two-phase split (Phase I / Phase II)** with a single consolidated bullet list matching the resume. Use these bullets exactly:

- Lead developer for the company's core insurance platform — policy administration, underwriting, claims, and digital channels — serving 90,000+ active users.
- Shipped enterprise portal and API ecosystem with RBAC, OAuth2/OIDC authentication, and OWASP-aligned security controls.
- Drove database performance program: ~50% reduction in query latency across Oracle and SQL Server through indexing, execution-plan analysis, and stored-procedure refactoring.
- Designed payment gateway integration with idempotency keys, automated reconciliation, and audit logging — zero duplicate transactions on NPR 100B+ volume.
- Owned technical design reviews and authored RFCs covering data models, API contracts, and migration strategy for new modules.
- Established code review standards, Git Flow branching, and CI/CD pipelines — reduced release cycle from monthly to bi-weekly.
- Coordinated 6+ engineers through phased modernization (monolith → modular); mentored junior/mid-level developers on .NET Core, async patterns, EF Core performance, and clean architecture.
- Implemented observability stack (structured logging, health checks, performance counters) enabling sub-hour incident detection on production workloads.
- Researching applied AI/ML for insurance use cases: fraud detection, claims triage, and predictive underwriting.

### Role 2: Nepal Life Insurance — Nov 2018 to Dec 2022

**Title:** `Software Engineer — Nepal Life Insurance Co., Kathmandu`

**Bullets (replace with):**

- Built premium calculator engine across 20+ life insurance product lines; standardized actuarial rules, improving sales workflow efficiency by ~30%.
- Developed asset management application handling NPR 100B+ portfolio with audit controls and regulatory reporting.
- Built secure onboarding system for 5,000+ agents and customers with KYC workflows, eligibility validation, and payment gateway integration.
- Built API integrations connecting underwriting, policy issuance, and claims across core insurance systems.
- Developed scheduled batch jobs for premium notices, policy renewals, and commission calculations — processing 100K+ records per cycle.
- Migrated legacy ASP.NET WebForms modules to ASP.NET MVC / Web API, improving maintainability and front-end responsiveness.

### Role 3: Innovative Ghar Nepal — Oct 2017 to Nov 2018

**Title:** `Software Engineer — Innovative Ghar Nepal, Kathmandu`

**Bullets (replace with):**

- Built multi-tenant real estate platform (ASP.NET MVC, C#) with listings, tenant management, RBAC, and reporting modules.
- Designed normalized SQL Server schema and stored procedures backing search, filtering, and tenant isolation.

---

## 11. Section 07 (now 06) — Education

Update the dates and confirm content matches the resume.

| Period | Degree | Institution | Status |
|---|---|---|---|
| 2025 — 2027 | MSc, Data Science & Computational Intelligence | Coventry University, UK (Distance) · Softwarica College | Expected Feb 2027 |
| 2024 — 2026 | MBA, Finance | Indira Gandhi National Open University · Distance | **Expected Sept 2026** (note: not Jul 2026 — this changed) |
| 2013 — 2017 | BE, Computer Science & Engineering | Advanced College of Engineering · Tribhuvan University | Conferred |
| 2025 — Present | Microsoft Certified — Azure Solutions Architect Expert (AZ-305) | Microsoft | In Progress |

The IEEE publication line stays as-is.

---

## 12. Section 08 (now 07) — Contact

### Section heading:

**Current:**
> Start with an *architecture review.*

**Replace with:**
> Open to *senior remote engineering roles.*

### Section body:

**Current:**
> Most engagements open with the F-01 review — fixed scope, two to four weeks, blueprint-grade output your team can act on immediately.
>
> — Channels
>
> Available for **US-remote consulting** in InsurTech, Financial Services, and AI-driven transformation. Typical engagement starts with a brief scoping call, scope-of-work document, then the F-01 Architecture Review.
>
> Working hours overlap **4+ hours US-Eastern**. Independent contractor; W-8BEN ready. References from current and prior engagements available on request.

**Replace with:**
> If you're hiring a senior .NET engineer with deep insurance domain experience for a remote role, the easiest first step is a short intro call.
>
> — Channels
>
> Open to **senior remote .NET engineering roles** at InsurTech, FinServ, and other companies where insurance domain expertise is valuable. Also open to senior contract engagements (W-8BEN ready) where the scope is engineering work, not architecture-as-a-service.
>
> Working hours overlap **4+ hours US-Eastern**. References from current and prior roles available on request.

### Contact links block:

Keep email, LinkedIn, web, and CV links as-is. **Important:** the CV link must point to the new resume PDF (see Section 13 below).

---

## 13. CV file update

The site links to `/rahul_karn_resume.pdf`. Replace that file with the new resume PDF that matches the new positioning.

### Action:

- The new resume file (one-page, repositioned as Senior .NET Engineer) lives at the user's local filesystem — Rahul will provide the file. Drop it into the location the site expects (likely `public/` or the static assets folder) at the same filename `rahul_karn_resume.pdf` so existing links keep working.
- If the site uses a versioned filename (e.g., `rahul-karn-cv-v4.pdf`), update both the file and any references to it.
- Also place the .docx version (`Rahul_Karn_Resume.docx`) in the same folder if Rahul wants both available — if so, add a small "DOCX" link next to the PDF link in the contact section.

---

## 14. Things to leave alone

These are working well and should not be touched:

- The overall design, typography (Fraunces / Inter Tight / JetBrains Mono), color palette, and page structure
- The Profile sidebar headshot
- The IEEE publication link (`https://ieeexplore.ieee.org/document/8487788`)
- The phone number, email, and LinkedIn URL
- The Kathmandu, UTC+5:45 location signaling
- The dark-mode toggle (if present)
- The page numbering style (`§ 00`, `§ 01`, etc.) — keep this aesthetic, just renumber after the Engagements deletion

---

## 15. Verification checklist

After changes are applied, verify each item:

- [ ] No occurrence of "Enterprise Systems Architect" anywhere in the rendered site (check page source, meta tags, CV link text)
- [ ] No occurrence of "F-01", "F-02", "F-03", or "F-04" anywhere in the rendered site
- [ ] No occurrence of "engagement" or "engagements" in user-facing copy (except in the contact section where it refers to contract engagements specifically)
- [ ] Title tag shows `Senior .NET Engineer · InsurTech & Financial Systems`
- [ ] Hero subtitle reads `Senior .NET Engineer` (not Architect)
- [ ] All three case studies still render (90K users, ~50% query gain, NPR 100B+ payments)
- [ ] Engagements section is fully removed; section numbering is sequential (`§ 00` through `§ 07` with no gaps)
- [ ] Hero CTA `Engagements →` is removed or redirected to the Experience section
- [ ] Experience section bullets match the resume word-for-word
- [ ] MBA expected date is `Sept 2026` (not Jul 2026)
- [ ] Resume PDF download works and points to the new repositioned PDF
- [ ] All section anchor links in the in-page navigation menu resolve to existing sections (no dead anchors)
- [ ] Mobile layout is not broken by removed/renumbered sections
- [ ] Dark mode (if present) renders new copy correctly
- [ ] Stat chips on hero show: `8+ Years`, `90K Active Users`, `~50% Query Latency reduction`, `NPR 100B+ Portfolio Assets`

---

## 16. Notes for Claude Code

**File discovery:** The site framework isn't specified here. Start with `package.json` to identify the stack (likely Next.js, Astro, or vanilla HTML), then grep the codebase for unique strings like `Enterprise Systems Architect`, `F-01`, `slide-deck consultant`, and `xraone.com` (any cross-link to the consulting site) to find every place that needs editing.

**Working approach (recommended):**
1. Identify the framework and locate the main page/component file(s).
2. Run a grep across the repo for the master find/replace pairs in Section 2 of this spec — that gets you 60% of the way there mechanically.
3. Then work through Sections 4 through 12 in order; each section names a region of the page and gives explicit before/after text.
4. Section 7 (Engagements deletion) and Section 9 (Practice Areas trimming) require structural code changes, not just text replacement — do these last and verify the page still builds and renders.
5. After all changes, run the dev server and walk through the verification checklist in Section 15.

**Don't add new sections** that aren't in this spec. The user has reviewed every change here. Adding sections without permission creates work to undo.

**Don't fabricate metrics.** If the spec softens a number (e.g., the P95 latency claims), keep it softened. Do not "improve" the writing by reintroducing precise figures from the original copy.

**If something is ambiguous,** prefer the more conservative / honest framing. The repositioning is fundamentally about closing the gap between claims and current capability — when in doubt, claim less.

**Cross-check with the resume.** A copy of the final resume (`Rahul_Karn_Resume.pdf` and `.docx`) should be in the user's possession. Treat the resume as ground truth for any factual content (titles, dates, role descriptions, quantified achievements). If the website ends up making a stronger claim than the resume, the website is wrong.

---

## 17. Out of scope for this pass

The following are NOT part of this modification — leave alone or address separately:

- The xraone.com consulting site (separate repo, separate decision)
- LinkedIn profile updates (manual, not Claude-Code-driven)
- New blog posts or technical writing additions
- New case studies or projects
- GitHub repository updates
- Email signature changes
- Any analytics, tracking, or third-party integration changes

---

**End of spec.**
