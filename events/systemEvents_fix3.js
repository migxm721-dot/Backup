// systemEvents_fix3.js

/**
 * Full systemEventsHandler implementation
 */
function systemEventsHandler() {
    const abortController = new AbortController();

    const handleDisconnect = () => {
        console.log('User disconnected. Starting grace period.');
        const timeoutId = setTimeout(() => {
            console.log('Grace period ended. User can now reconnect.');
            abortController.abort(); // Abort the controller to prevent any ongoing process
        }, 30000); // 30 seconds grace period

        return () => {
            clearTimeout(timeoutId); // Clear the timeout if needed
            abortController.abort(); // Abort on reconnect to prevent race condition
        };
    };

    // Simulate user disconnect
    let onDisconnect = handleDisconnect();

    // Simulate user reconnect after 10 seconds
    setTimeout(() => {
        console.log('User reconnected.');
        onDisconnect(); // Call the return function from handleDisconnect
    }, 10000);
}

// Example usage of systemEventsHandler
systemEventsHandler();
