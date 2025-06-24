
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, CheckCircle, Zap, TrendingUp, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { upgradeHendrikPrompt } from "@/services/hendrikUpgradeService";

export const HendrikUpgradePanel = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeComplete, setUpgradeComplete] = useState(false);
  const { toast } = useToast();

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await upgradeHendrikPrompt();
      setUpgradeComplete(true);
      toast({
        title: "🚀 Hendrik Geüpgraded!",
        description: "Hendrik heeft nu de nieuwe sales intelligence framework.",
      });
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Fout",
        description: "Kon Hendrik niet upgraden. Probeer opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Bot className="h-5 w-5" />
          Hendrik Sales AI Upgrade
          {upgradeComplete && <Badge variant="default" className="bg-green-600">Geüpgraded</Badge>}
        </CardTitle>
        <CardDescription>
          Upgrade Hendrik naar de nieuwe Professional Automotive Lead Specialist framework
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            Deze upgrade transformeert Hendrik van een algemene AI naar een gespecialiseerde automotive sales expert met geavanceerde lead analyse en closing strategieën.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Sales Intelligence</span>
            </div>
            <p className="text-xs text-gray-600">5-fase lead analysis framework met automatische fase detectie</p>
          </div>

          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-sm">Sentiment Analysis</span>
            </div>
            <p className="text-xs text-gray-600">Emotionele herkenning patterns voor gepersonaliseerde responses</p>
          </div>

          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-sm">Objection Mastery</span>
            </div>
            <p className="text-xs text-gray-600">Geavanceerde objectie handling met closing protocols</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-2">Nieuwe Capabilities:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Lead Phase Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Sentiment Intelligence</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Objection Handling Framework</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Strategic Closing Protocols</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Communication Adaptation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Guarantee Management</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleUpgrade}
          disabled={isUpgrading || upgradeComplete}
          className="w-full"
          size="lg"
        >
          {isUpgrading ? (
            <>
              <Brain className="h-4 w-4 mr-2 animate-pulse" />
              Hendrik wordt geüpgraded...
            </>
          ) : upgradeComplete ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Upgrade Voltooid
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Upgrade Hendrik naar Sales Expert
            </>
          )}
        </Button>

        {upgradeComplete && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Hendrik is succesvol geüpgraded! Test de nieuwe capabilities in de AI Chat interface.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
