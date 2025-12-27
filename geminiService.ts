import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "./types";

/**
 * Obtiene la clave de API priorizando:
 * 1. Variables de entorno (Vercel/Sistema)
 * 2. Almacenamiento local (Configuración manual del usuario)
 */
const getApiKey = () => {
  try {
    // Intenta obtener la clave de las variables de entorno de Vite/Vercel
    const systemKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (systemKey && systemKey !== "undefined" && systemKey !== "") return systemKey;
    
    // Si no existe, busca la clave que el usuario introdujo manualmente en el navegador
    return localStorage.getItem('custom_gemini_api_key') || "";
  } catch (e) {
    return "";
  }
};

export async function analyzePlant(base64Images: string[], currentPotSize?: number): Promise<GeminiResponse> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: {
        responseMimeType: "application/json",
    }
  });

  const prompt = `Analyze this plant specimen. ${currentPotSize ? `The current pot diameter is ${currentPotSize}cm.` : ''}
    Return a JSON object following this structure:
    {
      "common_name": "Name",
      "scientific_name": "Name",
      "family": "Family",
      "origin": "Region",
      "description": "Short description",
      "vigor_index": 0-10,
      "health_status": "optimal" | "stressed" | "critical",
      "health_analysis": "Detail the current state",
      "hydrometry": 0-10,
      "needs": {
        "water": "Frequency and method",
        "light": "Requirements",
        "temperature": "Ideal range",
        "substrate": "Type",
        "fertilizer": "Timing"
      },
      "growth_stage": "seedling" | "vegetative" | "flowering" | "mature",
      "maintenance_tasks": ["task 1", "task 2"],
      "pot_analysis": {
        "current_size": ${currentPotSize || 'unknown'},
        "needs_repotting": boolean,
        "recommended_size": number (cm),
        "reason": "Why"
      }
    }
    Be precise, botanical, and professional. Use Spanish for the descriptions and analysis.`;

  const result = await model.generateContent([
    prompt,
    ...base64Images.map(inlineData => ({
      inlineData: {
        data: inlineData.split(',')[1],
        mimeType: "image/jpeg"
      }
    }))
  ]);

  const response = await result.response;
  return JSON.parse(response.text()) as GeminiResponse;
}

export async function quickHydrometryUpdate(base64Image: string): Promise<{ hydrometry: number, health_status: string }> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `Analyze only the substrate and visible hydration of this plant. 
    Return JSON: {"hydrometry": 0-10, "health_status": "optimal"|"stressed"|"critical"}`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } }
  ]);

  return JSON.parse(result.response.text());
}