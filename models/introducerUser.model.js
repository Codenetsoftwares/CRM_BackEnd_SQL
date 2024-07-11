// models/IntroducerUser.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const IntroducerUser = sequelize.define('IntroducerUser', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  intro_id: { type: DataTypes.STRING },
  firstName: { type: DataTypes.STRING },
  lastName: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING },
  introducerId: { type: DataTypes.STRING },
  userName: { type: DataTypes.STRING },
});

export default IntroducerUser;
