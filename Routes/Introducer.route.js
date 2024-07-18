import {
  getIntroducerLiveBalance,
  getIntroducerProfile,
  getIntroducerUserAccountSummary,
  getIntroducerUserData,
  introducerAccountSummary,
  introducerPasswordResetCode,
  introducerUser,
  listIntroducerUsers,
  updateIntroducerProfile,
} from '../services/introducer.services.js';
import { AuthorizeRole } from '../middleware/auth.js';
import { database } from '../services/database.service.js';
import customErrorHandler from '../utils/customErrorHandler.js';
import { string } from '../constructor/string.js';
import {
  updateIntroducerValidationSchema,
  validateIntroducerUsername,
  validateIntroId,
  validateIntroUserId,
  validateResetPassword,
} from '../utils/commonSchema.js';

export const IntroducerRoutes = (app) => {
  // done
  app.get('/api/introducer/profile', customErrorHandler, AuthorizeRole([string.introducer]), getIntroducerProfile);

  // done
  app.put(
    '/api/introducer-profile-edit/:introId',
    updateIntroducerValidationSchema,
    customErrorHandler,
    AuthorizeRole([string.introducer]),
    updateIntroducerProfile,
  );

  // done
  app.get(
    '/api/list-introducer-user/:introId',
    validateIntroId,
    customErrorHandler,
    AuthorizeRole([string.introducer]),
    listIntroducerUsers,
  );

  // done
  app.get(
    '/api/introducer-user-single-data/:user_id',
    validateIntroUserId,
    customErrorHandler,
    AuthorizeRole([string.introducer]),
    getIntroducerUserData,
  );

  // done
  app.get(
    '/api/introducer/introducer-live-balance/:introId',
    validateIntroId,
    customErrorHandler,
    AuthorizeRole([string.introducer]),
    getIntroducerLiveBalance,
  );

  // done
  app.get(
    '/api/introducer-account-summary/:introId',
    validateIntroId,
    customErrorHandler,
    AuthorizeRole([string.introducer]),
    introducerAccountSummary,
  );

  // done
  app.post(
    '/api/introducer/reset-password',
    validateResetPassword,
    customErrorHandler,
    AuthorizeRole([string.introducer]),
    introducerPasswordResetCode,
  );

  // done
  app.get(
    '/api/introducer-user/accountSummary/:introducerUsername',
    validateIntroducerUsername,
    customErrorHandler,
    AuthorizeRole([string.introducer]),
    getIntroducerUserAccountSummary,
  );

  // // Not in user
  // app.get('/api/introducer/user-data/:introId', AuthorizeRole(['introducer']), async (req, res) => {
  //   const pool = await connectToDB();
  //   try {
  //     const id = req.params.introId;
  //     const [introducerResult] = await database.execute(`SELECT * FROM IntroducerUser WHERE introId = ?`, [id]);
  //     if (introducerResult.length === 0) {
  //       throw {
  //         code: 404,
  //         message: `Introducer User not found with id: ${id}`,
  //       };
  //     }
  //     const introducer = introducerResult[0];
  //     const introducerId = introducer.introducerId;
  //     const [usersResult] = await database.execute(`SELECT * FROM User WHERE introducersUserId = ?`, [introducerId]);
  //     res.send(usersResult);
  //   } catch (e) {
  //     console.error(e);
  //     res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
  //   }
  // });

  // app.get('/api/introducer-user-single-data/:id', AuthorizeRole(['introducer']), async (req, res) => {
  //   const pool = await connectToDB();
  //   try {
  //     const id = req.params.id;
  //     const introducerId = req.user.introducerId;
  //     const query = `SELECT * FROM User WHERE _id = ? AND introducersUserId = ?`;
  //     const [introducerUser] = await database.execute(query, [id, introducerId]);
  //     res.send(introducerUser);
  //   } catch (e) {
  //     console.error(e);
  //     res.status(e.code || 500).send({ message: e.message || 'Internal Server Error' });
  //   }
  // });
};
export default IntroducerRoutes;
