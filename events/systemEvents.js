const presence = require('../utils/presence');
const { setPresence } = require('../utils/redisUtils');

// Extended grace period: 30 minutes (configurable)
const DISCONNECT_GRACE_PERIOD = 1800000; // 30 minutes in milliseconds

// Map to track disconnect timers for each user
const disconnectGraceTimers = new Map();

/**
 * Starts a grace period timer for a disconnected user
 * User stays in room and can rejoin silently within this period
 */
function addDisconnectGraceTimer(userId, username, roomId, duration = DISCONNECT_GRACE_PERIOD) {
  if (disconnectGraceTimers.has(userId)) {
    console.log(`⏱️  Disconnect timer already exists for user ${username} (${userId})`);
    return;
  }

  console.log(`⏱️  Starting ${duration / 60000} minute grace period for ${username} (${userId}) in room ${roomId}`);
  
  const timer = setTimeout(async () => {
    console.log(`⏰ Grace period expired for ${username} (${userId}), cleaning up...`);
    
    // Remove from room after grace period expires
    if (roomId) {
      await presence.removeUserFromRoom(roomId, userId, username);
    }
    
    // Set user as offline
    await setPresence(username, 'offline').catch(err => {
      console.warn(`Failed to set offline presence for ${username}:`, err.message);
    });
    
    disconnectGraceTimers.delete(userId);
  }, duration);
  
  disconnectGraceTimers.set(userId, { timer, username, roomId, startedAt: Date.now() });
}

/**
 * Cancels the disconnect timer if user reconnects
 * Returns true if timer was found and cancelled
 */
function cancelDisconnectTimer(userId) {
  const timerInfo = disconnectGraceTimers.get(userId);
  if (timerInfo) {
    clearTimeout(timerInfo.timer);
    disconnectGraceTimers.delete(userId);
    
    const elapsed = Date.now() - timerInfo.startedAt;
    console.log(`✅ Cancelled disconnect timer for user ${userId} after ${elapsed / 1000}s`);
    return true;
  }
  return false;
}

/**
 * Gets remaining grace period time for a user (in milliseconds)
 */
function getRemainingGracePeriod(userId) {
  const timerInfo = disconnectGraceTimers.get(userId);
  if (!timerInfo) return 0;
  
  const elapsed = Date.now() - timerInfo.startedAt;
  const remaining = DISCONNECT_GRACE_PERIOD - elapsed;
  return Math.max(0, remaining);
}

module.exports = (io, socket) => {
  // Socket event handlers can be added here if needed
  // Currently, disconnect handling is done in server.js
};

module.exports.addDisconnectGraceTimer = addDisconnectGraceTimer;
module.exports.cancelDisconnectTimer = cancelDisconnectTimer;
module.exports.getRemainingGracePeriod = getRemainingGracePeriod;
module.exports.DISCONNECT_GRACE_PERIOD = DISCONNECT_GRACE_PERIOD;