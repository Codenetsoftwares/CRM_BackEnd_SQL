import mysql from 'mysql2/promise';
import { introducerUser } from '../services/introducer.services.js';
import AccountServices from '../services/Account.Services.js';
import { AuthorizeRole } from '../middleware/auth.js';
import connectToDB from '../db/db.js';

export const IntroducerRoutes = (app) => {
  app.post('/api/introducer/user/login', async (req, res) => {
    const pool = await connectToDB();
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
      const [user] = await pool.execute('SELECT * FROM IntroducerUser WHERE userName = ? LIMIT 1', [userName]);
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
    const pool = await connectToDB();
    try {
      const id = req.user[0].intro_id;
      const [IntroUser] = await pool.execute(`SELECT * FROM IntroducerUser WHERE intro_id = (?)`, [id]);
      const introUserId = id;
      const TPDLT = await AccountServices.IntroducerBalance(introUserId);
      const response = {
        intro_id: IntroUser[0].intro_id,
        firstname: IntroUser[0].firstname,
        lastname: IntroUser[0].lastname,
        role: IntroUser[0].role,
        userName: IntroUser[0].userName,
        balance: Number(TPDLT),
      };
      const liveBalance = await AccountServices.introducerLiveBalance(introUserId);
      const currentDue = liveBalance - response.balance;
      response.currentDue = currentDue;
      res.status(201).send(response);
    } catch (e) {
      console.error(e);
      res.status(500).send({ message: e.message }); // Assuming 500 for internal server error
    }
  });

  app.put('/api/intoducer-profile-edit/:intro_id', AuthorizeRole(['introducer']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const userId = req.params.intro_id;
      const [introUser] = await pool.execute(`SELECT * FROM IntroducerUser WHERE intro_id = (?)`, [userId]);
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

  app.get('/api/introducer/user-data/:intro_id', AuthorizeRole(['introducer']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const id = req.params.intro_id;
      const [introducerResult] = await pool.execute(`SELECT * FROM IntroducerUser WHERE intro_id = ?`, [id]);
      if (introducerResult.length === 0) {
        throw {
          code: 404,
          message: `Introducer User not found with id: ${id}`,
        };
      }
      const introducer = introducerResult[0];
      const introducerId = introducer.introducerId;
      const [usersResult] = await pool.execute(`SELECT * FROM User WHERE introducersUserId = ?`, [introducerId]);
      res.send(usersResult);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get('/api/list-introducer-user/:id', AuthorizeRole(['introducer']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const id = req.params.id;
      const [introducerUser] = await pool.execute(`SELECT userName FROM IntroducerUser WHERE _id = ?`, [id]);
      if (introducerUser.length === 0) {
        return res.status(404).send({ message: 'IntroducerUser not found' });
      }
      const introducerUserName = introducerUser[0].userName;
      const [users] = await pool.execute(
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
    const pool = await connectToDB();
    try {
      const id = req.params.id;
      const introducerId = req.user.introducerId;
      const query = `
            SELECT *
            FROM User
            WHERE _id = ? AND introducersUserId = ?
          `;
      const [introducerUser] = await pool.execute(query, [id, introducerId]);
      res.send(introducerUser);
    } catch (e) {
      console.error(e);
      res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
    }
  });

  app.get('/api/introducer/introducer-live-balance/:intro_id', AuthorizeRole(['introducer']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const introId = req.params.intro_id;
      const [introData] = await pool.execute(`SELECT * FROM IntroducerUser WHERE intro_id = (?)`, [introId]);
      const id = introData[0].intro_id;
      const data = await AccountServices.introducerLiveBalance(id);
      console.log('data', data);
      res.send({ LiveBalance: data });
    } catch (e) {
      console.error(e);
      res.status(e.code).send({ message: e.message });
    }
  });

  app.get('/api/introducer-account-summary/:id', AuthorizeRole(['introducer']), async (req, res) => {
    const pool = await connectToDB();
    try {
      const introUserId = req.params.id;
      const query = `
            SELECT *
            FROM IntroducerTransaction
            WHERE introUserId = ?
            ORDER BY createdAt ASC
          `;
      const [introSummary] = await pool.execute(query, [introUserId]);
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
