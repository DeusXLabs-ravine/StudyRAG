-- Student pricing: add is_student and student_email columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_student BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS student_email TEXT;
