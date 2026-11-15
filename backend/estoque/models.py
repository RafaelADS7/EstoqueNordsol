from django.db import models
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver


class Categoria(models.Model):
    nome = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Categorias"

    def __str__(self):
        return self.nome


class Produto(models.Model):
    UNIDADES = [
        ('UN', 'Unidade'),
        ('M', 'Metro'),
        ('PAR', 'Par'),
        ('KIT', 'Kit'),
    ]

    nome = models.CharField(max_length=150)

    marca = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    fornecedor = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.CASCADE
    )

    sku_codigo = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True
    )

    unidade = models.CharField(
        max_length=3,
        choices=UNIDADES,
        default='UN'
    )

    estoque_atual = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    quantidade_minima = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5
    )

    preco_custo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Preço de Custo"
    )

    data_cadastro = models.DateTimeField(
        auto_now_add=True,
        null=True,
        blank=True
    )

    # NOVOS CAMPOS:
    cidade = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    kwh = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        blank=True,
        null=True,
        verbose_name="Consumo em kWh"
    )

    class Meta:
        verbose_name_plural = "Produtos"

    def __str__(self):
        return f"{self.nome} ({self.estoque_atual} {self.unidade})"


class KitModelo(models.Model):
    nome_kit = models.CharField(max_length=150)

    descricao = models.TextField(
        blank=True,
        help_text="Ex: Kit Fixo ou Kit Ligação Aérea"
    )

    class Meta:
        verbose_name = "Kit Modelo"
        verbose_name_plural = "Kits Modelos"

    def __str__(self):
        return self.nome_kit


class ItemKit(models.Model):
    kit = models.ForeignKey(
        KitModelo,
        related_name='itens',
        on_delete=models.CASCADE
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE
    )

    quantidade_padrao = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )


class OrdemServico(models.Model):

    STATUS = [
        ('PENDENTE', 'Pendente (No Galpão)'),
        ('RUA', 'Em Rua (Material Saiu)'),
        ('FINALIZADA', 'Finalizada'),
        ('CANCELADA', 'Cancelada'),
    ]

    numero_os = models.CharField(
        max_length=20,
        unique=True
    )

    cliente = models.CharField(
        max_length=200
    )

    endereco = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Endereço da Instalação"
    )

    tecnico_responsavel = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Técnico Responsável"
    )

    data_programada = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=STATUS,
        default='PENDENTE'
    )

    kits_aplicados = models.ManyToManyField(
        KitModelo,
        blank=True,
        help_text="Selecione os kits necessários"
    )

    class Meta:
        verbose_name = "Ordem de Serviço"
        verbose_name_plural = "Ordens de Serviço"

    def __str__(self):
        return f"OS {self.numero_os} - {self.cliente}"


class ItemOS(models.Model):
    os = models.ForeignKey(
        OrdemServico,
        related_name='itens',
        on_delete=models.CASCADE
    )

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE
    )

    quantidade_saida = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    class Meta:
        verbose_name = "Item da OS"
        verbose_name_plural = "Itens da OS"


class Movimentacao(models.Model):

    TIPOS = [
        (
            'ENTRADA_COMPRA',
            'Entrada de Fornecedor (Nota Fiscal)'
        ),
        (
            'RETORNO_GERAL',
            'Retorno Geral de Campo (Sobras)'
        ),
        (
            'SAIDA_OS',
            'Saída Automática (OS)'
        ),
        (
            'AJUSTE',
            'Ajuste de Inventário'
        ),
    ]

    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE
    )

    tipo = models.CharField(
        max_length=30,
        choices=TIPOS
    )

    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    numero_nota = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Número da Nota Fiscal"
    )

    data = models.DateTimeField(
        auto_now_add=True
    )

    os = models.ForeignKey(
        OrdemServico,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = "Movimentação"
        verbose_name_plural = "Movimentações"

    def save(self, *args, **kwargs):
        prod = self.produto

        if self.tipo in [
            'ENTRADA_COMPRA',
            'RETORNO_GERAL'
        ]:
            prod.estoque_atual += self.quantidade
        else:
            prod.estoque_atual -= self.quantidade

        prod.save()

        super().save(*args, **kwargs)


# ============================================================
# SIGNAL: COPIAR ITENS DOS KITS
# ============================================================

@receiver(
    m2m_changed,
    sender=OrdemServico.kits_aplicados.through
)
def copiar_itens_dos_kits(
    sender,
    instance,
    action,
    **kwargs
):
    if action == "post_add":

        for kit in instance.kits_aplicados.all():

            for item in kit.itens.all():

                if not ItemOS.objects.filter(
                    os=instance,
                    produto=item.produto
                ).exists():

                    ItemOS.objects.create(
                        os=instance,
                        produto=item.produto,
                        quantidade_saida=item.quantidade_padrao
                    )


# ============================================================
# SIGNAL: BAIXAR ESTOQUE QUANDO OS VAI PARA RUA
# ============================================================

@receiver(post_save, sender=OrdemServico)
def processar_saida_estoque(
    sender,
    instance,
    **kwargs
):
    """
    Quando a O.S. estiver como RUA,
    os produtos são baixados do estoque.

    CANCELADA não faz nada.
    FINALIZADA não faz nada.
    PENDENTE não faz nada.
    """

    if instance.status == 'RUA':

        for item in instance.itens.all():

            existe_saida = Movimentacao.objects.filter(
                os=instance,
                produto=item.produto,
                tipo='SAIDA_OS'
            ).exists()

            if not existe_saida:

                Movimentacao.objects.create(
                    produto=item.produto,
                    os=instance,
                    tipo='SAIDA_OS',
                    quantidade=item.quantidade_saida
                )


# ============================================================
# SIGNAL: ITEM NOVO EM OS QUE JÁ ESTÁ NA RUA
# ============================================================

@receiver(post_save, sender=ItemOS)
def processar_saida_estoque_item_novo(
    sender,
    instance,
    **kwargs
):
    """
    Se um item for adicionado a uma O.S.
    que já está em RUA, baixa o estoque automaticamente.
    """

    if instance.os.status == 'RUA':

        existe_saida = Movimentacao.objects.filter(
            os=instance.os,
            produto=instance.produto,
            tipo='SAIDA_OS'
        ).exists()

        if not existe_saida:

            Movimentacao.objects.create(
                produto=instance.produto,
                os=instance.os,
                tipo='SAIDA_OS',
                quantidade=instance.quantidade_saida
            )
