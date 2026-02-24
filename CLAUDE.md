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
npm run remove-broken-logos  # Remove broken logo URLs from database
npm run test:e2e          # Run Playwright E2E tests
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL + pgvector extension)
- **Auth**: NextAuth (Google OAuth for users) + custom email/password for admins
- **Search**: Hybrid search combining OpenAI embeddings (text-embedding-3-small) with PostgreSQL full-text search using Reciprocal Rank Fusion
- **Styling**: Tailwind CSS with Space Mono font

### Key Data Flow

**Search**: User query → OpenAI embedding → PostgreSQL `search_companies_with_products()` function → RRF fusion of semantic + keyword rankings (searches both companies and products) → filtered/paginated results with matching product info

**Company Registration**: Google OAuth → form submission → validation → embedding generation → DB insert (status: pending) → admin approval workflow

**Reviews**: Authenticated users can leave one review per company → ratings aggregated in `companies_with_ratings` view

**Company Edits**: User submits edit → creates `company_edits` entry (status: pending) → admin approval workflow

### Database Schema (Supabase)

- **users**: Google OAuth users (id, google_id, email, name, avatar_url)
- **admins**: Admin accounts with bcrypt password hashes
- **companies**: Listings with 1536-dim vector embeddings, status (pending/approved/rejected), ai_infrastructure, ai_platform, derived_capabilities[], domain_verticals[], hq_country, hq_region
  - `company_id`: Optional external identifier for imports
  - `logo`: Company logo URL
  - `ai_infrastructure` / `ai_platform`: Boolean flags for company type
  - `derived_capabilities`: Array of AI capabilities (replaces tags)
  - `domain_verticals`: Array of target industries (replaces industries)
  - `hq_country` / `hq_region`: Headquarters location
  - `scrape_confidence`: Data quality score from imports
- **products**: Company products with 1536-dim vector embeddings
  - `product_id`: Optional external identifier for imports
  - `name`, `description`: Basic product info
  - `category`: Product category
  - `capabilities`, `use_cases`, `target_customers`, `deployment`: Array fields
  - `maturity`, `pricing_model`: Product metadata
  - `confidence`: Data quality score
  - `sources`: Array of data source URLs
- **reviews**: User reviews with rating (1-5), one per user per company constraint
- **company_edits**: Edit requests (id, company_id, proposed_data JSONB, submitted_by, status pending/approved/rejected)
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

### Search Filters

- `ai_infrastructure` / `ai_platform`: Boolean filters for company type
- `derived_capabilities`: Filter by AI capabilities (array overlap)
- `domain_verticals`: Filter by target industries (array overlap)
- `hq_country`: Filter by headquarters country

### Import Feature

The admin import API (`/api/admin/import`) supports:
- **JSON format**: `{ companies: [...], autoApprove: boolean }` with nested products
- **CSV format**: FormData with file upload, supports legacy column names (tags→derived_capabilities, industries→domain_verticals, country→hq_country)

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
- `/src/components/ui/` - Base UI components (Button, Card, Input, etc.)
- `/src/lib/` - Utilities (supabase client, auth configs, openai, search logic)
- `/src/constants/` - Static data (tags, industries, MENA countries)
- `/src/types/` - TypeScript type definitions
- `/supabase/migrations/` - Database migration files
- `/tests/` - Playwright E2E test files
- `/playwright.config.ts` - Playwright configuration

### Environment Variables

Required in `.env.local` (see `.env.example`):
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- AI: `OPENAI_API_KEY`
- Admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
