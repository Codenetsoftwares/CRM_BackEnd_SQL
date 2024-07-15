import { generateIntroducerAccessToken, loginAdmin } from "../services/Auth.services.js";
import customErrorHandler from "../utils/customErrorHandler.js";

export const AuthRoute = (app) => {
    app.post('/api/admin/login', customErrorHandler, loginAdmin);
    app.post('/api/introducer/user/login', customErrorHandler, generateIntroducerAccessToken)

}