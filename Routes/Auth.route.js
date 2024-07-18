import { generateIntroducerAccessToken, loginAdmin, loginUser } from '../services/Auth.services.js';
import { validateLogin } from '../utils/commonSchema.js';
import customErrorHandler from '../utils/customErrorHandler.js';

export const AuthRoute = (app) => {
  app.post('/api/admin/login', validateLogin, customErrorHandler, loginAdmin);
  app.post('/api/introducer/user/login', validateLogin, customErrorHandler, generateIntroducerAccessToken);
  app.post('/api/accounts/user/login', customErrorHandler, loginUser);
};
