// models/IntroducerEditRequest.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const IntroducerEditRequest = sequelize.define('IntroducerEditRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  introTransactionId: { type: DataTypes.STRING },
  amount: { type: DataTypes.INTEGER },
  requestedUserName: { type: DataTypes.STRING },
  transactionType: { type: DataTypes.STRING },
  remarks: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  introducerUserName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
  message: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING },
  nameType: { type: DataTypes.STRING },
  changedFields: { type: DataTypes.JSON },
  isApproved: { type: DataTypes.BOOLEAN },
});

export default IntroducerEditRequest;
