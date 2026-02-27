/**
 * Mathematics-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce prompt sections that get injected into module generation,
 * quiz generation, flashcard generation, and tutor chat prompts when the subject
 * detector identifies the uploaded material as mathematical content. The goal is to
 * replace generic "200-400 words" instructions with rigorous, proof-driven,
 * computation-heavy depth that mathematics students actually need.
 *
 * Each builder accepts a `subdisciplines` array (e.g. ['calculus', 'linear_algebra'])
 * produced by subjectDetector.js and returns a plain string ready for template
 * injection via `.replace('{mathematics_depth_section}', ...)`.
 */

// ─── Subdiscipline-Specific Instruction Blocks ──────────────────

/**
 * Map of subdiscipline keys to their mandatory coverage requirements.
 * These get appended to the base depth section when the corresponding
 * subdiscipline is detected in the student's material.
 */
const SUBDISCIPLINE_MODULE_INSTRUCTIONS = {
  calculus: `
CALCULUS — MANDATORY COVERAGE:
- For every limit evaluated, show the full analytical process:
  (a) Direct substitution attempt and identification of indeterminate form (0/0, inf/inf, etc.)
  (b) Algebraic manipulation, L'Hopital's Rule application, or squeeze theorem as appropriate
  (c) For advanced topics: present the epsilon-delta definition and construct the delta in terms of epsilon for at least one example per module
- Derivative computations must show EVERY step of the chain rule, product rule, or quotient rule — never skip intermediate algebra
- Integral techniques must include:
  (a) Identification of the appropriate method (substitution, integration by parts, partial fractions, trigonometric substitution, trigonometric identities)
  (b) Full substitution steps with explicit du/dx computation and bounds transformation for definite integrals
  (c) Verification by differentiating the result where instructive
- Series and convergence: state each convergence test used (ratio, root, comparison, integral, alternating series), verify ALL hypotheses of the test before applying it, and state the conclusion explicitly
- Multivariable calculus: show partial derivative computations with clear notation, verify equality of mixed partials (Clairaut's theorem conditions), and provide geometric interpretation of gradients, divergence, and curl`,

  linear_algebra: `
LINEAR ALGEBRA — MANDATORY COVERAGE:
- Matrix computations must be shown step-by-step:
  (a) Row reduction: show each elementary row operation explicitly, label the pivot positions, and state the rank
  (b) Determinant computation: show cofactor expansion or row reduction method with every arithmetic step
  (c) Matrix multiplication: show the dot product computation for at least one representative entry when the matrices are larger than 2x2
- Eigenvalue problems must include:
  (a) Formation of the characteristic polynomial det(A - lambda*I) with full expansion
  (b) Factoring or solving the characteristic polynomial for eigenvalues
  (c) For each eigenvalue: solving (A - lambda*I)x = 0 to find the eigenvectors, showing the row reduction
  (d) Verification: multiply A*v and lambda*v to confirm the eigenvector relationship
- Geometric interpretation is MANDATORY: explain what linear transformations do geometrically (rotation, reflection, scaling, shearing, projection) and connect eigenvalues/eigenvectors to invariant directions
- For vector spaces: verify all axioms when proving something is a subspace, check linear independence by row reducing the augmented matrix, and compute dimension by finding a basis
- Orthogonality: show Gram-Schmidt process step-by-step, verify orthogonality of the result by computing inner products`,

  abstract_algebra: `
ABSTRACT ALGEBRA — MANDATORY COVERAGE:
- For every algebraic structure introduced (group, ring, field, module), explicitly verify ALL axioms:
  (a) Groups: closure, associativity, identity element (exhibit it), inverse elements (exhibit the formula or construction)
  (b) Rings: verify both the additive group structure and multiplicative properties (associativity, distributivity), state whether commutative and whether it has unity
  (c) Fields: verify all ring axioms plus multiplicative inverses for all nonzero elements
- Subgroup tests: apply the two-step subgroup test (closed under operation and inverses) or the one-step test (ab^{-1} in H) with explicit verification
- Homomorphism proofs must show: phi(a * b) = phi(a) * phi(b) for arbitrary elements, identification of the kernel, application of the First Isomorphism Theorem where relevant
- Quotient constructions: verify the subgroup/ideal is normal/two-sided, define the coset operation, verify well-definedness of the operation on cosets
- Lagrange's theorem applications: state the theorem, identify the group order and subgroup order, draw conclusions about possible subgroup orders and element orders
- For every theorem stated, provide either a complete proof or a detailed proof sketch with the key ideas and critical steps identified`,

  statistics: `
STATISTICS AND PROBABILITY — MANDATORY COVERAGE:
- Probability derivations must show every step:
  (a) Define the sample space and event sets explicitly
  (b) Apply counting principles (multiplication rule, permutations, combinations) with the combinatorial formula written out
  (c) For conditional probability: derive using P(A|B) = P(A intersect B)/P(B) with the numerator and denominator computed separately
  (d) Bayes' theorem applications: show the full expansion of the denominator (law of total probability) with every term
- Distribution properties: derive the mean and variance from the definition E[X] = sum/integral of x*f(x), show the algebra, do not merely state the result
- Hypothesis testing must follow the COMPLETE procedure:
  (a) State H0 and H1 explicitly with the parameter and direction
  (b) Choose the test statistic and justify why it is appropriate (what assumptions are required? are they met?)
  (c) Compute the test statistic showing all arithmetic
  (d) Determine the critical value(s) or p-value with the degrees of freedom and significance level stated
  (e) State the decision rule and apply it: reject H0 or fail to reject H0
  (f) State the conclusion in context of the original problem (not just "reject H0" but what that means substantively)
- Confidence interval construction: derive the formula from the pivotal quantity, compute the margin of error with all steps, and interpret the interval in context ("We are 95% confident that...")
- Regression: show the derivation of least-squares estimators (normal equations), compute residuals, interpret R-squared, and check assumptions (linearity, homoscedasticity, normality of residuals, independence)`,

  discrete_math: `
DISCRETE MATHEMATICS — MANDATORY COVERAGE:
- Combinatorial proofs: provide both algebraic and combinatorial (counting) arguments where possible
  (a) Algebraic: manipulate the binomial coefficients or generating functions with full algebraic steps
  (b) Combinatorial: describe explicitly what each side of the identity counts and why they count the same thing
- Mathematical induction proofs must include:
  (a) Base case: verify the statement for n = 0 or n = 1 (whichever is appropriate) with explicit computation
  (b) Inductive hypothesis: state precisely what is assumed (strong vs. weak induction)
  (c) Inductive step: show the complete derivation from P(k) to P(k+1), highlighting exactly where the inductive hypothesis is used
  (d) Conclusion: state that by the principle of mathematical induction, the result holds for all n >= base case
- Graph theory: for every algorithm (BFS, DFS, Dijkstra, Kruskal, Prim, topological sort):
  (a) State the algorithm precisely (pseudocode or step-by-step description)
  (b) Trace through a concrete example graph showing the state at each iteration (visited set, queue/stack/priority queue contents, current distances)
  (c) State the time complexity with justification
- Recurrence relations: show the full solution process — guess and verify, characteristic equation method, or generating functions — with every algebraic step
- Logic and proof techniques: for each proof, explicitly identify the proof strategy (direct, contrapositive, contradiction, construction, cases) and justify why it is appropriate`,

  topology: `
TOPOLOGY — MANDATORY COVERAGE:
- For every topological concept introduced, ground it in the formal definition:
  (a) Topological space: verify the three axioms (empty set and X are open, arbitrary unions of open sets are open, finite intersections of open sets are open)
  (b) Continuity: prove using the preimage definition (f is continuous iff f^{-1}(U) is open for every open U) — do NOT rely solely on the epsilon-delta definition from analysis
  (c) Homeomorphism: construct the continuous bijection and prove its inverse is also continuous
- Connectedness and compactness proofs must be rigorous:
  (a) Connectedness: show that the space cannot be written as a union of two disjoint nonempty open sets, or use path-connectedness where appropriate
  (b) Compactness: use the open cover definition (every open cover has a finite subcover), or for metric spaces apply sequential compactness or the Heine-Borel theorem with justification
- Quotient spaces: define the equivalence relation explicitly, describe the quotient topology, and verify that the quotient map is continuous and (where applicable) open or closed
- Provide geometric intuition alongside formal proofs: draw on examples from R^n, describe what the spaces "look like," use the rubber-sheet geometry metaphor where helpful, but always anchor intuition in the formal definitions
- Fundamental group: compute pi_1 for standard spaces (circle, torus, sphere, projective plane) using covering space theory or van Kampen's theorem, showing the key steps of the computation`,
};

