'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

// Os campos abaixo correspondem ao KitModeloSerializer do Django.

interface Produto {

  id: number | string;

  nome: string;

  preco_custo?: number | string;

}

interface ItemKit {

  id: number | string;

  produto: number | string;

  produto_detalhes?: Produto;

  quantidade_padrao: number | string;

}

interface Kit {

  id: number | string;

  nome_kit: string;

  descricao: string;

  itens: ItemKit[];

  valor_total: number | string;

}

interface ItemNovoKit {

  produto: string;

  nome: string;

  quantidade: string;

  preco_custo: number;

}

const API = `${(process.env.NEXT_PUBLIC_API_URL || 'https://estoquenordsol.onrender.com').replace(/\/$/, '')}/api`;

export default function KitsCadastradosPage() {

  const [kits, setKits] = useState<Kit[]>([]);

  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [carregando, setCarregando] = useState(true);

  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);

  const [nomeKit, setNomeKit] = useState('');

  const [descricao, setDescricao] = useState('');

  const [produtoSelecionado, setProdutoSelecionado] = useState('');

  const [quantidade, setQuantidade] = useState('1');

  const [itensNovos, setItensNovos] = useState<ItemNovoKit[]>([]);

  const carregarKits = useCallback(async () => {

    const response = await fetch(`${API}/kits/`);

    if (!response.ok) {

      throw new Error(`Não foi possível carregar os kits (HTTP ${response.status}).`);

    }

    const data = await response.json();

    const lista = data.results ?? data;

    if (!Array.isArray(lista)) throw new Error('A API de kits não retornou uma lista.');

    setKits(lista);

  }, []);

  const carregarProdutos = useCallback(async () => {

    const response = await fetch(`${API}/produtos/`);

    if (!response.ok) {

      throw new Error(`Não foi possível carregar os produtos (HTTP ${response.status}).`);

    }

    const data = await response.json();

    const lista = data.results ?? data;

    if (!Array.isArray(lista)) throw new Error('A API de produtos não retornou uma lista.');

    setProdutos(lista);

  }, []);

  const carregarDados = useCallback(async () => {

    try {

      setCarregando(true);

      setErro(null);

      await Promise.all([carregarKits(), carregarProdutos()]);

    } catch (e) {

      const mensagem = e instanceof Error ? e.message : 'Erro ao carregar os dados.';

      setErro(mensagem);

      console.error('Erro ao carregar kits/produtos:', e);

    } finally {

      setCarregando(false);

    }

  }, [carregarKits, carregarProdutos]);

  useEffect(() => {

    carregarDados();

  }, [carregarDados]);

  const formatarMoeda = (valor: number | string) =>

    Number(valor || 0).toLocaleString('pt-BR', {

      style: 'currency',

      currency: 'BRL',

    });

  const adicionarProduto = () => {

    if (!produtoSelecionado) {

      alert('Selecione um produto.');

      return;

    }

    const qtd = Number(quantidade);

    if (!Number.isFinite(qtd) || qtd <= 0) {

      alert('Informe uma quantidade maior que zero.');

      return;

    }

    const produto = produtos.find((p) => String(p.id) === produtoSelecionado);

    if (!produto) {

      alert('Produto não encontrado.');

      return;

    }

    const existente = itensNovos.find((item) => item.produto === String(produto.id));

    if (existente) {

      alert('Esse produto já foi adicionado ao kit. Remova-o e adicione novamente se quiser alterar a quantidade.');

      return;

    }

    setItensNovos((atuais) => [

      ...atuais,

      {

        produto: String(produto.id),

        nome: produto.nome,

        quantidade: String(qtd),

        preco_custo: Number(produto.preco_custo ?? 0),

      },

    ]);

    setProdutoSelecionado('');

    setQuantidade('1');

  };

  const removerProduto = (idProduto: string) => {

    setItensNovos((atuais) => atuais.filter((item) => item.produto !== idProduto));

  };

  const totalKit = itensNovos.reduce(

    (total, item) => total + Number(item.quantidade) * item.preco_custo,

    0

  );

  const limparFormulario = () => {

    setNomeKit('');

    setDescricao('');

    setProdutoSelecionado('');

    setQuantidade('1');

    setItensNovos([]);

    setErro(null);

  };

  const cadastrarKit = async () => {

    if (!nomeKit.trim()) {

      alert('Informe o nome do kit.');

      return;

    }

    try {

      setSalvando(true);

      setErro(null);

      // O serializer do Django não permite cadastrar os itens aninhados junto com o kit.

      // Primeiro criamos o KitModelo.

      const respostaKit = await fetch(`${API}/kits/`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          nome_kit: nomeKit.trim(),

          descricao: descricao.trim(),

        }),

      });

      if (!respostaKit.ok) {

        const texto = await respostaKit.text();

        throw new Error(`Erro ao criar o kit (HTTP ${respostaKit.status}): ${texto}`);

      }

      const kitCriado: Kit = await respostaKit.json();

      // Depois vinculamos cada produto ao kit usando o endpoint de ItemKit.

      for (const item of itensNovos) {

        const respostaItem = await fetch(`${API}/itens-kit/`, {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            kit: kitCriado.id,

            produto: item.produto,

            quantidade_padrao: item.quantidade,

          }),

        });

        if (!respostaItem.ok) {

          const texto = await respostaItem.text();

          throw new Error(

            `O kit "${kitCriado.nome_kit}" foi criado, mas não foi possível adicionar "${item.nome}". HTTP ${respostaItem.status}: ${texto}`

          );

        }

      }

      await carregarKits();

      limparFormulario();

      setModalAberto(false);

      alert('Kit cadastrado com sucesso!');

    } catch (e) {

      const mensagem = e instanceof Error ? e.message : 'Não foi possível cadastrar o kit.';

      setErro(mensagem);

      console.error('Erro ao cadastrar kit:', e);

      alert(mensagem);

      // Atualiza a listagem porque o kit pode ter sido criado antes de uma falha ao vincular item.

      try {

        await carregarKits();

      } catch (erroCarregamento) {

        console.error(erroCarregamento);

      }

    } finally {

      setSalvando(false);

    }

  };

  return (

    <div className="p-8 space-y-6">

      {/* FILTROS E AÇÕES */}

      <div className="flex flex-wrap gap-4 items-center">

        <button

          onClick={carregarDados}

          className="bg-[#0a1f3e] text-white px-6 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition"

        >

          Listar Todos

        </button>

        <button

          onClick={() => {

            limparFormulario();

            setModalAberto(true);

          }}

          className="bg-[#0a1f3e] text-white px-6 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c] transition"

        >

          + Cadastrar Kit

        </button>

      </div>

      {erro && (

        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded text-sm break-words">

          {erro}

        </div>

      )}

      {/* TABELA DE KITS */}

      <div className="bg-white rounded-md border border-gray-200 overflow-x-auto shadow-sm">

        <table className="w-full text-sm text-left">

          <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase text-xs tracking-wider">

            <tr>

              <th className="py-4 px-6">Código</th>

              <th className="py-4 px-6">Nome do Kit</th>

              <th className="py-4 px-6">Descrição</th>

              <th className="py-4 px-6 text-center">Produtos</th>

              <th className="py-4 px-6 text-right">Valor Total</th>

              <th className="py-4 px-6 text-center">Ações</th>

            </tr>

          </thead>

          <tbody className="divide-y divide-gray-100">

            {carregando ? (

              <tr>

                <td colSpan={6} className="py-12 text-center text-gray-500 font-medium">

                  Carregando dados...

                </td>

              </tr>

            ) : kits.length === 0 ? (

              <tr>

                <td colSpan={6} className="py-12 text-center text-gray-400 italic">

                  Nenhum kit cadastrado ainda.

                </td>

              </tr>

            ) : (

              kits.map((kit) => (

                <tr key={kit.id} className="hover:bg-gray-50 transition">

                  <td className="py-4 px-6 font-semibold text-gray-800">KIT-{kit.id}</td>

                  <td className="py-4 px-6 font-medium text-gray-800">{kit.nome_kit}</td>

                  <td className="py-4 px-6 text-gray-600">{kit.descricao || '—'}</td>

                  <td className="py-4 px-6 text-center">{kit.itens?.length ?? 0}</td>

                  <td className="py-4 px-6 text-right font-bold text-gray-800">

                    {formatarMoeda(kit.valor_total)}

                  </td>

                  <td className="py-4 px-6 text-center">

                    <Link

                      href={`/estoque/kits/${kit.id}`}

                      className="text-blue-500 hover:text-blue-700 transition inline-flex justify-center"

                      title="Visualizar/editar kit"

                    >

                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />

                      </svg>

                    </Link>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* MODAL DE CADASTRO */}

      {modalAberto && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b px-6 py-4">

              <h2 className="text-lg font-bold text-[#0a1f3e]">Cadastrar novo kit</h2>

              <button

                onClick={() => !salvando && setModalAberto(false)}

                className="text-gray-500 hover:text-gray-800"

                disabled={salvando}

              >

                ✕

              </button>

            </div>

            <div className="space-y-5 p-6">

              <div>

                <label className="mb-1 block text-sm font-semibold text-gray-700">Nome do kit</label>

                <input

                  value={nomeKit}

                  onChange={(e) => setNomeKit(e.target.value)}

                  placeholder="Ex.: Kit Instalação Solar"

                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0a1f3e]"

                />

              </div>

              <div>

                <label className="mb-1 block text-sm font-semibold text-gray-700">Descrição</label>

                <textarea

                  value={descricao}

                  onChange={(e) => setDescricao(e.target.value)}

                  placeholder="Descreva a finalidade do kit"

                  rows={3}

                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0a1f3e]"

                />

              </div>

              <div className="rounded-md border border-gray-200 p-4 space-y-3">

                <h3 className="font-semibold text-gray-800">Produtos do kit</h3>

                <div className="flex flex-wrap items-end gap-3">

                  <div className="min-w-[220px] flex-1">

                    <label className="mb-1 block text-xs font-semibold text-gray-700">Produto</label>

                    <select

                      value={produtoSelecionado}

                      onChange={(e) => setProdutoSelecionado(e.target.value)}

                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"

                    >

                      <option value="">Selecione um produto</option>

                      {produtos.map((produto) => (

                        <option key={produto.id} value={produto.id}>

                          {produto.nome}

                        </option>

                      ))}

                    </select>

                  </div>

                  <div className="w-28">

                    <label className="mb-1 block text-xs font-semibold text-gray-700">Quantidade</label>

                    <input

                      type="number"

                      min="0.01"

                      step="0.01"

                      value={quantidade}

                      onChange={(e) => setQuantidade(e.target.value)}

                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"

                    />

                  </div>

                  <button

                    type="button"

                    onClick={adicionarProduto}

                    className="rounded bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300"

                  >

                    + Adicionar

                  </button>

                </div>

                {itensNovos.length === 0 ? (

                  <p className="py-3 text-center text-sm text-gray-400">

                    Nenhum produto adicionado. Você também pode cadastrar um kit sem itens.

                  </p>

                ) : (

                  <div className="overflow-x-auto">

                    <table className="w-full text-sm">

                      <thead className="bg-gray-50 text-left text-gray-600">

                        <tr>

                          <th className="p-2">Produto</th>

                          <th className="p-2 text-center">Quantidade</th>

                          <th className="p-2 text-right">Subtotal estimado</th>

                          <th className="p-2 text-center">Ação</th>

                        </tr>

                      </thead>

                      <tbody>

                        {itensNovos.map((item) => (

                          <tr key={item.produto} className="border-t">

                            <td className="p-2">{item.nome}</td>

                            <td className="p-2 text-center">{item.quantidade}</td>

                            <td className="p-2 text-right">

                              {formatarMoeda(Number(item.quantidade) * item.preco_custo)}

                            </td>

                            <td className="p-2 text-center">

                              <button

                                onClick={() => removerProduto(item.produto)}

                                className="text-red-600 hover:underline"

                              >

                                Remover

                              </button>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

                <div className="border-t pt-3 text-right font-bold text-gray-800">

                  Total estimado: {formatarMoeda(totalKit)}

                </div>

              </div>

              {erro && (

                <div className="rounded bg-red-100 px-4 py-3 text-sm text-red-700 break-words">

                  {erro}

                </div>

              )}

            </div>

            <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">

              <button

                onClick={() => setModalAberto(false)}

                disabled={salvando}

                className="rounded bg-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"

              >

                Cancelar

              </button>

              <button

                onClick={cadastrarKit}

                disabled={salvando || !nomeKit.trim()}

                className="rounded bg-[#0a1f3e] px-5 py-2 text-sm font-semibold text-white hover:bg-[#15305c] disabled:cursor-not-allowed disabled:opacity-50"

              >

                {salvando ? 'Salvando...' : 'Salvar Kit'}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}
