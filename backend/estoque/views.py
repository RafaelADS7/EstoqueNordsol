from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db import transaction
from .models import Categoria, Produto, KitModelo, ItemKit, OrdemServico, ItemOS, Movimentacao
from .serializers import (
    CategoriaSerializer, ProdutoSerializer, KitModeloSerializer,
    ItemKitSerializer, OrdemServicoSerializer, ItemOSSerializer, MovimentacaoSerializer
)

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer

class KitModeloViewSet(viewsets.ModelViewSet):
    queryset = KitModelo.objects.all().order_by('-id') # Traz os mais novos primeiro
    serializer_class = KitModeloSerializer

class ItemKitViewSet(viewsets.ModelViewSet):
    queryset = ItemKit.objects.all()
    serializer_class = ItemKitSerializer

class OrdemServicoViewSet(viewsets.ModelViewSet):
    queryset = OrdemServico.objects.all()
    serializer_class = OrdemServicoSerializer

class ItemOSViewSet(viewsets.ModelViewSet):
    queryset = ItemOS.objects.all()
    serializer_class = ItemOSSerializer

class MovimentacaoViewSet(viewsets.ModelViewSet):
    queryset = Movimentacao.objects.all().order_by('-data')
    serializer_class = MovimentacaoSerializer

    @transaction.atomic  # Proteção: Se der erro em um produto da lista, nenhum é salvo
    def create(self, request, *args, **kwargs):
        dados = request.data

        # Verifica se o Frontend mandou uma lista [] ou apenas um objeto {}
        is_many = isinstance(dados, list)
        serializer = self.get_serializer(data=dados, many=is_many)

        if serializer.is_valid():
            # Salva no banco. Isso automaticamente aciona a função 'save()'
            # do seu models.py, que já faz a matemática de atualizar o estoque!
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # Se os dados estiverem errados, retorna o erro exato
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)