from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from estoque.views import (
    CategoriaViewSet, ProdutoViewSet, KitModeloViewSet,
    ItemKitViewSet, OrdemServicoViewSet, ItemOSViewSet, MovimentacaoViewSet
)

# Criamos o roteador automático do Django REST Framework
router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'kits', KitModeloViewSet)
router.register(r'itens-kit', ItemKitViewSet)
router.register(r'ordens-servico', OrdemServicoViewSet)
router.register(r'itens-os', ItemOSViewSet)
router.register(r'movimentacoes', MovimentacaoViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    # Isso garante que todas as rotas comecem com 'api/' (ex: api/produtos/)
    path('api/', include(router.urls)),
]