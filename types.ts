
export interface PlantIdentification {
  comun: string;
  cientifico: string;
}

export interface PlantHealth {
  estado: 'óptimo' | 'alerta' | 'crítico';
  observaciones: string;
  hidrometria?: number; 
  analisis_foliar?: string;
  riesgo_plagas?: 'bajo' | 'medio' | 'alto';
  vigor_index?: number; 
  estado_raices?: number; 
}

export interface PlantMeasures {
  altura_cm: number;
  longitud_max_tallo_cm?: number;
  maceta_diametro_cm: number;
  maceta_altura_cm?: number;
  altura_max_especie_cm?: number;
}

export interface SeasonalCare {
  primavera: string;
  verano: string;
  otono: string;
  invierno: string;
}

export interface PlantCare {
  agua_ml: number;
  frecuencia_dias: number;
  luz_optima: string;
  temp_min: number;
  temp_max: number;
  temp_optima: number;
  balance_hidrico_status?: string;
  forma_riego: string;
  cantidad_agua_info: string;
  recomendacion_aspersion: string;
  periodicidad_estacional: SeasonalCare;
}

export interface BotanicalDetails {
  origen_geografico: string;
  tipo_hojas: string;
  tipo_raices: string;
  particularidades: string;
  curiosidades: string;
  longevidad_estimada: string;
  explicacion_botanica_extensa: string;
}

export interface DatedImage {
  url: string;
  fecha: string; 
}

export interface AbonoRegistro {
  fecha: string;
  tipo: 'líquido' | 'barritas';
}

export interface HidrometriaRegistro {
  fecha: string;
  valor: number;
  img?: string;
}

export interface TransplantStudy {
  necesidad: 'inmediata' | 'recomendada' | 'preparar' | 'no_necesario';
  maceta_objetivo_cm: number;
  proxima_fecha_estimada: string;
  riesgo_trauma: 'alto' | 'medio' | 'bajo';
  analisis_relacion: string;
}

export interface PlantData {
  id: string;
  ubicacion: string;
  identificacion: PlantIdentification;
  salud: PlantHealth;
  medidas_sugeridas: PlantMeasures;
  medidas_usuario?: PlantMeasures;
  estudio_trasplante?: TransplantStudy;
  cuidados: PlantCare;
  ficha_botanica: BotanicalDetails;
  images: DatedImage[];
  historial_riego: string[]; 
  historial_abono: AbonoRegistro[];
  historial_hidrometria: HidrometriaRegistro[];
  fecha_creacion: string;
}

export interface GeminiResponse {
  identificacion: PlantIdentification;
  salud: PlantHealth;
  medidas_sugeridas: PlantMeasures;
  estudio_trasplante: TransplantStudy;
  cuidados: PlantCare;
  ficha_botanica: BotanicalDetails;
}
