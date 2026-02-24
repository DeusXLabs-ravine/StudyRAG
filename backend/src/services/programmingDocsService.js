const { getGenerativeModel } = require('../config/gemini');

// Curated map of language/framework → official documentation domains
const DOC_SOURCES = {
  python: ['docs.python.org', 'docs.djangoproject.com', 'flask.palletsprojects.com', 'numpy.org/doc', 'pandas.pydata.org/docs', 'pytorch.org/docs', 'scikit-learn.org', 'docs.scipy.org'],
  javascript: ['developer.mozilla.org', 'nodejs.org/docs', 'react.dev', 'vuejs.org', 'angular.io/docs', 'expressjs.com', 'nextjs.org/docs'],
  typescript: ['typescriptlang.org/docs', 'developer.mozilla.org'],
  java: ['docs.oracle.com/javase', 'spring.io/docs', 'docs.oracle.com/en/java'],
  kotlin: ['kotlinlang.org/docs'],
  rust: ['doc.rust-lang.org', 'docs.rs'],
  go: ['go.dev/doc', 'pkg.go.dev'],
  cpp: ['en.cppreference.com', 'cplusplus.com/reference'],
  c: ['en.cppreference.com'],
  csharp: ['learn.microsoft.com/dotnet', 'docs.microsoft.com/dotnet'],
  swift: ['developer.apple.com/documentation', 'swift.org/documentation'],
  ruby: ['ruby-doc.org', 'api.rubyonrails.org', 'guides.rubyonrails.org'],
  php: ['php.net/manual', 'laravel.com/docs'],
  r: ['cran.r-project.org/manuals.html', 'www.rdocumentation.org'],
  sql: ['dev.mysql.com/doc', 'postgresql.org/docs', 'sqlite.org/docs.html'],
};

const GENERAL_DEV = [
  'stackoverflow.com',
  'github.com',
  'devdocs.io',
  'developer.mozilla.org',
];

// Quick pattern-based detection before calling LLM
const LANGUAGE_PATTERNS = {
  python: /\b(import\s+\w+|from\s+\w+\s+import|def\s+\w+|class\s+\w+.*:|pip\s+install|__init__|\.py\b)/,
  javascript: /\b(const\s+\w+|let\s+\w+|var\s+\w+|function\s+\w+|require\(|import\s+.*from|=>\s*{|\.js\b|npm\s+install)/,
  typescript: /\b(interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|void)|\.ts\b|\.tsx\b)/,
  java: /\b(public\s+class|private\s+\w+|System\.out|import\s+java\.|\.java\b|@Override)/,
  rust: /\b(fn\s+\w+|let\s+mut|impl\s+\w+|use\s+std::|\.rs\b|cargo\s)/,
  go: /\b(func\s+\w+|package\s+\w+|import\s+"|\w+\.\w+\(\)|\.go\b|go\s+mod)/,
  cpp: /\b(#include\s*<|std::|cout|cin|nullptr|template\s*<|\.cpp\b|\.hpp\b)/,
  csharp: /\b(using\s+System|namespace\s+\w+|public\s+class|\.cs\b|async\s+Task)/,
  ruby: /\b(require\s+'|def\s+\w+|end\b|class\s+\w+\s*<|\.rb\b|gem\s+install)/,
  php: /\b(<\?php|\$\w+\s*=|function\s+\w+|namespace\s+\w+|\.php\b|composer\s)/,
  sql: /\b(SELECT\s+\w+|CREATE\s+TABLE|INSERT\s+INTO|ALTER\s+TABLE|DROP\s+TABLE)/i,
  r: /\b(library\(|<-\s|data\.frame|ggplot|dplyr|tidyverse|\.R\b)/,
  swift: /\b(import\s+UIKit|import\s+SwiftUI|var\s+\w+\s*:\s*\w+|func\s+\w+|\.swift\b)/,
  kotlin: /\b(fun\s+\w+|val\s+\w+|var\s+\w+:\s*\w+|import\s+kotlin|\.kt\b)/,
};

const FRAMEWORK_PATTERNS = {
  react: /\b(React|useState|useEffect|jsx|tsx|<\w+\s*\/?>|ReactDOM|next\/)/,
  vue: /\b(Vue|v-bind|v-for|v-if|defineComponent|<template>|\.vue\b)/,
  angular: /\b(Angular|@Component|@Injectable|NgModule|\.component\.ts)/,
  django: /\b(django|models\.Model|views\.py|urls\.py|settings\.py|manage\.py)/,
  flask: /\b(Flask|@app\.route|flask\.|render_template)/,
  express: /\b(express\(\)|app\.get|app\.post|app\.use|router\.|middleware)/,
  spring: /\b(SpringBoot|@RestController|@Autowired|@Service|spring\.)/,
  rails: /\b(Rails|ActiveRecord|ApplicationController|config\/routes)/,
  laravel: /\b(Laravel|Eloquent|Artisan|Route::|Blade)/,
  pytorch: /\b(torch\.|nn\.Module|tensor|cuda|autograd)/,
  tensorflow: /\b(tensorflow|tf\.|keras\.|model\.fit|model\.compile)/,
  nextjs: /\b(next\/|getServerSideProps|getStaticProps|NextResponse|app\/)/,
};

/**
 * Detect programming language and frameworks from document text.
 * Uses pattern matching first, then a fast LLM call for confirmation.
 */
function detectProgrammingContext(text) {
  const excerpt = text.slice(0, 5000);

  // Pattern-based detection
  const detectedLanguages = [];
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = excerpt.match(new RegExp(pattern, 'g'));
    if (matches && matches.length >= 2) {
      detectedLanguages.push({ language: lang, matchCount: matches.length });
    }
  }

  const detectedFrameworks = [];
  for (const [framework, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
    const matches = excerpt.match(new RegExp(pattern, 'g'));
    if (matches && matches.length >= 1) {
      detectedFrameworks.push(framework);
    }
  }

  if (detectedLanguages.length === 0) {
    return { isProgramming: false, language: null, frameworks: [], confidence: 0 };
  }

  // Sort by match count, pick the top language
  detectedLanguages.sort((a, b) => b.matchCount - a.matchCount);
  const primaryLanguage = detectedLanguages[0].language;
  const confidence = Math.min(1, detectedLanguages[0].matchCount / 10);

  return {
    isProgramming: true,
    language: primaryLanguage,
    frameworks: detectedFrameworks,
    confidence,
  };
}

/**
 * Get official documentation domains for a detected language/framework.
 */
function getDocSources(language, frameworks = []) {
  const domains = new Set(GENERAL_DEV);

  if (language && DOC_SOURCES[language]) {
    for (const d of DOC_SOURCES[language]) domains.add(d);
  }

  // Check for framework-specific doc sources in the language's list
  for (const fw of frameworks) {
    // Frameworks are usually under their language's doc sources
    for (const [, langDomains] of Object.entries(DOC_SOURCES)) {
      for (const d of langDomains) {
        if (d.toLowerCase().includes(fw.toLowerCase())) {
          domains.add(d);
        }
      }
    }
  }

  return [...domains];
}

module.exports = {
  detectProgrammingContext,
  getDocSources,
  DOC_SOURCES,
  GENERAL_DEV,
};
