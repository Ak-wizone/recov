import Sidebar from "./sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-right-5 duration-500">
        <div className="animate-in fade-in zoom-in-95 duration-700">
          {children}
        </div>
      </main>
    </div>
  );
}
