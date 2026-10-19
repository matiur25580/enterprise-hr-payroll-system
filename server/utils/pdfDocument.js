const maxDocumentBytes = 512 * 1024;
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function decodePdfDocument(value) {
  if (
    typeof value !== 'string'
    || value.length > Math.ceil(maxDocumentBytes * 4 / 3) + 4
    || !base64Pattern.test(value)
  ) {
    return null;
  }
  const content = Buffer.from(value, 'base64');
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
