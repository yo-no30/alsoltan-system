# مشروبات السلطان — Sultan Beverages POS

Vue 3 + TypeScript + Tailwind CSS + Supabase POS & management system.

## Setup

```bash
cp .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run typecheck` — TypeScript check
- `npm run preview` — preview production build

## Database

Apply migrations in order under `supabase/migrations/`:

1. `00001_initial_schema.sql`
2. `00002_rls_policies.sql`
