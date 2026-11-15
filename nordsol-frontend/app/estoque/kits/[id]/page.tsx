'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://estoquenordsol.onrender.com').replace(/\/$/, '');
const API = `${API_URL}/api`;

type ID = string | number;

interface ProdutoBackend {
  id: ID;
  nome: string;
  preco_custo?: string | number;
  unidade?: string;
}

interface ItemKitBackend {
  id: ID;
  produto: ID;
  quantidade_padrao: number | string;
  produto_detalhes?: ProdutoBackend;
}

interface KitBackend {
  id: ID;
  nome_kit: string;
  descricao: string;
  itens: ItemKitBackend[];
}

interface ItemKitTela {
  id?: ID;
  produto_id: ID;
  nome: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
}

async function lerResposta(response: Response) {
  const texto = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${texto.slice(0, 500) || response.statusText}`);
  }
  return texto ? JSON.parse(texto) : null;
}

function listaDaApi<T>(dados: unknown): T[] {
  if (Array.isArray(dados)) return dados as T[];
  if (dados && typeof dados === 'object' && 'results' in dados && Array.isArray(dados.results)) {
    return dados.results as T[];
  }
  throw new Error('A API não retornou uma lista válida.');
}

export default function EditarKitPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [carregandoDados, setCarregandoDados] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeKit, setNomeKit] = useState('');
  const [descricaoKit, setDescricaoKit] = useState('');
  const [itensDoKit, setItensDoKit] = useState<ItemKitTela[]>([]);
  const [itensOriginais, setItensOriginais] = useState<ItemKitBackend[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<ProdutoBackend[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState('1');

  const carregarDados = useCallback(async () => {
    if (!kitId) return;
    setCarregandoDados(true);
    setErro(null);
    try {
      const [resProdutos, resKit] = await Promise.all([
        fetch(`${API}/produtos/`, { cache: 'no-store' }),
        fetch(`${API}/kits/${encodeURIComponent(kitId)}/`, { cache: 'no-store' }),
      ]);
      const [dadosProdutos, kit] = await Promise.all([
        lerResposta(resProdutos),
        lerResposta(resKit) as Promise<KitBackend>,
      ]);
      const produtos = listaDaApi<ProdutoBackend>(dadosProdutos);
      setProdutosDisponiveis(produtos);
      setNomeKit(kit.nome_kit ?? '');
      setDescricaoKit(kit.descricao ?? '');
      const originais = kit.itens ?? [];
      setItensOriginais(originais);
      setItensDoKit(originais.map((item) => {
        const produto = produtos.find((p) => String(p.id) === String(item.produto)) ?? item.produto_detalhes;
        return {
          id: item.id,
          produto_id: item.produto,
          nome: produto?.nome ?? 'Produto desconhecido',
          quantidade: Number(item.quantidade_padrao),
          unidade: produto?.unidade ?? 'UN',
          valor_unitario: Number(produto?.preco_custo ?? 0),
        };
      }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os dados do kit.');
    } finally {
      setCarregandoDados(false);
    }
  }, [kitId]);

  useEffect(() => { void carregarDados(); }, [carregarDados]);

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const adicionarItem = () => {
    const qtd = Number(quantidadeSelecionada);
    if (!produtoSelecionado || !Number.isFinite(qtd) || qtd <= 0) {
      alert('Selecione um produto e informe uma quantidade válida maior que zero.');
      return;
    }
    const produto = produtosDisponiveis.find((p) => String(p.id) === produtoSelecionado);
    if (!produto) return;
    setItensDoKit((atuais) => {
      const existente = atuais.find((i) => String(i.produto_id) === produtoSelecionado);
      if (existente) {
        return atuais.map((item) => String(item.produto_id) === produtoSelecionado
          ? { ...item, quantidade: item.quantidade + qtd }
          : item);
      }
      return [...atuais, {
        produto_id: produto.id,
        nome: produto.nome,
        quantidade: qtd,
        unidade: produto.unidade ?? 'UN',
        valor_unitario: Number(produto.preco_custo ?? 0),
      }];
    });
    setProdutoSelecionado('');
    setQuantidadeSelecionada('1');
  };

  const removerItem = (produtoId: ID) => {
    setItensDoKit((atuais) => atuais.filter((i) => String(i.produto_id) !== String(produtoId)));
  };

  const salvarAlteracoes = async () => {
    if (salvando || !kitId) return;
    if (!nomeKit.trim()) { alert('Informe o nome do kit.'); return; }
    if (itensDoKit.some((i) => !Number.isFinite(i.quantidade) || i.quantidade <= 0)) {
      alert('Existem quantidades inválidas.'); return;
    }
    setSalvando(true);
    setErro(null);
    try {
      // O serializer do kit ignora `itens` (read_only=True).
      await lerResposta(await fetch(`${API}/kits/${encodeURIComponent(kitId)}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_kit: nomeKit.trim(), descricao: descricaoKit.trim() }),
      }));

      const atuaisPorProduto = new Map(itensDoKit.map((item) => [String(item.produto_id), item]));

      // Exclui somente os itens que o usuário removeu.
      for (const original of itensOriginais) {
        if (!atuaisPorProduto.has(String(original.produto))) {
          await lerResposta(await fetch(`${API}/itens-kit/${original.id}/`, { method: 'DELETE' }));
        }
      }

      // Atualiza quantidades existentes e cria somente produtos novos.
      for (const item of itensDoKit) {
        const original = itensOriginais.find((i) => String(i.produto) === String(item.produto_id));
        if (original) {
          if (Number(original.quantidade_padrao) !== item.quantidade) {
            await lerResposta(await fetch(`${API}/itens-kit/${original.id}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantidade_padrao: item.quantidade }),
            }));
          }
        } else {
          await lerResposta(await fetch(`${API}/itens-kit/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kit: kitId, produto: item.produto_id, quantidade_padrao: item.quantidade }),
          }));
        }
      }

      alert('Kit atualizado com sucesso!');
      router.push('/estoque/kits');
      router.refresh();
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : 'Erro ao salvar o kit.';
      setErro(`Não foi possível concluir todas as alterações. Algumas podem ter sido salvas. ${mensagem}`);
      // Sincroniza com o servidor para evitar repetir operações já concluídas.
      await carregarDados();
    } finally {
      setSalvando(false);
    }
  };

  const totalKit = itensDoKit.reduce((soma, item) => soma + item.quantidade * item.valor_unitario, 0);

  if (carregandoDados) {
    return <div className="p-8 text-center text-gray-500">Carregando informações do kit...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center border-b pb-4 gap-4">
        <div>
          <Link href="/estoque/kits" className="text-sm text-blue-600 hover:underline">← Voltar para listagem</Link>
          <h1 className="text-2xl font-bold text-[#0a1f3e]">Editar Kit Modelo #{kitId}</h1>
        </div>
        <button onClick={salvarAlteracoes} disabled={salvando || !!erro} className="bg-[#0a1f3e] text-white px-6 py-2.5 rounded font-bold disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {erro && <div role="alert" className="bg-red-100 text-red-800 border border-red-300 p-4 rounded">
        <p>{erro}</p>
        <button onClick={carregarDados} className="mt-2 underline font-semibold">Tentar carregar novamente</button>
      </div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded border shadow-sm">
        <label className="text-sm font-semibold">Nome do Kit *
          <input value={nomeKit} onChange={(e) => setNomeKit(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 font-normal" />
        </label>
        <label className="text-sm font-semibold">Descrição
          <input value={descricaoKit} onChange={(e) => setDescricaoKit(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 font-normal" />
        </label>
      </div>

      <div className="bg-white p-6 rounded border shadow-sm space-y-4">
        <h2 className="font-bold text-gray-800 border-b pb-2">Composição dos produtos do kit</h2>
        <div className="flex flex-wrap gap-3 items-end bg-gray-50 p-4 rounded">
          <label className="flex-1 min-w-48 text-sm font-semibold">Incluir produto
            <select value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 bg-white font-normal">
              <option value="">Selecione para adicionar...</option>
              {produtosDisponiveis.map((p) => <option key={p.id} value={p.id}>{p.nome} — {formatarMoeda(Number(p.preco_custo ?? 0))} / {p.unidade ?? 'UN'}</option>)}
            </select>
          </label>
          <label className="w-32 text-sm font-semibold">Quantidade
            <input type="number" min="0.01" step="0.01" value={quantidadeSelecionada} onChange={(e) => setQuantidadeSelecionada(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 font-normal" />
          </label>
          <button onClick={adicionarItem} className="bg-[#0a1f3e] text-white px-5 py-2 rounded font-semibold">Adicionar</button>
        </div>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100"><tr>
              <th className="p-3">Produto</th><th className="p-3 text-center">Quantidade</th><th className="p-3 text-right">Valor Unitário</th><th className="p-3 text-right">Total</th><th className="p-3 text-center">Ação</th>
            </tr></thead>
            <tbody className="divide-y">
              {itensDoKit.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">Este kit não possui produtos.</td></tr> :
                itensDoKit.map((item) => <tr key={String(item.produto_id)}>
                  <td className="p-3 font-semibold">{item.nome}</td>
                  <td className="p-3 text-center">{item.quantidade} {item.unidade}</td>
                  <td className="p-3 text-right">{formatarMoeda(item.valor_unitario)}</td>
                  <td className="p-3 text-right font-bold">{formatarMoeda(item.quantidade * item.valor_unitario)}</td>
                  <td className="p-3 text-center"><button onClick={() => removerItem(item.produto_id)} className="text-red-600 font-bold" title="Remover produto">✕</button></td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="text-right font-bold text-lg text-[#0a1f3e]">Custo Total do Kit: {formatarMoeda(totalKit)}</div>
        <p className="text-xs text-gray-500">Valores estimados com base no preço de custo atual dos produtos.</p>
      </div>
    </div>
  );
}
