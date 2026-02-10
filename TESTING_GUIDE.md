# Testing Guide - Silent Reconnect Feature

## Overview
This guide provides step-by-step instructions for testing the Silent Reconnect + Extended Grace Period feature.

## Prerequisites
- Server running with the new implementation
- Mobile app or web client with updated socket event handlers
- Test user account(s)
- Access to server logs for debugging

## Test Scenarios

### ✅ Test 1: First Join Shows "Has Entered"

**Objective**: Verify that joining a room for the first time shows the "has entered" message.

**Steps**:
1. Start the server
2. Open the mobile app or web client
3. Login as User A
4. Join a chatroom (Room X)
5. Observe the chat messages

**Expected Result**:
- ✅ Other users in Room X see: "User A has entered the chat"
- ✅ User A successfully joins the room
- ✅ Participant list updates with User A

**Server Logs to Check**:
```
[Room Join] User A (userId) joining room X
[Room Join] First join - broadcasting "User A has entered"
```

---

### ✅ Test 2: Page Refresh - Silent Reconnect

**Objective**: Verify that refreshing the page does NOT show "has entered" message.

**Steps**:
1. User A is in Room X
2. User A refreshes the browser page (or force-closes and reopens the app)
3. App automatically calls `rejoinRoom` event
4. Observe the chat messages

**Expected Result**:
- ✅ User A rejoins Room X silently
- ❌ NO "has entered" message shown to other users
- ✅ Participant list still shows User A
- ✅ Chat history loads correctly

**Server Logs to Check**:
```
🔌 Client disconnected: socketId | User: User A | Reason: transport close
⏱️  User User A disconnected from room X, starting 30 minute grace period
✅ Client connected: newSocketId | User: User A
✅ Disconnect grace timer cancelled for User A - reconnected
[Room Rejoin] Silent rejoin: User A (userId) to room X
```

---

### ✅ Test 3: App Minimize (5 Minutes) - Silent Reconnect

**Objective**: Verify that minimizing the app for 5 minutes allows silent reconnection.

**Steps**:
1. User A is in Room X on mobile app
2. User A minimizes the app (home button)
3. Wait 5 minutes
4. User A opens the app again
5. App automatically calls `rejoinRoom` event

**Expected Result**:
- ✅ User A rejoins Room X silently
- ❌ NO "has entered" message shown
- ✅ Grace period timer was cancelled
- ✅ User remained in participant list during minimize

**Server Logs to Check**:
```
⏱️  User User A disconnected from room X, starting 30 minute grace period
// ... 5 minutes later ...
✅ Disconnect grace timer cancelled for User A - reconnected
[Room Rejoin] Silent rejoin: User A (userId) to room X
```

---

### ✅ Test 4: App Close (29 Minutes) - Silent Reconnect

**Objective**: Verify that closing the app for 29 minutes (within grace period) allows silent reconnection.

**Steps**:
1. User A is in Room X
2. User A force-closes the app completely
3. Wait 29 minutes
4. User A opens the app and logs in
5. App automatically calls `rejoinRoom` event

**Expected Result**:
- ✅ User A rejoins Room X silently
- ❌ NO "has entered" message shown
- ✅ Grace period timer was cancelled (1 minute remaining)
- ✅ User remained in participant list for 29 minutes

**Server Logs to Check**:
```
⏱️  User User A disconnected from room X, starting 30 minute grace period
// ... 29 minutes later ...
✅ Cancelled disconnect timer for user userId after ~1740s
[Room Rejoin] Silent rejoin: User A (userId) to room X
```

---

### ✅ Test 5: App Close (31 Minutes) - Grace Period Expired

**Objective**: Verify that closing the app for 31 minutes (beyond grace period) requires a new join.

**Steps**:
1. User A is in Room X
2. User A force-closes the app
3. Wait 31 minutes
4. User A opens the app and logs in
5. App tries to `rejoinRoom` but should use `joinRoom` instead

