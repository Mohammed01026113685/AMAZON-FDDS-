
import React, { useEffect, useState } from 'react';

export interface ToastMessage {
    id: number;
    type: 'success' | 'error' | 'info' | 'warning';
    text: string;
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

const Toast: React.FC<{ toast: ToastMessage, onRemove: () => void }> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onRemove, 300); // Wait for exit animation
        }, 4000);
        return () => clearTimeout(timer);
    }, [onRemove]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return 'fa-circle-check';
            case 'error': return 'fa-circle-xmark';
            case 'warning': return 'fa-triangle-exclamation';
            default: return 'fa-circle-info';
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success': return 'bg-[#067D62] border-[#067D62] text-white'; // Amazon Green
            case 'error': return 'bg-[#CC0C39] border-[#CC0C39] text-white'; // Amazon Red
            case 'warning': return 'bg-[#FFF3CD] border-[#FFEeba] text-[#856404]';
            default: return 'bg-[#232F3E] border-[#232F3E] text-white'; // Amazon Blue
        }
    };

    return (
        <div 
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[300px] max-w-sm transition-all duration-300 transform ${getColors()}
            ${isExiting ? 'opacity-0 translate-x-full' : 'animate-slide-up opacity-100 translate-x-0'}`}
        >
            <i className={`fa-solid ${getIcon()} text-lg`}></i>
            <div className="flex-1 text-sm font-bold">{toast.text}</div>
            <button onClick={() => { setIsExiting(true); setTimeout(onRemove, 300); }} className="opacity-70 hover:opacity-100 transition-opacity">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
    );
};
