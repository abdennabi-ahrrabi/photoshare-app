import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';

let visionClient: ComputerVisionClient | null = null;

function getVisionClient(): ComputerVisionClient | null {
  if (visionClient) return visionClient;

  const key = process.env.COMPUTER_VISION_KEY;
  const endpoint = 'https://swedencentral.api.cognitive.microsoft.com/';

  if (!key) {
    console.warn('COMPUTER_VISION_KEY not configured - auto-tagging disabled');
    return null;
  }

  try {
    const credentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } });
    visionClient = new ComputerVisionClient(credentials, endpoint);
    return visionClient;
  } catch (error) {
    console.error('Failed to create Computer Vision client:', error);
    return null;
  }
}

export async function analyzeImage(imageUrl: string): Promise<string[]> {
  try {
    const client = getVisionClient();
    if (!client) return [];

    const result = await client.analyzeImage(imageUrl, {
      visualFeatures: ['Tags', 'Description', 'Objects'],
    });

    const tags: string[] = [];

    // Add tags with confidence > 0.7
    if (result.tags) {
      for (const tag of result.tags) {
        if (tag.name && tag.confidence && tag.confidence > 0.7) {
          tags.push(tag.name);
        }
      }
    }

    // Add detected objects
    if (result.objects) {
      for (const obj of result.objects) {
        if (obj.object && !tags.includes(obj.object)) {
          tags.push(obj.object);
        }
      }
    }

    // Add description captions as tags
    if (result.description?.captions) {
      for (const caption of result.description.captions) {
        if (caption.text && caption.confidence && caption.confidence > 0.5) {
          // Extract key words from caption (skip common words)
          const words = caption.text.toLowerCase().split(' ');
          const skipWords = ['a', 'an', 'the', 'is', 'are', 'in', 'on', 'at', 'of', 'and', 'or', 'with'];
          for (const word of words) {
            if (word.length > 3 && !skipWords.includes(word) && !tags.includes(word)) {
              tags.push(word);
            }
          }
        }
      }
    }

    // Limit to top 10 tags
    return tags.slice(0, 10);
  } catch (error) {
    console.error('Computer Vision analysis error:', error);
    return [];
  }
}
