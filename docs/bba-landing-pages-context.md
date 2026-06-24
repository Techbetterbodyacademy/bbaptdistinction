# BBA Landing Pages: Project Context

**Last updated:** 2026-06-24
**Status:** Active, top priority
**Driver:** Noy (off 2026-06-25 for an operation, resumes day after)
**Builder:** Bryan

> **Note:** This is a separate project from the BBAPT coaching app at https://bbapt.vercel.app. The landing pages are the public-facing funnel that leads INTO the coaching app. Bryan keeps the docs here because both projects affect his workflow.

---

## What Are the Landing Pages?

When BBA runs paid ads or organic social media campaigns, viewers click through to a landing page. That landing page is what converts the click into a lead (email + phone) so BBA can follow up.

There are several different landing page use cases, each with its own purpose:

### 1. Application form pages
The main lead-capture page. A visitor lands here from a social ad or organic post, reads the offer, and fills out a short application form. Submitting the form creates a lead in BBA's CRM (GoHighLevel).

### 2. Thank-you pages
The page a visitor lands on after submitting the application form. Confirms their submission, sets next-step expectations (e.g., "we'll call you within 24 hours"), and optionally pushes them to book a call directly via Calendly or similar.

### 3. Challenge pages
Pages for time-limited challenges BBA runs (e.g., a 14-day transformation challenge). Different from a standard application page because they have a countdown / cohort start date, social proof from previous challenge graduates, and a stronger urgency CTA.

### 4. Other funnel pages
Anything else in the same bucket — webinar registration pages, lead magnet download pages, video sales letter pages, etc. Same brand and code patterns apply.

---

## Why Now (Jase's Reasoning)

Jase's verbatim view (relayed via Bryan on 2026-06-24):

> "The best use that we could get out of your time right now is working on the landing pages... that for me is the thing that's going to bring the most amount of value in the shortest possible period of time."

Translated: BBA already has paid ads running. Every lead landing on a sub-par page is leaving conversion on the table. Improving the landing pages directly increases lead volume from existing ad spend. The coaching app (BBAPT) is in good shape for now; the landing pages are the bottleneck on growth.

---

## Who Is Driving This

**Noy** is the lead on this project. Jase said:

> "Noy knows basically exactly what I want when it comes to these landing pages and how I want them to look."

So Bryan takes direction from Noy:
- She defines scope per page
- She supplies the copy, the mockups, the conversion goal
- She approves visual direction
- Bryan builds the actual code

**Noy is off 2026-06-25 for an operation.** Bryan should not start code until she's back and has briefed him. In the meantime Bryan can:
- Read past mockups or references she's already shared
- Set up project structure (Next.js project, brand tokens, base layout)
- Ask Jase for any in-flight context

---

## What Jase Wants (Brand + Quality Bar)

### Brand
**Same as the coaching app.** Verbatim from Jase:

> "We've got the one theme, which is the blue, black. That's our brand colors. The blue, black, and shades of gray. They shouldn't be pink or anything like that."

Allowed:
- Blue (BBA primary: #00AEEF and variants)
- Black
- Shades of gray
- White (text on dark)

Not allowed:
- Pink
- Any other accent colors
- Bright contrasts that break the moody, masculine aesthetic

### Typography
Inherits from the coaching app pattern:
- **Inter** for body text and most UI
- **Instrument Serif** for editorial accents (italic, hero words)
- **JetBrains Mono** for label/pill text

### Quality bar
The pages need to feel like a premium PT brand. Not a generic Click Funnels template. Look at:
- The BBAPT landing page at https://bbapt.vercel.app/ (already on brand, can be a reference)
- The coaching app's overall feel (dark theme, blue glow, tight typography)

---

## Architecture / Code Patterns

### Reusability is required
Jase verbatim:

> "I'm thinking that a lot of the code that you're writing it in should be transferable."

This means:
- Build a shared **component library** (Hero, Form, Testimonials, CountdownTimer, etc.)
- Build a shared **layout** with brand tokens (colors, fonts, spacing)
- Each new page = compose existing components, not write from scratch
- One Tailwind theme config, one design system, one repo

### Likely tech stack
- **Next.js 16** (same as coaching app)
- **Tailwind v4** (same)
- **TypeScript** (same)
- **Deployed to Vercel** (separate project from BBAPT or same monorepo)
- **Form submissions** route to GHL via webhook (existing pattern in BBA stack)

### Hosting decision (open)
Two options:
1. **Separate Vercel project** under bbapt's team — fresh repo, independent deploys
2. **Add to bbapt repo as `/marketing/*` routes** — shared infra, more contagious bugs

Recommend option 1 unless Noy/Jase wants tight integration. Easier rollback, separate analytics.

---

## What We Know vs What We Need From Noy

### Known
- Use cases (application form, thank-you, challenge, etc.)
- Brand constraints (blue/black/gray, no pink)
- Code reusability requirement
- Priority (this is now top, above further coaching app work)
- Jase will demo when kids are in bed and follow up directly with Bryan

### Need from Noy
- Specific mockups or Figma links (does she have these already?)
- Final list of landing pages to build, in priority order
- Copy for each page (or at least the hero copy direction)
- Where to route form submissions (which GHL workflow, which tags)
- Domain decision (subdomain like `apply.betterbodyacademy.com` or path-based like `betterbodyacademy.com/apply`)
- Are existing landing pages already live somewhere? If yes, can Bryan reverse-engineer the layout?

### Need from Jase
- Sign-off on hosting decision (separate Vercel project vs adding to bbapt)
- Approval of any spend (e.g., new domain, paid templates)
- Demo of the coaching app client side so he can validate (separate ask)

---

## Proposed Plan (Pending Noy's Input)

**Week 1: Foundation (Bryan can start while Noy is recovering)**
1. Spin up a new Next.js 16 project (separate Vercel deployment)
2. Port the design tokens from bbapt (`--color-blue`, fonts, etc.)
3. Build base components: PageLayout, Hero, ApplicationForm, ThankYouHero, CountdownTimer, TestimonialGrid, FAQ, Footer
4. Wire up form submissions to GHL via webhook (use existing Wise Abatement / Disruptors webhook pattern as reference)
5. Deploy the scaffold to a temporary URL for Noy/Jase to review

**Week 2: First Page (after Noy is back)**
1. Build the primary application form page with Noy's exact mockup
2. Build the matching thank-you page
3. Hook up GHL workflow that fires on submission
4. Get Jase sign-off
5. Switch to production URL

**Week 3+: Replicate**
- Challenge pages, webinar pages, etc.
- Each new page is a copy-paste of the application form with content swapped
- Maintain the shared component library

---

## How This Connects to BBAPT

Once a lead converts on a landing page → GHL workflow nurtures them → if they become a client, the coach creates them in BBAPT (the coaching app at https://bbapt.vercel.app). The landing pages are the **top of funnel**; BBAPT is the **delivery**. Eventually we might automate "new client paid in GHL → auto-invite to BBAPT", but that's a future integration.

---

## Open Questions

- Will Noy share her Figma/Notion before she's back, or wait until she's back?
- Do we have existing landing pages (e.g., on Click Funnels, GHL Pages, WordPress) to migrate or replace?
- What's the conversion baseline we're aiming to beat?
- Is there a deadline tied to a specific ad campaign?

These can wait until Noy is back. Bryan: keep momentum on bbapt client-side validation in the meantime.
