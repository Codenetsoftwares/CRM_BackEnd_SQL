import jwt from 'jsonwebtoken';
import { database } from '../services/database.service.js';

// Export the middleware function
export const AuthorizeRole = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;
      if (!authToken) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (1)' });
      }
      const tokenParts = authToken.split(' ');
      if (!(tokenParts.length === 2 && tokenParts[0] === 'Bearer' && tokenParts[1])) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (2)' });
      }
      const decodedToken = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
      if (!decodedToken || !decodedToken.userName) {
        return res.status(401).send({ code: 401, message: 'Invalid login attempt (3)' });
      }

      // Fetch introducer user from database using username
      const [introducerUser] = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ?', [
        decodedToken.userName,
      ]);

      // If no introducer user found, fetch user with other roles
      if (!introducerUser || introducerUser.length === 0) {
        const [otherUser] = await pool.execute('SELECT * FROM User WHERE user_id = ?', [decodedToken.user_id]);
        if (!otherUser || otherUser.length === 0) {
          return res.status(401).send({ code: 401, message: 'Invalid login attempt (4)' });
        }
        req.user = otherUser;
      } else {
        req.user = introducerUser;
      }

      // Check if user's role is authorized
      if (roles && roles.length > 0) {
        if (!req.user[0].role || !roles.includes(req.user[0].role)) {
          return res.status(401).send({ code: 401, message: 'Unauthorized access' });
        }
      }

      next();
    } catch (err) {
      console.error('Authorization Error:', err.message);
      return res.status(401).send({ code: 401, message: 'Unauthorized access' });
    }
  };
};
