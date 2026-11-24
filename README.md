# MENA AI Directory

A G2-style directory platform for AI companies operating in the Arab world. Features a Google-like minimalist search UI with hybrid semantic + keyword search powered by OpenAI embeddings and PostgreSQL pgvector.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the pgvector extension enabled
- A [Stack Auth](https://stack-auth.com) project for user authentication
- An [OpenAI](https://platform.openai.com) API key for search embeddings

### Setup

```bash
npm install
cp .env.example .env.local   # Fill in your credentials
npm run seed:admin            # Create the admin account
npm run dev                   # Start dev server at localhost:3000
```

## Commands

```bash
npm run dev                       # Start development server
npm run build                     # Production build
npm run lint                      # Run ESLint
npm run test                      # Run Vitest unit tests
npm run test:watch                # Run Vitest in watch mode
npm run test:e2e                  # Run Playwright E2E tests
npm run seed:admin                # Create/update admin user from env vars
npm run import:json               # Import companies from JSON file
npm run import:products           # Import products from JSON (generates embeddings)
npm run import:classifications    # Import product tech_category/industry classifications
npm run remove-broken-logos       # Remove broken logo URLs from database
```

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Stack Auth (Google OAuth + email/password + magic link) for users, custom email/password for admins
- **Search**: Hybrid OpenAI embeddings (text-embedding-3-small) + PostgreSQL full-text search with Reciprocal Rank Fusion
- **Styling**: Tailwind CSS with zinc palette, fluid typography, and CSS variables for theming
- **Animations**: Framer Motion for entrance animations and interactive states

## Features

- **Hybrid Search** — Semantic + keyword search across companies and products, with product matches boosted via RRF ranking
- **Filter by Category** — Filter by AI/ML technology category, target industry, or headquarters country
- **Company Profiles** — Detail pages with products, reviews, ratings, and JSON-LD structured data
- **Product Listings** — Each company can list products with descriptions, URLs, and AI-generated classifications
- **User Reviews** — Authenticated users can rate and review companies; owners can reply
- **Claim Your Profile** — Company representatives verify their work email to claim and directly edit their listing
- **Admin Panel** — Dashboard for approving companies, managing edits, importing data (JSON/CSV), and revoking claims
- **SEO** — Dynamic sitemap, robots.txt, Open Graph metadata, and JSON-LD structured data

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (search, companies, products, reviews, claims, admin)
│   ├── admin/            # Admin panel pages
│   ├── company/[slug]/   # Company detail pages
│   ├── search/           # Search results page
│   ├── dashboard/        # User dashboard
│   ├── register/         # Company registration
│   ├── about/            # About page
│   └── handler/[...stack]/ # Stack Auth handler
├── components/           # React components
│   └── ui/               # Base UI components (Button, Card, Input, etc.)
├── lib/                  # Utilities (supabase, auth, search, services)
│   └── __tests__/        # Unit tests
├── constants/            # Static data (tags, industries, countries)
└── types/                # TypeScript type definitions
tests/                    # Playwright E2E tests
supabase/migrations/      # Database migration files
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Stack Auth project ID |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Stack Auth publishable key |
| `STACK_SECRET_SERVER_KEY` | Stack Auth secret key |
| `NEXTAUTH_SECRET` | Secret for admin HMAC cookie signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (configured in Stack Auth) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `OPENAI_API_KEY` | OpenAI API key for embeddings |
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (for sitemap) |

## Data Import

Import scripts should be run in order:

1. **`npm run import:json`** — Import companies (with nested products) from a JSON file
2. **`npm run import:products`** — Import products separately, generates embeddings, namespaces product IDs
3. **`npm run import:classifications`** — Import tech_category/industry classifications for products

All scripts are idempotent — they delete existing rows for target records before re-inserting.
