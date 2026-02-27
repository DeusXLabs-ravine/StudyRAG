/**
 * Computer Science-specific depth instructions for StudyRAG content generation.
 *
 * These functions produce rich, discipline-aware prompt sections that get
 * injected into module generation, quiz generation, flashcard generation,
 * and tutor chat prompts.  The goal is to produce THOROUGH, RIGOROUS
 * computer science content — formal definitions, algorithm analysis, worked
 * trace-throughs, complexity proofs, and code examples — rather than the
 * surface-level summaries that generic prompts produce.
 *
 * Consumed by:  backend/src/utils/prompts/depthRouter.js
 * Subdisciplines detected by:  backend/src/utils/subjectDetector.js
 *   Possible values: algorithms, operating_systems, databases, networking, ai_ml, software_engineering
 */

// ─── Subdiscipline-specific blocks for module content ────────────────────────

/**
 * Returns additional depth instructions specific to detected subdisciplines.
 * Each block describes the content expectations unique to that branch of
 * computer science so the LLM produces domain-appropriate analysis,
 * derivations, and examples.
 */
function _subdisciplineModuleBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('algorithms')) {
    blocks.push(`
ALGORITHMS & DATA STRUCTURES — additional depth requirements:
- Big-O analysis: for every algorithm presented, derive the time complexity step-by-step.
  Show the recurrence relation (if recursive), solve it using the Master Theorem, substitution
  method, or recursion tree, and state the final asymptotic bound in Big-O, Big-Omega, and
  Big-Theta where meaningful.  Also state space complexity.
- Correctness proofs: for non-trivial algorithms, provide a correctness argument —
  loop invariants (initialization, maintenance, termination) for iterative algorithms,
  or structural induction for recursive ones.
- Step-by-step trace-throughs: walk through the algorithm on a concrete input of moderate
  size (5-10 elements).  Show the state of all relevant data structures (arrays, pointers,
  heaps, stacks, queues) at each iteration or recursive call.
- Space/time trade-offs: explicitly discuss the trade-off between time complexity and space
  complexity (e.g., memoization uses O(n) space to reduce exponential time to polynomial;
  in-place sorting saves space but may sacrifice stability).
- Common pitfalls:
  a) Off-by-one errors in loop bounds and array indexing
  b) Confusing best-case, average-case, and worst-case complexity
  c) Incorrect base cases in recursion
  d) Choosing the wrong data structure (e.g., linked list for random access, array for frequent insertions)
  e) Misapplying greedy strategies to problems that require dynamic programming
- Compare related algorithms: when presenting an algorithm, contrast it with alternatives
  (e.g., merge sort vs quick sort vs heap sort — stability, cache behavior, worst-case guarantees).`);
  }

  if (subdisciplines.includes('operating_systems')) {
    blocks.push(`
OPERATING SYSTEMS — additional depth requirements:
- Process state diagrams: describe process state transitions (new -> ready -> running ->
  waiting -> terminated) and explain each transition trigger (interrupt, I/O request,
  scheduling decision, process creation/exit).
- Memory layout illustrations (described textually): describe the virtual address space
  layout — text segment, data segment, BSS, heap (grows upward), stack (grows downward),
  kernel space.  Explain page tables, TLBs, and address translation step-by-step.
- Scheduling algorithms with worked examples: for each scheduler (FCFS, SJF, SRTF,
  Round Robin, Priority, Multilevel Queue/Feedback), provide:
  a) A concrete set of processes with arrival times, burst times, and priorities
  b) A Gantt chart (described textually)
  c) Calculation of average waiting time, turnaround time, and response time
  d) Discussion of starvation risk and how aging addresses it
- Race condition scenarios: present concrete interleaving examples showing how
  unsynchronized access to shared resources causes data corruption.  Show the
  correct solution using mutexes, semaphores, or monitors, and explain why it
  works (mutual exclusion, progress, bounded waiting).
- Deadlock: cover the four necessary conditions (mutual exclusion, hold and wait,
  no preemption, circular wait), detection (resource allocation graph), prevention
  (negating each condition), avoidance (Banker's algorithm with worked example),
  and recovery strategies.
- File system internals: inode structure, directory implementation, free space
  management (bitmap vs linked list), journaling, and caching (buffer cache, page cache).`);
  }

  if (subdisciplines.includes('databases')) {
    blocks.push(`
DATABASES — additional depth requirements:
- Normalization steps (1NF -> 2NF -> 3NF -> BCNF): for each normal form:
  a) State the formal definition and the type of dependency violation it eliminates
  b) Identify functional dependencies in the given relation
  c) Show the decomposition step-by-step with the resulting relations
  d) Verify that the decomposition is lossless-join and dependency-preserving
  e) Explain when to stop normalizing (practical trade-offs with denormalization)
- Query execution plans: explain how a DBMS processes a SQL query —
  parsing -> logical plan (relational algebra) -> optimization (cost-based,
  rule-based) -> physical plan (join algorithms: nested loop, sort-merge,
  hash join; access methods: sequential scan, index scan, index-only scan).
  Discuss how the optimizer estimates cardinality and cost.
- Transaction isolation examples: for each isolation level (READ UNCOMMITTED,
  READ COMMITTED, REPEATABLE READ, SERIALIZABLE), provide a concrete
  interleaving of two transactions showing what anomalies (dirty read,
  non-repeatable read, phantom read) can or cannot occur.  Explain MVCC
  (Multi-Version Concurrency Control) and how it avoids locking overhead.
- Index selection rationale: explain B+ tree structure, when to use clustered
  vs non-clustered indexes, composite index column ordering, covering indexes,
  and the cost-benefit analysis of indexing (faster reads vs slower writes,
  storage overhead).  Discuss hash indexes and when they outperform B+ trees.
- ACID properties: define each property (Atomicity, Consistency, Isolation,
  Durability), explain the mechanisms that guarantee each (undo/redo logs,
  write-ahead logging, checkpointing, two-phase locking, 2PC for distributed).`);
  }

  if (subdisciplines.includes('networking')) {
    blocks.push(`
NETWORKING — additional depth requirements:
- Protocol stack walkthrough: for each layer (Application, Transport, Network,
  Data Link, Physical), explain the role, key protocols, and the encapsulation
  process.  Show how a complete HTTP request traverses the stack from application
  data down to bits on the wire and back up on the receiving end.
- Packet flow analysis: trace a packet from source to destination through:
  a) DNS resolution (recursive/iterative query, caching, TTL)
  b) TCP three-way handshake (SYN, SYN-ACK, ACK with sequence numbers)
  c) Routing decisions (longest prefix match, routing table lookup)
  d) NAT translation (if applicable)
  e) ARP resolution at each hop
  f) Data transfer with TCP flow control (sliding window) and congestion control
     (slow start, congestion avoidance, fast retransmit, fast recovery)
- Header field explanations: for key protocols (IP, TCP, UDP, HTTP, DNS, ARP,
  Ethernet), identify the important header fields, their sizes, and their
  purpose.  Explain flags (e.g., TCP SYN/ACK/FIN/RST/PSH), TTL/hop limit,
  checksums, and fragmentation fields.
- Security implications: for each protocol or concept discussed, identify
  relevant security concerns:
  a) ARP spoofing and MITM attacks
  b) DNS poisoning and DNSSEC
  c) TCP SYN flood and SYN cookies
  d) TLS/SSL handshake, certificate validation, cipher suite negotiation
  e) Firewall rules, ACLs, and DMZ architecture
  f) Common application-layer attacks (SQL injection, XSS, CSRF) and defenses
- Subnetting and addressing: show worked examples of CIDR notation, subnet
  mask calculation, address range determination, and VLSM (Variable Length
  Subnet Masking).`);
  }

  if (subdisciplines.includes('ai_ml')) {
    blocks.push(`
AI / MACHINE LEARNING — additional depth requirements:
- Mathematical foundations: present the mathematical framework behind each
  algorithm.  Use proper notation — vectors (bold lowercase), matrices (bold
  uppercase), probability distributions, expectation, and gradient operators.
  Define every variable and symbol before using it.
- Loss functions: for each model, state the loss function explicitly:
  a) Mean Squared Error for regression: L = (1/n) * sum((y_i - y_hat_i)^2)
  b) Cross-entropy for classification: L = -sum(y_i * log(y_hat_i))
  c) Hinge loss for SVMs, KL divergence for VAEs, etc.
  Explain WHY each loss function is appropriate for its task (probabilistic
  interpretation, convexity properties, gradient behavior).
- Gradient computation: show the gradient derivation step-by-step for at least
  one key result (e.g., gradient of MSE w.r.t. weights in linear regression,
  backpropagation through a single layer).  Explain the chain rule application
  in backpropagation and how computational graphs facilitate automatic differentiation.
- Hyperparameter impact: for each model, discuss key hyperparameters and their
  effect on model behavior:
  a) Learning rate: too high (divergence), too low (slow convergence), schedules
  b) Regularization strength (lambda): bias-variance trade-off
  c) Network architecture: depth, width, activation functions
  d) Batch size: gradient noise, generalization, computational efficiency
  e) Number of trees/estimators in ensemble methods
- Overfitting/underfitting analysis: explain the bias-variance decomposition,
  show how to diagnose each from learning curves (training vs validation loss),
  and present remedies:
  a) Overfitting: regularization (L1/L2/dropout/early stopping), data augmentation,
     cross-validation, reducing model complexity
  b) Underfitting: increasing model capacity, feature engineering, reducing
     regularization, training longer
- Evaluation metrics: precision, recall, F1-score, AUC-ROC, confusion matrix
  interpretation — explain when each metric is appropriate and how class
  imbalance affects them.`);
  }

  if (subdisciplines.includes('software_engineering')) {
    blocks.push(`
SOFTWARE ENGINEERING — additional depth requirements:
- Design pattern applicability analysis: for each design pattern discussed:
  a) State the problem it solves (motivation/context)
  b) Describe the structure (participants and their relationships)
  c) Provide a concrete code example (in a widely-understood language such as
     Python or Java) with inline comments explaining each component
  d) Discuss when to use it and when NOT to use it (anti-patterns, over-engineering risks)
  e) Compare with related patterns (e.g., Strategy vs State, Factory Method vs Abstract Factory,
     Observer vs Pub/Sub)
- Trade-offs: for every architectural or design decision, explicitly state the trade-offs:
  a) Monolith vs microservices (complexity, deployment, latency, data consistency)
  b) SQL vs NoSQL (ACID vs BASE, schema flexibility, query power, scalability)
  c) Synchronous vs asynchronous communication (simplicity vs throughput)
  d) Inheritance vs composition (coupling, flexibility, code reuse)
- Code examples with explanation: provide readable, well-commented code
  snippets that illustrate the concept.  Follow the structure:
  1) State the problem
  2) Show a naive/incorrect approach and explain its flaws
  3) Show the improved approach and explain why it is better
  4) Discuss edge cases and error handling
- Software development lifecycle: cover requirements, design, implementation,
  testing (unit, integration, system, acceptance), deployment (CI/CD), and
  maintenance.  Discuss Agile vs Waterfall trade-offs, version control best
  practices, and code review standards.
- Testing strategies: unit testing (arrange-act-assert), mocking/stubbing,
  test coverage metrics, TDD vs BDD, integration testing, and property-based testing.
- SOLID principles: for each principle, provide a violation example and a
  corrected example, explaining how the principle improves maintainability.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for quiz content ──────────────────────────

function _subdisciplineQuizBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('algorithms')) {
    blocks.push(`
- Algorithms questions: include code tracing problems ("What does this function return
  when called with input [5, 3, 8, 1, 2]?"), complexity analysis questions ("What is the
  time complexity of the following nested loop structure?"), and algorithm selection
  questions ("Given a nearly-sorted array of 10 million elements, which sorting algorithm
  is most efficient and why?").  Distractors should reflect common errors such as
  confusing O(n log n) with O(n^2), off-by-one in loop analysis, and mistaking average-case
  for worst-case complexity.`);
  }

  if (subdisciplines.includes('operating_systems')) {
    blocks.push(`
- Operating systems questions: include scheduling calculation problems (compute average
  waiting time for a given set of processes under different algorithms), synchronization
  scenarios ("Given this sequence of P() and V() operations, can deadlock occur?"),
  memory management calculations (page table lookups, page fault rate with LRU/FIFO),
  and process state transition questions.  Distractors should capture mistakes like
  confusing preemptive vs non-preemptive scheduling, miscounting context switches, or
  misapplying Banker's algorithm.`);
  }

  if (subdisciplines.includes('databases')) {
    blocks.push(`
- Database questions: include SQL query writing ("Write a query to find the second-highest
  salary in each department"), query optimization ("Which index would improve this query's
  performance and why?"), normalization problems ("Identify the highest normal form of this
  relation and decompose it to BCNF"), and transaction isolation scenarios ("Under READ
  COMMITTED isolation, what value does Transaction B read?").  Distractors should include
  queries with subtle errors (missing GROUP BY, incorrect JOIN type, wrong aggregate function)
  and plausible but incorrect normal form identifications.`);
  }

  if (subdisciplines.includes('networking')) {
    blocks.push(`
- Networking questions: include protocol behavior questions ("During a TCP connection, host A
  sends a segment with SEQ=100 and 50 bytes of data. What ACK number should host B send?"),
  subnetting calculations ("Given 192.168.1.0/24, divide into 6 subnets — what are the valid
  host ranges?"), header field identification ("Which TCP flag is set to initiate a connection
  teardown?"), and security scenario analysis ("An attacker intercepts ARP replies on the LAN.
  What attack is this and how can it be mitigated?").  Distractors should include off-by-one
  errors in subnetting, confusion between TCP and UDP behavior, and misidentification of
  protocol layers.`);
  }

  if (subdisciplines.includes('ai_ml')) {
    blocks.push(`
- AI/ML questions: include mathematical problems ("Compute the gradient of the loss function
  L = (y - wx)^2 with respect to w"), model selection questions ("Given a dataset with 100
  samples and 10,000 features, which model is most appropriate and why?"), hyperparameter
  reasoning ("If validation loss is much higher than training loss, what should you adjust?"),
  and evaluation metric interpretation ("A model has 95% accuracy on a dataset where 95% of
  samples belong to class A. Is this model useful? Explain.").  Distractors should include
  common confusions between precision and recall, incorrect gradient derivations, and
  misinterpretation of bias-variance trade-off.`);
  }

  if (subdisciplines.includes('software_engineering')) {
    blocks.push(`
- Software engineering questions: include design pattern identification ("A system needs to
  notify multiple subsystems when an event occurs without coupling them. Which pattern applies?"),
  design trade-off questions ("What is the primary disadvantage of the Singleton pattern?"),
  code quality assessment ("What SOLID principle does this code violate and how would you fix
  it?"), and architectural reasoning ("When would you choose an event-driven architecture over
  a request-response architecture?").  Distractors should include commonly confused patterns
  (Strategy vs State, Decorator vs Proxy), incorrect SOLID principle attributions, and plausible
  but suboptimal architectural choices.`);
  }

  return blocks.join('\n');
}

// ─── Subdiscipline-specific blocks for tutor chat ────────────────────────────

function _subdisciplineTutorBlocks(subdisciplines) {
  const blocks = [];

  if (subdisciplines.includes('algorithms')) {
    blocks.push(`
- For algorithms topics: walk through each algorithm step-by-step with concrete inputs.
  Use a small example array or graph and show every iteration, comparison, swap, or recursive
  call.  After the trace-through, derive the complexity together: "We had n iterations in the
  outer loop, and for each we did at most n comparisons in the inner loop, giving O(n^2)."
  When a student confuses complexity classes, use concrete numbers: "O(n log n) for n=1,000,000
  is about 20 million operations; O(n^2) would be 1 trillion — that's the difference between
  20 seconds and 11 days."  Always encourage the student to think about edge cases: "What
  happens if the input is already sorted?  What if all elements are identical?"`);
  }

  if (subdisciplines.includes('operating_systems')) {
    blocks.push(`
- For operating systems topics: use concrete process tables and timelines to explain scheduling.
  When discussing synchronization, construct minimal interleaving scenarios that demonstrate the
  problem before showing the solution: "Thread A reads counter=5, then Thread B reads counter=5,
  both increment to 6, and we lost an update."  For memory management, walk through address
  translation step-by-step: "Virtual address 0x1A3F — page number = 0x1A (bits 12-15),
  offset = 0x3F (bits 0-11) — look up page 0x1A in the page table to find frame number..."
  Help students build intuition for why OS design decisions were made: "Why does the OS use
  virtual memory?  Not just to give more memory, but to provide isolation, simplify linking,
  and enable demand paging."`);
  }

  if (subdisciplines.includes('databases')) {
    blocks.push(`
- For database topics: when explaining normalization, start with a concrete denormalized table
  showing actual data rows, identify the anomalies (insertion, deletion, update), then decompose
  step by step.  For SQL problems, first ask the student to describe the result they want in
  plain English before writing the query.  When a query is incorrect, run through it mentally
  with sample data: "Let's trace this query row by row — what does the WHERE clause filter out?
  What does the JOIN produce?"  Encourage the student to think about performance: "This query
  works correctly, but it scans the entire table.  How could we make it faster?"`);
  }

  if (subdisciplines.includes('networking')) {
    blocks.push(`
- For networking topics: trace packet flows end-to-end with concrete IP addresses, port numbers,
  and sequence numbers.  Use the layered model as an organizing framework: "Let's start at the
  application layer — what does the HTTP request look like?  Now the transport layer wraps it
  in a TCP segment — what fields are added?  Now the network layer adds an IP header..."
  When discussing protocols, always relate back to the problem they solve: "TCP provides reliable
  delivery because UDP doesn't guarantee packets arrive, arrive in order, or arrive at all."
  For security topics, explain attacks from the attacker's perspective first, then the defense:
  "If I'm the attacker, what do I need to do to execute an ARP spoofing attack?  Now, how does
  dynamic ARP inspection prevent this?"`);
  }

  if (subdisciplines.includes('ai_ml')) {
    blocks.push(`
- For AI/ML topics: always ground explanations in the mathematics, but build intuition alongside
  the formulas.  When explaining gradient descent, draw the analogy: "Imagine you're blindfolded
  on a hilly landscape and want to find the lowest valley — you feel the slope under your feet
  and take a step downhill.  The learning rate is your step size."  Show computations explicitly:
  "Let's compute the gradient for this single training example: y=3, x=2, w=1.  Predicted: 2.
  Loss: (3-2)^2 = 1.  Gradient: dL/dw = 2*(y_hat - y)*x = 2*(2-3)*2 = -4.  Update: w = 1 - 0.1*(-4) = 1.4."
  When discussing overfitting, use concrete learning curves: "If training accuracy is 99% but
  validation accuracy is 60%, that's a 39-point gap — classic overfitting.  Let's discuss why
  and what to do about it."`);
  }

  if (subdisciplines.includes('software_engineering')) {
    blocks.push(`
- For software engineering topics: always use concrete code examples.  When explaining a design
  pattern, first show the problematic code that motivates the pattern, then refactor it using the
  pattern, and explain each change.  For debugging: teach a systematic approach — reproduce the
  bug, isolate the cause (binary search through the code using logging/breakpoints), identify the
  root cause (not just the symptom), fix it, and verify with a test.  Ask Socratic questions:
  "If we add a new payment method, how many files would we need to change?  If the answer is
  more than one, which design principle are we violating?"  Encourage the student to think about
  maintainability: "This code works today, but what happens when a new developer joins and needs
  to add a feature?  How long would it take them to understand this?"`);
  }

  return blocks.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build depth instructions for computer science module generation.
 *
 * This replaces the generic "200-400 words per module" instruction with a far
 * more demanding specification: 600-1200 words, formal definitions, algorithm
 * analysis, complexity proofs, worked trace-throughs, and code examples.
 *
 * @param {string[]} subdisciplines - e.g. ['algorithms', 'databases']
 * @returns {string} Prompt section to inject into the module generation prompt.
 */
function buildComputerScienceDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineModuleBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general computer science';

  return `
═══════════════════════════════════════════════════════════════════════
COMPUTER SCIENCE DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
These instructions OVERRIDE the default content-length and depth guidelines.
═══════════════════════════════════════════════════════════════════════

CONTENT LENGTH & RIGOUR:
- Each module MUST contain 600-1200 words of substantive technical content.
- Do NOT produce surface-level summaries.  Computer science students need formal definitions,
  algorithm analysis, complexity proofs, and worked examples they can study from — not
  bullet-point overviews.

MANDATORY ELEMENTS FOR EVERY COMPUTER SCIENCE CONCEPT COVERED:

a) CONCEPT INTRODUCTION
   Begin with a clear, intuitive explanation of what the concept is and WHY it matters.
   Motivate the topic with a real-world problem or use case before diving into formalism.

b) FORMAL DEFINITION
   Provide a precise, formal definition using standard CS notation:
   - For algorithms: input/output specification, preconditions, postconditions
   - For data structures: abstract data type (ADT) operations and their contracts
   - For complexity classes: formal set-theoretic definition where appropriate
   - For protocols: state machines or sequence diagrams described textually
   Use mathematical notation where appropriate (sets, functions, relations, Big-O).

c) ALGORITHM / PROOF / DERIVATION
   Present the core algorithm, proof, or derivation step-by-step:
   - Pseudocode or clean code in a widely-understood language (Python preferred)
   - For proofs: state the theorem, then prove it (by induction, contradiction, construction, etc.)
   - For derivations: show every significant intermediate step
   - Number the steps and explain the reasoning behind each one

d) WORKED EXAMPLE
   Walk through a complete example with concrete data:
   - Choose an input of moderate size (not trivially small, not overwhelmingly large)
   - Show the state of all relevant variables/data structures at each step
   - Use tables or structured text to track state changes across iterations
   - Highlight the key insight or "aha moment" of the algorithm

e) COMPLEXITY ANALYSIS
   For every algorithm or operation discussed:
   - Time complexity: best-case, average-case, worst-case (specify which is being stated)
   - Space complexity: auxiliary space vs total space
   - Show the derivation of the complexity bound, not just the final result
   - Compare with alternative approaches: "This runs in O(n log n) vs the naive O(n^2)"

f) COMMON PITFALLS & MISCONCEPTIONS
   Identify the mistakes students typically make:
   - Off-by-one errors, boundary conditions, null/empty input handling
   - Confusing similar concepts (e.g., process vs thread, stack vs heap, BFS vs DFS)
   - Performance traps (e.g., string concatenation in a loop, unnecessary deep copies)
   - Security vulnerabilities (e.g., buffer overflow, SQL injection, race conditions)

STRUCTURE FOR EACH MODULE:
Follow this pedagogical sequence:
  Concept -> Formal Definition -> Algorithm/Proof/Derivation -> Worked Example -> Complexity Analysis -> Common Pitfalls

This mirrors how computer science is taught in university courses and makes the material
suitable for exam revision and technical interview preparation.
${subBlocks}

CODE EXAMPLES:
- Use clean, readable code with meaningful variable names and inline comments.
- Prefer Python for general algorithms, SQL for database topics, and pseudocode for
  abstract concepts.
- Show both the correct implementation and common incorrect approaches where instructive.
- Include time and space complexity as comments on the function signature.

MATHEMATICAL NOTATION:
- Use inline LaTeX: \\( expression \\) for inline, \\[ expression \\] for display.
- Show intermediate steps in complexity derivations — do not skip from problem statement
  to final Big-O.
- Use standard CS notation: O(), Omega(), Theta(), log base 2 (default for CS), etc.
`;
}

/**
 * Build depth instructions for computer science quiz / question generation.
 *
 * Ensures questions test genuine problem-solving, code reasoning, algorithm
 * analysis, and design judgment — not surface-level recall.
 *
 * @param {string[]} subdisciplines - e.g. ['algorithms', 'operating_systems']
 * @returns {string} Prompt section to inject into quiz generation prompts.
 */
function buildComputerScienceQuizDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineQuizBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general computer science';

  return `
═══════════════════════════════════════════════════════════════════════
COMPUTER SCIENCE QUIZ DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

QUESTION PHILOSOPHY:
Computer science exams and technical interviews test whether a student can REASON ABOUT
CODE AND SYSTEMS, not just recall definitions.  The questions you generate must reflect
this reality.

MANDATORY QUESTION TYPES — include a mix of all of the following:

1. CODE TRACING QUESTIONS (at least 25% of questions)
   - Present a short code snippet (5-15 lines) and ask "What does this code output when
     called with input X?"
   - The code should contain a non-obvious aspect: a subtle loop condition, recursion,
     pointer/reference behavior, short-circuit evaluation, or operator precedence issue.
   - Include the complete code — do not rely on external context.
   - Distractors should represent outputs from common misreadings (e.g., off-by-one,
     wrong variable scope, incorrect operator precedence).

2. COMPLEXITY ANALYSIS QUESTIONS (at least 20% of questions)
   - Present a code snippet or algorithm description and ask for its time/space complexity.
   - Include nested loops, recursive functions, and amortized operations.
   - Distractors should include adjacent complexity classes (e.g., O(n) vs O(n log n) vs O(n^2))
     and common mistakes (e.g., forgetting logarithmic factors, miscounting loop iterations).
   - At least one question should require solving a recurrence relation.

3. ALGORITHM SELECTION QUESTIONS (at least 15% of questions)
   - Present a problem with specific constraints (data size, memory limit, sorted/unsorted,
     online/offline) and ask which algorithm or data structure is most appropriate.
   - Example: "You need to find the kth largest element in an unsorted array of 10 million
     integers with O(1) extra space.  Which approach is best?"
   - Distractors should be algorithms that would work but are suboptimal for the given constraints.

4. DESIGN TRADE-OFF QUESTIONS (at least 15% of questions)
   - Present a system design or architectural decision and ask the student to evaluate trade-offs.
   - Example: "A web application receives 10,000 requests/second.  Compare using a relational
     database with a key-value store for session management."
   - All options should be plausible — the question tests judgment, not absolute right/wrong.

5. BUG IDENTIFICATION QUESTIONS (at least 10% of questions)
   - Present code with a subtle bug and ask the student to identify it.
   - Common bug types: off-by-one, null pointer, race condition, integer overflow,
     infinite loop, incorrect base case, wrong comparison operator.
   - Distractors should include lines that look suspicious but are actually correct.

6. CONCEPTUAL REASONING QUESTIONS (at least 15% of questions)
   - Test understanding of WHY, not just WHAT:
     "Why does a hash table have O(1) average-case lookup but O(n) worst-case?"
     "Why is quicksort generally faster than merge sort in practice despite the same
     average-case complexity?"
   - These questions should not be answerable by memorization alone.

MCQ DISTRACTOR DESIGN:
- Distractors MUST represent common student errors, not random answers:
  a) Off-by-one in complexity analysis (O(n) instead of O(n-1) simplified to O(n) — but
     O(n^2) instead of O(n log n) is a real mistake)
  b) Confusing average-case with worst-case
  c) Output from a common code misreading
  d) A correct algorithm that is suboptimal for the given constraints
  e) A correct statement about a different but related concept
- Never include obviously absurd distractors.

EXPLANATION QUALITY:
- Every answer explanation must show the full reasoning — not just "A is correct."
- For code tracing: show the execution trace step by step.
- For complexity: show the derivation.
- For algorithm selection: explain why the correct choice is better AND why each alternative
  is worse for the given constraints.
- Identify the specific error that would lead to each wrong answer choice.
${subBlocks}
`;
}

/**
 * Build depth instructions for the computer science tutor chat persona.
 *
 * Guides the tutor to explain with algorithmic rigour, concrete examples,
 * step-by-step trace-throughs, complexity analysis, and connections to
 * real-world software systems.
 *
 * @param {string[]} subdisciplines - e.g. ['ai_ml', 'software_engineering']
 * @returns {string} Prompt section to inject into tutor chat prompts.
 */
function buildComputerScienceTutorDepthSection(subdisciplines) {
  const subBlocks = _subdisciplineTutorBlocks(subdisciplines);
  const activeSubs = subdisciplines.length > 0
    ? subdisciplines.join(', ')
    : 'general computer science';

  return `
═══════════════════════════════════════════════════════════════════════
COMPUTER SCIENCE TUTOR DEPTH INSTRUCTIONS  (detected subdisciplines: ${activeSubs})
═══════════════════════════════════════════════════════════════════════

You are tutoring a computer science student.  CS demands both formal reasoning and
practical implementation skills.  Your explanations must satisfy both requirements.

WHEN EXPLAINING A CONCEPT:
1. Walk through algorithms STEP BY STEP with concrete inputs.
   - Do not just state "merge sort divides the array and merges."  Instead:
     "Let's sort [38, 27, 43, 3, 9, 82, 10].  First split: [38, 27, 43] and [3, 9, 82, 10].
     Split again: [38] and [27, 43]..."
   - Show the state of ALL relevant data structures at each step.
   - Use tables, indented text, or numbered steps to make the trace easy to follow.
   - After the trace, ask: "Do you see the pattern?  Can you predict what happens next?"

2. Show COMPLEXITY DERIVATIONS, not just final results.
   - Do not say "merge sort is O(n log n)."  Instead:
     "At each level of recursion, we do O(n) work for merging.  How many levels are there?
     We halve the array each time, so log2(n) levels.  Total: O(n) * O(log n) = O(n log n)."
   - For recurrences, show the method: "T(n) = 2T(n/2) + O(n).  By the Master Theorem,
     a=2, b=2, f(n)=n.  n^(log_b(a)) = n^1 = n.  Since f(n) = Theta(n^(log_b(a))),
     we're in Case 2: T(n) = Theta(n log n)."
   - Always compare: "This O(n log n) is better than the O(n^2) of bubble/insertion/selection
     sort, but worse than O(n) counting sort when the range is small."

3. Use CONCRETE CODE EXAMPLES to illustrate concepts.
   - Provide clean, runnable code (Python preferred for its readability).
   - Add comments explaining the key lines — not obvious ones.
   - Show both the correct approach and a common incorrect approach:
     "Here's a correct binary search.  Now here's a version with a common bug — can you
     spot the difference?  Hint: look at the mid calculation."
   - Encourage the student to mentally execute the code: "What does line 5 do when i=3?"

4. For DEBUGGING: teach a systematic approach.
   - Do not just point out the bug.  Guide the student through the debugging process:
     a) "First, let's reproduce the issue with a minimal input."
     b) "Now, let's add a print statement / trace the variables at each step."
     c) "Where does the actual output first diverge from the expected output?"
     d) "That tells us the bug is between line X and line Y.  Let's examine that section."
   - Teach the student to use invariants: "At this point in the loop, what should be true?
     Is it actually true?  If not, when did it break?"

WHEN A STUDENT GETS A WRONG ANSWER:
- IDENTIFY THE SPECIFIC ERROR.  Do not simply say "that's wrong."
- Common CS errors to diagnose:
  a) Off-by-one error (loop bounds, array indexing, fence-post problem)
  b) Confusing similar concepts (stack vs queue, BFS vs DFS, process vs thread)
  c) Wrong complexity analysis (missing a logarithmic factor, miscounting nested loops)
  d) Logic error in code (wrong boolean operator, incorrect base case, missing edge case)
  e) Misunderstanding of a data structure's behavior (hash collision handling, tree balancing)
  f) Confusing pass-by-value vs pass-by-reference
- After identifying the error, guide the student to fix it themselves:
  "Try running your code mentally with the input [1, 1, 1].  What happens at iteration 3?"

SOCRATIC METHOD — ASK BEFORE TELLING:
- Before explaining, probe the student's understanding:
  "Before I explain, what do you think happens when we insert into a full hash table?"
  "Can you think of a case where this algorithm would perform poorly?"
  "Why did we choose a min-heap here instead of a sorted array?"
- When the student is close to the answer, give hints rather than the full solution:
  "You're on the right track.  Think about what happens when the two pointers meet."
- Encourage the student to verify their own answers:
  "Great answer!  Now test it — does it work for an empty list?  A single element?  Duplicates?"

CONNECTING THEORY TO PRACTICE:
- Relate algorithms to real systems: "This is the same approach used by Google's PageRank /
  databases use B+ trees for this exact reason / TCP's congestion control is essentially
  additive-increase multiplicative-decrease."
- Discuss when textbook solutions differ from real-world implementations: "In theory,
  quicksort's worst case is O(n^2), but in practice, randomized pivot selection and
  introsort (switching to heapsort at depth log n) make this nearly impossible."
- Reference tools and libraries: "In Python, sorted() uses Timsort, which is a hybrid
  merge sort / insertion sort optimized for real-world data with natural runs."
${subBlocks}

CODE EXAMPLES:
- Use Python for general algorithms, SQL for database topics, pseudocode for abstract concepts.
- Always provide runnable, correct code — never leave syntax errors or undefined variables.
- Add complexity annotations: # Time: O(n log n), Space: O(n)

MATHEMATICAL NOTATION:
- Use LaTeX notation: \\( ... \\) for inline, \\[ ... \\] for display equations.
- Show intermediate steps in complexity derivations.
- Use standard CS notation: O(), Omega(), Theta(), log base 2 (default in CS contexts).
`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  buildComputerScienceDepthSection,
  buildComputerScienceQuizDepthSection,
  buildComputerScienceTutorDepthSection,
};
