# paertner: the whole system in one file

This file explains everything about paertner's two web products, the public website **paertner.com** and the operations app **paertner Dashboard** (app.paertner.com): what they are for, who uses them, every feature, how data moves between them, the rules the database enforces, the integrations, the infrastructure and how changes ship. It is written so that a person or an AI reading only this file understands the whole system. It describes the state on **2026-10-25**.

Identical copies live at the root of both repositories (`PAERTNER.md`). When either product changes, update both copies.

---

## 1. The business

**paertner** (Paertner LLC) is a marketing strategy and solutions development agency. It sells fourteen services that can be hired alone or together: **SEO, GEO** (being cited by AI assistants), **AEO** (being the quoted answer), **Technical SEO, Content and Copywriting, Content Production, Marketing Strategy, Paid Ads, Websites, Web Apps, Mobile Apps, Custom Enterprise Solutions, Lead Tracking and Growth, AI Automations**. The public positioning: clients own their accounts, data and code; reporting covers leads, traffic and conversions rather than impressions; if a service will not work for a business, paertner says so first.

The team produces graphics, videos, social posts, SEO work, newsletters and project work for its clients, reviews it internally, sends it to clients for approval when the client wants that, publishes it, and reports on it. The app exists so that all of this lives in one place instead of spreadsheets and chat threads.

The brand name is written **paertner**, lowercase, in the app's copy (the website writes "Paertner" in titles); never with the æ character, which only appears in the logo. Colours: ink `#0E0E11`, lime `#C8FF3D`, bone `#F4F2ED`.

Times are shown in **US Eastern** (`America/New_York`); weeks run Monday to Sunday; the database stores UTC.

---

## 2. The two products at a glance

| | paertner.com (website) | paertner Dashboard (app) |
|---|---|---|
| Who uses it | The public: prospects reading about the services and the work, and sending an inquiry | paertner's admins and employees, and client contacts (signed in) |
| Purpose | Present the agency, its services, case studies, studio, blog; collect inquiries | Run the agency: tasks, content and its review, client approval, publishing, targets, reports, notes, chat, Paid Ads, weekly reports, the assistant, and editing the website |
| Repository | `Paertner/paertner` (GitHub; also reachable as `TanhuKowski/paertner`) | `TanhuKowski/paertner-dashboard` (GitHub, private) |
| Stack | Next.js 16, React 19, **Payload CMS 3.89** with a **SQLite** database, Zod, sharp | Next.js 15.5 (App Router), React 19, Supabase (Postgres, RLS, Auth, Storage) via `@supabase/ssr`, Tailwind 4 with design tokens, shadcn/Radix, Zod, Recharts, Playwright (PDF), Vitest |
| Runs on | The VPS, Docker container `paertner-app-1` on `127.0.0.1:3000`, data in `/opt/paertner/shared/data` | The VPS, Docker container `paertner-dashboard-app-1` on `127.0.0.1:3200`, `/opt/paertner-dashboard` |
| Sign-in | None for visitors. Payload's `/admin` screens are closed and redirect to the app | Google only, by invitation |
| Language | English | English and Turkish (each person chooses); light and dark mode |

The two products have **separate databases**: the website keeps its own content in Payload (SQLite file on the server), the app keeps everything else in Supabase. The app never touches the website's database file; it reads and writes the website's content through Payload's REST API.

### How they connect (summary)

```
Visitor on paertner.com
  └─ Inquiry form (/book) ──POST /api/inquiry──▶ website stores the inquiry in Payload
                                                   └─ afterChange hook ──POST app.paertner.com/api/website/inquiry──▶ App:
                                                      (Bearer DASHBOARD_WEBHOOK_SECRET, body { id })                notification + email
                                                                                                                     to every active admin

Admin in the app, Website section ──REST calls with the service account's API key──▶ paertner.com/api/... (Payload)
   pages, services, projects, posts, media, site settings, redirects, inquiries         the public site reads Payload on
                                                                                         every request, so a save is live at once
```

---

## 3. The website: paertner.com

### 3.1 Pages

