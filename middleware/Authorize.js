import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';
import { statusCode } from '../utils/statusCodes.js';

export const Authorize = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;
      if (!authToken) {
        return res.status(statusCode.unauthorize).send({ code: 401, message: 'Invalid login attempt (1)' });
      }

      const tokenParts = authToken.split(' ');
      if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer' || !tokenParts[1]) {
        return res.status(statusCode.unauthorize).send({ code: 401, message: 'Invalid login attempt (2)' });
      }

      let user;
      try {
        user = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
        console.log('Decoded user:', user); // Log decoded user for debugging
      } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return res.status(statusCode.unauthorize).send({ code: 401, message: 'Invalid login attempt (3)' });
      }

      if (!user || !user.userName) {
        return res.status(statusCode.unauthorize).send({ code: 401, message: 'Invalid login attempt (4)' });
      }

      const existingUser = await Admin.findOne({ where: { userName: user.userName } });

      if (!existingUser) {
        return res.status(statusCode.unauthorize).send({ code: 401, message: 'Invalid login attempt (5)' });
      }

      // Convert roles from JSON string to array if necessary
      const rolesArray = Array.isArray(existingUser.roles) ? existingUser.roles : JSON.parse(existingUser.roles || '[]');

      // Check roles if specified
      if (roles && roles.length > 0) {
        const userHasRequiredRole = roles.some(role => rolesArray.includes(role));
        if (!userHasRequiredRole) {
          return res.status(statusCode.unauthorize).send({ code: 401, message: 'unauthorize access' });
        }
      }

      req.user = existingUser; // Attach the user object to the request
      next();
    } catch (err) {
      console.error('Authorization Error:', err.message);
      return res.status(statusCode.unauthorize).send({ code: 401, message: 'unauthorize access' });
    }
  };
};
