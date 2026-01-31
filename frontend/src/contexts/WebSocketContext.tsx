import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Toast from '../components/Toast';
import { Notification, getNotifications, markNotificationRead, deleteNotification } from '../api/notifications';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (msg: string) => void;
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  removeNotification: (id: number) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotificationsData = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        fetchNotificationsData();
    }
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
        const token = localStorage.getItem('token');
        if (!token) return;
    
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const apiHost = process.env.REACT_APP_API_URL 
            ? process.env.REACT_APP_API_URL.replace(/^http(s)?:\/\//, '')
            : 'localhost:8000';
        
        const apiKey = process.env.REACT_APP_API_KEY || '';
        const wsUrl = `${protocol}//${apiHost}/api/v1/notifications/ws?token=${token}&api_key=${apiKey}`;
    
        // Prevent multiple connections
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        socket = new WebSocket(wsUrl);
        ws.current = socket;
    
        socket.onopen = () => {
          setIsConnected(true);
        };
    
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NOTIFICATION' && data.payload) {
               // Show Toast
               setToast({
                   title: data.payload.title,
                   message: data.payload.message
               });
               
               // Add to notification list
               setNotifications(prev => [data.payload, ...prev]);

               if (navigator.vibrate) {
                   navigator.vibrate(200);
               }
            }
          } catch (e) {
          }
        };

        socket.onclose = (e) => {
          setIsConnected(false);
          ws.current = null;
        };
    
        socket.onerror = (error) => {
            console.error('WS Error:', error);
            // Optional: Reconnect logic could go here
        };
    };

    // Small delay to prevent double-invocation in Strict Mode
    const timer = setTimeout(() => {
        connect();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (ws.current) {
        // Only close if it's the same socket we created
        if (ws.current === socket) {
             ws.current.close();
        }
      }
    };
  }, []);

  const sendMessage = (msg: string) => {
    if (ws.current && isConnected) {
      ws.current.send(msg);
    }
  };

  const markAsRead = async (id: number) => {
      try {
          await markNotificationRead(id);
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      } catch (error) {
          console.error('Failed to mark as read:', error);
      }
  };

  const removeNotification = async (id: number) => {
      try {
          await deleteNotification(id);
          setNotifications(prev => prev.filter(n => n.id !== id));
      } catch (error) {
          console.error('Failed to delete notification:', error);
      }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <WebSocketContext.Provider value={{ 
        isConnected, 
        sendMessage, 
        notifications, 
        unreadCount, 
        markAsRead, 
        removeNotification,
        fetchNotifications: fetchNotificationsData 
    }}>
      {children}
      {toast && (
        <Toast 
            title={toast.title} 
            message={toast.message} 
            onClose={() => setToast(null)} 
        />
      )}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
