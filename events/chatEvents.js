// In events/chatEvents.js

async function sendMessage(socket, message, roomId, username) {
    if (!socket.rooms.has('room:' + roomId) || !(await redis.sIsMember('room:participants:' + roomId, username))) {
        socket.emit('error', {message: 'Not in room'});
        return;
    }
    // Existing message send logic...
}