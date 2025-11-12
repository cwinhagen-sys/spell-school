# Quest Sync System - Robust Daily Quest & XP Synchronization

## Overview

This system provides **atomic, idempotent quest synchronization** that guarantees quest progress and XP are never lost, even if users immediately close tabs or log out after completing quests.

## Key Features

✅ **Atomic Operations**: Quest completion and XP awards happen in single database transactions  
✅ **Idempotent**: Duplicate events are safely ignored (no double XP awards)  
✅ **Durable**: Uses IndexedDB + sendBeacon to survive tab closure  
✅ **Automatic Retry**: Failed events are automatically retried on app startup  
✅ **Offline Support**: Events are queued and sent when connection is restored  

## Architecture

### Server Side (`/api/quest-sync`)

- **Atomic RPC Functions**: Uses Supabase Postgres functions for atomic quest + XP operations
- **Idempotency Tracking**: `quest_event_applied` table prevents duplicate processing
- **Server-Determined Dates**: Uses server timezone/UTC to prevent client manipulation

### Client Side (`questOutbox.ts`)

- **Outbox Pattern**: Events are queued locally before sending to server
- **IndexedDB Storage**: Primary storage with localStorage fallback
- **sendBeacon**: Reliable delivery on tab close/page unload
- **Automatic Retry**: Failed events are retried on app startup and network restoration

## Database Schema

```sql
-- Quest progress tracking (one row per user/quest/date)
daily_quest_progress (
  user_id UUID,
  quest_id TEXT,
  quest_date DATE,
  progress INTEGER,
  completed_at TIMESTAMPTZ,
  xp_awarded BOOLEAN
)

-- Idempotency tracking (prevents duplicate events)
quest_event_applied (
  idempotency_key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ,
  user_id UUID,
  event_type TEXT,
  quest_id TEXT
)
```

## Usage

### Quest Progress Updates

```typescript
import { enqueueQuestProgress } from '@/lib/questOutbox'

// When quest progress changes
enqueueQuestProgress('speed_god', 1) // Increment progress by 1
```

### Quest Completion

```typescript
import { enqueueQuestComplete } from '@/lib/questOutbox'

// When quest is completed
enqueueQuestComplete('speed_god', 50) // Award 50 XP
```

### Automatic Integration

The system is automatically integrated into existing quest completion logic in `student/page.tsx`:

- Quest progress updates are automatically queued
- Quest completions are automatically queued
- Both immediate sync (for speed) and outbox sync (for reliability) are used

## How It Works

### 1. Quest Completion Flow

```
User completes quest
    ↓
UI updates immediately (local state)
    ↓
Event queued in outbox (IndexedDB/localStorage)
    ↓
Immediate sync attempt (non-blocking)
    ↓
On page close: sendBeacon ensures delivery
    ↓
On next login: Outbox automatically retries failed events
```

### 2. Server Processing

```
Event received with idempotency key
    ↓
Check if event already processed
    ↓
If new: Process in atomic transaction
    ↓
Update quest progress OR complete quest + award XP
    ↓
Mark event as processed
    ↓
Return success (event can be safely cleared from client)
```

### 3. Idempotency Protection

- Each event has a unique UUID as idempotency key
- Server tracks processed events in `quest_event_applied`
- Duplicate events are safely ignored
- No risk of double XP awards

## Testing the System

### 1. Basic Quest Completion
1. Complete a daily quest (e.g., Speed God)
2. Verify XP is awarded immediately
3. Check browser console for outbox events

### 2. Tab Close Test
1. Complete a quest
2. Immediately close the tab (Ctrl+W)
3. Reopen and login
4. Verify quest completion and XP are still there

### 3. Network Failure Test
1. Disconnect internet
2. Complete a quest (should still work locally)
3. Reconnect internet
4. Verify quest syncs automatically

### 4. Duplicate Event Test
1. Complete a quest
2. Manually trigger the same event multiple times
3. Verify only one XP award occurs

## Monitoring & Debugging

### Client Side
```typescript
import { questOutbox } from '@/lib/questOutbox'

// Check outbox status
const status = await questOutbox.getStatus()
console.log('Pending events:', status.pendingCount)
```

### Server Side
- Check `/api/quest-sync` logs for processing details
- Monitor `quest_event_applied` table for duplicate detection
- Check `daily_quest_progress` for quest state

## Database Setup

Run the SQL schema in `quest-sync-schema.sql` to set up:

1. Required tables (`daily_quest_progress`, `quest_event_applied`)
2. Atomic RPC functions (`upsert_quest_progress`, `complete_quest_and_award_xp`)
3. Row Level Security policies
4. Performance indexes

## Performance Considerations

- **IndexedDB**: Fast local storage with large capacity
- **sendBeacon**: Non-blocking delivery on page close
- **Batch Processing**: Multiple events sent in single request
- **Automatic Cleanup**: Old events cleaned up after 30 days

## Error Handling

- **Network Failures**: Events retried automatically
- **Server Errors**: Events preserved for retry
- **Storage Failures**: Graceful fallback to localStorage
- **Duplicate Events**: Safely ignored with idempotency

## Security

- **Server-Side Auth**: User ID from session, not client
- **Server-Side Dates**: No client date manipulation
- **Idempotency**: Prevents replay attacks
- **RLS Policies**: Database-level access control

## Future Enhancements

- **Service Worker**: Background sync for offline scenarios
- **Conflict Resolution**: Handle simultaneous multi-device usage
- **Analytics**: Track sync success rates and failure patterns
- **Compression**: Reduce payload size for large event batches
