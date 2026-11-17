# SAFEPAI Lite

**AI-powered scam detection and financial protection for Africa**

SAFEPAI Lite is a mobile-friendly web application that helps people review suspicious messages, websites, investment offers, payment instructions, and screenshots before taking action. Its first line of defense is a lightweight, explainable rules engine. An optional multimodal AI review is used only when rules find warning signs or the case is ambiguous.

> **Important:** Risk scores are preliminary heuristic assessments, not statistically validated probabilities or proof of fraud. A low score does not mean an offer is safe. Reports and indicators may be unverified; SAFEPAI does not determine criminal liability, verify bank-account ownership, block payments, or contact law enforcement.

## What is included

### Scam Scanner

- Submit messages, offers, payment instructions, and URLs.
- Choose an input type, then get a 0–100 preliminary risk score, reasons, and practical next steps.
- Basic checks run locally on the server before any AI call.
- The latest eight scans are saved privately in the current browser, so the complete demo flow works without accounts or external credentials. Users can clear this local history at any time; authenticated users use their account-backed history instead.

### Screenshot Analyzer

- Upload PNG, JPEG, or WebP screenshots up to 3 MB.
- When configured, the analyzer sends an image in a single request to the vision-capable AI. Without a working AI service it says **Image not visually analyzed** and does not present the screenshot as checked or safe.
- Uploaded image bytes are processed in the request and are not written to Supabase Storage by this starter.

### Fraud Detection Engine

- Detects common urgency, payment, impersonation, suspicious-link, and unrealistic-return signals.
- Checks text and AI-extracted screenshot text against seeded Supabase keyword rules; built-in rules keep guest scanning usable without Supabase.
- Checks submitted URLs for unsafe schemes, IP-address hosts, misleading hostnames, and common URL shorteners; it does not fetch or crawl the submitted URL.
- Can compare URLs and phone numbers with indicators whose status is `evidence_supported` or `independently_verified`. Unverified reports are never treated as confirmed matches.
- Matches a small, source-linked set of public records: Nigerian SEC notices and a Daily Post Nigeria report of a 2023 Nigeria Police Force wanted notice concerning Chinmark Group's CEO. The Chinmark item reports allegations and a wanted notice, not a finding of guilt; its current case status is unknown. A name match does not prove that a submitted offer or sender is connected, and never marks the entity or report as verified.
- Calls Gemini when `GOOGLE_API_KEY` is configured, otherwise an optional OpenAI-compatible multimodal endpoint, only for suspicious or ambiguous submissions.
- Validates the returned JSON before using it. If AI is not configured, unavailable, or returns invalid data, the API provides a clearly marked provisional, rules-only result.
- Uses a short-lived, process-local cache keyed by a SHA-256 digest. The cache is not durable across serverless instances.

Risk bands:

| Score | Display |
| --- | --- |
| 0–29 | Low detected risk |
| 30–59 | Moderate risk |
| 60–79 | High risk |
| 80–100 | Very high risk |

### Scam Alert Database

The Supabase SQL setup creates `users`, `scans`, `scam_reports`, `scam_indicators`, and a read-only `scam_keywords` rule table protected by Row Level Security. The keyword table is seeded with common phrases related to guaranteed returns, urgency, OTP/PIN requests, upfront fees, and account-suspension threats. Authenticated users can submit community reports; those reports start as `unverified`. Only independently approved indicators should be published as trusted indicators.

### Fraud Report Generator

- Create an incident report with incident date, narrative, payment details, warning signs, and assessment.
- Download a PDF report in the browser.
- Provides guidance to contact a bank/payment provider and use an appropriate official reporting channel.
- Does not transmit reports to banks, payment providers, law enforcement, or other third parties.

## Technology

- Next.js App Router and API routes
- TypeScript and Tailwind CSS
- Supabase Auth and Postgres (optional until environment variables are configured)
- One optional Gemini or OpenAI-compatible multimodal API
- Vercel deployment target

## Run locally

Requirements: Node.js 20.9 or later and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to use the scanner. Without credentials, the scanner uses rules-only analysis and saves up to eight recent checks in the current browser. Auth-backed history and community-report submissions require Supabase; the UI explains when it is not configured.

### Two-minute credential-free demo

Terminal 1:

```bash
env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY -u AI_API_KEY npm run dev
```

Terminal 2:

```bash
npm run test:smoke
```

Then open `http://localhost:3000/dashboard`, choose **Investment offer**, paste `Guaranteed 30% returns every day and double your investment in one week.`, and click **Check for scams**. The result uses server-side rules and is explicitly provisional. The smoke script checks the rules-only API cases; image analysis without an AI key is explicitly unavailable rather than presented as a checked or safe screenshot.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | For auth and database | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth and database | Supabase publishable/anon key; protected by RLS |
| `GOOGLE_API_KEY` | No | Gemini API key; server-side only and preferred when configured |
| `GOOGLE_MODEL` | No | Gemini model name; defaults to `gemini-flash-latest` |
| `GOOGLE_AI_BASE_URL` | No | Gemini API base URL; defaults to `https://generativelanguage.googleapis.com/v1beta` |
| `AI_API_KEY` | No | Secret key for an optional OpenAI-compatible fallback provider; server-side only |
| `AI_BASE_URL` | No | OpenAI-compatible API base URL; defaults to `https://api.openai.com/v1` |
| `AI_MODEL` | No | Vision-capable model name; defaults to `gpt-4o-mini` |

Never use a Supabase `service_role` key in this application or expose any AI key with a `NEXT_PUBLIC_` prefix.

## Supabase setup

1. Create a Supabase project.
2. Apply the versioned migrations using `supabase db push`, or run [`supabase/schema.sql`](./supabase/schema.sql) once in the SQL Editor. For an existing project, run [`supabase/migrations/20261117140437_add_scam_keywords.sql`](./supabase/migrations/20261117140437_add_scam_keywords.sql) to add the keyword rules. Client roles can read active rules but cannot edit them; manage rule changes through the Supabase SQL Editor.
3. Configure the Supabase URL and anon/publishable key in `.env.local` and in Vercel project settings.
4. Configure Supabase Auth email sign-in and allowed redirect URLs for localhost and the deployed domain.
5. Test signup, signin, signout, scan history, and report submission using two different users to verify data isolation.

New reports are unverified. Review reports and supporting evidence through a separate trusted moderation process before changing status or publishing indicators. The schema is idempotent for repeat SQL Editor runs and enforces Row Level Security: users can only read or insert their own scans and reports, while anonymous checks can read only reviewed indicators.

## How an analysis works

1. The API validates the input type, text length, and optional image MIME type and size.
2. Local rules assign a transparent preliminary score and indicators. The URL parser never requests a user-provided URL, avoiding server-side request forgery.
3. If Supabase is configured, the API loads active keyword rules and checks submitted content, then checks URLs/phone numbers against only evidence-supported or independently verified indicators.
4. If the result is suspicious or ambiguous, or an image was submitted, one bounded request is made with only the submitted text and optional image. For images, the vision model returns a limited text transcription; the same keyword rules are applied to that text. Ordinary, low-risk text submissions do not incur an AI request.
5. The response is parsed and validated against the expected JSON structure. Scores and enumerated values are normalized before display.
6. If AI is unavailable, the response is explicitly a provisional, rules-only assessment; an image is marked **Image not visually analyzed**, and no screenshot keyword check is claimed.

The included API rate limiter and analysis cache are process-local starter protections. They can reset and are not shared across Vercel instances. For production, replace the rate limiter with a shared store/edge rate limit, monitor provider quotas, and set project-specific retention and privacy policies. Do not treat this starter as a regulated financial decision system.

The initial public-source set is deliberately small and curated. It includes the Nigerian SEC's [Known Investment Scams schedule](https://sec.gov.ng/for-investors/known-investment-scams/), its [WayvePay notice](https://sec.gov.ng/for-investors/keep-track-of-circulars/suspected-fraudulent-activities-of-wayvepay/), and Daily Post Nigeria's [report of a Nigeria Police Force wanted notice concerning Chinmark Group's CEO](https://dailypost.ng/2023/04/12/police-declare-chinmark-ceo-wanted-over-alleged-n480m-fraud/). That article reports allegations and a wanted notice; it is not proof of guilt and does not establish the current case status. This list is not a live feed or exhaustive, and a matched name does not associate an offer or sender with the report. In a check of the cited SEC pages and Google/Bing News on 17 November 2026, I found no source naming Sidon Farms Limited; the application therefore does not label Sidon as a scam. Its submitted offer is still assessed for message-level warning signs. Confirm registration or report concerns with the SEC directly.

## Security and privacy

- AI and database credentials remain server-side or use a Supabase publishable key protected by RLS.
- Do not submit passwords, one-time passcodes, full card numbers, PINs, or private keys.
- Screenshots and submitted content may include personal or financial information. Obtain consent, minimize retention, redact unnecessary data, and publish a privacy notice before production.
- The API validates image format and file size; it does not persist uploaded image bytes.
- Scans/reports are associated with the authenticated user and secured by the SQL RLS policies. The API itself does not trust a client-supplied user ID.
- The sample in-memory rate limit is not sufficient against distributed abuse.
- The application does not execute AI output, initiate transactions, block transfers, or claim to verify account ownership.
- Never identify a person or business as a criminal based solely on a user report or a heuristic score.

## Development order

1. Establish the responsive dashboard and local-only scanner.
2. Add explainable rules, input/file validation, provisional assessments, and the optional AI fallback.
3. Configure Supabase Auth, RLS-protected scan history, and unverified community reports.
4. Add downloadable incident reports and safety guidance.
5. Before production, add shared rate limiting, moderation, observability, privacy/retention controls, accessibility review, and deployment testing.

## Credential-free scanner flow

The scanner is usable immediately after installation:

1. Paste a message, URL, investment offer, or payment request and select its type.
2. Select **Check for scams** to receive an explainable, provisional rules-based assessment.
3. Review the risk score, warning signs, and safer next steps.
4. The scan appears in **Recent scan history** on the same browser. Use **Clear local history** to remove those local entries.

When Supabase is configured and the user is signed in, scans are saved to the account instead of browser-only history.

## Scripts

```bash
npm run dev       # local development
npm run lint      # ESLint
npm run typecheck # TypeScript
npm run build     # production build
```

## Deployment

Import the repository into Vercel, configure the environment variables above, and deploy. Apply the Supabase migration before enabling account-backed features. Set Supabase Auth's site URL and redirect allowlist to the deployed origin. Keep the AI API key as a server-only Vercel environment variable and redeploy after changing variables.

## Project layout

```text
app/
  api/analyze/route.ts    # rules-first, optional AI analysis endpoint
  globals.css             # Tailwind and SAFEPAI visual system
  layout.tsx
  page.tsx                # public landing page
  dashboard/
    page.tsx              # scanner, history, alerts, reporting UI
lib/
  analysis.ts             # shared score types and validation
  detection.ts            # deterministic local detection rules
  supabase.ts             # browser Supabase client
supabase/schema.sql       # tables, triggers, and RLS policies
supabase/migrations/      # versioned Supabase database migrations
```
