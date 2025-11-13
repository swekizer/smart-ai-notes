import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Note, NoteVersion } from "@/types/note";
import { NotesList } from "@/components/NotesList";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AIFeatures } from "@/components/AIFeatures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Save, 
  LogOut, 
  Lock, 
  Unlock,
  X,
  History,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import bcrypt from "bcryptjs";

export default function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEncryptDialog, setShowEncryptDialog] = useState(false);
  const [encryptPassword, setEncryptPassword] = useState("");
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);

  useEffect(() => {
    checkUser();
    fetchNotes();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch notes");
      return;
    }

    setNotes(data || []);
  };

  const handleCreateNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: "Untitled Note",
        content: "",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create note");
      return;
    }

    setNotes([data, ...notes]);
    setSelectedNote(data);
    setNoteTitle(data.title);
    setNoteContent(data.content);
    setNoteTags(data.tags || []);
    toast.success("Note created!");
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;

    setLoading(true);
    try {
      // Save version
      const { data: latestVersion } = await supabase
        .from("note_versions")
        .select("version_number")
        .eq("note_id", selectedNote.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      await supabase.from("note_versions").insert({
        note_id: selectedNote.id,
        content: selectedNote.content,
        tags: selectedNote.tags,
        version_number: (latestVersion?.version_number || 0) + 1,
      });

      // Update note
      const { error } = await supabase
        .from("notes")
        .update({
          title: noteTitle,
          content: noteContent,
          tags: noteTags,
        })
        .eq("id", selectedNote.id);

      if (error) throw error;

      toast.success("Note saved!");
      fetchNotes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNote = async (note: Note) => {
    if (note.is_encrypted && note.encrypted_content) {
      setSelectedNote(note);
      setShowUnlockDialog(true);
      return;
    }

    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteTags(note.tags || []);
  };

  const handleUnlockNote = async () => {
    if (!selectedNote || !selectedNote.password_hash) return;

    const isValid = await bcrypt.compare(unlockPassword, selectedNote.password_hash);
    if (!isValid) {
      toast.error("Invalid password");
      return;
    }

    setNoteTitle(selectedNote.title);
    setNoteContent(selectedNote.encrypted_content || "");
    setNoteTags(selectedNote.tags || []);
    setShowUnlockDialog(false);
    setUnlockPassword("");
    toast.success("Note unlocked!");
  };

  const handleEncryptNote = async () => {
    if (!selectedNote || !encryptPassword) return;

    setLoading(true);
    try {
      const passwordHash = await bcrypt.hash(encryptPassword, 10);

      const { error } = await supabase
        .from("notes")
        .update({
          is_encrypted: true,
          encrypted_content: noteContent,
          password_hash: passwordHash,
          content: "",
        })
        .eq("id", selectedNote.id);

      if (error) throw error;

      toast.success("Note encrypted!");
      setShowEncryptDialog(false);
      setEncryptPassword("");
      fetchNotes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete note");
      return;
    }

    setNotes(notes.filter((n) => n.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setNoteTitle("");
      setNoteContent("");
      setNoteTags([]);
    }
    toast.success("Note deleted!");
  };

  const handleTogglePin = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    const { error } = await supabase
      .from("notes")
      .update({ is_pinned: !note.is_pinned })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update note");
      return;
    }

    fetchNotes();
  };

  const handleAddTag = () => {
    if (newTag && !noteTags.includes(newTag)) {
      setNoteTags([...noteTags, newTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNoteTags(noteTags.filter((t) => t !== tag));
  };

  const handleViewVersions = async () => {
    if (!selectedNote) return;

    const { data, error } = await supabase
      .from("note_versions")
      .select("*")
      .eq("note_id", selectedNote.id)
      .order("version_number", { ascending: false });

    if (error) {
      toast.error("Failed to fetch versions");
      return;
    }

    setVersions(data || []);
    setShowVersionHistory(true);
  };

  const handleRestoreVersion = async (version: NoteVersion) => {
    if (!selectedNote) return;

    const { error } = await supabase
      .from("notes")
      .update({
        content: version.content,
        tags: version.tags,
      })
      .eq("id", selectedNote.id);

    if (error) {
      toast.error("Failed to restore version");
      return;
    }

    setNoteContent(version.content);
    setNoteTags(version.tags || []);
    setShowVersionHistory(false);
    toast.success("Version restored!");
    fetchNotes();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Smart Notes</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateNote} className="gap-2">
              <Plus className="h-4 w-4" />
              New Note
            </Button>
            <Button variant="ghost" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 h-[calc(100vh-140px)]">
          {/* Notes List */}
          <Card className="p-4 overflow-hidden flex flex-col shadow-lg">
            <NotesList
              notes={notes}
              selectedNoteId={selectedNote?.id || null}
              onSelectNote={handleSelectNote}
              onDeleteNote={handleDeleteNote}
              onTogglePin={handleTogglePin}
            />
          </Card>

          {/* Editor */}
          <Card className="p-6 overflow-hidden flex flex-col shadow-lg">
            {selectedNote ? (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between gap-4">
                  <Input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note title"
                    className="text-xl font-semibold"
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewVersions}
                      className="gap-2"
                    >
                      <History className="h-4 w-4" />
                      History
                    </Button>
                    {!selectedNote.is_encrypted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEncryptDialog(true)}
                        className="gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Encrypt
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Encrypted
                      </Badge>
                    )}
                    <Button
                      onClick={handleSaveNote}
                      disabled={loading}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  {noteTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      placeholder="Add tag..."
                      className="h-7 w-32 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddTag}
                      className="h-7"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* AI Features */}
                <AIFeatures
                  noteContent={noteContent}
                  onTagsGenerated={(tags) => setNoteTags([...noteTags, ...tags])}
                />

                {/* Editor */}
                <div className="flex-1 overflow-hidden">
                  <RichTextEditor
                    value={noteContent}
                    onChange={setNoteContent}
                    className="h-full"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a note or create a new one</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Encrypt Dialog */}
      <Dialog open={showEncryptDialog} onOpenChange={setShowEncryptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encrypt Note</DialogTitle>
            <DialogDescription>
              Set a password to protect this note. You'll need this password to view it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={encryptPassword}
              onChange={(e) => setEncryptPassword(e.target.value)}
            />
            <Button
              onClick={handleEncryptNote}
              disabled={loading || !encryptPassword}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              Encrypt Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unlock Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Note</DialogTitle>
            <DialogDescription>
              Enter the password to view this encrypted note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlockNote()}
            />
            <Button onClick={handleUnlockNote} className="w-full">
              <Unlock className="h-4 w-4 mr-2" />
              Unlock Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this note
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {versions.map((version) => (
              <Card key={version.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Version {version.version_number}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(version.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreVersion(version)}
                    >
                      Restore
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {version.content.replace(/<[^>]*>/g, "")}
                </p>
              </Card>
            ))}
            {versions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No version history yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}