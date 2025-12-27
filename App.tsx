import React, { useState, useEffect } from 'react';
import { PlantData, GeminiResponse } from './types';
import { getPlants, savePlant, compressImage } from './utils';
import { analyzePlant } from './geminiService';
import { CameraIcon, PlusIcon, HistoryIcon } from './components/Icons';

const App: React.FC = () => {
  const [plants, setPlants] = useState<PlantData[]>([]);
  const [isKeySetupComplete, setIsKeySetupComplete] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  useEffect(() => {
    setPlants(getPlants());
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = () => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const savedLocalKey = localStorage.getItem('custom_gemini_api_key');
    
    if ((envKey && envKey !== "undefined") || savedLocalKey) {
      setIsKeySetupComplete(true);
    } else {
      setIsKeySetupComplete(false);
    }
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: string[] = [];
    for (const file of files) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(base64);
      newImages.push(compressed);
    }
    setCapturedImages(newImages);
  };

  if (isKeySetupComplete === false) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-2xl w-full max-w-md">
          <h1 className="font-serif text-3xl text-emerald-300 italic mb-4">Configuración</h1>
          <p className="text-emerald-100/60 mb-8 text-sm">Vincule su clave de Google AI Studio para activar la IA.</p>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" className="block w-full bg-emerald-500 text-emerald-950 py-4 rounded-2xl font-black text-[10px] tracking-widest mb-4">1. OBTENER CLAVE API</a>
          <input 
            type="password" 
            placeholder="2. Pegar clave aquí..." 
            className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-white mb-4 outline-none focus:border-emerald-500"
            onChange={(e) => e.target.value.length > 10 && localStorage.setItem('custom_gemini_api_key', e.target.value)}
          />
          <button onClick={() => window.location.reload()} className="w-full bg-white text-emerald-950 py-4 rounded-2xl font-black text-[10px] tracking-widest">ACTIVAR SISTEMA</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2d2d2d] max-w-md mx-auto relative font-sans">
      <header className="px-6 pt-12 pb-6 border-b border-stone-200/60">
        <h1 className="font-serif text-3xl text-emerald-950 italic">Botanica <span className="text-emerald-600 font-sans font-black not-italic">PRO</span></h1>
      </header>

      <main className="p-6">
        {isAnalyzing ? (
          <div className="text-center py-20 italic text-emerald-800">Analizando espécimen...</div>
        ) : (
          <div className="space-y-4">
            {plants.map(plant => (
              <div key={plant.id} className="bg-white p-4 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
                <img src={plant.images[0]?.url} className="w-16 h-16 rounded-2xl object-cover" />
                <div>
                  <h3 className="font-serif italic text-emerald-950">{plant.identificacion.cientifico}</h3>
                  <p className="text-[10px] font-black uppercase text-emerald-700/50">{plant.identificacion.comun}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 border-t h-24 flex items-center justify-around px-10 max-w-md mx-auto rounded-t-[3rem]">
        <button onClick={() => window.location.reload()}><HistoryIcon /><span className="block text-[8px] font-black mt-1 uppercase text-stone-300">Archivo</span></button>
        <label className="cursor-pointer bg-emerald-700 text-white p-4 rounded-full -mt-12 shadow-xl">
          <PlusIcon />
          <input type="file" className="hidden" onChange={handleFileSelection} />
        </label>
        <button className="text-stone-300"><CameraIcon /><span className="block text-[8px] font-black mt-1 uppercase">Scanner</span></button>
      </nav>
    </div>
  );
};

export default App;