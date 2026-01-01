# AI Image Generation Prompts for Care for Pet

## Important: Dog Description
**Before using these prompts, describe Max (the dog) from your existing images:**
- Breed: [DESCRIBE FROM YOUR IMAGES - e.g., "Golden Retriever", "Labrador", "mixed breed"]
- Color: [DESCRIBE FROM YOUR IMAGES - e.g., "golden", "brown", "black and white"]
- Size: [DESCRIBE FROM YOUR IMAGES - e.g., "medium-sized", "large"]
- Other distinctive features: [DESCRIBE FROM YOUR IMAGES]

**Replace [MAX_DESCRIPTION] in all prompts below with your description!**

---

## Style Reference
Add this to ALL prompts:
"in the style of children's book illustrations, warm and friendly, similar to home_breakfast scenario images, clean simple backgrounds, focus on characters"

---

## 1. seg_schedule.png

**Prompt:**
```
A warm kitchen scene in children's book illustration style. A wooden kitchen table in the center with a handwritten note or paper showing a care schedule. The note is clearly visible on the table with numbered items. Morning sunlight streams through a window. [MAX_DESCRIPTION] sits patiently in the background, looking at the table with hopeful eyes, tail wagging slowly. Warm, organized, helpful mood. Clean simple background, focus on the table, note, and Max. Similar style to home_breakfast scenario images.
```

---

## 2. seg_memory.png

**Prompt:**
```
A kitchen or hallway scene in children's book illustration style. [MAX_DESCRIPTION] sits in the foreground looking expectantly, waiting patiently. A clock visible on the wall showing morning time. The scene suggests uncertainty - maybe items scattered or Max looking confused. Warm morning light. Max's expression shows he is waiting for something. Children's book illustration style, clean simple background, focus on Max and the waiting atmosphere. Similar style to home_breakfast scenario images.
```

---

## 5. seg_breakfast.png

**Prompt:**
```
A clean, organized kitchen scene in children's book illustration style. [MAX_DESCRIPTION] sits calmly at a food bowl eating properly measured dog food (one cup, not overflowing). A fresh water bowl is nearby, full of clean water. The kitchen is clean and organized. Morning light fills the room. Max looks happy and satisfied while eating slowly and contentedly. Both bowls are properly filled. Warm, proper care mood. Clean simple background, focus on Max eating and the two bowls. Similar style to home_breakfast scenario images.
```

---

## 6. seg_afternoon.png

**Prompt (Happy Max version):**
```
A backyard scene in children's book illustration style. [MAX_DESCRIPTION] playing fetch in the backyard, running energetically with a ball in mouth or chasing a ball. Green grass, maybe a fence in the background. Afternoon light (warmer than morning, golden tones). A water bowl is visible nearby, full. Max looks happy, energetic, and having fun. Fun, energetic, happy mood. Clean simple background, focus on Max playing. Similar style to home_breakfast scenario images.
```

**Alternative (Tired Max version for afternoon_care_no_breakfast):**
```
A backyard scene in children's book illustration style. [MAX_DESCRIPTION] in the backyard, but walking slowly instead of running. A ball is on the ground. Max looks tired and weak, not energetic. Green grass, maybe a fence. Afternoon light. An empty food bowl is visible in the background. Max has not eaten all day. Concerned, tired mood. Clean simple background, focus on Max's slow, tired movement. Similar style to home_breakfast scenario images.
```

---

## 8. ending_success.png

**Prompt:**
```
A peaceful evening scene in children's book illustration style. [MAX_DESCRIPTION] on an evening walk, walking calmly on a neighborhood sidewalk with a leash visible. The sun is setting with warm orange and pink colors in the sky. Max looks healthy, happy, and energetic. OR alternatively: A home interior showing [MAX_DESCRIPTION] looking healthy and happy. Full food and water bowls are visible, both properly filled. Max wags his tail, looking satisfied and well-cared for. Success, perfect care mood. Warm sunset colors or warm indoor lighting. Clean simple background, focus on happy, healthy Max. Similar style to home_breakfast scenario images.
```

---

## 9. ending_okay.png

**Prompt:**
```
A home interior scene in children's book illustration style. [MAX_DESCRIPTION] looks okay but not super energetic or happy. Food and water bowls are visible (maybe partially empty or not perfectly full, or one is empty). Max sits or stands, looking somewhat content but not as happy as he could be. The scene suggests something was missed - maybe Max is inside when he should have been walked. Partial success, okay but could be better mood. Warm but muted colors. Clean simple background, focus on Max and the bowls. Similar style to home_breakfast scenario images.
```

---

## 10. ending_fail.png

**Prompt:**
```
A home interior scene in children's book illustration style. [MAX_DESCRIPTION] looks sad, weak, and neglected. Empty food bowl visible, completely empty. Empty water bowl visible, completely empty. Max sits by the door, looking like he hasn't been outside all day. Max's expression is sad and tired. The scene shows neglect - bowls empty, Max by door waiting. Failure, neglect, sadness mood. Muted, sadder color tones. Clean simple background, focus on sad Max, empty bowls, and the door. Similar style to home_breakfast scenario images.
```

---

## Tips for Consistent Results

1. **Always include the style reference** at the end of each prompt
2. **Use the same [MAX_DESCRIPTION]** in all prompts for consistency
3. **Keep character descriptions consistent** (same child, same Mom design)
4. **Use similar lighting descriptions** (morning = cool/fresh, afternoon = warm, evening = sunset)
5. **Maintain the same art style** throughout (children's book illustration)

---

## Example: Complete Prompt with Dog Description

If Max is a Golden Retriever, your prompt for `seg_schedule.png` would be:

```
A warm kitchen scene in children's book illustration style. A wooden kitchen table in the center with a handwritten note or paper showing a care schedule. The note is clearly visible on the table. Morning sunlight streams through a window. In the background, a medium-sized golden Golden Retriever with a friendly face waits patiently, looking at the table with hopeful eyes, tail wagging slowly. Warm, organized, helpful mood. Clean simple background, focus on the table, note, and Max. Similar style to home_breakfast scenario images.
```

---

## Quick Checklist

Before generating, make sure you have:
- [ ] Described Max from your existing images
- [ ] Replaced [MAX_DESCRIPTION] in all prompts
- [ ] Added the style reference to each prompt
- [ ] Decided if you need two versions of seg_afternoon.png (happy vs tired Max)

