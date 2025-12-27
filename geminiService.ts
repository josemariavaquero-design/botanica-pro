import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "./types";

const getApiKey = () => {
  try {
    // Vite usa import.meta.env para las variables de entorno
    const systemKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (systemKey && systemKey !== "undefined" && systemKey !== "") return systemKey;
    
    // Si no hay variable de entorno, busca la clave manual del usuario
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
  
  // Usamos el modelo estable configurado en tu proyecto
  const model = ai.getGenerativeModel({ 
    model: "gemini-1.5-flash",
  });

  const parts = base64Images.map(img => ({
    inlineData: {
      data: img.split(',')[1],
      mimeType: "image/jpeg"
    }
  }));

  const prompt = `Actúa como un Arquitecto Botánico Senior. Realiza una telemetría completa del espécimen.
  ${currentPotSize ? `El diámetro de la maceta actual es de ${currentPotSize}cm.` : ''}
  
  REGLAS DE DATOS:
  - vigor_index: Entero 0-100.
  - estado_raices: Entero 0-100.
  - hidrometria: Entero 0-10.
  
  Devuelve exclusivamente un JSON con la estructura definida en el esquema.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [...parts, { text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const text = result.response.text();
    return JSON.parse(text) as GeminiResponse;
  } catch (error: any) {
    console.error("Error en análisis:", error);
    throw error;
  }
}

export async function quickHydrometryUpdate(base64Image: string): Promise<number> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const response = await model.generateContent({
    contents: [{ 
      role: "user", 
      parts: [
        { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
        { text: "Humedad sustrato 0-10. Solo el número entero." }
      ] 
    }]
  });
  return parseInt(response.response.text().trim()) || 5;
}