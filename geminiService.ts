
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "./types";

export async function analyzePlant(base64Images: string[], currentPotSize?: number): Promise<GeminiResponse> {
  // Intentamos obtener la clave de forma segura
  let apiKey: string | undefined;
  try {
    apiKey = process.env.API_KEY;
  } catch (e) {
    apiKey = undefined;
  }
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("API_KEY_MISSING: La clave API no está configurada en el entorno de ejecución.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts = base64Images.map(img => ({
    inlineData: {
      data: img.split(',')[1],
      mimeType: "image/jpeg"
    }
  }));

  const prompt = `Actúa como un Arquitecto Botánico Senior y Etnobotánico. Realiza una telemetría y monografía completa del espécimen en las imágenes.
  
  OBLIGATORIO:
  1. Identificación: Nombres científicos y comunes precisos.
  2. Biometría: Altura actual, maceta y ALTURA MÁXIMA potencial.
  3. Longevidad: Ciclo de vida y esperanza de vida.
  4. Salud: Análisis foliar, turgencia y vigor radicular.
  5. Cuidados Técnicos: Riego (técnica, ml, guía aspersión) y estacionalidad completa.
  6. Botánica Avanzada: Origen evolutivo, CURIOSIDADES históricas y PARTICULARIDADES únicas de la especie.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash es óptimo para estabilidad en Vercel
      contents: { parts: [...parts, { text: prompt }] },
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identificacion: {
              type: Type.OBJECT,
              properties: { cientifico: { type: Type.STRING }, comun: { type: Type.STRING } },
              required: ["cientifico", "comun"]
            },
            salud: {
              type: Type.OBJECT,
              properties: {
                estado: { type: Type.STRING }, observaciones: { type: Type.STRING },
                hidrometria: { type: Type.NUMBER }, analisis_foliar: { type: Type.STRING },
                riesgo_plagas: { type: Type.STRING }, vigor_index: { type: Type.NUMBER },
                estado_raices: { type: Type.NUMBER }
              },
              required: ["estado", "observaciones", "analisis_foliar", "vigor_index", "estado_raices"]
            },
            medidas_sugeridas: {
              type: Type.OBJECT,
              properties: {
                altura_cm: { type: Type.NUMBER }, maceta_diametro_cm: { type: Type.NUMBER },
                maceta_altura_cm: { type: Type.NUMBER }, altura_max_especie_cm: { type: Type.NUMBER }
              },
              required: ["altura_cm", "maceta_diametro_cm", "altura_max_especie_cm"]
            },
            estudio_trasplante: {
              type: Type.OBJECT,
              properties: {
                necesidad: { type: Type.STRING }, maceta_objetivo_cm: { type: Type.NUMBER },
                proxima_fecha_estimada: { type: Type.STRING }, riesgo_trauma: { type: Type.STRING },
                analisis_relacion: { type: Type.STRING }
              },
              required: ["necesidad", "maceta_objetivo_cm", "proxima_fecha_estimada"]
            },
            cuidados: {
              type: Type.OBJECT,
              properties: {
                agua_ml: { type: Type.NUMBER }, frecuencia_dias: { type: Type.NUMBER },
                luz_optima: { type: Type.STRING }, temp_min: { type: Type.NUMBER },
                temp_max: { type: Type.NUMBER }, temp_optima: { type: Type.NUMBER },
                forma_riego: { type: Type.STRING }, cantidad_agua_info: { type: Type.STRING },
                recomendacion_aspersion: { type: Type.STRING },
                periodicidad_estacional: {
                  type: Type.OBJECT,
                  properties: {
                    primavera: { type: Type.STRING }, verano: { type: Type.STRING },
                    otono: { type: Type.STRING }, invierno: { type: Type.STRING }
                  },
                  required: ["primavera", "verano", "otono", "invierno"]
                }
              },
              required: ["agua_ml", "frecuencia_dias", "luz_optima", "forma_riego", "cantidad_agua_info", "recomendacion_aspersion", "periodicidad_estacional"]
            },
            ficha_botanica: {
              type: Type.OBJECT,
              properties: {
                origen_geografico: { type: Type.STRING }, tipo_hojas: { type: Type.STRING },
                tipo_raices: { type: Type.STRING }, particularidades: { type: Type.STRING },
                curiosidades: { type: Type.STRING }, longevidad_estimada: { type: Type.STRING },
                explicacion_botanica_extensa: { type: Type.STRING }
              },
              required: ["origen_geografico", "longevidad_estimada", "explicacion_botanica_extensa", "tipo_hojas", "tipo_raices", "curiosidades", "particularidades"]
            }
          },
          required: ["identificacion", "salud", "medidas_sugeridas", "cuidados", "ficha_botanica", "estudio_trasplante"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE: El modelo no devolvió datos.");
    return JSON.parse(text.trim()) as GeminiResponse;
  } catch (error: any) {
    console.error("DEBUG_BOTANICA:", error);
    // Propagamos el error con un prefijo para identificarlo en la UI
    throw new Error(`ANALYSIS_FAILED: ${error.message || "Error en red o procesamiento"}`);
  }
}

export async function quickHydrometryUpdate(base64Image: string): Promise<number> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [
      { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
      { text: "Humedad sustrato 0-10. Solo número." }
    ] }
  });
  return parseInt(response.text?.trim() || "5") || 5;
}
