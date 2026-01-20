
import React, { useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileSelect, isLoading }) => {
  const { t } = useSettings();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`relative py-16 px-8 transition-all duration-300 cursor-pointer text-center group bg-white hover:bg-gray-50
        ${isLoading ? 'opacity-60 pointer-events-none grayscale' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden" 
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
      />
      
      {/* Background Pulse Effect */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#FF9900] rounded-full blur-[80px] opacity-0 transition-opacity duration-500 group-hover:opacity-10 ${isDragging ? 'opacity-20' : ''}`}></div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl mb-2 transition-all duration-500 shadow-xl
          ${isDragging 
            ? 'bg-[#FF9900] text-white scale-110 rotate-3' 
            : 'bg-white text-[#FF9900] border border-gray-100 group-hover:scale-110 group-hover:-rotate-3'}`}>
          {isLoading ? (
            <i className="fa-solid fa-circle-notch fa-spin text-[#232F3E]"></i>
          ) : (
            <i className="fa-solid fa-cloud-arrow-up"></i>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-[#232F3E] tracking-tight">
            {isLoading ? t('analyzing') : t('uploadTitle')}
          </h3>
          <p className="text-gray-400 font-medium text-sm max-w-xs mx-auto">
             {t('uploadDesc')}
             <span className="block text-[10px] mt-1 opacity-70">{t('supportedFormats')}</span>
          </p>
        </div>

        {!isLoading && (
          <div className={`mt-4 px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg flex items-center gap-2
            ${isDragging ? 'bg-[#232F3E] text-white' : 'bg-[#FFD814] text-[#0F1111] border border-[#FCD200] group-hover:bg-[#F7CA00] group-hover:translate-y-1'}`}>
             <i className="fa-solid fa-folder-open"></i>
             {t('chooseFile')}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropZone;
