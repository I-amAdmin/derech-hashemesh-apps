# Threat Model

## Project Overview

This project is a quote-management application with a public customer quote-view flow, a React web dashboard, and an Expo mobile app. The production backend is a public Express 5 API in `artifacts/api-server`, backed by PostgreSQL via Drizzle ORM, with shared OpenAPI/Zod client libraries in `lib/`. The deployed application is publicly reachable at a Replit autoscale URL, so every production API route must be treated as internet-accessible.

## Assets

- **Quote records and quote items** — customer names, phone numbers, email addresses, pricing, item selections, delivery details, internal notes, and customer response notes. Exposure leaks customer PII and commercial terms; tampering can alter approvals, pricing history, and sales workflow.
- **Customer directory data** — business names, contacts, phone numbers, email addresses, company IDs, and delivery addresses stored in `customers`. This is directly sensitive business and personal information.
- **Product catalog and pricing** — barcodes, descriptions, weights, prices, VAT-related pricing, sizing metadata, and product notes. Unauthorized changes affect quote calculations and business operations.
- **Share tokens for public quotes** — bearer-style tokens stored on quotes and accepted by `/quotes/public/:token*`. Possession of a valid token grants access to a quote’s customer-facing workflow.
- **Push notification channel** — Expo push tokens plus quote-event notifications sent through Expo. Abuse can leak business events to unauthorized devices or be used to generate notification spam/cost.
- **Application secrets and database connectivity** — `DATABASE_URL` and any deployment environment values. Compromise would expose or modify the full data store.

## Trust Boundaries

- **Browser/mobile client to API** — all frontend and mobile requests cross an untrusted boundary into `artifacts/api-server/src/routes`. The server must authenticate and authorize protected actions; clients and network callers are untrusted.
- **Public customer quote access to internal management API** — `/quotes/public/:token*` is intentionally customer-facing, while `/quotes`, `/customers`, `/products`, `/quotes/summary`, and quote share-management routes are internal management surfaces. These boundaries must be enforced server-side.
- **API to PostgreSQL** — route handlers directly read and mutate business data through Drizzle. Any access control failure at the route layer exposes or corrupts the database.
- **API to external push provider** — `artifacts/api-server/src/lib/push-notifications.ts` sends stored push tokens and quote-event metadata to Expo’s push API. Only authorized devices should be enrolled, and outbound requests should not be triggerable for abuse by arbitrary users.
- **Production vs dev-only artifacts** — `artifacts/mockup-sandbox` is assumed dev-only and out of production scope unless code proves otherwise. Production analysis should focus on `artifacts/api-server`, `artifacts/derech-hashemesh`, `artifacts/mobile`, and shared `lib/` packages.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/derech-hashemesh/src/main.tsx`, `artifacts/mobile/app/_layout.tsx`.
- **Highest-risk code areas:** API routes in `artifacts/api-server/src/routes`, push integration in `artifacts/api-server/src/lib/push-notifications.ts`, shared fetch/auth assumptions in `lib/api-client-react/src/custom-fetch.ts`, DB schema in `lib/db/src/schema`.
- **Public surface:** `/api/health`, `/api/quotes/public/:token*`, and any route lacking server-side auth middleware.
- **Protected/internal surface that must not be public:** `/api/quotes*` except the explicit public token routes, `/api/customers*`, `/api/products*`, `/api/push-tokens` unless tightly scoped to authorized devices.
- **Usually ignore unless proven reachable in production:** `artifacts/mockup-sandbox/**`, local build scripts, and other development-only tooling.

## Threat Categories

### Spoofing

This application currently supports a bearer-style public quote token flow and has mobile client code prepared to attach bearer authorization headers, but protected API routes still require explicit server-side identity enforcement. The system must require a valid authenticated principal for all internal management endpoints and must treat public quote tokens as scoped credentials that authorize only the corresponding customer-facing quote actions.

### Tampering

Quote approval state, quote contents, customer records, and product pricing are business-critical mutable data. The server must ensure that only authorized actors can create, edit, delete, or share these records, and it must calculate quote totals from trusted server-side product data rather than accepting client pricing as authoritative.

### Information Disclosure

The database contains customer contact details, delivery addresses, quote pricing, and business summaries. The API must not expose these records, share tokens, or financial summaries to unauthenticated callers, and push notifications must not be deliverable to unauthorized devices. Error handling and logs must continue to avoid disclosing secrets or raw credentials.

### Denial of Service

The public deployment exposes JSON endpoints and an external push-notification integration. Publicly reachable endpoints must resist abuse such as unbounded device registration, mass notification fan-out, or repeated state-changing requests that consume provider quotas or degrade the sales workflow.

### Elevation of Privilege

The most important privilege boundary in this project is the separation between public/customer quote interactions and internal owner management operations. Internal routes for reading full datasets, generating share links, modifying records, or deleting data must not be reachable without server-side authorization, and public quote tokens must never grant broader access than the single associated quote.