const SUBDISCIPLINE_QUIZ_INSTRUCTIONS = {
  calculus: `
- Include computation problems requiring multi-step evaluation of limits, derivatives, or integrals (the student must show work, not just state an answer)
- Present "Evaluate the integral..." or "Find the derivative..." problems that require choosing the correct technique and executing it fully
- Include convergence/divergence determination questions where the student must select and apply the appropriate test
- Include "True or False" questions about theorems with counterexample requirements: e.g., "True or False: If f is continuous on (a,b), then f attains its maximum on (a,b). If false, provide a counterexample."
- Test theorem conditions: "Under what additional hypothesis does [theorem] hold?" or "Give an example where [theorem] fails because [condition] is not satisfied"`,

  linear_algebra: `
- Include matrix computation problems: "Find the eigenvalues and eigenvectors of A = [...]" requiring full characteristic polynomial and null space computation
- Present "Prove that..." questions about vector spaces: e.g., "Prove that W = {(x,y,z) : x + 2y - z = 0} is a subspace of R^3"
- Include questions testing geometric understanding: "Describe geometrically the effect of the linear transformation T(x) = Ax where A = [...]"
- Ask questions about the relationship between rank, nullity, and dimension: "If A is a 4x6 matrix with rank 3, what is the dimension of the null space?"
- Include "True or False" questions about matrix properties with counterexample requirements: "True or False: If A^2 = 0, then A = 0"`,

  abstract_algebra: `
- Include "Prove that..." questions: "Prove that (Z/nZ, +) is a group" or "Show that the kernel of a homomorphism is a normal subgroup"
- Present questions requiring explicit axiom verification: "Is the set S = {...} under operation * a group? Verify each axiom."
- Include Lagrange's theorem application problems: "If |G| = 12, what are the possible orders of subgroups of G?"
- Ask for counterexamples to false statements: "Give an example of a ring that is not commutative" or "Find a subgroup of S_3 that is not normal"
- Include isomorphism identification problems: "Classify all groups of order 6 up to isomorphism and justify your answer"`,

  statistics: `
- Include full hypothesis testing problems: present a dataset or summary statistics and require the student to carry out the complete testing procedure (state hypotheses, choose test, compute statistic, find critical value/p-value, decide, interpret)
- Present probability computation problems requiring multi-step derivation using Bayes' theorem, law of total probability, or combinatorial arguments
- Include confidence interval construction problems with all steps
- Ask "True or False" questions about statistical concepts with justification: "True or False: A 95% confidence interval means there is a 95% probability that the true parameter lies in the interval. Explain your answer."
- Include questions testing understanding of assumptions: "What assumption of the t-test is violated in this scenario? How does this affect the validity of the result?"`,

  discrete_math: `
- Include "Prove by induction that..." problems requiring complete base case, inductive hypothesis, and inductive step
- Present graph algorithm trace problems: "Apply Dijkstra's algorithm to the following graph starting from vertex A. Show the state of the distance table after each iteration."
- Include combinatorial identity proof problems: "Prove that C(n,k) = C(n-1,k-1) + C(n-1,k) using a combinatorial argument"
- Ask recurrence relation problems: "Solve the recurrence T(n) = 2T(n-1) + 1 with T(0) = 0, showing all steps"
- Include logic and proof strategy questions: "Prove that the square root of 2 is irrational" or "Prove by contradiction that there are infinitely many primes"`,

  topology: `
- Include "Prove that..." questions about topological properties: "Prove that [0,1] is compact using the open cover definition"
- Present questions requiring construction of explicit examples or counterexamples: "Give an example of a space that is connected but not path-connected"
- Include homeomorphism identification problems: "Are the spaces X and Y homeomorphic? Prove or disprove."
- Ask questions about continuity using the topological definition: "Prove that f: R -> R defined by f(x) = x^2 is continuous using the preimage definition"
- Include fundamental group computation problems: "Compute the fundamental group of the torus T^2 using van Kampen's theorem"`,
};

