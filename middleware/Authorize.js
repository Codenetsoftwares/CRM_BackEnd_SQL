import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import { database } from '../services/database.service.js';

export const Authorize = (roles) => {
  return async (req, res, next) => {
    const pool = await connectToDB();
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
      } catch (err) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (3)' });
      }

      if (!user) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (4)' });
      }

      const [existingUser] = await pool.execute('SELECT * FROM Admin WHERE userName = ?', [user.userName]);

      if (!existingUser || existingUser.length === 0) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (5)' });
      }

      if (roles && roles.length > 0) {
        let userHasRequiredRole = false;
        roles.forEach((role) => {
          const rolesArray = existingUser[0].roles;
          if (rolesArray && rolesArray.includes(role)) {
            userHasRequiredRole = true;
          }
        });
        if (!userHasRequiredRole) {
          return res.status(401).send({ code: 401, message: 'Unauthorized access' });
        }
      }

      req.user = existingUser;
      next();
    } catch (err) {
      console.error('Authorization Error:', err.message);
      return res.status(401).send({ code: 401, message: 'Unauthorized access' });
    }
  };
};
