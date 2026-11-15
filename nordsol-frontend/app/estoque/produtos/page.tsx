'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  'https://estoquenordsol.onrender.com'
).replace(/\/$/, '');

interface ProdutoBackend {
  id: number | string;
  data_cadastro?: string | null;
  sku_codigo?: string | null;
  nome: string;
  fornecedor?: string | null;
  marca?: string | null;
  estoque_atual?: number | string | null;
  unidade?: string | null;
  quantidade_minima?: number | string | null;
  preco_custo?: number | string | null;
  valor_total?: number | string | null;
}

interface Produto {
  id: number | string;
  data_cadastro: string;
  data_cadastro_raw: string | null;
  codigo: string;
  nome: string;
  fornecedor: string;
  marca: string;
  quantidade: number;
  unidade: string;
  qtd_minima: number;
  valor_unitario: number;
  valor_total: number;
}

const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Extrai a data YYYY-MM-DD sem deslocá-la por fuso horário.
const somenteData = (valor: string | null): string =>
  valor ? valor.slice(0, 10) : '';

const formatarData = (valor: string | null): string => {
  const data = somenteData(valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return '-';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

export default function ProdutosCadastradosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [produtoVisualizado, setProdutoVisualizado] = useState<Produto | null>(null);

  const carregarProdutos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      // Busca as páginas seguintes caso o DRF tenha paginação habilitada.
      const todos: ProdutoBackend[] = [];
      let proximaUrl: string | null = `${API_URL}/api/produtos/`;
      const urlsVisitadas = new Set<string>();
      while (proximaUrl) {
        const urlAtual: string = proximaUrl;
        if (urlsVisitadas.has(urlAtual)) {
          throw new Error('A API retornou uma paginação circular.');
        }
        urlsVisitadas.add(urlAtual);
        const resposta: Response = await fetch(urlAtual);
        if (!resposta.ok) {
          throw new Error(`Não foi possível carregar os produtos (HTTP ${resposta.status}).`);
        }
        const dados: unknown = await resposta.json();
        if (Array.isArray(dados)) {
          todos.push(...(dados as ProdutoBackend[]));
          proximaUrl = null;
        } else if (dados && typeof dados === 'object' && 'results' in dados) {
          const pagina = dados as { results: ProdutoBackend[]; next?: string | null };
          if (!Array.isArray(pagina.results)) {
            throw new Error('A API não retornou uma lista válida de produtos.');
          }
          todos.push(...pagina.results);
          proximaUrl = pagina.next ? new URL(pagina.next, urlAtual).toString() : null;
        } else {
          throw new Error('A API não retornou uma lista válida de produtos.');
        }
      }

      setProdutos(todos.map((p) => {
        const preco = Number(p.preco_custo ?? 0);
        const quantidade = Number(p.estoque_atual ?? 0);
        return {
          id: p.id,
          data_cadastro: formatarData(p.data_cadastro ?? null),
          data_cadastro_raw: p.data_cadastro ?? null,
          codigo: String(p.sku_codigo || p.id),
          nome: p.nome || 'SEM NOME',
          fornecedor: p.fornecedor || 'NÃO INFORMADO',
          marca: p.marca || 'NÃO INFORMADA',
          quantidade,
          unidade: p.unidade || 'UN',
          qtd_minima: Number(p.quantidade_minima ?? 0),
          valor_unitario: preco,
          valor_total: p.valor_total == null ? preco * quantidade : Number(p.valor_total),
        };
      }));
    } catch (e) {
      console.error('Erro ao buscar produtos:', e);
      setErro(e instanceof Error ? e.message : 'Falha ao conectar com a API.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarProdutos();
  }, [carregarProdutos]);

  const produtosFiltrados = useMemo(() => {
    const busca = termoBusca.toLocaleLowerCase('pt-BR').trim();
    return produtos.filter((p) => {
      const correspondeTexto = !busca || [p.nome, p.marca, p.fornecedor, p.codigo]
        .some((campo) => campo.toLocaleLowerCase('pt-BR').includes(busca));
      const data = somenteData(p.data_cadastro_raw);
      const correspondeData = (!dataInicio && !dataFim) ||
        (Boolean(data) && (!dataInicio || data >= dataInicio) && (!dataFim || data <= dataFim));
      return correspondeTexto && correspondeData;
    });
  }, [produtos, termoBusca, dataInicio, dataFim]);

  const menosDe10 = produtosFiltrados.filter((p) => p.quantidade < 10).length;
  const entre10e20 = produtosFiltrados.filter((p) => p.quantidade >= 10 && p.quantidade <= 20).length;
  const maisDe20 = produtosFiltrados.filter((p) => p.quantidade > 20).length;

  const limparFiltros = () => {
    setTermoBusca('');
    setDataInicio('');
    setDataFim('');
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Pesquisar produto
          <input type="search" placeholder="Nome, marca, fornecedor ou código..." value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 w-full sm:w-80 text-sm font-normal focus:outline-none focus:border-[#0a1f3e]" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Data inicial
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Data final
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm font-normal" />
        </label>
        <button type="button" onClick={limparFiltros}
          className="bg-[#0a1f3e] text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-[#15305c]">
          Listar Todos / Limpar
        </button>
        <button type="button" onClick={() => void carregarProdutos()} disabled={carregando}
          className="border border-[#0a1f3e] text-[#0a1f3e] px-5 py-2 rounded-md font-semibold text-sm disabled:opacity-50">
          Atualizar dados
        </button>
      </div>

      {erro && <div role="alert" className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">{erro}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#ffcdd2] text-[#0a1f3e] p-6 rounded-md border border-[#ef9a9a] font-bold">
          <span className="text-2xl">{menosDe10}</span> - Produtos com menos de 10 itens no estoque
        </div>
        <div className="bg-[#fff9c4] text-[#0a1f3e] p-6 rounded-md border border-[#fff59d] font-bold">
          <span className="text-2xl">{entre10e20}</span> - Produtos entre 10 e 20 itens no estoque
        </div>
        <div className="bg-[#bbdefb] text-[#0a1f3e] p-6 rounded-md border border-[#90caf9] font-bold">
          <span className="text-2xl">{maisDe20}</span> - Produtos com mais de 20 itens no estoque
        </div>
        <div className="bg-[#a5d6a7] text-[#0a1f3e] p-6 rounded-md border border-[#81c784] font-bold">
          <span className="text-2xl">{produtosFiltrados.length}</span> - Total de Produtos Encontrados
        </div>
      </div>

      <div className="bg-white rounded-md border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
            <tr>
              {['Data Cadastro', 'Imagem', 'Código', 'Produto', 'Fornecedor', 'Marca', 'Quantidade', 'Quant. Mínima Estoque', 'Valor Unit.', 'Valor Total', 'Ações'].map((titulo) =>
                <th key={titulo} className="py-4 px-4">{titulo}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {carregando ? (
              <tr><td colSpan={11} className="py-8 text-center text-gray-500">Carregando produtos...</td></tr>
            ) : produtosFiltrados.length === 0 ? (
              <tr><td colSpan={11} className="py-8 text-center text-gray-500">Nenhum produto encontrado.</td></tr>
            ) : produtosFiltrados.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-600">{p.data_cadastro}</td>
                <td className="py-3 px-4"><div className="w-12 h-12 bg-gray-100 border rounded flex items-center justify-center text-[9px] text-gray-500 text-center">SEM IMAGEM</div></td>
                <td className="py-3 px-4 text-gray-600">{p.codigo}</td>
                <td className="py-3 px-4 font-semibold text-[#0a1f3e] uppercase">{p.nome}</td>
                <td className="py-3 px-4 font-semibold text-gray-700 uppercase">{p.fornecedor}</td>
                <td className="py-3 px-4 font-semibold text-gray-700 uppercase">{p.marca}</td>
                <td className="py-3 px-4 font-bold">
                  <span className={p.quantidade <= p.qtd_minima ? 'text-red-600' : 'text-gray-700'}>
                    {p.quantidade.toLocaleString('pt-BR')} {p.unidade}
                  </span>
                </td>
                <td className="py-3 px-4 text-red-600 font-semibold">{p.qtd_minima.toLocaleString('pt-BR')}</td>
                <td className="py-3 px-4 text-gray-600">{moeda(p.valor_unitario)}</td>
                <td className="py-3 px-4 text-gray-600">{moeda(p.valor_total)}</td>
                <td className="py-3 px-4 text-center">
                  <button type="button" onClick={() => setProdutoVisualizado(p)}
                    className="text-[#0a1f3e] hover:text-blue-700 underline" title="Visualizar produto">
                    Visualizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {produtoVisualizado && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="presentation"
          onClick={() => setProdutoVisualizado(null)}>
          <div role="dialog" aria-modal="true" aria-label="Detalhes do produto"
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-3"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#0a1f3e]">Detalhes do produto</h2>
              <button type="button" onClick={() => setProdutoVisualizado(null)} aria-label="Fechar">✕</button>
            </div>
            <p><strong>Nome:</strong> {produtoVisualizado.nome}</p>
            <p><strong>Código:</strong> {produtoVisualizado.codigo}</p>
            <p><strong>Marca:</strong> {produtoVisualizado.marca}</p>
            <p><strong>Fornecedor:</strong> {produtoVisualizado.fornecedor}</p>
            <p><strong>Cadastro:</strong> {produtoVisualizado.data_cadastro}</p>
            <p><strong>Estoque:</strong> {produtoVisualizado.quantidade} {produtoVisualizado.unidade}</p>
            <p><strong>Estoque mínimo:</strong> {produtoVisualizado.qtd_minima}</p>
            <p><strong>Preço de custo:</strong> {moeda(produtoVisualizado.valor_unitario)}</p>
            <p><strong>Valor total:</strong> {moeda(produtoVisualizado.valor_total)}</p>
            <button type="button" onClick={() => setProdutoVisualizado(null)}
              className="w-full bg-[#0a1f3e] text-white py-2 rounded-md">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
