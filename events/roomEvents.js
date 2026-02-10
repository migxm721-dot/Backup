const roomService = require('../services/roomService');
const presence = require('../utils/presence');
const logger = require('../utils/logger');
const { getRoomParticipants } = require('../utils/redisUtils');
const { getUserLevel } = require('../utils/xpLeveling');

/**
 * Helper function to broadcast "has entered" message
 */
const broadcastUserEntered = (socket, roomId, username, userId, userCount) => {
  socket.to(`room:${roomId}`).emit('room:userEntered', {
    username,
    userId,
    message: `${username} has entered the chat`,
    userCount,
    timestamp: new Date().toISOString()
  });
};

module.exports = (io, socket) => {
  /**
   * Handle explicit room join - broadcasts "has entered" on first join only
   */
  socket.on('joinRoom', async (data) => {
    try {
      const { roomId, userId, username } = data;
      
      if (!roomId || !userId || !username) {
        socket.emit('error', { message: 'roomId, userId, and username are required' });
        return;
      }
      
      logger.info(`[Room Join] ${username} (${userId}) joining room ${roomId}`);
      
      // Initialize joinedRooms Set if not exists
      if (!socket.joinedRooms) {
        socket.joinedRooms = new Set();
      }
      
      // Check if this is first join to this specific room
      const isFirstJoin = !socket.joinedRooms.has(roomId);
      
      // Validate room access
      const result = await roomService.joinRoom(roomId, userId, username);
      
      if (!result.success) {
        socket.emit('joinRoom:error', { error: result.error });
        return;
      }
      
      // Join socket.io room
      socket.join(`room:${roomId}`);
      socket.currentRoomId = roomId;
      socket.joinedRooms.add(roomId); // Track this room as joined
      
      const userCount = await presence.getRoomUserCount(roomId);
      const participants = await getRoomParticipants(roomId);
      
      // Get user level info
      const levelData = await getUserLevel(userId);
      
      // Emit success to the joining user
      socket.emit('joinRoom:success', {
        roomId,
        room: result.room,
        userCount,
        participants,
        level: levelData.level
      });
      
      // Broadcast "has entered" ONLY on first join (not reconnect)
      if (isFirstJoin) {
        logger.info(`[Room Join] First join - broadcasting "${username} has entered"`);
        broadcastUserEntered(socket, roomId, username, userId, userCount);
      } else {
        logger.info(`[Room Join] Silent rejoin - no broadcast for ${username}`);
      }
      
      // Notify user list update
      io.to(`room:${roomId}`).emit('room:userListUpdate', {
        userCount,
        participants
      });
      
    } catch (error) {
      logger.error('[Room Join] Error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  /**
   * Handle silent room rejoin - NO "has entered" broadcast
   * Used for reconnections after disconnect/minimize/refresh
   */
  socket.on('rejoinRoom', async (data) => {
    try {
      const { roomId, userId, username, silent = true } = data;
      
      if (!roomId || !userId || !username) {
        socket.emit('error', { message: 'roomId, userId, and username are required' });
        return;
      }
      
      logger.info(`[Room Rejoin] Silent rejoin: ${username} (${userId}) to room ${roomId}`);
      
      // Validate room access (same as join)
      const result = await roomService.joinRoom(roomId, userId, username);
      
      if (!result.success) {
        socket.emit('rejoinRoom:error', { error: result.error });
        return;
      }
      
      // Rejoin socket.io room
      socket.join(`room:${roomId}`);
      socket.currentRoomId = roomId;
      // Don't reset hasJoinedRoom - this is a rejoin
      
      const userCount = await presence.getRoomUserCount(roomId);
      const participants = await getRoomParticipants(roomId);
      
      // Emit success to the rejoining user
      socket.emit('rejoinRoom:success', {
        roomId,
        room: result.room,
        userCount,
        participants
      });
      
      // NO broadcast message if silent=true (default)
      if (!silent) {
        broadcastUserEntered(socket, roomId, username, userId, userCount);
      }
      
      // Silently update user list
      io.to(`room:${roomId}`).emit('room:userListUpdate', {
        userCount,
        participants
      });
      
    } catch (error) {
      logger.error('[Room Rejoin] Error:', error);
      socket.emit('error', { message: 'Failed to rejoin room' });
    }
  });
  
  /**
   * Handle explicit leave - broadcasts "has left" message
   */
  socket.on('leaveRoom', async (data) => {
    try {
      const { roomId, userId, username } = data;
      
      if (!roomId || !userId || !username) {
        socket.emit('error', { message: 'roomId, userId, and username are required' });
        return;
      }
      
      logger.info(`[Room Leave] Explicit leave: ${username} (${userId}) from room ${roomId}`);
      
      // Leave socket.io room
      socket.leave(`room:${roomId}`);
      
      // Remove from Redis
      await roomService.leaveRoom(roomId, userId, username);
      
      // Clear first-join tracking
      if (socket.joinedRooms) {
        socket.joinedRooms.delete(roomId);
      }
      socket.currentRoomId = null;
      
      const userCount = await presence.getRoomUserCount(roomId);
      const participants = await getRoomParticipants(roomId);
      
      // Emit success to leaving user
      socket.emit('leaveRoom:success', { roomId });
      
      // Broadcast "has left" message
      socket.to(`room:${roomId}`).emit('room:userLeft', {
        username,
        userId,
        message: `${username} has left the chat`,
        userCount,
        timestamp: new Date().toISOString()
      });
      
      // Notify user list update
      io.to(`room:${roomId}`).emit('room:userListUpdate', {
        userCount,
        participants
      });
      
    } catch (error) {
      logger.error('[Room Leave] Error:', error);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  });
};
