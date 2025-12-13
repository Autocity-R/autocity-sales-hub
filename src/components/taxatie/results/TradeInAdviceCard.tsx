import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingDown,
  Euro,
  AlertTriangle,
  ExternalLink,
  Lightbulb,
  Palette,
  Clock,
  Wrench,
  Shield,
  Fuel,
  Sun
} from 'lucide-react';
import type { TradeInAdvice, TradeInWarning } from '@/services/tradeInTaxatieService';
import type { JPCarsData } from '@/types/taxatie';

interface TradeInAdviceCardProps {
  data: TradeInAdvice | null;
  loading: boolean;
  jpCarsData?: JPCarsData | null;
}

export function TradeInAdviceCard({ data, loading, jpCarsData }: TradeInAdviceCardProps) {
  if (loading) {
    return (
      <Card className="border-orange-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Inruil Taxatie
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
            Inruil Taxatie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Start de taxatie om het inruil-advies te genereren
          </p>
        </CardContent>
      </Card>
    );
  }

  const getWarningIcon = (type: TradeInWarning['type']) => {
    switch (type) {
      case 'color': return <Palette className="h-4 w-4" />;
      case 'standingTime': return <Clock className="h-4 w-4" />;
      case 'modelRisk': return <Wrench className="h-4 w-4" />;
      case 'warranty': return <Shield className="h-4 w-4" />;
      case 'fuel': return <Fuel className="h-4 w-4" />;
      case 'season': return <Sun className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: TradeInWarning['severity']) => {
    switch (severity) {
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-700';
      case 'medium': return 'bg-amber-500/10 border-amber-500/30 text-amber-700';
      case 'low': return 'bg-blue-500/10 border-blue-500/30 text-blue-700';
      default: return 'bg-muted border-border';
    }
  };

  const getSeverityBadge = (severity: TradeInWarning['severity']) => {
    switch (severity) {
      case 'high': return <span className="inline-block w-2 h-2 rounded-full bg-red-500" />;
      case 'medium': return <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />;
      case 'low': return <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />;
      default: return null;
    }
  };

  return (
    <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Inruil Taxatie
          </CardTitle>
          {data.warningCount > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
              {data.warningCount} aandachtspunt{data.warningCount !== 1 ? 'en' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Marktwaarde Sectie */}
        <div className="p-4 rounded-lg bg-background/50 border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-muted-foreground">📊 Marktwaarde</span>
          </div>
          
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Laagste vergelijkbare</p>
              <p className="text-2xl font-bold">€{data.marketReferencePrice.toLocaleString('nl-NL')}</p>
            </div>
            {data.portalUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => window.open(data.portalUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Bekijk
              </Button>
            )}
          </div>
        </div>

        {/* Max Inkoopprijs Sectie */}
        <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Max Inkoopprijs</span>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-600">
              €{data.maxPurchasePrice.toLocaleString('nl-NL')}
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">
            Standaard correctie van {data.standardCorrectionPercentage}%
          </p>
        </div>

        <Separator />

        {/* Aandachtspunten / Waarschuwingen */}
        {data.warnings && data.warnings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">Aandachtspunten bij dit model</span>
            </div>
            
            <div className="space-y-2">
              {data.warnings.map((warning, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${getSeverityColor(warning.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getSeverityBadge(warning.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getWarningIcon(warning.type)}
                        <span className="font-medium text-sm">{warning.title}</span>
                      </div>
                      <p className="text-sm opacity-90">{warning.description}</p>
                      {warning.repairCost && (
                        <p className="text-xs mt-1 font-medium">
                          Geschatte reparatiekosten: {warning.repairCost}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Geen aandachtspunten */}
        {(!data.warnings || data.warnings.length === 0) && (
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
            <p className="text-sm text-green-700">
              ✓ Geen bijzondere aandachtspunten voor dit model
            </p>
          </div>
        )}

        <Separator />

        {/* Verkoper Hint - Subtiel onderaan */}
        <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {data.sellerAdvice}
            </p>
          </div>
        </div>

        {/* AI Reasoning - Klein onderaan */}
        {data.reasoning && (
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Toon berekening
            </summary>
            <div className="mt-2 p-2 rounded bg-muted/30 text-xs text-muted-foreground whitespace-pre-wrap">
              {data.reasoning}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
