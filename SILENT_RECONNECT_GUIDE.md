# Silent Reconnect & Extended Grace Period - Implementation Guide

## Overview
This feature implements a 30-minute grace period for disconnected users, allowing them to reconnect silently without spamming "has entered" messages in the chatroom.

## Key Features

### 1. Extended Grace Period (30 minutes)
- Users remain in the chatroom for **30 minutes** after disconnection
- Disconnection can be caused by:
  - Closing the app
  - Minimizing the app
  - Losing network connection
  - Refreshing the page
- After 30 minutes, the user is automatically removed from the room

### 2. Silent Reconnection
- When a user reconnects within the grace period, they silently rejoin
- **NO "has entered" message** is broadcast to the room
- Other users don't see notification spam

### 3. First Join Only Message
- "has entered" message is **only shown on first join**
- Not shown on:
  - Reconnections after disconnect
  - Page refreshes
  - App minimize/restore
  - Network reconnections

### 4. Explicit Leave Message
- "has left" message is **only shown on explicit leave**
- Shown when user clicks "Leave Room" button
- **NOT shown** on:
  - App close
  - Network disconnect
  - App minimize
  - Grace period timeout

## Socket Events

### Client → Server Events

#### 1. `joinRoom` - First-time room join
```javascript
socket.emit('joinRoom', {
  roomId: 'room123',
  userId: 'user456',
  username: 'JohnDoe'
});

// Success response
socket.on('joinRoom:success', (data) => {
  console.log('Joined room:', data);
  // data: { roomId, room, userCount, participants, level }
});

// Error response
socket.on('joinRoom:error', (data) => {
  console.error('Failed to join:', data.error);
});
```

#### 2. `rejoinRoom` - Silent reconnection
```javascript
// Use this when reconnecting after disconnect/minimize/refresh
socket.emit('rejoinRoom', {
  roomId: 'room123',
  userId: 'user456',
  username: 'JohnDoe',
  silent: true  // Default: true, set false to broadcast "has entered"
});

// Success response
socket.on('rejoinRoom:success', (data) => {
  console.log('Silently rejoined room:', data);
  // data: { roomId, room, userCount, participants }
});

// Error response
socket.on('rejoinRoom:error', (data) => {
  console.error('Failed to rejoin:', data.error);
});
```

#### 3. `leaveRoom` - Explicit leave
```javascript
// Use this when user clicks "Leave Room" button
socket.emit('leaveRoom', {
  roomId: 'room123',
  userId: 'user456',
  username: 'JohnDoe'
});

// Success response
socket.on('leaveRoom:success', (data) => {
  console.log('Left room:', data);
});
```

### Server → Client Events

#### 1. `room:userEntered` - User joined notification
```javascript
socket.on('room:userEntered', (data) => {
  console.log(`${data.username} has entered the chat`);
  // data: { username, userId, message, userCount, timestamp }
  
  // Display system message in chat
  displaySystemMessage(data.message);
});
```

#### 2. `room:userLeft` - User left notification
```javascript
socket.on('room:userLeft', (data) => {
  console.log(`${data.username} has left the chat`);
  // data: { username, userId, message, userCount, timestamp }
  
  // Display system message in chat
  displaySystemMessage(data.message);
});
```

#### 3. `room:userListUpdate` - User count updated
```javascript
socket.on('room:userListUpdate', (data) => {
  console.log('User list updated:', data.userCount);
  // data: { userCount, participants }
  
  // Update UI with new user count and list
  updateUserCount(data.userCount);
  updateParticipantsList(data.participants);
});
```

## Mobile-Specific Features

### Heartbeat Monitoring
```javascript
// Send heartbeat with app state
socket.emit('heartbeat', {
  appState: 'foreground' // or 'background'
});

socket.on('heartbeat:ack', (data) => {
  console.log('Heartbeat acknowledged, grace period:', data.gracePeriod);
  // data: { timestamp, gracePeriod: 1800000 }
});
```

### Socket Configuration (Already Optimized)
- **Ping Timeout**: 90 seconds (mobile-friendly)
- **Ping Interval**: 30 seconds (battery-optimized)
- **Grace Period**: 30 minutes (1,800,000 ms)

## Implementation Workflow

### Initial Join Flow
```
1. User opens chatroom
2. Client sends 'joinRoom' event
3. Server validates access
4. Server broadcasts "has entered" to others
5. Server sends 'joinRoom:success' to user
6. Client displays chatroom with participants
```

### Reconnect Flow (After Disconnect)
```
1. User reconnects (within 30 min grace period)
2. Client detects previous room session
3. Client sends 'rejoinRoom' with silent: true
4. Server cancels grace period timer
5. Server restores socket membership
6. Server sends 'rejoinRoom:success' (NO broadcast)
7. Client resumes chatroom (no spam messages)
```

