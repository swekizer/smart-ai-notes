import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sparkles, 
  Languages, 
  Tags, 
  FileText, 
  CheckCircle2,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AIFeaturesProps {
  noteContent: string;
  onTagsGenerated: (tags: string[]) => void;
}

export const AIFeatures = ({ noteContent, onTagsGenerated }: AIFeaturesProps) => {
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [resultType, setResultType] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");

  const handleAIAction = async (action: string) => {
    if (!noteContent.trim()) {
      toast.error("Please write some content first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-features", {
        body: {
          text: noteContent.replace(/<[^>]*>/g, ""), // Strip HTML
          action,
          targetLanguage: action === "translate" ? targetLanguage : undefined,
        },
      });

      if (error) throw error;

      if (data.result) {
        setResults(data.result);
        setResultType(action);
        setShowResults(true);

        if (action === "tags" && Array.isArray(data.result)) {
          onTagsGenerated(data.result);
          toast.success("Tags generated successfully!");
        } else {
          toast.success("AI analysis complete!");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process AI request");
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    switch (resultType) {
      case "glossary":
        return Array.isArray(results) ? (
          <div className="space-y-3">
            {results.map((item: any, index: number) => (
              <Card key={index} className="p-3">
                <h4 className="font-semibold text-primary">{item.term}</h4>
                <p className="text-sm text-muted-foreground mt-1">{item.definition}</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm">{results}</p>
        );

      case "tags":
        return Array.isArray(results) ? (
          <div className="flex flex-wrap gap-2">
            {results.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm">{results}</p>
        );

      case "grammar":
        return Array.isArray(results) && results.length > 0 ? (
          <div className="space-y-2">
            {results.map((item: any, index: number) => (
              <Card key={index} className="p-3">
                <p className="text-sm">
                  <span className="text-destructive line-through">{item.error}</span>
                  <span className="mx-2">→</span>
                  <span className="text-success">{item.correction}</span>
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <p>No grammar errors found!</p>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{results}</p>;
    }
  };

  const getDialogTitle = () => {
    switch (resultType) {
      case "glossary":
        return "Key Terms & Definitions";
      case "summarize":
        return "Summary";
      case "tags":
        return "Suggested Tags";
      case "grammar":
        return "Grammar Check";
      case "translate":
        return `Translation to ${targetLanguage}`;
      case "insights":
        return "AI Insights";
      default:
        return "Results";
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAIAction("glossary")}
          disabled={loading}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Glossary
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAIAction("summarize")}
          disabled={loading}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Summarize
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAIAction("tags")}
          disabled={loading}
          className="gap-2"
        >
          <Tags className="h-4 w-4" />
          Generate Tags
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAIAction("grammar")}
          disabled={loading}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Grammar Check
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAIAction("insights")}
          disabled={loading}
          className="gap-2"
        >
          <Lightbulb className="h-4 w-4" />
          Get Insights
        </Button>

        <div className="flex items-center gap-2">
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Spanish">Spanish</SelectItem>
              <SelectItem value="French">French</SelectItem>
              <SelectItem value="German">German</SelectItem>
              <SelectItem value="Italian">Italian</SelectItem>
              <SelectItem value="Portuguese">Portuguese</SelectItem>
              <SelectItem value="Chinese">Chinese</SelectItem>
              <SelectItem value="Japanese">Japanese</SelectItem>
              <SelectItem value="Korean">Korean</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAIAction("translate")}
            disabled={loading}
            className="gap-2"
          >
            <Languages className="h-4 w-4" />
            Translate
          </Button>
        </div>
      </div>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              AI-generated results based on your note content
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">{renderResults()}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};