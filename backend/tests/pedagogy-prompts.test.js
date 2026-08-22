/**
 * Regression tests for the pedagogy prompt layer.
 *
 * This converts ad-hoc manual verification from the adaptive-learning session
 * into permanent tests: every module-generation prompt must render with zero
 * leftover {placeholder} tokens (a leak means a section was silently dropped and
 * the LLM sees the literal template text), the adaptive learner-state blocks
 * must actually appear when learner data is supplied, and — because it broke in
 * production twice this session — the config MUST NOT set thinkingConfig
 * incompatibly with a truncation-prone maxOutputTokens budget for the models we
 * route content generation through.
 */
import { describe, it, expect } from 'vitest';
import moduleGenerator from '../src/services/moduleGenerator.js';
import prompts from '../src/utils/prompts.js';
import geminiConfig from '../src/config/gemini.js';

const { applyPedagogy } = moduleGenerator;
const {
  MODULE_BATCH_GENERATION_PROMPT,
  MODULE_GENERATION_PROMPT,
  buildInterestsSection,
  buildLearningStyleSection,
  buildPaceSection,
  buildLegalGroundingSection,
  getModuleDepthSection,
  getQuizDepthSection,
} = prompts;
const { FALLBACK_MODELS } = geminiConfig;

// A placeholder leak is any `{lowercase_snake_case}` token still present after
// rendering. JSON braces in the schema example ({ "modules": [...] }) don't
// match this pattern, so this check is safe against false positives from the
// prompt's own example payload.
const PLACEHOLDER_RE = /\{[a-z][a-z0-9_]*\}/g;

function fillNonPedagogyPlaceholders(prompt, text = 'SAMPLE TEXT') {
  const { depthSection, domain } = getModuleDepthSection(text);
  return prompt
    .replace('{document_text}', text)
    .replace('{teaching_level}', 'intermediate')
    .replace('{interests_section}', buildInterestsSection(['football'], 'intermediate'))
    .replace('{learning_style_section}', buildLearningStyleSection('visual'))
    .replace('{pace_section}', buildPaceSection('standard'))
    .replace('{legal_grounding_section}', buildLegalGroundingSection(text))
    .replace('{depth_section}', depthSection)
    .replace('{content_word_range}', domain ? '600-1200 words' : '200-400 words')
    .replace('{quiz_depth_section}', getQuizDepthSection(text))
    .replace('{question_count}', '1') // inline recall question count — see moduleGenerator.INLINE_QUESTION_COUNT
    .replace('{full_outline}', 'OUTLINE')
    .replace('{batch_modules}', 'BATCH');
}

describe('applyPedagogy — placeholder rendering', () => {
  it('renders MODULE_BATCH_GENERATION_PROMPT with no leftover placeholders (no opts)', () => {
    const rendered = fillNonPedagogyPlaceholders(applyPedagogy(MODULE_BATCH_GENERATION_PROMPT));
    expect(rendered.match(PLACEHOLDER_RE)).toBeNull();
  });

  it('renders MODULE_GENERATION_PROMPT with no leftover placeholders (no opts)', () => {
    const rendered = fillNonPedagogyPlaceholders(applyPedagogy(MODULE_GENERATION_PROMPT));
    expect(rendered.match(PLACEHOLDER_RE)).toBeNull();
  });

  it('renders cleanly with a fully populated adaptive learner state', () => {
    const opts = {
      mission: 'Pass my anatomy exam',
      focusMode: true,
      priorTopics: ['Bones', 'Joints'],
      learnerState: {
        misconceptions: ['Thinks arteries carry deoxygenated blood'],
        strugglingTopics: ['Circulation'],
        masteredTopics: ['Skeletal system'],
        preferredAnalogyDomain: 'football',
        pace: 'slow',
        attemptNumber: 3,
      },
    };
    const rendered = fillNonPedagogyPlaceholders(applyPedagogy(MODULE_BATCH_GENERATION_PROMPT, opts));
    expect(rendered.match(PLACEHOLDER_RE)).toBeNull();
  });

  it('degrades cleanly to the non-adaptive form when opts is entirely omitted', () => {
    // A brand-new document has no learner history yet — this must not throw and
    // must not leave any adaptive section half-rendered.
    expect(() => applyPedagogy(MODULE_BATCH_GENERATION_PROMPT)).not.toThrow();
  });
});

describe('applyPedagogy — adaptive content actually appears', () => {
  it('surfaces the specific misconception text when supplied', () => {
    const rendered = applyPedagogy(MODULE_BATCH_GENERATION_PROMPT, {
      learnerState: { misconceptions: ['__UNIQUE_MISCONCEPTION_MARKER__'] },
    });
    expect(rendered).toContain('__UNIQUE_MISCONCEPTION_MARKER__');
    expect(rendered).toContain('KNOWN MISCONCEPTIONS');
  });

  it('triggers the "change approach, do not restate" rule on repeat attempts', () => {
    const rendered = applyPedagogy(MODULE_BATCH_GENERATION_PROMPT, {
      learnerState: { attemptNumber: 2 },
    });
    expect(rendered).toContain('has not stuck');
  });

  it('does NOT include repeat-attempt language on a first attempt', () => {
    const rendered = applyPedagogy(MODULE_BATCH_GENERATION_PROMPT, {
      learnerState: { attemptNumber: 1 },
    });
    expect(rendered).not.toContain('has not stuck');
  });

  it('includes the quiz hygiene block (equal-length, plausible-distractor rules)', () => {
    const rendered = applyPedagogy(MODULE_BATCH_GENERATION_PROMPT);
    expect(rendered).toContain('EQUAL LENGTH');
    expect(rendered).toContain('PLAUSIBLE DISTRACTORS');
  });

  it('includes ZPD and retrieval-practice framing in every render', () => {
    const rendered = applyPedagogy(MODULE_BATCH_GENERATION_PROMPT);
    expect(rendered).toContain('ZONE OF PROXIMAL');
    expect(rendered).toContain('RETRIEVAL STRUCTURE');
  });
});

describe('Model config — thinkingBudget compatibility', () => {
  // Regression test for a bug found live twice this session: (1) omitting
  // thinkingBudget: 0 let a reasoning model's thinking tokens consume the whole
  // output budget and truncate module JSON mid-object; (2) gemini-3.5-flash-lite
  // was added to a fallback chain and, unlike the other models in it, REJECTS
  // thinkingBudget: 0 outright with a 400. Both are silent-until-load failures —
  // the second one only surfaces once the primary model in the chain is rate
  // limited — so this is worth locking down structurally, not just via the probe
  // script (which requires a live API key and network access to run).
  // Models confirmed (via scripts/probe-models.js, live, 2026-08-22) to reject
  // thinkingConfig.thinkingBudget = 0. Extend this list if a future probe finds
  // another incompatible model before adding it to fast / fast_lite.
  const THINKING_BUDGET_INCOMPATIBLE = new Set(['gemini-3.5-flash-lite']);

  it('fast and fast_lite chains contain no known thinkingBudget-incompatible model', () => {
    for (const tier of ['fast', 'fast_lite']) {
      const offenders = FALLBACK_MODELS[tier].filter(m => THINKING_BUDGET_INCOMPATIBLE.has(m));
      expect(offenders, `${tier} chain contains incompatible model(s): ${offenders.join(', ')}`).toEqual([]);
    }
  });
});