const SUBDISCIPLINE_TUTOR_INSTRUCTIONS = {
  calculus: `
- When evaluating limits, derivatives, or integrals, show EVERY algebraic step — never say "simplifying, we get..." without showing the simplification
- For integration problems, always start by identifying the technique: "This integral has the form integral of f(g(x))g'(x)dx, so we use u-substitution with u = g(x)"
- After computing a derivative, verify by checking dimensional consistency or by computing a specific value and comparing with finite differences
- After computing an integral, verify by differentiating the result: "Let's check: d/dx [result] = ... = original integrand. Confirmed."
- Provide geometric intuition: "The derivative at this point represents the slope of the tangent line, which we can visualize as..."`,

  linear_algebra: `
- When performing matrix operations, show each step of row reduction and label the operation: "R2 <- R2 - 3*R1"
- Always connect algebraic results to geometric meaning: "The eigenvalue 2 means vectors in this direction are scaled by a factor of 2 under the transformation"
- When discussing abstract vector spaces, ground the concept with a concrete example in R^n first, then generalize
- Challenge the student to verify results: "We found the eigenvector v = (1, -1). Let's check: Av = ... = 3*(1,-1) = 3v. Correct."
- Prompt the student: "What does the determinant tell us geometrically about this transformation?"`,

  abstract_algebra: `
- When introducing a new algebraic structure, always start by verifying axioms explicitly on a small concrete example before discussing the general theory
- Walk through proofs step by step: "We need to show phi(ab) = phi(a)phi(b). Start with the left side: phi(ab) = ..."
- Prompt the student to test their understanding: "Is this set a subgroup? What do you need to check?" and guide them through the verification
- When a student makes an error in a proof, identify the exact logical gap: "Your argument assumes that ab = ba, but we haven't established that the group is abelian"
- Use Cayley tables for small groups to build intuition before moving to abstract arguments`,

  statistics: `
- When working through hypothesis tests, enforce the structured procedure: "Let's start by stating H0 and H1 clearly. What are we testing?"
- Show every arithmetic step in test statistic computation: "z = (x_bar - mu_0) / (sigma / sqrt(n)) = (52.3 - 50) / (4.1 / sqrt(25)) = 2.3 / 0.82 = 2.80"
- Always interpret results in context: "We reject H0. This means we have sufficient evidence at the 5% level to conclude that the mean weight exceeds 50 grams."
- Challenge common misconceptions: "Remember, failing to reject H0 does NOT mean H0 is true — it means we don't have enough evidence to reject it"
- For probability problems, prompt the student to define the sample space first: "Before we compute anything, let's define our sample space and the events clearly"`,

  discrete_math: `
- For induction proofs, insist on structure: "Let's start with the base case. What happens when n = 1?"
- When tracing graph algorithms, maintain a clear state table: "After visiting vertex B, our visited set is {A, B}, and the priority queue contains..."
- For combinatorial arguments, always ask: "What are we counting? Can we count it a different way?"
- When solving recurrence relations, verify the solution by substituting back: "We found T(n) = 2^n - 1. Let's check: T(3) = 2^3 - 1 = 7. From the recurrence: T(3) = 2*T(2) + 1 = 2*3 + 1 = 7. Confirmed."
- Encourage multiple proof strategies: "We proved this by induction. Could we also prove it directly? Which approach do you find more illuminating?"`,

  topology: `
- When introducing topological concepts, always start with familiar metric space examples before moving to general topological spaces
- Walk through proofs carefully: "We need to show f^{-1}(U) is open for every open U. Let's take an arbitrary open set U in the codomain and trace back..."
- Build geometric intuition: "Think of this quotient space as taking a square and gluing opposite edges — what shape do you get?"
- Challenge the student to construct examples: "Can you find a set that is open in one topology on R but not in another?"
- When computing fundamental groups, draw the covering space and explain the correspondence between loops and deck transformations`,
};

