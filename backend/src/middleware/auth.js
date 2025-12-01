/**
 * Authentication Middleware
 * TODO: Implement proper JWT authentication
 */

// Middleware to check if user is authenticated
export const requireAuth = (req, res, next) => {
  // TODO: Implement proper JWT authentication
  // For now, use default user ID for development
  req.userId = 1;
  next();
};

export default requireAuth;
