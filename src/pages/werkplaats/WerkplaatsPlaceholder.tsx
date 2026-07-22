import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Hammer } from "lucide-react";

const WerkplaatsPlaceholder: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <DashboardLayout>
    <div className="max-w-3xl mx-auto py-16">
      <Card>
        <CardContent className="flex flex-col items-center text-center gap-4 py-16">
          <div className="p-4 rounded-full bg-amber-100 text-amber-700">
            <Hammer className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground max-w-md">
            {description ?? "Jouw planning komt in de volgende bouwfase."}
          </p>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default WerkplaatsPlaceholder;