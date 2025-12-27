
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "./types";

export async function analyzePlant(base64Images: string[], currentPotSize?: number): Promise<GeminiResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts = base64Images.map(img => ({
    inlineData: {
      data: img.split(',')[1],
      mimeType: "image/jpeg"
    }
  }));

  const prompt = `Actúa como un Arquitecto Botánico Senior y Curador de Jardines Reales. 
  Realiza una telemetría avanzada y diagnóstico del espécimen basado en las imágenes.
  
  REGLAS TÉCNICAS:
  - vigor_index y estado_raices: 0-100.
  - hidrometria: 0-10.
  
  ENFOQUE CRÍTICO:
  1. ANÁLISIS FOLIAR: Detalla coloración, turgencia y anomalías visibles.
  2. BIOMETRÍA: Estima altura total, longitud de tallos principales y medidas de maceta.
  3. MANTENIMIENTO MAESTRO (Protocolos): Proporciona instrucciones específicas sobre:
     - Poda: Técnica exacta, herramientas y época ideal.
     - Limpieza: Método para mantener las hojas libres de polvo (paño húmedo, lluvia, etc.).
     - Retirada de Hojas: Cómo identificar hojas que drenan energía y cómo removerlas sin trauma.
     - Tips de Oro: Secretos de cultivo para esta especie específica.`;

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
                estado: { type: Type.STRING }, 
                observaciones: { type: Type.STRING },
                hidrometria: { type: Type.NUMBER },
                analisis_foliar_detallado: {
                  type: Type.OBJECT,
                  properties: {
                    coloracion: { type: Type.STRING },
                    forma: { type: Type.STRING },
                    problemas_detectados: { type: Type.STRING },
                    turgencia: { type: Type.STRING }
                  },
                  required: ["coloracion", "forma", "problemas_detectados", "turgencia"]
                },
                riesgo_plagas: { type: Type.STRING }, 
                vigor_index: { type: Type.NUMBER },
                estado_raices: { type: Type.NUMBER }
              },
              required: ["estado", "observaciones", "analisis_foliar_detallado", "vigor_index", "estado_raices"]
            },
            medidas_sugeridas: {
              type: Type.OBJECT,
              properties: {
                altura_cm: { type: Type.NUMBER }, 
                longitud_max_tallo_cm: { type: Type.NUMBER },
                maceta_diametro_cm: { type: Type.NUMBER },
                maceta_altura_cm: { type: Type.NUMBER }, 
                altura_max_especie_cm: { type: Type.NUMBER }
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
                },
                mantenimiento_especifico: {
                  type: Type.OBJECT,
                  properties: {
                    poda: { type: Type.STRING },
                    limpieza_hojas: { type: Type.STRING },
                    retirada_hojas_secas: { type: Type.STRING },
                    otros_consejos: { type: Type.STRING }
                  },
                  required: ["poda", "limpieza_hojas", "retirada_hojas_secas", "otros_consejos"]
                }
              },
              required: ["agua_ml", "frecuencia_dias", "luz_optima", "forma_riego", "cantidad_agua_info", "recomendacion_aspersion", "periodicidad_estacional", "mantenimiento_especifico"]
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
    if (!text) throw new Error("La IA devolvió una respuesta vacía.");
    return JSON.parse(text.trim()) as GeminiResponse;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(error.message || "Error en el análisis botánico.");
  }
}

export async function quickHydrometryUpdate(base64Image: string): Promise<number> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [
      { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } },
      { text: "Nivel de humedad 0-10 (solo el número)." }
    ] }
  });
  return parseInt(response.text?.trim() || "5") || 5;
}