// ─── Builder Functions ──────────────────────────────────────────

/**
 * Build mathematics-specific depth instructions for module generation.
 *
 * This replaces the generic "200-400 words" content instruction with a rigorous
 * framework demanding formal definitions, theorem statements with proofs,
 * step-by-step derivations, and worked examples with full computation —
 * everything a mathematics student needs for deep understanding and exam prep.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['calculus', 'linear_algebra']
 * @returns {string} Prompt section to inject into module generation templates
 */
function buildMathematicsDepthSection(subdisciplines = []) {
  // ── Base depth instructions (always included for any mathematics content) ──
  let section = `
MATHEMATICS MODULE DEPTH — CRITICAL INSTRUCTIONS (OVERRIDES DEFAULT WORD COUNT):

TARGET LENGTH: Each module MUST contain 600-1200 words of substantive mathematical content. The generic "200-400 words" instruction does NOT apply to mathematics modules. Mathematics students need rigorous, proof-driven, computation-heavy material — not surface-level summaries.

MANDATORY ELEMENTS FOR EVERY MODULE:
1. FORMAL DEFINITIONS: State every definition precisely using correct mathematical notation and quantifiers. A definition must include:
   - The object being defined and its type (set, function, property, structure)
   - ALL conditions and quantifiers (for all, there exists) stated explicitly
   - The domain and codomain for any functions or maps
   - Do NOT use vague phrases like "roughly speaking" or "intuitively" in place of a definition — provide the formal definition FIRST, then add intuition afterward

2. THEOREM STATEMENTS WITH PROOFS: For each theorem, lemma, or proposition:
   - State the theorem precisely with all hypotheses and the conclusion clearly separated
   - Provide a complete proof OR a detailed proof sketch that identifies the key ideas, critical steps, and proof technique used
   - Name the proof technique explicitly (direct proof, proof by contradiction, proof by contrapositive, proof by induction, construction, counting argument, diagonalization, etc.)
   - Highlight where each hypothesis of the theorem is used in the proof — if a hypothesis is not used, explain why it is still necessary by giving a counterexample when it fails
   - For well-known theorems (e.g., Fundamental Theorem of Calculus, Cayley-Hamilton, Central Limit Theorem): if the proof is too long, provide a proof sketch with the key insight and reference the full proof

3. STEP-BY-STEP DERIVATIONS: Every derivation must show complete algebraic work:
   - Write out each step on its own line with clear equals signs or implication arrows
   - Label the technique used at each step (e.g., "by the chain rule," "substituting u = x^2," "by the inductive hypothesis")
   - NEVER skip steps or write "it can be shown that..." — show it
   - When simplifying expressions, show the intermediate algebra: do not jump from (x+1)^2 - 1 to x^2 + 2x without showing the expansion

4. WORKED EXAMPLES WITH FULL COMPUTATION: Every module must include at least one fully worked example:
   - State the problem clearly
   - Show the complete solution with every computational step
   - Verify the answer where possible (substitute back, check boundary conditions, verify special cases)
   - Discuss what would change if a parameter or condition were different

5. VISUAL AND GEOMETRIC INTUITION: Where applicable, describe the geometric meaning of mathematical objects and results:
   - Describe graphs, surfaces, regions, transformations in words (e.g., "The level curves of f(x,y) = x^2 + y^2 are concentric circles centered at the origin")
   - Connect algebraic manipulation to geometric action (e.g., "Multiplying by the rotation matrix R(theta) rotates every vector by angle theta counterclockwise")
   - Use concrete numerical examples to illustrate abstract concepts
   - Always anchor geometric intuition in the formal definition — intuition supplements rigour, it does not replace it

6. STRUCTURE: Organise each module following this framework:
   - **Definition**: Formal statement of the concept
   - **Theorem Statement**: Precise statement with all hypotheses
   - **Proof / Derivation**: Complete proof or detailed sketch
   - **Worked Example**: Fully computed example demonstrating the concept
   - **Exercises**: 2-3 practice problems of increasing difficulty with brief hints
   - **Common Mistakes**: Identify 2-3 errors students frequently make (e.g., forgetting to check convergence before term-by-term differentiation, dividing by a quantity that could be zero, confusing necessary and sufficient conditions)
   Use markdown headings (##, ###) to separate these sections clearly.

7. MATHEMATICAL NOTATION: Use proper notation throughout:
   - Use LaTeX-style notation where the rendering supports it, otherwise use clear plaintext conventions (e.g., x^2 for x squared, sqrt(x) for square root, integral from a to b of f(x) dx)
   - Define all notation before first use — never introduce a symbol without stating what it represents
   - Be consistent: if you use "f" for a function in one place, do not switch to "g" for the same function later

8. ACCURACY: NEVER fabricate theorems, proofs, or computational results. If a derivation is complex, show the correct steps even if lengthy. A wrong proof is worse than no proof. Double-check all arithmetic in worked examples.`;

  // ── Subdiscipline-specific instructions ──
  const activeSubdisciplines = subdisciplines.filter(
    (sub) => SUBDISCIPLINE_MODULE_INSTRUCTIONS[sub]
  );

  if (activeSubdisciplines.length > 0) {
    section += '\n\nSUBDISCIPLINE-SPECIFIC REQUIREMENTS:';
    for (const sub of activeSubdisciplines) {
      section += SUBDISCIPLINE_MODULE_INSTRUCTIONS[sub];
    }
  }

  return section;
}

/**
 * Build mathematics-specific depth instructions for quiz and question generation.
 *
 * Ensures quizzes test actual computation, proof construction, and deep
 * understanding of theorem conditions — not mere definition recall —
 * with multi-step problems, proof questions, and counterexample requirements
 * that mirror mathematics exams.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['calculus', 'linear_algebra']
 * @returns {string} Prompt section to inject into quiz generation templates
 */
function buildMathematicsQuizDepthSection(subdisciplines = []) {
  let section = `
MATHEMATICS QUIZ DEPTH — CRITICAL INSTRUCTIONS:

QUESTION DESIGN PRINCIPLES:
1. COMPUTATION OVER RECALL: At least 60% of questions must require actual mathematical computation or proof, not just stating a definition or theorem name. Present a problem and require the student to work through the solution showing all steps.

2. MULTI-STEP COMPUTATION PROBLEMS: Include problems that require chaining multiple techniques:
   - "Evaluate the integral of [expression] dx" requiring substitution followed by partial fractions
   - "Find the eigenvalues and corresponding eigenspaces of the matrix A = [...]"
   - "Compute P(A|B) given the following information..." requiring Bayes' theorem with total probability expansion
   - Solutions must show every intermediate step — do not skip from problem to answer

3. PROOF AND DERIVATION QUESTIONS: Include questions that require mathematical reasoning:
   - "Prove that..." or "Show that..." questions requiring a complete logical argument
   - "Derive the formula for..." questions requiring step-by-step construction
   - "Give a direct proof / proof by induction / proof by contradiction that..."
   - Each proof question's solution must include the complete proof with every logical step

4. TRUE/FALSE WITH COUNTEREXAMPLE REQUIREMENTS: Include True/False questions where:
   - If the statement is false, the student MUST provide a specific counterexample (not just say "false")
   - The counterexample must be concrete: specific numbers, specific functions, specific matrices — not vague descriptions
   - Design statements that test subtle points: e.g., "Every continuous function is differentiable" (False — |x| at x=0)
   - Include statements that are true but non-obvious, requiring the student to justify why

5. THEOREM CONDITION QUESTIONS: Include questions that test understanding of when theorems apply:
   - "Under what conditions does [theorem] guarantee [conclusion]?"
   - "Give an example where [theorem] does NOT apply because [specific hypothesis] fails"
   - "Which of the following functions satisfies the hypotheses of the Mean Value Theorem on [a,b]?"
   - "The Ratio Test is inconclusive for this series. Which other test should be applied, and why?"

6. MCQ DISTRACTOR QUALITY: For multiple-choice questions, distractors (wrong answers) MUST be:
   - Common computational errors (sign mistakes, off-by-one errors, forgetting a constant of integration, dividing by zero)
   - Results of applying the wrong technique (e.g., using the ratio test conclusion when the test is actually inconclusive)
   - Partially correct answers that miss a case or a condition
   - Never include obviously absurd options — every distractor should be a plausible wrong answer

7. SOLUTION DEPTH: Every question's solution/explanation must:
   - Show the complete computation or proof, step by step
   - Explain why each incorrect option is wrong, identifying the specific error it represents
   - Verify the final answer (by substitution, dimensional analysis, or special case check)
   - Note any generalizations or connections to related results

8. DIFFICULTY PROGRESSION: Order questions from foundational to advanced:
   - Start with direct computation (evaluate, compute, simplify)
   - Progress to application (apply theorem, choose technique, set up problem)
   - End with proof and analysis (prove, show, characterize, determine when)`;

  // ── Subdiscipline-specific quiz instructions ──
  const activeSubdisciplines = subdisciplines.filter(
    (sub) => SUBDISCIPLINE_QUIZ_INSTRUCTIONS[sub]
  );

  if (activeSubdisciplines.length > 0) {
    section += '\n\nSUBDISCIPLINE-SPECIFIC QUIZ REQUIREMENTS:';
    for (const sub of activeSubdisciplines) {
      section += SUBDISCIPLINE_QUIZ_INSTRUCTIONS[sub];
    }
  }

  return section;
}

