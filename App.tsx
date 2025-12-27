import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Leaf, 
  Search, 
  Calendar as CalendarIcon, 
  History, 
  Trash2, 
  Droplets, 
  Thermometer, 
  Sun,
  ChevronRight,
  Camera,
  X,
  ArrowLeft,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { analyzePlant, quickHydrometryUpdate } from './geminiService';
import { Plant, GeminiResponse, DatedImage } from './types';
import { 
  savePlants, 
  loadPlants, 
  formatDate, 
  getNextWateringDate, 
  getVigorColor,
  getHealthStatusIcon
} from './utils';
import PlantCalendar from './components/PlantCalendar';

const App: React.FC = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isAddingPlant, setIsAddingPlant] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [view, setView] = useState<'archive' | 'calendar' | 'history'>('archive');
  const [searchTerm, setSearchTerm] = useState('');
  const [isKeySetupComplete, setIsKeySetupComplete] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlants(loadPlants());
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    // 1. Verificar si hay clave en entorno
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (envKey && envKey !== "undefined" && envKey !== "") {
      setIsKeySetupComplete(true);
      return;
    }

    // 2. Verificar clave local del usuario
    const savedLocalKey = localStorage.getItem('custom_gemini_api_key');
    if (savedLocalKey) {
      setIsKeySetupComplete(true);
      return;
    }

    // 3. Verificar entorno AI Studio
    if ((window as any).aistudio) {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setIsKeySetupComplete(hasKey);
      } catch (e) {
        setIsKeySetupComplete(false);
      }
    } else {
      setIsKeySetupComplete(false);
    }
  };

  // --- LOGICA DE MANEJO DE PLANTAS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    try {
      const base64Images = await Promise.all(
        Array.from(files).map(file => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }))
      );

      const analysis = await analyzePlant(base64Images);
      
      const newPlant: Plant = {
        id: crypto.randomUUID(),
        ...analysis,
        images: base64Images.map(url => ({ url, date: new Date().toISOString() })),
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const updatedPlants = [...plants, newPlant];
      setPlants(updatedPlants);
      savePlants(updatedPlants);
      setIsAddingPlant(false);
    } catch (error: any) {
      if (error.message === "API_KEY_MISSING") {
        setIsKeySetupComplete(false);
      } else {
        alert("Error analizando la planta. Inténtalo de nuevo.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deletePlant = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar este ejemplar del archivo?')) {
      const updated = plants.filter(p => p.id !== id);
      setPlants(updated);
      savePlants(updated);
      if (selectedPlant?.id === id) setSelectedPlant(null);
    }
  };

  // --- RENDERIZADO DE PANTALLA DE CONFIGURACION ---
  if (isKeySetupComplete === false) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-8 text-center animate-fade-in max-w-md mx-auto font-sans">
        <div className="relative z-10 bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Leaf className="text-emerald-400 w-10 h-10" />
          </div>
          <h1 className="font-serif text-3xl text-emerald-300 italic mb-4">Configuración Requerida</h1>
          <p className="text-emerald-100/60 font-medium leading-relaxed mb-8 text-sm">
            Para que Botanica Pro pueda analizar tus plantas, necesitas vincular una clave de Google AI Studio.
          </p>
          
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-emerald-950 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest mb-4 hover:bg-emerald-400 transition-all"
          >
            1. Obtener clave gratuita <ExternalLink size={14} />
          </a>

          <div className="space-y-3">
            <input 
              type="password"
              placeholder="2. Pega tu API KEY aquí..."
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-emerald-500 transition-all text-center"
              onChange={(e) => {
                if (e.target.value.trim().length > 10) {
                  localStorage.setItem('custom_gemini_api_key', e.target.value.trim());
                }
              }}
            />
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-white text-emerald-950 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-50 transition-all"
            >
              Activar Aplicación
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERIZADO PRINCIPAL ---
  return (
    <div className="min-h-screen bg-[#fafaf9] text-emerald-950 font-sans pb-24">
      {/* Header */}
      <header className="bg-emerald-950 text-white pt-16 pb-12 px-8 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="font-serif text-4xl italic tracking-tight">Botanica Pro</h1>
              <p className="text-emerald-300/60 text-xs font-bold uppercase tracking-[0.2em] mt-1">Telemetría Vegetal</p>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <Leaf size={24} className="text-emerald-400" />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar en el herbario..."
              className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm backdrop-blur-md outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="px-6 -mt-8 relative z-20">
        {view === 'archive' && (
          <div className="grid grid-cols-1 gap-6">
            {plants
              .filter(p => p.common_name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(plant => (
              <div 
                key={plant.id}
                onClick={() => setSelectedPlant(plant)}
                className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-emerald-100/50 flex items-center gap-5 active:scale-[0.98] transition-transform"
              >
                <div className="relative">
                  <img 
                    src={plant.images[plant.images.length - 1].url} 
                    className="w-24 h-24 rounded-[2rem] object-cover shadow-inner"
                    alt={plant.common_name}
                  />
                  <div className={`absolute -top-1 -right-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-white shadow-sm ${getVigorColor(plant.vigor_index)}`}>
                    <span className="text-[10px] font-black">{plant.vigor_index}</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-serif text-xl italic text-emerald-900 leading-tight">{plant.common_name}</h3>
                  <p className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest mt-1">{plant.scientific_name}</p>
                  
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Droplets size={12} className="text-blue-400" />
                      <span className="text-[10px] font-bold text-emerald-900/60">{plant.hydrometry}/10</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon size={12} className="text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-900/60">{formatDate(plant.last_updated)}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => deletePlant(plant.id, e)}
                  className="p-3 text-emerald-900/10 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            {plants.length === 0 && (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="text-emerald-600" size={32} />
                </div>
                <p className="text-emerald-900/40 font-bold uppercase text-[10px] tracking-[0.2em]">Inicia tu archivo botánico</p>
              </div>
            )}
          </div>
        )}

        {view === 'calendar' && <PlantCalendar plants={plants} />}
        
        {view === 'history' && (
          <div className="bg-white rounded-[3rem] p-8 shadow-sm min-h-[400px]">
            <h2 className="font-serif text-3xl italic mb-6">Actividad Reciente</h2>
            <div className="space-y-6">
              {plants.map(p => (
                <div key={p.id} className="flex gap-4 items-start">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">{p.common_name} actualizada</p>
                    <p className="text-xs text-emerald-900/40">{formatDate(p.last_updated)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Navegación Inferior */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-emerald-950/90 backdrop-blur-2xl rounded-[2.5rem] p-4 flex justify-between items-center shadow-2xl border border-white/10 z-50">
        <button 
          onClick={() => setView('archive')}
          className={`p-4 rounded-2xl transition-all ${view === 'archive' ? 'bg-emerald-500 text-emerald-950 shadow-lg' : 'text-white/40'}`}
        >
          <Leaf size={20} />
        </button>
        <button 
          onClick={() => setView('calendar')}
          className={`p-4 rounded-2xl transition-all ${view === 'calendar' ? 'bg-emerald-500 text-emerald-950 shadow-lg' : 'text-white/40'}`}
        >
          <CalendarIcon size={20} />
        </button>
        
        <button 
          onClick={() => setIsAddingPlant(true)}
          className="bg-white text-emerald-950 p-5 rounded-[2rem] -mt-12 shadow-2xl border-4 border-emerald-950 active:scale-90 transition-transform"
        >
          <Plus size={28} strokeWidth={3} />
        </button>

        <button 
          onClick={() => setView('history')}
          className={`p-4 rounded-2xl transition-all ${view === 'history' ? 'bg-emerald-500 text-emerald-950 shadow-lg' : 'text-white/40'}`}
        >
          <History size={20} />
        </button>
        <button className="p-4 text-white/40">
          <Search size={20} />
        </button>
      </nav>

      {/* Modal Añadir Planta */}
      {isAddingPlant && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xl" onClick={() => !isAnalyzing && setIsAddingPlant(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[4rem] overflow-hidden shadow-2xl">
            <div className="p-10 text-center">
              {isAnalyzing ? (
                <div className="py-10">
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                    <Leaf className="absolute inset-0 m-auto text-emerald-500 animate-pulse" size={32} />
                  </div>
                  <h3 className="font-serif text-3xl italic mb-2 text-emerald-900">Analizando...</h3>
                  <p className="text-[10px] font-bold text-emerald-900/40 uppercase tracking-widest">Consultando base botánica AI</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Camera className="text-emerald-600" size={32} />
                  </div>
                  <h3 className="font-serif text-3xl italic mb-3 text-emerald-900">Nueva Captura</h3>
                  <p className="text-sm text-emerald-900/60 mb-10 leading-relaxed px-4">Sube una o varias fotos de tu planta para iniciar el análisis biométrico.</p>
                  
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  
                  <div className="space-y-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-emerald-950 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-[0.98] transition-transform"
                    >
                      Seleccionar Imágenes
                    </button>
                    <button 
                      onClick={() => setIsAddingPlant(false)}
                      className="w-full py-4 text-emerald-900/40 font-bold uppercase text-[9px] tracking-widest"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detalle de Planta (Drawer) */}
      {selectedPlant && (
        <div className="fixed inset-0 z-[70] overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="min-h-screen bg-white">
            <div className="relative h-[45vh]">
              <img 
                src={selectedPlant.images[selectedPlant.images.length - 1].url} 
                className="w-full h-full object-cover"
                alt={selectedPlant.common_name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/20"></div>
              <button 
                onClick={() => setSelectedPlant(null)}
                className="absolute top-12 left-6 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-transform"
              >
                <ArrowLeft size={20} className="text-emerald-950" />
              </button>
            </div>

            <div className="relative -mt-12 bg-white rounded-t-[4rem] p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm ${getVigorColor(selectedPlant.vigor_index)}`}>
                      Vigor {selectedPlant.vigor_index}/10
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      {getHealthStatusIcon(selectedPlant.health_status)} {selectedPlant.health_status}
                    </span>
                  </div>
                  <h2 className="font-serif text-5xl italic text-emerald-950 leading-tight">{selectedPlant.common_name}</h2>
                  <p className="text-xs font-bold text-emerald-900/40 uppercase tracking-[0.2em] mt-2">{selectedPlant.scientific_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-[#f0f9f4] p-6 rounded-[2.5rem] border border-emerald-100/50">
                  <Droplets className="text-blue-500 mb-3" size={24} />
                  <p className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest mb-1">Hidrometría</p>
                  <p className="text-2xl font-serif italic text-emerald-900">{selectedPlant.hydrometry}<span className="text-sm opacity-30">/10</span></p>
                </div>
                <div className="bg-[#fdf8f3] p-6 rounded-[2.5rem] border border-orange-100/50">
                  <Clock className="text-orange-400 mb-3" size={24} />
                  <p className="text-[10px] font-black text-emerald-900/30 uppercase tracking-widest mb-1">Próximo Riego</p>
                  <p className="text-lg font-serif italic text-emerald-900">{formatDate(getNextWateringDate(selectedPlant))}</p>
                </div>
              </div>

              <div className="space-y-10">
                <section>
                  <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900/40 mb-4">
                    <AlertCircle size={14} className="text-emerald-500" /> 
                    Análisis de Salud
                  </h4>
                  <p className="text-emerald-950/70 leading-relaxed text-sm font-medium">{selectedPlant.health_analysis}</p>
                </section>

                <section className="bg-emerald-50 rounded-[3rem] p-8">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 mb-6 text-center">Guía de Cuidados Específicos</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="flex gap-4">
                      <Sun className="text-emerald-600 shrink-0" size={20} />
                      <div>
                        <p className="text-[9px] font-black uppercase text-emerald-900/40 mb-1">Luz</p>
                        <p className="text-xs font-bold text-emerald-900 leading-snug">{selectedPlant.needs.light}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Thermometer className="text-emerald-600 shrink-0" size={20} />
                      <div>
                        <p className="text-[9px] font-black uppercase text-emerald-900/40 mb-1">Temp.</p>
                        <p className="text-xs font-bold text-emerald-900 leading-snug">{selectedPlant.needs.temperature}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="pb-10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900/40 mb-6">Tareas de Mantenimiento</h4>
                  <div className="space-y-3">
                    {selectedPlant.maintenance_tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-4 bg-white border border-emerald-100 p-5 rounded-3xl shadow-sm">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        </div>
                        <p className="text-sm font-bold text-emerald-900/80">{task}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;