# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MENA AI Directory - A G2-style directory platform for AI companies operating in the Middle East and North Africa region. Features Google-like minimalist search UI with hybrid semantic + keyword search powered by OpenAI embeddings and PostgreSQL pgvector.

## Commands

```bash
npm run dev               # Start development server (localhost:3000)
npm run build             # Production build
npm run lint              # Run ESLint
npm run seed:admin        # Create/update admin user from ADMIN_EMAIL/ADMIN_PASSWORD env vars
npm run import:json       # Import companies from JSON file
npm run import:products   # Import products from JSON file (generates embeddings, namespaces product_id)
npm run import:classifications  # Import product tech_category/industry classifications from JSON file
npm run remove-broken-logos  # Remove broken logo URLs from database
npm run test:e2e          # Run Playwright E2E tests
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL + pgvector extension)
- **Auth**: NextAuth (Google OAuth for users) + custom email/password for admins
- **Search**: Hybrid search combining OpenAI embeddings (text-embedding-3-small) with PostgreSQL full-text search using Reciprocal Rank Fusion (product matches boosted)
- **Styling**: Tailwind CSS with SF Pro / system font stack, zinc palette, semantic CSS variables

### Key Data Flow

**Search**: User query → OpenAI embedding → PostgreSQL `search_companies_with_products()` function → RRF fusion of semantic + keyword rankings (searches both companies and products) → filtered/paginated results with matching product info

**Company Registration**: Google OAuth → form submission → validation → embedding generation → DB insert (status: pending) → admin approval workflow

**Reviews**: Authenticated users can leave one review per company → ratings aggregated in `companies_with_ratings` view

**Company Edits**: User submits edit → creates `company_edits` entry (status: pending) → admin approval workflow

### Database Schema (Supabase)

- **users**: Google OAuth users (id, google_id, email, name, avatar_url)
- **admins**: Admin accounts with bcrypt password hashes
- **companies**: Listings with 1536-dim vector embeddings, status (pending/approved/rejected)
  - `company_id`: Optional external identifier for imports
  - `company_url` / `linkedin_profile`: Website and LinkedIn links
  - `logo`: Company logo URL
  - `logo_bg`: Logo background hint (`'white'` | `'black'` | null)
  - `hq_country`: Headquarters country
- **products**: Company products with 1536-dim vector embeddings
  - `product_id`: Optional external identifier for imports (namespaced as `{company_id}--{original_id}`)
  - `name`, `description`: Basic product info
  - `product_url`: Link to the product page
- **reviews**: User reviews with rating (1-5), one per user per company constraint
- **company_edits**: Edit requests (id, company_id, proposed_data JSONB, submitted_by, status pending/approved/rejected)
- **product_classification**: AI-generated classifications for products
  - `product_id`: FK → products(id) ON DELETE CASCADE
  - `company_id`: FK → companies(id) ON DELETE CASCADE (redundant but explicit; enables fast per-company queries)
  - `tech_category`: AI/ML technology category
  - `industry`: Target industry vertical
- **companies_with_ratings**: View with computed average_rating and review_count

### Authentication Patterns

- **User auth**: NextAuth with Google provider, JWT strategy, session includes user.id
- **Admin auth**: Custom email/password, bcrypt hashing, HMAC-signed httpOnly cookie (signed with `NEXTAUTH_SECRET`) with 24h expiry
- Use `requireAdmin()` from `/lib/admin-auth.ts` in admin API routes
- Admin layout (`/src/app/admin/layout.tsx`) includes `AdminAuthGuard` that verifies session before rendering child pages

### Security

- **Middleware** (`/src/middleware.ts`): Sets CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy headers on all routes
- **FormData validation**: Use `getFormString()`, `getFormStringOrNull()`, `getFormFile()`, `getFormStringArray()` from `/lib/company-service.ts` instead of `as` casts
- **JSON-LD**: Output is escaped with `\u003c` to prevent script injection
- **Admin search**: `.or()` filter input is sanitized to strip PostgREST special characters
- **Public company API**: Hardcoded to `status=approved` only (admin endpoints have their own routes)

### Rate Limiting

In-memory rate limiter in `/lib/rate-limit.ts` with max store size of 10,000 entries:
- Search: 30/min per IP
- Registration: 5/hour per user
- Reviews: 10/hour per user
- Admin: 100/min per admin
- Admin login: 5/15min per IP

### Search Ranking

The `search_companies_with_products` SQL function uses RRF (Reciprocal Rank Fusion) to combine semantic and keyword scores. Key tuning parameters:
- **Semantic distance threshold**: `0.46` cosine distance — rejects vague matches (lower = stricter)
- **Company RRF k**: `60` (standard) — `1/(60+rank)`
- **Product RRF k**: `45` (lower = top ranks more impactful) with **1.5× boost** — `(1/(45+rank)) * 1.5`
- **OR keyword fallback**: `safe_tsquery_or()` splits multi-word queries into OR terms; matches not already found by AND keywords get dampened score (k=80, 0.5× weight). Single-word queries are unaffected (OR CTE returns empty due to NOT IN exclusion).
- Product-level matches outscore equivalent company-level matches, so a company with a matching product ranks above a company with only a vague description match
- Pagination uses `COUNT(*) OVER()` in the SQL function (returned as `total_count`); no separate count query needed in the TS client

### Search Filters

- `tech_categories`: Filter by AI/ML technology category (via `product_classification` table)
- `industries`: Filter by target industry vertical (via `product_classification` table)
- `hq_country`: Filter by headquarters country

### Import Feature

The admin import API (`/api/admin/import`) supports:
- **JSON format**: `{ companies: [...], autoApprove: boolean }` with nested products
- **CSV format**: FormData with file upload, supports legacy column names (tags→derived_capabilities, industries→domain_verticals, country→hq_country)

#### Offline Import Scripts (run order matters)

1. **`import:json`** — imports companies (with any nested products) from a JSON file
2. **`import:products`** — imports products from a separate JSON file; looks up companies by external `company_id`, generates OpenAI embeddings, namespaces `product_id` as `{company_id}--{original_id}` to prevent cross-company collisions
3. **`import:classifications`** — imports `tech_category` / `industry` classifications from a JSON file; keys by `{company_id}--{product_id}` (matching the DB namespace) to avoid collisions when two companies share the same short product_id; inserts into `product_classification` with both `product_id` (UUID) and `company_id` (UUID)

All three scripts are idempotent: they delete existing rows for the target records before re-inserting.

### SEO

- `robots.ts` - Dynamic robots.txt generation
- `sitemap.ts` - Dynamic sitemap generation for approved companies
- JSON-LD structured data on company detail pages (Organization schema with aggregateRating)

### Testing

- **Framework**: Playwright for E2E testing
- **Configuration**: `playwright.config.ts` in project root
- **Test files**: `/tests/` directory (search.spec.ts, company-detail.spec.ts)
- **Run tests**: `npm run test:e2e`

### API Routes

Key endpoints:
- `GET /api/user/companies` - Get user's submitted companies
- `PUT /api/companies/[id]` - Submit edit request for owned company
- `PUT/DELETE /api/products/[id]` - Update/delete products (owner or admin)
- `PUT/DELETE /api/reviews` - Update/delete own reviews

### Directory Structure

- `/src/app/api/` - API routes (companies, products, search, reviews, admin operations)
- `/src/app/admin/` - Admin panel pages (dashboard, pending, companies, import)
- `/src/components/` - React components (SearchBox, CompanyCard, ReviewForm, ProductCard, ProductList, ProductForm, ProductInputList, etc.)
- `/src/components/ui/` - Base UI components (Button, Card, Input, ConfirmDialog, etc.)
- `/src/lib/` - Utilities (supabase client, auth configs, openai, search logic)
- `/src/constants/` - Static data (tags, industries, MENA countries)
- `/src/types/` - TypeScript type definitions
- `/supabase/migrations/` - Database migration files
- `/tests/` - Playwright E2E test files
- `/playwright.config.ts` - Playwright configuration

### UI Patterns

- **Design system**: Zinc palette (not gray), `rounded-2xl` cards, `rounded-xl` buttons/inputs, off-white background (`#FAFAFA`), custom subtle shadows (`shadow-[0_1px_3px_rgba(0,0,0,0.04)]`)
- **CSS variables** (`globals.css`): `--background`, `--foreground`, `--border`, `--muted`, `--surface`, `--accent` — used for semantic theming
- **Fluid typography**: Use `.text-fluid-hero`, `.text-fluid-title`, `.text-fluid-body` (clamp-based) for responsive headings
- **Typography weight**: Prefer `font-semibold` over `font-bold` for headings; use `tracking-tight` on large headings
- **Card `interactive` prop**: Base `Card` has no hover effect. Pass `interactive` to enable `hover:-translate-y-0.5` lift + deeper shadow on clickable cards (e.g., CompanyCard). Non-interactive cards (reviews, stats) omit it.
- **Button press feedback**: All buttons have `active:scale-[0.98]` for tactile press feel
- **Focus rings**: Use `focus:ring-blue-600/20 focus:border-blue-600` (tinted, not opaque) on inputs/search
- **Micro-interactions**: Global base transition on `a, button, input, select, textarea` (150ms cubic-bezier) defined in `globals.css`
- **Header/Footer**: `bg-zinc-950` (not pure black), nav links `text-zinc-400`, header has `border-b border-zinc-800/50`
- **Filter labels**: `text-xs font-semibold uppercase tracking-wider text-zinc-500` for structured sidebar feel
- **ConfirmDialog**: Use `<ConfirmDialog>` (native `<dialog>`) instead of `window.confirm()` for destructive actions. Supports `variant="danger"` for delete confirmations.
- **Mobile navigation**: Header uses a hamburger menu on `md:` breakpoint. Admin sidebar uses an overlay drawer on `lg:` breakpoint.
- **Form accessibility**: Input, Textarea, and Select link errors via `aria-describedby` and `aria-invalid` automatically when `id` and `error` props are provided.

### Environment Variables

Required in `.env.local` (see `.env.example`):
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- AI: `OPENAI_API_KEY`
- Admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
