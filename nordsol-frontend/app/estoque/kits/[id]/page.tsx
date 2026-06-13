'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// --- TIPAGENS ---
interface ProdutoDisponivel {
  id: string | number;
  nome: string;
  valor_unitario: number;
  unidade: string;
}

interface ItemKit {
  produto_id: string | number;
  nome: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  total: number;
}

export default function EditarKitPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.id; 

  // --- ESTADOS DA PÁGINA ---
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Formulário do Kit (Ajustado para o seu models.py)
  const [nomeKit, setNomeKit] = useState('');
  const [descricaoKit, setDescricaoKit] = useState('');
  
  // Itens e Produtos
  const [itensDoKit, setItensDoKit] = useState<ItemKit[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<ProdutoDisponivel[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState<number>(1);

  // --- CARREGAR DADOS DO SERVIDOR ---
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        setCarregandoDados(true);

        // 1. Busca produtos (lendo preco_custo do Django)
        const resProdutos = await fetch('http://localhost:8000/api/produtos/');
        if (!resProdutos.ok) throw new Error('Erro ao buscar produtos.');
        const dataProdutos = await resProdutos.json();
        const listaProdutos = dataProdutos.results ? dataProdutos.results : dataProdutos;
        
        const produtosFormatados = listaProdutos.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          valor_unitario: Number(p.preco_custo || 0), 
          unidade: p.unidade || 'UN'
        }));
        setProdutosDisponiveis(produtosFormatados);

        // 2. Busca o Kit Específico
        const resKit = await fetch(`http://localhost:8000/api/kits/${kitId}/`);
        if (!resKit.ok) throw new Error('Erro ao buscar detalhes do kit.');
        const kitData = await resKit.json();

        setNomeKit(kitData.nome_kit || '');
        setDescricaoKit(kitData.descricao || '');
        
        const itensDoBackend = kitData.itens || [];

        // 3. Mapeamento dos itens do Kit
        const itensMapeados = itensDoBackend.map((item: any) => {
          const prodId = item.produto; 

          const produtoOriginal = produtosFormatados.find(
            (p: any) => p.id?.toString() === prodId?.toString()
          );

          // O Django manda a quantidade como "quantidade_padrao"
          const qtd = Number(item.quantidade_padrao || 1);
          
          const valorUnit = produtoOriginal 
            ? produtoOriginal.valor_unitario 
            : Number(item.produto_detalhes?.preco_custo || 0);

          return {
            produto_id: prodId,
            nome: produtoOriginal ? produtoOriginal.nome : (item.produto_detalhes?.nome || 'Produto Desconhecido'),
            quantidade: qtd,
            unidade: produtoOriginal ? produtoOriginal.unidade : (item.produto_detalhes?.unidade || 'UN'),
            valor_unitario: valorUnit,
            total: qtd * valorUnit
          };
        });

        setItensDoKit(itensMapeados);

      } catch (erro) {
        console.error("Erro ao carregar dados do kit:", erro);
        alert("Aviso: Falha na conexão com a API.");
      } finally {
        setCarregandoDados(false);
      }
    };

    if (kitId) carregarDadosIniciais();
  }, [kitId]);

  // --- LÓGICA DE MANIPULAÇÃO DOS ITENS ---
  const handleAdicionarItem = () => {
    if (!produtoSelecionado || quantidadeSelecionada <= 0) {
      alert('Selecione um produto e uma quantidade válida.');
      return;
    }

    const produto = produtosDisponiveis.find(p => p.id.toString() === produtoSelecionado);
    if (!produto) return;

    const itemExistente = itensDoKit.find(i => i.produto_id.toString() === produtoSelecionado);
    
    if (itemExistente) {
      setItensDoKit(itensDoKit.map(item => {
        if (item.produto_id.toString() === produtoSelecionado) {
          const novaQtd = Number(item.quantidade) + Number(quantidadeSelecionada);
          return { ...item, quantidade: novaQtd, total: novaQtd * item.valor_unitario };
        }
        return item;
      }));
    } else {
      setItensDoKit([...itensDoKit, {
        produto_id: produto.id,
        nome: produto.nome,
        quantidade: Number(quantidadeSelecionada),
        unidade: produto.unidade,
        valor_unitario: produto.valor_unitario,
        total: Number(quantidadeSelecionada) * produto.valor_unitario
      }]);
    }

    setProdutoSelecionado('');
    setQuantidadeSelecionada(1);
  };

  const handleRemoverItem = (produto_id: string | number) => {
    setItensDoKit(itensDoKit.filter(item => item.produto_id !== produto_id));
  };

  const calcularValorTotalKit = () => {
    return itensDoKit.reduce((total, item) => total + item.total, 0);
  };

  // --- SUBMIT: SALVAR ALTERAÇÕES ---
  const handleSalvarAlteracoes = async () => {
    if (!nomeKit || itensDoKit.length === 0) {
      alert('O kit precisa de um nome e de pelo menos um produto adicionado.');
      return;
    }

    // Payload estruturado exatamente como o Django KitModeloSerializer espera
    const payload = {
      nome_kit: nomeKit,
      descricao: descricaoKit,
      itens: itensDoKit.map(item => ({
        produto: item.produto_id,
        quantidade_padrao: item.quantidade // Backend chama de quantidade_padrao
      }))
    };

    try {
      setSalvando(true);
      
      const response = await fetch(`http://localhost:8000/api/kits/${kitId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Erro ao atualizar kit no servidor.');

      alert('Kit atualizado com sucesso!');
      router.push('/estoque/kits'); 
    } catch (erro) {
      console.error("Erro ao salvar alterações:", erro);
      alert("Aviso: Houve um problema ao comunicar com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (carregandoDados) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium mt-20">
        Carregando informações do Kit #{kitId}...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <Link href="/estoque/kits" className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-1">
            ← Voltar para listagem
          </Link>
          <h1 className="text-2xl font-bold text-[#0a1f3e]">Editar Kit Modelo</h1>
        </div>
        <button 
          onClick={handleSalvarAlteracoes}
          disabled={salvando}
          className="bg-green-600 text-white px-6 py-2.5 rounded text-sm font-bold hover:bg-green-700 transition shadow-sm disabled:bg-gray-400"
        >
          {salvando ? 'A guardar...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* DADOS BÁSICOS DO FORMULÁRIO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-md border border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Kit *</label>
          <input 
            type="text" 
            value={nomeKit}
            onChange={(e) => setNomeKit(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
          <input 
            type="text" 
            value={descricaoKit}
            placeholder="Ex: Kit Fixo ou Kit Ligação Aérea"
            onChange={(e) => setDescricaoKit(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"
          />
        </div>
      </div>

      {/* COMPOSIÇÃO DOS PRODUTOS DO KIT */}
      <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-md font-bold text-gray-800 border-b pb-2">Composição Atual dos Itens</h3>
        
        {/* Adicionar novos itens dentro do Kit */}
        <div className="flex gap-4 items-end bg-gray-50 p-4 rounded border border-gray-100">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Incluir Novo Produto</label>
            <select 
              value={produtoSelecionado}
              onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"
            >
              <option value="">Selecione para adicionar...</option>
              {produtosDisponiveis.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {formatarMoeda(p.valor_unitario)} / {p.unidade}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Quantidade</label>
            <input 
              type="number" 
              min="1"
              value={quantidadeSelecionada}
              onChange={(e) => setQuantidadeSelecionada(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a1f3e]"
            />
          </div>
          <button 
            onClick={handleAdicionarItem}
            className="bg-green-600 text-white px-5 py-2 rounded-md font-semibold text-sm hover:bg-green-700 transition"
          >
            Adicionar
          </button>
        </div>

        {/* Tabela de Produtos que pertencem a esse Kit */}
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4 text-center">Quantidade</th>
                <th className="py-3 px-4 text-right">Valor Unitário</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itensDoKit.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">Este kit não possui nenhum produto na sua composição. Adicione acima!</td>
                </tr>
              ) : (
                itensDoKit.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-semibold text-gray-800">{item.nome}</td>
                    <td className="py-3 px-4 text-center text-gray-700">{item.quantidade} {item.unidade}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatarMoeda(item.valor_unitario)}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800">{formatarMoeda(item.total)}</td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => handleRemoverItem(item.produto_id)}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1 text-sm"
                        title="Remover produto do kit"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Totalizador inferior */}
        <div className="flex justify-end pt-2">
          <div className="bg-gray-50 px-6 py-4 rounded-md border border-gray-200 flex items-center gap-6">
            <span className="text-gray-600 text-sm font-semibold">Custo Total do Kit:</span>
            <span className="text-xl font-bold text-[#0a1f3e]">{formatarMoeda(calcularValorTotalKit())}</span>
          </div>
        </div>

      </div>

    </div>
  );
}