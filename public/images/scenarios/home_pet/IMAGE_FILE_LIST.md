# Care for Pet - Exact File Names and Locations

## Directory Structure
```
public/images/scenarios/home_pet/
├── boy/
│   └── intro.png ✅ (EXISTS)
├── girl/
│   └── intro.png ✅ (EXISTS)
└── shared/
    ├── seg_schedule.png ❌ (NEEDED)
    ├── seg_memory.png ❌ (NEEDED)
    ├── seg_feeding_rush.png ❌ (NEEDED)
    ├── seg_walk.png ❌ (NEEDED)
    ├── seg_breakfast.png ❌ (NEEDED)
    ├── seg_afternoon.png ❌ (NEEDED)
    ├── seg_forgot.png ❌ (NEEDED)
    ├── ending_success.png ❌ (NEEDED)
    ├── ending_okay.png ❌ (NEEDED)
    └── ending_fail.png ❌ (NEEDED)
```

---

## Exact File Names Required

### Intro Images (Already Exist ✅)
- `public/images/scenarios/home_pet/boy/intro.png` ✅
- `public/images/scenarios/home_pet/girl/intro.png` ✅

### Shared Segment Images (Need to Create ❌)

1. **`seg_schedule.png`**
   - Location: `public/images/scenarios/home_pet/shared/seg_schedule.png`
   - Used in: `schedule_segment`
   - Scene: Kitchen table with schedule note

2. **`seg_memory.png`**
   - Location: `public/images/scenarios/home_pet/shared/seg_memory.png`
   - Used in: `memory_segment`
   - Scene: Child thinking, trying to remember

3. **`seg_feeding_rush.png`**
   - Location: `public/images/scenarios/home_pet/shared/seg_feeding_rush.png`
   - Used in: `feeding_rush`
   - Scene: Max eating too much, whining, looking at door

4. **`seg_walk.png`**
   - Location: `public/images/scenarios/home_pet/shared/seg_walk.png`
   - Used in: `morning_walk`
   - Scene: Child and Max on morning walk (30 minutes)

5. **`seg_breakfast.png`**
   - Location: `public/images/scenarios/home_pet/shared/seg_breakfast.png`
   - Used in: `breakfast_careful` AND `late_breakfast`
   - Scene: Max eating properly measured food, water bowl full

6. **`seg_afternoon.png`**
   - Location: `public/images/scenarios/home_pet/shared/seg_afternoon.png`
   - Used in: `afternoon_care` AND `afternoon_care_no_breakfast`
   - Scene: Playing fetch in backyard (Max happy OR Max tired/slow)

7. **`seg_forgot.png`**
   - Location: `public/images/scenarios/home_pet/shared/seg_forgot.png`
   - Used in: `forgot_care`
   - Scene: Child at computer/games, Max sad by door, empty bowls

### Ending Images (Need to Create ❌)

8. **`ending_success.png`**
   - Location: `public/images/scenarios/home_pet/shared/ending_success.png`
   - Used in: `ending_excellent_care` (3 stars)
   - Scene: Evening walk OR Mom arriving to happy Max

9. **`ending_okay.png`**
   - Location: `public/images/scenarios/home_pet/shared/ending_okay.png`
   - Used in: `ending_okay_care` (2 stars) AND `ending_missing_breakfast` (1-2 stars)
   - Scene: Mom arriving, Max okay but not perfect

10. **`ending_fail.png`**
    - Location: `public/images/scenarios/home_pet/shared/ending_fail.png`
    - Used in: `ending_poor_care` (1 star) AND `ending_missing_food` (1 star)
    - Scene: Mom arriving, Max sad/neglected, empty bowls

---

## Summary: Files to Create

**Total: 10 image files needed**

1. `public/images/scenarios/home_pet/shared/seg_schedule.png`
2. `public/images/scenarios/home_pet/shared/seg_memory.png`
3. `public/images/scenarios/home_pet/shared/seg_feeding_rush.png`
4. `public/images/scenarios/home_pet/shared/seg_walk.png`
5. `public/images/scenarios/home_pet/shared/seg_breakfast.png`
6. `public/images/scenarios/home_pet/shared/seg_afternoon.png`
7. `public/images/scenarios/home_pet/shared/seg_forgot.png`
8. `public/images/scenarios/home_pet/shared/ending_success.png`
9. `public/images/scenarios/home_pet/shared/ending_okay.png`
10. `public/images/scenarios/home_pet/shared/ending_fail.png`

---

## Notes

- All filenames are **case-sensitive** and must match exactly
- File format: PNG (with transparency if needed)
- Make sure the `shared/` folder exists before adding images
- The paths in JSON use `/images/...` which maps to `public/images/...` in Next.js

---

## Quick Checklist

Copy this when creating images:

```
[ ] seg_schedule.png
[ ] seg_memory.png
[ ] seg_feeding_rush.png
[ ] seg_walk.png
[ ] seg_breakfast.png
[ ] seg_afternoon.png
[ ] seg_forgot.png
[ ] ending_success.png
[ ] ending_okay.png
[ ] ending_fail.png
```












