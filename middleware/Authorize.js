import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';
import { statusCode } from '../utils/statusCodes.js';
import { apiResponseErr } from '../utils/response.js';

export const Authorize = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;
      if (!authToken) {
        return apiResponseErr(null, false, statusCode.unauthorize, 'Authorization token missing from headers.', res);
      }

      const tokenParts = authToken.split(' ');
      if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer' || !tokenParts[1]) {
        return apiResponseErr(
          null,
          false,
          statusCode.unauthorize,
          'Authorization token format is invalid. Expected format: Bearer <token>',
          res,
        );
      }

      let user;
      try {
        user = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
      } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return apiResponseErr(
          null,
          false,
          statusCode.unauthorize,
          'Authorization token is invalid or has expired.',
          res,
        );
      }

      if (!user || !user.userName) {
        return apiResponseErr(null, false, statusCode.unauthorize, 'Invalid token or user information missing', res);
      }

      const existingUser = await Admin.findOne({ where: { userName: user.userName } });

      if (!existingUser) {
        return apiResponseErr(null, false, statusCode.unauthorize, 'User not found in the database.', res);
      }

      // Convert roles from JSON string to array if necessary
      const rolesArray = Array.isArray(existingUser.roles)
        ? existingUser.roles
        : JSON.parse(existingUser.roles || '[]');

      // Check roles if specified
      if (roles && roles.length > 0) {
        const userHasRequiredRole = roles.some((role) => rolesArray.includes(role));
        if (!userHasRequiredRole) {
          return apiResponseErr(
            null,
            false,
            statusCode.unauthorize,
            'User does not have permission to access this resource',
            res,
          );
        }
      }

      req.user = existingUser; // Attach the user object to the request
      next();
    } catch (error) {
      console.error('Authorization Error:', error.message);
      return apiResponseErr(null, false, statusCode.unauthorize, 'Unauthorized access', res);
    }
  };
};
