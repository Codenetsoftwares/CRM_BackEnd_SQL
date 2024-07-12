// models/EditBankRequest.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const EditBankRequest = sequelize.define('EditBankRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bankId: { type: DataTypes.STRING },
  accountHolderName: { type: DataTypes.STRING },
  bankName: { type: DataTypes.STRING },
  accountNumber: { type: DataTypes.BIGINT },
  ifscCode: { type: DataTypes.STRING },
  upiId: { type: DataTypes.STRING },
  upiAppName: { type: DataTypes.STRING },
  upiNumber: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.STRING },
  message: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING },
  changedFields: { type: DataTypes.JSON },
  isApproved: { type: DataTypes.BOOLEAN },
  subAdminName: { type: DataTypes.STRING },
});

export default EditBankRequest;
