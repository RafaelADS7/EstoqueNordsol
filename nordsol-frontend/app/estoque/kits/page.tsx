'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// --- TIPAGENS ---
interface Kit {
  id: string | number;
  codigo_kit: string;
  data_cadastro: string;
  nome_kit: string;
  abater_estoque: string;
  valor_total: number;
}

export default function KitsCadastradosPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [carregando, setCarregando] = useState(false);

  // --- CARREGAMENTO INICIAL DOS KITS (API DJANGO) ---
  useEffect(() => {
    const buscarKits = async () => {
      try {
        setCarregando(true);
        // Requisição para buscar todos os kits cadastrados
        const response = await fetch('http://localhost:8000/api/kits/'); 
        if (!response.ok) throw new Error('Falha ao buscar kits.');
        
        const data = await response.json();
        const listaKits = data.results ? data.results : data;
        setKits(listaKits);
      } catch (erro) {
        console.error("Erro ao carregar kits:", erro);
        // Dados fictícios apenas para teste visual caso o backend esteja desligado
        setKits([
          { id: 1, codigo_kit: 'KIT-101', data_cadastro: '28/05/2026', nome_kit: 'Kit Instalação Nordsol Padrão', abater_estoque: 'Sim', valor_total: 450.00 },
          { id: 2, codigo_kit: 'KIT-202', data_cadastro: '25/05/2026', nome_kit: 'Kit Manutenção Solar Básica', abater_estoque: 'Não', valor_total: 180.50 }
        ]);
      } finally {
        setCarregando(false);
      }
    };

    buscarKits();
  }, []);

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-8 space-y-6">
      
      {/* FILTROS E AÇÕES SUPERIORES */}
      <div className="flex gap-4 items-center">
        <input 
          type="text" 
          placeholder="Código do Kit" 
          className="border border-gray-300 rounded-md px-4 py-2 w-64 text-sm focus:outline-none focus:border-[#0a1f3e]"
        />
        <button className="bg-[#0a1f3e] text-white px-6 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition">
          Listar Todos
        </button>
        {/* REDIRECIONA PARA UMA TELA DE CRIAÇÃO NOVA SE DESEJAR, OU MANTÉM LINK */}
        <button className="bg-[#0a1f3e] text-white px-6 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition">
          + Cadastrar Kit
        </button>
      </div>

      {/* TABELA PRINCIPAL DE KITS */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase text-xs tracking-wider">
            <tr>
              <th className="py-4 px-6">Código do Kit</th>
              <th className="py-4 px-6">Data de Cadastro</th>
              <th className="py-4 px-6">Nome do Kit</th>
              <th className="py-4 px-6 text-center">Abater do Estoque</th>
              <th className="py-4 px-6 text-right">Valor Total</th>
              <th className="py-4 px-6 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {carregando ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500 font-medium">Carregando dados...</td>
              </tr>
            ) : kits.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 italic">Nenhum kit cadastrado ainda.</td>
              </tr>
            ) : (
              kits.map((kit) => (
                <tr key={kit.id} className="hover:bg-gray-50 transition">
                  <td className="py-4 px-6 font-semibold text-gray-800">{kit.codigo_kit}</td>
                  <td className="py-4 px-6 text-gray-600">{kit.data_cadastro}</td>
                  <td className="py-4 px-6 font-medium text-gray-800">{kit.nome_kit}</td>
                  <td className="py-4 px-6 text-center text-gray-600">{kit.abater_estoque}</td>
                  <td className="py-4 px-6 text-right font-bold text-gray-800">{formatarMoeda(kit.valor_total)}</td>
                  <td className="py-4 px-6 text-center">
                    {/* ENTRADA DA ROTA DINÂMICA: Navega para /kits/[id] */}
                    <Link 
                      href={`/estoque/kits/${kit.id}`}
                      className="text-blue-500 hover:text-blue-700 transition flex justify-center" 
                      title="Editar Kit em Página Separada"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}