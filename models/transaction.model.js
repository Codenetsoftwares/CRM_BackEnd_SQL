// models/Transaction.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bankId: { type: DataTypes.STRING },
  websiteId: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  transactionID: { type: DataTypes.STRING },
  transactionType: { type: DataTypes.STRING },
  amount: { type: DataTypes.INTEGER },
  paymentMethod: { type: DataTypes.STRING },
  userName: { type: DataTypes.STRING },
  introducerUserName: { type: DataTypes.STRING },
  bonus: { type: DataTypes.INTEGER },
  bankCharges: { type: DataTypes.INTEGER },
  remarks: { type: DataTypes.STRING },
  accountNumber: { type: DataTypes.BIGINT },
  bankName: { type: DataTypes.STRING },
  websiteName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
  Transaction_Id: { type: DataTypes.STRING },
});

export default Transaction;
