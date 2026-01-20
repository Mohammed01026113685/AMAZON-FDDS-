
import React from 'react';

interface CustomDialogProps {
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'info';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

const CustomDialog: React.FC<CustomDialogProps> = ({ isOpen, type, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#191E26] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className={`p-4 flex items-center gap-3 ${type === 'alert' ? 'bg-[#CC0C39]' : type === 'confirm' ? 'bg-[#232F3E]' : 'bg-[#007185]'} text-white`}>
                    <i className={`text-xl fa-solid ${type === 'alert' ? 'fa-triangle-exclamation' : type === 'confirm' ? 'fa-circle-question' : 'fa-circle-info'}`}></i>
                    <h3 className="font-bold text-lg">{title}</h3>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-[#0F1111] dark:text-gray-200 text-sm font-medium leading-relaxed whitespace-pre-line">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-[#111315] border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    {type === 'confirm' && (
                        <button 
                            onClick={onCancel}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            إلغاء
                        </button>
                    )}
                    <button 
                        onClick={onConfirm}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95 text-white
                            ${type === 'alert' ? 'bg-[#CC0C39] hover:bg-[#a10a2d]' : 'bg-[#FF9900] hover:bg-[#e38a00] text-[#232F3E]'}`}
                    >
                        {type === 'confirm' ? 'تأكيد' : 'موافق'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomDialog;
