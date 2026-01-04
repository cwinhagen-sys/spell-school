# Care for Pet - Branching Map

## Legend
- `[+1]` = Quality Impact +1 (good choice)
- `[0]` = Quality Impact 0 (neutral choice)
- `[-1]` = Quality Impact -1 (bad choice)
- `⭐` = Ending with stars

---

## START: `intro`

**Choices:**
1. "Try to remember what Mom usually does" `[0]` → `memory_segment`
2. "Just give him food right away" `[-1]` → `feeding_rush`
3. "Check the care schedule Mom left" `[+1]` → `schedule_segment`

---

## `schedule_segment`
*Shows the schedule: 1) Morning walk, 2) Breakfast, 3) Fresh water, 4) Playtime, 5) Evening walk*

**Choices:**
1. "Do everything later, play games first" `[-1]` → `forgot_care`
2. "Start with the morning walk" `[+1]` → `morning_walk`
3. "Start with breakfast" `[-1]` → `feeding_rush`

---

## `memory_segment`
*Trying to remember what Mom does*

**Choices:**
1. "Just give him food and water" `[-1]` → `feeding_rush`
2. "Look for a schedule or note on the kitchen table" `[+1]` → `schedule_segment`
3. "Guess: take him outside first, then feed" `[0]` → `morning_walk`

---

## `feeding_rush`
*Fed Max without measuring, now he's whining*

**Choices:**
1. "Ignore him, he will be fine" `[-1]` → `ending_poor_care` ⭐ (1 star - FAIL)
2. "Check the schedule to see what you missed" `[+1]` → `schedule_segment` (loop back)
3. "Take him outside" `[+1]` → `morning_walk`

---

## `morning_walk`
*Completed 30-minute morning walk*

**Choices:**
1. "Play with him first" `[-1]` → `afternoon_care_no_breakfast`
2. "Give Max breakfast" `[+1]` → `breakfast_careful`
3. "Skip breakfast, he already walked" `[-1]` → `afternoon_care_no_breakfast`

---

## `breakfast_careful`
*Fed Max one cup of food and gave fresh water*

**Choices:**
1. "Do the evening walk now" `[-1]` → `afternoon_care`
2. "Forget about afternoon care" `[0]` → `ending_okay_care` ⭐ (2 stars - PARTIAL)
3. "Plan playtime for the afternoon" `[+1]` → `afternoon_care`

---

## `afternoon_care_no_breakfast`
*Max is slow and tired - no breakfast given!*

**Choices:**
1. "Give Max food right away" `[0]` → `late_breakfast`
2. "He will be fine, continue playing" `[-1]` → `ending_missing_food` ⭐ (1 star - FAIL)
3. "Check the schedule to see what you missed" `[+1]` → `schedule_segment` (loop back)

---

## `late_breakfast`
*Gave Max food late - he was really hungry*

**Choices:**
1. "Take Max for his evening walk" `[0]` → `ending_missing_breakfast` ⭐ (1-2 stars - PARTIAL)
2. "Skip the evening walk, he is too tired" `[-1]` → `ending_missing_breakfast` ⭐ (1-2 stars - PARTIAL)

---

## `afternoon_care`
*Played with Max, he's happy and healthy*

**Choices:**
1. "Skip the evening walk" `[0]` → `ending_okay_care` ⭐ (2 stars - PARTIAL)
2. "Do another morning walk instead" `[-1]` → `ending_okay_care` ⭐ (2 stars - PARTIAL)
3. "Take Max for his evening walk" `[+1]` → `ending_excellent_care` ⭐ (3 stars - SUCCESS)

---

## `forgot_care`
*Forgot about Max while playing games*

**Choices:**
1. "Try to fix it and take him outside" `[0]` → `ending_okay_care` ⭐ (2 stars - PARTIAL)
2. "Give up, it is too late" `[-1]` → `ending_poor_care` ⭐ (1 star - FAIL)
3. "Call Mom to ask for help" `[-1]` → `ending_poor_care` ⭐ (1 star - FAIL)

---

## ENDINGS

### ⭐⭐⭐ `ending_excellent_care` (3 stars - SUCCESS)
**Path:** intro → schedule_segment → morning_walk → breakfast_careful → afternoon_care → evening_walk
- Followed full schedule perfectly
- All 5 items completed: morning walk, breakfast, water, playtime, evening walk

### ⭐⭐ `ending_okay_care` (2 stars - PARTIAL)
**Paths:**
- intro → schedule_segment → morning_walk → breakfast_careful → forget_afternoon
- intro → schedule_segment → morning_walk → breakfast_careful → afternoon_care → skip_evening
- intro → schedule_segment → morning_walk → breakfast_careful → afternoon_care → do_morning_walk_again
- intro → schedule_segment → do_later → forgot_care → try_fix
- Missing evening walk OR forgot afternoon care

### ⭐⭐ `ending_missing_breakfast` (1-2 stars - PARTIAL)
**Path:** intro → ... → morning_walk → skip_breakfast/play_first → afternoon_care_no_breakfast → late_breakfast → ...
- Breakfast given late (in afternoon)
- Max is okay but not as energetic

### ⭐ `ending_poor_care` (1 star - FAIL)
**Paths:**
- intro → just_feed_him → feeding_rush → ignore_whining
- intro → schedule_segment → do_later → forgot_care → give_up
- intro → schedule_segment → do_later → forgot_care → call_mom
- Max not taken outside, water bowl empty, no proper care

### ⭐ `ending_missing_food` (1 star - FAIL)
**Path:** intro → ... → morning_walk → skip_breakfast/play_first → afternoon_care_no_breakfast → ignore_hunger
- Max never got breakfast
- Mom finds empty food bowl

---

## Key Paths Summary

### Best Path (3 stars):
1. intro → "Check the care schedule" `[+1]`
2. schedule_segment → "Start with the morning walk" `[+1]`
3. morning_walk → "Give Max breakfast" `[+1]`
4. breakfast_careful → "Plan playtime for the afternoon" `[+1]`
5. afternoon_care → "Take Max for his evening walk" `[+1]`
6. ending_excellent_care ⭐⭐⭐

### Worst Paths (1 star):
- Skip breakfast and ignore hunger → `ending_missing_food`
- Feed wrong way and ignore → `ending_poor_care`
- Forget everything → `ending_poor_care`

### Loop Points:
- `schedule_segment` can be reached from: intro, memory_segment, feeding_rush, afternoon_care_no_breakfast
- `morning_walk` can be reached from: schedule_segment, memory_segment, feeding_rush

---

## Total Segments: 15
- 1 intro
- 4 intermediate segments (schedule_segment, memory_segment, feeding_rush, morning_walk)
- 3 breakfast segments (breakfast_careful, afternoon_care_no_breakfast, late_breakfast)
- 2 afternoon segments (afternoon_care, forgot_care)
- 5 endings (ending_excellent_care, ending_okay_care, ending_missing_breakfast, ending_poor_care, ending_missing_food)












