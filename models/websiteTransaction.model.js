// models/WebsiteTransaction.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const WebsiteTransaction = sequelize.define('WebsiteTransaction', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  websiteId: { type: DataTypes.STRING },
  WebsiteTransaction_Id: { type: DataTypes.STRING },
  websiteName: { type: DataTypes.STRING },
  remarks: { type: DataTypes.TEXT },
  transactionType: { type: DataTypes.STRING },
  withdrawAmount: { type: DataTypes.INTEGER },
  depositAmount: { type: DataTypes.INTEGER },
  subAdminId: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
});

export default WebsiteTransaction;
