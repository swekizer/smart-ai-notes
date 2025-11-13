-- Create notes table with encryption and version history support
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT NOT NULL DEFAULT '',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_encrypted BOOLEAN DEFAULT FALSE,
  encrypted_content TEXT,
  password_hash TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create note versions table for version history
CREATE TABLE IF NOT EXISTS public.note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tags TEXT[],
  version_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes"
  ON public.notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON public.notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for note versions
CREATE POLICY "Users can view versions of their notes"
  ON public.note_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_versions.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions for their notes"
  ON public.note_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_versions.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_pinned ON public.notes(user_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_notes_created_at ON public.notes(user_id, created_at DESC);
CREATE INDEX idx_note_versions_note_id ON public.note_versions(note_id, version_number DESC);