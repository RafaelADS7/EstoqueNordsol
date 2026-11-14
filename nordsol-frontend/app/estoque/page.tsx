
'use client';

import { useEffect, useState } from 'react';

interface Categoria {
  id: number;
  nome: string;
}

interface Produto {
  id: number;
  nome: string;
  preco_custo: string | number;
  estoque_atual: string | number;
  quantidade_minima: string | number;
  unidade: string;
  categoria: number | string | {
    id: number;
    nome?: string;
  };
}

export default function InicioEstoque() {

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Carregar produtos e categorias
  useEffect(() => {

    const carregarDados = async () => {

      try {

        setCarregando(true);
        setErro('');

        const [resProdutos, resCategorias] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/produtos/'),
          fetch('http://127.0.0.1:8000/api/categorias/')
        ]);

        if (!resProdutos.ok || !resCategorias.ok) {
          throw new Error('Erro ao buscar produtos ou categorias.');
        }

        const dadosProdutos = await resProdutos.json();
        const dadosCategorias = await resCategorias.json();

        const listaProdutos = Array.isArray(dadosProdutos)
          ? dadosProdutos
          : dadosProdutos.results;

        const listaCategorias = Array.isArray(dadosCategorias)
          ? dadosCategorias
          : dadosCategorias.results;

        if (!Array.isArray(listaProdutos) || !Array.isArray(listaCategorias)) {
          throw new Error('Formato de resposta da API inválido.');
        }

        setProdutos(listaProdutos);
        setCategorias(listaCategorias);

      } catch (error) {

        console.error('Erro ao carregar estoque:', error);

        setErro(
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao carregar o estoque.'
        );

      } finally {

        setCarregando(false);

      }

    };

    carregarDados();

  }, []);

  // Formatar preço
  const formatarPreco = (valor: string | number) => {

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor));

  };

  // Identificar o ID da categoria do produto
  const obterCategoriaId = (produto: Produto) => {

    if (typeof produto.categoria === 'object') {
      return produto.categoria.id;
    }

    return Number(produto.categoria);

  };

  // Filtrar produtos pela categoria selecionada
  const produtosFiltrados = produtos.filter((item) => {

    if (categoriaSelecionada === 'todas') {
      return true;
    }

    return obterCategoriaId(item) === Number(categoriaSelecionada);

  });

  return (

    <div className="p-8">

      {/* Boas-vindas */}

      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-20 text-center mb-8">

        <h3 className="text-2xl font-bold text-[#0a1f3e] mb-4">
          Bem-vindo ao Painel de Estoque
        </h3>

        <p className="text-gray-500 max-w-md mx-auto">
          Utilize as abas superiores para navegar entre as funções de cadastro,
          movimentação de entrada/saída e montagem de kits.
        </p>

      </div>

      {/* Container da tabela */}

      <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">

        {/* Filtro de categorias */}

        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">

          <div>
            <h3 className="text-lg font-bold text-[#0a1f3e]">
              Materiais em Estoque
            </h3>

            <p className="text-sm text-gray-500">
              Consulte os produtos cadastrados.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <label
              htmlFor="categoria"
              className="text-sm font-medium text-gray-700"
            >
              Categoria:
            </label>

            <select
              id="categoria"
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#0a1f3e] focus:border-[#0a1f3e]"
            >

              <option value="todas">
                Todas as categorias
              </option>

              {categorias.map((categoria) => (

                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>

              ))}

            </select>

          </div>

        </div>

        {/* Tabela */}

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

        {/* Lista de produtos */}

        <div className="divide-y divide-gray-100">

          {carregando ? (

            <div className="p-8 text-center text-gray-500">
              Carregando materiais...
            </div>

          ) : erro ? (

            <div className="p-8 text-center text-red-500">
              {erro}
            </div>

          ) : produtosFiltrados.length > 0 ? (

            produtosFiltrados.map((item) => {

              const estoque = Number(item.estoque_atual);
              const minimo = Number(item.quantidade_minima);

              const estoqueBaixo = estoque <= minimo;

              return (

                <div
                  key={item.id}
                  className="grid grid-cols-3 gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
                >

                  {/* Nome */}

                  <div className="text-center text-gray-800 font-medium">
                    {item.nome}
                  </div>

                  {/* Preço */}

                  <div className="text-center text-gray-600">
                    {formatarPreco(item.preco_custo)}
                  </div>

                  {/* Quantidade */}

                  <div className="text-center">

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        estoqueBaixo
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {item.estoque_atual} {item.unidade}
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

        {/* Rodapé */}

        {!carregando && !erro && (

          <div className="p-4 border-t border-gray-200 text-sm text-gray-500">

            Exibindo {produtosFiltrados.length} de {produtos.length} materiais.

          </div>

        )}

      </div>

    </div>

  );

}
