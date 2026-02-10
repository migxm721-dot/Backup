// Updated implementation of AbortController for handling disconnectGraceTimers

let disconnectGraceTimers = new Map();

function addDisconnectGraceTimer(userId, duration) {
    const abortController = new AbortController();
    const timer = setTimeout(() => {
        if (abortController.signal.aborted) return;
        // Perform logout operation
        logoutUser(userId);
    }, duration);
    disconnectGraceTimers.set(userId, {timer, abortController});
}

function reconnectUser(userId) {
    const timerInfo = disconnectGraceTimers.get(userId);
    if (timerInfo) {
        timerInfo.abortController.abort();
        clearTimeout(timerInfo.timer);
        disconnectGraceTimers.delete(userId);
        // Continue with user's reconnection logic
    }
}

function logoutUser(userId) {
    // Logic to logout user
    console.log(`User ${userId} has been logged out.`);
}