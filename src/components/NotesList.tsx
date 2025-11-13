import { useState } from "react";
import { Note } from "@/types/note";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Pin, 
  Trash2, 
  Lock, 
  Search,
  Clock,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const NotesList = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onDeleteNote,
  onTogglePin,
}: NotesListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const pinnedNotes = filteredNotes.filter((note) => note.is_pinned);
  const unpinnedNotes = filteredNotes.filter((note) => !note.is_pinned);

  const renderNote = (note: Note) => (
    <Card
      key={note.id}
      className={cn(
        "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
        selectedNoteId === note.id && "ring-2 ring-primary shadow-lg"
      )}
      onClick={() => onSelectNote(note)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-lg truncate flex-1">{note.title}</h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id);
            }}
          >
            <Pin
              className={cn(
                "h-4 w-4",
                note.is_pinned ? "fill-primary text-primary" : "text-muted-foreground"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {note.content.replace(/<[^>]*>/g, "").substring(0, 100)}...
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {note.is_encrypted && (
          <Badge variant="secondary" className="text-xs">
            <Lock className="h-3 w-3 mr-1" />
            Encrypted
          </Badge>
        )}
        {note.tags && note.tags.length > 0 && (
          <Badge variant="outline" className="text-xs">
            <Tag className="h-3 w-3 mr-1" />
            {note.tags.length} tags
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
        </span>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {pinnedNotes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Pinned
            </h4>
            {pinnedNotes.map(renderNote)}
          </div>
        )}

        {unpinnedNotes.length > 0 && (
          <div className="space-y-2">
            {pinnedNotes.length > 0 && (
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Notes
              </h4>
            )}
            {unpinnedNotes.map(renderNote)}
          </div>
        )}

        {filteredNotes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? "No notes found" : "No notes yet"}
          </div>
        )}
      </div>
    </div>
  );
};