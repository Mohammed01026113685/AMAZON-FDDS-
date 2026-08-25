import React, { useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, Loader2, FolderOpen } from 'lucide-react';

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
    <motion.div 
      whileHover={isLoading ? {} : { scale: 1.01 }}
      whileTap={isLoading ? {} : { scale: 0.99 }}
      className={`relative py-20 px-8 transition-colors duration-300 cursor-pointer text-center group bg-white dark:bg-[#141414] hover:bg-gray-50 dark:hover:bg-[#1A1A1A] rounded-lg border border-[#D5D9D9] dark:border-gray-800 shadow-sm
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
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#FF9900] rounded-full blur-[100px] opacity-0 transition-opacity duration-500 group-hover:opacity-10 ${isDragging ? 'opacity-20' : ''}`}></div>
      
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div 
          animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
          className={`w-24 h-24 rounded-lg flex items-center justify-center mb-2 transition-all duration-300 shadow-lg
          ${isDragging 
             ? 'bg-[#FF9900] text-white' 
             : 'bg-orange-50 dark:bg-orange-500/10 text-[#FF9900] border border-orange-100 dark:border-orange-500/20 group-hover:shadow-orange-500/20'}`}
        >
          {isLoading ? (
            <Loader2 size={40} strokeWidth={2} className="animate-spin text-[#FF9900]" />
          ) : (
            <UploadCloud size={40} strokeWidth={2} />
          )}
        </motion.div>
        
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {isLoading ? t('analyzing') : t('uploadTitle')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm max-w-sm mx-auto leading-relaxed">
             {t('uploadDesc')}
             <span className="block text-[11px] mt-2 opacity-70 tracking-wide uppercase font-bold">{t('supportedFormats')}</span>
          </p>
        </div>

        <AnimatePresence>
          {!isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 px-8 py-3 rounded-lg font-bold text-sm transition-all duration-300 shadow-md flex items-center gap-2
              ${isDragging ? 'bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A]' : 'bg-[#FF9900] text-white hover:bg-[#FFB340] hover:shadow-lg'}`}
            >
               <FolderOpen size={18} strokeWidth={2.5} />
               {t('chooseFile')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default DropZone;
