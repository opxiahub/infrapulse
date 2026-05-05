import axios from 'axios';

export async function callGlobantLLM(
  system: string,
  user: string,
  modelName = "openai/gpt-5.4",
  expectJson = false
): Promise<any> {
  try {
    // API endpoint for Globant's internal LLM service
    const endpoint = "https://api.clients.geai.globant.com/chat";
    
    // Prepare the request payload
    const payload = {
      model: modelName,
      messages: [
        {
          role: "system",
          content: system
        },
        {
          role: "user",
          content: user
        }
      ],
      stream: false
    };
    
    // Headers for the request
    const headers = {
      'Authorization': `Bearer ${process.env.GLOBANT_API_KEY}`,
      'X-Saia-Cache-Enabled': 'false',
      'Content-Type': 'application/json'
    };
    
    console.log(`Making API call to Globant SAIA with model: ${modelName}`);
    
    // Make the API call
    const response = await axios.post(endpoint, payload, { headers });
    
    // Extract the content from the response
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      
      // If we expect JSON, try to parse it, handling potential Markdown formatting
      if (expectJson) {
        try {
          // Check if the response is wrapped in a code block (```json ... ```)
          const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            // Extract just the JSON part
            return JSON.parse(jsonMatch[1]);
          }
          
          // Try direct parsing if no code block is detected
          return JSON.parse(content);
        } catch (parseError) {
          console.error('Error parsing LLM response as JSON:', parseError);
          // For better debugging, log a snippet of the content that's causing issues
          console.error('Content causing the issue:', content.substring(0, 200));
          // Return null for JSON parsing failures
          return null;
        }
      }
      
      // Return the raw content if we don't need JSON
      return content;
    } else {
      console.warn('Unexpected response format from Globant SAIA API:', response.data);
      throw new Error('Unexpected response format from LLM API');
    }
  } catch (error: any) {
    console.error('Error calling Globant SAIA API:', error.message);
    throw new Error(`Failed to get LLM response: ${error.message}`);
  }
}
