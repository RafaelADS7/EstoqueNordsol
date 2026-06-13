'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function EstoqueLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const abas = [
    { nome: 'Início', rota: '/estoque' },
    { nome: 'Produtos Cadastrados', rota: '/estoque/produtos' },
    { nome: 'Entrada de Produtos', rota: '/estoque/entrada' },
    { nome: 'Saída de Produtos', rota: '/estoque/saida' },
    { nome: 'Kits Cadastrados', rota: '/estoque/kits' },
  ];

  return (
    <div className="flex flex-col h-full">
      
      {/* Cabeçalho da Seção */}
      <div className="px-8 py-6 flex items-center gap-4 bg-white border-b border-gray-100">
        <button className="text-[#0a1f3e] hover:opacity-60 transition">
          <svg className="w-5 h-5 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-extrabold text-[#0a1f3e]">
          Controle de Estoque de Produtos!
        </h2>
      </div>

      {/* Barra de Abas (Tabs) */}
      <div className="flex px-8 bg-[#f8f9fa] border-b border-gray-200">
        {abas.map((aba) => {
          const ativo = pathname === aba.rota;
          return (
            <Link 
              key={aba.nome} 
              href={aba.rota}
              className={`px-6 py-4 text-sm transition-all ${
                ativo 
                  ? 'text-[#0a1f3e] font-bold border-b-4 border-[#0a1f3e] bg-white' 
                  : 'text-gray-500 hover:text-[#0a1f3e]'
              }`}
            >
              {aba.nome}
            </Link>
          );
        })}
      </div>

      {/* Conteúdo das Páginas */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}