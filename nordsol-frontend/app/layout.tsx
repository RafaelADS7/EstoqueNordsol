import './globals.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="flex h-screen bg-gray-100 font-sans">
        
        {/* SIDEBAR ESQUERDA (3ª Imagem) */}
        <aside className="w-64 bg-[#0a1f3e] text-white flex flex-col shrink-0">
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-wider">NORDSOL</h1>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            {/* Item Ativo: Estoque */}
            <div className="flex items-center gap-3 bg-[#1a2e4c] p-3 rounded-lg cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Estoque</span>
            </div>

            {/* Itens com Dropdown simulado */}
            <div className="flex items-center justify-between p-3 hover:bg-[#1a2e4c] rounded-lg cursor-pointer transition">
              <div className="flex items-center gap-3 text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span>Usuário</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>

            <div className="flex items-center justify-between p-3 hover:bg-[#1a2e4c] rounded-lg cursor-pointer transition">
              <div className="flex items-center gap-3 text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span>Clientes</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </nav>
        </aside>

        {/* ÁREA DE CONTEÚDO DIREITA */}
        <main className="flex-1 overflow-auto bg-white">
          {children}
        </main>

      </body>
    </html>
  );
}