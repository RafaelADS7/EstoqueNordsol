from django.test import TestCase
from .models import Categoria, Produto, KitModelo, ItemKit, OrdemServico, ItemOS, Movimentacao

class EstoqueModelTestCase(TestCase):

    def setUp(self):
        """Esta função roda ANTES de cada teste. Ela deixa os itens já criados para usarmos."""
        self.categoria_kit = Categoria.objects.create(nome="Kit padrão")

        self.cunha = Produto.objects.create(
            nome="Cunha Vermelho", categoria=self.categoria_kit, estoque_atual=258.00
        )
        self.caixa = Produto.objects.create(
            nome="Caixa de passagem", categoria=self.categoria_kit, estoque_atual=59.00
        )

    def test_cadastro_inicial_de_produtos_reais(self):
        """Teste 1: Verifica apenas se o setUp conseguiu criar os itens no banco com saldos reais."""
        self.assertEqual(self.cunha.nome, "Cunha Vermelho")
        self.assertEqual(self.cunha.estoque_atual, 258.00)
        self.assertEqual(self.caixa.nome, "Caixa de passagem")

    def test_vinculo_itens_ao_kit_modelo(self):
        """Teste 2: Pega os itens já criados no setUp e foca apenas em montar o Kit."""

        # 1. Ação: Criando APENAS o molde do Kit Modelo
        kit_instalacao = KitModelo.objects.create(
            nome_kit="Kit Ligação Padrão",
            descricao="Kit para equipes de rua"
        )

        # 2. Ação: Vinculando os produtos que já existem ao Kit
        ItemKit.objects.create(kit=kit_instalacao, produto=self.cunha, quantidade_padrao=4.00)
        ItemKit.objects.create(kit=kit_instalacao, produto=self.caixa, quantidade_padrao=1.00)

        # 3. Asserções (Validações) focadas apenas no comportamento do Kit
        self.assertEqual(kit_instalacao.nome_kit, "Kit Ligação Padrão")
        self.assertEqual(kit_instalacao.itens.count(), 2)

    def test_baixa_automatica_estoque_ao_mudar_status_os(self):
        """Teste 3: Valida se o estoque do produto diminui quando a OS vai para a RUA."""
        from datetime import date

        # 1. Preparação (Setup local): Criando uma OS com status inicial 'PENDENTE'
        os_logistica = OrdemServico.objects.create(
            numero_os="OS-100",
            cliente="Nordsol Teste de Baixa",
            data_programada=date.today(),
            status="PENDENTE"
        )

        # 2. Vinculando o produto 'Cunha Vermelho'
        ItemOS.objects.create(os=os_logistica, produto=self.cunha, quantidade_saida=8.00)

        # 3. Ação Principal: Alterar o status para 'RUA' e salvar
        os_logistica.status = "RUA"
        os_logistica.save()

        # 4. Atualização da memória
        self.cunha.refresh_from_db()

        # 5. Asserção (Validação)
        self.assertEqual(self.cunha.estoque_atual, 250.00)

    def test_adicao_manual_de_itens_na_os(self):
        """Teste 4: Valida a inclusão flexível e manual de itens na OS sem depender de Kits."""
        from datetime import date

        # 1. Ação: Criando uma OS em estado pendente
        os_manual = OrdemServico.objects.create(
            numero_os="OS-200",
            cliente="Demanda Avulsa de Campo",
            data_programada=date.today(),
            status="PENDENTE"
        )

        # 2. Ação Principal: Adicionando materiais manualmente
        ItemOS.objects.create(os=os_manual, produto=self.cunha, quantidade_saida=5.00)
        ItemOS.objects.create(os=os_manual, produto=self.caixa, quantidade_saida=2.00)

        # 3. Asserções
        itens_da_os = ItemOS.objects.filter(os=os_manual)
        self.assertEqual(itens_da_os.count(), 2)

        item_cunha = itens_da_os.get(produto=self.cunha)
        item_caixa = itens_da_os.get(produto=self.caixa)

        self.assertEqual(item_cunha.quantidade_saida, 5.00)
        self.assertEqual(item_caixa.quantidade_saida, 2.00)

    def test_movimentacao_avulsa_saida_consumo_interno(self):
        """Teste 5: Valida baixa direta na tabela Movimentacao (sem OS)."""

        # 1. Ação Principal: Registrando uma movimentação de AJUSTE direta na tabela
        movimentacao_avulsa = Movimentacao.objects.create(
            produto=self.caixa,
            tipo="AJUSTE",
            quantidade=9.00
        )

        # 2. Atualização da memória
        self.caixa.refresh_from_db()

        # 3. Asserção (Validação)
        self.assertEqual(movimentacao_avulsa.tipo, "AJUSTE")
        self.assertEqual(self.caixa.estoque_atual, 50.00)

    def test_retorno_geral_sobras_de_campo(self):
        """Teste 6: Valida se um retorno de material soma a quantidade de volta ao estoque."""

        # 1. Ação Principal: Registrando um retorno direto de sobras de campo
        movimentacao_retorno = Movimentacao.objects.create(
            produto=self.cunha,
            tipo="RETORNO_GERAL",
            quantidade=10.00
        )

        # 2. Atualização da memória
        self.cunha.refresh_from_db()

        # 3. Asserção (Validação)
        self.assertEqual(movimentacao_retorno.tipo, "RETORNO_GERAL")
        self.assertEqual(self.cunha.estoque_atual, 268.00)

    def test_ajuste_de_inventario_auditoria(self):
        """Teste 7: Valida o lançamento de um ajuste de inventário por perda ou auditoria."""

        # 1. Ação Principal: Registrando um AJUSTE no sistema após uma recontagem física
        movimentacao_ajuste = Movimentacao.objects.create(
            produto=self.caixa,
            tipo="AJUSTE",
            quantidade=4.00,
            numero_nota="BALANCO-ANUAL"
        )

        # 2. Atualização da memória
        self.caixa.refresh_from_db()

        # 3. Asserção (Validação): O estoque inicial era 59.00, ajustou -4.00, o atual DEVE ser 55.00
        self.assertEqual(movimentacao_ajuste.tipo, "AJUSTE")
        self.assertEqual(self.caixa.estoque_atual, 55.00)