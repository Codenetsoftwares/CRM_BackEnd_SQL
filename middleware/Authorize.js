import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';

export const Authorize = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;
      if (!authToken) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (1)' });
      }

      const tokenParts = authToken.split(' ');
      if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer' || !tokenParts[1]) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (2)' });
      }

      let user;
      try {
        user = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
        console.log('Decoded user:', user); // Log decoded user for debugging
      } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (3)' });
      }

      if (!user || !user.userName) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (4)' });
      }

      const existingUser = await Admin.findOne({ where: { userName: user.userName } });

      if (!existingUser) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (5)' });
      }

      // Convert roles from JSON string to array
      const rolesArray = JSON.parse(existingUser.roles || '[]');

      // Optionally check roles if specified
      if (roles && roles.length > 0) {
        let userHasRequiredRole = false;
        roles.forEach((role) => {
          if (rolesArray.includes(role)) {
            userHasRequiredRole = true;
          }
        });
        if (!userHasRequiredRole) {
          return res.status(401).send({ code: 401, message: 'Unauthorized access' });
        }
      }

      req.user = existingUser; // Attach the user object to the request
      next();
    } catch (err) {
      console.error('Authorization Error:', err.message);
      return res.status(401).send({ code: 401, message: 'Unauthorized access' });
    }
  };
};
