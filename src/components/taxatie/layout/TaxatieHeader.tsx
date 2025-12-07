import React from 'react';
import { Car, TrendingUp, Brain, Database } from 'lucide-react';

export const TaxatieHeader = () => {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-6 mb-6">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Voertuig Taxatie</h1>
            <p className="text-sm text-muted-foreground">
              Professionele waardering met marktanalyse en AI-advies
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FeatureCard
            icon={<Database className="h-4 w-4" />}
            title="Portaalanalyse"
            description="Real-time marktdata"
            color="text-orange-600"
            bgColor="bg-orange-500/10"
          />
          <FeatureCard
            icon={<TrendingUp className="h-4 w-4" />}
            title="Courantheid"
            description="APR & ETR scores"
            color="text-purple-600"
            bgColor="bg-purple-500/10"
          />
          <FeatureCard
            icon={<Car className="h-4 w-4" />}
            title="JP Cars"
            description="Indicatieve waarde"
            color="text-amber-600"
            bgColor="bg-amber-500/10"
          />
          <FeatureCard
            icon={<Brain className="h-4 w-4" />}
            title="AI Advies"
            description="Slimme prijsanalyse"
            color="text-green-600"
            bgColor="bg-green-500/10"
          />
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const FeatureCard = ({ icon, title, description, color, bgColor }: FeatureCardProps) => (
  <div className={`flex items-center gap-2 p-2 rounded-lg ${bgColor} border border-transparent`}>
    <div className={`${color}`}>{icon}</div>
    <div>
      <p className={`text-xs font-medium ${color}`}>{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);
