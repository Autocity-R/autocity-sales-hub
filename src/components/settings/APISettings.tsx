
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Plus, Trash2, Eye, EyeOff, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const APISettings = () => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState([
    {
      id: 1,
      name: "CloudFlare CDN",
      key: "cf_1234567890abcdef",
      service: "CDN",
      isActive: true,
      lastUsed: "2024-01-15"
    },
    {
      id: 2,
      name: "Email Service",
      key: "email_9876543210fedcba",
      service: "Email",
      isActive: true,
      lastUsed: "2024-01-14"
    }
  ]);

  const [newApiKey, setNewApiKey] = useState({
    name: "",
    key: "",
    service: ""
  });

  const [showKeys, setShowKeys] = useState<{[key: number]: boolean}>({});

  const toggleKeyVisibility = (id: number) => {
    setShowKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Gekopieerd",
      description: "API sleutel is gekopieerd naar klembord.",
    });
  };

  const handleAddApiKey = () => {
    if (!newApiKey.name || !newApiKey.key || !newApiKey.service) {
      toast({
        title: "Fout",
        description: "Vul alle velden in.",
        variant: "destructive"
      });
      return;
    }

    const newKey = {
      id: Date.now(),
      name: newApiKey.name,
      key: newApiKey.key,
      service: newApiKey.service,
      isActive: true,
      lastUsed: "Nog niet gebruikt"
    };

    setApiKeys(prev => [...prev, newKey]);
    setNewApiKey({ name: "", key: "", service: "" });
    
    toast({
      title: "API sleutel toegevoegd",
      description: `${newApiKey.name} is succesvol toegevoegd.`,
    });
  };

  const handleRemoveApiKey = (id: number) => {
    setApiKeys(prev => prev.filter(key => key.id !== id));
    toast({
      title: "API sleutel verwijderd",
      description: "De API sleutel is verwijderd uit het systeem.",
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + "*".repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Sleutels Beheer
          </CardTitle>
          <CardDescription>
            Beheer API sleutels voor externe systeem koppelingen (Alleen voor Admin)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{apiKey.name}</span>
                    <Badge variant="outline">{apiKey.service}</Badge>
                    <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                      {apiKey.isActive ? "Actief" : "Inactief"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 font-mono">
                    {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                  </div>
                  <span className="text-xs text-gray-400">Laatst gebruikt: {apiKey.lastUsed}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleKeyVisibility(apiKey.id)}
                >
                  {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(apiKey.key)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveApiKey(apiKey.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nieuwe API Sleutel Toevoegen
          </CardTitle>
          <CardDescription>
            Voeg een nieuwe API sleutel toe voor systeemkoppelingen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Service Naam</Label>
              <Input
                id="keyName"
                placeholder="bijv. CloudFlare CDN"
                value={newApiKey.name}
                onChange={(e) => setNewApiKey(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyService">Service Type</Label>
              <Input
                id="keyService"
                placeholder="bijv. CDN, Email, Storage"
                value={newApiKey.service}
                onChange={(e) => setNewApiKey(prev => ({ ...prev, service: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Sleutel</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Voer de API sleutel in"
              value={newApiKey.key}
              onChange={(e) => setNewApiKey(prev => ({ ...prev, key: e.target.value }))}
            />
          </div>
          
          <Button onClick={handleAddApiKey} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            API Sleutel Toevoegen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
