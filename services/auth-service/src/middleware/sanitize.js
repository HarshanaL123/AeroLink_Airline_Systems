/**
 * Input Validation & Sanitization Middleware
 * Protects against Cross-Site Scripting (XSS) by encoding malicious characters.
 */

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const sanitizeObject = (obj) => {
  if (!obj) return obj;
  for (let key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
};

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

module.exports = sanitizeMiddleware;
