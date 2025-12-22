
import React, { useState, useEffect, useRef } from 'react';
import { PlantData, GeminiResponse, AbonoRegistro, HidrometriaRegistro } from './types';
import { getPlants, savePlant, getNextWateringDate, getNextFertilizingDate, formatShortDate, compressImage } from './utils';
import { analyzePlant, quickHydrometryUpdate } from './geminiService';
import { CameraIcon, PlusIcon, WaterIcon, HistoryIcon, InfoIcon, FertilizerIcon, TrashIcon } from './components/Icons';
import PlantCalendar from './components/PlantCalendar';

type TabType = 'tipologia' | 'botanica' | 'mantenimiento' | 'historial';

const LOCATIONS = ["Salón", "Terraza", "Oficina", "Cocina", "Dormitorio", "Baño", "Pasillo", "Exterior", "Personalizado..."];

const HealthGauge: React.FC<{ vigor: number, size?: number }> = ({ vigor, size = 80 }) => {
  const normalizedVigor = vigor <= 1 && vigor > 0 ? Math.round(vigor * 100) : Math.round(vigor);
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedVigor / 100) * circumference;
  const color = normalizedVigor > 80 ? '#10b981' : normalizedVigor > 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#f1f1f1" strokeWidth="4" fill="transparent" />
        <circle 
          cx={size/2} cy={size/2} r={radius} 
          stroke={color} strokeWidth="4" fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round" 
          className="transition-all duration-1000 ease-out" 
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-black tracking-tighter" style={{ color }}>{normalizedVigor}%</span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [plants, setPlants] = useState<PlantData[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tipologia');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDayMenu, setShowDayMenu] = useState<{ date: string } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GeminiResponse | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isLargeFont, setIsLargeFont] = useState(() => localStorage.getItem('largeFont') === 'true');
  const [isKeySetupComplete, setIsKeySetupComplete] = useState(false);
  
  const [manualHeight, setManualHeight] = useState<number>(0);
  const [manualPotDiam, setManualPotDiam] = useState<number>(0);
  const [manualPotHeight, setManualPotHeight] = useState<number>(0);
  const [manualLocation, setManualLocation] = useState<string>(LOCATIONS[0]);
  const [customLoc, setCustomLoc] = useState("");

  const hidrometroRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlants(getPlants());
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    // Intentar leer la clave de forma segura
    let envKey = "";
    try {
      envKey = process.env.API_KEY || "";
    } catch (e) {}

    // 1. Si la clave ya está en el entorno (Vercel/Local), entramos directo
    if (envKey && envKey !== "undefined" && envKey !== "") {
      setIsKeySetupComplete(true);
      return;
    }

    // 2. Si NO estamos en AI Studio (ej: Vercel sin clave aún o Local), 
    // NO bloqueamos al usuario con la pantalla verde. Dejamos que entre.
    // El error de "falta clave" saltará solo cuando intente usar la IA.
    if (!(window as any).aistudio) {
      setIsKeySetupComplete(true);
      return;
    }

    // 3. Si estamos en AI Studio, usamos su sistema de validación
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setIsKeySetupComplete(hasKey);
    } catch (e) {
      setIsKeySetupComplete(true);
    }
  };

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setIsKeySetupComplete(true);
    } else {
      alert("⚠️ ENTORNO VERCEL DETECTADO:\n\nPara que la IA funcione, debes ir a tu Dashboard de Vercel > Settings > Environment Variables y añadir API_KEY con tu clave de Google.");
    }
  };

  const copyBotanicalInfo = () => {
    if (!selectedPlant) return;
    const text = `FICHA BOTÁNICA: ${selectedPlant.identificacion.cientifico}\n\nOrigen: ${selectedPlant.ficha_botanica.origen_geografico}\nLongevidad: ${selectedPlant.ficha_botanica.longevidad_estimada}\n\nINFORME:\n${selectedPlant.ficha_botanica.explicacion_botanica_extensa}\n\nCURIOSIDADES:\n${selectedPlant.ficha_botanica.curiosidades}`;
    navigator.clipboard.writeText(text);
    alert("Informe copiado.");
  };

  const toggleFontSize = () => {
    const newVal = !isLargeFont;
    setIsLargeFont(newVal);
    localStorage.setItem('largeFont', String(newVal));
  };

  const updatePlantData = (updated: PlantData) => {
    try {
      savePlant(updated);
      setPlants(getPlants());
      setSelectedPlant(updated);
    } catch (e: any) {
      alert("Error: Memoria local agotada.");
    }
  };

  const deleteHistoryItem = (type: 'riego' | 'abono' | 'hidrometria', index: number) => {
    if (!selectedPlant || !confirm("¿Eliminar registro?")) return;
    const updated = { ...selectedPlant };
    if (type === 'riego') updated.historial_riego = updated.historial_riego.filter((_, i) => i !== index);
    if (type === 'abono') updated.historial_abono = updated.historial_abono.filter((_, i) => i !== index);
    if (type === 'hidrometria') updated.historial_hidrometria = updated.historial_hidrometria.filter((_, i) => i !== index);
    updatePlantData(updated);
  };

  const handleActionFromDay = async (type: 'riego' | 'abono' | 'hidrometria', dateIso: string, extra?: any) => {
    if (!selectedPlant) return;
    const updated = { ...selectedPlant };
    if (type === 'riego') {
      updated.historial_riego = [...(updated.historial_riego || []), dateIso];
      updatePlantData(updated);
      setShowDayMenu(null);
    } else if (type === 'abono') {
      updated.historial_abono = [...(updated.historial_abono || []), { fecha: dateIso, tipo: extra || 'líquido' }];
      updatePlantData(updated);
      setShowDayMenu(null);
    } else if (type === 'hidrometria') {
      hidrometroRef.current?.click();
    }
  };

  const handleManualHidrometriaChange = (val: number) => {
    if (!selectedPlant) return;
    const updated = { ...selectedPlant };
    updated.salud.hidrometria = val;
    updated.historial_hidrometria = [
      ...(updated.historial_hidrometria || []),
      { fecha: new Date().toISOString(), valor: val }
    ];
    updatePlantData(updated);
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    const newImages: string[] = [];
    for (const file of files) {
      if (capturedImages.length + newImages.length >= 3) break;
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(base64);
      newImages.push(compressed);
    }
    setCapturedImages(prev => [...prev, ...newImages].slice(0, 3));
    e.target.value = '';
  };

  const runAnalysis = async () => {
    if (capturedImages.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzePlant(capturedImages, manualPotDiam || 0);
      setAnalysisResult(result);
      setManualHeight(result.medidas_sugeridas.altura_cm);
      setManualPotDiam(result.medidas_sugeridas.maceta_diametro_cm);
      setManualPotHeight(result.medidas_sugeridas.maceta_altura_cm || 0);
    } catch (error: any) { 
      const msg = error.message || "";
      if (msg.includes("API_KEY_MISSING") || msg.includes("not found")) {
        if ((window as any).aistudio) {
          setIsKeySetupComplete(false);
        } else {
          alert("❌ ERROR DE CONFIGURACIÓN:\n\nLa aplicación no detecta tu API_KEY. Si estás en Vercel, asegúrate de haberla añadido en el panel y haber hecho un 'Redeploy'.");
        }
      } else {
        alert(msg || "Error en el análisis maestro.");
      }
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const confirmNewPlant = async () => {
    if (!analysisResult || isSaving) return;
    setIsSaving(true);
    try {
      const finalLoc = manualLocation === "Personalizado..." ? customLoc : manualLocation;
      const newPlant: PlantData = {
        id: Math.random().toString(36).substring(2, 9),
        ubicacion: finalLoc || "Sin ubicación",
        identificacion: analysisResult.identificacion,
        salud: analysisResult.salud,
        medidas_sugeridas: analysisResult.medidas_sugeridas,
        medidas_usuario: { 
          altura_cm: manualHeight, maceta_diametro_cm: manualPotDiam, maceta_altura_cm: manualPotHeight 
        },
        estudio_trasplante: analysisResult.estudio_trasplante,
        cuidados: analysisResult.cuidados,
        ficha_botanica: analysisResult.ficha_botanica,
        images: capturedImages.map(url => ({ url, fecha: new Date().toISOString() })),
        historial_riego: [], historial_abono: [], historial_hidrometria: [],
        fecha_creacion: new Date().toISOString()
      };
      savePlant(newPlant);
      setPlants(getPlants());
      setShowAddModal(false);
      setAnalysisResult(null);
      setCapturedImages([]);
    } finally {
      setIsSaving(false);
    }
  };

  const headingSize = isLargeFont ? 'text-4xl' : 'text-3xl';
  const smallTextSize = isLargeFont ? 'text-xs' : 'text-[10px]';

  if (!isKeySetupComplete) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-8 text-center animate-fade-in max-w-md mx-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-800 rounded-full blur-[100px] -ml-32 -mt-32 opacity-20"></div>
        <div className="relative z-10 bg-white/5 backdrop-blur-xl p-12 rounded-[5rem] border border-white/10 shadow-2xl">
          <h1 className="font-serif text-5xl text-emerald-300 italic mb-6">Botanica Pro</h1>
          <p className="text-emerald-100/60 font-medium leading-relaxed mb-10 text-sm">
            Vincule su acceso a Google AI Studio para iniciar la telemetría avanzada.
          </p>
          <button 
            onClick={handleOpenKeySelector}
            className="w-full bg-emerald-500 text-emerald-950 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-xl"
          >
            Vincular Acceso IA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto bg-[#faf9f6] text-[#2d2d2d] shadow-2xl relative select-none font-sans overflow-x-hidden ${isLargeFont ? 'text-lg' : 'text-sm'}`}>
      <header className="px-6 pt-12 pb-6 flex justify-between items-end border-b border-stone-200/60 sticky top-0 bg-[#faf9f6]/90 backdrop-blur-md z-30">
        <div>
          <h1 className={`font-serif ${headingSize} text-emerald-950 tracking-tight italic`}>Botanica <span className="text-emerald-600 font-sans font-black not-italic">PRO</span></h1>
          <p className={`${smallTextSize} text-emerald-800/50 font-black tracking-[0.25em] uppercase mt-1`}>Archivo Bio-Cronológico</p>
        </div>
        <button onClick={() => { setAnalysisResult(null); setCapturedImages([]); setShowAddModal(true); }} className="bg-emerald-700 text-white p-4 rounded-full shadow-2xl active:scale-95">
          <PlusIcon className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-4 py-8 overflow-y-auto pb-32">
        {plants.length === 0 ? (
          <div className="py-24 text-center text-stone-300 font-serif italic">Gabinete botánico vacío.</div>
        ) : (
          <div className="space-y-6">
            {plants.map(plant => (
              <div key={plant.id} className="bg-white rounded-[2rem] p-4 border border-stone-100 shadow-sm flex items-center gap-4 active:scale-98 transition-all" onClick={() => { setSelectedPlant(plant); setActiveTab('tipologia'); }}>
                <img src={plant.images[0]?.url} className="w-16 h-16 rounded-[1.8rem] object-cover" />
                <div className="flex-1">
                  <h3 className={`font-serif ${isLargeFont ? 'text-2xl' : 'text-xl'} italic text-stone-900 leading-tight`}>{plant.identificacion.cientifico}</h3>
                  <p className={`${smallTextSize} font-black uppercase text-emerald-700/50 mt-1`}>{plant.identificacion.comun}</p>
                </div>
                <HealthGauge vigor={plant.salud.vigor_index || 0} size={50} />
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedPlant && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
          <div className="relative h-[25vh] shrink-0 overflow-hidden">
            <img src={selectedPlant.images[0]?.url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent"></div>
            <button onClick={() => setSelectedPlant(null)} className="absolute top-10 left-6 bg-white/40 p-3 rounded-full"><PlusIcon className="w-5 h-5 rotate-45" /></button>
            <div className="absolute bottom-6 left-8">
              <h2 className={`font-serif ${headingSize} italic text-emerald-950`}>{selectedPlant.identificacion.cientifico}</h2>
            </div>
          </div>

          <div className="flex bg-stone-50 border-b border-stone-100 px-6 py-3 justify-between overflow-x-auto scrollbar-hide">
            {(['tipologia', 'botanica', 'mantenimiento', 'historial'] as TabType[]).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase transition-all ${activeTab === t ? 'bg-emerald-700 text-white shadow-md' : 'text-stone-300'}`}>
                {t}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
            {activeTab === 'tipologia' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-emerald-900 p-10 rounded-[4rem] text-white shadow-xl">
                  <h3 className="font-serif italic text-2xl mb-8">Salud y Biometría</h3>
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                      <span className={`${smallTextSize} uppercase font-black opacity-40`}>Altura Actual</span>
                      <p className={`${isLargeFont ? 'text-3xl' : 'text-2xl'} font-black`}>{selectedPlant.medidas_usuario?.altura_cm || selectedPlant.medidas_sugeridas.altura_cm}cm</p>
                    </div>
                    <div className="flex items-center justify-center bg-white/5 p-5 rounded-3xl border border-white/5">
                       <HealthGauge vigor={selectedPlant.salud.vigor_index || 0} size={70} />
                    </div>
                  </div>
                  
                  <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                      <span className={`${smallTextSize} uppercase font-black opacity-40`}>Nivel Hidrometría</span>
                      <span className="text-xl font-black text-emerald-400">{selectedPlant.salud.hidrometria || 0}/10</span>
                    </div>
                    <input 
                      type="range" min="0" max="10" 
                      value={selectedPlant.salud.hidrometria || 0} 
                      onChange={(e) => handleManualHidrometriaChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none accent-emerald-400 cursor-pointer" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedPlant.images.map((img, i) => <img key={i} src={img.url} className="w-full aspect-square object-cover rounded-[3rem] shadow-md border border-stone-100" />)}
                </div>
              </div>
            )}

            {activeTab === 'botanica' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white p-8 rounded-[3.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-8 border-b border-stone-50 pb-4">
                    <h3 className={`font-serif ${isLargeFont ? 'text-4xl' : 'text-3xl'} italic relative z-10 text-emerald-950`}>Gabinete Científico</h3>
                    <button onClick={copyBotanicalInfo} className="bg-stone-100 text-stone-500 p-3 rounded-2xl active:scale-90 transition-all">
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className={`space-y-6 ${isLargeFont ? 'text-lg' : 'text-sm'}`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-stone-50 p-4 rounded-3xl">
                        <span className={`${smallTextSize} uppercase font-black text-stone-300 block mb-1`}>Longevidad</span>
                        <p className="font-bold text-emerald-900 leading-tight">{selectedPlant.ficha_botanica.longevidad_estimada}</p>
                      </div>
                      <div className="bg-stone-50 p-4 rounded-3xl">
                        <span className={`${smallTextSize} uppercase font-black text-stone-300 block mb-1`}>Origen</span>
                        <p className="font-bold text-emerald-900 leading-tight">{selectedPlant.ficha_botanica.origen_geografico}</p>
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-8 rounded-[3rem] border border-emerald-100">
                       <h4 className={`${smallTextSize} uppercase font-black text-emerald-800 mb-4`}>Curiosidades</h4>
                       <p className="leading-relaxed text-emerald-900 font-serif italic text-base">"{selectedPlant.ficha_botanica.curiosidades}"</p>
                    </div>
                    <div className="mt-8 pt-6">
                       <h4 className={`${smallTextSize} uppercase font-black text-stone-300 mb-4 tracking-widest`}>Ensayo Biológico</h4>
                       <p className="leading-relaxed text-stone-700 text-justify">{selectedPlant.ficha_botanica.explicacion_botanica_extensa}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mantenimiento' && (
              <div className="space-y-10 animate-fade-in">
                <PlantCalendar plant={selectedPlant} onSelectDate={(d) => setShowDayMenu({ date: d })} />
                <div className="bg-emerald-950 p-8 rounded-[3.5rem] text-white shadow-2xl">
                   <h4 className="font-serif italic text-2xl text-emerald-300 mb-8">Manual de Hidratación</h4>
                   <div className="space-y-8">
                      <div>
                        <span className={`${smallTextSize} font-black uppercase text-emerald-500 block mb-3`}>Técnica</span>
                        <p className="opacity-90 bg-white/5 p-5 rounded-3xl">{selectedPlant.cuidados.forma_riego}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-5 rounded-3xl">
                           <span className={`${smallTextSize} font-black uppercase text-emerald-500 block mb-2`}>Caudal</span>
                           <p className="text-xl font-black">{selectedPlant.cuidados.agua_ml} ml</p>
                        </div>
                        <div className="bg-white/5 p-5 rounded-3xl">
                           <span className={`${smallTextSize} font-black uppercase text-emerald-500 block mb-2`}>Frecuencia</span>
                           <p className="text-xl font-black">c/ {selectedPlant.cuidados.frecuencia_dias} días</p>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'historial' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-serif text-2xl italic mb-6">Bitácora Vital</h3>
                {[
                  ...(selectedPlant.historial_riego || []).map((d, idx) => ({ date: d, type: 'riego', index: idx })),
                  ...(selectedPlant.historial_abono || []).map((a, idx) => ({ date: a.fecha, type: 'abono', sub: a.tipo, index: idx })),
                  ...(selectedPlant.historial_hidrometria || []).map((h, idx) => ({ date: h.fecha, type: 'hidrometria', val: h.valor, index: idx }))
                ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item: any, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-stone-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl ${item.type === 'riego' ? 'bg-blue-50 text-blue-600' : item.type === 'abono' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {item.type === 'riego' ? <WaterIcon className="w-5 h-5" /> : item.type === 'abono' ? <FertilizerIcon className="w-5 h-5" /> : <InfoIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className={`font-black uppercase ${smallTextSize} tracking-widest`}>
                          {item.type === 'hidrometria' ? `Humedad: ${item.val}/10` : item.type}
                        </p>
                        <p className="text-xs text-stone-300 mt-1">{new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteHistoryItem(item.type as any, item.index)} className="p-3 text-stone-200 hover:text-rose-500">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-end">
          <div className="bg-white w-full rounded-t-[5rem] p-10 min-h-[95vh] flex flex-col relative animate-slide-up overflow-y-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-12 right-12 text-stone-300"><PlusIcon className="w-10 h-10 rotate-45" /></button>
            {!analysisResult && !isAnalyzing ? (
              <div className="flex-1 flex flex-col pt-12">
                <h2 className="text-4xl font-serif italic text-center mb-12 text-emerald-950">Nuevo Espécimen</h2>
                <div className="grid grid-cols-3 gap-4 mb-12">
                  {capturedImages.map((img, i) => <img key={i} src={img} className="aspect-square object-cover rounded-[2.5rem] shadow-sm border border-stone-100" />)}
                  {capturedImages.length < 3 && (
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-[2.5rem] cursor-pointer hover:bg-stone-50 transition-all">
                      <CameraIcon className="w-12 h-12 text-stone-200" />
                      <input type="file" multiple accept="image/*" onChange={handleFileSelection} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="mt-auto space-y-6">
                  <div className="bg-stone-50 p-8 rounded-[3rem] border border-stone-100">
                    <span className={`${smallTextSize} font-black uppercase text-stone-300 block mb-3 tracking-widest`}>Ubicación Designada</span>
                    <select 
                      value={manualLocation} 
                      onChange={e => setManualLocation(e.target.value)} 
                      className="w-full bg-transparent border-none p-0 font-serif italic text-2xl focus:ring-0 outline-none text-emerald-950"
                    >
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <button onClick={runAnalysis} className="w-full bg-stone-900 text-white py-8 rounded-[3.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-95 transition-all">Iniciar Análisis Maestro</button>
                </div>
              </div>
            ) : isAnalyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-10">
                <div className="w-24 h-24 relative flex items-center justify-center">
                   <div className="absolute inset-0 border-4 border-emerald-700/20 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                   <div className="w-10 h-10 bg-emerald-700 rounded-full animate-pulse"></div>
                </div>
                <div className="text-center">
                  <p className="font-serif italic text-2xl text-emerald-950 mb-2">Consultando Archivos Botánicos</p>
                  <p className="font-black uppercase tracking-[0.4em] text-stone-300 text-[9px]">Sincronizando con Google AI Studio...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 pt-12 space-y-10">
                <div className="bg-emerald-950 text-white p-10 rounded-[4rem] text-center shadow-2xl">
                  <h3 className="font-serif text-4xl italic text-emerald-300 mb-2 leading-tight">{analysisResult.identificacion.cientifico}</h3>
                  <p className="text-emerald-500 uppercase font-black tracking-widest text-[10px]">{analysisResult.identificacion.comun}</p>
                </div>
                <button onClick={confirmNewPlant} className="w-full bg-emerald-700 text-white py-8 rounded-[3.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-95 transition-all">Incorporar al Gabinete</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDayMenu && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-sm rounded-[4.5rem] p-12 relative shadow-2xl border border-stone-50">
            <button onClick={() => setShowDayMenu(null)} className="absolute top-10 right-10 text-stone-300"><PlusIcon className="w-8 h-8 rotate-45" /></button>
            <h3 className="font-serif text-3xl italic text-center mb-10 text-emerald-950">Evento Botánico</h3>
            <div className="space-y-5">
              <button onClick={() => handleActionFromDay('riego', showDayMenu.date)} className="w-full flex items-center justify-center gap-5 p-6 bg-emerald-700 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
                <WaterIcon className="w-6 h-6" /> Registrar Riego
              </button>
              <button onClick={() => handleActionFromDay('abono', showDayMenu.date)} className="w-full flex items-center justify-center gap-5 p-6 bg-amber-500 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
                <FertilizerIcon className="w-6 h-6" /> Registrar Abono
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-2xl border-t border-stone-200/50 h-24 flex items-center justify-around px-10 z-40 max-w-md mx-auto rounded-t-[5rem] shadow-2xl">
        <button onClick={() => { setSelectedPlant(null); setShowAddModal(false); setShowSettings(false); }} className={`flex flex-col items-center transition-all ${!selectedPlant && !showAddModal && !showSettings ? 'text-emerald-700 scale-125' : 'text-stone-300'}`}><HistoryIcon /><span className="text-[8px] font-black mt-2 uppercase">Archivo</span></button>
        <button onClick={() => setShowAddModal(true)} className={`flex flex-col items-center transition-all ${showAddModal ? 'text-emerald-700 scale-125' : 'text-stone-300'}`}><CameraIcon /><span className="text-[8px] font-black mt-2 uppercase">Scanner</span></button>
        <button onClick={() => setShowSettings(true)} className={`flex flex-col items-center transition-all ${showSettings ? 'text-emerald-700 scale-125' : 'text-stone-300'}`}><PlusIcon className="rotate-45" /><span className="text-[8px] font-black mt-2 uppercase">Sistema</span></button>
      </nav>

      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-emerald-950/50 backdrop-blur-md flex items-center justify-center p-12">
          <div className="bg-white w-full rounded-[5rem] p-12 text-center shadow-2xl border border-stone-50">
            <h2 className="font-serif text-4xl italic mb-12 text-emerald-950">Sistema Central</h2>
            <div className="space-y-5">
              <button onClick={toggleFontSize} className="w-full bg-emerald-50 text-emerald-700 py-7 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border border-emerald-100 active:scale-95 transition-all">
                Modo Lectura: {isLargeFont ? 'ACTIVADO' : 'ESTÁNDAR'}
              </button>
              <button onClick={handleOpenKeySelector} className="w-full bg-stone-50 text-stone-700 py-7 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border border-stone-100 active:scale-95 transition-all">Cambiar Clave API</button>
              <button onClick={() => { if(confirm("¿Borrar todo el gabinete?")) { localStorage.clear(); window.location.reload(); } }} className="w-full bg-rose-50 text-rose-600 py-7 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border border-rose-100 active:scale-95 transition-all">Purgar Datos</button>
            </div>
            <button onClick={() => setShowSettings(false)} className="mt-12 text-[10px] font-black uppercase text-stone-300 tracking-[0.3em]">Cerrar Panel</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.7s cubic-bezier(0.19, 1, 0.22, 1); }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