**Expected Result**:
- ✅ Grace period expired after 30 minutes
- ✅ User A removed from Room X automatically
- ✅ New join shows "has entered" message
- ✅ Participant list updated correctly

**Server Logs to Check**:
```
⏱️  User User A disconnected from room X, starting 30 minute grace period
// ... 30 minutes later ...
⏰ Grace period expired for User A (userId), cleaning up...
// ... 1 minute later (31 min total) ...
[Room Join] User A (userId) joining room X
[Room Join] First join - broadcasting "User A has entered"
```

---

### ✅ Test 6: Explicit Leave Shows "Has Left"

**Objective**: Verify that clicking "Leave Room" button shows the "has left" message.

**Steps**:
1. User A is in Room X
2. User A clicks "Leave Room" button
3. App calls `leaveRoom` event
4. Observe the chat messages

**Expected Result**:
- ✅ Other users in Room X see: "User A has left the chat"
- ✅ User A removed from participant list
- ✅ User A navigates away from chatroom
- ❌ NO grace period timer started

**Server Logs to Check**:
```
[Room Leave] Explicit leave: User A (userId) from room X
```

---

### ✅ Test 7: Network Disconnect (2 Minutes) - Silent Reconnect

**Objective**: Verify that losing network connection and reconnecting shows no message.

**Steps**:
1. User A is in Room X
2. User A loses network (airplane mode or network disconnection)
3. Wait 2 minutes
4. User A reconnects to network
5. App automatically reconnects and calls `rejoinRoom`

**Expected Result**:
- ✅ User A rejoins Room X silently
- ❌ NO "has entered" message shown
- ✅ Grace period timer cancelled
- ✅ Chat messages sent during disconnect are received after reconnect

**Server Logs to Check**:
```
🔌 Client disconnected: socketId | User: User A | Reason: ping timeout
⏱️  User User A disconnected from room X, starting 30 minute grace period
// ... 2 minutes later ...
✅ Client connected: newSocketId | User: User A
✅ Disconnect grace timer cancelled for User A - reconnected
[Room Rejoin] Silent rejoin: User A (userId) to room X
```

---

### ✅ Test 8: Switch Between Rooms

**Objective**: Verify that switching between rooms shows "has entered" on first join to each room.

**Steps**:
1. User A joins Room X
2. User A leaves Room X (explicit leave)
3. User A joins Room Y
4. User A leaves Room Y (explicit leave)
5. User A joins Room X again

**Expected Result**:
- ✅ Join Room X: Shows "User A has entered the chat"
- ✅ Leave Room X: Shows "User A has left the chat"
- ✅ Join Room Y: Shows "User A has entered the chat" (first join to Y)
- ✅ Leave Room Y: Shows "User A has left the chat"
- ✅ Rejoin Room X: Shows "User A has entered the chat" (re-enter after explicit leave)

**Server Logs to Check**:
```
[Room Join] User A joining room X
[Room Join] First join - broadcasting "User A has entered"
[Room Leave] Explicit leave: User A from room X
[Room Join] User A joining room Y
[Room Join] First join - broadcasting "User A has entered"
[Room Leave] Explicit leave: User A from room Y
[Room Join] User A joining room X
[Room Join] First join - broadcasting "User A has entered"
```

---

### ✅ Test 9: Multiple Users - Participant Count

**Objective**: Verify that participant count updates correctly during join/leave/reconnect.

**Steps**:
1. Room X starts with 0 users
2. User A joins Room X
3. User B joins Room X
4. User A refreshes page (silent reconnect)
5. User C joins Room X
6. User B leaves explicitly

**Expected Result**:
- After step 2: Count = 1, participants = [User A]
- After step 3: Count = 2, participants = [User A, User B]
- After step 4: Count = 2, participants = [User A, User B] (no change)
- After step 5: Count = 3, participants = [User A, User B, User C]
- After step 6: Count = 2, participants = [User A, User C]

