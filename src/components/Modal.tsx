
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-lg' }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300 overflow-y-auto" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`bg-white dark:bg-gray-800/95 border border-gray-100 dark:border-gray-700/60 rounded-3xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col my-auto transform transition-transform duration-300 scale-95 overflow-hidden`} 
        onClick={e => e.stopPropagation()}
        style={isOpen ? {transform: 'scale(1)', opacity: 1} : {transform: 'scale(0.95)', opacity: 0}}
      >
        <div className="flex justify-between items-center border-b p-5 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/40">
          <h3 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-label="Close modal"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
