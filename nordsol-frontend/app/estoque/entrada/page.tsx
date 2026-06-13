'use client';

import React, { useState, useEffect } from 'react';

// --- TIPAGENS ---
interface Entrada {
  id: string | number;
  codigo_entrada: string;
  data_cadastro: string;
  nota_fiscal: string;
  total_produtos: number;
  preco_total: string;
}

interface ItemEntrada {
  id_produto: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  tipo_movimentacao: 'ENTRADA_COMPRA' | 'RETORNO_GERAL'; // NOVO: Define se é compra ou estorno
}

interface ProdutoBackend {
  id: string | number;
  nome: string;
  preco_custo?: string | number;
}

export default function EntradaProdutosPage() {
  // --- ESTADOS PRINCIPAIS ---
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [produtosDoBanco, setProdutosDoBanco] = useState<ProdutoBackend[]>([]);

  // --- ESTADOS DOS MODAIS ---
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [modalGerenciarAberto, setModalGerenciarAberto] = useState(false);
  // NOVO: Controla qual botão abriu o modal de itens (Compra ou Estorno)
  const [modoAdicao, setModoAdicao] = useState<'ENTRADA_COMPRA' | 'RETORNO_GERAL'>('ENTRADA_COMPRA');

  // --- ESTADOS DO FORMULÁRIO ---
  const [notaFiscal, setNotaFiscal] = useState('');
  const [itensDaEntrada, setItensDaEntrada] = useState<ItemEntrada[]>([]);
  
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState(''); 
  const [qtdSelecionada, setQtdSelecionada] = useState('');
  const [precoSelecionado, setPrecoSelecionado] = useState('');

  // --- FETCH DA API (PRODUTOS E ENTRADAS) ---
  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        setErroApi(null);
        
        // 1. Carrega Produtos
        const responseProdutos = await fetch('http://127.0.0.1:8000/api/produtos/'); 
        if (responseProdutos.ok) {
          const dados = await responseProdutos.json();
          const listaProdutos = dados.results ? dados.results : dados;
          if (Array.isArray(listaProdutos)) {
            setProdutosDoBanco(listaProdutos);
          }
        } else {
          setErroApi(`Erro ao carregar produtos. Status: ${responseProdutos.status}`);
        }

        // 2. Carrega Entradas já existentes
        const responseEntradas = await fetch('http://127.0.0.1:8000/api/entradas/');
        if (responseEntradas.ok) {
          const dadosEntradas = await responseEntradas.json();
          setEntradas(dadosEntradas.results ? dadosEntradas.results : dadosEntradas);
        }

      } catch (error) {
        console.error("Erro na requisição:", error);
        setErroApi("Erro de Conexão (CORS Bloqueado ou Django Desligado).");
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  // --- LÓGICA DE CÁLCULO E LISTA ---
  const totalGeral = itensDaEntrada.reduce((acc, item) => acc + item.total, 0);

  const handleAdicionarItemNaLista = () => {
    if (!produtoSelecionadoId || !qtdSelecionada || !precoSelecionado) return;

    const produtoCompleto = produtosDoBanco.find(p => p.id.toString() === produtoSelecionadoId);
    if (!produtoCompleto) return;

    const novoItem: ItemEntrada = {
      id_produto: produtoCompleto.id.toString(), 
      nome: produtoCompleto.nome,
      quantidade: Number(qtdSelecionada),
      preco_unitario: Number(precoSelecionado),
      total: Number(qtdSelecionada) * Number(precoSelecionado),
      tipo_movimentacao: modoAdicao // Associa o item ao modo que foi clicado
    };

    setItensDaEntrada([...itensDaEntrada, novoItem]);
    setProdutoSelecionadoId('');
    setQtdSelecionada('');
    setPrecoSelecionado('');
  };

  const handleRemoverItemDaLista = (indexRemover: number) => {
    setItensDaEntrada(itensDaEntrada.filter((_, index) => index !== indexRemover));
  };

  // --- FUNÇÃO PARA SALVAR NO BANCO E ATUALIZAR ESTOQUE ---
  const handleCadastrarEntrada = async () => {
    if (itensDaEntrada.length === 0) return;

    // NOVO: Monta o payload respeitando se o item é Compra ou Retorno (Estorno)
    // O backend aceita 'ENTRADA_COMPRA' e 'RETORNO_GERAL' e soma no estoque em ambos os casos.
    const payload = itensDaEntrada.map(item => ({
      produto: item.id_produto,
      tipo: item.tipo_movimentacao, 
      quantidade: item.quantidade,
      numero_nota: notaFiscal || "Sem NF" // Para estorno, pode ficar "Sem NF" ou você pode preencher com o num da OS
    }));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/movimentacoes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setItensDaEntrada([]);
        setNotaFiscal('');
        setModalEntradaAberto(false);
        alert('Movimentações cadastradas com sucesso e estoque atualizado!');
      } else {
        const textResponse = await response.text();
        
        if (textResponse.startsWith('<!DOCTYPE') || textResponse.startsWith('<html')) {
          console.error("ERRO HTML DO DJANGO:", textResponse);
          alert("O Django retornou uma página de erro (HTML). Olhe o terminal do backend (Python) para ver a causa exata!");
        } else {
          const erroDados = JSON.parse(textResponse);
          console.error("Erro de Validação:", erroDados);
          alert(`Erro ao cadastrar: ${JSON.stringify(erroDados)}`);
        }
      }
    } catch (error) {
      console.error("Erro ao enviar dados (caiu no catch):", error);
      alert("Não foi possível conectar ao servidor para atualizar o estoque.");
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-8 space-y-6">
      
      {/* CABEÇALHO E FILTROS */}
      <div className="flex gap-4 items-center">
        <input type="text" placeholder="Nota Fiscal" className="border border-gray-300 rounded-md px-4 py-2 w-80 text-sm focus:outline-none focus:border-[#0a1f3e]"/>
        
        <div className="flex items-center">
          <input type="text" placeholder="Data Inicial" className="border border-gray-300 rounded-l-md px-4 py-2 w-36 text-sm focus:outline-none focus:border-[#0a1f3e]"/>
          <div className="bg-[#0a1f3e] p-2.5 rounded-r-md flex items-center justify-center cursor-pointer hover:bg-[#15305c] transition">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        </div>

        <div className="flex items-center">
          <input type="text" placeholder="Data Final" className="border border-gray-300 rounded-l-md px-4 py-2 w-36 text-sm focus:outline-none focus:border-[#0a1f3e]"/>
          <div className="bg-[#0a1f3e] p-2.5 rounded-r-md flex items-center justify-center cursor-pointer hover:bg-[#15305c] transition">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <button onClick={() => setModalEntradaAberto(true)} className="bg-[#0a1f3e] text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition flex items-center gap-1">
            + Nova Movimentação
          </button>
          <button className="bg-[#0a1f3e] text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition">
            Listar Todos
          </button>
        </div>
      </div>

      {/* TABELA PRINCIPAL DINÂMICA */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
            <tr>
              <th className="py-4 px-4">Código da Entrada</th>
              <th className="py-4 px-4">Data de Cadastro</th>
              <th className="py-4 px-4">Nota Fiscal/Código</th>
              <th className="py-4 px-4 text-center">Total de Produtos</th>
              <th className="py-4 px-4 text-right">Preço Total</th>
              <th className="py-4 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entradas.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500 text-xs">Nenhuma entrada registrada ainda.</td></tr>
            ) : (
              entradas.map((entrada) => (
                <tr key={entrada.id} className="hover:bg-gray-50 transition">
                  <td className="py-4 px-4 font-semibold text-gray-700">{entrada.codigo_entrada}</td>
                  <td className="py-4 px-4">{entrada.data_cadastro}</td>
                  <td className="py-4 px-4">{entrada.nota_fiscal}</td>
                  <td className="py-4 px-4 text-center">{entrada.total_produtos}</td>
                  <td className="py-4 px-4 font-bold text-right text-green-600">{formatarMoeda(Number(entrada.preco_total))}</td>
                  <td className="py-4 px-4 text-center">
                    <button className="text-blue-600 hover:underline text-xs">Visualizar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: ENTRADA DE PRODUTOS / ESTORNO */}
      {modalEntradaAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-xl w-3/4 max-w-5xl flex flex-col min-h-[60vh] max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[#0a1f3e] font-bold text-lg">Entrada e Retorno de Produtos</h2>
              <button onClick={() => setModalEntradaAberto(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* BOTOÕES LADO A LADO */}
              <div className="flex gap-4 items-center">
                <button 
                  onClick={() => {
                    setModoAdicao('ENTRADA_COMPRA');
                    setModalGerenciarAberto(true);
                  }} 
                  className="bg-[#0a1f3e] text-white px-5 py-2.5 rounded font-semibold text-sm hover:bg-[#15305c] transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  Adicionar Itens (Compra)
                </button>

                <button 
                  onClick={() => {
                    setModoAdicao('RETORNO_GERAL');
                    setModalGerenciarAberto(true);
                  }} 
                  className="bg-amber-600 text-white px-5 py-2.5 rounded font-semibold text-sm hover:bg-amber-700 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                  Estorno de produtos (Sobras)
                </button>
              </div>

              <div className="border border-gray-200 rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                    <tr>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4 text-center">Quantidade</th>
                      <th className="py-3 px-4 text-right">Preço Unitário</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensDaEntrada.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-500 text-xs">Nenhum item lançado.</td></tr>
                    ) : (
                      itensDaEntrada.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0">
                          {/* BADGE VISUAL PARA COMPRA OU ESTORNO */}
                          <td className="py-3 px-4">
                            {item.tipo_movimentacao === 'RETORNO_GERAL' ? (
                              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">Estorno</span>
                            ) : (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Compra</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-700">{item.nome}</td>
                          <td className="py-3 px-4 text-center">{item.quantidade}</td>
                          <td className="py-3 px-4 text-right">{formatarMoeda(item.preco_unitario)}</td>
                          <td className="py-3 px-4 text-right font-bold">{formatarMoeda(item.total)}</td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => handleRemoverItemDaLista(idx)} className="text-red-500 hover:text-red-700 transition">Remover</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <p className="font-bold text-gray-800 text-lg">Total Geral: {formatarMoeda(totalGeral)}</p>
              <button 
                onClick={handleCadastrarEntrada}
                disabled={itensDaEntrada.length === 0} 
                className={`px-6 py-2.5 rounded font-bold text-sm transition ${itensDaEntrada.length > 0 ? 'bg-[#0a1f3e] text-white hover:bg-[#15305c]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                Salvar Movimentações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GERENCIAR ITENS */}
      {modalGerenciarAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-[800px] flex flex-col overflow-hidden">
            <div className={`flex justify-between items-center px-6 py-4 border-b border-gray-200 ${modoAdicao === 'RETORNO_GERAL' ? 'bg-amber-50' : ''}`}>
              <h2 className="text-[#0a1f3e] font-bold text-lg">
                {modoAdicao === 'RETORNO_GERAL' ? 'Devolver Sobras (Estorno)' : 'Adicionar Compra'}
              </h2>
              <button onClick={() => setModalGerenciarAberto(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {erroApi && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm font-bold">
                  ⚠️ ALERTA DE ERRO: {erroApi} <br/>
                  <span className="font-normal">Verifique se o backend Python está rodando e se o CORS está liberado.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {modoAdicao === 'RETORNO_GERAL' ? 'Nº da Ordem de Serviço / Nota' : 'Nº Nota Fiscal/Código da Entrada'}
                </label>
                <input type="text" value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} placeholder="Ex: 12345 ou OS-99" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"/>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Produto {carregando && <span className="text-blue-500 font-normal">(Carregando...)</span>}
                  </label>
                  
                  <select 
                    value={produtoSelecionadoId}
                    onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"
                  >
                    <option value="">SELECIONE UM PRODUTO</option>
                    {produtosDoBanco.length > 0 && produtosDoBanco.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-24">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantidade</label>
                  <input type="number" value={qtdSelecionada} onChange={(e) => setQtdSelecionada(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]" />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Preço Unitário</label>
                  <input type="number" step="0.01" value={precoSelecionado} onChange={(e) => setPrecoSelecionado(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]" />
                </div>
                <button onClick={handleAdicionarItemNaLista} className="bg-gray-200 text-gray-600 rounded-md w-10 h-9 flex items-center justify-center font-bold hover:bg-gray-300 transition">+</button>
              </div>

              {/* Tabela de pré-visualização no Modal 2 */}
              <div className="border border-gray-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Produto</th>
                      <th className="py-2 px-3 w-16">Qtd</th>
                      <th className="py-2 px-3 w-24">Unit.</th>
                      <th className="py-2 px-3 w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensDaEntrada.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2 px-3">{item.nome} <span className="ml-2 text-[10px] text-gray-400">({item.tipo_movimentacao === 'RETORNO_GERAL' ? 'Estorno' : 'Compra'})</span></td>
                        <td className="py-2 px-3">{item.quantidade}</td>
                        <td className="py-2 px-3">{formatarMoeda(item.preco_unitario)}</td>
                        <td className="py-2 px-3 font-semibold">{formatarMoeda(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
              <button onClick={() => setModalGerenciarAberto(false)} className="bg-gray-200 text-gray-800 px-5 py-2 rounded text-sm font-semibold hover:bg-gray-300 transition">
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}