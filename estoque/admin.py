from django.contrib import admin
from .models import Categoria, Produto, KitModelo, ItemKit, OrdemServico, ItemOS, Movimentacao

class ItemKitInline(admin.TabularInline):
    model = ItemKit
    extra = 1

class ItemOSInline(admin.TabularInline):
    model = ItemOS
    extra = 1

@admin.register(KitModelo)
class KitModeloAdmin(admin.ModelAdmin):
    list_display = ('nome_kit', 'descricao')
    inlines = [ItemKitInline]

@admin.register(OrdemServico)
class OrdemServicoAdmin(admin.ModelAdmin):
    list_display = ('numero_os', 'cliente', 'tecnico_responsavel', 'data_programada', 'status')
    list_filter = ('status', 'tecnico_responsavel', 'data_programada')
    search_fields = ('numero_os', 'cliente', 'tecnico_responsavel')
    filter_horizontal = ('kits_aplicados',) # Facilita a seleção de múltiplos kits
    inlines = [ItemOSInline]

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'categoria', 'estoque_atual', 'quantidade_minima', 'preco_custo')
    list_filter = ('categoria',)
    search_fields = ('nome', 'sku_codigo')

@admin.register(Movimentacao)
class MovimentacaoAdmin(admin.ModelAdmin):
    list_display = ('produto', 'tipo', 'quantidade', 'numero_nota', 'data', 'os')
    list_filter = ('tipo', 'data')
    search_fields = ('numero_nota', 'produto__nome')
    readonly_fields = ('data',)

admin.site.register(Categoria)