
import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Allow time for fade out animation before calling onClose
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      aria-live="assertive"
    >
      <div className={`${type === 'error' ? 'bg-red-600' : 'bg-green-600'} text-white font-semibold py-3 px-5 rounded-lg shadow-xl flex items-center`}>
        <span className="material-icons mr-2">{type === 'error' ? 'error' : 'check_circle'}</span>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default Toast;
