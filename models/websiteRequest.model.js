// models/WebsiteRequest.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const WebsiteRequest = sequelize.define('WebsiteRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  websiteId: { type: DataTypes.STRING },
  websiteName: { type: DataTypes.STRING },
  subAdminId: { type: DataTypes.STRING },
  subAdminName: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE },
  isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
});

export default WebsiteRequest;
