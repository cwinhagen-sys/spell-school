-- GDPR-kompatibel soft delete migration
-- Lägger till deleted_at kolumner för att möjliggöra soft delete

-- Lägg till deleted_at kolumner
ALTER TABLE classes ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE class_students ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE student_progress ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE word_sets ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE assignments ADD COLUMN deleted_at TIMESTAMP;

-- Skapa index för bättre prestanda på soft delete queries
CREATE INDEX idx_classes_deleted_at ON classes(deleted_at);
CREATE INDEX idx_class_students_deleted_at ON class_students(deleted_at);
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at);
CREATE INDEX idx_student_progress_deleted_at ON student_progress(deleted_at);
CREATE INDEX idx_word_sets_deleted_at ON word_sets(deleted_at);
CREATE INDEX idx_assignments_deleted_at ON assignments(deleted_at);

-- Skapa tabell för att logga raderingar (GDPR-krav)
CREATE TABLE deletion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  deleted_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMP DEFAULT NOW(),
  reason TEXT,
  anonymized_data JSONB -- Sparar anonymiserad data för statistik
);

-- Skapa index för deletion_logs
CREATE INDEX idx_deletion_logs_deleted_at ON deletion_logs(deleted_at);
CREATE INDEX idx_deletion_logs_table_name ON deletion_logs(table_name);







