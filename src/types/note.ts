export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_encrypted: boolean;
  encrypted_content: string | null;
  password_hash: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface NoteVersion {
  id: string;
  note_id: string;
  content: string;
  tags: string[] | null;
  version_number: number;
  created_at: string;
}