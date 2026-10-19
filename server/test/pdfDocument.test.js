const test = require('node:test');
const assert = require('node:assert/strict');
const { decodePdfDocument } = require('../utils/pdfDocument');

test('PDF decoder accepts a small PDF payload', () => {
  const pdf = Buffer.from('%PDF-1.7\nexample');
  assert.deepEqual(decodePdfDocument(pdf.toString('base64')), pdf);
});

test('PDF decoder rejects malformed and non-PDF payloads', () => {
  assert.equal(decodePdfDocument('not base64!'), null);
  assert.equal(decodePdfDocument(Buffer.from('<html>').toString('base64')), null);
  assert.equal(decodePdfDocument(''), null);
});

test('PDF decoder rejects payloads larger than the upload limit', () => {
  const oversizedPdf = Buffer.concat([
    Buffer.from('%PDF-1.7\n'),
    Buffer.alloc(512 * 1024),
  ]);
  assert.equal(decodePdfDocument(oversizedPdf.toString('base64')), null);
});
