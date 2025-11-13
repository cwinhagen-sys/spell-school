-- Add grid_config column to word_sets table
-- This column stores the grid configuration (words, colors, symbols) for each word set

ALTER TABLE word_sets 
ADD COLUMN IF NOT EXISTS grid_config JSONB;

-- Add comment
COMMENT ON COLUMN word_sets.grid_config IS 'Grid configuration array: [{words: string[], color: string, symbol: string, index: number}]';






