
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PerformanceData } from "@/types/reports";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  Target,
  Users,
  MessageCircle,
  ArrowRight
} from "lucide-react";

interface AIInsightsPanelProps {
  reportData: PerformanceData;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ reportData }) => {
  const insights = [
    {
      type: "opportunity",
      title: "Verbeter Reactietijd",
      description: "Gemiddelde reactietijd van 2.8u kan worden geoptimaliseerd naar 1.5u voor 15% betere conversie.",
      impact: "Hoog",
      icon: TrendingUp,
      color: "bg-green-500"
    },
    {
      type: "warning",
      title: "Lead Opvolging",
      description: "23% van qualified leads krijgt geen follow-up binnen 48u. Implementeer automatische herinneringen.",
      impact: "Medium",
      icon: AlertTriangle,
      color: "bg-yellow-500"
    },
    {
      type: "suggestion",
      title: "BMW Focus Strategie",
      description: "BMW toont hoogste marge (15.2%). Verhoog marketing budget voor BMW leads met 20%.",
      impact: "Hoog",
      icon: Lightbulb,
      color: "bg-blue-500"
    },
    {
      type: "performance",
      title: "Team Coaching",
      description: "Lisa van der Berg presteert 25% beter dan gemiddelde. Organiseer knowledge sharing sessie.",
      impact: "Medium",
      icon: Users,
      color: "bg-purple-500"
    }
  ];

  const aiQuestions = [
    "Hoe kan ik mijn lead conversie verhogen?",
    "Welke marketingkanalen presteren het best?",
    "Wanneer is het beste moment om leads te bellen?",
    "Hoe optimaliseer ik mijn voorraadrotatie?"
  ];

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <Card className="shadow-lg border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Business Insights
            <Badge className="bg-purple-100 text-purple-700 ml-2">BETA</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${insight.color}/10`}>
                    <insight.icon className={`h-4 w-4`} style={{ color: insight.color.replace('bg-', '#').replace('-500', '') }} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <Badge 
                        variant={insight.impact === 'Hoog' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {insight.impact} Impact
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      Implementeer <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant */}
      <Card className="shadow-lg border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Vraag de AI Assistent
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Krijg gepersonaliseerde business adviezen op basis van jouw data:
            </p>
            {aiQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full text-left justify-start h-auto p-3 text-xs hover:bg-blue-50"
              >
                <MessageCircle className="h-3 w-3 mr-2 text-blue-500" />
                {question}
              </Button>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">AI Leermodel Actief</span>
            </div>
            <p className="text-xs text-gray-600">
              De AI analyseert continu jouw verkoop patronen en klantgedrag voor betere aanbevelingen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Snelle Acties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Genereer Maandrapport
            </Button>
            <Button className="w-full justify-start" variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Team Performance Review
            </Button>
            <Button className="w-full justify-start" variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Lead Opvolging Alert
            </Button>
            <Button className="w-full justify-start" variant="outline" size="sm">
              <Lightbulb className="h-4 w-4 mr-2" />
              Optimalisatie Suggesties
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
