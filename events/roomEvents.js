// Updated leaveRoom handler
events.leaveRoom = function(socket, roomId) {
    socket.leave('room:' + roomId); // Leave the room
    // Redis cleanup operations
    const participantKey = 'participants:' + roomId;
    redisClient.srem(participantKey, socket.id, (err, res) => {
        if (err) {
            console.error('Error removing participant from Redis:', err);
        }
    });
    // other cleanup code...
};