| Route | What it is |
|---|---|
| `/` | Home: hero (title, description, video with a poster image), introduction, convergence section, selected work, method steps, call to action |
| `/work`, `/work/[slug]` | The portfolio and each case study (challenge, idea, execution, result, details, screens). Projects marked "concept" show a disclosure. Projects without uploaded images fall back to built-in covers and galleries in `public/images/portfolio` |
| `/services`, `/services/[slug]` | Services grouped as Marketing and Creation; each with intro, deliverables, approach, outcome and its process guide |
| `/studio` | The studio: text, image, principles |
| `/book` | "Book a call": the inquiry form, FAQs, and a scheduling link when a booking URL is set |
| `/blog`, `/blog/[slug]` | Articles (drafts never shown) |
| `/privacy`, `/terms` | Paertner LLC's policies |
| Any other path | Checked against **Redirects** (permanent redirect to the new address) or 404 |
| `/admin`, `/admin/*` | Redirect (307) to `https://app.paertner.com/app/website` (since 2026-10-25) |
| `/api/*` | Payload's REST API (used by the app with an API key) and `POST /api/inquiry` (the form) |
| `/sitemap.xml`, `/robots.txt` | Generated; the whole site is `noindex` until **Allow search engines** is switched on |

### 3.2 Content model (Payload, `src/payload.config.ts`)

| Collection or global | Holds | Edited in the app at |
|---|---|---|
| `site` (global) | Name, tagline, hero, introduction, convergence, work and studio texts, call to action, method steps, principles; navigation links, contact email, booking URL, FAQs; hero poster, studio image, default sharing image; allow indexing, privacy policy, terms | Home page, Navigation and FAQ, SEO and legal |
| `pages` | Title, introduction, image and search preview for the eight main pages (home, work, services, studio, book, privacy, terms, blog) | Pages |
| `services` | Title, slug, number, category (Marketing or Creation), short line, intro, deliverables, approach, outcome, image, art style, search preview | Services |
| `projects` (drafts and versions) | Case studies: overview, case study sections, details, cover and screens, card colour, art, order, featured, concept, search preview | Work |
| `posts` (drafts and versions) | Blog posts: title, slug, excerpt, author, date, cover, body, search preview | Blog |
| `media` | Images; every upload is converted to WebP with thumbnail, card and hero sizes; a description (alt text) is required | Media |
| `inquiries` | Name, email, company, service, message, status (new, contacted, closed) | Inquiries |
| `redirects` | Old path to new path | SEO and legal |
| `users` | Payload accounts: the original administrator, and the service account `app@paertner.com` the app uses | Not edited (the service account follows `DASHBOARD_API_KEY`) |

Long texts are plain text: blank lines between paragraphs; blog bodies also use `## ` headings (listed under "In this article"), `- ` list items and `[text](/path)` links to the site's own pages.

### 3.3 Inquiries

The `/book` form (`src/app/api/inquiry/route.ts`) checks the origin, the size, the fields (name, email, company, service, a message of at least 20 characters, privacy consent, a hidden honeypot) and rate-limits each email to five requests an hour, then stores the inquiry as **new**. It sends no email itself and never claims an appointment is confirmed. Since 2026-10-25 the collection's `afterChange` hook tells the app (section 4.15).

### 3.4 Look, SEO and copy

Manrope font, Phosphor icons, scroll-driven scenes on the home page, the Paertner 2 identity in `public/identity/`. Titles read "<page> | Paertner"; every page has a search title, meta description, sharing image, canonical address and a per-page "hide from search engines". Concept work is labelled; there are no invented testimonials or numbers.

---

## 4. The app: paertner Dashboard

The app is the Addrify Dashboard product rebranded and run as paertner's own (built 2026-10-23). Its specification is in `docs/00` to `docs/12` and `docs/DECISIONS.md` of its repository; this section is the summary.

### 4.1 Roles

