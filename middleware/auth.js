import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

// Define the pool outside the middleware function
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Himanshu@10',
  database: 'CRM',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Define the query function separately
const query = async (sql, values) => {
  try {
    const [rows, fields] = await pool.execute(sql, values);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error; // Rethrow the error to be caught by the calling function
  }
};

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
      const [introducerUser] = await query('SELECT * FROM introduceruser WHERE userName = ?', [decodedToken.userName]);

      // If no introducer user found, fetch user with other roles
      if (!introducerUser || introducerUser.length === 0) {
        const [otherUser] = await query('SELECT * FROM User WHERE userName = ?', [decodedToken.userName]);
        if (!otherUser || otherUser.length === 0) {
          return res.status(401).send({ code: 401, message: 'Invalid login attempt (4)' });
        }
        req.user = otherUser;
      } else {
        req.user = introducerUser;
      }

      // Check if user's role is authorized
      if (roles && roles.length > 0) {
        if (!req.user.role || !roles.includes(req.user.role)) {
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
