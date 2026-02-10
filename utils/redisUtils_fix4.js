// redisUtils_fix4.js

/**
 * Redis Utility Functions for Consistent Participant Tracking
 * Implements dual set management for room:participants and room:users
 */

const redis = require('redis');
const client = redis.createClient();

/**
 * Add a user to a room's participants and users set.
 * @param {string} roomId - The ID of the room.
 * @param {string} userId - The ID of the user to add.
 */
function addUserToRoom(roomId, userId) {
    client.sadd(`room:${roomId}:participants`, userId, (err, result) => {
        if (err) throw err;
        console.log(`User ${userId} added to room ${roomId} participants.`);
    });
    client.sadd(`room:${roomId}:users`, userId, (err, result) => {
        if (err) throw err;
        console.log(`User ${userId} added to room ${roomId} users.`);
    });
}

/**
 * Remove a user from a room's participants and users set.
 * @param {string} roomId - The ID of the room.
 * @param {string} userId - The ID of the user to remove.
 */
function removeUserFromRoom(roomId, userId) {
    client.srem(`room:${roomId}:participants`, userId, (err, result) => {
        if (err) throw err;
        console.log(`User ${userId} removed from room ${roomId} participants.`);
    });
    client.srem(`room:${roomId}:users`, userId, (err, result) => {
        if (err) throw err;
        console.log(`User ${userId} removed from room ${roomId} users.`);
    });
}

/**
 * Get all participants in a room.
 * @param {string} roomId - The ID of the room.
 * @returns {Promise<string[]>} - A promise that resolves to an array of user IDs.
 */
function getParticipants(roomId) {
    return new Promise((resolve, reject) => {
        client.smembers(`room:${roomId}:participants`, (err, users) => {
            if (err) return reject(err);
            resolve(users);
        });
    });
}

/**
 * Get all users in a room.
 * @param {string} roomId - The ID of the room.
 * @returns {Promise<string[]>} - A promise that resolves to an array of user IDs.
 */
function getUsers(roomId) {
    return new Promise((resolve, reject) => {
        client.smembers(`room:${roomId}:users`, (err, users) => {
            if (err) return reject(err);
            resolve(users);
        });
    });
}

module.exports = {
    addUserToRoom,
    removeUserFromRoom,
    getParticipants,
    getUsers,
};
