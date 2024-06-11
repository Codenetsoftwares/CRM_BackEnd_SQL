import express from 'express';
// import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Route Imports
import AccountRoute from './Routes/Account.route.js';
import UserRoutes from './Routes/User.route.js';
import WebisteRoutes from './Routes/Website.route.js';
import IntroducerRoutes from './Routes/Introducer.route.js';
import BankRoutes from './Routes/Bank.route.js';
import TransactionRoutes from './Routes/Transaction.route.js';
import DeleteAPIRoute from './Routes/DeleteAPI.route.js';
import EditAPIRoute from './Routes/EditAPI.route.js';

dotenv.config();
const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = process.env.FRONTEND_URI.split(',');
// app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Status : OK');
});

AccountRoute(app);
BankRoutes(app);
WebisteRoutes(app);
IntroducerRoutes(app);
UserRoutes(app);
TransactionRoutes(app);
DeleteAPIRoute(app);
EditAPIRoute(app);

app.listen(process.env.PORT, () => {
  console.log(`Server listening in http://localhost:${process.env.PORT || 8000}`);
});
