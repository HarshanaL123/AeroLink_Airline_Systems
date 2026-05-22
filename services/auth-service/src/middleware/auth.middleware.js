const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes by validating JWT tokens
 */
exports.protect = (req, res, next) => {
  let token;

  // 1. Check if Authorization header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extract token from "Bearer <token>"
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. If no token found
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route',
    });
  }

  try {
    // 3. Verify token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach decoded payload (userId, role) to the request object
    // This allows subsequent middleware/controllers to know WHO is making the request
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token is invalid or expired',
    });
  }
};

/**
 * Middleware for Role-Based Access Control (RBAC)
 * @param  {...string} roles - Array of allowed roles (e.g., 'admin', 'staff')
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // 1. Ensure user object exists (protect middleware must run first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // 2. Check if the user's role is included in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};
