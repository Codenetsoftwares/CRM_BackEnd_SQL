// models/BankTransaction.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const BankTransaction = sequelize.define('BankTransaction', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bankId: { type: DataTypes.STRING },
  bankTransaction_Id: { type: DataTypes.STRING },
  accountHolderName: { type: DataTypes.STRING },
  bankName: { type: DataTypes.STRING },
  accountNumber: { type: DataTypes.BIGINT },
  ifscCode: { type: DataTypes.STRING },
  transactionType: { type: DataTypes.STRING },
  remarks: { type: DataTypes.STRING },
  upiId: { type: DataTypes.STRING },
  upiAppName: { type: DataTypes.STRING },
  upiNumber: { type: DataTypes.BIGINT },
  withdrawAmount: { type: DataTypes.INTEGER },
  depositAmount: { type: DataTypes.INTEGER },
  subAdminId: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
  isSubmit: { type: DataTypes.BOOLEAN },
});

export default BankTransaction;
