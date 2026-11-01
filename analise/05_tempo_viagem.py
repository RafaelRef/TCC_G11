"""Etapa 5: relação distância x tempo de deslocamento (parâmetro do simulador).

Ajusta t = a + b * d por mínimos quadrados, em que d é a distância em linha
reta base -> ocorrência (km) e t o tempo saída -> cena (min), usando apenas
acionamentos de USB com tempo de resposta válido e cuja viatura presumivelmente
saiu da base (deslocamento até 30 min).

Ressalva: a viatura nem sempre está na base no momento do acionamento, o que
introduz ruído; a partir de set/2026 há distância por rota a partir do GPS,
usada aqui como verificação.

Saídas: tabelas/tempo_viagem_regressao.csv, figuras/fig_tempo_viagem.png
"""
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

from comum import AZUL, FIGURAS, LARANJA, TABELAS, TEXTO_2, estilo, ler_limpa


def main():
    estilo()
    df = ler_limpa()
    v = df[df["ok_resposta"] & (df["tipo_vtr"] == "USB") & (df["min_deslocamento"] <= 30)].dropna(
        subset=["km_base_ocorr"])
    r = stats.linregress(v["km_base_ocorr"], v["min_deslocamento"])
    vel_media = (v["km_base_ocorr"] / (v["min_deslocamento"] / 60)).median()

    g = df[df["ok_resposta"]].dropna(subset=["km_rota_inicial"])
    r_gps = stats.linregress(g["km_rota_inicial"], g["min_deslocamento"]) if len(g) > 10 else None

    linhas = [("n (USB, linha reta)", len(v)), ("intercepto a (min)", r.intercept),
              ("inclinação b (min/km)", r.slope), ("R2", r.rvalue ** 2),
              ("velocidade mediana em linha reta (km/h)", vel_media)]
    if r_gps is not None:
        linhas += [("n (GPS, distância por rota)", len(g)), ("intercepto GPS (min)", r_gps.intercept),
                   ("inclinação GPS (min/km)", r_gps.slope), ("R2 GPS", r_gps.rvalue ** 2)]
    t = pd.DataFrame(linhas, columns=["parametro", "valor"])
    t["valor"] = t["valor"].astype(float).round(3)
    t.to_csv(TABELAS / "tempo_viagem_regressao.csv", index=False)
    print(t.to_string(index=False))

    fig, ax = plt.subplots(figsize=(6.5, 3.6))
    ax.scatter(v["km_base_ocorr"], v["min_deslocamento"], s=14, color=AZUL, alpha=0.55,
               edgecolor="white", linewidth=0.4, label="Acionamentos de USB")
    xs = np.linspace(0, v["km_base_ocorr"].quantile(0.99), 50)
    ax.plot(xs, r.intercept + r.slope * xs, color=LARANJA, lw=2,
            label=f"t = {r.intercept:.1f} + {r.slope:.2f}·d   (R² = {r.rvalue ** 2:.2f})")
    ax.set_xlim(0, v["km_base_ocorr"].quantile(0.99) * 1.05)
    ax.set_xlabel("Distância em linha reta base → ocorrência, d (km)")
    ax.set_ylabel("Deslocamento saída → cena, t (min)")
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_tempo_viagem.png")
    plt.close(fig)


if __name__ == "__main__":
    main()
