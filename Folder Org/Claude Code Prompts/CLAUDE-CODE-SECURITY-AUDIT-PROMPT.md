# AL LAITH SITE SERVICES — ULTIMATE WHITE-HAT SECURITY AUDIT PROMPT

## Claude Code CLI — Multi-Agent Vulnerability Testing & Hardening

**Target:** Al Laith Site Services Web Application (v9.2)
**Live URL:** `https://ss-workshop-stock-app-az9p-git-main-calos-projects-df7b646d.vercel.app/`
**Tech Stack:** Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth + RLS + Realtime + Storage) + TanStack Query + Zustand + Vercel Deployment
**Admin Test Account:** `calo.lategan@allaith.com` / `1234`

---

## MISSION BRIEFING

You are a world-class white-hat penetration tester. Your objective is to discover every vulnerability in this web application using offensive testing techniques, then build comprehensive defensive measures. You must NOT break production functionality — login, signup, password reset, and normal user flows must remain intact.

**Research Sources That Informed This Prompt:**
This prompt was built from 780+ security research sources including OWASP Top 10:2025, PTES methodology, HackTricks pentesting guides, PortSwigger Web Security Academy, PayloadsAllTheThings, ProjectDiscovery/Nuclei, Semgrep SAST rules, Snyk vulnerability databases, and research from Datadog Security Labs, Assetnote, Intigriti, OffSec, JFrog Security, Wiz, and hundreds of CVE advisories. Every attack vector below is backed by documented real-world exploitation.

---

## PHASE 0: PRE-ENGAGEMENT & RECONNAISSANCE

### Agent 0 — Intelligence Gathering & Asset Mapping

```
OBJECTIVE: Map the entire attack surface before testing begins.

1. TECHNOLOGY FINGERPRINTING
   - Read package.json, package-lock.json → extract every dependency + exact version
   - Cross-reference ALL dependencies against:
     • npm audit (run: npm audit --json > audit-report.json)
     • Snyk vulnerability database
     • GitHub Security Advisories
     • Known CVEs for each package
   - Flag ANY dependency with CVSS ≥ 7.0
   - Check Next.js version against CVE-2025-29927 (middleware bypass, CVSS 9.1)
   - Check React version against CVE-2025-55182 (React2Shell, CVSS 10.0)
   - Check for CVE-2025-55184 (DoS) and CVE-2025-55183 (source code exposure)
   - Check for CVE-2025-66478 (Next.js security advisory)
   - Check for CVE-2025-57822 (SSRF via middleware redirect)
   - Check for CVE-2025-49826 (cache poisoning DoS)

2. CODEBASE RECONNAISSANCE
   - Map all API routes: find src/app/api -type f -name "route.ts"
   - Map all server actions: grep -r "use server" src/ --include="*.ts" --include="*.tsx"
   - Map all middleware: cat src/middleware.ts
   - Map all Supabase table references: grep -r "from(" src/ --include="*.ts"
   - Map all environment variables: grep -r "process.env" src/ --include="*.ts"
   - Map all NEXT_PUBLIC_ variables: grep -r "NEXT_PUBLIC_" src/ --include="*.ts"
   - Identify every form input, file upload, and user-controlled parameter
   - Map all localStorage/sessionStorage usage
   - Find all uses of dangerouslySetInnerHTML
   - Find all eval(), Function(), or dynamic code execution

3. SUPABASE CONFIGURATION AUDIT
   - Read all migration files in supabase/migrations/
   - Verify FORCE ROW LEVEL SECURITY on EVERY table
   - List all RLS policies per table
   - Check for SECURITY DEFINER functions (privilege escalation risk)
   - Verify service_role key is NEVER in client-side code
   - Check if anon key is properly scoped
   - Verify email confirmation is required for signups
   - Check Supabase Storage bucket configurations (public vs private)

4. OUTPUT: Create security-audit-recon.md with:
   - Complete attack surface map
   - Dependency vulnerability report
   - Environment variable exposure analysis
   - RLS policy matrix (table → operations → policies)
   - Risk-ranked findings list
```

---

## PHASE 1: OFFENSIVE TESTING — 10 PARALLEL ATTACK AGENTS

### Agent 1 — Authentication & Session Security