| Role | Who | Sees and does |
|---|---|---|
| **Admin** | Founders, operations lead | Everything: clients, team, targets, tasks, review, sending to clients, publishing, reports, settings, the Website section |
| **Quality control** | An employee with `can_review` | Their own work, plus the Review page: approve or send back for revision; no admin tools |
| **Employee** (producer) | Designers, editors, writers, SEO specialists | Their tasks, submissions, revisions, targets and progress; Overview and Content of the clients they work for |
| **Social media manager** | An employee with the `publishing` responsibility | Ready to publish and Published: posts approved work and records a live link per platform |
| **Paid Ads** | An employee with `paid_ads` | Records Paid Ads campaign numbers for the clients assigned to them |
| **Client** | A client's contact | Their own client only: approvals, content, performance, Paid Ads numbers, shared tasks, notes; never another client's data or internal notes |

Roles are enforced in the database with Row Level Security and security-definer functions; the UI only mirrors them.

### 4.2 Sign-in and accounts

Google is the only way in (Supabase Auth, Google Cloud project `paertner`, consent screen in production). An admin invites a person by email; the first Google sign-in with that address links the invited profile. Anyone not invited sees "No invitation found". Admins can deactivate or delete people (past work keeps their name).

### 4.3 Navigation (`components/shell/nav.ts`)

- **Admins**: Home (Overview, Announcements, Company notes, Team chat, Assistant), Workflow (Tasks, Review, Content production, Publishing, Calendar), Clients (each client with its pages), Team (employees, Targets, Weekly reports), Insights (Reports, Paid Ads), **Website** (Overview, Inquiries, Home page, Pages, Services, Work, Blog, Media, Navigation and FAQ, SEO and legal), Admin (Settings).
- **Employees**: Home, My work (My tasks, My submissions, Revisions, Weekly report, Calendar), Publishing for the social media manager, Progress (My performance), Clients they work for.
- **Clients**: My account (Overview, Approvals when they approve, Content, Performance, Tasks, Notes, Assistant).

A command palette (Cmd+K or Ctrl+K) reaches every page.

### 4.4 Tasks and content

Two things are kept apart. **Tasks** (`assignments`) are to-dos a manager gives: title, brief, assignees, optional client, deadline (optional time), priority, optional work type and paertner **service** tag, optionally a required result link; statuses To do, In progress, Completed, Cancelled. **Content** (`tasks`, the name is historical) is finished work a producer submits with **Submit work**: a name and a **link** (the most important rule: no link, no submission), a client and a work type. Content may point at the task it came from; that never changes the task's status.

Work types are always **Graphics, Videos, Publishing, SEO**, in that order. SEO work has a kind: blog post, GBP post, SEO report, technical fix, GEO item, AEO item, other. Graphics and videos carry a format (single or carousel; reels or ad video, horizontal or vertical).

### 4.5 Review, client approval and publishing

Content moves In review, In revision, Revision completed, Approved, Client review, Client revision, Client approved, Published (or Cancelled). Statuses change only through database functions (`submit_work`, `task_transition`, `client_decide`, `publish_content`). Per client, admins choose which kinds need internal review and which need the client's approval; admins can override per item. An admin sends approved work to the client; the client approves or asks for changes with notes in their portal. The social media manager publishes approved graphics, videos and Mailchimp campaigns, choosing platforms and pasting one live link per platform.

### 4.6 Clients and their pages

Each client has Overview, Content (with an SEO tab when they buy SEO), Approvals, Performance, Paid Ads, Notes and Settings. A client record holds its work types, its paertner **services** (`offerings`, the 14 services), platforms, approval settings, contacts and logo. Clients can be archived or deleted permanently after a dialog that lists what goes.

### 4.7 Targets, team and weekly reports

Admins set weekly targets per employee, per client and per work type (Publishing per platform, SEO per kind) on the Targets page, where they also assign clients to people. Each employee page shows targets against progress. Every employee files one **weekly report** (a link) per week; reminders go out Friday afternoon and Monday morning.

### 4.8 Reports

**Generate report** on a client page (that client) or the Overview (the company total, or every client in one batch) builds a branded PDF (Playwright/Chromium from `templates/client-report-template.html`) plus a CSV, kept for download.

### 4.9 Notes, announcements, chat

Comments on content and client notes (staff notes start internal; a switch shares one with the client; replies from staff read as "paertner" to clients), **@mentions** with notification and email, **Announcements** (shown at the top of every page until read), **Company notes**, and **Team chat** (one-to-one and groups, live, read receipts, reactions, replies, mentions, search; clients never see it).

