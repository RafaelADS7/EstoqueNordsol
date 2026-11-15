from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaViewSet, ProdutoViewSet, KitModeloViewSet,
    ItemKitViewSet, OrdemServicoViewSet, ItemOSViewSet, MovimentacaoViewSet
)

# O Router cria as URLs automaticamente (/api/produtos/, /api/kits/, etc.)
router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'kits', KitModeloViewSet)
router.register(r'itens-kit', ItemKitViewSet)
router.register(r'ordens-servico', OrdemServicoViewSet)
router.register(r'itens-os', ItemOSViewSet)
router.register(r'movimentacoes', MovimentacaoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]