```
OBJECTIVE: Test every authentication flow for bypass, hijacking, and privilege escalation.

ATTACK VECTORS:

1. CVE-2025-29927 MIDDLEWARE BYPASS TEST
   - Send requests with x-middleware-subrequest header to protected routes
   - Test: curl -H "x-middleware-subrequest: middleware" https://[target]/api/admin/*
   - Test: curl -H "x-middleware-subrequest: src/middleware" https://[target]/dashboard
   - Even though Vercel-hosted apps are NOT affected, verify the header is stripped
   - Create a test script that attempts this against every protected route

2. JWT TOKEN ANALYSIS
   - Extract JWT from authentication flow
   - Decode and analyze: header (algorithm), payload (claims, expiry), signature
   - Test algorithm confusion: attempt HS256 when RS256 expected
   - Test "alg": "none" bypass
   - Check token expiration time (should be ≤ 1 hour)
   - Test token reuse after logout
   - Test token with modified user_id/role claims
   - Check if JWT is stored in localStorage (XSS-accessible) vs HttpOnly cookie

3. SESSION SECURITY
   - Test session fixation: can a pre-set session ID be used after login?
   - Test session hijacking: replay captured session tokens
   - Test concurrent sessions: can the same account be logged in from multiple locations?
   - Test session regeneration: does the session ID change after login?
   - Test session timeout: how long before idle sessions expire?

4. PASSWORD SECURITY
   - Test brute force: attempt 100 rapid login attempts with wrong passwords
   - Verify rate limiting kicks in (middleware.ts has 5 attempts/30min)
   - Test password reset flow for:
     • Email enumeration (different responses for valid vs invalid emails)
     • Password reset token predictability
     • Password reset token expiration
     • Password reset poisoning (Host header injection in reset emails)
     • Timing attacks (response time differences for valid vs invalid emails)
   - Test password complexity requirements
   - Test for default/weak passwords in seed data

5. SIGNUP FLOW SECURITY
   - Test admin approval bypass: can a user gain access without admin approval?
   - Test role injection: can a user set their own role during signup?
   - Test email validation bypass
   - Test CSRF on signup form
   - Test rate limiting on signup endpoint

6. SUPABASE AUTH SPECIFIC
   - Test PKCE flow implementation
   - Verify email confirmations are required
   - Test OAuth redirect URI manipulation
   - Check for open redirect in auth callback URLs
   - Test magic link token security

CONSTRAINT: Do NOT lock out the admin account (calo.lategan@allaith.com).
Test with throwaway accounts when possible.

OUTPUT: auth-security-report.md with PoC for each finding
```

### Agent 2 — Broken Access Control & IDOR/BOLA

```
OBJECTIVE: Test every data endpoint for authorization bypass and object-level access control flaws.

ATTACK VECTORS:

1. INSECURE DIRECT OBJECT REFERENCES (IDOR)
   - For every Supabase table query, test:
     • Can User A access User B's records by manipulating IDs?
     • Can an unauthenticated user access any records?
     • Can a non-admin access admin-only data?
   - Test on: quotes, delivery_notes, return_notes, water_delivery,
     fleet_assets, signup_requests, users, purchase_orders
   - Use UUID enumeration: test sequential and predictable UUID patterns
   - Test both GET (read) and PATCH/DELETE (modify/delete) operations

2. HORIZONTAL PRIVILEGE ESCALATION
   - Log in as a regular user (create test account)
   - Attempt to access admin endpoints:
     • /api/admin/* routes
     • /settings (admin settings page)
     • signup_requests table (approve/deny users)
   - Test if changing user_id in request body allows acting as another user
   - Test Supabase RLS policies by crafting direct PostgREST queries

3. VERTICAL PRIVILEGE ESCALATION
   - Test role elevation: can a "viewer" user update their role to "admin"?
   - Test PATCH /users with is_admin=true or role="admin" (mass assignment)
   - Test if RLS policies prevent role self-escalation
   - Check for SECURITY DEFINER functions that bypass RLS

4. POSTREST API DIRECT ACCESS
   - Craft direct Supabase PostgREST queries using the anon key:
     • GET https://[supabase-url]/rest/v1/users?select=*
     • GET https://[supabase-url]/rest/v1/signup_requests?select=*
     • GET https://[supabase-url]/rest/v1/quotes?select=*
   - Test PostgREST filter injection:
     • ?or=(account_id.is.null,account_id.gte.1)
     • ?select=*,secret_table(*)
   - Test if RLS blocks every unauthorized access pattern

5. FUNCTION-LEVEL ACCESS CONTROL
   - Map all server actions and API routes
   - Test each one with: unauthenticated, low-privilege, and admin tokens
   - Verify every endpoint checks both authentication AND authorization
   - Test for missing authorization on state-changing operations

OUTPUT: access-control-report.md with CVSS scores for each finding
```

### Agent 3 — Injection Attacks (XSS, SQLi, SSTI, Command Injection)

```
OBJECTIVE: Test every user input for injection vulnerabilities.

ATTACK VECTORS:

1. CROSS-SITE SCRIPTING (XSS)
   Test EVERY form field and URL parameter with these payloads:

   Reflected XSS:
   - <script>alert('XSS')</script>
   - <img src=x onerror=alert('XSS')>
   - <svg/onload=alert('XSS')>
   - javascript:alert('XSS')
   - <details/open/ontoggle=alert('XSS')>

   Stored XSS (test in ALL text fields):
   - Quote description, line item names, notes fields
   - Delivery note comments
   - Return note condition remarks
   - User profile fields (name, email)
   - Fleet asset descriptions

   DOM XSS:
   - Test URL fragments (#payload)
   - Test URL parameters (?search=payload)
   - Check for document.write(), innerHTML, eval() usage

   React-Specific:
   - Find ALL uses of dangerouslySetInnerHTML
   - Test if any user input reaches dangerouslySetInnerHTML
   - Check for href="javascript:" in dynamic links
   - Test React SSR hydration mismatches for XSS

2. SQL INJECTION (via Supabase/PostgREST)
   - Test PostgREST filter parameters with injection payloads:
     • ?name=eq.test'OR'1'='1
     • ?id=eq.1;DROP TABLE users--
     • ?filter=eq.${malicious_input}
   - Test all server-side database queries for parameterization
   - Test Supabase RPC functions for SQL injection
   - Test PostgreSQL-specific payloads:
     • String concatenation: ||
     • Comment bypass: /* */ and --
     • Dollar-quoting: $tag$payload$tag$

3. PROTOTYPE POLLUTION (React2Shell — CVE-2025-55182)
   - Check React and Next.js versions for vulnerability
   - Test RSC (React Server Components) endpoints with:
     • __proto__ injection payloads
     • constructor.constructor chain
     • Object.prototype pollution via JSON parsing
   - Scan for deep merge/extend functions that don't sanitize keys
   - Reference: PayloadsAllTheThings/Prototype Pollution

4. SERVER-SIDE TEMPLATE INJECTION (SSTI)
   - Test: {{7*7}}, <%=7*7%>, #{7*7}, ${7*7}
   - While Next.js JSX is not vulnerable to traditional SSTI,
     check for any template engine imports (EJS, Handlebars, Pug)
   - Test if any API route uses eval() or Function() with user input

5. COMMAND INJECTION
   - Search for child_process, exec, spawn, execSync in codebase
   - Test any file processing endpoints for command injection
   - Test filename parameters for shell metacharacters: ; | & ` $()

