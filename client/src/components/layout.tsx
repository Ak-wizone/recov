import Sidebar from "./sidebar";
import Header from "./header";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  
  // Connect to WebSocket for real-time updates
  useWebSocket(user?.tenantId || undefined, user?.id || undefined);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
