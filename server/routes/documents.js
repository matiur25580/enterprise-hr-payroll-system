const express = require('express');
const mongoose = require('mongoose');
const HRDocument = require('../models/HRDocument');
const Employee = require('../models/Employee');
const { verifyToken, authorize } = require('../middlewares/auth');
const recordAudit = require('../utils/audit');
const { decodePdfDocument } = require('../utils/pdfDocument');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  try {
    const query = req.user.role === 'employee'
      ? { $or: [{ employeeEmail: { $exists: false } }, { employeeEmail: null }, { employeeEmail: req.user.email.toLowerCase() }] }
      : {};
    const documents = await HRDocument.find(query)
      .select('-content')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    res.json(documents);
  } catch (error) {
    console.error('Could not load HR documents:', error);
    res.status(500).json({ message: 'Could not load HR documents.' });
  }
});

router.post('/', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  const { title, fileName, employeeEmail, contentBase64 } = req.body;
  if (
    typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 120
    || typeof fileName !== 'string' || fileName.trim().length < 1 || fileName.trim().length > 120
    || !/\.pdf$/i.test(fileName.trim())
    || (employeeEmail !== undefined && employeeEmail !== ''
      && (typeof employeeEmail !== 'string' || employeeEmail.length > 254 || !emailPattern.test(employeeEmail.trim())))
    || typeof contentBase64 !== 'string'
  ) {
    return res.status(400).json({ message: 'Provide a valid title, PDF filename, optional employee email, and PDF document.' });
  }

  const content = decodePdfDocument(contentBase64);
  if (!content) {
    return res.status(400).json({ message: 'Only PDF files up to 512 KB are accepted.' });
  }

  const sanitizedFileName = fileName.trim().replace(/[^\w.-]/g, '_').slice(0, 120);
  try {
    const normalizedEmployeeEmail = employeeEmail?.trim().toLowerCase();
    if (normalizedEmployeeEmail && !await Employee.exists({ email: normalizedEmployeeEmail })) {
      return res.status(404).json({ message: 'No employee account matches that email address.' });
    }
    const document = await HRDocument.create({
      title: title.trim(),
      fileName: sanitizedFileName,
      ...(normalizedEmployeeEmail ? { employeeEmail: normalizedEmployeeEmail } : {}),
      content,
      uploadedByEmail: req.user.email,
    });
    await recordAudit(req, 'uploaded', 'hr-document', document._id, `Uploaded HR document "${document.title}".`);
    res.status(201).json({
      _id: document._id,
      title: document.title,
      fileName: document.fileName,
      employeeEmail: document.employeeEmail,
      uploadedByEmail: document.uploadedByEmail,
      createdAt: document.createdAt,
    });
  } catch (error) {
    console.error('Could not upload HR document:', error);
    res.status(500).json({ message: 'Could not upload HR document.' });
  }
});

router.get('/:id/download', verifyToken, authorize('admin', 'hr', 'employee'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid document ID.' });
  try {
    const document = await HRDocument.findById(req.params.id).select('+content');
    if (!document) return res.status(404).json({ message: 'Document not found.' });
    if (req.user.role === 'employee' && document.employeeEmail
      && document.employeeEmail !== req.user.email.toLowerCase()) {
      return res.status(404).json({ message: 'Document not found.' });
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${document.fileName}"`,
      'Content-Length': document.content.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    return res.send(document.content);
  } catch (error) {
    console.error('Could not download HR document:', error);
    return res.status(500).json({ message: 'Could not download HR document.' });
  }
});

router.delete('/:id', verifyToken, authorize('admin', 'hr'), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid document ID.' });
  try {
    const document = await HRDocument.findByIdAndDelete(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found.' });
    await recordAudit(req, 'deleted', 'hr-document', document._id, `Deleted HR document "${document.title}".`);
    return res.json({ message: 'Document deleted.' });
  } catch (error) {
    console.error('Could not delete HR document:', error);
    return res.status(500).json({ message: 'Could not delete HR document.' });
  }
});

module.exports = router;
