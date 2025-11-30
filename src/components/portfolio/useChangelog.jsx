import { base44 } from '@/api/base44Client';

export async function logChange(action, assetType, assetName, details = '') {
  try {
    await base44.entities.Changelog.create({
      action,
      asset_type: assetType,
      asset_name: assetName,
      details
    });
  } catch (error) {
    console.error('Failed to log change:', error);
  }
}

export function createChangeLogger(assetType) {
  return {
    logCreate: (assetName, details) => logChange('created', assetType, assetName, details),
    logUpdate: (assetName, details) => logChange('updated', assetType, assetName, details),
    logDelete: (assetName, details) => logChange('deleted', assetType, assetName, details)
  };
}