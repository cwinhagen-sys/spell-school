# Care for Pet - Image Specifications

## Image Structure
All images should be in a consistent style matching the existing `home_breakfast` scenario images.

**Directory Structure:**
```
home_pet/
├── boy/
│   └── intro.png (✅ EXISTS)
├── girl/
│   └── intro.png (✅ EXISTS)
└── shared/
    ├── seg_schedule.png (❌ NEEDED)
    ├── seg_memory.png (❌ NEEDED)
    ├── seg_feeding_rush.png (❌ NEEDED)
    ├── seg_walk.png (❌ NEEDED)
    ├── seg_breakfast.png (❌ NEEDED)
    ├── seg_afternoon.png (❌ NEEDED)
    ├── seg_forgot.png (❌ NEEDED)
    ├── ending_success.png (❌ NEEDED)
    ├── ending_okay.png (❌ NEEDED)
    └── ending_fail.png (❌ NEEDED)
```

---

## Image Descriptions

### 1. `seg_schedule.png`
**Scene:** Kitchen table with a note/paper showing Max's care schedule
**Elements:**
- Kitchen table (wooden or modern)
- A note/paper on the table with handwritten or printed schedule
- The note should be visible but text doesn't need to be readable
- Warm morning light through a window
- Maybe Max visible in background waiting patiently
**Mood:** Organized, clear, helpful

---

### 2. `seg_memory.png`
**Scene:** Child trying to remember, looking confused/thoughtful
**Elements:**
- Child standing in kitchen or hallway
- Hand on head or chin (thinking pose)
- Max nearby looking at child expectantly
- Slightly confused/uncertain expression
- Maybe clock visible showing it's morning
**Mood:** Uncertain, trying to remember, Max waiting

---

### 3. `seg_feeding_rush.png`
**Scene:** Kitchen with Max eating, child rushing, food spilled or too much
**Elements:**
- Max at his food bowl eating quickly
- Food bowl might be overflowing or messy
- Child nearby looking rushed or panicked
- Max might be whining or looking at door
- Kitchen setting, morning light
**Mood:** Rushed, messy, Max uncomfortable

---

### 4. `seg_walk.png`
**Scene:** Child and Max on a morning walk in neighborhood
**Elements:**
- Child holding leash, walking Max
- Neighborhood setting (houses, trees, sidewalk)
- Morning light, fresh atmosphere
- Max happy, sniffing or walking
- Maybe another dog in distance (friendly neighbor dog)
- 30-minute walk feeling (relaxed pace)
**Mood:** Happy, fresh, active, following schedule

---

### 5. `seg_breakfast.png`
**Scene:** Max eating from properly measured food bowl
**Elements:**
- Max at food bowl eating calmly
- Food bowl with correct amount (one cup)
- Fresh water bowl nearby, full
- Child watching or nearby, satisfied
- Clean, organized kitchen
- Morning setting
**Mood:** Proper care, satisfied, following schedule

---

### 6. `seg_afternoon.png`
**Scene:** Backyard playtime - fetch or playing with Max
**Elements:**
- Backyard setting (grass, maybe fence)
- Child throwing ball or playing with Max
- Max running or bringing ball back
- Happy, energetic Max
- Afternoon light (warmer than morning)
- Water bowl visible, being checked/refilled
**Mood:** Fun, energetic, happy Max, afternoon care

**Note:** This image is used for both `afternoon_care` (happy) and `afternoon_care_no_breakfast` (Max slow/tired). Consider if you need two versions or one that works for both.

---

### 7. `seg_forgot.png`
**Scene:** Child realizing they forgot about Max, Max looking sad
**Elements:**
- Child at computer/gaming setup or in room
- Max sitting by door, looking sad
- Empty water bowl visible
- Empty food bowl visible
- Late afternoon/evening light
- Child's face showing realization/guilt
**Mood:** Regret, neglect, Max sad, too late

---

### 8. `ending_success.png`
**Scene:** Evening walk with Max, then Mom arriving home happy
**Elements:**
- Sunset/evening setting
- Child and Max on evening walk (calm, peaceful)
- OR: Mom arriving home, seeing happy Max
- Max looking healthy and happy
- Full food and water bowls visible
- Happy family moment
**Mood:** Success, pride, perfect care, happy ending

---

### 9. `ending_okay.png`
**Scene:** Mom coming home, Max okay but not perfect
**Elements:**
- Mom arriving home
- Max looking okay but not super energetic
- Child explaining or looking slightly guilty
- Maybe missing evening walk (Max inside)
- Food/water given but something missing
- Understanding but slightly disappointed Mom
**Mood:** Partial success, okay but could be better

---

### 10. `ending_fail.png`
**Scene:** Mom coming home to find Max neglected
**Elements:**
- Mom arriving, worried expression
- Max looking sad/weak
- Empty food bowl
- Empty water bowl
- Max hasn't been outside (maybe by door)
- Child looking guilty/sad
- Disappointed Mom
**Mood:** Failure, neglect, sadness, lesson learned

---

## Style Guidelines

**Art Style:**
- Match the style of `home_breakfast` images
- Warm, friendly, child-appropriate
- Clean, simple backgrounds
- Focus on characters and key elements
- Consistent character design (child, Max, Mom)

**Color Palette:**
- Morning scenes: Cool, fresh blues and whites
- Afternoon scenes: Warmer oranges and yellows
- Evening scenes: Warm sunset colors
- Success: Bright, happy colors
- Failure: Muted, sadder tones

**Character Consistency:**
- Max: Medium-sized dog, friendly breed (Labrador, Golden Retriever, or similar)
- Child: Same character design as breakfast scenario
- Mom: Same character design as breakfast scenario

**Technical:**
- Format: PNG with transparency where needed
- Resolution: Match existing images (likely 800x600 or similar)
- Aspect ratio: 4:3 or 16:9 (check existing images)

---

## Priority Order

1. **High Priority (Core Story):**
   - `seg_walk.png` - Morning walk (key moment)
   - `seg_breakfast.png` - Proper feeding (key moment)
   - `ending_success.png` - Best ending
   - `ending_fail.png` - Worst ending

2. **Medium Priority:**
   - `seg_schedule.png` - Important decision point
   - `seg_afternoon.png` - Afternoon playtime
   - `ending_okay.png` - Partial success

3. **Lower Priority:**
   - `seg_memory.png` - Alternative path
   - `seg_feeding_rush.png` - Mistake path
   - `seg_forgot.png` - Worst path

---

## Notes

- Some existing images in the folder might be reusable with renaming
- Consider if `seg_afternoon.png` needs two versions (happy Max vs tired Max)
- All images should tell the story visually without needing text
- Max's emotional state should be clear in each image











