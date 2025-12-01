// Changelog functionality - disabled for now (was using base44)
// TODO: Implement changelog with backend API if needed

export async function logChange(action, assetType, assetName, details = '') {
  // Disabled - just log to console for now
  console.log(`[Changelog] ${action} ${assetType}: ${assetName}`, details);
}

export function createChangeLogger(assetType) {
  return {
    logCreate: (assetName, details) => logChange('created', assetType, assetName, details),
    logUpdate: (assetName, details) => logChange('updated', assetType, assetName, details),
    logDelete: (assetName, details) => logChange('deleted', assetType, assetName, details)
  };
}