
import React, { useState } from 'react';
import { getNextWateringDate, getNextFertilizingDate } from '../utils';
import { PlantData } from '../types';

interface PlantCalendarProps {
  plant: PlantData;
  onSelectDate: (date: string) => void;
}

const PlantCalendar: React.FC<PlantCalendarProps> = ({ plant, onSelectDate }) => {
  const [viewDate, setViewDate] = useState(new Date());
  
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  let firstDay = new Date(currentYear, currentMonth, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1; 

  const wateringDates = (plant.historial_riego || []).map(d => new Date(d).toDateString());
  const abonoDates = (plant.historial_abono || []).map(a => new Date(a.fecha).toDateString());
  const moistureDates = (plant.historial_hidrometria || []).map(h => new Date(h.fecha).toDateString());
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="bg-white rounded-[3.5rem] p-8 shadow-sm border border-stone-100">
      <div className="flex justify-between items-center mb-10">
        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-3 text-stone-300">←</button>
        <h4 className="font-serif text-2xl text-emerald-950 italic">
          {monthNames[currentMonth]} <span className="text-stone-200 not-italic font-sans text-sm">{currentYear}</span>
        </h4>
        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-3 text-stone-300">→</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-4">
        {["L", "M", "X", "J", "V", "S", "D"].map(d => (
          <div key={d} className="text-[10px] font-black text-stone-200 uppercase tracking-widest">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3 text-center">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`b-${i}`} className="p-2"></div>)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentYear, currentMonth, day);
          const dateStr = date.toDateString();
          const isWatered = wateringDates.includes(dateStr);
          const isAboned = abonoDates.includes(dateStr);
          const isMeasured = moistureDates.includes(dateStr);
          const isToday = dateStr === new Date().toDateString();

          return (
            <button 
              key={day} 
              onClick={() => onSelectDate(date.toISOString())}
              className={`p-1 rounded-2xl text-[12px] transition-all flex flex-col items-center justify-center aspect-square relative ${
                isWatered ? 'bg-emerald-700 text-white font-black shadow-lg scale-110 z-10' : 
                isAboned ? 'bg-amber-600 text-white font-black shadow-lg scale-110 z-10' :
                isToday ? 'bg-stone-900 text-white font-black shadow-lg' :
                'text-stone-400'
              }`}
            >
              {day}
              <div className="flex gap-0.5 mt-0.5">
                {isWatered && <div className="w-1.5 h-1.5 bg-white rounded-full border border-emerald-900"></div>}
                {isAboned && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full border border-amber-900"></div>}
                {isMeasured && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full border border-blue-900"></div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlantCalendar;
