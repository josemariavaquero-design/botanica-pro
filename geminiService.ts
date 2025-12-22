
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "./types";

export async function analyzePlant(base64Images: string[], currentPotSize?: number): Promise<GeminiResponse> {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("API_KEY_MISSING: Por favor, vincula tu clave de API en el menú de configuración.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts = base64Images.map(img => ({
    inlineData: {
      data: img.split(',')[1],
      mimeType: "image/jpeg"
    }
  }));

  const prompt = `Actúa como un Arquitecto Botánico Senior y Etnobotánico. Realiza una telemetría completa del espécimen.
  
  REGLAS CRÍTICAS DE DATOS:
  - vigor_index: Debe ser un número ENTERO de 0 a 100 (ej: 85, no 0.85).
  - estado_raices: Debe ser un número ENTERO de 0 a 100.
  - hidrometria: Número entero de 0 a 10.
  
  CONTENIDO OBLIGATORIO:
  1. Identificación: Científica y común.
  2. Biometría: Altura y maceta actual vs potencial máximo.
  3. Longevidad: Ciclo vital estimado.
  4. Salud: Análisis foliar y vigor.
  5. Cuidados: Guía de riego (ml, frecuencia, técnica) y estacionalidad.
  6. Ficha Botánica: Origen, curiosidades y rasgos morfológicos únicos.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
                riesgo_plagas: { type: Type.STRING }, vigor_index: { type: Type.NUMBER, description: "Porcentaje entero de 0 a 100" },
                estado_raices: { type: Type.NUMBER, description: "Porcentaje entero de 0 a 100" }
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
    if (!text) throw new Error("EMPTY_RESPONSE");
    return JSON.parse(text.trim()) as GeminiResponse;
  } catch (error: any) {
    console.error("ANALYSIS_ERROR:", error);
    if (error.message?.includes("not found")) {
      throw new Error("Clave API no válida. Reconfigura el acceso.");
    }
    throw new Error(error.message || "Error en la telemetría botánica.");
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
      { text: "Humedad sustrato 0-10. Solo el número entero." }
    ] }
  });
  return parseInt(response.text?.trim() || "5") || 5;
}
