import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connectToDB = async () => {
  try {
    const pool = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DBNAME,
      port: process.env.DB_PORT,
      waitForConnections: true,
      connectionLimit: 1500,
      queueLimit: 0,
    });

    console.log('Database connection successful');
    return pool;
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    throw error;
  }
};

export default connectToDB;
