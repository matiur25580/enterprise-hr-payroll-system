const maxDocumentBytes = 512 * 1024;
const base64Pattern = /^(?:[A-Za-z0-9+/]+={0,2})$/;

function decodePdfDocument(value) {
  if (typeof value !== 'string') return null;

  const normalizedValue = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (
    !normalizedValue
    || normalizedValue.length > Math.ceil(maxDocumentBytes * 4 / 3) + 4
    || normalizedValue.length % 4 === 1
    || !base64Pattern.test(normalizedValue)
  ) {
    return null;
  }

  const content = Buffer.from(normalizedValue, 'base64');
  if (
    !content.length
    || content.length > maxDocumentBytes
    || content.subarray(0, 5).toString('ascii') !== '%PDF-'
  ) {
    return null;
  }
  return content;
}

module.exports = { decodePdfDocument };
