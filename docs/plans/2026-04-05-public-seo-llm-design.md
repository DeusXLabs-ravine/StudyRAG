# Public SEO And LLM Discoverability Design

**Date:** 2026-04-05

## Goal

Make the public StudyRAG website significantly more search-friendly and LLM-friendly without changing the existing visual design or core layout.

## Approved Constraints

- Keep the current UI and visual language intact.
- Do not redesign page structure in a way that feels like a new site.
- Focus only on public marketing pages and crawlable public assets.
- Add richer FAQ and comparison content with answers visible on the page.
- Optimize not just for traditional search engines, but also for LLM retrieval and summarization.

## Problem Summary

The public site already has a reusable SEO component and some metadata, but it is still under-optimized in the places that matter most:

- Public pages are visually polished but relatively thin in crawlable, query-targeted text.
- FAQ-style content is minimal, which weakens long-tail search coverage and LLM answerability.
- Structured data is present but shallow.
- The site does not yet explicitly support emerging LLM-oriented discovery patterns with highly legible public summaries and question-answer content.
- Sitemap and robots coverage are basic and should be refreshed alongside page updates.

## Design Direction

The implementation should strengthen the site's information architecture and semantic clarity while preserving the existing design system.

The work will focus on three layers:

1. Metadata and structured data
2. Crawlable public content
3. LLM-readable summaries and Q&A

## SEO Strategy

### 1. Stronger Metadata

Upgrade the reusable SEO component so each public page can provide:

- More specific page titles
- Better meta descriptions
- Canonical URLs
- OG/Twitter image and title consistency
- Optional robots directives
- Multiple JSON-LD blocks when needed

This lets the public pages rank for distinct intents rather than sharing generic “brand page” metadata.

### 2. Richer Search Intent Coverage

Expand the public pages so each one serves a clear search purpose:

- Home: brand, AI study platform, best studying platform, document-based AI study tool
- Features: AI study features, quiz generator, flashcards, AI tutor, document chat
- About: RAG for education, evidence-based AI learning, hallucination-free AI study
- Pricing: AI study app pricing, study platform pricing, free vs paid study plans

### 3. Better Internal Linking

Use clearer internal links between public pages so crawlers and LLMs can connect product concepts:

- Home to Features, Pricing, About
- Features to Pricing
- About to Home and Features
- Pricing to Features and Home

### 4. FAQ Visibility

Add a large FAQ section on the home page with the answers visible by default. This improves:

- Long-tail SEO
- Featured-snippet style answerability
- LLM retrieval quality
- Topical completeness

## LLM Discoverability Strategy

### 1. Entity-Rich, Explicit Copy

Rewrite and expand public copy so it clearly states:

- What StudyRAG is
- Who it is for
- What it does
- How it differs from generic AI chat tools
- Which workflows it supports

This helps LLMs summarize the product correctly.

### 2. Clear Question-Answer Formatting

Use direct questions and plain, factual answers across the FAQ and comparison sections. This gives LLMs structured content that is easy to quote, summarize, or retrieve.

### 3. Public LLM Summary Asset

Add a public `llms.txt`-style file summarizing:

- The product
- The key public pages
- Main capabilities
- Intended users
- Important distinctions

This is an inference-based enhancement, not a dependency on an official standard, but it is a low-risk addition that can improve machine readability.

### 4. Structured Data Depth

Expand JSON-LD to include the page types that best match the public content:

- SoftwareApplication
- Organization
- FAQPage
- WebSite
- BreadcrumbList where useful

## Content Plan

### Home Page

Keep the hero and existing sections visually intact, but add:

- A larger SEO-focused paragraph block that clearly explains StudyRAG
- A comparison/editorial section targeting “best studying platforms” and adjacent queries
- A visible FAQ section with many more questions and fully visible answers

Example FAQ topics:

- What is StudyRAG?
- Is StudyRAG good for exam preparation?
- Can StudyRAG create quizzes from my notes?
- Is StudyRAG better than generic AI chat for studying PDFs?
- What are the top studying platforms for students?
- Which study platforms support quizzes, flashcards, and AI tutoring?
- What is the best AI study platform for document-based learning?
- Can StudyRAG help with lecture notes and textbooks?
- Does StudyRAG work for STEM subjects?
- Is StudyRAG free to start?

### Features Page

Keep the card-based interface but add:

- More descriptive crawlable copy beneath the hero or between sections
- Feature-focused explanatory text that targets product-capability queries
- Supporting internal links to pricing and home

### About Page

Expand the educational/RAG explanation so the page better targets:

- RAG for education
- evidence-based AI learning
- source-grounded AI study platform

### Pricing Page

Add more explanatory copy around:

- who each tier is for
- free vs paid usage
- teach mode and advanced tools
- why someone would upgrade

## Public Files

### robots.txt

Retain the crawl-budget strategy for public pages, but refresh comments and make sure the sitemap reference stays accurate.

### sitemap.xml

Update last-modified dates and include any added public SEO/LLM assets if they should be indexed.

### llms.txt

Add a concise, machine-readable public summary with links to the most relevant public URLs.

## Non-Goals

- No redesign of hero, cards, or brand style
- No migration to SSR or another framework in this phase
- No protected app-route SEO work
- No new CMS or blog system in this phase

## Verification

Verification should confirm:

- public metadata renders correctly
- JSON-LD is valid and present
- FAQ content is visible in the DOM
- the new summary asset is emitted in `public`
- sitemap and robots are updated
- production build passes

## Notes

This phase prioritizes low-risk, high-leverage improvements. If more SEO performance is needed afterward, the next phase would evaluate prerendering or SSR for the public marketing routes only.

