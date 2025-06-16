
// Helper functions for webhook operations
export const getSuggestedActions = (message: string, systemData: any, permissions: any): string[] => {
  const suggestions: string[] = [];
  const lowerMessage = message.toLowerCase();

  if (permissions.appointments) {
    if (lowerMessage.includes('afspraak') || lowerMessage.includes('inplan')) {
      suggestions.push('create_appointment');
    }
    if (lowerMessage.includes('beschikbaar') || lowerMessage.includes('vrij')) {
      suggestions.push('check_availability');
    }
  }

  if (permissions.vehicles) {
    if (lowerMessage.includes('auto') || lowerMessage.includes('voertuig') || lowerMessage.includes('car')) {
      suggestions.push('search_vehicles');
    }
    if (lowerMessage.includes('voorraad') || lowerMessage.includes('beschikbare')) {
      suggestions.push('list_available_vehicles');
    }
  }

  if (permissions.contacts) {
    if (lowerMessage.includes('klant') || lowerMessage.includes('contact') || lowerMessage.includes('customer')) {
      suggestions.push('search_customers');
    }
  }

  return suggestions;
};
