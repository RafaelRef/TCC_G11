"""Definições compartilhadas pelos scripts de análise do TCC G11.

Caminhos, paleta de cores, classificação de gravidade e leitura da base.
"""
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
import pandas as pd

matplotlib.use("Agg")

RAIZ = Path(__file__).resolve().parents[1]
BRUTOS = RAIZ / "dados" / "brutos"
PROCESSADOS = RAIZ / "dados" / "processados"
FIGURAS = RAIZ / "figuras"
TABELAS = RAIZ / "tabelas"
for p in (PROCESSADOS, FIGURAS, TABELAS):
    p.mkdir(parents=True, exist_ok=True)

ARQUIVO_BRUTO = BRUTOS / "deslocamentos-vtr-hatzala-sp.xlsx"

# Paleta categórica (ordem fixa) e tintas de texto
AZUL, LARANJA, AQUA, AMARELO = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
CINZA = "#9a9993"
TEXTO, TEXTO_2 = "#0b0b0b", "#52514e"

# ---------------------------------------------------------------------------
# Classificação de gravidade presumida (PROVISÓRIA)
# Proxy construído a partir da queixa principal registrada na triagem.
# Deve ser validada com profissionais de APH antes do TF2.
# ---------------------------------------------------------------------------
ALTA = {
    "PARADA CARDIO RESPIRATÓRIA (PCR)", "AVC", "ENGASGO", "DOR TORACICA",
    "DISPNEIA", "DESCONFORTO RESPIRATÓRIO", "QUEDA DE SATURAÇÃO",
    "REBAIXAMENTO DO NIVEL DE CONSCIENCIA", "PERDA DE CONSCIÊNCIA",
    "CONVULSÃO", "HEMORRAGIA", "INTOXICAÇÃO EXÓGENA", "ENVENENAMENTO",
    "TCE - TRAUMATISMO CRANIOENCEFALICO", "QUEDA DE ALTURA",
    "ACIDENTE COM AUTOMÓVEL", "ATROPELAMENTO",
}
MODERADA = {
    "DESMAIO", "SÍNCOPE", "MAL SUBITO", "TAQUICARDIA", "CRISE HIPERTENSIVA",
    "HIPOTENSÃO", "HIPOGLICEMIA", "HIPERGLICEMIA", "DOR ABDOMINAL",
    "FRATURA DE BACIA/PELVE", "FRATURA DE MEMBRO SUPERIOR", "QUEIMADURA",
}
BAIXA = {
    "MAL ESTAR", "QUEDA DA PRÓPRIA ALTURA", "DESIDRATAÇAO", "HIPERTEMIA",
    "ALCOOLISMO", "INSUF RENAL",
}
INDETERMINADA = {"OUTROS", "OUTROS SHABAT"}
ORDEM_GRAVIDADE = ["Alta", "Moderada", "Baixa", "Indeterminada"]
CORES_GRAVIDADE = {"Alta": LARANJA, "Moderada": AMARELO, "Baixa": AZUL, "Indeterminada": CINZA}


def gravidade(queixa: str) -> str:
    if queixa in ALTA:
        return "Alta"
    if queixa in MODERADA:
        return "Moderada"
    if queixa in BAIXA:
        return "Baixa"
    return "Indeterminada"


def estilo():
    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "font.size": 10,
        "axes.edgecolor": CINZA,
        "axes.labelcolor": TEXTO_2,
        "axes.titlesize": 11,
        "axes.titleweight": "bold",
        "axes.titlecolor": TEXTO,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "axes.axisbelow": True,
        "grid.color": "#e6e5e0",
        "grid.linewidth": 0.6,
        "xtick.color": TEXTO_2,
        "ytick.color": TEXTO_2,
        "legend.frameon": False,
        "figure.dpi": 150,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
    })


def ler_limpa() -> pd.DataFrame:
    """Lê a base limpa gerada por 01_limpeza.py."""
    arq = PROCESSADOS / "acionamentos_limpos.pkl"
    if not arq.exists():
        raise FileNotFoundError("Rode antes: python analise/01_limpeza.py")
    return pd.read_pickle(arq)
