const express = require('express');
const router = express.Router();
const {
  createCourse,
  listCourses,
  getCourseById,
  addDocumentToCourse,
  removeDocumentFromCourse,
  generateCourseModules,
  deleteCourse,
} = require('../controllers/courseController');

router.post('/', createCourse);
router.get('/', listCourses);
router.get('/:id', getCourseById);
router.post('/:id/documents', addDocumentToCourse);
router.delete('/:id/documents/:docId', removeDocumentFromCourse);
router.post('/:id/generate', generateCourseModules);
router.delete('/:id', deleteCourse);

module.exports = router;
