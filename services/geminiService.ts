/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import { Asset } from "../types";

/**
 * Helper to strip the data URL prefix (e.g. "data:image/png;base64,")
 */
const getBase64Data = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

/**
 * Analyzes an image to detect distinct physical objects.
 */
export const analyzeScene = async (scene: Asset): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    const parts = [
      {
        inlineData: {
          mimeType: scene.mimeType,
          data: getBase64Data(scene.data),
        },
      },
      {
        text: "Analyze this image and return a comma-separated list of distinct physical objects visible. Example: Bottle, Shoe, Box.",
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
    });

    const text = response.text || "";
    // Simple parsing: split by comma, trim, filter empty, capitalize
    return text.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1));

  } catch (error) {
    console.error("Scene analysis failed:", error);
    throw error;
  }
};

/**
 * Isolates a specific object from the scene onto a white background.
 */
export const isolateObject = async (scene: Asset, objectName: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-image-preview';

    const parts = [
      {
        inlineData: {
          mimeType: scene.mimeType,
          data: getBase64Data(scene.data),
        },
      },
      {
        text: `TASK: Object Isolation. Identify the '${objectName}' in the image. Crop it exactly and place it on a white background. CRITICAL: Do NOT generate a new object. Preserve the original pixels, lighting, and texture exactly. Output only the isolated image.`,
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Object isolation failed:", error);
    throw error;
  }
};

/**
 * Generates a new logo or product base from scratch using text.
 * Kept for Asset creation functionality.
 */
export const generateAsset = async (prompt: string, type: 'logo' | 'product'): Promise<string> => {
   try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-image-preview';
    
    const enhancedPrompt = type === 'logo' 
        ? `A high-quality, professional vector-style logo design of a ${prompt}. Isolated on a pure white background. Minimalist and clean, single distinct logo.`
        : `Professional studio photography of a single ${prompt}. High resolution, photorealistic. Single object only, no stacks, no duplicates.`;

    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [{ text: enhancedPrompt }]
        },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                 return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
     throw new Error("No image generated");

   } catch (error) {
       console.error("Asset generation failed:", error);
       throw error;
   }
}
