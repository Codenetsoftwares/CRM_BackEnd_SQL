// models/EditWebsiteRequest.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const EditWebsiteRequest = sequelize.define('EditWebsiteRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  websiteId: { type: DataTypes.STRING },
  transactionType: { type: DataTypes.STRING },
  remark: { type: DataTypes.STRING },
  withdrawAmount: { type: DataTypes.INTEGER },
  depositAmount: { type: DataTypes.INTEGER },
  subAdminId: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  websiteName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.STRING },
  message: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING },
  changedFields: { type: DataTypes.JSON },
  isApproved: { type: DataTypes.BOOLEAN },
});

export default EditWebsiteRequest;
