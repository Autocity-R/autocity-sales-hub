import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, Edit, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface AIResponseSuggestionsProps {
  leadId: string;
  onUseResponse: (response: string) => void;
}

export const AIResponseSuggestions = ({ leadId, onUseResponse }: AIResponseSuggestionsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['ai-response-suggestions', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_response_suggestions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  const rateSuggestionMutation = useMutation({
    mutationFn: async ({ suggestionId, rating }: { suggestionId: string; rating: number }) => {
      const { error } = await supabase
        .from('email_response_suggestions')
        .update({ 
          team_rating: rating,
          used_by_team: true 
        })
        .eq('id', suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-response-suggestions', leadId] });
      toast({
        title: "Bedankt voor je feedback!",
        description: "Je rating helpt onze AI te verbeteren.",
      });
    },
  });

  const markAsUsedMutation = useMutation({
    mutationFn: async ({ suggestionId, modified, actualText }: { 
      suggestionId: string; 
      modified: boolean;
      actualText?: string;
    }) => {
      const { error } = await supabase
        .from('email_response_suggestions')
        .update({ 
          used_by_team: true,
          modified_by_team: modified,
          actual_response_sent: actualText || null
        })
        .eq('id', suggestionId);

      if (error) throw error;
    },
  });

  const handleUseResponse = (suggestion: any, isModified: boolean = false) => {
    const responseText = isModified ? editedText : suggestion.suggested_response;
    onUseResponse(responseText);
    
    markAsUsedMutation.mutate({
      suggestionId: suggestion.id,
      modified: isModified,
      actualText: isModified ? editedText : suggestion.suggested_response
    });

    toast({
      title: "Response toegevoegd",
      description: "De suggestie is toegevoegd aan je email composer.",
    });
  };

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      'urgent': 'destructive',
      'high': 'default',
      'medium': 'secondary',
      'low': 'outline'
    };
    return <Badge variant={variants[priority] || 'secondary'}>{priority}</Badge>;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        AI Response Suggesties
      </h3>

      {suggestions.map((suggestion, index) => (
        <Card key={suggestion.id} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Optie {index + 1}</Badge>
              {suggestion.response_type && (
                <Badge variant="secondary">{suggestion.response_type}</Badge>
              )}
              {suggestion.priority_level && getPriorityBadge(suggestion.priority_level)}
            </div>
            {suggestion.team_rating && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < suggestion.team_rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {editingId === suggestion.id ? (
            <div className="space-y-2">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[120px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleUseResponse(suggestion, true)}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Gebruik aangepaste versie
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(null)}
                >
                  Annuleer
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                {suggestion.suggested_response}
              </p>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handleUseResponse(suggestion, false)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Gebruik deze
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(suggestion.id);
                    setEditedText(suggestion.suggested_response);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Aanpassen
                </Button>
              </div>

              {suggestion.used_by_team && !suggestion.team_rating && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Beoordeel deze suggestie:</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => rateSuggestionMutation.mutate({ 
                          suggestionId: suggestion.id, 
                          rating 
                        })}
                        className="hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            selectedRating && rating <= selectedRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      ))}
    </div>
  );
};
