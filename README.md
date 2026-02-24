# MENA AI Directory

A G2-style directory platform for AI companies operating in the Middle East and North Africa region. Features Google-like minimalist search UI with hybrid semantic + keyword search.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Commands

```bash
npm run dev               # Start development server
npm run build             # Production build
npm run lint              # Run ESLint
npm run seed:admin        # Create/update admin user
npm run import:json       # Import companies from JSON
npm run test:e2e          # Run Playwright E2E tests
```

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: NextAuth (Google OAuth) + custom admin auth
- **Search**: Hybrid OpenAI embeddings + PostgreSQL full-text search
- **Styling**: Tailwind CSS
