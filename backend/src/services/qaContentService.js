const { getSearchGroundedModel, withRetryOnRateLimit } = require('../config/gemini');
const { QA_CONTENT_PROCESSING_PROMPT } = require('../utils/prompts');
const supabase = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Process Q&A content (exam papers, problem sets) by:
 * 1. Extracting questions and grouping by topic
 * 2. Generating correct answers with explanations
 * 3. Creating tutorial-style content for each topic group
 * 4. Inserting enhanced modules that teach the tested concepts
 */
async function processQAContent(docId, text, userId = null) {
  const prefix = `[QA-Content ${docId.slice(0, 8)}]`;
  console.log(`${prefix} Processing Q&A content...`);

  // Use search grounding so Gemini can validate/find correct answers
  const prompt = QA_CONTENT_PROCESSING_PROMPT.replace('{document_text}', text.slice(0, 80000));

  const result = await withRetryOnRateLimit(async () => {
    const model = getSearchGroundedModel('standard');
    return model.generateContent(prompt);
  }, 3, 1);
  const responseText = result.response.text();

  let parsed;
  try {
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`${prefix} Failed to parse Q&A response:`, e.message);
    return;
  }

  const topicGroups = parsed.topicGroups || [];
  if (topicGroups.length === 0) {
    console.log(`${prefix} No topic groups extracted`);
    return;
  }

  // Get current max order_index for this document
  const { data: lastMod } = await supabase
    .from('modules')
    .select('order_index')
    .eq('document_id', docId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  let orderIndex = (lastMod?.order_index ?? -1) + 1;
  const moduleRows = [];
  const questionRows = [];

  for (const group of topicGroups) {
    const moduleId = uuidv4();

    // Build rich tutorial content from the topic group
    let content = `# ${group.topic}\n\n`;
    content += group.tutorialContent || '';
    content += '\n\n---\n\n### Practice Questions from Your Study Material\n\n';

    for (let i = 0; i < (group.questions || []).length; i++) {
      const q = group.questions[i];
      content += `**Question ${i + 1}:** ${q.question}\n\n`;
      content += `**Answer:** ${q.answer}\n\n`;
      content += `**Explanation:** ${q.explanation}\n\n`;
      if (i < group.questions.length - 1) content += '---\n\n';
    }

    moduleRows.push({
      id: moduleId,
      document_id: docId,
      order_index: orderIndex++,
      title: `Understanding: ${group.topic}`,
      topic: group.topic,
      objectives: [
        `Understand the core concepts of ${group.topic}`,
        `Apply knowledge to solve exam-style questions on ${group.topic}`,
        `Identify common patterns and misconceptions in ${group.topic}`,
      ],
      content,
      takeaways: [
        `Key concepts of ${group.topic} as tested in exams`,
        `Correct approaches and solutions for ${group.topic} questions`,
        `Common misconceptions to avoid in ${group.topic}`,
      ],
    });

    // Generate comprehension questions from the Q&A content
    for (const q of (group.questions || []).slice(0, 5)) {
      questionRows.push({
        id: uuidv4(),
        module_id: moduleId,
        type: 'multiple_choice',
        question: q.question,
        options: null, // Will be populated if the original had options
        correct: q.answer,
        explanation: q.explanation || null,
        topic: group.topic,
      });
    }
  }

  // Insert tutorial modules
  if (moduleRows.length > 0) {
    for (let i = 0; i < moduleRows.length; i += 500) {
      const batch = moduleRows.slice(i, i + 500);
      const { error } = await supabase.from('modules').insert(batch);
      if (error) {
        console.error(`${prefix} Failed to insert Q&A modules:`, error.message);
        return;
      }
    }
  }

  // Insert questions
  if (questionRows.length > 0) {
    for (let i = 0; i < questionRows.length; i += 500) {
      const batch = questionRows.slice(i, i + 500);
      const { error } = await supabase.from('questions').insert(batch);
      if (error) {
        console.error(`${prefix} Failed to insert Q&A questions:`, error.message);
      }
    }
  }

  console.log(`${prefix} Created ${moduleRows.length} tutorial modules from ${topicGroups.length} topic groups`);
}

module.exports = { processQAContent };
