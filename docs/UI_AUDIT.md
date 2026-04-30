# VolunTRY — Full UI & Code Quality Audit Report

> **Date:** 2026-04-29  
> **Scope:** Every file in `/app`, `/components`, `/hooks`, `/lib`, `/types`  
> **Mode:** Read-only audit — no code changes made

---

## Table of Contents

1. [Responsive Design Issues](#1-responsive-design-issues)
2. [UI Pattern Inconsistencies](#2-ui-pattern-inconsistencies)
3. [Logo & Branding Consistency](#3-logo--branding-consistency)
4. [Code Repetition & DRY Violations](#4-code-repetition--dry-violations)
5. [Long Files — Refactor Candidates](#5-long-files--refactor-candidates)
6. [Dead / Unused Code](#6-dead--unused-code)
7. [Missing UX Patterns](#7-missing-ux-patterns)
8. [Mobile Navigation](#8-mobile-navigation)
9. [Code Quality & Type Safety](#9-code-quality--type-safety)
10. [Firestore / Firebase Issues](#10-firestore--firebase-issues)
11. [Priority Matrix](#11-priority-matrix)

---

## 1. RESPONSIVE DESIGN ISSUES

### Critical: Sidebar layouts have no mobile collapse

| File | Line ~ | Issue | Severity |
|------|--------|-------|----------|
| `components/AdminSidebar.tsx` | 52 | Fixed `width: 240` with no responsive breakpoint; will consume ~30% of a 768px screen | **High** |
| `components/OrganizerSidebar.tsx` | 107 | Same fixed `width: 240` | **High** |
| `components/StudentSidebar.tsx` | 108 | Same fixed `width: 240` | **High** |
| `app/admin/layout.tsx` | 8 | `display: "flex"` layout assumes desktop; sidebar never collapses | **High** |
| `app/organizer/layout.tsx` | 7 | Same rigid flex layout | **High** |
| `app/student/layout.tsx` | 7 | Same rigid flex layout | **High** |

### Fixed widths that break on mobile

| File | Line ~ | Issue | Severity |
|------|--------|-------|----------|
| `app/student/events/page.tsx` | 380-390 | Filter panel `width: 260, minWidth: 260` — no collapse on mobile | **High** |
| `app/student/events/[eventId]/page.tsx` | 482-487 | Right column `width: 280` fixed — will overflow or squeeze on small screens | **High** |
| `app/organizer/events/create/page.tsx` | 422 | Card `maxWidth: 680` OK but `row` style (L447) uses `display: flex` with no `flexWrap: wrap` — date/time inputs stack improperly | **Medium** |
| `app/student/events/[eventId]/page.tsx` | 466-475 | Content wrapper `maxWidth: 760` OK but `contentLayout` is `display: flex` without `flexWrap` — two-column layout never stacks | **High** |
| `app/admin/users/page.tsx` | 366-370 | Form row `display: flex` with no `flexWrap: wrap` — inputs overflow on narrow screens | **Medium** |
| `app/student/rewards/page.tsx` | 309-316 | Page renders its own `<StudentSidebar>` (L176) creating a **double sidebar** since the layout already provides one | **High** |
| `app/student/rewards/history/page.tsx` | 89-91 | Same double sidebar issue | **High** |
| `app/student/profile/page.tsx` | 494-498 | `fieldGrid` uses `gridTemplateColumns: "1fr 1fr"` — never switches to single column on mobile | **Medium** |

---

## 2. UI PATTERN INCONSISTENCIES

### Styling approach fragmentation

| Pattern | Files Using It | Issue |
|---------|---------------|-------|
| CSS Modules | `app/login/page.tsx`, `app/admin/dashboard/` | Only 2 files use CSS modules |
| Inline `React.CSSProperties` objects | ~25+ files | Dominant pattern but not centralized |
| Injected `<style>` tags | 7+ files (`student/events`, `student/certificates`, `student/rewards`, `student/my-applications`, `student/events/[eventId]`, `components/ImageUpload`, `components/FeedbackModal`) | Raw CSS strings for keyframes/responsive |

**Severity: High** — Three different styling approaches create maintenance burden.

### Color inconsistencies

| Token | Expected | Deviations |
|-------|----------|------------|
| Primary Green | `#246344` | Consistent ✓ |
| Page BG | `#f9fafb` | `student/events/page.tsx` uses `#ffffff` (L377) |
| Admin sidebar | Dark gradient | Organizer/Student use flat white — visually inconsistent |

### Font inconsistencies

- Most pages individually declare `fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif"`
- No global font-family set in `app/layout.tsx`
- Each page re-declares it independently

### Button & chip style inconsistencies

- Button border-radius varies: `4px`, `6px`, `8px` across pages
- Button padding varies: `4px 10px` to `12px` full-width
- Status chips re-defined in 7+ files with slightly different padding/radius

**Severity: Medium** — No shared button or chip components.

---

## 3. LOGO & BRANDING CONSISTENCY

| File | Usage | Issue |
|------|-------|-------|
| `app/login/page.tsx` | References `logo_2.png` | Only page using the logo |
| `app/api/generate-certificate/route.ts` | Loads `public/logo_2.png` for PDF | Correct |
| All sidebar components | Text-only branding | No logo used in navigation |
| `app/register/page.tsx` | No logo | Should match login branding |
| `app/forgot-password/page.tsx` | No logo | Same issue |

**Severity: Medium** — Logo only appears on login page and PDF certificates.

---

## 4. CODE REPETITION & DRY VIOLATIONS

### Duplicated inline style objects (~500+ lines)

| Style Name | Duplications | Files |
|------------|-------------|-------|
| `page` (wrapper) | 12× | Every admin, organizer, student page |
| `heading`/`titleStyle` | 12× | Same |
| `table`, `th`, `td` | 5× | admin/users, admin/organizers, admin/events, organizer/events, participants |
| `statusChip` | 7× | Multiple pages |
| `emptyBox`/`emptyWrapper` | 8× | Multiple pages |
| `errorBox`/`successBox` | 6× | Multiple pages |

### Duplicated components & constants

| Item | Files | Severity |
|------|-------|----------|
| `SearchableDropdown` component | `register/page.tsx`, `register/organization/page.tsx` | **High** |
| `DEPARTMENT_OPTIONS` array | `organizer/events/create/page.tsx`, `student/events/page.tsx` | **Medium** |
| `formatDate()` function | 4 student page files | **Medium** |
| `handleSignOut` logic | 3 sidebar components | **Low** |
| `@keyframes pulse` injection | 5+ files | **Medium** |

---

## 5. LONG FILES — REFACTOR CANDIDATES

| File | Lines | Recommendation |
|------|-------|----------------|
| `app/register/page.tsx` | 729 | Extract SearchableDropdown, extract styles |
| `app/student/profile/page.tsx` | 690 | Extract Wallet, History, Competency sections |
| `app/student/events/[eventId]/page.tsx` | 677 | Extract SideCard, SkeletonLoader |
| `app/student/events/page.tsx` | 660 | Extract FilterPanel, EventCard |
| `app/organizer/events/create/page.tsx` | 572 | Extract GalleryUpload section |
| `app/admin/rewards/page.tsx` | 567 | Extract RewardModal, RewardTable |
| `app/student/my-applications/page.tsx` | 510 | Styles could be shared |
| `app/student/rewards/page.tsx` | 461 | Fix double-sidebar bug |
| `app/student/certificates/page.tsx` | 460 | Styles could be shared |

---

## 6. DEAD / UNUSED CODE

| File | Line ~ | Issue | Severity |
|------|--------|-------|----------|
| `types/index.ts` | 3-30 | `UserProfile`, `Event`, `Participation` interfaces — field names don't match Firestore schema AND are **never imported** by any page | **Medium** |
| `app/student/rewards/page.tsx` | 7 | Imports `StudentSidebar` but layout already provides it — causes double sidebar | **High** |
| `app/student/rewards/history/page.tsx` | 8 | Same double sidebar import | **High** |
| `components/OrganizerSidebar.tsx` | 12 | Nav link to `/organizer/feedbacks` — **route does not exist** | **High** |
| `lib/pointsHelper.ts` | 87-88 | Re-reads user doc immediately after transaction already had it | **Low** |

---

## 7. MISSING UX PATTERNS

| Pattern | Status | Severity |
|---------|--------|----------|
| **Error boundaries** | None anywhere | **High** |
| **Pagination** | None — all data loaded at once | **High** |
| **`/unauthorized` page** | ProtectedRoute redirects there but page doesn't exist | **High** |
| **Confirmation dialogs** | Admin uses `window.confirm()`/`window.prompt()`; Student uses proper `ConfirmModal` | **High** |
| **Toast in admin pages** | Admin pages use `console.error` only, no toast | **Medium** |
| **Keyboard/focus management** | Not implemented on custom components | **Medium** |
| **Loading states** | Plain "Loading..." text in most pages; only student/events has skeletons | **Medium** |
| **Search in admin tables** | No search functionality | **Medium** |
| **Breadcrumbs** | None | **Low** |
| **Optimistic updates** | Not used | **Low** |

---

## 8. MOBILE NAVIGATION

| Issue | Severity |
|-------|----------|
| All three sidebars are permanently visible with fixed `width: 240px` | **Critical** |
| No hamburger menu or mobile drawer anywhere | **Critical** |
| No `@media` queries in any sidebar component | **Critical** |
| Student events filter panel (`width: 260px`) has no mobile collapse | **High** |
| Event detail two-column layout doesn't stack on mobile | **High** |
| Login page has proper CSS module responsive breakpoints ✓ | OK |

---

## 9. CODE QUALITY & TYPE SAFETY

### `any` type usage (9+ files)

Files using `catch (err: any)`: `organizer/events/create`, `admin/organizers`, `admin/organizers/requests`, `admin/rewards`, `student/rewards`, all 3 API routes, `generate-certificate`.

**Severity: Medium** — Should use `unknown` and type-narrow.

### Type mismatches

- Central `types/index.ts` defines `UserProfile.name` but Firestore uses `fullName`
- `types/index.ts` `Event.organizer` but Firestore uses `organizerId`/`organizerName`
- Only `UserRole` type is actually used (by `ProtectedRoute` and `useAuth`)

**Severity: High** — Central types are out of sync and unused.

### Turkish in codebase

| File | Count | Issue |
|------|-------|-------|
| `app/student/events/page.tsx` | ~20 comments | Turkish comments throughout |
| `hooks/useEvents.ts` | ~15 comments | Turkish comments throughout |
| `components/ProtectedRoute.tsx` | L28 | Loading text "Yükleniyor..." (Turkish) — user-facing |

**Severity: Medium**

### Hardcoded values

- `app/api/generate-certificate/route.ts` L268: `"https://voluntry.app"` hardcoded domain
- All color values hardcoded — should be CSS custom properties
- University/department lists hardcoded in registration pages

### ESLint disable comments

5 files use `eslint-disable-next-line react-hooks/exhaustive-deps` — some justified, some may mask dependency bugs.

---

## 10. FIRESTORE / FIREBASE ISSUES

### N+1 query patterns

| File | Issue | Severity |
|------|-------|----------|
| `organizer/events/[eventId]/participants/page.tsx` | Fetches user doc per participation in a loop | **High** |
| `organizer/events/[eventId]/feedback/page.tsx` | Fetches user doc per feedback | **High** |
| `student/dashboard/page.tsx` | Fetches event doc per upcoming application | **Medium** |
| `student/my-applications/page.tsx` | One getDoc per participation (uses Promise.all) | **Medium** |
| `student/profile/page.tsx` | Loops through participations fetching each event | **Medium** |

### Security concerns

| Issue | Severity |
|-------|----------|
| **API routes `/api/admin/*` have NO auth middleware** — unauthenticated access possible | **Critical** |
| **`lib/pointsHelper.ts` runs client-side** — users could call `awardPoints()` from console | **High** |
| `admin/users/page.tsx` creates Firestore doc without Auth account (`crypto.randomUUID()`) | **High** |
| `admin/users/page.tsx` `deleteDoc` removes Firestore doc but not Auth account | **High** |
| `admin/events/page.tsx` uses `window.prompt()` for rejection reasons — no sanitization | **Medium** |

### Redundant reads

| File | Issue |
|------|-------|
| `lib/pointsHelper.ts` L87 | Re-reads user doc after transaction already read it |
| `organizer/dashboard/page.tsx` | Three separate event queries — could be one with client filtering |

---

## 11. PRIORITY MATRIX

### 🔴 Critical (Fix Immediately)

| # | Issue |
|---|-------|
| 1 | API routes have no auth middleware — security vulnerability |
| 2 | Mobile navigation completely broken — sidebars never collapse |
| 3 | Double sidebar in rewards and history pages |
| 4 | `/unauthorized` page doesn't exist — broken redirect |
| 5 | `/organizer/feedbacks` route doesn't exist — dead nav link |
| 6 | Client-side `pointsHelper` is callable from browser console |

### 🟠 High (Fix Soon)

| # | Issue |
|---|-------|
| 7 | No pagination on any data list |
| 8 | N+1 Firestore queries in participants/feedback pages |
| 9 | `window.confirm()`/`window.prompt()` in admin pages |
| 10 | ~500 lines of duplicated style objects |
| 11 | No React error boundaries |
| 12 | Central `types/index.ts` out of sync with actual data |
| 13 | Duplicated `SearchableDropdown` in register pages |
| 14 | Event detail two-column layout doesn't stack on mobile |
| 15 | Admin user management creates docs without Auth accounts |

### 🟡 Medium (Plan for Next Sprint)

| # | Issue |
|---|-------|
| 16 | Three different styling approaches |
| 17 | No global font-family declaration |
| 18 | `any` type used in 9+ catch blocks |
| 19 | Turkish comments in 2 files (~35 comments) |
| 20 | Turkish loading text in ProtectedRoute |
| 21 | Duplicated date formatters (4 files) |
| 22 | Duplicated department constants (2 files) |
| 23 | Duplicated `@keyframes pulse` (5+ files) |
| 24 | No keyboard/focus management in modals |
| 25 | Profile grid doesn't go single-column on mobile |
| 26 | Admin pages don't use toast notifications |
| 27 | Hardcoded domain in certificate generator |
| 28 | Logo only on login page |
| 29 | Button/chip style inconsistencies |
| 30 | Redundant Firestore reads |

### 🟢 Low (Nice to Have)

| # | Issue |
|---|-------|
| 31 | No breadcrumbs |
| 32 | No optimistic updates |
| 33 | Sign-out logic duplicated in 3 sidebars |
| 34 | ESLint disable comments may mask bugs |
| 35 | Non-null assertions (`user!.uid`) |
| 36 | No undo for destructive admin actions |
| 37 | Skeleton loaders missing on most admin pages |

---

## File Inventory

| Directory | Files Scanned | Total Lines |
|-----------|--------------|-------------|
| `app/` (all routes) | 27 files | ~9,800 |
| `components/` | 11 files | ~1,650 |
| `hooks/` | 3 files | ~365 |
| `lib/` | 3 files | ~168 |
| `types/` | 1 file | 31 |
| **Total** | **45 files** | **~12,014** |

---

*End of audit report.*
