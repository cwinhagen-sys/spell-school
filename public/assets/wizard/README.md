# Wizard Images for Leveling System

This folder contains the wizard images used in the leveling system. Each image represents a milestone title that students unlock every 10 levels.

## Image Placement Instructions

Place your wizard images in this folder with these filenames (based on your existing images):

### Required Images:
- `wizard_torch.png` - Level 10: Young wizard with glowing torch
- `wizard_orbs.png` - Level 20: Wizard with magical orbs and symbols
- `wizard_book.png` - Level 30: Wizard reading glowing book under magical star
- `wizard_pentagram.png` - Level 40: Wizard casting spells with pentagram
- `wizard_sword.png` - Level 50: Wizard with glowing magical sword and runes
- `wizard_staff.png` - Level 60: Wizard with glowing eyes and magical staff
- `wizard_powerful.png` - Level 70: Powerful wizard with glowing eyes and magical aura
- `wizard_energy.png` - Level 80: Wizard surrounded by magical energy and stars
- `wizard_star_staff.png` - Level 90: Wizard with star-topped staff and magical aura
- `wizard_time.png` - Level 100: Time-wizard with clocks and hourglasses

## Image Specifications

- **Format**: PNG (recommended) or JPG
- **Size**: 200x200 pixels minimum (will be scaled down in UI)
- **Style**: Cartoon/wizard-themed illustrations
- **Background**: Transparent or dark backgrounds work best

## How It Works

1. **Level Up Modal**: When a student reaches a milestone level, the corresponding wizard image appears in a special level-up animation
2. **Levels Page**: All milestone titles and images are displayed in the student's level progress page
3. **Current Title**: The student's current wizard title and image are shown on their dashboard

## Fallback

If an image is missing, the system will display a magical wand emoji (🪄) as a placeholder.

## Testing

To test the wizard images:
1. Place your images in this folder with the filenames above
2. Play games to earn XP and level up
3. Check the level-up modal at milestone levels (10, 20, 30, etc.)
4. Visit `/student/levels` to see all milestone titles and images
