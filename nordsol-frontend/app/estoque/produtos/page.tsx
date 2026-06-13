'use client';

import React, { useState, useEffect } from 'react';

// Define como é o formato do dado que a interface espera
interface Produto {
  id: string | number;
  data_cadastro: string;
  codigo: string;
  nome: string;
  fornecedor: string;
  marca: string;
  quantidade: number;
  qtd_minima: number;
  valor_unitario: string;
  valor_total: string;
}

export default function ProdutosCadastradosPage() {
  // Estados para guardar os dados do backend e o status de carregamento
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Função para buscar os dados na sua API Django
  useEffect(() => {
    async function carregarProdutos() {
      try {
        setCarregando(true);
        
        // Chamada real para o seu backend
        const response = await fetch('http://localhost:8000/api/produtos/');
        if (!response.ok) {
          throw new Error('Falha na resposta do servidor');
        }
        
        const dados = await response.json();
        
        // Mapeando os dados do Django para o formato da sua tabela
        const produtosFormatados: Produto[] = dados.map((p: any) => {
          const precoUn = Number(p.preco_custo || 0);
          const qtd = Number(p.estoque_atual || 0);
          const total = precoUn * qtd;

          return {
            id: p.id,
            // Formata a data se existir, senão coloca um traço
            data_cadastro: p.data_cadastro ? new Date(p.data_cadastro).toLocaleDateString('pt-BR') : '-',
            codigo: p.codigo || p.id.toString(),
            nome: p.nome,
            fornecedor: p.fornecedor || 'Não Informado',
            marca: p.marca || 'Não Informada',
            quantidade: qtd,
            qtd_minima: p.estoque_minimo || 0,
            // Formata os valores para Reais (R$)
            valor_unitario: `R$ ${precoUn.toFixed(2).replace('.', ',')}`,
            valor_total: `R$ ${total.toFixed(2).replace('.', ',')}`,
          };
        });

        setProdutos(produtosFormatados);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      } finally {
        setCarregando(false);
      }
    }

    carregarProdutos();
  }, []);

  // Cálculos automáticos para os Cards Coloridos baseados no estado (agora com dados reais)
  const qtdMenosDe10 = produtos.filter((p) => p.quantidade < 10).length;
  const qtdEntre11e20 = produtos.filter((p) => p.quantidade >= 11 && p.quantidade <= 20).length;
  const qtdMaisDe20 = produtos.filter((p) => p.quantidade > 20).length;
  const totalProdutos = produtos.length;

  return (
    <div className="p-8 space-y-6">
      
      {/* 1. Área de Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Nome/Marca" 
            className="border border-gray-300 rounded-md px-4 py-2 w-96 text-sm focus:outline-none focus:border-[#0a1f3e]"
          />
          
          <div className="flex items-center">
            <input 
              type="date" 
              className="border border-gray-300 rounded-md px-4 py-2 w-40 text-sm focus:outline-none focus:border-[#0a1f3e] text-gray-500"
            />
          </div>

          <div className="flex items-center">
            <input 
              type="date" 
              className="border border-gray-300 rounded-md px-4 py-2 w-40 text-sm focus:outline-none focus:border-[#0a1f3e] text-gray-500"
            />
          </div>
        </div>

        <div>
          <button className="bg-[#0a1f3e] text-white px-6 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition">
            Listar Todos
          </button>
        </div>
      </div>

      {/* 2. Cards de Resumo Dinâmicos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#ffcdd2] text-[#0a1f3e] p-6 rounded-md shadow-sm border border-[#ef9a9a]">
          <p className="text-xl font-bold"><span className="text-2xl">{qtdMenosDe10}</span> - Produtos com menos de 10 itens no estoque</p>
        </div>
        <div className="bg-[#fff9c4] text-[#0a1f3e] p-6 rounded-md shadow-sm border border-[#fff59d]">
          <p className="text-xl font-bold"><span className="text-2xl">{qtdEntre11e20}</span> - Produtos entre 11 e 20 itens no estoque</p>
        </div>
        <div className="bg-[#bbdefb] text-[#0a1f3e] p-6 rounded-md shadow-sm border border-[#90caf9]">
          <p className="text-xl font-bold"><span className="text-2xl">{qtdMaisDe20}</span> - Produtos com mais de 20 itens no estoque</p>
        </div>
        <div className="bg-[#a5d6a7] text-[#0a1f3e] p-6 rounded-md shadow-sm border border-[#81c784]">
          <p className="text-xl font-bold"><span className="text-2xl">{totalProdutos}</span> - Total de Produtos</p>
        </div>
      </div>

      {/* 3. Tabela de Produtos */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden mt-4">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
            <tr>
              <th className="py-4 px-4">Data Cadastro</th>
              <th className="py-4 px-4">Imagem</th>
              <th className="py-4 px-4">Código</th>
              <th className="py-4 px-4">Produto</th>
              <th className="py-4 px-4">Fornecedor</th>
              <th className="py-4 px-4">Marca</th>
              <th className="py-4 px-4">Quantidade</th>
              <th className="py-4 px-4">Quant. Mínima Estoque</th>
              <th className="py-4 px-4">Valor Unit</th>
              <th className="py-4 px-4">Valor Total</th>
              <th className="py-4 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {carregando ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500 font-medium">
                  Carregando produtos do banco de dados...
                </td>
              </tr>
            ) : produtos.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500 font-medium">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              produtos.map((prod) => (
                <tr key={prod.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-gray-600">{prod.data_cadastro}</td>
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded flex flex-col items-center justify-center text-[8px] text-gray-400 font-bold text-center leading-tight">
                      <svg className="w-4 h-4 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      SEM<br/>IMAGEM
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{prod.codigo}</td>
                  <td className="py-3 px-4 font-semibold text-[#0a1f3e] uppercase">{prod.nome}</td>
                  <td className="py-3 px-4 font-bold text-gray-700 uppercase">{prod.fornecedor}</td>
                  <td className="py-3 px-4 font-bold text-gray-700 uppercase">{prod.marca}</td>
                  <td className="py-3 px-4 font-bold">
                    <span className={prod.quantidade < prod.qtd_minima ? 'text-red-500' : 'text-gray-700'}>
                      {prod.quantidade} Unidade(s)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-red-500 font-semibold">{prod.qtd_minima}</td>
                  <td className="py-3 px-4 text-gray-600">{prod.valor_unitario}</td>
                  <td className="py-3 px-4 text-gray-600">{prod.valor_total}</td>
                  <td className="py-3 px-4 flex justify-center mt-2">
                    <button className="text-[#0a1f3e] hover:text-blue-700 transition" title="Visualizar">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
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