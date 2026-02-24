const courseService = require('../services/courseService');
const { generateUnifiedModules } = require('../services/crossDocModuleService');

/**
 * POST /courses — Create a new course with optional document IDs.
 */
async function createCourse(req, res, next) {
  try {
    const { title, description, documentIds } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const userId = req.user?.id || null;
    const courseId = await courseService.createCourse(title.trim(), description || null, 'manual', userId);

    // Add initial documents if provided
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      for (let i = 0; i < documentIds.length; i++) {
        await courseService.addDocumentToCourse(courseId, documentIds[i], 'source', i);
      }
    }

    await courseService.updateCourseStatus(courseId, { status: 'ready' });

    const course = await courseService.getCourse(courseId);
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /courses — List all courses for the authenticated user.
 */
async function listCourses(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const courses = await courseService.getCoursesByUser(userId);
    res.json({ courses });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /courses/:id — Get a single course with its documents.
 */
async function getCourseById(req, res, next) {
  try {
    const course = await courseService.getCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /courses/:id/documents — Add a document to a course.
 */
async function addDocumentToCourse(req, res, next) {
  try {
    const { documentId, role } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    const course = await courseService.getCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const existingDocs = course.documents || [];
    const maxOrder = existingDocs.reduce((max, d) => Math.max(max, d.orderIndex || 0), -1);

    await courseService.addDocumentToCourse(req.params.id, documentId, role || 'source', maxOrder + 1);

    const updated = await courseService.getCourse(req.params.id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /courses/:id/documents/:docId — Remove a document from a course.
 */
async function removeDocumentFromCourse(req, res, next) {
  try {
    await courseService.removeDocumentFromCourse(req.params.id, req.params.docId);
    const updated = await courseService.getCourse(req.params.id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /courses/:id/generate — Trigger unified module generation for a course.
 */
async function generateCourseModules(req, res, next) {
  try {
    const course = await courseService.getCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const readySources = (course.documents || []).filter(d =>
      ['source', 'syllabus'].includes(d.role) && d.status === 'ready'
    );

    if (readySources.length < 1) {
      return res.status(400).json({ error: 'Course needs at least 1 ready source document' });
    }

    const userId = req.user?.id || null;

    res.json({
      message: 'Unified module generation started',
      status: 'processing',
      courseId: req.params.id,
    });

    // Background generation
    generateUnifiedModules(req.params.id, userId).catch(err => {
      console.error(`[courseController] Unified module gen failed for ${req.params.id}:`, err.message);
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /courses/:id — Delete a course.
 */
async function deleteCourse(req, res, next) {
  try {
    const course = await courseService.getCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await courseService.deleteCourse(req.params.id);
    res.json({ message: 'Course deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCourse,
  listCourses,
  getCourseById,
  addDocumentToCourse,
  removeDocumentFromCourse,
  generateCourseModules,
  deleteCourse,
};
