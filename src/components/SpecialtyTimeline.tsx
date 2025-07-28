import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Star, Award, BookOpen } from 'lucide-react';

interface TimelineItem {
  id: string;
  specialty: string;
  date: Date;
  description: string;
  institution: string;
  duration: string;
  skills: string[];
}

interface SpecialtyTimelineProps {
  items: TimelineItem[];
}

const SpecialtyTimeline: React.FC<SpecialtyTimelineProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sortedItems = [...items].sort((a, b) => b.date.getTime() - a.date.getTime());
  const currentItem = sortedItems[currentIndex];

  const handlePrev = () => {
    setCurrentIndex(prevIndex => 
      prevIndex > 0 ? prevIndex - 1 : sortedItems.length - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex(prevIndex => 
      prevIndex < sortedItems.length - 1 ? prevIndex + 1 : 0
    );
  };

  if (sortedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-md">
        <BookOpen className="text-gray-400 mb-4" size={48} />
        <p className="text-gray-600 text-lg">Nenhuma especialidade registrada</p>
        <p className="text-gray-400 text-sm mt-2">Adicione suas especialidades para começar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Linha do Tempo de Especialidades</h2>
            <p className="text-blue-100 mt-1">Sua jornada profissional em destaque</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePrev}
              className="p-2 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="p-6">
        <div className="flex items-start">
          {/* Left Column - Date */}
          <div className="flex flex-col items-center mr-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
              <Award className="text-blue-600" size={24} />
            </div>
            <div className="h-full w-0.5 bg-gray-200"></div>
          </div>

          {/* Right Column - Content */}
          <div className="flex-1">
            <div className="mb-1">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {format(currentItem.date, 'MMMM yyyy', { locale: ptBR })}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-800">{currentItem.specialty}</h3>
            <p className="text-gray-600 font-medium">{currentItem.institution}</p>
            <p className="text-gray-500 mt-2">{currentItem.description}</p>
            
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                <span className="font-medium">Duração:</span> {currentItem.duration}
              </p>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Habilidades desenvolvidas:</h4>
              <div className="flex flex-wrap gap-2">
                {currentItem.skills.map((skill, index) => (
                  <span 
                    key={index} 
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {currentIndex + 1} de {sortedItems.length} especialidades
        </div>
        <div className="flex space-x-2">
          {sortedItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpecialtyTimeline;