
// Enhanced response parsing to handle all n8n formats
export const parseWebhookResponse = (responseData: string): { parsedData: any; returnMessage: string } => {
  console.log('🔍 RAW n8n response data:', responseData);
  
  let parsedData: any = responseData;

  // Enhanced response parsing to handle all n8n formats
  try {
    parsedData = JSON.parse(responseData);
    console.log('✅ Successfully parsed JSON response:', parsedData);
    console.log('🔍 JSON response structure:', {
      hasMessage: !!parsedData.message,
      hasData: !!parsedData.data,
      hasSuccess: !!parsedData.success,
      messageValue: parsedData.message,
      dataValue: parsedData.data,
      keys: Object.keys(parsedData || {})
    });
  } catch (parseError) {
    // If it's not JSON, treat as plain text and create proper response object
    console.log('📝 Response is plain text, not JSON:', responseData);
    console.log('🔍 Plain text length:', responseData.length);
    console.log('🔍 Trimmed text:', responseData.trim());
    
    parsedData = {
      success: true,
      message: responseData.trim() || 'Response received from webhook',
      data: { rawText: responseData.trim() }
    };
    
    console.log('🔧 Created parsed data object:', parsedData);
  }

  // FLEXIBLE message extraction - try ALL possible paths
  let returnMessage = 'Webhook executed successfully with CRM context';
  
  console.log('🔍 Starting FLEXIBLE message extraction...');
  console.log('🔍 Raw parsedData:', parsedData);
  
  // Priority 1: Direct message property
  if (parsedData?.message && typeof parsedData.message === 'string' && parsedData.message.trim()) {
    returnMessage = parsedData.message.trim();
    console.log('✅ Found message in parsedData.message:', returnMessage);
  }
  // Priority 2: Check if response is directly a string (n8n simple response)
  else if (typeof parsedData === 'string' && parsedData.trim()) {
    returnMessage = parsedData.trim();
    console.log('✅ Using parsedData as direct string:', returnMessage);
  }
  // Priority 3: Check nested data.message
  else if (parsedData?.data?.message && typeof parsedData.data.message === 'string' && parsedData.data.message.trim()) {
    returnMessage = parsedData.data.message.trim();
    console.log('✅ Found message in parsedData.data.message:', returnMessage);
  }
  // Priority 4: Check rawText property
  else if (parsedData?.data?.rawText && typeof parsedData.data.rawText === 'string' && parsedData.data.rawText.trim()) {
    returnMessage = parsedData.data.rawText.trim();
    console.log('✅ Found message in parsedData.data.rawText:', returnMessage);
  }
  // Priority 5: Try to find ANY text-like property in the response
  else if (parsedData && typeof parsedData === 'object') {
    console.log('🔍 Searching for any text property in response object...');
    
    // Check common property names that might contain the AI response
    const textProperties = ['text', 'content', 'output', 'response', 'result', 'answer', 'reply'];
    
    for (const prop of textProperties) {
      if (parsedData[prop] && typeof parsedData[prop] === 'string' && parsedData[prop].trim()) {
        returnMessage = parsedData[prop].trim();
        console.log(`✅ Found message in parsedData.${prop}:`, returnMessage);
        break;
      }
    }
    
    // If still no message found, check nested objects
    if (returnMessage === 'Webhook executed successfully with CRM context') {
      console.log('🔍 Checking nested objects for text content...');
      
      const checkNested = (obj: any, path: string = ''): string | null => {
        if (typeof obj === 'string' && obj.trim()) {
          return obj.trim();
        }
        
        if (obj && typeof obj === 'object') {
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.trim() && value.length > 10) {
              console.log(`✅ Found text in ${path}.${key}:`, value.trim());
              return value.trim();
            }
            
            if (value && typeof value === 'object') {
              const nested = checkNested(value, `${path}.${key}`);
              if (nested) return nested;
            }
          }
        }
        
        return null;
      };
      
      const nestedText = checkNested(parsedData);
      if (nestedText) {
        returnMessage = nestedText;
      }
    }
  }
  // Priority 6: Use raw response text if still nothing found
  else if (responseData && responseData.trim()) {
    returnMessage = responseData.trim();
    console.log('✅ Using raw response data as fallback:', returnMessage);
  }
  
  console.log('🎯 Final extracted message:', returnMessage);
  console.log('🎯 Message length:', returnMessage.length);

  return { parsedData, returnMessage };
};
