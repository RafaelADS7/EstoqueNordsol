
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function EstoqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const abas = [
    { nome: 'Início', rota: '/estoque' },
    { nome: 'Produtos Cadastrados', rota: '/estoque/produtos' },
    { nome: 'Entrada de Produtos', rota: '/estoque/entrada' },
    { nome: 'Saída de Produtos', rota: '/estoque/saida' },
    { nome: 'Kits Cadastrados', rota: '/estoque/kits' },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Cabeçalho da seção */}
      <div className="px-4 md:px-8 py-6 flex items-center gap-4 bg-white border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-[#0a1f3e] hover:opacity-60 transition"
          title="Voltar ao início"
          aria-label="Voltar ao início"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 className="text-xl font-extrabold text-[#0a1f3e]">
          Controle de Estoque de Produtos!
        </h2>
      </div>

      {/* Barra de navegação */}
      <nav
        className="flex px-4 md:px-8 bg-[#f8f9fa] border-b border-gray-200 overflow-x-auto"
        aria-label="Navegação do estoque"
      >
        {abas.map((aba) => {
          const ativo =
            pathname === aba.rota ||
            (aba.rota !== '/estoque' &&
              pathname.startsWith(`${aba.rota}/`));

          return (
            <Link
              key={aba.rota}
              href={aba.rota}
              aria-current={ativo ? 'page' : undefined}
              className={`shrink-0 px-6 py-4 text-sm whitespace-nowrap transition-all ${
                ativo
                  ? 'text-[#0a1f3e] font-bold border-b-4 border-[#0a1f3e] bg-white'
                  : 'text-gray-500 hover:text-[#0a1f3e]'
              }`}
            >
              {aba.nome}
            </Link>
          );
        })}
      </nav>

      {/* Conteúdo das páginas */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
