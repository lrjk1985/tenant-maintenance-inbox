# Admin Ticket Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline Admin ticket editing so managers can control ticket title, description, priority, status, and assignment.

**Architecture:** Reuse the existing dashboard data fetch and shared ticket/staff types. Add one admin-only server action for ticket detail updates and one Admin tab that renders editable ticket forms inline.

**Tech Stack:** Next.js App Router server components/actions, Supabase, TypeScript, Tailwind CSS.

---

### Task 1: Admin Ticket Save Action

**Files:**
- Modify: `src/app/actions.ts`

- [x] Add a schema for admin ticket edits.
- [x] Require admin or manager role before saving.
- [x] Update ticket title, description, priority, status, and assigned staff.
- [x] Insert a ticket update record and audit log record.
- [x] Revalidate Admin, Tickets, and Chat pages.

### Task 2: Admin Tickets Tab

**Files:**
- Modify: `src/app/admin/page.tsx`

- [x] Add a Tickets tab.
- [x] Show all tickets in inline edit forms.
- [x] Include title, description, priority, status, assigned staff, tenant/unit context, and related message link.
- [x] Keep delete out of scope for audit safety.

### Task 3: Verification

**Files:**
- Verify existing tests.

- [x] Run lint.
- [x] Run TypeScript.
- [x] Run focused unit tests.