---

### ✅ Test 10: Mobile Heartbeat

**Objective**: Verify that mobile heartbeat events work correctly.

**Steps**:
1. User A on mobile app is in Room X
2. App sends `heartbeat` event with `appState: 'foreground'`
3. User A minimizes app
4. App sends `heartbeat` event with `appState: 'background'`
5. User A opens app
6. App sends `heartbeat` event with `appState: 'foreground'`

**Expected Result**:
- ✅ Server receives all heartbeat events
- ✅ Server responds with `heartbeat:ack` containing timestamp and gracePeriod
- ✅ App state changes logged in server

**Server Logs to Check**:
```
📱 App state change for User A: unknown -> foreground
📱 App state change for User A: foreground -> background
📱 App state change for User A: background -> foreground
```

---

## Performance Tests

### Test 11: Grace Period Memory Usage

**Objective**: Verify that grace period timers don't cause memory leaks.

**Steps**:
1. Monitor server memory usage
2. Have 100 users disconnect simultaneously
3. Wait 31 minutes
4. Check server memory

**Expected Result**:
- ✅ 100 timers created (memory increase expected)
- ✅ All 100 timers cleaned up after 30 minutes
- ✅ Memory returns to baseline after cleanup
- ✅ No memory leaks detected

---

### Test 12: Rapid Connect/Disconnect

**Objective**: Verify that rapid connect/disconnect cycles are handled correctly.

**Steps**:
1. User A connects
2. User A disconnects (1 second later)
3. User A connects (1 second later)
4. User A disconnects (1 second later)
5. User A connects (1 second later)
6. Repeat 10 times

**Expected Result**:
- ✅ Each disconnect starts a grace period timer
- ✅ Each reconnect cancels the previous timer
- ✅ No timer accumulation
- ✅ No duplicate timers for same userId
- ✅ Server remains stable

---

## Debugging Tips

### Check Server Logs
```bash
# Follow server logs in real-time
tail -f server.log

# Search for specific user activity
grep "User A" server.log

# Check grace period activity
grep "grace period" server.log

# Check room join/leave events
grep "\[Room" server.log
```

### Monitor Socket Connections
```javascript
// In browser console
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
socket.on('room:userEntered', (data) => console.log('User entered:', data));
socket.on('room:userLeft', (data) => console.log('User left:', data));
```

### Check Redis Data
```bash
# Check room participants
redis-cli SMEMBERS room:users:ROOM_ID

# Check user room mapping
redis-cli GET user:room:USERNAME

# Check all grace period keys (if stored in Redis)
redis-cli KEYS disconnect:*
```

---

## Success Criteria Summary

✅ First join shows "has entered" message  
✅ Refresh/reconnect does NOT show "has entered"  
✅ Explicit leave shows "has left" message  
✅ Disconnect does NOT show "has left"  
✅ Grace period works for 30 minutes  
✅ Grace period expiry removes user silently  
✅ Mobile heartbeat events work  
✅ Participant count always accurate  
✅ No memory leaks from timers  
✅ Android 10-15 compatibility  

---

## Common Issues & Solutions

### Issue: User sees "has entered" on every reconnect
**Solution**: App must use `rejoinRoom` event instead of `joinRoom` for reconnections

### Issue: Grace period not working
**Solution**: Check that server correctly imports `addDisconnectGraceTimer` and `cancelDisconnectTimer`

### Issue: User removed too quickly
**Solution**: Verify `DISCONNECT_GRACE_PERIOD = 1800000` (30 minutes)

### Issue: Duplicate "has entered" messages
**Solution**: Check that `socket.joinedRooms` Set is properly maintained

---

**Testing Completed By**: _______________________  
**Testing Date**: _______________________  
**All Tests Passed**: ☐ Yes ☐ No  
**Notes**: _______________________
