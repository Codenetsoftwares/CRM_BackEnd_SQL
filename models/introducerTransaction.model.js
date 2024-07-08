// models/IntroducerTransaction.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const IntroducerTransaction = sequelize.define('IntroducerTransaction', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  introTransactionId: { type: DataTypes.STRING },
  introUserId: { type: DataTypes.STRING },
  amount: { type: DataTypes.INTEGER },
  transactionType: { type: DataTypes.STRING },
  remarks: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  introducerUserName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
});

export default IntroducerTransaction;
