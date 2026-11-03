"""Figura: fluxograma das etapas do trabalho (TF1 e TF2)."""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

from comum import AZUL, FIGURAS, LARANJA, TEXTO, TEXTO_2, estilo

ETAPAS = [
    ("1. Revisão\nbibliográfica", "despacho, localização,\nmétricas de sobrevida", "TF1"),
    ("2. Tratamento\ndos dados", "regras R1 a R5,\nclassificação\nde prioridade", "TF1"),
    ("3. Análise\nexploratória", "demanda, tempos,\ndensidade e\ndisponibilidade", "TF1"),
    ("4. Parametrização", "chegadas por zona,\ntempos de viagem\ne de serviço", "TF2"),
    ("5. Simulação de\neventos discretos", "modelo genérico\nmultizona (SimPy)", "TF2"),
    ("6. Validação", "política atual x\ndados observados", "TF2"),
    ("7. Experimentos", "políticas x\ndensidade x cenários", "TF2"),
    ("8. Recomendações", "densidade-limiar δ*\ne regras de despacho", "TF2"),
]


def main():
    estilo()
    fig, ax = plt.subplots(figsize=(10, 4.6))
    ax.set_xlim(0, 4)
    ax.set_ylim(0, 2.1)
    ax.axis("off")
    w, h = 0.8, 0.8
    pos = [(i % 4 + 0.1, 1.2 if i < 4 else 0.1) for i in range(8)]
    for (tit, sub, fase), (x, y) in zip(ETAPAS, pos):
        cor = AZUL if fase == "TF1" else LARANJA
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.01,rounding_size=0.04",
                                    fc="white", ec=cor, lw=2))
        ax.text(x + 0.05, y + h - 0.06, tit, fontsize=9.5, fontweight="bold", color=TEXTO, va="top")
        ax.text(x + 0.05, y + 0.3, sub, fontsize=8, color=TEXTO_2, va="center")
        ax.text(x + w - 0.04, y + 0.05, fase, fontsize=8, color=cor, fontweight="bold", ha="right")
    seta = dict(arrowstyle="-|>", color=TEXTO_2, lw=1.2)
    for i in (0, 1, 2, 4, 5, 6):
        (x1, y1), (x2, y2) = pos[i], pos[i + 1]
        ax.annotate("", xy=(x2, y2 + h / 2), xytext=(x1 + w, y1 + h / 2), arrowprops=seta)
    # etapa 4 -> etapa 5 (retorno para a linha de baixo)
    xm4, xm5, ymeio = pos[3][0] + w / 2, pos[4][0] + w / 2, (pos[3][1] + pos[4][1] + h) / 2
    ax.plot([xm4, xm4, xm5], [pos[3][1], ymeio, ymeio], color=TEXTO_2, lw=1.2)
    ax.annotate("", xy=(xm5, pos[4][1] + h), xytext=(xm5, ymeio), arrowprops=seta)
    fig.savefig(FIGURAS / "fig_fluxograma.png")
    plt.close(fig)


if __name__ == "__main__":
    main()
