import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface WebSocketEvent {
  type: string;
  module: string;
  action: 'create' | 'update' | 'delete';
  data?: any;
  payload?: {
    message?: string;
    newPlan?: string;
    modules?: string[];
  };
}

// Map of module names to their query keys for smart invalidation
const moduleQueryKeys: Record<string, string[][]> = {
  invoices: [
    ['/api/invoices'],
    ['/api/invoices/dashboard-stats'],
    ['/api/dashboard/business-overview'],
    ['/api/debtors'],
  ],
  receipts: [
    ['/api/receipts'],
    ['/api/invoices'], // Receipts affect invoice status
    ['/api/invoices/dashboard-stats'],
    ['/api/dashboard/business-overview'],
    ['/api/debtors'],
  ],
  customers: [
    ['/api/masters/customers'],
    ['/api/invoices'], // Customer changes might affect invoices
    ['/api/receipts'], // Customer changes might affect receipts
    ['/api/dashboard/business-overview'],
    ['/api/debtors'],
  ],
  leads: [
    ['/api/leads'],
    ['/api/dashboard/business-overview'],
  ],
  quotations: [
    ['/api/quotations'],
    ['/api/dashboard/business-overview'],
  ],
  proforma_invoices: [
    ['/api/proforma-invoices'],
    ['/api/dashboard/business-overview'],
  ],
};

export function useWebSocket(tenantId?: string, userId?: string) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isAuthenticatedRef = useRef(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!tenantId || !userId) return;

    // Use secure WebSocket in production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[WebSocket] Connected');
        // Authenticate immediately after connection
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'authenticate',
            tenantId,
            userId,
          }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data);

          if (message.type === 'authenticated') {
            console.log('[WebSocket] Authenticated successfully');
            isAuthenticatedRef.current = true;
            return;
          }

          if (message.type === 'data_change') {
            console.log(`[WebSocket] Data change: ${message.module}.${message.action}`);
            
            // Invalidate related query keys
            const queryKeys = moduleQueryKeys[message.module] || [];
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }

          // Handle real-time permission updates
          if (message.type === 'PERMISSIONS_UPDATED') {
            console.log('[WebSocket] Permissions updated:', message.payload);
            
            // Invalidate auth/me to refresh user permissions and role
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
            
            // Invalidate tenant data to refresh subscription plan and allowed modules
            queryClient.invalidateQueries({ queryKey: ['/api/tenants/current'] });
            
            // Show toast notification
            toast({
              title: "Subscription Updated",
              description: message.payload?.message || "Your subscription plan has been updated",
              duration: 5000,
            });
            
            console.log('✅ Permissions and modules refreshed automatically');
          }
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.current.onclose = () => {
        console.log('[WebSocket] Disconnected, reconnecting in 3s...');
        isAuthenticatedRef.current = false;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
    }
  }, [tenantId, userId, queryClient, toast]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current,
  };
}
