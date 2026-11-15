'use client';

import React, { useCallback, useEffect, useState } from 'react';

// API do Render como padrão; NEXT_PUBLIC_API_URL pode sobrescrever o endereço

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://estoquenordsol.onrender.com').replace(/\/$/, '');

// --- TIPAGENS ---

interface Movimentacao {

  id: string | number;

  produto: string | number;

  produto_nome: string;

  tipo: 'ENTRADA_COMPRA' | 'RETORNO_GERAL' | 'SAIDA_OS' | 'AJUSTE';

  quantidade: number | string;

  numero_nota: string | null;

  data: string;

  os: string | number | null;

}

interface ItemEntrada {

  id_produto: string;

  nome: string;

  quantidade: number;

  preco_unitario: number;

  total: number;

  tipo_movimentacao: 'ENTRADA_COMPRA' | 'RETORNO_GERAL';

}

interface ProdutoBackend {

  id: string | number;

  nome: string;

  preco_custo?: string | number;

}

export default function EntradaProdutosPage() {

  // --- ESTADOS PRINCIPAIS ---

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  const [carregando, setCarregando] = useState(true);

  const [salvando, setSalvando] = useState(false);

  const [erroApi, setErroApi] = useState<string | null>(null);

  const [produtosDoBanco, setProdutosDoBanco] = useState<ProdutoBackend[]>([]);

  // --- ESTADOS DOS MODAIS ---

  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);

  const [modalGerenciarAberto, setModalGerenciarAberto] = useState(false);

  const [modoAdicao, setModoAdicao] = useState<'ENTRADA_COMPRA' | 'RETORNO_GERAL'>('ENTRADA_COMPRA');

  // --- ESTADOS DO FORMULÁRIO ---

  const [notaFiscal, setNotaFiscal] = useState('');

  const [itensDaEntrada, setItensDaEntrada] = useState<ItemEntrada[]>([]);

  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');

  const [qtdSelecionada, setQtdSelecionada] = useState('');

  const [precoSelecionado, setPrecoSelecionado] = useState('');

  // --- CARREGAR PRODUTOS ---

  const carregarProdutos = useCallback(async () => {

    const response = await fetch(`${API_URL}/api/produtos/`);

    if (!response.ok) {

      throw new Error(`Erro ao carregar produtos. Status: ${response.status}`);

    }

    const dados = await response.json();

    const lista = dados.results ?? dados;

    if (!Array.isArray(lista)) {

      throw new Error('A API de produtos não retornou uma lista válida.');

    }

    setProdutosDoBanco(lista);

  }, []);

  // --- CARREGAR COMPRAS E ESTORNOS ---

  const carregarMovimentacoes = useCallback(async () => {

    const response = await fetch(`${API_URL}/api/movimentacoes/`);

    if (!response.ok) {

      throw new Error(`Erro ao carregar movimentações. Status: ${response.status}`);

    }

    const dados = await response.json();

    const lista = dados.results ?? dados;

    if (!Array.isArray(lista)) {

      throw new Error('A API de movimentações não retornou uma lista válida.');

    }

    // Esta tela mostra somente compras e retornos; saídas de OS ficam fora dela.

    setMovimentacoes(lista.filter((item: Movimentacao) =>

      item.tipo === 'ENTRADA_COMPRA' || item.tipo === 'RETORNO_GERAL'

    ));

  }, []);

  // --- CARREGAMENTO INICIAL ---

  const carregarDados = useCallback(async () => {

    try {

      setCarregando(true);

      setErroApi(null);

      await Promise.all([carregarProdutos(), carregarMovimentacoes()]);

    } catch (error) {

      console.error('Erro ao carregar dados:', error);

      setErroApi(

        error instanceof Error

          ? error.message

          : 'Erro de conexão. Verifique se o Django está ligado e se o CORS está configurado.'

      );

    } finally {

      setCarregando(false);

    }

  }, [carregarProdutos, carregarMovimentacoes]);

  useEffect(() => {

    carregarDados();

  }, [carregarDados]);

  // --- CÁLCULOS ---

  const totalGeral = itensDaEntrada.reduce((acc, item) => acc + item.total, 0);

  const formatarMoeda = (valor: number) =>

    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- ADICIONAR PRODUTO À LISTA TEMPORÁRIA ---

  const handleAdicionarItemNaLista = () => {

    if (!produtoSelecionadoId || !qtdSelecionada || !precoSelecionado) {

      alert('Selecione um produto, informe a quantidade e o preço.');

      return;

    }

    const quantidade = Number(qtdSelecionada);

    const preco = Number(precoSelecionado);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {

      alert('Informe uma quantidade válida maior que zero.');

      return;

    }

    if (!Number.isFinite(preco) || preco < 0) {

      alert('Informe um preço válido.');

      return;

    }

    const produtoCompleto = produtosDoBanco.find(

      (produto) => produto.id.toString() === produtoSelecionadoId

    );

    if (!produtoCompleto) {

      alert('Produto não encontrado.');

      return;

    }

    const novoItem: ItemEntrada = {

      id_produto: produtoCompleto.id.toString(),

      nome: produtoCompleto.nome,

      quantidade,

      preco_unitario: preco,

      total: quantidade * preco,

      tipo_movimentacao: modoAdicao,

    };

    setItensDaEntrada((itensAtuais) => [...itensAtuais, novoItem]);

    setProdutoSelecionadoId('');

    setQtdSelecionada('');

    setPrecoSelecionado('');

  };

  // --- REMOVER ITEM DA LISTA TEMPORÁRIA ---

  const handleRemoverItemDaLista = (indexRemover: number) => {

    setItensDaEntrada((itensAtuais) =>

      itensAtuais.filter((_, index) => index !== indexRemover)

    );

  };

  // --- SALVAR COMPRA OU ESTORNO ---

  const handleCadastrarEntrada = async () => {

    if (itensDaEntrada.length === 0 || salvando) return;

    const payload = itensDaEntrada.map((item) => ({

      produto: item.id_produto,

      tipo: item.tipo_movimentacao,

      quantidade: item.quantidade,

      numero_nota: notaFiscal.trim() || 'Sem NF',

    }));

    try {

      setSalvando(true);

      setErroApi(null);

      const response = await fetch(`${API_URL}/api/movimentacoes/`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify(payload),

      });

      if (!response.ok) {

        const respostaTexto = await response.text();

        console.error('Erro retornado pelo Django:', respostaTexto);

        let mensagem = `Erro ao cadastrar. Status: ${response.status}`;

        try {

          const dadosErro = JSON.parse(respostaTexto);

          mensagem = JSON.stringify(dadosErro);

        } catch {

          // A resposta não era JSON; mantém a mensagem de erro padrão.

        }

        throw new Error(mensagem);

      }

      // Limpa o formulário somente depois de o Django confirmar o cadastro.

      setItensDaEntrada([]);

      setNotaFiscal('');

      setProdutoSelecionadoId('');

      setQtdSelecionada('');

      setPrecoSelecionado('');

      setModalGerenciarAberto(false);

      setModalEntradaAberto(false);

      // Atualiza a tabela sem precisar atualizar o navegador.

      await carregarMovimentacoes();

      alert('Movimentação cadastrada com sucesso!');

    } catch (error) {

      console.error('Erro ao salvar movimentação:', error);

      const mensagem =

        error instanceof Error

          ? error.message

          : 'Não foi possível conectar ao servidor.';

      setErroApi(mensagem);

      alert(`Não foi possível salvar a movimentação: ${mensagem}`);

    } finally {

      setSalvando(false);

    }

  };

  return (

    <div className="p-8 space-y-6">

      {/* CABEÇALHO E FILTROS */}

      <div className="flex flex-wrap gap-4 items-center">

        <input

          type="text"

          placeholder="Nota Fiscal"

          className="border border-gray-300 rounded-md px-4 py-2 w-80 text-sm focus:outline-none focus:border-[#0a1f3e]"

        />

        <div className="flex items-center">

          <input

            type="text"

            placeholder="Data Inicial"

            className="border border-gray-300 rounded-l-md px-4 py-2 w-36 text-sm focus:outline-none focus:border-[#0a1f3e]"

          />

          <div className="bg-[#0a1f3e] p-2.5 rounded-r-md flex items-center justify-center">

            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">

              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />

            </svg>

          </div>

        </div>

        <div className="flex items-center">

          <input

            type="text"

            placeholder="Data Final"

            className="border border-gray-300 rounded-l-md px-4 py-2 w-36 text-sm focus:outline-none focus:border-[#0a1f3e]"

          />

          <div className="bg-[#0a1f3e] p-2.5 rounded-r-md flex items-center justify-center">

            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">

              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />

            </svg>

          </div>

        </div>

        <div className="flex gap-2 ml-4">

          <button

            onClick={() => setModalEntradaAberto(true)}

            className="bg-[#0a1f3e] text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition"

          >

            + Nova Movimentação

          </button>

          <button

            onClick={carregarDados}

            className="bg-[#0a1f3e] text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition"

          >

            Listar Todos

          </button>

        </div>

      </div>

      {erroApi && (

        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">

          {erroApi}

        </div>

      )}

      {/* TABELA PRINCIPAL: COMPRAS E ESTORNOS */}

      <div className="bg-white rounded-md border border-gray-200 overflow-x-auto">

        <table className="w-full text-sm text-left">

          <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">

            <tr>

              <th className="py-4 px-4">Código</th>

              <th className="py-4 px-4">Data</th>

              <th className="py-4 px-4">Nota Fiscal / OS</th>

              <th className="py-4 px-4">Tipo</th>

              <th className="py-4 px-4">Produto</th>

              <th className="py-4 px-4 text-center">Quantidade</th>

              <th className="py-4 px-4 text-right">Valor estimado</th>

            </tr>

          </thead>

          <tbody className="divide-y divide-gray-100">

            {carregando ? (

              <tr><td colSpan={7} className="py-8 text-center text-gray-500">Carregando movimentações...</td></tr>

            ) : movimentacoes.length === 0 ? (

              <tr><td colSpan={7} className="py-8 text-center text-gray-500 text-xs">Nenhuma compra ou devolução registrada ainda.</td></tr>

            ) : (

              movimentacoes.map((movimentacao) => {

                const produto = produtosDoBanco.find((p) => p.id.toString() === movimentacao.produto.toString());

                const valorEstimado = Number(movimentacao.quantidade) * Number(produto?.preco_custo ?? 0);

                return (

                  <tr key={movimentacao.id} className="hover:bg-gray-50 transition">

                    <td className="py-4 px-4 font-semibold text-gray-700">#{movimentacao.id}</td>

                    <td className="py-4 px-4">{new Date(movimentacao.data).toLocaleString('pt-BR')}</td>

                    <td className="py-4 px-4">{movimentacao.numero_nota || 'Sem identificação'}</td>

                    <td className="py-4 px-4">

                      {movimentacao.tipo === 'RETORNO_GERAL' ? (

                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">Estorno</span>

                      ) : (

                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Compra</span>

                      )}

                    </td>

                    <td className="py-4 px-4 font-semibold text-gray-700">{movimentacao.produto_nome}</td>

                    <td className="py-4 px-4 text-center">{Number(movimentacao.quantidade).toLocaleString('pt-BR')}</td>

                    <td className="py-4 px-4 font-bold text-right text-green-700">{formatarMoeda(valorEstimado)}</td>

                  </tr>

                );

              })

            )}

          </tbody>

        </table>

      </div>

      <p className="text-xs text-gray-500">O valor é estimado com o preço de custo atual do produto. O modelo Movimentacao não armazena o preço histórico da movimentação.</p>

      {/* MODAL 1: ENTRADA DE PRODUTOS / ESTORNO */}

      {modalEntradaAberto && (

        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40 p-4">

          <div className="bg-white rounded-lg shadow-xl w-3/4 max-w-5xl flex flex-col min-h-[60vh] max-h-[90vh] overflow-hidden">

            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">

              <h2 className="text-[#0a1f3e] font-bold text-lg">

                Entrada e Retorno de Produtos

              </h2>

              <button

                onClick={() => setModalEntradaAberto(false)}

                className="text-gray-400 hover:text-gray-600"

              >

                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />

                </svg>

              </button>

            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">

              <div className="flex flex-wrap gap-4 items-center">

                <button

                  onClick={() => {

                    setModoAdicao('ENTRADA_COMPRA');

                    setModalGerenciarAberto(true);

                  }}

                  className="bg-[#0a1f3e] text-white px-5 py-2.5 rounded font-semibold text-sm hover:bg-[#15305c] transition flex items-center gap-2"

                >

                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />

                  </svg>

                  Adicionar Itens (Compra)

                </button>

                <button

                  onClick={() => {

                    setModoAdicao('RETORNO_GERAL');

                    setModalGerenciarAberto(true);

                  }}

                  className="bg-amber-600 text-white px-5 py-2.5 rounded font-semibold text-sm hover:bg-amber-700 transition flex items-center gap-2"

                >

                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />

                  </svg>

                  Estorno de produtos (Sobras)

                </button>

              </div>

              <div className="border border-gray-200 rounded-md overflow-x-auto">

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

                      <tr>

                        <td colSpan={6} className="py-8 text-center text-gray-500 text-xs">

                          Nenhum item lançado.

                        </td>

                      </tr>

                    ) : (

                      itensDaEntrada.map((item, idx) => (

                        <tr key={idx} className="border-b border-gray-100 last:border-0">

                          <td className="py-3 px-4">

                            {item.tipo_movimentacao === 'RETORNO_GERAL' ? (

                              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">

                                Estorno

                              </span>

                            ) : (

                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">

                                Compra

                              </span>

                            )}

                          </td>

                          <td className="py-3 px-4 font-semibold text-gray-700">{item.nome}</td>

                          <td className="py-3 px-4 text-center">{item.quantidade}</td>

                          <td className="py-3 px-4 text-right">{formatarMoeda(item.preco_unitario)}</td>

                          <td className="py-3 px-4 text-right font-bold">{formatarMoeda(item.total)}</td>

                          <td className="py-3 px-4 text-center">

                            <button

                              onClick={() => handleRemoverItemDaLista(idx)}

                              className="text-red-500 hover:text-red-700 transition"

                            >

                              Remover

                            </button>

                          </td>

                        </tr>

                      ))

                    )}

                  </tbody>

                </table>

              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">

              <p className="font-bold text-gray-800 text-lg">

                Total Geral: {formatarMoeda(totalGeral)}

              </p>

              <button

                onClick={handleCadastrarEntrada}

                disabled={itensDaEntrada.length === 0 || salvando}

                className={`px-6 py-2.5 rounded font-bold text-sm transition ${

                  itensDaEntrada.length > 0 && !salvando

                    ? 'bg-[#0a1f3e] text-white hover:bg-[#15305c]'

                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'

                }`}

              >

                {salvando ? 'Salvando...' : 'Salvar Movimentações'}

              </button>

            </div>

          </div>

        </div>

      )}

      {/* MODAL 2: GERENCIAR ITENS */}

      {modalGerenciarAberto && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-lg shadow-2xl w-full max-w-[800px] flex flex-col overflow-hidden">

            <div

              className={`flex justify-between items-center px-6 py-4 border-b border-gray-200 ${

                modoAdicao === 'RETORNO_GERAL' ? 'bg-amber-50' : ''

              }`}

            >

              <h2 className="text-[#0a1f3e] font-bold text-lg">

                {modoAdicao === 'RETORNO_GERAL' ? 'Devolver Sobras (Estorno)' : 'Adicionar Compra'}

              </h2>

              <button

                onClick={() => setModalGerenciarAberto(false)}

                className="text-gray-400 hover:text-gray-600"

              >

                ✕

              </button>

            </div>

            <div className="p-6 space-y-6">

              {erroApi && (

                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">

                  ⚠️ {erroApi}

                </div>

              )}

              <div>

                <label className="block text-xs font-bold text-gray-700 mb-1">

                  {modoAdicao === 'RETORNO_GERAL'

                    ? 'Nº da Ordem de Serviço / Nota'

                    : 'Nº Nota Fiscal/Código da Entrada'}

                </label>

                <input

                  type="text"

                  value={notaFiscal}

                  onChange={(e) => setNotaFiscal(e.target.value)}

                  placeholder="Ex: 12345 ou OS-99"

                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"

                />

              </div>

              <div className="flex flex-wrap items-end gap-3">

                <div className="flex-1 min-w-[220px]">

                  <label className="block text-xs font-bold text-gray-700 mb-1">

                    Produto {carregando && <span className="text-blue-500 font-normal">(Carregando...)</span>}

                  </label>

                  <select

                    value={produtoSelecionadoId}

                    onChange={(e) => setProdutoSelecionadoId(e.target.value)}

                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"

                  >

                    <option value="">SELECIONE UM PRODUTO</option>

                    {produtosDoBanco.map((produto) => (

                      <option key={produto.id} value={produto.id}>

                        {produto.nome}

                      </option>

                    ))}

                  </select>

                </div>

                <div className="w-24">

                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantidade</label>

                  <input

                    type="number"

                    min="1"

                    value={qtdSelecionada}

                    onChange={(e) => setQtdSelecionada(e.target.value)}

                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"

                  />

                </div>

                <div className="w-32">

                  <label className="block text-xs font-bold text-gray-700 mb-1">Preço Unitário</label>

                  <input

                    type="number"

                    min="0"

                    step="0.01"

                    value={precoSelecionado}

                    onChange={(e) => setPrecoSelecionado(e.target.value)}

                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"

                  />

                </div>

                <button

                  onClick={handleAdicionarItemNaLista}

                  className="bg-gray-200 text-gray-600 rounded-md w-10 h-9 flex items-center justify-center font-bold hover:bg-gray-300 transition"

                  title="Adicionar produto"

                >

                  +

                </button>

              </div>

              {/* PRÉ-VISUALIZAÇÃO DOS ITENS */}

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

                        <td className="py-2 px-3">

                          {item.nome}

                          <span className="ml-2 text-[10px] text-gray-400">

                            ({item.tipo_movimentacao === 'RETORNO_GERAL' ? 'Estorno' : 'Compra'})

                          </span>

                        </td>

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

              <button

                onClick={() => setModalGerenciarAberto(false)}

                className="bg-gray-200 text-gray-800 px-5 py-2 rounded text-sm font-semibold hover:bg-gray-300 transition"

              >

                Voltar

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}
