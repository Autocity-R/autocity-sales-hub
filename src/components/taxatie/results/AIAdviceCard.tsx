import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  ThumbsUp, 
  ThumbsDown, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Clock,
  Target,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import type { AITaxatieAdvice, JPCarsData, InternalComparison, PortalListing, TaxatieFeedbackType, TaxatieCorrectionType } from '@/types/taxatie';
import { FeedbackModal } from '../modals/FeedbackModal';

interface AIAdviceCardProps {
  data: AITaxatieAdvice | null;
  loading: boolean;
  jpCarsData?: JPCarsData | null;
  internalComparison?: InternalComparison | null;
  listings?: PortalListing[];
  onFeedbackSubmit: (feedback: {
    rating: number;
    reason?: TaxatieFeedbackType;
    notes: string;
    referencedListingId?: string;
    userReasoning?: string;
    userSuggestedPrice?: number;
    correctionType?: TaxatieCorrectionType;
  }) => void;
}

export const AIAdviceCard = ({ data, loading, jpCarsData, internalComparison, listings = [], onFeedbackSubmit }: AIAdviceCardProps) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [quickFeedback, setQuickFeedback] = useState<'positive' | 'negative' | null>(null);

  if (loading) {
    return (
      <Card className="border-2 border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const getRecommendationStyle = () => {
    switch (data.recommendation) {
      case 'kopen':
        return {
          bg: 'bg-green-500/10 border-green-500/30',
          text: 'text-green-600',
          icon: CheckCircle,
          label: '✅ KOPEN',
        };
      case 'niet_kopen':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          text: 'text-red-600',
          icon: XCircle,
          label: '❌ NIET KOPEN',
        };
      default:
        return {
          bg: 'bg-amber-500/10 border-amber-500/30',
          text: 'text-amber-600',
          icon: AlertCircle,
          label: '⚠️ TWIJFEL',
        };
    }
  };

  const style = getRecommendationStyle();
  const RecommendationIcon = style.icon;

  const handleQuickFeedback = (type: 'positive' | 'negative') => {
    setQuickFeedback(type);
    if (type === 'negative') {
      setShowFeedback(true);
    } else {
      // Positive quick feedback - open modal to confirm as "goede_taxatie"
      onFeedbackSubmit({ rating: 5, reason: 'goede_taxatie', notes: 'Goed advies' });
    }
  };

  return (
    <>
      <Card className="border-2 border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-purple-500/10 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Advies
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {data.primaryListingsUsed} listings geanalyseerd
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aanbeveling */}
          <div className={`p-4 rounded-lg border-2 ${style.bg}`}>
            <div className="flex items-center gap-3 mb-2">
              <RecommendationIcon className={`h-8 w-8 ${style.text}`} />
              <span className={`text-2xl font-bold ${style.text}`}>
                {style.label}
              </span>
            </div>
          </div>

          {/* Prijzen */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Verkoopprijs</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                €{data.recommendedSellingPrice.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Inkoopprijs</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                €{data.recommendedPurchasePrice.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Verwachtingen met bronvermelding */}
          <div className="space-y-2">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Verwachte statijd: <strong>{data.expectedDaysToSell} dagen</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>
                  Doelmarge: <strong>€{data.targetMargin?.toLocaleString('nl-NL') || 0}</strong>
                  {data.recommendedSellingPrice > 0 && data.targetMargin > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({Math.round((data.targetMargin / data.recommendedSellingPrice) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            </div>
            
            {/* Statijd bronvermelding */}
            <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5 flex flex-wrap items-center gap-x-2">
              <span className="font-medium">📊 Statijd bron:</span>
              <span>JP Cars marktdata</span>
              {jpCarsData?.stockStats?.avgDays && (
                <span className="text-blue-600">(voorraad gem. {jpCarsData.stockStats.avgDays} dagen)</span>
              )}
              {jpCarsData?.etr && (
                <span className="text-purple-600">(ETR: {jpCarsData.etr} dagen)</span>
              )}
              {internalComparison && internalComparison.soldB2C > 0 && (
                <span className="text-green-600">
                  • Autocity verkocht {internalComparison.soldB2C}x B2C vergelijkbaar
                  {internalComparison.averageDaysToSell_B2C && ` (gem. ${internalComparison.averageDaysToSell_B2C}d)`}
                </span>
              )}
            </div>
          </div>

          {/* Onderbouwing */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Onderbouwing:</p>
            <p className="text-sm text-muted-foreground">{data.reasoning}</p>
          </div>

          {/* JP Cars afwijking */}
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                  JP Cars afwijking:
                </p>
                <p className="text-xs text-muted-foreground">{data.jpcarsDeviation}</p>
              </div>
            </div>
          </div>

          {/* Risico's en Kansen */}
          <div className="grid grid-cols-2 gap-3">
            {data.riskFactors.length > 0 && (
              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Risico's
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.riskFactors.map((risk, i) => (
                    <li key={i}>• {risk}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.opportunities.length > 0 && (
              <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Kansen
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.opportunities.map((opp, i) => (
                    <li key={i}>• {opp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quick Feedback */}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-sm text-muted-foreground">Was dit advies nuttig?</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={quickFeedback === 'positive' ? 'default' : 'outline'}
                className={quickFeedback === 'positive' ? 'bg-green-500 hover:bg-green-600' : ''}
                onClick={() => handleQuickFeedback('positive')}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Goed
              </Button>
              <Button
                size="sm"
                variant={quickFeedback === 'negative' ? 'default' : 'outline'}
                className={quickFeedback === 'negative' ? 'bg-red-500 hover:bg-red-600' : ''}
                onClick={() => handleQuickFeedback('negative')}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Niet correct
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <FeedbackModal
        open={showFeedback}
        onOpenChange={setShowFeedback}
        onSubmit={(feedback) => {
          onFeedbackSubmit(feedback);
          setShowFeedback(false);
        }}
        listings={listings}
      />
    </>
  );
};
