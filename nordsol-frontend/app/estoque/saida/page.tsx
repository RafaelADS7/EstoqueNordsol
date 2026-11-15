'use client';

import { useCallback, useEffect, useState } from 'react';

const API = `${(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api`;

type ID = number | string;
interface Produto { id: ID; nome: string; preco_custo: number | string; }
interface ItemKit { produto: ID; quantidade_padrao: number | string; }
interface Kit { id: ID; nome_kit: string; itens: ItemKit[]; }
interface ItemOS { id: ID; produto: ID; produto_nome: string; quantidade_saida: number | string; }
interface OrdemServico {
  id: ID; numero_os: string; cliente?: string; data_programada: string;
  tecnico_responsavel?: string; status: string; valor_total?: number | string;
  itens?: ItemOS[];
}
interface ItemPendente { id: number; produto_id: string; nome: string; qtd: string; }

async function requisitar<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, opcoes);
  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`HTTP ${resposta.status}: ${detalhe.slice(0, 350)}`);
  }
  return resposta.json() as Promise<T>;
}
function extrairLista<T>(dados: T[] | { results: T[] }): T[] {
  const lista = Array.isArray(dados) ? dados : dados.results;
  if (!Array.isArray(lista)) throw new Error('A API não retornou uma lista válida.');
  return lista;
}
const corpoJSON = (dados: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
});
const moeda = (valor: number | string) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hojeLocal = () => {
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
};