6. EMAIL HEADER INJECTION
   - Test any email-sending functionality (password reset, notifications)
   - Inject CRLF sequences: %0d%0a, \r\n in email fields
   - Test: email=test@test.com%0d%0aBcc:attacker@evil.com

7. DOM CLOBBERING
   - Test if any code relies on DOM element IDs for security decisions
   - Inject HTML with id/name attributes matching expected variable names
   - Check if DOMPurify is used and test for known bypasses

OUTPUT: injection-report.md with PoC payloads for each finding
```

### Agent 4 — Server-Side Request Forgery (SSRF) & Open Redirects

```
OBJECTIVE: Test for SSRF, open redirects, and request forgery vulnerabilities.

ATTACK VECTORS:

1. SSRF TESTING
   - CVE-2025-57822: Test Next.js middleware redirect SSRF
     • Craft requests that reflect Host header into NextResponse.next()
   - Test any URL parameters that trigger server-side fetches:
     • Image URL fields, webhook URLs, callback URLs
     • Google Drive integration URLs
   - SSRF payloads:
     • http://127.0.0.1, http://localhost
     • http://[::1], http://0.0.0.0
     • http://169.254.169.254 (AWS metadata)
     • http://metadata.google.internal (GCP metadata)
   - DNS rebinding: test with attacker-controlled domain that resolves to internal IP
   - Test URL schema bypass: file://, gopher://, dict://

2. OPEN REDIRECT TESTING
   - Test all redirect parameters: ?redirect=, ?next=, ?callback=, ?returnUrl=
   - Test auth callback URLs for redirect manipulation
   - Open redirect payloads:
     • //evil.com
     • /\evil.com
     • https://evil.com
     • javascript:alert(1)//
     • %2F%2Fevil.com
   - Test post-login redirect (where does the app send you after login?)
   - Test Next.js router.push() with user-controlled values

3. CSRF TESTING
   - Test all state-changing operations for CSRF protection:
     • Quote creation/editing
     • Admin approval/denial
     • User role changes
     • Document status updates
     • Password changes
   - Check SameSite cookie attributes
   - Test method override: can POST be sent as GET?
   - Test CORS configuration for credential-bearing requests

OUTPUT: ssrf-redirect-csrf-report.md
```

### Agent 5 — Infrastructure & Configuration Security

```
OBJECTIVE: Test deployment configuration, headers, and infrastructure security.

ATTACK VECTORS:

1. SECURITY HEADERS AUDIT
   Fetch response headers from the live site and verify:
   - Strict-Transport-Security (HSTS): must include max-age=31536000; includeSubDomains
   - X-Frame-Options: DENY or SAMEORIGIN (prevent clickjacking)
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection: 0 (deprecated but check)
   - Content-Security-Policy: strict policy with nonces, no unsafe-inline
   - Referrer-Policy: strict-origin-when-cross-origin or no-referrer
   - Permissions-Policy: camera=(), microphone=(), geolocation=()
   - X-DNS-Prefetch-Control: off
   - Cross-Origin-Opener-Policy: same-origin
   - Cross-Origin-Resource-Policy: same-origin

   Create a test script:
   curl -sI https://[target]/ | grep -iE "(strict|x-frame|x-content|content-security|referrer|permissions)"

2. CORS CONFIGURATION
   - Test with various Origin headers:
     • Origin: https://evil.com
     • Origin: null
     • Origin: https://[target].evil.com (subdomain confusion)
   - Check if Access-Control-Allow-Credentials: true with wildcard origin
   - Test preflight requests for sensitive endpoints

