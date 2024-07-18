import jwt from 'jsonwebtoken';
import IntroducerUser from '../models/introducerUser.model.js';
import User from '../models/user.model.js';

export const AuthorizeRole = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;
      if (!authToken) {
        return res.status(401).json({ message: 'Authorization token is missing' });
      }

      const tokenParts = authToken.split(' ');
      if (!(tokenParts.length === 2 && tokenParts[0] === 'Bearer' && tokenParts[1])) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      const decodedToken = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
      if (!decodedToken || !decodedToken.userName) {
        return res.status(401).json({ message: 'Invalid token or user information missing' });
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
          return res.status(401).json({ message: 'User not found' });
        }
        req.user = otherUser;
      } else {
        req.user = introducerUser;
      }

      // Check if user's role is authorized
      if (roles && roles.length > 0) {
        if (!req.user.role || !roles.includes(req.user.role)) {
          return res
            .status(403)
            .json({ error: 'Forbidden', message: 'User does not have permission to access this resource' });
        }
      }

      next();
    } catch (err) {
      console.error('Authorization Error:', err.message);
      return res
        .status(500)
        .json({ error: 'Internal Server Error', message: 'Something went wrong during authorization' });
    }
  };
};