### 4.10 Paid Ads

Paid Ads people record each campaign's numbers per client and reporting period (spend, leads, impressions, reach, clicks, conversions; CPL, CPC, CTR and conversion rate calculated unless typed). They show on the client's pages, in the client portal and in the report.

### 4.11 The assistant

`/app/assistant` (staff and clients): a chat that answers from the person's own data through tools that read with their permissions (RLS), drafts captions, briefs and replies, and refuses off-topic questions. The model is any OpenAI-compatible endpoint set by `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (configured on 2026-10-24 with Cloudflare Workers AI). Conversations are private to their owner.

### 4.12 Notifications and email

A bell with every notification; emails in the recipient's language (`notifications` rows, emailed by the app). The reviewer digest goes out every two hours. Mail is sent through **Resend** as `paertner <operations@paertner.com>` (Microsoft 365 holds paertner.com's mailboxes but blocks SMTP sign-in through Entra security defaults).

### 4.13 Languages and look

Every string is in `lib/i18n/en` and `lib/i18n/tr` with the same keys (a test checks it); Turkish terms follow `docs/i18n-glossary-tr.md`. Every colour is a token (`brand-*`, `bone-50`, lime), light and dark; every dropdown is the shared Select; lists are the shared DataTable.

### 4.14 Scheduled jobs (cron, Eastern time, `/etc/cron.d/paertner-dashboard`)

| When | Route | Does |
|---|---|---|
| Every 2 hours | `/api/cron/digest` | Reviewer digest emails |
| Sunday 22:00 | `/api/cron/targets-set` | "Your targets for next week" notifications |
| Monday 13:00 | `/api/cron/weekly-summary` | Weekly summaries |
| Friday 14:00 | `/api/cron/weekly-report-due` | Weekly report reminder |
| Monday 09:30 | `/api/cron/weekly-report-late` | Missing weekly reports, summary for admins |

Each call carries `Authorization: Bearer <CRON_SECRET>` (`deploy/cron.sh`).

### 4.15 The Website section (editing paertner.com from the app)

Since 2026-10-25 admins edit everything paertner.com shows in the app (`docs/12-website.md`). Payload stays the content engine; the app is the editor.

| Page | Edits |
|---|---|
| Website overview `/app/website` | Nothing: counts (new inquiries, services, published projects and drafts, posts, pages, images), what needs attention (search engines blocked, new inquiries, unpublished changes, pages without a search description, services without an image), recent changes from the audit log, shortcuts |
| Inquiries | The inbox: New, Contacted, Closed, All; reply by email, copy, mark contacted, delete, **Create client** (pre-filled from the inquiry; marks it contacted) |
| Home page | The `site` global's home and studio texts, method steps, principles, hero poster and studio image |
| Pages | The eight main pages: title, introduction, image, search preview; missing pages can be created |
| Services | List, new, edit, delete; slug checked for format and uniqueness; warns before changing one of the seven slugs the website's code relies on |
| Work | Projects with **Save draft**, **Publish**, **Unpublish**, delete; states Draft, Published, Changes not published |
| Blog | Posts with the same draft flow; body editor with a live preview that follows the website's rules, reading time and formatting notes |
| Media | The library: upload (description required), edit descriptions, delete only when unused (it lists every place an image is used) |
| Navigation and FAQ | Navigation links (internal paths), contact email, booking link (https), FAQs |
| SEO and legal | Allow search engines (with a warning while off), default sharing image, privacy policy and terms with previews, redirects |

How it works: `lib/website/client.ts` (server only) calls `https://paertner.com/api/...` with `Authorization: users API-Key <WEBSITE_API_KEY>`. Every action checks that the person is an admin, validates its input, refuses to overwrite a change someone else made after the editor opened (conflict check on `updatedAt`), and writes `website.<entity>.<verb>` to the app's `audit_log`. Every editor warns before unsaved changes are lost. When the website does not answer, the pages say so instead of failing. Drafts follow Payload's rules (a draft save never changes the public page; publishing does).

---

## 5. The API between the products

