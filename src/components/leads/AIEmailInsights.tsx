import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertCircle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AIEmailInsightsProps {
  leadId: string;
}

export const AIEmailInsights = ({ leadId }: AIEmailInsightsProps) => {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-email-insights', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_email_processing')
        .select('*')
        .eq('lead_id', leadId)
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  const getSentimentBadge = (score: number) => {
    if (score > 0.5) return <Badge variant="default" className="bg-green-500">Positief</Badge>;
    if (score < -0.5) return <Badge variant="destructive">Negatief</Badge>;
    return <Badge variant="secondary">Neutraal</Badge>;
  };

  const getUrgencyBadge = (level: string) => {
    const variants: Record<string, any> = {
      'urgent': 'destructive',
      'high': 'default',
      'medium': 'secondary',
      'low': 'outline'
    };
    return <Badge variant={variants[level] || 'secondary'}>{level.toUpperCase()}</Badge>;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">AI Email Analyse</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Sentiment</p>
          {getSentimentBadge(insights.sentiment_score || 0)}
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Urgentie</p>
          {getUrgencyBadge(insights.urgency_level || 'medium')}
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Intentie</p>
          <Badge variant="outline">{insights.intent_classification || 'Onbekend'}</Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Lead Score</p>
          <Badge variant="default" className="bg-blue-500">{insights.lead_score || 50}/100</Badge>
        </div>
      </div>

      {insights.key_insights && typeof insights.key_insights === 'object' && 
       (insights.key_insights as any).insights?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Key Insights</p>
          </div>
          <ul className="space-y-1">
            {((insights.key_insights as any).insights as string[]).map((insight, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.competitive_mentions && 
       Array.isArray(insights.competitive_mentions) && 
       insights.competitive_mentions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <p className="text-sm font-medium">Concurrentie Vermeld</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {insights.competitive_mentions.map((mention, idx) => (
              <Badge key={idx} variant="outline" className="border-orange-500 text-orange-700">
                {String(mention)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {insights.suggested_response && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">AI Suggested Response</p>
          </div>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            {insights.suggested_response}
          </p>
        </div>
      )}
    </Card>
  );
};
