
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  AlertTriangle, 
  Lightbulb, 
  TrendingUp, 
  Target,
  MessageSquare,
  Send,
  Bot,
  User,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";
import { FinancialMetrics } from "@/types/reports";
import { generateFinancialAdvice } from "@/services/reportsService";
import { PerformanceData } from "@/types/reports";

interface Message {
  id: number;
  type: 'agent' | 'user';
  content: string;
  timestamp: Date;
}

interface FinancialAgentProps {
  reportData: PerformanceData;
}

export const FinancialAgent: React.FC<FinancialAgentProps> = ({ reportData }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'agent',
      content: 'Hallo! Ik ben je Financial Agent AI. Ik heb de laatste financiële data geanalyseerd en heb enkele belangrijke inzichten voor je.',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const financialAdvice = generateFinancialAdvice(reportData);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now() + 1,
        type: 'agent',
        content: generateAIResponse(inputMessage, reportData),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const generateAIResponse = (question: string, data: PerformanceData): string => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('marge') || lowerQuestion.includes('winst')) {
      return `Gebaseerd op de data: je bruto marge is ${formatPercentage(data.financial.grossMargin)} en netto marge ${formatPercentage(data.financial.netMargin)}. Dit zijn ${data.financial.grossMargin > 20 ? 'uitstekende' : data.financial.grossMargin > 15 ? 'goede' : 'gemiddelde'} marges voor de automotive sector.`;
    }
    
    if (lowerQuestion.includes('cashflow') || lowerQuestion.includes('liquiditeit')) {
      return `Je operationele cashflow is ${formatCurrency(data.financial.cashFlow)}, wat een gezonde liquide positie aangeeft. De EBITDA van ${formatCurrency(data.financial.ebitda)} toont sterke operationele prestaties.`;
    }
    
    if (lowerQuestion.includes('kosten') || lowerQuestion.includes('uitgaven')) {
      return `Totale kosten bedragen ${formatCurrency(data.financial.totalCosts)}, waarvan ongeveer 66% direct gerelateerd is aan voertuiginkoop. Operationele kosten zijn ${formatCurrency(data.financial.operatingExpenses)}.`;
    }
    
    if (lowerQuestion.includes('advies') || lowerQuestion.includes('aanbeveling')) {
      return `Mijn belangrijkste aanbevelingen: 1) Focus op modellen met hogere marges, 2) Optimaliseer voorraadrotatie voor betere cashflow, 3) Overweeg prijsoptimalisatie voor langzaam draaiende modellen.`;
    }
    
    return `Bedankt voor je vraag. Gebaseerd op de huidige data kan ik je helpen met specifieke financiële analyses. Vraag me naar marges, cashflow, kosten of specifieke aanbevelingen.`;
  };

  const keyInsights = [
    {
      type: 'success' as const,
      icon: CheckCircle,
      title: 'Sterke Winstgevendheid',
      description: `Netto marge van ${formatPercentage(reportData.financial.netMargin)} ligt boven branche gemiddelde`,
      action: 'Behoud huidige strategie'
    },
    {
      type: reportData.financial.cashFlow > reportData.financial.netProfit ? 'success' : 'warning' as const,
      icon: reportData.financial.cashFlow > reportData.financial.netProfit ? CheckCircle : AlertTriangle,
      title: 'Cashflow Status',
      description: `Operationele cashflow ${formatCurrency(reportData.financial.cashFlow)}`,
      action: reportData.financial.cashFlow > reportData.financial.netProfit ? 'Uitstekende liquiditeit' : 'Monitor debiteuren'
    },
    {
      type: reportData.financial.profitGrowth > 0 ? 'success' : 'error' as const,
      icon: reportData.financial.profitGrowth > 0 ? TrendingUp : XCircle,
      title: 'Winstgroei',
      description: `${formatPercentage(Math.abs(reportData.financial.profitGrowth))} ${reportData.financial.profitGrowth > 0 ? 'groei' : 'daling'}`,
      action: reportData.financial.profitGrowth > 0 ? 'Positieve trend' : 'Actie vereist'
    }
  ];

  return (
    <div className="space-y-6">
      {/* AI Agent Header */}
      <Card className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white border-0 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur">
              <Brain className="h-8 w-8" />
            </div>
            Financial Agent AI
            <Badge className="bg-green-500/20 text-green-200 border-green-400">ACTIEF</Badge>
          </CardTitle>
          <p className="text-indigo-200 text-lg">
            Geavanceerde financiële analyse en strategische aanbevelingen voor optimale bedrijfsprestaties
          </p>
        </CardHeader>
      </Card>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {keyInsights.map((insight, index) => (
          <Card key={index} className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  insight.type === 'success' ? 'bg-green-100' :
                  insight.type === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <insight.icon className={`h-6 w-6 ${
                    insight.type === 'success' ? 'text-green-600' :
                    insight.type === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-2">{insight.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  <Badge className={`${
                    insight.type === 'success' ? 'bg-green-500' :
                    insight.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  } text-white`}>
                    {insight.action}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Messages */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              AI Financiële Assistent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
              {messages.map((message) => (
                <div key={message.id} className={`flex items-start gap-3 ${
                  message.type === 'user' ? 'flex-row-reverse' : ''
                }`}>
                  <div className={`p-2 rounded-full ${
                    message.type === 'agent' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {message.type === 'agent' ? (
                      <Bot className="h-4 w-4 text-white" />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className={`max-w-sm p-3 rounded-lg ${
                    message.type === 'agent' 
                      ? 'bg-white border border-gray-200 text-gray-800' 
                      : 'bg-blue-500 text-white'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString('nl-NL', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Vraag me over financiële data, marges, cashflow..."
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleSendMessage} className="bg-blue-500 hover:bg-blue-600">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Recommendations */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Strategische Aanbevelingen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {financialAdvice.map((advice, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-800 leading-relaxed">{advice}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-800 mb-3">Snelle Acties</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setInputMessage('Geef me een analyse van de winstmarges')}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Analyseer Winstmarges
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setInputMessage('Hoe kan ik de cashflow verbeteren?')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Verbeter Cashflow
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setInputMessage('Welke kosten kan ik optimaliseren?')}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Optimaliseer Kosten
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