| Direction | Call | Auth | Purpose |
|---|---|---|---|
| App to website | `GET/POST/PATCH/DELETE https://paertner.com/api/<collection>`, `/api/globals/site`, `POST /api/media` (multipart) | Payload API key of `app@paertner.com` (`WEBSITE_API_KEY` in the app, `DASHBOARD_API_KEY` on the website; same value) | All website editing |
| Website to app | `POST https://app.paertner.com/api/website/inquiry` with `{ id }` | `Authorization: Bearer <secret>` (`DASHBOARD_WEBHOOK_SECRET` on the website, `WEBSITE_WEBHOOK_SECRET` in the app) | A new inquiry: the app reads it back through the API (the body is never trusted), notifies and emails active admins once per inquiry |
| Browser to app | `POST /api/website/media` | The signed-in admin's session | Image upload, passed on to the website |

Without the key the app's Website pages show "The website is not connected yet"; a failed webhook never affects the visitor.

---

## 6. Data

### 6.1 App tables (Supabase project `vkphccyokmhoqmetuzby`, migrations in `supabase/migrations`)

| Table | Holds |
|---|---|
| `profiles` | People: email, name, role, status (invited, active, deactivated), `can_review`, `paid_ads`, responsibilities, theme, locale |
| `clients`, `client_members`, `employee_clients` | Clients (work types, `offerings` services, platforms, approval settings, logo), their contacts, who works for which client |
| `assignments` | Tasks |
| `tasks`, `task_events` | Content and its history |
| `comments` | Content comments and client notes (internal or shared, mentions) |
| `weekly_targets`, `client_targets` | Targets |
| `paid_ad_stats` | Paid Ads records |
| `weekly_reports` | Weekly reports |
| `reports`, `report_jobs` | Generated reports |
| `announcements`, `announcement_reads`, `company_notes` | Team communication |
| `chat_conversations`, `chat_participants`, `chat_messages`, `chat_reactions` | Team chat |
| `ai_conversations`, `ai_messages` | Assistant history (owner only) |
| `notifications`, `push_devices` | Bell and phone pushes |
| `audit_log` | Who did what, including every website edit |
| `agency_settings` | One row of agency settings |

Statuses change only inside SQL functions; guard triggers refuse direct status updates. Storage holds client logos, report files and older uploads.

### 6.2 Website data

Payload's SQLite database `/opt/paertner/shared/data/paertner-v1.db` and uploads in `/opt/paertner/shared/data/media`. Schema changes are Payload migrations in `src/migrations/sqlite` (the latest, `20261025_010959_dashboard_api_key`, adds API keys to users), run by the deploy before the new version starts.

---

## 7. Rules that apply everywhere

1. **Every piece of content carries a link to the work**; nothing is published without a live link.
2. **Roles live in the database (RLS)** in the app; the website section is admin-only in the app server and Payload's own access rules.
3. **One status per record**, changed only by the SQL functions.
4. **Every decline or decrease is amber**, never red; red is for destructive actions and hard errors.
5. **Copy**: no em dashes, no exclamation marks, sentence case, professional; "paertner" lowercase in the app; English and Turkish for everything the team sees; clients get English emails.
6. **Design**: every colour a token, light and dark; the shared Select and DataTable; works on a phone at 375 px with no sideways scroll.
7. **Google is the only identity provider** for the app; invitation only.
8. **Eastern time** for everything shown.
9. **Never store secrets in code or docs.**
10. **The website's content is changed only through Payload** (the app's Website section), never in its database file.

---

## 8. Infrastructure and operations

