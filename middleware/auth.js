import jwt from 'jsonwebtoken';
import IntroducerUser from '../models/introducerUser.model.js';
import User from '../models/user.model.js';
import { apiResponseErr } from '../utils/response.js';
import { statusCode } from '../utils/statusCodes.js';

export const AuthorizeRole = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;
      if (!authToken) {
        return apiResponseErr(null, false, statusCode.unauthorize, 'Authorization token is missing', res);
      }

      const tokenParts = authToken.split(' ');
      if (!(tokenParts.length === 2 && tokenParts[0] === 'Bearer' && tokenParts[1])) {
        return apiResponseErr(null, false, statusCode.unauthorize, 'Authorization token format is invalid. Expected format: Bearer <token>', res);
      }

      const decodedToken = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
      if (!decodedToken || !decodedToken.userName) {
        return apiResponseErr(null, false, statusCode.unauthorize, 'Invalid token or user information missing', res);
      }

      // Fetch introducer user from database using username
      const introducerUser = await IntroducerUser.findOne({
        where: { userName: decodedToken.userName },
      });

      // If no introducer user found, fetch user with other roles
      if (!introducerUser) {
        const otherUser = await User.findOne({
          where: { userId: decodedToken.userId },
        });
        if (!otherUser) {
          return apiResponseErr(null, false, statusCode.unauthorize, 'User not found', res);
        }
        req.user = otherUser;
      } else {
        req.user = introducerUser;
      }

      // Check if user's role is authorized
      if (roles && roles.length > 0) {
        if (!req.user.role || !roles.includes(req.user.role)) {
          return apiResponseErr(null, false, statusCode.unauthorize, 'User does not have permission to access this resource', res);
        }
      }

      next();
    } catch (error) {
      console.error('Authorization Error:', error.message);
      return apiResponseErr(null, false, statusCode.unauthorize, 'Unauthorized access', res);
    }
  };
};