export default function SaidaProdutos() {
  const [listaOS, setListaOS] = useState<OrdemServico[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroOS, setFiltroOS] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [osDetalhe, setOsDetalhe] = useState<OrdemServico | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [kitSelecionado, setKitSelecionado] = useState('');
  const [quantidadeKit, setQuantidadeKit] = useState('');
  const [itensSaida, setItensSaida] = useState<ItemPendente[]>([]);
  const [osSelecionada, setOsSelecionada] = useState('');
  const [criarNovaOS, setCriarNovaOS] = useState(false);
  const [novaOsNumero, setNovaOsNumero] = useState('');
  const [novaOsCliente, setNovaOsCliente] = useState('');
  const [novaOsTecnico, setNovaOsTecnico] = useState('');
  const [novaOsCidade, setNovaOsCidade] = useState('');
  const [novaOsKwh, setNovaOsKwh] = useState('');
  const [observacao, setObservacao] = useState('');

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [os, prods, kitsData] = await Promise.all([
        requisitar<OrdemServico[] | { results: OrdemServico[] }>('/ordens-servico/'),
        requisitar<Produto[] | { results: Produto[] }>('/produtos/'),
        requisitar<Kit[] | { results: Kit[] }>('/kits/'),
      ]);
      setListaOS(extrairLista(os));
      setProdutos(extrairLista(prods));
      setKits(extrairLista(kitsData));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar dados.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregarDados(); }, [carregarDados]);

  const adicionarItem = () => {
    const produto = produtos.find(p => String(p.id) === produtoSelecionado);
    const qtd = Number(quantidade);
    if (!produto || !Number.isFinite(qtd) || qtd <= 0) return alert('Selecione um produto e uma quantidade válida.');
    setItensSaida(atuais => [...atuais, { id: Date.now() + Math.random(), produto_id: String(produto.id), nome: produto.nome, qtd: String(qtd) }]);
    setProdutoSelecionado(''); setQuantidade('');
  };

  const adicionarKit = () => {
    const kit = kits.find(k => String(k.id) === kitSelecionado);
    const multiplicador = Number(quantidadeKit);
    if (!kit || !Number.isInteger(multiplicador) || multiplicador <= 0) return alert('Selecione um kit e uma quantidade inteira válida.');
    if (!kit.itens?.length) return alert('Este kit está vazio.');
    const novos: ItemPendente[] = [];
    for (const item of kit.itens) {
      const qtd = Number(item.quantidade_padrao) * multiplicador;
      const produto = produtos.find(p => String(p.id) === String(item.produto));
      if (!produto || !Number.isFinite(qtd) || qtd <= 0) return alert('O kit contém um produto ou quantidade inválida.');
      novos.push({ id: Date.now() + Math.random(), produto_id: String(produto.id), nome: `${produto.nome} (Kit: ${kit.nome_kit})`, qtd: String(qtd) });
    }
    setItensSaida(atuais => [...atuais, ...novos]);
    setKitSelecionado(''); setQuantidadeKit('');
  };

  const limparFormulario = () => {
    setItensSaida([]); setOsSelecionada(''); setCriarNovaOS(false);
    setNovaOsNumero(''); setNovaOsCliente(''); setNovaOsTecnico('');
    setNovaOsCidade(''); setNovaOsKwh(''); setObservacao('');
    setProdutoSelecionado(''); setQuantidade(''); setKitSelecionado(''); setQuantidadeKit('');
  };

  const confirmarSaida = async () => {
    if (salvando) return;
    if (!itensSaida.length) return alert('Adicione pelo menos um produto.');
    if (itensSaida.some(item => !item.produto_id || !Number.isFinite(Number(item.qtd)) || Number(item.qtd) <= 0)) {
      return alert('Revise as quantidades: todas precisam ser maiores que zero.');
    }
    if (!criarNovaOS && !osSelecionada) return alert('Selecione uma O.S. ou crie uma nova.');
    if (!criarNovaOS) {
      const os = listaOS.find(o => String(o.id) === osSelecionada);
      if (!os || os.status !== 'PENDENTE') return alert('Só é possível incluir itens em uma O.S. pendente.');
    }
    if (criarNovaOS && !novaOsNumero.trim()) return alert('Informe o número da nova O.S.');
    setSalvando(true);
    let osId: ID | null = criarNovaOS ? null : osSelecionada;
    let enviados = 0;
    try {
      if (criarNovaOS) {
        // O serializer informado não expõe cidade, kwh nem observação; não os enviamos.
        const nova = await requisitar<OrdemServico>('/ordens-servico/', corpoJSON({
          numero_os: novaOsNumero.trim(), cliente: novaOsCliente.trim() || 'Não informado',
          tecnico_responsavel: novaOsTecnico.trim() || 'Não Atribuído',
          status: 'PENDENTE', data_programada: hojeLocal(),
        }));
        osId = nova.id;
      }
      for (const item of itensSaida) {
        await requisitar('/itens-os/', corpoJSON({
          os: osId, produto: item.produto_id, quantidade_saida: Number(item.qtd),
        }));
        enviados++;
      }
      alert('Materiais vinculados à O.S. O estoque ainda não foi abatido.');
      limparFormulario(); setModalAberto(false);
      await carregarDados();
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : 'Erro desconhecido';
      alert(`Falha ao salvar. ${enviados} de ${itensSaida.length} itens foram confirmados. A O.S. pode ter sido criada parcialmente. Confira antes de tentar novamente.\n${mensagem}`);
      await carregarDados();
    } finally { setSalvando(false); }
  };

  const alterarStatus = async (status: 'RUA' | 'FINALIZADA' | 'CANCELADA') => {
    if (!osDetalhe || salvando) return;
    const texto = status === 'RUA'
      ? 'Confirma a saída dos materiais? O abatimento depende da lógica implementada no Django.'
      : status === 'FINALIZADA' ? 'Alterar a O.S. para FINALIZADA?' : 'Cancelar esta O.S.?';
    if (!window.confirm(texto)) return;
    setSalvando(true);
    try {
      const atualizada = await requisitar<OrdemServico>(`/ordens-servico/${osDetalhe.id}/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      alert(`Status atualizado para ${atualizada.status}. ${status === 'RUA' ? 'Confira o estoque para confirmar o abatimento.' : ''}`);
      setModalDetalhesAberto(false); setOsDetalhe(null);
      await carregarDados();
    } catch (e) { alert(e instanceof Error ? e.message : 'Falha ao alterar status.'); }
    finally { setSalvando(false); }
  };

  const preco = (id: ID) => Number(produtos.find(p => String(p.id) === String(id))?.preco_custo ?? 0);
  const filtradas = listaOS.filter(os =>
    (!filtroOS || String(os.id) === filtroOS) &&
    (!filtroStatus || os.status === filtroStatus) &&
    (!dataInicial || os.data_programada.slice(0, 10) >= dataInicial) &&
    (!dataFinal || os.data_programada.slice(0, 10) <= dataFinal)
  );
  const campo = 'w-full rounded border border-gray-300 bg-white p-2 text-sm';
  const botao = 'rounded bg-[#102A43] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

  return (
    <div className="w-full space-y-5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={campo + ' max-w-xs'} value={filtroOS} onChange={e => setFiltroOS(e.target.value)}>
          <option value="">Todas as Ordens de Serviço</option>
          {listaOS.map(os => <option key={os.id} value={os.id}>O.S. {os.numero_os} — {os.cliente}</option>)}
        </select>
        <select className={campo + ' max-w-44'} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {['PENDENTE', 'RUA', 'FINALIZADA', 'CANCELADA'].map(s => <option key={s} value={s}>{s === 'RUA' ? 'Em Rua' : s}</option>)}
        </select>
        <input aria-label="Data inicial" type="date" className={campo + ' max-w-44'} value={dataInicial} onChange={e => setDataInicial(e.target.value)} />
        <input aria-label="Data final" type="date" className={campo + ' max-w-44'} value={dataFinal} onChange={e => setDataFinal(e.target.value)} />
        <button className={botao} onClick={() => { setFiltroOS(''); setFiltroStatus(''); setDataInicial(''); setDataFinal(''); }}>Limpar</button>
        <button className={botao} onClick={() => void carregarDados()}>Atualizar</button>
        <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => { limparFormulario(); setModalAberto(true); }}>+ Criar O.S. / Inserir Materiais</button>
      </div>
      {erro && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{erro}</p>}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100"><tr>{['Código da O.S.', 'Cliente', 'Data programada', 'Técnico', 'Status', 'Valor total', 'Ações'].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead>
          <tbody>
            {carregando ? <tr><td colSpan={7} className="p-6 text-center">Carregando...</td></tr> : filtradas.length === 0 ? <tr><td colSpan={7} className="p-6 text-center">Nenhuma O.S. encontrada.</td></tr> : filtradas.map(os => (
              <tr key={os.id} className="border-t">
                <td className="p-3 font-semibold">{os.numero_os}</td><td className="p-3">{os.cliente || '—'}</td>
                <td className="p-3">{os.data_programada?.slice(0, 10).split('-').reverse().join('/')}</td>
                <td className="p-3">{os.tecnico_responsavel || '—'}</td><td className="p-3">{os.status === 'RUA' ? 'Em Rua' : os.status}</td>
                <td className="p-3">{moeda(os.valor_total ?? 0)}</td>
                <td className="p-3"><button className="font-semibold text-blue-600" onClick={() => { setOsDetalhe(os); setModalDetalhesAberto(true); }}>Visualizar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
          <div className="flex justify-between border-b p-4"><h2 className="text-lg font-bold">Criar O.S. / Inserir Materiais</h2><button disabled={salvando} onClick={() => setModalAberto(false)}>✕</button></div>
          <div className="space-y-4 overflow-y-auto p-5">
            <div className="rounded bg-blue-50 p-4">
              <div className="mb-3 flex justify-between gap-3"><strong>Vincular a uma Ordem de Serviço</strong><button className="text-sm text-blue-700" onClick={() => setCriarNovaOS(v => !v)}>{criarNovaOS ? 'Selecionar existente' : '+ Cadastrar nova O.S.'}</button></div>
              {criarNovaOS ? <div className="grid gap-2 sm:grid-cols-2">
                <input className={campo} placeholder="Número da O.S." value={novaOsNumero} onChange={e => setNovaOsNumero(e.target.value)} />
                <input className={campo} placeholder="Cliente" value={novaOsCliente} onChange={e => setNovaOsCliente(e.target.value)} />
                <input className={campo} placeholder="Técnico responsável" value={novaOsTecnico} onChange={e => setNovaOsTecnico(e.target.value)} />
                <input className={campo} placeholder="Cidade (não enviada pela API atual)" value={novaOsCidade} onChange={e => setNovaOsCidade(e.target.value)} />
                <input className={campo} placeholder="kWh (não enviado pela API atual)" value={novaOsKwh} onChange={e => setNovaOsKwh(e.target.value)} />
              </div> : <select className={campo} value={osSelecionada} onChange={e => setOsSelecionada(e.target.value)}><option value="">Selecione uma O.S. pendente</option>{listaOS.filter(os => os.status === 'PENDENTE').map(os => <option key={os.id} value={os.id}>O.S. {os.numero_os} — {os.cliente}</option>)}</select>}
            </div>
            <div><label className="mb-1 block text-sm font-semibold">Observação / justificativa (não enviada pela API atual)</label><textarea className={campo} value={observacao} onChange={e => setObservacao(e.target.value)} /></div>
            <div className="flex flex-wrap items-end gap-3 rounded border p-3">
              <div className="min-w-48 flex-1"><label className="text-xs font-semibold">Produto avulso</label><select className={campo} value={produtoSelecionado} onChange={e => setProdutoSelecionado(e.target.value)}><option value="">Selecione...</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
              <div className="w-24"><label className="text-xs font-semibold">Qtd.</label><input className={campo} type="number" min="0.01" step="0.01" value={quantidade} onChange={e => setQuantidade(e.target.value)} /></div>
              <button className={botao} onClick={adicionarItem}>Add +</button>
            </div>
            <div className="flex flex-wrap items-end gap-3 rounded border border-emerald-200 bg-emerald-50 p-3">
              <div className="min-w-48 flex-1"><label className="text-xs font-semibold">Kit</label><select className={campo} value={kitSelecionado} onChange={e => setKitSelecionado(e.target.value)}><option value="">Selecione...</option>{kits.map(k => <option key={k.id} value={k.id}>{k.nome_kit}</option>)}</select></div>
              <div className="w-24"><label className="text-xs font-semibold">Qtd. kits</label><input className={campo} type="number" min="1" step="1" value={quantidadeKit} onChange={e => setQuantidadeKit(e.target.value)} /></div>
              <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={adicionarKit}>Add Kit +</button>
            </div>
            <div className="overflow-x-auto rounded border"><table className="w-full text-sm"><thead className="bg-gray-100"><tr><th className="p-2 text-left">Produto</th><th className="p-2">Quantidade</th><th className="p-2">Ação</th></tr></thead><tbody>{itensSaida.length === 0 ? <tr><td colSpan={3} className="p-4 text-center">Nenhum item adicionado.</td></tr> : itensSaida.map(item => <tr key={item.id} className="border-t"><td className="p-2">{item.nome}</td><td className="p-2 text-center"><input className="w-24 rounded border p-1 text-center" type="number" min="0.01" step="0.01" value={item.qtd} onChange={e => setItensSaida(atuais => atuais.map(i => i.id === item.id ? { ...i, qtd: e.target.value } : i))} /></td><td className="p-2 text-center"><button className="text-red-600" onClick={() => setItensSaida(atuais => atuais.filter(i => i.id !== item.id))}>Remover</button></td></tr>)}</tbody></table></div>
          </div>
          <div className="flex justify-end gap-3 border-t p-4"><button disabled={salvando} onClick={() => setModalAberto(false)}>Cancelar</button><button disabled={salvando} className={botao} onClick={() => void confirmarSaida()}>{salvando ? 'Salvando...' : 'Salvar Orçamento'}</button></div>
        </div>
      </div>}

      {modalDetalhesAberto && osDetalhe && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
          <div className="flex justify-between border-b p-4"><h2 className="text-lg font-bold">Detalhes da O.S. {osDetalhe.numero_os} — {osDetalhe.status}</h2><button onClick={() => setModalDetalhesAberto(false)}>✕</button></div>
          <div className="overflow-y-auto p-4"><table className="w-full text-sm"><thead className="bg-gray-100"><tr><th className="p-2 text-left">Produto</th><th className="p-2">Qtd.</th><th className="p-2">Unitário</th><th className="p-2">Total</th></tr></thead><tbody>{!osDetalhe.itens?.length ? <tr><td colSpan={4} className="p-5 text-center">Nenhum material registrado.</td></tr> : osDetalhe.itens.map(item => <tr key={item.id} className="border-t"><td className="p-2">{item.produto_nome}</td><td className="p-2 text-center">{item.quantidade_saida}</td><td className="p-2 text-center">{moeda(preco(item.produto))}</td><td className="p-2 text-center">{moeda(preco(item.produto) * Number(item.quantidade_saida))}</td></tr>)}</tbody></table></div>
          <div className="flex flex-wrap justify-between gap-3 border-t p-4">
            <div className="flex flex-wrap gap-2">{osDetalhe.status === 'PENDENTE' && <><button disabled={salvando} className="rounded bg-emerald-600 px-3 py-2 text-white disabled:opacity-50" onClick={() => void alterarStatus('RUA')}>Confirmar saída (RUA)</button><button disabled={salvando} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50" onClick={() => void alterarStatus('FINALIZADA')}>Finalizar sem abater</button><button disabled={salvando} className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-50" onClick={() => void alterarStatus('CANCELADA')}>Cancelar O.S.</button></>}{osDetalhe.status === 'RUA' && <button disabled={salvando} className={botao} onClick={() => void alterarStatus('FINALIZADA')}>Mudar para Finalizada</button>}</div>
            <button className={botao} onClick={() => setModalDetalhesAberto(false)}>Fechar</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
