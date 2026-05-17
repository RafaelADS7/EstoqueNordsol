import io
import os
from django.conf import settings
from django.contrib import admin
from django.http import FileResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from .models import Categoria, Produto, KitModelo, ItemKit, OrdemServico, ItemOS, Movimentacao

# --- OPÇÃO NUCLEAR: CAMINHO FIXO ABSOLUTO ---
# Sem adivinhações do Django. Caminho exato do seu Windows.
LOGO_PATH = r"D:\ProjetoNordsol\sistema_estoque_solar\logonordsol.png"

# --- FUNÇÃO: PDF DE INVENTÁRIO (PRODUTOS) ---
def gerar_pdf_estoque(modeladmin, request, queryset):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    # Tenta injetar a logo. Se falhar, escreve o erro no próprio PDF!
    try:
        if os.path.exists(LOGO_PATH):
            logo = Image(LOGO_PATH, width=80, height=80)
            logo.hAlign = 'CENTER'
            elements.append(logo)
        else:
            elements.append(Paragraph(f"ERRO: O arquivo não foi encontrado em {LOGO_PATH}", styles['Normal']))
    except Exception as e:
        elements.append(Paragraph(f"ERRO AO ABRIR A IMAGEM: {str(e)}", styles['Normal']))

    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Relatório de Inventário - Nordsol", styles['Title']))
    elements.append(Spacer(1, 12))

    data = [['Produto', 'Categoria', 'Estoque', 'Un', 'Custo Unit.', 'Total R$']]
    total_geral = 0

    for p in queryset:
        valor_total_produto = p.estoque_atual * p.preco_custo
        total_geral += valor_total_produto
        
        custo_unit = f"R$ {p.preco_custo:.2f}".replace('.', ',')
        total_item = f"R$ {valor_total_produto:.2f}".replace('.', ',')
        estoque_fmt = f"{p.estoque_atual:.2f}".replace('.', ',')

        data.append([p.nome, p.categoria.nome, estoque_fmt, p.unidade, custo_unit, total_item])

    t = Table(data, colWidths=[150, 80, 60, 40, 80, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    
    elements.append(t)
    total_fmt = f"R$ {total_geral:.2f}".replace('.', ',')
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"<b>Valor Total em Estoque: {total_fmt}</b>", styles['Normal']))

    doc.build(elements)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename='inventario_nordsol.pdf')

gerar_pdf_estoque.short_description = "Gerar PDF de Inventário"

# --- FUNÇÃO: PDF DA ORDEM DE SERVIÇO (ROMANEIO) ---
def gerar_pdf_os(modeladmin, request, queryset):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    for os_obj in queryset:
        try:
            if os.path.exists(LOGO_PATH):
                logo = Image(LOGO_PATH, width=60, height=60)
                logo.hAlign = 'RIGHT'
                elements.append(logo)
        except:
            pass # Ignora erros na OS para focar no inventário primeiro

        elements.append(Paragraph(f"Ordem de Serviço: {os_obj.numero_os}", styles['Title']))
        elements.append(Spacer(1, 12))
        
        elements.append(Paragraph(f"<b>Cliente:</b> {os_obj.cliente}", styles['Normal']))
        elements.append(Paragraph(f"<b>Endereço:</b> {os_obj.endereco or 'Não informado'}", styles['Normal']))
        elements.append(Paragraph(f"<b>Técnico Responsável:</b> {os_obj.tecnico_responsavel or 'Não informado'}", styles['Normal']))
        elements.append(Paragraph(f"<b>Data Programada:</b> {os_obj.data_programada}", styles['Normal']))
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("<b>Lista de Materiais para Separação:</b>", styles['Heading3']))
        elements.append(Spacer(1, 10))

        data = [['Produto', 'Quantidade', 'Unidade', 'Conferido ( )']]
        for item in os_obj.itens.all():
            data.append([item.produto.nome, f"{item.quantidade_saida:.2f}".replace('.', ','), item.produto.unidade, "[  ]"])

        t = Table(data, colWidths=[250, 80, 80, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("________________________________________________", styles['Normal']))
        elements.append(Paragraph("Assinatura do Responsável pela Saída", styles['Normal']))
        
        elements.append(PageBreak())

    doc.build(elements)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename='romaneio_carga_nordsol.pdf')

gerar_pdf_os.short_description = "Imprimir Romaneio de Carga (PDF)"


# --- REGISTROS NO ADMIN ---

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
    filter_horizontal = ('kits_aplicados',)
    inlines = [ItemOSInline]
    actions = [gerar_pdf_os]

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'categoria', 'estoque_atual', 'quantidade_minima', 'preco_custo')
    list_filter = ('categoria',)
    search_fields = ('nome', 'sku_codigo')
    actions = [gerar_pdf_estoque]

@admin.register(Movimentacao)
class MovimentacaoAdmin(admin.ModelAdmin):
    list_display = ('produto', 'tipo', 'quantidade', 'numero_nota', 'data', 'os')
    list_filter = ('tipo', 'data')
    search_fields = ('numero_nota', 'produto__nome')
    readonly_fields = ('data',)

admin.site.register(Categoria)