/**
 * Build mathematics-specific depth instructions for tutor chat interactions.
 *
 * Ensures the AI tutor always shows full derivations, explains each algebraic
 * step, provides geometric intuition, verifies answers by substitution, and
 * guides the student through mathematical reasoning — not just handing them
 * the answer.
 *
 * @param {string[]} subdisciplines - Detected subdisciplines, e.g. ['calculus', 'linear_algebra']
 * @returns {string} Prompt section to inject into tutor chat templates
 */
function buildMathematicsTutorDepthSection(subdisciplines = []) {
  let section = `
MATHEMATICS TUTOR DEPTH — CRITICAL INSTRUCTIONS:

You are tutoring a mathematics student. Mathematical tutoring demands rigour, complete derivations, and step-by-step reasoning that generic tutoring does not. Follow these rules:

1. ALWAYS SHOW FULL DERIVATIONS: Every algebraic manipulation must be shown step by step:
   - Write out each line of computation with clear equals signs or implication arrows
   - Label the operation performed at each step: "Applying the product rule...", "Factoring out x^2...", "By the inductive hypothesis..."
   - NEVER say "after simplification, we get..." or "it follows that..." without showing the intermediate work
   - If a computation is long, break it into clearly labeled sub-problems rather than skipping steps

2. EXPLAIN EACH ALGEBRAIC STEP: When performing manipulations, state WHY each step is valid:
   - "We can factor (x^2 - 1) as (x-1)(x+1) because this is a difference of squares"
   - "We multiply both sides by (x-2), which is valid because x != 2 by our assumption"
   - "We interchange the limit and the integral by the Dominated Convergence Theorem, which applies because..."
   - Identify potential pitfalls: "Be careful — we cannot divide both sides by x here because x might be zero"

3. USE GEOMETRIC INTUITION: Connect algebraic results to geometric or visual understanding:
   - "The gradient vector points in the direction of steepest ascent — so at the point (1,2), the function increases most rapidly in the direction..."
   - "The eigenvalue 0 means the transformation collapses some directions to zero — the null space tells us which directions are collapsed"
   - "This integral represents the area under the curve between x = a and x = b — let's think about whether we expect a positive or negative answer"
   - Use concrete numerical examples to build intuition before stating the general principle

4. VERIFY ANSWERS BY SUBSTITUTION: After arriving at a result, always verify:
   - Derivatives: differentiate the antiderivative to recover the integrand
   - Equations: substitute the solution back into the original equation
   - Linear algebra: multiply Av and compare to lambda*v for eigenvalue problems
   - Proofs: check the result on specific small cases (e.g., n=1,2,3 for induction results)
   - Say explicitly: "Let's verify: substituting x = 3 back into the original equation gives... which equals... Confirmed."

5. GUIDE, DON'T JUST SOLVE: When a student asks for help, lead them through the reasoning:
   - Start by identifying the problem type: "This is an optimization problem, so we need to find critical points"
   - Ask guiding questions: "What technique do you think applies here? What form does this integral have?"
   - If the student is stuck, give a hint before giving the full solution: "Try substituting u = sin(x) and see what happens to the integral"
   - After solving, ask the student to reflect: "Can you see why we chose u-substitution instead of integration by parts here?"

6. ADDRESS COMMON MISCONCEPTIONS: Proactively identify and correct frequent errors:
   - "A common mistake here is to write d/dx[f(g(x))] = f'(g(x)), forgetting to multiply by g'(x) — the chain rule"
   - "Many students confuse 'if P then Q' with 'if Q then P' — remember, the converse is NOT logically equivalent"
   - "Be careful: the determinant of a product is the product of the determinants, det(AB) = det(A)det(B), but the determinant of a sum is NOT the sum of the determinants"
   - When a student makes an error, identify the exact step where the mistake occurred and explain the correct reasoning

7. ENCOURAGE MULTIPLE APPROACHES: When a problem can be solved in more than one way:
   - Show the primary method in full detail
   - Mention the alternative approach: "This could also be solved using [alternative method]. Would you like to see that approach?"
   - Compare the approaches: "The substitution method was faster here, but integration by parts would also work — it just involves more steps"
   - Help the student develop problem-solving judgment: "For integrals involving sqrt(a^2 - x^2), trigonometric substitution is usually the most efficient approach"

8. NOTATION AND PRECISION: Maintain mathematical rigour in all communication:
   - Use correct mathematical notation consistently
   - Distinguish between equals (=), approximately equals, implies (=>), and if-and-only-if (<=>)
   - Be precise about quantifiers: "for all x > 0" vs. "there exists an x > 0"
   - When a student uses imprecise language, gently correct it: "When you say 'the function goes to infinity,' let's be precise — do you mean the limit as x approaches 0 from the right is positive infinity?"`;

  // ── Subdiscipline-specific tutor instructions ──
  const activeSubdisciplines = subdisciplines.filter(
    (sub) => SUBDISCIPLINE_TUTOR_INSTRUCTIONS[sub]
  );

  if (activeSubdisciplines.length > 0) {
    section += '\n\nSUBDISCIPLINE-SPECIFIC TUTOR GUIDANCE:';
    for (const sub of activeSubdisciplines) {
      section += SUBDISCIPLINE_TUTOR_INSTRUCTIONS[sub];
    }
  }

  return section;
}

// ─── Exports ────────────────────────────────────────────────────

module.exports = {
  buildMathematicsDepthSection,
  buildMathematicsQuizDepthSection,
  buildMathematicsTutorDepthSection,
};
