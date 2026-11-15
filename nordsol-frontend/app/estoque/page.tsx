
'use client';

import { useCallback, useEffect, useState } from 'react';

// ==========================================
// CONFIGURAÇÃO DA API DJANGO
// ==========================================

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  'https://estoquenordsol.onrender.com'
).replace(/\/+$/, '');

// ==========================================
// TIPAGENS
// ==========================================

interface Categoria {
  id: number;
  nome: string;
}

interface Produto {
  id: number;
  nome: string;
  preco_custo: string | number | null;
  estoque_atual: string | number | null;
  quantidade_minima: string | number | null;
  unidade: string | null;
  categoria:
    | number
    | string
    | {
        id: number;
        nome?: string;
      }
    | null;
}

interface RespostaPaginada<T> {
  results: T[];
  next: string | null;
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function ehRespostaPaginada<T>(
  valor: unknown
): valor is RespostaPaginada<T> {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'results' in valor &&
    Array.isArray(
      (valor as RespostaPaginada<T>).results
    )
  );
}

// Busca todos os registros, inclusive quando
// a API Django retorna dados paginados.
async function buscarListaCompleta<T>(
  caminho: string,
  signal?: AbortSignal
): Promise<T[]> {
  const itens: T[] = [];

  let proximaUrl: string | null =
    `${API_URL}${caminho}`;

  const urlsVisitadas = new Set<string>();

  while (proximaUrl) {
    const url: URL = new URL(
      proximaUrl,
      API_URL
    );

    // Impede seguir links de paginação
    // para servidores desconhecidos.
    if (url.origin !== new URL(API_URL).origin) {
      throw new Error(
        'A API retornou uma URL de paginação inválida.'
      );
    }

    if (urlsVisitadas.has(url.href)) {
      throw new Error(
        'A API retornou uma paginação repetida.'
      );
    }

    urlsVisitadas.add(url.href);

    const response: Response = await fetch(
      url.href,
      {
        signal,
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(
        `Erro ao carregar ${caminho}. HTTP ${response.status}`
      );
    }

    const dados: unknown = await response.json();

    if (Array.isArray(dados)) {
      itens.push(...(dados as T[]));
      proximaUrl = null;
    } else if (ehRespostaPaginada<T>(dados)) {
      itens.push(...dados.results);
      proximaUrl = dados.next;
    } else {
      throw new Error(
        `Resposta inválida da API: ${caminho}`
      );
    }
  }

  return itens;
}

// Formatação de preços em reais
const formatadorMoeda = new Intl.NumberFormat(
  'pt-BR',
  {
    style: 'currency',
    currency: 'BRL',
  }
);

// Obtém o ID da categoria de um produto
function obterCategoriaId(
  produto: Produto
): number | null {
  const categoria = produto.categoria;

  if (
    categoria === null ||
    categoria === undefined ||
    categoria === ''
  ) {
    return null;
  }

  if (typeof categoria === 'object') {
    return Number(categoria.id);
  }

  const id = Number(categoria);

  return Number.isFinite(id) ? id : null;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function InicioEstoque() {
  // Estados dos produtos e categorias
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Categoria escolhida no filtro
  const [
    categoriaSelecionada,
    setCategoriaSelecionada,
  ] = useState('todas');

  // Estados de carregamento e erro
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Permite atualizar os dados manualmente
  const [recarregar, setRecarregar] = useState(0);

  // ==========================================
  // CARREGAR PRODUTOS E CATEGORIAS
  // ==========================================

  const carregarDados = useCallback(
    async (signal?: AbortSignal) => {
      setCarregando(true);
      setErro('');

      try {
        const [
          listaProdutos,
          listaCategorias,
        ] = await Promise.all([
          buscarListaCompleta<Produto>(
            '/api/produtos/',
            signal
          ),
          buscarListaCompleta<Categoria>(
            '/api/categorias/',
            signal
          ),
        ]);

        if (signal?.aborted) {
          return;
        }

        setProdutos(listaProdutos);
        setCategorias(listaCategorias);
      } catch (error) {
        if (signal?.aborted) {
          return;
        }

        console.error(
          'Erro ao carregar estoque:',
          error
        );

        if (
          error instanceof TypeError &&
          error.message.includes('fetch')
        ) {
          setErro(
            'Não foi possível conectar à API do Django. Verifique a conexão com o Render e a configuração de CORS.'
          );
        } else {
          setErro(
            error instanceof Error
              ? error.message
              : 'Erro inesperado ao carregar o estoque.'
          );
        }
      } finally {
        if (!signal?.aborted) {
          setCarregando(false);
        }
      }
    },
    []
  );

  // Carregamento inicial e atualizações
  useEffect(() => {
    const controller = new AbortController();

    void carregarDados(controller.signal);

    return () => controller.abort();
  }, [carregarDados, recarregar]);

  // ==========================================
  // FILTRO POR CATEGORIA
  // ==========================================

  const produtosFiltrados = produtos.filter(
    (item) => {
      if (categoriaSelecionada === 'todas') {
        return true;
      }

      return (
        obterCategoriaId(item) ===
        Number(categoriaSelecionada)
      );
    }
  );

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div className="p-4 md:p-8 space-y-8">

      {/* BOAS-VINDAS */}
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl px-6 py-12 md:p-20 text-center">

        <h3 className="text-2xl font-bold text-[#0a1f3e] mb-4">
          Bem-vindo ao Painel de Estoque
        </h3>

        <p className="text-gray-500 max-w-md mx-auto">
          Utilize as abas superiores para navegar
          entre as funções de cadastro, movimentação
          de entrada/saída e montagem de kits.
        </p>

      </div>

      {/* CONTAINER PRINCIPAL */}
      <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">

        {/* CABEÇALHO E FILTROS */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">

          <div>
            <h3 className="text-lg font-bold text-[#0a1f3e]">
              Materiais em Estoque
            </h3>

            <p className="text-sm text-gray-500">
              Consulte os produtos cadastrados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <label
              htmlFor="categoria"
              className="text-sm font-medium text-gray-700"
            >
              Categoria:
            </label>

            <select
              id="categoria"
              value={categoriaSelecionada}
              onChange={(e) =>
                setCategoriaSelecionada(
                  e.target.value
                )
              }
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#0a1f3e] focus:border-[#0a1f3e] max-w-full"
            >
              <option value="todas">
                Todas as categorias
              </option>

              {categorias.map((categoria) => (
                <option
                  key={categoria.id}
                  value={categoria.id}
                >
                  {categoria.nome}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                setRecarregar(
                  (valor) => valor + 1
                )
              }
              disabled={carregando}
              className="bg-[#0a1f3e] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#15305c] disabled:opacity-50"
            >
              {carregando
                ? 'Carregando...'
                : 'Atualizar'}
            </button>

          </div>
        </div>

        {/* TABELA DE PRODUTOS */}
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">

            {/* CABEÇALHO DA TABELA */}
            <div className="bg-slate-50 grid grid-cols-3 gap-4 p-4 border-b border-gray-200">

              <div className="text-center font-semibold text-slate-700">
                Nome do Material
              </div>

              <div className="text-center font-semibold text-slate-700">
                Valor Unitário
              </div>

              <div className="text-center font-semibold text-slate-700">
                Quantidade em Estoque
              </div>

            </div>

            {/* LISTAGEM */}
            <div className="divide-y divide-gray-100">

              {carregando ? (

                <div className="p-8 text-center text-gray-500">
                  Carregando materiais...
                </div>

              ) : erro ? (

                <div
                  className="p-8 text-center text-red-600"
                  role="alert"
                >
                  {erro}
                </div>

              ) : produtosFiltrados.length > 0 ? (

                produtosFiltrados.map((item) => {
                  const estoque = Number(
                    item.estoque_atual ?? 0
                  );

                  const minimo = Number(
                    item.quantidade_minima ?? 0
                  );

                  const estoqueBaixo =
                    estoque <= minimo;

                  const preco = Number(
                    item.preco_custo ?? 0
                  );

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-3 gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
                    >

                      {/* NOME DO PRODUTO */}
                      <div className="text-center text-gray-800 font-medium">
                        {item.nome}
                      </div>

                      {/* PREÇO */}
                      <div className="text-center text-gray-600">
                        {formatadorMoeda.format(
                          Number.isFinite(preco)
                            ? preco
                            : 0
                        )}
                      </div>

                      {/* QUANTIDADE */}
                      <div className="text-center">

                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            estoqueBaixo
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {Number.isFinite(estoque)
                            ? estoque.toLocaleString(
                                'pt-BR'
                              )
                            : '0'}{' '}
                          {item.unidade || 'UN'}
                        </span>

                      </div>

                    </div>
                  );
                })

              ) : (

                <div className="p-8 text-center text-gray-500">
                  {categoriaSelecionada === 'todas'
                    ? 'Nenhum material registrado ainda.'
                    : 'Nenhum material encontrado nesta categoria.'}
                </div>

              )}

            </div>

          </div>
        </div>

        {/* RODAPÉ */}
        {!carregando && !erro && (
          <div className="p-4 border-t border-gray-200 text-sm text-gray-500">
            Exibindo {produtosFiltrados.length} de{' '}
            {produtos.length} materiais.
          </div>
        )}

      </div>
    </div>
  );
}