### Explicit Leave Flow
```
1. User clicks "Leave Room" button
2. Client sends 'leaveRoom' event
3. Server removes user from room
4. Server broadcasts "has left" to others
5. Server sends 'leaveRoom:success' to user
6. Client navigates away from chatroom
```

### Disconnect Flow
```
1. User disconnects (network/app close/minimize)
2. Server starts 30-minute grace period timer
3. User STAYS in Redis participants list
4. If user reconnects before 30 min:
   → Grace timer cancelled
   → Use 'rejoinRoom' for silent reconnection
5. If 30 minutes pass:
   → User removed from room automatically
   → NO "has left" message broadcast
```

## Best Practices for Frontend

### 1. Track Connection State
```javascript
let currentRoomId = null;
let isFirstJoin = true;

socket.on('connect', () => {
  if (currentRoomId && !isFirstJoin) {
    // Reconnecting to existing room - use rejoinRoom
    socket.emit('rejoinRoom', {
      roomId: currentRoomId,
      userId: getCurrentUserId(),
      username: getCurrentUsername(),
      silent: true
    });
  }
});

socket.on('joinRoom:success', (data) => {
  currentRoomId = data.roomId;
  isFirstJoin = false;
});

socket.on('leaveRoom:success', () => {
  currentRoomId = null;
  isFirstJoin = true;
});
```

### 2. Handle Mobile App State
```javascript
// Android example (React Native)
import { AppState } from 'react-native';

AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    // App came to foreground
    socket.emit('heartbeat', { appState: 'foreground' });
  } else if (nextAppState === 'background') {
    // App went to background
    socket.emit('heartbeat', { appState: 'background' });
  }
});
```

### 3. Persist Room State
```javascript
// Store room info in AsyncStorage/localStorage
const storeRoomState = async (roomId) => {
  await AsyncStorage.setItem('lastRoomId', roomId);
  await AsyncStorage.setItem('lastRoomTime', Date.now().toString());
};

const restoreRoomState = async () => {
  const roomId = await AsyncStorage.getItem('lastRoomId');
  const lastTime = await AsyncStorage.getItem('lastRoomTime');
  
  if (roomId && lastTime) {
    const elapsed = Date.now() - parseInt(lastTime);
    const GRACE_PERIOD = 1800000; // 30 minutes
    
    if (elapsed < GRACE_PERIOD) {
      // Within grace period - rejoin silently
      return { roomId, shouldRejoin: true };
    } else {
      // Grace period expired - clear state
      await AsyncStorage.removeItem('lastRoomId');
      await AsyncStorage.removeItem('lastRoomTime');
    }
  }
  return { roomId: null, shouldRejoin: false };
};
```

## Testing Scenarios

### ✅ Scenario 1: First Join
- **Action**: User opens chatroom for the first time
- **Expected**: "JohnDoe has entered the chat" shown to others

### ✅ Scenario 2: Page Refresh
- **Action**: User refreshes page (within 30 min)
- **Expected**: User rejoins silently, NO message shown

### ✅ Scenario 3: App Minimize (5 minutes)
- **Action**: User minimizes app for 5 minutes, then returns
- **Expected**: User rejoins silently, NO message shown

### ✅ Scenario 4: App Close (29 minutes)
- **Action**: User closes app, reopens after 29 minutes
- **Expected**: User rejoins silently, NO message shown

### ✅ Scenario 5: App Close (31 minutes)
- **Action**: User closes app, reopens after 31 minutes
- **Expected**: Grace period expired, user must join as new (shows "has entered")

### ✅ Scenario 6: Explicit Leave
- **Action**: User clicks "Leave Room" button
- **Expected**: "JohnDoe has left the chat" shown to others

### ✅ Scenario 7: Network Disconnect
- **Action**: User loses network for 2 minutes, reconnects
- **Expected**: User rejoins silently, NO message shown

## Android Compatibility

Tested and optimized for:
- ✅ Android 10
- ✅ Android 11
- ✅ Android 12
- ✅ Android 13
- ✅ Android 14
- ✅ Android 15

## Configuration

Server-side constants (in `events/systemEvents.js`):
```javascript
const DISCONNECT_GRACE_PERIOD = 1800000; // 30 minutes (configurable)
```

To change the grace period:
1. Edit `events/systemEvents.js`
2. Update `DISCONNECT_GRACE_PERIOD` value (in milliseconds)
3. Restart server

## Summary

| Event | When to Use | Broadcasts Message? |
|-------|-------------|---------------------|
| `joinRoom` | First-time join | ✅ Yes - "has entered" |
| `rejoinRoom` | Reconnect after disconnect | ❌ No (silent) |
| `leaveRoom` | Explicit leave button click | ✅ Yes - "has left" |
| Disconnect | Network loss, app close, minimize | ❌ No (grace period starts) |
| Grace timeout | 30 min after disconnect | ❌ No (silent removal) |

This implementation eliminates message spam while maintaining user experience continuity across network issues and app state changes.
