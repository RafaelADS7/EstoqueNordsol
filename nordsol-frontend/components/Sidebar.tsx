// components/Sidebar.tsx
import React from 'react';
import Link from 'next/link';

// SVGs Profissionais (sem emoticons)

// Ícone Estoque (Gráfico de Barras Crescente)
const EstoqueIcon = () => (
  <svg className="w-5 h-5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

// Ícone Usuário (Silhueta)
const UserIcon = () => (
  <svg className="w-5 h-5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// Ícone Clientes (Grupo)
const CustomersIcon = () => (
  <svg className="w-5 h-5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

// Ícone Seta para baixo (Chevron Down)
const ChevronDownIcon = () => (
  <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function Sidebar() {
  return (
    // bg-[#0a1f3e] é o azul marinho aplicado diretamente para forçar a cor. z-40 para garantir que fique por baixo do header.
    <aside className="fixed top-16 left-0 bottom-0 w-64 bg-[#0a1f3e] p-4 z-40 shadow-inner">
      <nav className="flex flex-col gap-2 mt-4">
        
        {/* Link do Estoque - ESTADO ATIVO (Usando cores explícitas e fundo claro arredondado) */}
        <Link 
          href="/estoque" 
          // bg-white/10 e rounded-md criam o fundo arredondado claro da referência. Cores claras explícitas no texto e ícone.
          className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-md text-sm transition-colors hover:bg-white/15 font-medium text-white"
        >
          <EstoqueIcon />
          <span>Estoque</span>
        </Link>
        
        {/* Link do Usuário - Dropdown (Inativo) */}
        {/* Usamos flex e justify-between para empurrar a seta para a direita. Usando cores claras explícitas no texto e ícones. */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-gray-300 rounded-md hover:bg-white/5 text-sm font-medium cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <UserIcon />
            <span>Usuário</span>
          </div>
          <ChevronDownIcon />
        </div>

        {/* Link de Clientes - Dropdown (Inativo) */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-gray-300 rounded-md hover:bg-white/5 text-sm font-medium cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <CustomersIcon />
            <span>Clientes</span>
          </div>
          <ChevronDownIcon />
        </div>

      </nav>
    </aside>
  );
}