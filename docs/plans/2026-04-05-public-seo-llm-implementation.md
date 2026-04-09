# Public SEO And LLM Discoverability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the public StudyRAG website's SEO and LLM discoverability without changing the existing visual design.

**Architecture:** Keep the current Vite SPA and existing page layouts, but strengthen the metadata layer, structured data, crawlable copy, FAQ coverage, and public machine-readable assets. The implementation should be additive and content-focused, using the current React pages and public static files.

**Tech Stack:** React, Vite, react-helmet-async, static public assets, JSON-LD, robots.txt, sitemap.xml

---

### Task 1: Upgrade The Reusable SEO Layer

**Files:**
- Modify: `frontend/src/components/common/SEO.jsx`
- Test: `frontend/src/components/common/SEO.jsx`

**Step 1: Write the failing check mentally and identify missing capabilities**

Current gaps to address:

- no support for page-specific keywords or robots directives
- only one schema object instead of multiple JSON-LD blocks
- OG image remains relative
- no support for `og:site_name`

**Step 2: Modify the SEO component**

Implement support for:

- `keywords`
- `robots`
- `schema` as object or array
- absolute OG image URLs
- `og:site_name`

Keep the existing API backwards compatible for the current pages.

**Step 3: Verify the component compiles**

Run: `npm run build`

Expected: production build succeeds with no JSX or import errors caused by the SEO component update.

**Step 4: Commit**

```bash
git add frontend/src/components/common/SEO.jsx
git commit -m "feat: strengthen shared SEO metadata support"
```

### Task 2: Expand The Home Page For Search Intent And FAQ Coverage

**Files:**
- Modify: `frontend/src/pages/Home.jsx`
- Test: `frontend/src/pages/Home.jsx`

**Step 1: Add SEO-focused content data**

Create plain data structures near the top of the file for:

- expanded FAQ items
- comparison/platform summary items
- optional supporting keyword phrases

The FAQ answers should be fully visible by default, not hidden in accordions.

**Step 2: Improve home-page SEO metadata and schema**

Update the `SEO` usage on the home page to include:

- stronger title
- stronger description
- keyword list
- richer JSON-LD using `SoftwareApplication`, `Organization`, `WebSite`, and `FAQPage`

**Step 3: Add crawlable content sections without redesigning the page**

Add new sections that fit the current design language:

- a short “why StudyRAG” crawlable explainer
- a “top studying platforms” comparison/editorial section
- a visible FAQ section with many more questions and answers

Use the existing typography and section patterns already present in the file.

**Step 4: Verify build output**

Run: `npm run build`

Expected: build passes and the home page renders with the added sections.

**Step 5: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat: expand home page SEO and FAQ coverage"
```

### Task 3: Deepen The Features Page Search Content

**Files:**
- Modify: `frontend/src/pages/Features.jsx`
- Test: `frontend/src/pages/Features.jsx`

**Step 1: Improve page metadata**

Update the `SEO` usage on the features page with more specific:

- title
- description
- keywords
- schema appropriate for product features

**Step 2: Add crawlable explanatory copy**

Add supporting copy around the existing feature groups that targets:

- AI study app features
- document chat with citations
- quiz and flashcard generation
- AI tutoring for notes and PDFs

Do not change the card layout or interaction model.

**Step 3: Add stronger internal linking cues**

Add a few natural text links toward:

- pricing
- home
- about

**Step 4: Verify build**

Run: `npm run build`

Expected: build passes and the features page stays visually consistent.

**Step 5: Commit**

```bash
git add frontend/src/pages/Features.jsx
git commit -m "feat: improve features page SEO copy"
```

### Task 4: Deepen The About Page For RAG And Trust Queries

**Files:**
- Modify: `frontend/src/pages/About.jsx`
- Test: `frontend/src/pages/About.jsx`

**Step 1: Improve page metadata**

Update the `SEO` usage to better target:

- RAG for education
- source-grounded AI learning
- evidence-based AI study platform

**Step 2: Expand the page copy**

Add more explicit language about:

- what retrieval-augmented generation means in practice
- why source grounding matters for studying
- how StudyRAG differs from generic chatbot workflows

Keep the current visual sections intact.

**Step 3: Verify build**

Run: `npm run build`

Expected: build passes and about-page copy remains within the existing layout.

**Step 4: Commit**

```bash
git add frontend/src/pages/About.jsx
git commit -m "feat: improve about page trust and RAG SEO"
```

### Task 5: Deepen The Pricing Page For Commercial Search Intent

**Files:**
- Modify: `frontend/src/pages/Pricing.jsx`
- Test: `frontend/src/pages/Pricing.jsx`

**Step 1: Improve metadata**

Update the `SEO` usage with stronger commercial-intent copy:

- AI study platform pricing
- free vs paid study plans
- student study app pricing

**Step 2: Add supporting explanatory content**

Add crawlable content that explains:

- who each tier is for
- what changes when a user upgrades
- why the free plan is useful
- where premium features become valuable

Keep the pricing cards visually unchanged.

**Step 3: Verify build**

Run: `npm run build`

Expected: build passes and pricing retains its current card layout.

**Step 4: Commit**

```bash
git add frontend/src/pages/Pricing.jsx
git commit -m "feat: improve pricing page SEO intent coverage"
```

### Task 6: Add LLM-Friendly Public Summary Assets

**Files:**
- Create: `frontend/public/llms.txt`
- Optionally modify: `frontend/public/robots.txt`
- Optionally modify: `frontend/public/sitemap.xml`
- Test: `frontend/public/llms.txt`

**Step 1: Create the machine-readable summary**

Add `frontend/public/llms.txt` with:

- product summary
- audience summary
- core capabilities
- public page links
- brief explanation of what StudyRAG is best for

Keep it plain, factual, and easy for machine consumption.

**Step 2: Refresh crawl assets**

Update:

- `robots.txt` comments only if needed for clarity
- `sitemap.xml` dates and public-file coverage if appropriate

**Step 3: Verify file output**

Run: `npm run build`

Expected: `llms.txt` is copied into the production output and sitemap/robots remain valid static assets.

**Step 4: Commit**

```bash
git add frontend/public/llms.txt frontend/public/robots.txt frontend/public/sitemap.xml
git commit -m "feat: add public LLM discovery assets"
```

### Task 7: Final Verification

**Files:**
- Modify if needed: any of the files above after verification

**Step 1: Run focused verification**

Run:

```bash
node frontend/src/services/apiBase.test.js
```

Expected: all existing frontend service URL tests still pass.

**Step 2: Run production build**

Run:

```bash
cd frontend
npm run build
```

Expected: build succeeds.

**Step 3: Spot-check built output**

Check:

- `frontend/dist/index.html`
- `frontend/dist/robots.txt`
- `frontend/dist/sitemap.xml`
- `frontend/dist/llms.txt`

Expected:

- metadata emitted
- crawl assets present
- LLM summary file present

**Step 4: Commit**

```bash
git add frontend/src/components/common/SEO.jsx frontend/src/pages/Home.jsx frontend/src/pages/Features.jsx frontend/src/pages/About.jsx frontend/src/pages/Pricing.jsx frontend/public/llms.txt frontend/public/robots.txt frontend/public/sitemap.xml
git commit -m "feat: improve public SEO and LLM discoverability"
```

Plan complete and saved to `docs/plans/2026-04-05-public-seo-llm-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
