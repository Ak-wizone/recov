import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { log } from './vite';

interface WebSocketClient extends WebSocket {
  tenantId?: string;
  userId?: string;
  isAlive?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocketClient>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocketClient, req) => {
      log('WebSocket client connected');
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'authenticate') {
            ws.tenantId = data.tenantId;
            ws.userId = data.userId;
            
            if (!this.clients.has(data.tenantId)) {
              this.clients.set(data.tenantId, new Set());
            }
            this.clients.get(data.tenantId)!.add(ws);
            
            log(`WebSocket client authenticated: tenant=${data.tenantId}, user=${data.userId}`);
            
            ws.send(JSON.stringify({ type: 'authenticated', success: true }));
          }
        } catch (error) {
          log(`WebSocket message error: ${error}`);
        }
      });

      ws.on('close', () => {
        if (ws.tenantId) {
          const tenantClients = this.clients.get(ws.tenantId);
          if (tenantClients) {
            tenantClients.delete(ws);
            if (tenantClients.size === 0) {
              this.clients.delete(ws.tenantId);
            }
          }
          log(`WebSocket client disconnected: tenant=${ws.tenantId}, user=${ws.userId}`);
        }
      });

      ws.on('error', (error) => {
        log(`WebSocket error: ${error.message}`);
      });
    });

    // Heartbeat to detect broken connections
    const interval = setInterval(() => {
      this.wss?.clients.forEach((ws: WebSocket) => {
        const client = ws as WebSocketClient;
        if (client.isAlive === false) {
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    log('WebSocket server initialized on /ws');
  }

  broadcast(tenantId: string, event: {
    type: string;
    module: string;
    action: 'create' | 'update' | 'delete';
    data?: any;
  }) {
    const tenantClients = this.clients.get(tenantId);
    if (!tenantClients || tenantClients.size === 0) {
      return;
    }

    const message = JSON.stringify(event);
    let sentCount = 0;

    tenantClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      log(`Broadcast to ${sentCount} clients: ${event.module}.${event.action}`);
    }
  }

  getConnectedClients(tenantId: string): number {
    return this.clients.get(tenantId)?.size || 0;
  }
}

export const wsManager = new WebSocketManager();
