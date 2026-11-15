from rest_framework import serializers
from .models import Categoria, Produto, KitModelo, ItemKit, OrdemServico, ItemOS, Movimentacao

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    valor_total = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            'id', 'nome', 'marca', 'fornecedor', 'categoria',
            'categoria_nome', 'sku_codigo', 'unidade', 'estoque_atual',
            'quantidade_minima', 'preco_custo', 'valor_total', 'data_cadastro',
        ]

    def get_valor_total(self, obj):
        total = (obj.estoque_atual or 0) * (obj.preco_custo or 0)
        return round(float(total), 2)

class ItemKitSerializer(serializers.ModelSerializer):
    produto_detalhes = ProdutoSerializer(source='produto', read_only=True)

    class Meta:
        model = ItemKit
        fields = ['id', 'produto', 'produto_detalhes', 'quantidade_padrao']

class KitModeloSerializer(serializers.ModelSerializer):
    itens = ItemKitSerializer(many=True, read_only=True)
    valor_total = serializers.SerializerMethodField()

    class Meta:
        model = KitModelo
        fields = ['id', 'nome_kit', 'descricao', 'itens', 'valor_total']

    def get_valor_total(self, obj):
        total = sum((item.quantidade_padrao or 0) * (item.produto.preco_custo or 0) for item in obj.itens.all())
        return round(float(total), 2)

class ItemOSSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = ItemOS
        fields = ['id', 'os', 'produto', 'produto_nome', 'quantidade_saida']

class OrdemServicoSerializer(serializers.ModelSerializer):
    itens = ItemOSSerializer(many=True, read_only=True)
    valor_total = serializers.SerializerMethodField()

    class Meta:
        model = OrdemServico
        fields = [
            'id', 'numero_os', 'cliente', 'endereco', 'tecnico_responsavel',
            'data_programada', 'status', 'kits_aplicados', 'itens', 'valor_total'
        ]

    def get_valor_total(self, obj):
        total = sum((item.quantidade_saida or 0) * (item.produto.preco_custo or 0) for item in obj.itens.all())
        return round(float(total), 2)

class MovimentacaoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = Movimentacao
        fields = ['id', 'produto', 'produto_nome', 'tipo', 'quantidade', 'numero_nota', 'data', 'os']