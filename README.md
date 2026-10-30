# DukaanPilot

**Run your business smarter. Sell, manage, and grow from one place.**
A mobile-first business manager for Indian small businesses, by Ignivox Technologies.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth) · pnpm.

## Build status

| Phase | What | Status |
|---|---|---|
| 1 | Project setup + full responsive frontend | ✅ Done (demo data) |
| 2 | Sign-up/login, onboarding, connect database | ⏳ Next. Schema + security policies are already written and tested |
| 3 | Add/edit products, customers, orders, payments | ⏳ Business rules done and tested; forms to build |
| 4 | Dashboard/reports on real data, storefront order requests | ⏳ Reports + CSV built; switch to live data |
| 5 | DukaanPilot AI | ✅ Working on demo data (voice, chat, navigation) |
| 6 | Testing and security checks | 🔁 Ongoing (38 automated checks so far: 30 app + 8 database) |
| 7 | Deploy to Render | ⏳ |

## What's verified vs not yet

**Verified by automated tests:**
- Sales, orders, payments, outstanding and best-seller calculations, including India-timezone day boundaries
- No overpayment, no over-refund, duplicate payments can't inflate totals
- Order totals and discounts are calculated on the server
- The 10 required AI commands understood correctly, with answers matching the dashboard figures
- WhatsApp link encoding, and CSV export safety
- Database (on a local PostgreSQL 16): one business cannot read or change another's data; anonymous visitors only see the public catalogue; storefront requests are rate-limited and never auto-confirmed

**Not yet verified:**
- Voice input/output on real phones (it uses the browser's built-in speech features: Chrome and Edge support voice input; Safari support varies)
- Anything against a real Supabase project or a live deployment

## Project map (for reference)

```
src/lib/metrics.ts          ← every business number is calculated here (definitions at the top)
src/lib/dates.ts            ← timezone-safe date ranges
src/lib/assistant/          ← DukaanPilot AI: command parser + answers (no external AI service)
src/lib/data.ts             ← loads data (demo now, Supabase from Phase 2)
src/app/(app)/              ← signed-in pages (dashboard, products, orders…)
src/app/s/[slug]/           ← public storefront
supabase/migrations/        ← database tables + security rules
supabase/tests/rls_test.sql ← database security tests
tests/                      ← automated tests (run: pnpm test)
```

## Commands

- `pnpm install`: download the libraries
- `pnpm dev`: run the app on your computer at http://localhost:3000
- `pnpm test`: run the automated checks
- `pnpm build`: check the app builds for production

## Secrets

Copy `.env.example` to `.env.local` and fill in the values. `.env*` files are excluded from Git, so they never get uploaded to GitHub.
