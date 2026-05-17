from django.test import TestCase
from datetime import date
from decimal import Decimal
from .models import Categoria, Produto, KitModelo, ItemKit, OrdemServico, ItemOS, Movimentacao

class CategoriaProdutoTestCase(TestCase):
    """Testes focados na criação de Categorias e Produtos"""
    
    def test_criacao_categoria(self):
        categoria = Categoria.objects.create(nome="Painéis Solares")
        self.assertEqual(categoria.nome, "Painéis Solares")
        # Testa se a representação em string (__str__) está correta
        self.assertEqual(str(categoria), "Painéis Solares")

    def test_criacao_produto_valores_padrao(self):
        categoria = Categoria.objects.create(nome="Estruturas")
        produto = Produto.objects.create(
            nome="Perfil de Alumínio",
            categoria=categoria,
            preco_custo=50.00
        )
        # O sistema deve assumir estoque 0 e unidade 'UN' por padrão
        self.assertEqual(produto.estoque_atual, 0)
        self.assertEqual(produto.unidade, 'UN')


class MovimentacaoTestCase(TestCase):
    """Testes focados no histórico de entradas e saídas e saldo de stock"""
    
    def setUp(self):
        self.categoria = Categoria.objects.create(nome="Acessórios")
        self.produto = Produto.objects.create(
            nome="Conector MC4", 
            categoria=self.categoria, 
            estoque_atual=0
        )

    def test_entrada_compra_aumenta_estoque(self):
        Movimentacao.objects.create(
            produto=self.produto, 
            tipo='ENTRADA_COMPRA', 
            quantidade=100
        )
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 100)

    def test_retorno_geral_aumenta_estoque(self):
        Movimentacao.objects.create(
            produto=self.produto, 
            tipo='RETORNO_GERAL', 
            quantidade=15
        )
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 15)

    def test_ajuste_diminui_estoque(self):
        # Começamos com 50 no stock
        self.produto.estoque_atual = 50
        self.produto.save()
        
        # Fazemos um ajuste retirando 5
        Movimentacao.objects.create(
            produto=self.produto, 
            tipo='AJUSTE', 
            quantidade=5
        )
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 45)


class OrdemServicoTestCase(TestCase):
    """Testes focados na Ordem de Serviço, Kits e Baixa Automática"""
    
    def setUp(self):
        # 1. Preparar Stock
        self.categoria = Categoria.objects.create(nome="Inversores")
        self.produto = Produto.objects.create(
            nome="Inversor 5kW", 
            categoria=self.categoria, 
            estoque_atual=10
        )
        
        # 2. Preparar Kit
        self.kit = KitModelo.objects.create(nome_kit="Kit Solar Básico 5kW")
        ItemKit.objects.create(
            kit=self.kit, 
            produto=self.produto, 
            quantidade_padrao=1
        )
        
        # 3. Preparar OS
        self.os = OrdemServico.objects.create(
            numero_os="OS-1001",
            cliente="Cliente Teste Nordsol",
            data_programada=date.today(),
            status='PENDENTE'
        )

    def test_adicionar_kit_na_os_cria_item_os_automaticamente(self):
        """Testa o signal m2m_changed"""
        self.os.kits_aplicados.add(self.kit)
        
        # Verifica se o ItemOS foi criado e se tem a quantidade correta (1)
        item_os = ItemOS.objects.filter(os=self.os, produto=self.produto).first()
        self.assertIsNotNone(item_os) # Garante que o item existe
        self.assertEqual(item_os.quantidade_saida, 1)

    def test_mudar_status_para_rua_baixa_estoque(self):
        """Testa o signal post_save"""
        # Adiciona o kit à OS
        self.os.kits_aplicados.add(self.kit)

        # Muda o status para RUA e guarda na base de dados
        self.os.status = 'RUA'
        self.os.save()

        # Verifica se o stock desceu de 10 para 9
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 9)

        # Verifica se ficou registado no histórico de movimentações (SAIDA_OS)
        movimentacao = Movimentacao.objects.filter(os=self.os, tipo='SAIDA_OS').first()
        self.assertIsNotNone(movimentacao)
        self.assertEqual(movimentacao.quantidade, 1)