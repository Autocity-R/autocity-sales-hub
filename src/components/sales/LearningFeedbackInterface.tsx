
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  TrendingUp, 
  MessageSquare, 
  Star, 
  Brain,
  ChevronDown,
  ChevronUp,
  Send,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SalesInteraction {
  id: string;
  interaction_type: string;
  ai_response: string;
  team_feedback?: string;
  team_rating?: number;
  created_at: string;
  input_data: any;
}

export const LearningFeedbackInterface = () => {
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<SalesInteraction[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackTexts, setFeedbackTexts] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentInteractions();
  }, []);

  const fetchRecentInteractions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_sales_interactions')
        .select('*')
        .eq('agent_name', 'hendrik')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Failed to fetch interactions:', error);
      toast({
        title: "❌ Fout",
        description: "Kon interacties niet laden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (interactionId: string) => {
    const feedback = feedbackTexts[interactionId];
    const rating = ratings[interactionId];

    if (!feedback?.trim() && !rating) return;

    try {
      const { error } = await supabase
        .from('ai_sales_interactions')
        .update({ 
          team_feedback: feedback || null,
          team_rating: rating || null
        })
        .eq('id', interactionId);

      if (error) throw error;

      toast({
        title: "✅ Feedback Opgeslagen",
        description: "Hendrik leert van je feedback voor betere responses.",
      });

      // Update local state
      setInteractions(prev => prev.map(interaction => 
        interaction.id === interactionId 
          ? { ...interaction, team_feedback: feedback, team_rating: rating }
          : interaction
      ));

      // Clear form
      setFeedbackTexts(prev => ({ ...prev, [interactionId]: '' }));
      setRatings(prev => ({ ...prev, [interactionId]: 0 }));

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: "❌ Fout",
        description: "Kon feedback niet opslaan.",
        variant: "destructive",
      });
    }
  };

  const getInteractionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'enhanced_chat_response': 'bg-blue-100 text-blue-800',
      'message_rating': 'bg-green-100 text-green-800',
      'team_learning': 'bg-purple-100 text-purple-800',
      'lead_phase_detection': 'bg-orange-100 text-orange-800',
      'vehicle_matching': 'bg-cyan-100 text-cyan-800',
      'inruil_request': 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Brain className="h-6 w-6 animate-pulse mr-2" />
          <span>Loading Hendrik's learning data...</span>
        </CardContent>
      </Card>
    );
  }

  const stats = {
    totalInteractions: interactions.length,
    ratedInteractions: interactions.filter(i => i.team_rating).length,
    avgRating: interactions.filter(i => i.team_rating).reduce((sum, i) => sum + (i.team_rating || 0), 0) / interactions.filter(i => i.team_rating).length || 0,
    feedbackCount: interactions.filter(i => i.team_feedback).length
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Totaal Interacties</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalInteractions}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Gemiddelde Rating</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgRating.toFixed(1)}/5</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Met Feedback</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.feedbackCount}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Learning Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{Math.round((stats.feedbackCount / stats.totalInteractions) * 100)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Hendrik Learning Dashboard</CardTitle>
          <CardDescription>
            Bekijk Hendrik's interacties en geef feedback om zijn responses te verbeteren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {interactions.map((interaction) => (
              <Card key={interaction.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getInteractionTypeColor(interaction.interaction_type)} variant="secondary">
                          {interaction.interaction_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(interaction.created_at).toLocaleString('nl-NL')}
                        </span>
                        {interaction.team_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                            <span className="text-sm">{interaction.team_rating}/5</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm mb-2 line-clamp-2">{interaction.ai_response}</p>
                      
                      {interaction.team_feedback && (
                        <div className="mt-2 p-2 bg-green-50 border-l-4 border-green-400">
                          <p className="text-sm text-green-800">
                            <strong>Team Feedback:</strong> {interaction.team_feedback}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === interaction.id ? null : interaction.id)}
                    >
                      {expandedId === interaction.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {expandedId === interaction.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Volledige Response:</h4>
                        <p className="text-sm bg-gray-50 p-3 rounded whitespace-pre-wrap">{interaction.ai_response}</p>
                      </div>
                      
                      {interaction.input_data && (
                        <div>
                          <h4 className="font-medium mb-2">Input Context:</h4>
                          <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                            {JSON.stringify(interaction.input_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {!interaction.team_feedback && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Geef Feedback:</label>
                            <Textarea
                              placeholder="Wat kan Hendrik beter doen? Bijvoorbeeld: 'Te technisch, houd het simpeler' of 'Perfecte tone en approach' of 'Meer focus op Autocity voordelen'..."
                              value={feedbackTexts[interaction.id] || ''}
                              onChange={(e) => setFeedbackTexts(prev => ({ ...prev, [interaction.id]: e.target.value }))}
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Rating:</span>
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button
                                  key={rating}
                                  onClick={() => setRatings(prev => ({ ...prev, [interaction.id]: rating }))}
                                  className={`p-1 rounded ${
                                    ratings[interaction.id] >= rating
                                      ? 'text-yellow-500'
                                      : 'text-gray-300 hover:text-yellow-400'
                                  }`}
                                >
                                  <Star className="h-4 w-4" fill={ratings[interaction.id] >= rating ? 'currentColor' : 'none'} />
                                </button>
                              ))}
                            </div>
                            
                            <Button
                              size="sm"
                              onClick={() => submitFeedback(interaction.id)}
                              disabled={!feedbackTexts[interaction.id]?.trim() && !ratings[interaction.id]}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Verstuur Feedback
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
