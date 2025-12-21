
import { PlantData, PlantHealth } from "./types";

export const PI = Math.PI;

export async function compressImage(base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}

export function savePlant(plant: PlantData) {
  const STORAGE_KEY = 'botanica_pro_plants';
  try {
    const plants = getPlants();
    const index = plants.findIndex(p => p.id === plant.id);
    if (index >= 0) plants[index] = plant;
    else plants.push(plant);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  } catch (e) {
    throw new Error("Memoria llena. Borra plantas antiguas.");
  }
}

export function getPlants(): PlantData[] {
  try {
    const data = localStorage.getItem('botanica_pro_plants');
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
}

export function getNextWateringDate(plant: PlantData): Date {
  const history = plant.historial_riego || [];
  if (history.length === 0) return new Date();
  const lastDate = new Date([...history].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]);
  const freq = plant.cuidados?.frecuencia_dias || 7;
  const next = new Date(lastDate);
  next.setDate(lastDate.getDate() + freq);
  return next;
}

export function getNextFertilizingDate(plant: PlantData): Date | null {
  const history = plant.historial_abono || [];
  if (history.length === 0) return new Date();
  const lastDate = new Date([...history].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0].fecha);
  const next = new Date(lastDate);
  next.setDate(lastDate.getDate() + 30);
  return next;
}

export function formatShortDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "Pendiente";
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
}
