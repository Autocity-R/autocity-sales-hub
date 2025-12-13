import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Lock, 
  MessageSquare, 
  Copy, 
  Check, 
  AlertTriangle, 
  TrendingDown,
  Euro,
  Shield,
  Target
} from 'lucide-react';
import type { TradeInAdvice } from '@/services/tradeInTaxatieService';
import type { JPCarsData } from '@/types/taxatie';
import { toast } from 'sonner';

interface TradeInAdviceCardProps {
  data: TradeInAdvice | null;
  loading: boolean;
  jpCarsData?: JPCarsData | null;
}

export function TradeInAdviceCard({ data, loading, jpCarsData }: TradeInAdviceCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Klant-verhaal gekopieerd!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Kopiëren mislukt');
    }
  };

  if (loading) {
    return (
      <Card className="border-orange-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Inruil Advies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
            <TrendingDown className="h-5 w-5" />
            Inruil Advies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Start de taxatie om het strategisch inruil-advies te genereren
          </p>
        </CardContent>
      </Card>
    );
  }

  const getCourantheidsColor = (courantheid: string) => {
    switch (courantheid) {
      case 'courant': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'gemiddeld': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'incourant': return 'bg-red-500/10 text-red-600 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCourantheidsLabel = (courantheid: string) => {
    switch (courantheid) {
      case 'courant': return 'Courant (18% marge)';
      case 'gemiddeld': return 'Gemiddeld (25% marge)';
      case 'incourant': return 'Incourant (30% marge)';
      default: return courantheid;
    }
  };

  return (
    <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Inruil Advies
          </CardTitle>
          <Badge className={getCourantheidsColor(data.courantheid)}>
            {getCourantheidsLabel(data.courantheid)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Interne Prijzen - NIET aan klant tonen */}
        <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-600">INTERN - Niet aan klant tonen</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Marktvloer</p>
              <p className="text-lg font-bold">€{data.marketFloorPrice.toLocaleString('nl-NL')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max. Inkoop</p>
              <p className="text-2xl font-bold text-red-600">€{data.internalMaxPrice.toLocaleString('nl-NL')}</p>
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Marge: <span className="font-semibold text-green-600">€{data.calculatedMargin.toLocaleString('nl-NL')}</span>
              {data.calculatedMargin < 1500 && data.marketFloorPrice > 1500 && (
                <span className="text-amber-600 ml-2">(min. €1.500 toegepast)</span>
              )}
            </span>
          </div>
        </div>

        <Separator />

        {/* Klant-gericht Bod */}
        <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <span className="text-sm font-semibold text-green-600">NAAR KLANT - Dit zeg je</span>
          </div>
          
          <div className="flex items-baseline gap-2 mb-2">
            <Euro className="h-5 w-5 text-green-600" />
            <span className="text-3xl font-bold text-green-600">
              {data.customerOfferPrice.toLocaleString('nl-NL')}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            "Wij bieden u €{data.customerOfferPrice.toLocaleString('nl-NL')} inclusief 10% handelsmarge"
          </p>
        </div>

        <Separator />

        {/* Klant-verhaal - Kopieerbaar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Klant-verhaal (kopieerbaar)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(data.customerStory)}
              className="h-8"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Gekopieerd
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Kopieer
                </>
              )}
            </Button>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap">
            {data.customerStory}
          </div>
        </div>

        {/* Model Risico's */}
        {data.modelRisks && data.modelRisks.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Model Risico's (gebruik in gesprek)
            </span>
            <div className="space-y-1">
              {data.modelRisks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Markt Argumenten */}
        {data.marketArguments && data.marketArguments.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Markt Argumenten
            </span>
            <div className="space-y-1">
              {data.marketArguments.map((arg, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-blue-500/5 border border-blue-500/20">
                  <Shield className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                  <span>{arg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Reasoning */}
        {data.reasoning && (
          <div className="space-y-2">
            <span className="text-sm font-semibold">AI Analyse</span>
            <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
              {data.reasoning}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
