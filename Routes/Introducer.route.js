import mysql from 'mysql2/promise';
import { introducerUser } from '../services/introducer.services.js';
import AccountServices from '../services/Account.Services.js';
import { AuthorizeRole } from '../middleware/auth.js';

var connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Himanshu@10',
  database: 'CRM',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const query = async (sql, values) => {
  try {
    const [rows, fields] = await connection.execute(sql, values);
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error; // Rethrow the error to be caught by the calling function
  }
};

export const IntroducerRoutes = (app) => {
  app.post('/api/introducer/user/login', async (req, res) => {
    try {
      const { userName, password, persist } = req.body;
      if (!userName) {
        throw { code: 400, message: 'User Name is required' };
      }

      if (!password) {
        throw { code: 400, message: 'Password is required' };
      }
      const accessToken = await introducerUser.generateIntroducerAccessToken(userName, password);

      if (!accessToken) {
        throw { code: 500, message: 'Failed to generate access token' };
      }
      const [user] = await connection.execute('SELECT * FROM IntroducerUser WHERE userName = ? LIMIT 1', [userName]);
      if (!user) {
        throw { code: 404, message: 'User not found' };
      }
      if (user && accessToken) {
        res.status(200).send({
          token: accessToken,
        });
      } else {
        res.status(404).json({ error: 'User not found or access token is invalid' });
      }
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get('/api/intoducer/profile', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      console.log('auth', req.user);
      const id = req.user.id; // Retrieve id from req.user
      const IntroUser = await query(`SELECT * FROM IntroducerUser WHERE id = (?)`, [id]);
      console.log('IntroUser', IntroUser);
      const introUserId = req.user.id; // Use req.user.id here
      const TPDLT = await AccountServices.IntroducerBalance(introUserId);
      const response = {
        id: IntroUser.id,
        firstname: IntroUser.firstname,
        lastname: IntroUser.lastname,
        role: IntroUser.role,
        userName: IntroUser.userName,
        balance: TPDLT,
      };
      const liveBalance = await introducerUser.introducerLiveBalance(introUserId);
      const currentDue = liveBalance - response.balance;
      response.currentDue = currentDue;
      res.status(201).send(response);
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message }); // Assuming 500 for internal server error
    }
  });

  app.put('/api/intoducer-profile-edit/:id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const userId = req.params.id;
      const introUser = await query(`SELECT * FROM IntroducerUser WHERE id = (?)`, [userId]);
      // console.log("introUser", introUser);
      const updateResult = await introducerUser.updateIntroducerProfile(introUser, req.body);
      console.log(updateResult);
      if (updateResult) {
        res.status(201).send('Profile updated');
      }
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get('/api/introducer/user-data/:id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const id = req.params.id;
      const introducerResult = await query(`SELECT * FROM IntroducerUser WHERE id = ?`, [id]);
      if (introducerResult.length === 0) {
        throw {
          code: 404,
          message: `Introducer User not found with id: ${id}`,
        };
      }
      const introducer = introducerResult[0];
      const introducerId = introducer.introducerId;
      const usersResult = await query(`SELECT * FROM User WHERE introducersUserId = ?`, [introducerId]);
      res.send(usersResult);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get('/api/list-introducer-user/:id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const id = req.params.id;
      const introducerUser = await query(`SELECT userName FROM IntroducerUser WHERE _id = ?`, [id]);
      if (introducerUser.length === 0) {
        return res.status(404).send({ message: 'IntroducerUser not found' });
      }
      const introducerUserName = introducerUser[0].userName;
      const users = await query(
        `SELECT * FROM User WHERE introducersUserName = ? OR introducersUserName1 = ? OR introducersUserName2 = ?`,
        [introducerUserName, introducerUserName, introducerUserName],
      );
      res.send(users);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get('/api/introducer-user-single-data/:id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const id = req.params.id;
      const introducerId = req.user.introducerId;
      const query = `
            SELECT *
            FROM User
            WHERE _id = ? AND introducersUserId = ?
          `;
      const introducerUser = await query(query, [id, introducerId]);
      res.send(introducerUser);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get('/api/introducer/introducer-live-balance/:id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const introId = req.params.id;
      const id = await query(`SELECT * FROM IntroducerUser WHERE id = (?)`, [introId]);
      console.log('id', id);
      const data = await introducerUser.introducerLiveBalance(id);
      console.log('data', data);
      res.send({ LiveBalance: data });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get('/api/introducer-account-summary/:id', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const introUserId = req.params.id;
      const query = `
            SELECT *
            FROM IntroducerTransaction
            WHERE introUserId = ?
            ORDER BY createdAt ASC
          `;
      const introSummary = await query(query, [introUserId]);
      res.status(200).send(introSummary);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.post('/api/introducer/reset-password', AuthorizeRole(['introducer']), async (req, res) => {
    try {
      const { userName, oldPassword, password } = req.body;
      await introducerUser.introducerPasswordResetCode(userName, oldPassword, password);
      res.status(200).send({ code: 200, message: 'Password reset successful!' });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });
};
export default IntroducerRoutes;
