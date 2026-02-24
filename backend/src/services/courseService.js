const supabase = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new course.
 */
async function createCourse(title, description, sourceType = 'manual', userId = null) {
  const id = uuidv4();
  const row = {
    id,
    title,
    description: description || null,
    source_type: sourceType,
    status: 'processing',
    user_id: userId || null,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('courses').insert(row);
  if (error) throw error;
  return id;
}

/**
 * Get a course with its documents.
 */
async function getCourse(courseId) {
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
  if (error) throw error;
  if (!course) return null;

  const { data: courseDocs, error: cdErr } = await supabase
    .from('course_documents')
    .select('document_id, role, order_index')
    .eq('course_id', courseId)
    .order('order_index');
  if (cdErr) throw cdErr;

  // Fetch the actual document records
  const docIds = (courseDocs || []).map(cd => cd.document_id);
  let documents = [];
  if (docIds.length > 0) {
    const { data: docs, error: docErr } = await supabase
      .from('documents')
      .select('id, original_name, status, source_type, file_type, document_subtype')
      .in('id', docIds);
    if (docErr) throw docErr;

    // Merge role/order info
    const docMap = {};
    for (const d of (docs || [])) docMap[d.id] = d;
    documents = (courseDocs || []).map(cd => ({
      ...docMap[cd.document_id],
      role: cd.role,
      orderIndex: cd.order_index,
    })).filter(d => d.id);
  }

  return formatCourse(course, documents);
}

/**
 * Get all courses for a user.
 */
async function getCoursesByUser(userId) {
  const query = supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;

  // Fetch document counts per course
  const courseIds = (data || []).map(c => c.id);
  let docCounts = {};
  if (courseIds.length > 0) {
    const { data: counts, error: cErr } = await supabase
      .from('course_documents')
      .select('course_id')
      .in('course_id', courseIds);
    if (!cErr && counts) {
      for (const row of counts) {
        docCounts[row.course_id] = (docCounts[row.course_id] || 0) + 1;
      }
    }
  }

  return (data || []).map(c => ({
    ...formatCourse(c),
    documentCount: docCounts[c.id] || 0,
  }));
}

/**
 * Add a document to a course.
 */
async function addDocumentToCourse(courseId, documentId, role = 'source', orderIndex = 0) {
  const { error } = await supabase.from('course_documents').upsert({
    course_id: courseId,
    document_id: documentId,
    role,
    order_index: orderIndex,
  });
  if (error) throw error;
}

/**
 * Remove a document from a course.
 */
async function removeDocumentFromCourse(courseId, documentId) {
  const { error } = await supabase
    .from('course_documents')
    .delete()
    .eq('course_id', courseId)
    .eq('document_id', documentId);
  if (error) throw error;
}

/**
 * Update course status and/or config.
 */
async function updateCourseStatus(courseId, updates) {
  const row = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.error !== undefined) row.error_message = updates.error;
  if (updates.config !== undefined) row.config = updates.config;
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.syllabusDocumentId !== undefined) row.syllabus_document_id = updates.syllabusDocumentId;

  const { error } = await supabase
    .from('courses')
    .update(row)
    .eq('id', courseId);
  if (error) throw error;
}

/**
 * Delete a course (cascade deletes course_documents and course modules).
 */
async function deleteCourse(courseId) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);
  if (error) throw error;
}

/**
 * Get courses that a document belongs to.
 */
async function getCoursesForDocument(documentId) {
  const { data, error } = await supabase
    .from('course_documents')
    .select('course_id, role')
    .eq('document_id', documentId);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const courseIds = data.map(cd => cd.course_id);
  const { data: courses, error: cErr } = await supabase
    .from('courses')
    .select('*')
    .in('id', courseIds);
  if (cErr) throw cErr;

  const roleMap = {};
  for (const cd of data) roleMap[cd.course_id] = cd.role;

  return (courses || []).map(c => ({
    ...formatCourse(c),
    documentRole: roleMap[c.id],
  }));
}

function formatCourse(row, documents = null) {
  const course = {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceType: row.source_type,
    syllabusDocumentId: row.syllabus_document_id,
    status: row.status,
    errorMessage: row.error_message,
    userId: row.user_id,
    config: row.config || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (documents !== null) course.documents = documents;
  return course;
}

module.exports = {
  createCourse,
  getCourse,
  getCoursesByUser,
  addDocumentToCourse,
  removeDocumentFromCourse,
  updateCourseStatus,
  deleteCourse,
  getCoursesForDocument,
};
