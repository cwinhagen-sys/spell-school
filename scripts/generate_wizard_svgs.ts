/**
 * Simple Node script to write placeholder wizard SVGs by copying a base SVG.
 * Run with: ts-node scripts/generate_wizard_svgs.ts (or compile first)
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const steps = [
  'wizard_010_spark_initiate.svg',
  'wizard_020_apprentice_of_embers.svg',
  'wizard_030_rune_adept.svg',
  'wizard_040_arcane_scholar.svg',
  'wizard_050_spellblade.svg',
  'wizard_060_master_of_sigils.svg',
  'wizard_070_archmage.svg',
  'wizard_080_void_conjurer.svg',
  'wizard_090_grand_archon.svg',
  'wizard_100_elder_chronomancer.svg',
]

const base = readFileSync(resolve(__dirname, '../public/assets/wizard/wizard_base.svg'), 'utf8')
for (const name of steps) {
  const outPath = resolve(__dirname, `../public/assets/wizard/${name}`)
  writeFileSync(outPath, base, 'utf8')
  // eslint-disable-next-line no-console
  console.log('wrote', outPath)
}


























