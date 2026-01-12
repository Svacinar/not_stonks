import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-4 px-4">
            <h1 className="text-2xl font-bold text-gray-900">Spending Dashboard</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 px-4">
          <Routes>
            <Route path="/" element={<div className="text-gray-600">Dashboard coming soon...</div>} />
            <Route path="/transactions" element={<div className="text-gray-600">Transactions coming soon...</div>} />
            <Route path="/upload" element={<div className="text-gray-600">Upload coming soon...</div>} />
            <Route path="/rules" element={<div className="text-gray-600">Rules coming soon...</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