| Item | Value |
|---|---|
| Server | Hostinger VPS `2.25.127.101`, shared with addrify.online, handymaen.com, app.handymaen.com, studio.paertner.com and huntech.io |
| Reverse proxy | Caddy in the Docker container `paertner-proxy-1`, config `/opt/paertner/Caddyfile`: `paertner.com` to port 3000 (www redirects), `app.paertner.com` to 3200, `studio.paertner.com` to 3100; Caddy issues the certificates |
| DNS | Cloudflare (DNS only, grey cloud): `paertner.com`, `www`, `app`, `studio` A records to the VPS; Microsoft 365 MX, SPF, DKIM and autodiscover records; Resend records `resend._domainkey`, `send`, `rsend`, and `_dmarc` (p=none) |
| Website deploy | Push to `main` of `Paertner/paertner`: GitHub Actions runs `/opt/paertner/deploy.sh` on the VPS, which builds `paertner:<sha>`, stops the site, snapshots the database and uploads, runs `payload migrate`, starts it, checks health and rolls back on failure (about a minute of downtime) |
| App deploy | `ssh root@2.25.127.101 /opt/paertner-dashboard/deploy.sh`: builds `paertner-dashboard:<sha>` from `origin/main`, swaps the container with a health check |
| App migrations | SQL files in `supabase/migrations`, applied over the Supabase session pooler (`aws-0-us-east-1.pooler.supabase.com:5432`) only together with the deploy that needs them, recorded in `supabase_migrations.schema_migrations` |
| Accounts | Supabase organization "Paertner" (owner operations@paertner.com, free plan); Google Cloud project `paertner`; Resend (operations@paertner.com); Cloudflare (paertner.com zone) |

**App environment** (`/opt/paertner-dashboard/shared/app.env`, names only): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_ASSET_URL`, `CRON_SECRET`, `APP_TIMEZONE`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `WEBSITE_API_KEY`, `WEBSITE_WEBHOOK_SECRET`, optional `NEXT_PUBLIC_WEBSITE_URL`, `PDF_SERVICE_URL`, `PDF_SERVICE_SECRET`, `REPO_URL` (deploy), `E2E_TEST_SECRET` (local testing only, never in production).

**Website environment** (`/opt/paertner/shared/app.env`, names only): `NODE_ENV`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `SQLITE_DATABASE_FILE`, `DASHBOARD_API_KEY`, `DASHBOARD_URL`, `DASHBOARD_WEBHOOK_SECRET`.

**Testing**:
- App: `npm run typecheck`, `npm run lint` (includes a check of client component props), `npm test` (Vitest: English and Turkish key parity, tone rules, message translations, validations, the website mappings and article parser); `supabase/tests/rls_and_transitions.sql` (RLS and every workflow, run with the seed in one rolled-back transaction); Playwright with the test sign-in stub.
- Website: `npx tsc --noEmit`, `npm test` (`scripts/verify.mjs`), a production build. Locally the website runs on a fresh `data/` folder (development mode pushes the schema itself, which clashes with a migrated database).

**Sample data**: the app's database still holds sample clients (Demo Cabinets, Example Interiors, Sample Closets), sample staff and content at the owner's request. They are deleted when the owner asks; `sample.admin@paertner.com` is deactivated so that real notifications never go to it.

---

## 9. Where to read more

**App repository** (`paertner-dashboard`): `CLAUDE.md` (build rules and what differs from Addrify), `docs/00` to `docs/12` (overview, roles, data model, workflows, pages, charts, design system, reports, stack and setup, build plan, acceptance, assistant, website), `docs/DECISIONS.md`, `components/shell/nav.ts`, `lib/permissions.ts`, `lib/website/*`, `lib/i18n/{en,tr}`, `supabase/migrations`, `supabase/tests`, `deploy/`.

**Website repository** (`paertner`): `README.md`, `DEPLOYMENT.md` (server, deploy, backups, recovery, the content-management section), `AGENTS.md` and `CLAUDE.md` (coding rules), `src/payload.config.ts` (the content model), `src/lib/cms.ts` (how pages read content), `src/lib/content.ts` and `src/lib/portfolio.ts` (seed content and built-in portfolio imagery).

## 10. History in brief

- 2026-09: paertner.com rebuilt as Next.js with Payload CMS; deployed to the VPS with SQLite and automatic deploys; portfolio expansion; Paertner 2 identity.
- 2026-10-23: paertner Dashboard created from the Addrify Dashboard, rebranded (ink, lime, bone), with its own Supabase project, Google sign-in, Resend mail and app.paertner.com; the 14 services and GEO/AEO SEO kinds added.
- 2026-10-24: the assistant; task deadlines with a time; Team chat replies, mentions and search; a phone-width pass over the app.
- 2026-10-25: website management moved into the app (Website section, inquiry inbox and webhook); Payload's `/admin` closed.
