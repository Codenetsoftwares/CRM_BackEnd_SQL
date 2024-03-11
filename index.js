import express from 'express';
import AccountRoute from './Routes/Account.route.js';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import connectToDB from './db/db.js';
import BankRoutes from './Routes/Bank.route.js';
import WebisteRoutes from './Routes/Website.route.js';
import IntroducerRoutes from './Routes/Introducer.route.js';
import UserRoutes from './Routes/User.route.js';
import TransactionRoutes from './Routes/Transaction.route.js';
import DeleteAPIRoute from './Routes/DeleteAPI.route.js';
import EditAPIRoute from './Routes/EditAPI.route.js';

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = process.env.FRONTEND_URI.split(',');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// connecting Database
connectToDB()
  .then((pool) => {
    app.locals.db = pool;
    console.log('Connected to database');
  })
  .catch((err) => {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.send('Hi');
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
