// models/UserTransactionDetail.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const UserTransactionDetail = sequelize.define('UserTransactionDetail', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.STRING },
  Transaction_id: { type: DataTypes.STRING },
  bankId: { type: DataTypes.STRING },
  websiteId: { type: DataTypes.STRING },
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
  subAdminId: { type: DataTypes.STRING },
});

export default UserTransactionDetail;