3. INFORMATION DISCLOSURE
   - Test error pages: /nonexistent, /api/nonexistent
   - Check for stack traces in error responses
   - Check for version headers: X-Powered-By, Server
   - Test /_next/data/ routes for data exposure
   - Test .env file access: /.env, /..%2F.env
   - Test source map exposure: /_next/static/chunks/*.js.map
   - Test Next.js specific paths:
     • /__nextjs_original-stack-frame
     • /_next/image?url=
     • /api/__nextauth/

4. VERCEL DEPLOYMENT SECURITY
   - Check preview deployment exposure
   - Verify environment variables are properly scoped (production vs preview)
   - Check for NEXT_PUBLIC_ variables exposing secrets
   - Scan client-side JavaScript bundles for leaked credentials:
     curl https://[target]/_next/static/chunks/*.js | grep -i "key\|secret\|password\|token"
   - Test Vercel-specific headers and endpoints

5. TLS/SSL CONFIGURATION
   - Verify TLS 1.2+ is enforced
   - Check for weak cipher suites
   - Verify HSTS preload eligibility
   - Test for SSL stripping attacks

6. SUBDOMAIN TAKEOVER
   - Check DNS records for dangling CNAME entries
   - Verify all subdomains point to active services
   - Test for Vercel subdomain takeover via unclaimed CNAME

7. CACHE SECURITY
   - Test CVE-2025-49826 (Next.js cache poisoning DoS)
   - Test web cache deception: append /.css or /static to dynamic routes
   - Test Cache-Control headers on authenticated responses
   - Verify no sensitive data is cached at CDN edge

OUTPUT: infrastructure-report.md with remediation for each finding
```

### Agent 6 — Supply Chain & Dependency Security

```
OBJECTIVE: Audit all dependencies for known vulnerabilities and supply chain risks.

ATTACK VECTORS:

1. DEPENDENCY VULNERABILITY SCAN
   Run comprehensive scans:
   - npm audit --json > npm-audit.json
   - npx snyk test --json > snyk-report.json (if available)
   - Check every critical/high finding
   - Cross-reference with:
     • National Vulnerability Database (NVD)
     • GitHub Security Advisories
     • Snyk Vulnerability Database

2. DEPENDENCY CONFUSION / TYPOSQUATTING CHECK
   - Review package.json for any private/scoped packages
   - Check if package names could be confused with public packages
   - Verify package integrity: npm ls --all
   - Check for packages with recent ownership changes
   - Reference: Shai-Hulud npm supply chain attacks (2025)

3. LOCK FILE INTEGRITY
   - Verify package-lock.json exists and is committed
   - Check for integrity hash mismatches
   - Verify resolved URLs point to official npm registry

4. STATIC ANALYSIS (SAST)
   Run Semgrep with security rules:
   - npx @semgrep/semgrep --config=p/javascript --config=p/typescript --config=p/react --config=p/nextjs
   - Focus on: injection, auth bypass, insecure crypto, hardcoded secrets
   - Custom rules for Supabase-specific patterns:
     • service_role key in client code
     • Missing RLS checks
     • Unvalidated user input in database queries

5. SECRETS SCANNING
   - Scan entire codebase for exposed secrets:
     • API keys, tokens, passwords
     • Supabase URL and keys
     • AWS credentials
     • Stripe keys
     • Google Drive API keys
   - Check git history for previously committed secrets:
     git log --all --diff-filter=A -- "*.env*"
     git log -p --all -S "secret" -S "password" -S "key"
   - Tools: TruffleHog, GitLeaks patterns

OUTPUT: supply-chain-report.md with CVE references and CVSS scores
```

### Agent 7 — Business Logic & Race Conditions

```
OBJECTIVE: Test application-specific business logic flaws that automated scanners miss.

ATTACK VECTORS:

1. QUOTE WORKFLOW MANIPULATION
   - Can a finalized quote be modified back to draft?
   - Can quote amounts be manipulated after approval?
   - Can negative quantities or prices be submitted?
   - Can VAT be toggled to 0% after quote creation?
   - Can a quote be duplicated to bypass approval flow?
   - Test quote number sequence: can numbers be skipped or reused?

2. DOCUMENT STATUS MANIPULATION
   - Can document status be changed out of order?
     (draft → complete, skipping "finalized")
   - Can completed documents be reverted to draft?
   - Test status cascade: does changing a quote status
     properly cascade to linked DN/RN?
   - Can status be manipulated via direct API calls?

3. RACE CONDITIONS (TOCTOU)
   - Test double-submission on quote creation (submit same form twice rapidly)
   - Test concurrent approval: two admins approving same signup simultaneously
   - Test coupon/discount race: apply same discount twice via concurrent requests
   - Test inventory race: can the same fleet asset be booked twice simultaneously?
   - Tool: Use parallel curl requests or a Node.js script with Promise.all()

4. ADMIN APPROVAL BYPASS
   - Test: deny a signup request, does it actually get removed?
   - Test: approve a signup, does user actually appear in users table?
   - Test: can a denied user re-register with the same email?
   - Test: can a user modify their pending signup request?

5. ROLE-BASED ACCESS LOGIC
   - Map every engine to its required permissions
   - Test each engine with each role (viewer, user, manager, admin)
   - Verify "Enable Admin Mode" button (if still present) cannot
     grant real admin privileges

6. FINANCIAL CALCULATIONS
   - Test VAT calculation precision (5% VAT edge cases)
   - Test total calculation with very large numbers
   - Test with special float values (0.1 + 0.2 ≠ 0.3 in JavaScript)
   - Test currency formatting edge cases
   - Verify server-side recalculation (don't trust client math)

OUTPUT: business-logic-report.md
```

### Agent 8 — API Fuzzing & Data Validation

```
OBJECTIVE: Fuzz every API endpoint with malformed, oversized, and unexpected inputs.

ATTACK VECTORS:

1. INPUT VALIDATION FUZZING
   For every API endpoint and form field, test:
   - Empty strings, null, undefined
   - Very long strings (10,000+ characters)
   - Unicode edge cases: zero-width chars, RTL override, homoglyphs
   - Special characters: <>"'`\;{}[]|&$
   - SQL metacharacters in every field
   - HTML in every text field
   - JSON with unexpected types (string where number expected, etc.)
   - Nested JSON objects (prototype pollution vectors)
   - Array where single value expected
   - Negative numbers, zero, MAX_SAFE_INTEGER + 1

2. FILE UPLOAD SECURITY (if any upload exists)
   - Test MIME type bypass: .php with image/png content-type
   - Test double extensions: image.jpg.php
   - Test null byte injection: image.php%00.jpg
   - Test SVG with embedded JavaScript
   - Test polyglot files (GIFAR: valid GIF + valid JAR)
   - Test oversized files (exceed upload limits)
   - Test path traversal in filenames: ../../../etc/passwd

3. API RATE LIMITING
   - Test rate limiting on ALL endpoints, not just /login and /signup
   - Test with distributed IPs (different User-Agent, X-Forwarded-For)
   - Test rate limit bypass via HTTP method override
   - Test batch API requests to bypass per-request limits
   - Verify 429 response includes Retry-After header

4. PAYLOAD SIZE LIMITS
   - Test 1MB payload rejection (middleware.ts line 130+)
   - Test chunked transfer encoding to bypass size limits
   - Test multipart form data with oversized fields
   - Test JSON depth nesting (100+ levels)

5. NEXT.JS SERVER ACTIONS FUZZING
   - Every "use server" function is a public HTTP POST endpoint
   - Test each with:
     • No authentication token
     • Expired token
     • Modified token
     • Wrong parameter types
     • Missing required parameters
     • Extra unexpected parameters
   - Verify Zod/validation on EVERY server action input

6. GRAPHQL/SUPABASE REALTIME TESTING
   - Test Supabase Realtime subscriptions for unauthorized access
   - Test if unauthenticated users can subscribe to channels
   - Test subscription to tables they shouldn't access
   - Test broadcast messages for injection

OUTPUT: fuzzing-report.md with full payload/response pairs
```

### Agent 9 — Google Drive Integration Security

```
OBJECTIVE: Test Google Drive integration for file-based attacks and data exfiltration.

ATTACK VECTORS:

1. MALICIOUS FILE DETECTION
   - Test file upload with embedded macros (.xlsm, .docm)
   - Test Office files with OLE objects
   - Test files with hidden revision history (version manipulation)
   - Test polyglot files that pass Drive virus scan
   - Test encrypted archives that bypass scanning
   - Test files disguised as legitimate documents:
     • PDF with embedded JavaScript
     • SVG with embedded scripts
     • HTML files with auto-executing JavaScript

2. FOLDER SECURITY
   - Test access control on shared Drive folders
   - Test if folder structure reveals sensitive information
   - Test for publicly accessible Drive links
   - Implement canary token files in Drive folders:
     • Files that alert when accessed by unauthorized users
     • Hidden tracking pixels in documents
     • Honeypot folders with attractive names (e.g., "Passwords", "Credentials")

3. API KEY SECURITY
   - Verify Google Drive API keys are server-side only
   - Test if API keys are exposed in client-side code
   - Check API key restrictions (IP, referrer, API scope)
   - Verify OAuth scopes are minimal (read-only where appropriate)

4. CANARY TOKEN IMPLEMENTATION
   Create detection mechanisms:
   - Deploy canary documents in Drive folders
   - Implement webhook alerts on access
   - Create decoy files that look like sensitive data
   - Log all file access patterns for anomaly detection

OUTPUT: drive-security-report.md
```

### Agent 10 — DDoS Resilience & Availability Testing

```
OBJECTIVE: Test application resilience against denial of service and availability attacks.

ATTACK VECTORS (NON-DESTRUCTIVE):

1. APPLICATION-LAYER DoS
   - Test ReDoS: submit regex-heavy payloads that cause catastrophic backtracking
   - Test resource exhaustion via complex database queries
   - Test PDF generation with extremely large inputs
   - Test Supabase connection pool exhaustion
   - Test WebSocket connection flooding (Supabase Realtime)

2. RATE LIMITING VERIFICATION
   - Verify rate limiting works under sustained load
   - Test 100 concurrent requests to critical endpoints
   - Test if rate limits apply per-IP or per-user
   - Test rate limit bypass via X-Forwarded-For header manipulation

3. CACHE POISONING DoS
   - Test CVE-2025-49826 (Next.js cache poisoning)
   - Test Cache-Control header manipulation
   - Test HTTP method-based cache poisoning
   - Test Host header cache poisoning

4. VERCEL PLATFORM RESILIENCE
   - Document Vercel's built-in DDoS protections
   - Verify Attack Challenge Mode availability
   - Document Vercel WAF capabilities
   - Test Edge Function timeout handling

NOTE: Do NOT actually flood the production server. Test with controlled
bursts of 10-50 requests max, document expected behavior, and recommend
load testing tools for staging environment testing.

OUTPUT: availability-report.md
```

---

## PHASE 2: DEFENSIVE MEASURES — BUILD SECURITY HARDENING

### Agent 11 — Attack Detection & Monitoring System

```
OBJECTIVE: Build comprehensive attack detection, logging, and alerting.

IMPLEMENT THE FOLLOWING:

1. SECURITY EVENT LOGGING MIDDLEWARE (src/shared/security/security-logger.ts)

   Track and log:
   - Failed authentication attempts (with IP, user-agent, timestamp)
   - Rate limit violations
   - Suspicious request patterns (SQLi, XSS payloads in parameters)
   - Authorization failures (403 responses)
   - Invalid JWT tokens
   - Unusual user-agent strings (curl, python-requests, etc.)
   - Requests with x-middleware-subrequest header (CVE-2025-29927 probe)
   - Requests with __proto__ or constructor.constructor (prototype pollution probe)
   - Geographic anomalies (login from unusual location)
   - Multiple accounts from same IP

   Implementation pattern:
   ```typescript
   // src/shared/security/security-logger.ts
   export interface SecurityEvent {
     type: 'AUTH_FAILURE' | 'RATE_LIMIT' | 'INJECTION_ATTEMPT' |
           'AUTHZ_FAILURE' | 'SUSPICIOUS_HEADER' | 'BRUTE_FORCE' |
           'PROTOTYPE_POLLUTION' | 'XSS_ATTEMPT' | 'SQLI_ATTEMPT';
     ip: string;
     userAgent: string;
     path: string;
     method: string;
     timestamp: Date;
     payload?: string; // sanitized
     userId?: string;
     severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
   }

   export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
     // Write to Supabase security_events table
     // If severity >= HIGH, trigger immediate alert
   }
   ```

2. ATTACK PATTERN DETECTION (src/shared/security/attack-detector.ts)

   Detect and classify:
   - Brute force: > 5 failed logins from same IP in 5 minutes
   - Credential stuffing: many different usernames from same IP
   - Directory traversal: ../ in any path
   - XSS probes: <script>, onerror=, javascript: in any input
   - SQLi probes: ', --, UNION, SELECT in non-text fields
   - Bot detection: missing headers, sequential requests, no cookies
   - Scanner detection: common scanner user-agent strings

   ```typescript
   // src/shared/security/attack-detector.ts
   const INJECTION_PATTERNS = [
     /<script\b/i,
     /javascript:/i,
     /on\w+\s*=/i,
     /\bunion\b.*\bselect\b/i,
     /\b(drop|delete|update|insert)\b.*\btable\b/i,
     /__proto__/,
     /constructor\s*\.\s*constructor/,
     /x-middleware-subrequest/i
   ];

   export function detectAttack(request: Request): SecurityEvent | null {
     // Check URL, headers, body against patterns
     // Return classified event or null
   }
   ```

3. HONEYPOT ENDPOINTS (src/app/api/honeypot/)

   Create trap endpoints that legitimate users never access:
   - /api/admin/config — fake config endpoint
   - /api/v1/users/export — fake data export
   - /api/debug — fake debug endpoint
   - /admin/phpinfo — common scanner target
   - /wp-admin/ — WordPress scanner trap
   - /api/.env — config file trap

   ANY request to these endpoints = immediate log + alert.

   ```typescript
   // src/app/api/honeypot/[...trap]/route.ts
   export async function GET(req: Request) {
     await logSecurityEvent({
       type: 'SUSPICIOUS_HEADER',
       severity: 'HIGH',
       path: req.url,
       ip: getClientIP(req),
       userAgent: req.headers.get('user-agent') || 'unknown',
       method: 'GET',
       timestamp: new Date()
     });
     return new Response('Not Found', { status: 404 });
   }
   ```

4. CANARY TOKEN SYSTEM (src/shared/security/canary-tokens.ts)

   Implement digital tripwires:
   - Database canary rows: rows that should never be accessed, trigger alert on read
   - API canary: endpoint that returns fake "sensitive" data, alerts on access
   - Cookie canary: set a never-used cookie, alert if it appears in a request
   - HTML canary: hidden form field that bots fill but humans don't

   ```typescript
   export function createDatabaseCanary(table: string): CanaryConfig {
     return {
       table,
       canaryRow: { id: CANARY_UUID, is_canary: true },
       alertOnAccess: true,
       notification: 'slack' | 'email' | 'log'
     };
   }
   ```

5. SECURITY DASHBOARD (optional, src/engines/security-dashboard/)
   - Real-time view of security events
   - Attack timeline visualization
   - Top attacking IPs
   - Most targeted endpoints
   - Alert configuration

OUTPUT: Complete implementation of security monitoring system
```

### Agent 12 — Security Hardening Implementation

```
OBJECTIVE: Implement all security fixes identified during testing.

IMPLEMENT:

1. SECURITY HEADERS (next.config.ts or middleware.ts)
   ```typescript
   const securityHeaders = [
     { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
     { key: 'X-Frame-Options', value: 'DENY' },
     { key: 'X-Content-Type-Options', value: 'nosniff' },
     { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
     { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
     { key: 'X-DNS-Prefetch-Control', value: 'off' },
     { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
     { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
   ];
   ```

2. CONTENT SECURITY POLICY (next.config.ts)
   Implement strict nonce-based CSP:
   ```typescript
   const csp = `
     default-src 'self';
     script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
     style-src 'self' 'unsafe-inline';
     img-src 'self' data: https:;
     font-src 'self';
     connect-src 'self' https://*.supabase.co wss://*.supabase.co;
     frame-ancestors 'none';
     base-uri 'self';
     form-action 'self';
     upgrade-insecure-requests;
   `;
   ```

3. INPUT VALIDATION LAYER (src/shared/security/input-validator.ts)
   - Create Zod schemas for EVERY server action and API route input
   - Implement DOMPurify for any HTML rendering
   - Sanitize all user inputs before database storage
   - Validate file uploads: type, size, content

   ```typescript
   import { z } from 'zod';
   import DOMPurify from 'isomorphic-dompurify';

   export const quoteInputSchema = z.object({
     clientName: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s\-\.]+$/),
     amount: z.number().positive().max(10_000_000),
     vatEnabled: z.boolean(),
     lineItems: z.array(lineItemSchema).min(1).max(100),
   });

   export function sanitizeHTML(input: string): string {
     return DOMPurify.sanitize(input, {
       ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
       ALLOWED_ATTR: []
     });
   }
   ```

4. RATE LIMITING ENHANCEMENT (src/middleware.ts)
   - Extend rate limiting to ALL API routes, not just /login and /signup
   - Implement sliding window algorithm
   - Add per-user rate limiting (not just per-IP)
   - Add exponential backoff for repeated violations
   - Add CAPTCHA trigger after 3 failed attempts

5. SUPABASE RLS HARDENING
   - Audit and fix ALL RLS policies
   - Add missing policies for UPDATE and DELETE operations
   - Ensure FORCE ROW LEVEL SECURITY on every table
   - Remove any SECURITY DEFINER functions that aren't necessary
   - Verify email confirmation requirement
   - Add database-level constraints for business logic

6. PROTOTYPE POLLUTION PREVENTION
   - Freeze Object.prototype in server-side code where possible
   - Block __proto__, constructor, prototype in JSON parsing
   - Implement safe deep merge functions
   - Update React/Next.js to patched versions (React ≥ 19.1.0, Next.js ≥ 15.3.2)

7. CORS HARDENING
   - Whitelist only the exact production origin
   - Never reflect Origin header
   - Never allow credentials with wildcard origin

8. SESSION SECURITY
   - Implement session ID regeneration on login
   - Set HttpOnly, Secure, SameSite=Strict on all cookies
   - Implement idle session timeout (30 minutes)
   - Implement absolute session timeout (24 hours)
   - Log all session creation/destruction

OUTPUT: All security hardening code changes committed
```

---

## PHASE 3: VERIFICATION & REPORTING

### Agent 13 — Final Security Verification

```
OBJECTIVE: Re-test all findings after hardening and produce final report.

1. RE-TEST ALL CRITICAL FINDINGS
   - Re-run every PoC from Phase 1
   - Verify each vulnerability is fixed
   - Document any remaining issues

2. AUTOMATED SCAN VERIFICATION
   - Re-run npm audit
   - Re-run Semgrep
   - Verify all security headers are present
   - Verify CSP is properly configured

3. REGRESSION TESTING
   - Verify login still works
   - Verify signup still works
   - Verify password reset still works
   - Verify admin approval flow still works
   - Verify quote creation flow still works
   - Verify all engines still load
   - Run: npm run build (must succeed)
   - Run deletion test: rm -rf src/engines/fleet-dashboard/ && npm run build

4. PRODUCE FINAL SECURITY REPORT
   Create: SECURITY-AUDIT-REPORT.md

   Structure:
   - Executive Summary (risk posture before/after)
   - Methodology (PTES + OWASP Testing Guide)
   - Findings Summary (by severity: Critical/High/Medium/Low/Info)
   - Detailed Findings (each with):
     • Title and CWE classification
     • CVSS 3.1 score
     • Description
     • Proof of Concept
     • Impact
     • Remediation Applied
     • Verification Status
   - Defensive Measures Implemented
   - Recommendations for Ongoing Security
   - Appendices:
     • Tool outputs
     • Full payload lists
     • Configuration files
```

---

## EXECUTION ORDER

```
PARALLEL BATCH 1: Agent 0 (Recon — must complete first)
PARALLEL BATCH 2: Agents 1-10 (all offensive testing in parallel)
PARALLEL BATCH 3: Agent 11 + Agent 12 (defensive implementation in parallel)
SEQUENTIAL:       Agent 13 (final verification — depends on all above)
```

---

## CRITICAL RULES

1. **DO NOT** take down the production site
2. **DO NOT** delete or corrupt production data
3. **DO NOT** lock out the admin account
4. **DO NOT** break login, signup, or password reset flows
5. **DO** use throwaway test accounts for destructive tests
6. **DO** log every test performed
7. **DO** classify findings by CVSS severity
8. **DO** provide remediation for every finding
9. **DO** verify fixes don't break functionality
10. **DO** use the site-services-webapp skill for architecture understanding
11. **DO** follow crash-proof modularity: `rm -rf src/engines/[any-engine]/ && npm run build` must ALWAYS pass
12. **DO** check the research sources referenced above for latest exploit techniques

---

## REFERENCE SOURCES (Top Security Research)

### Frameworks & Standards
- OWASP Top 10:2025 — https://owasp.org/Top10/
- OWASP API Security Top 10 — https://owasp.org/API-Security/
- OWASP Testing Guide v4.2 — https://owasp.org/www-project-web-security-testing-guide/
- PTES (Penetration Testing Execution Standard) — http://www.pentest-standard.org/
- NIST SP 800-115 — Technical Guide to Information Security Testing

### CVE References
- CVE-2025-29927: Next.js middleware bypass (CVSS 9.1) — https://nvd.nist.gov/vuln/detail/CVE-2025-29927
- CVE-2025-55182: React2Shell prototype pollution RCE (CVSS 10.0)
- CVE-2025-55184: Next.js DoS
- CVE-2025-55183: Next.js source code exposure
- CVE-2025-66478: Next.js security advisory
- CVE-2025-57822: Next.js SSRF via middleware redirect
- CVE-2025-49826: Next.js cache poisoning DoS
- CVE-2025-48757: Supabase RLS bypass (170+ apps affected)
- CVE-2025-54576: OAuth2-Proxy authentication bypass

### Tools & Payload Libraries
- Nuclei Scanner — https://github.com/projectdiscovery/nuclei
- Nuclei Templates — https://github.com/projectdiscovery/nuclei-templates
- PayloadsAllTheThings — https://github.com/swisskyrepo/PayloadsAllTheThings
- HackTricks — https://book.hacktricks.xyz/
- Semgrep — https://semgrep.dev/
- Snyk — https://snyk.io/
- OWASP ZAP — https://www.zaproxy.org/
- Burp Suite — https://portswigger.net/burp
- TruffleHog — https://github.com/trufflesecurity/trufflehog
- GitLeaks — https://github.com/gitleaks/gitleaks
- Singularity (DNS rebinding) — https://github.com/nccgroup/singularity

### Research Labs & Blogs
- PortSwigger Research — https://portswigger.net/research
- ProjectDiscovery Blog — https://projectdiscovery.io/blog
- Assetnote Research — https://www.assetnote.io/resources/research
- Datadog Security Labs — https://securitylabs.datadoghq.com/
- Intigriti Research — https://www.intigriti.com/researchers/blog
- DeepStrike Security — https://deepstrike.io/blog
- Supabase Security — https://supabase.com/security
- Vercel Security — https://vercel.com/security
- OffSec Blog — https://www.offsec.com/blog
- JFrog Security — https://jfrog.com/blog
- Wiz Security — https://www.wiz.io/blog

### Supabase-Specific Security
- Supabase RLS Documentation — https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage Security — https://supabase.com/docs/guides/storage/security/access-control
- Supabase Security 2025 Retro — https://supabase.com/blog/supabase-security-2025-retro
- Hacking Misconfigured Supabase Instances — https://deepstrike.io/blog/hacking-thousands-of-misconfigured-supabase-instances-at-scale
- 10 Common Supabase Misconfigurations — https://modernpentest.com/blog/supabase-security-misconfigurations

### Next.js Security
- Next.js Security Guide — https://nextjs.org/docs/app/guides/content-security-policy
- Next.js Security Blog — https://nextjs.org/blog/security-nextjs-server-components-actions
- Server Actions Security — https://makerkit.dev/blog/tutorials/secure-nextjs-server-actions
- Arcjet Next.js Security — https://blog.arcjet.com/next-js-server-action-security/
- Next.js Bug Bounty Guide — https://deepstrike.io/blog/nextjs-security-testing-bug-bounty-guide

### Supply Chain Security
- npm Supply Chain 2025 Meltdown — https://dev.to/usman_awan/the-night-npm-caught-fire-inside-the-2025-javascript-supply-chain-meltdown-52o3
- Shai-Hulud Campaign Analysis — https://safeheron.com/blog/npm-supply-chain-news-lessons-from-attacks-2026/
- npm Security Risks 2026 — https://blog.cyberdesserts.com/npm-security-vulnerabilities/
- Vercel Secret Exposure Study — https://www.cremit.io/blog/vercel-secret-exposure-case-study

### Advanced Attack Techniques
- Browser-Powered Desync Attacks — https://portswigger.net/research/browser-powered-desync-attacks
- JWT Algorithm Confusion — https://portswigger.net/web-security/jwt/algorithm-confusion
- Prototype Pollution in Node.js — https://www.nodejs-security.com/blog/understanding-and-preventing-prototype-pollution-in-nodejs
- DOM Clobbering — https://portswigger.net/web-security/dom-based/dom-clobbering
- Race Conditions — https://portswigger.net/web-security/race-conditions
- Web Cache Poisoning — https://portswigger.net/web-security/web-cache-poisoning
- CORS Exploitation — https://portswigger.net/research/exploiting-cors-misconfigurations-for-bitcoins-and-bounties
- WAF Bypass Research — https://arxiv.org/html/2503.10846v1
- AI/LLM Prompt Injection (OWASP LLM01) — https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- WebAuthn Bypass Techniques — https://medium.com/@instatunnel/the-webauthn-loop-common-logic-flaws-in-the-passwordless-handshake
- DoubleClickjacking — https://medium.com/@instatunnel/doubleclickjacking-modern-ui-redressing-attacks-explained
- Passkey Downgrade Attacks — https://thehackernews.com/2025/10/how-attackers-bypass-synced-passkeys.html
