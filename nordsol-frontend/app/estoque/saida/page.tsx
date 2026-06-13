"use client";

import React, { useState, useEffect } from 'react';

// ----------------------------------------------------------------------
// 0. INTERFACES
// ----------------------------------------------------------------------
interface ProdutoDB {
  id: number | string;
  nome: string;
  preco_custo: number | string;
}

interface ItemKitDB {
  produto?: number | string;
  produto_id?: number | string;
  quantidade?: number;
  quantidade_padrao?: number;
  qtd?: number;
}

interface KitDB {
  id: number | string;
  nome_kit?: string;
  itens?: ItemKitDB[];
  produtos?: ItemKitDB[];
  itens_kit?: ItemKitDB[];
}

interface ItemOS {
  id?: number;
  produto: number | string;
  produto_nome: string;
  quantidade_saida: number | string;
}

interface OrdemServico {
  id: number;
  numero_os: string;
  cliente?: string;
  data_programada: string;
  tecnico_responsavel?: string;
  cidade?: string;
  kwh?: string | number;
  status: string;
  valor_total?: string | number;
  itens?: ItemOS[];
}

export default function SaidaProdutos() {
  // ----------------------------------------------------------------------
  // 1. ESTADOS GERAIS
  // ----------------------------------------------------------------------
  const [listaOS, setListaOS] = useState<OrdemServico[]>([]);
  const [produtosDB, setProdutosDB] = useState<ProdutoDB[]>([]);
  const [kitsDB, setKitsDB] = useState<KitDB[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroOS, setFiltroOS] = useState('');

  // ----------------------------------------------------------------------
  // 2. ESTADOS DO MODAL DE REGISTRO
  // ----------------------------------------------------------------------
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [kitSelecionado, setKitSelecionado] = useState('');
  const [quantidadeKit, setQuantidadeKit] = useState('');
  const [observacao, setObservacao] = useState(''); 
  const [itensSaida, setItensSaida] = useState<{ id: number; produto_id: string; nome: string; qtd: string }[]>([]);

  const [osSelecionada, setOsSelecionada] = useState('');
  const [criarNovaOS, setCriarNovaOS] = useState(false);
  
  // Novos campos da O.S
  const [novaOsNumero, setNovaOsNumero] = useState('');
  const [novaOsCliente, setNovaOsCliente] = useState('');
  const [novaOsTecnico, setNovaOsTecnico] = useState('');
  const [novaOsCidade, setNovaOsCidade] = useState('');
  const [novaOsKwh, setNovaOsKwh] = useState('');

  // ----------------------------------------------------------------------
  // 3. ESTADOS DO MODAL DE DETALHES (Olhinho)
  // ----------------------------------------------------------------------
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [osDetalhe, setOsDetalhe] = useState<OrdemServico | null>(null);

  // ----------------------------------------------------------------------
  // 4. INTEGRAÇÃO (FETCH)
  // ----------------------------------------------------------------------
  useEffect(() => {
    buscarDadosDoBackend();
    buscarProdutosDoBackend();
    buscarKitsDoBackend();
  }, []);

  const buscarDadosDoBackend = async () => {
    try {
      setCarregando(true);
      const response = await fetch('http://localhost:8000/api/ordens-servico/');
      const data = await response.json();
      setListaOS(data.results ? data.results : data);
    } catch (error) {
      console.error("Erro ao buscar ordens de serviço:", error);
    } finally {
      setCarregando(false);
    }
  };

  const buscarProdutosDoBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/produtos/');
      const data = await response.json();
      setProdutosDB(data.results ? data.results : data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  };

  const buscarKitsDoBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/kits/');
      if (response.ok) {
        const data = await response.json();
        setKitsDB(data.results ? data.results : data);
      }
    } catch (error) {
      console.error("Erro ao buscar kits:", error);
    }
  };

  // ----------------------------------------------------------------------
  // 5. LÓGICA DE REGISTRO (CRIAR O.S E ITENS - SEM ABATER ESTOQUE)
  // ----------------------------------------------------------------------
  const handleAdicionarItem = () => {
    if (produtoSelecionado && quantidade && Number(quantidade) > 0) {
      const produtoEncontrado = produtosDB.find(p => p.id.toString() === produtoSelecionado);
      setItensSaida([
        ...itensSaida,
        { 
          id: Date.now(), 
          produto_id: produtoSelecionado, 
          nome: produtoEncontrado ? produtoEncontrado.nome : "Produto Não Identificado", 
          qtd: quantidade 
        }
      ]);
      setProdutoSelecionado('');
      setQuantidade('');
    } else {
      alert("Selecione um produto e informe uma quantidade maior que zero.");
    }
  };

  const handleAdicionarKit = () => {
    if (kitSelecionado && quantidadeKit && Number(quantidadeKit) > 0) {
      const kit = kitsDB.find(k => k.id.toString() === kitSelecionado);
      if (!kit) return;

      const listaDeItensDoKit = kit.itens || kit.produtos || kit.itens_kit || [];
      if (listaDeItensDoKit.length === 0) {
        alert("Este kit está vazio.");
        return;
      }

      const multiplicadorKit = Number(quantidadeKit);
      const novosItens = listaDeItensDoKit.map((itemKit: ItemKitDB, index: number) => {
        const idDoProduto = itemKit.produto || itemKit.produto_id;
        const qtdDoProduto = itemKit.quantidade || itemKit.quantidade_padrao || itemKit.qtd || 1;
        const prodDB = produtosDB.find(p => p.id?.toString() === idDoProduto?.toString());
        
        return {
          id: Date.now() + index, 
          produto_id: idDoProduto?.toString() || "",
          nome: `${prodDB ? prodDB.nome : 'Produto'} (Kit: ${kit.nome_kit || 'Padrão'})`, 
          qtd: (Number(qtdDoProduto) * multiplicadorKit).toString()
        };
      });

      setItensSaida([...itensSaida, ...novosItens]);
      setKitSelecionado('');
      setQuantidadeKit('');
    } else {
      alert("Selecione um Kit e a quantidade.");
    }
  };

  const handleRemoverItem = (id: number) => {
    setItensSaida(itensSaida.filter(item => item.id !== id));
  };

  // Função para editar a quantidade na tabela
  const handleEditarQuantidadeItem = (id: number, novaQtd: string) => {
    setItensSaida(itensAtuais => 
      itensAtuais.map(item => 
        item.id === id ? { ...item, qtd: novaQtd } : item
      )
    );
  };

  const handleConfirmarSaida = async () => {
    if (itensSaida.length === 0) {
      alert("Adicione pelo menos um produto à lista antes de confirmar.");
      return;
    }

    try {
      let osIdFinal = osSelecionada ? parseInt(osSelecionada) : null;

      // 1. Cria a O.S se o usuário optou por criar
      if (criarNovaOS) {
        if (!novaOsNumero) return alert("Informe o número da nova O.S.");
        const hoje = new Date().toISOString().split('T')[0];
        
        const resOS = await fetch('http://localhost:8000/api/ordens-servico/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero_os: novaOsNumero,
            cliente: novaOsCliente || "Não informado",
            tecnico_responsavel: novaOsTecnico || "Não Atribuído",
            cidade: novaOsCidade || "",
            kwh: novaOsKwh || "",
            status: "PENDENTE",
            data_programada: hoje
          })
        });

        if (!resOS.ok) throw new Error("Falha ao criar a O.S.");
        const osCriada = await resOS.json();
        osIdFinal = osCriada.id; 
      }

      if (!osIdFinal) {
        throw new Error("É necessário vincular a uma O.S. para salvar os itens de orçamento.");
      }

      // 2. Registra na tabela ItemOS (Apenas vincula, não abate estoque ainda)
      const promessasItensOS = itensSaida.map(item => {
        return fetch('http://localhost:8000/api/itens-os/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            os: osIdFinal,
            produto: item.produto_id,
            quantidade_saida: Number(item.qtd)
          })
        });
      });

      await Promise.all(promessasItensOS);

      alert("Itens vinculados à O.S. com sucesso! O estoque AINDA NÃO FOI ABATIDO.");
      
      setModalAberto(false);
      setOsSelecionada('');
      setCriarNovaOS(false);
      setNovaOsNumero('');
      setNovaOsCliente('');
      setNovaOsTecnico('');
      setNovaOsCidade('');
      setNovaOsKwh('');
      setObservacao('');
      setItensSaida([]);
      
      buscarDadosDoBackend(); 
    } catch (error: unknown) {
      console.error("Erro ao registrar:", error);
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      alert(`Houve um erro:\n${msg}`);
    }
  };

  // ----------------------------------------------------------------------
  // 6. LÓGICA DO MODAL DE DETALHES (ABATER ESTOQUE, FINALIZAR APENAS TEXTO E CANCELAR)
  // ----------------------------------------------------------------------
  const abrirModalDetalhes = (os: OrdemServico) => {
    setOsDetalhe(os);
    setModalDetalhesAberto(true);
  };

  const handleAbaterEstoque = async () => {
    if (!osDetalhe || !osDetalhe.itens || osDetalhe.itens.length === 0) {
      alert("Não há itens nesta O.S. para abater do estoque.");
      return;
    }

    const confirmar = window.confirm(`ATENÇÃO: Você está prestes a abater definitivamente os itens da O.S ${osDetalhe.numero_os} do estoque físico. Deseja continuar?`);
    if (!confirmar) return;

    try {
      // Atualiza o status da O.S para RUA. O Signal no backend do Django fará o abatimento do estoque.
      const res = await fetch(`http://localhost:8000/api/ordens-servico/${osDetalhe.id}/`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RUA' }) 
      });

      if (!res.ok) {
        const erro = await res.json();
        console.error("Erro da API:", erro);
        throw new Error("Falha ao atualizar o status da OS no servidor.");
      }

      alert("✅ Estoque abatido com sucesso! O material agora está Em Rua.");
      setModalDetalhesAberto(false);
      buscarDadosDoBackend(); // Recarrega a tabela de O.S
    } catch (error) {
      console.error("Erro ao abater estoque:", error);
      alert("Houve um erro de comunicação com o servidor ao tentar abater o estoque.");
    }
  };

  // NOVA FUNÇÃO: Muda apenas o texto/status para FINALIZADA sem mexer no estoque
  const handleFinalizarSemAbater = async () => {
    if (!osDetalhe) return;

    const confirmar = window.confirm(`Deseja alterar o status da O.S ${osDetalhe.numero_os} para FINALIZADA por organização? (Nenhuma alteração será feita no estoque).`);
    if (!confirmar) return;

    try {
      const res = await fetch(`http://localhost:8000/api/ordens-servico/${osDetalhe.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINALIZADA' })
      });

      if (!res.ok) throw new Error("Falha ao atualizar o status no servidor.");

      alert("✅ O.S. alterada para FINALIZADA com sucesso! (Estoque intocado)");
      setModalDetalhesAberto(false);
      buscarDadosDoBackend();
    } catch (error) {
      console.error("Erro ao finalizar OS sem abater:", error);
      alert("Houve um erro ao tentar mudar o status da O.S.");
    }
  };

  const handleCancelarOS = async () => {
    if (!osDetalhe) return;
    
    const confirmar = window.confirm(`Tem certeza que deseja CANCELAR a O.S ${osDetalhe.numero_os}? Esta ação não pode ser desfeita.`);
    if (!confirmar) return;

    try {
      await fetch(`http://localhost:8000/api/ordens-servico/${osDetalhe.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELADA' })
      });

      alert("🚫 O.S. Cancelada com sucesso!");
      setModalDetalhesAberto(false);
      buscarDadosDoBackend();
    } catch (error) {
      console.error("Erro ao cancelar OS:", error);
      alert("Houve um erro ao cancelar a O.S.");
    }
  };

  // ----------------------------------------------------------------------
  // 7. FUNÇÕES AUXILIARES E RENDERIZAÇÃO
  // ----------------------------------------------------------------------
  const obterPrecoProduto = (produtoId: number | string) => {
    const produto = produtosDB.find(p => p.id?.toString() === produtoId?.toString());
    return produto ? Number(produto.preco_custo || 0) : 0;
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return '-';
    const [ano, mes, dia] = dataString.split('-'); 
    if(ano && mes && dia) return `${dia}/${mes}/${ano}`;
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const listaFiltrada = filtroOS 
    ? listaOS.filter(os => os.id.toString() === filtroOS) 
    : listaOS;

  return (
    <div className="w-full font-sans mt-4">
      
      {/* BARRA SUPERIOR */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select 
          className="border border-gray-300 rounded p-2 text-sm text-gray-700 min-w-[250px] focus:outline-none focus:ring-1 focus:ring-[#102A43] bg-white"
          value={filtroOS}
          onChange={(e) => setFiltroOS(e.target.value)}
        >
          <option value="">Todas as Ordens de Serviço</option>
          {listaOS.map((os) => (
            <option key={os.id} value={os.id}>O.S: {os.numero_os} {os.cliente ? `— ${os.cliente}` : ''}</option>
          ))}
        </select>
        
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <input type="text" placeholder="Data Inicial" className="p-2 text-sm outline-none" />
          <div className="bg-[#102A43] p-2 flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
          </div>
        </div>

        <div className="flex border border-gray-300 rounded overflow-hidden">
          <input type="text" placeholder="Data Final" className="p-2 text-sm outline-none" />
          <div className="bg-[#102A43] p-2 flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
          </div>
        </div>

        <button onClick={() => setFiltroOS('')} className="bg-[#102A43] text-white px-6 py-2 rounded text-sm font-medium hover:bg-opacity-90">Limpar</button>

        <button onClick={() => setModalAberto(true)} className="bg-emerald-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 ml-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Criar O.S / Inserir Materiais
        </button>
      </div>

      {/* TABELA PRINCIPAL */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Código da O.S</th>
              <th className="px-6 py-4 font-semibold">Cliente</th>
              <th className="px-6 py-4 font-semibold">Data Programada</th>
              <th className="px-6 py-4 font-semibold">Técnico</th>
              <th className="px-6 py-4 font-semibold text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Valor Total</th>
              <th className="px-6 py-4 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-500">Buscando informações...</td></tr>
            ) : listaFiltrada.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-6 text-gray-500">Nenhum registro encontrado.</td></tr>
            ) : (
              listaFiltrada.map((os) => (
                <tr key={os.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">{os.numero_os}</td>
                  <td className="px-6 py-4 font-medium">{os.cliente || '-'}</td>
                  <td className="px-6 py-4">{formatarData(os.data_programada)}</td>
                  <td className="px-6 py-4 text-xs">{os.tecnico_responsavel || 'Não Atribuído'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white uppercase 
                      ${os.status === 'FINALIZADA' ? 'bg-emerald-500' : 
                        os.status === 'CANCELADA' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                      {os.status === 'RUA' ? 'Em Rua' : os.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-800 text-right">{os.valor_total || 'R$ 0,00'}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => abrirModalDetalhes(os)} className="text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded border border-blue-200">
                      Visualizar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DETALHES */}
      {modalDetalhesAberto && osDetalhe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-4 border-b shrink-0 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                Detalhes da O.S {osDetalhe.numero_os}
                <span className={`px-2 py-0.5 rounded text-xs text-white uppercase
                  ${osDetalhe.status === 'FINALIZADA' ? 'bg-emerald-500' : 
                    osDetalhe.status === 'CANCELADA' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                  {osDetalhe.status === 'RUA' ? 'Em Rua' : osDetalhe.status}
                </span>
              </h2>
              <button onClick={() => setModalDetalhesAberto(false)} className="text-gray-400 hover:text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* CORPO DO MODAL */}
            <div className="p-4 overflow-y-auto flex-1 max-h-[60vh]">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 border-b sticky top-0 shadow-sm">
                  <tr>
                    <th className="p-3 font-semibold">Produto</th>
                    <th className="p-3 font-semibold text-center">Quantidade</th>
                    <th className="p-3 font-semibold text-right">Valor Unit. R$</th>
                    <th className="p-3 font-semibold text-right">Total R$</th>
                  </tr>
                </thead>
                <tbody>
                  {!osDetalhe.itens || osDetalhe.itens.length === 0 ? (
                    <tr><td colSpan={4} className="text-center p-8 text-gray-500">Nenhum material registrado.</td></tr>
                  ) : (
                    osDetalhe.itens.map((item: ItemOS, idx: number) => {
                      const precoUn = obterPrecoProduto(item.produto);
                      return (
                        <tr key={idx} className="border-b">
                          <td className="p-3 font-semibold">{item.produto_nome}</td>
                          <td className="p-3 text-center font-bold bg-gray-50">{item.quantidade_saida}</td>
                          <td className="p-3 text-right">R$ {precoUn.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold">R$ {(precoUn * Number(item.quantidade_saida)).toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* RODAPÉ DO MODAL DE DETALHES COM AS AÇÕES */}
            <div className="bg-white p-4 border-t flex justify-between shrink-0 items-center gap-4 flex-wrap">
              <div>
                {/* Se a O.S estiver PENDENTE */}
                {osDetalhe.status === 'PENDENTE' && (
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={handleAbaterEstoque} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 shadow flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Confirmar e Abater Estoque
                    </button>
                    <button onClick={handleFinalizarSemAbater} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow">
                      Finalizar (Sem Abater)
                    </button>
                    <button onClick={handleCancelarOS} className="px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded font-bold hover:bg-red-200">
                      Cancelar O.S
                    </button>
                  </div>
                )}

                {/* Se a O.S estiver em RUA, permite finalizar para organização */}
                {osDetalhe.status === 'RUA' && (
                  <div className="flex items-center gap-4 flex-wrap">
                    <p className="text-yellow-600 font-bold text-sm">🚚 Material em Rua (Estoque já abatido).</p>
                    <button onClick={handleFinalizarSemAbater} className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 shadow">
                      Mudar para Finalizada
                    </button>
                  </div>
                )}

                {osDetalhe.status === 'FINALIZADA' && (
                  <p className="text-emerald-600 font-bold text-sm">✅ O.S. Finalizada com Sucesso.</p>
                )}
                 {osDetalhe.status === 'CANCELADA' && (
                  <p className="text-red-600 font-bold text-sm">🚫 O.S. Cancelada.</p>
                )}
              </div>
              
              <button onClick={() => setModalDetalhesAberto(false)} className="px-6 py-2 bg-[#102A43] text-white rounded font-semibold hover:bg-opacity-90 ml-auto">
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAR O.S / INSERIR ITENS */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-4 border-b shrink-0">
              <h2 className="text-xl font-bold text-[#102A43]">Criar O.S / Inserir Materiais</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-gray-800">Vincular a uma Ordem de Serviço</label>
                  <button type="button" onClick={() => setCriarNovaOS(!criarNovaOS)} className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white px-3 py-1 rounded border border-blue-200">
                    {criarNovaOS ? "Voltar para Selecionar Existente" : "+ Cadastrar Nova O.S"}
                  </button>
                </div>

                {criarNovaOS ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input type="text" placeholder="Número da O.S (Ex: 8976)" className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none" value={novaOsNumero} onChange={(e) => setNovaOsNumero(e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <input type="text" placeholder="Nome do Cliente (Opcional)" className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none" value={novaOsCliente} onChange={(e) => setNovaOsCliente(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input type="text" placeholder="Técnico Responsável" className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none" value={novaOsTecnico} onChange={(e) => setNovaOsTecnico(e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <input type="text" placeholder="Cidade" className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none" value={novaOsCidade} onChange={(e) => setNovaOsCidade(e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <input type="text" placeholder="Kwh (Ex: 150)" className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none" value={novaOsKwh} onChange={(e) => setNovaOsKwh(e.target.value)} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <select className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none bg-white" value={osSelecionada} onChange={(e) => setOsSelecionada(e.target.value)}>
                    <option value="">Selecione uma O.S...</option>
                    {listaOS.filter(os => os.status !== 'FINALIZADA' && os.status !== 'CANCELADA').map((os) => (
                      <option key={os.id} value={os.id}>O.S. {os.numero_os} — {os.cliente}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Observação / Justificativa</label>
                <textarea placeholder="Opcional..." className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none min-h-[60px]" value={observacao} onChange={(e) => setObservacao(e.target.value)}></textarea>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex gap-4 items-end bg-gray-50 p-4 border border-gray-200 rounded">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Produto Avulso</label>
                    <select className="w-full border border-gray-300 rounded p-2 text-sm bg-white" value={produtoSelecionado} onChange={(e) => setProdutoSelecionado(e.target.value)}>
                      <option value="">Selecione o material...</option>
                      {produtosDB.map((prod) => (
                        <option key={prod.id} value={prod.id}>{prod.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">Qtd</label>
                    <input type="number" min="0.01" step="0.01" className="w-full border border-gray-300 rounded p-2 text-sm" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                  </div>
                  <button onClick={handleAdicionarItem} className="bg-[#102A43] text-white px-4 py-2 rounded text-sm font-bold">Add +</button>
                </div>

                <div className="flex gap-4 items-end bg-emerald-50 p-4 border border-emerald-200 rounded">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wide">Inserir um Kit</label>
                    <select 
                      className="w-full border border-emerald-300 rounded p-2 text-sm bg-white"
                      value={kitSelecionado} 
                      onChange={(e) => setKitSelecionado(e.target.value)}
                    >
                      <option value="">Selecione um Kit Cadastrado...</option>
                      {kitsDB.map((kit) => (
                        <option key={kit.id} value={kit.id}>
                          {kit.nome_kit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-bold text-emerald-800 mb-1 uppercase tracking-wide">Qtd Kits</label>
                    <input type="number" min="1" step="1" className="w-full border border-emerald-300 rounded p-2 text-sm" value={quantidadeKit} onChange={(e) => setQuantidadeKit(e.target.value)} />
                  </div>
                  <button onClick={handleAdicionarKit} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-bold">Add Kit +</button>
                </div>
              </div>

              <div className="border border-gray-200 rounded mt-2">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="p-2 font-semibold text-gray-700">Produto Vinculado à O.S</th>
                      <th className="p-2 font-semibold text-gray-700 text-center w-28">Qtd</th>
                      <th className="p-2 font-semibold text-gray-700 text-center w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensSaida.length === 0 ? (
                      <tr><td colSpan={3} className="text-center p-6 text-gray-400 italic">Nenhum item adicionado.</td></tr>
                    ) : (
                      itensSaida.map((item) => (
                        <tr key={item.id} className="border-b bg-white">
                          <td className="p-2 font-medium text-gray-800">{item.nome}</td>
                          <td className="p-2 text-center">
                            <input 
                              type="number" 
                              min="0.01" 
                              step="0.01" 
                              className="w-20 border border-gray-300 rounded p-1 text-sm text-center focus:outline-none focus:border-[#102A43] font-bold text-gray-700"
                              value={item.qtd} 
                              onChange={(e) => handleEditarQuantidadeItem(item.id, e.target.value)} 
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => handleRemoverItem(item.id)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Remover</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="p-4 border-t shrink-0 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setModalAberto(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded font-semibold hover:bg-gray-100">
                Cancelar
              </button>
              <button onClick={handleConfirmarSaida} className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow">
                Salvar Orçamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}