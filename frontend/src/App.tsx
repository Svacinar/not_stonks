import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar, ToastProvider } from './components';
import { ThemeProvider } from './contexts/ThemeContext';
import { DashboardPage, TransactionsPage, UploadPage, RulesPage } from './pages';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* App title */}
            <h1 className="text-xl font-semibold text-foreground lg:ml-0 ml-2">
              Spending Dashboard
            </h1>

            {/* Spacer for alignment */}
            <div className="w-10 lg:hidden" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/rules" element={<RulesPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
