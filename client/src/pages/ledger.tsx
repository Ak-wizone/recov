export default function Ledger() {
  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
                Ledger
              </h1>
              <p className="text-sm text-gray-500 mt-1">View transaction ledger and history</p>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Ledger module coming soon...</p>
        </div>
      </div>
    </div>
  );
}
