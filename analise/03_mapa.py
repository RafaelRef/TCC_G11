"""Etapa 3: localização aproximada das bases e mapa das ocorrências.

As coordenadas das bases não constam da planilha (só o endereço). Elas são
estimadas por trilateração: para cada base, minimiza-se o erro entre a
distância em linha reta informada pelo sistema (base -> ocorrência) e a
distância haversine calculada até as coordenadas das ocorrências. A
trilateração recupera o ponto cadastrado no sistema; para as bases com
posição conhecida (comum.BASES_CONHECIDAS), esse ponto é substituído pela
posição real e o desvio entre os dois é registrado.

Saídas: tabelas/bases_estimadas.csv, figuras/fig_mapa_ocorrencias.png
"""
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.optimize import least_squares

from comum import (BASES_CONHECIDAS, CORES_GRAVIDADE, FIGURAS, ORDEM_GRAVIDADE, TABELAS, TEXTO, estilo,
                   haversine, ler_limpa)



def estimar_bases(df):
    linhas = []
    for base, g in df[~df["fora_area"]].dropna(subset=["lat", "lng", "km_base_ocorr_sistema"]).groupby("base"):
        g = g.drop_duplicates(["chamado"])
        x0 = [g["lat"].median(), g["lng"].median()]
        res = least_squares(lambda p: haversine(p[0], p[1], g["lat"].values, g["lng"].values)
                            - g["km_base_ocorr_sistema"].values, x0, loss="soft_l1", f_scale=0.2)
        erro = np.median(np.abs(res.fun))
        linhas.append({"base": base, "endereco": g["Endereço da base"].iloc[0] if "Endereço da base" in g else "",
                       "lat": round(res.x[0], 5), "lng": round(res.x[1], 5),
                       "erro_mediano_km": round(erro, 3), "n_obs": len(g), "fonte": "trilateração",
                       "desvio_sistema_km": 0.0})
        if base in BASES_CONHECIDAS:
            pos = BASES_CONHECIDAS[base]
            linhas[-1].update(lat=pos["lat"], lng=pos["lng"], fonte="informada pelo grupo",
                              desvio_sistema_km=round(float(haversine(res.x[0], res.x[1], pos["lat"], pos["lng"])), 2))
    return pd.DataFrame(linhas)


def mapa(df, bases):
    v = df[~df["fora_area"]].drop_duplicates("chamado")
    fig, ax = plt.subplots(figsize=(7, 6.2))
    for g in ORDEM_GRAVIDADE[::-1]:
        s = v[v["gravidade"] == g]
        # coordenadas arredondadas a ~100 m: pequeno jitter só para visualização
        jit = np.random.default_rng(0).normal(0, 0.0004, (len(s), 2))
        ax.scatter(s["lng"] + jit[:, 1], s["lat"] + jit[:, 0], s=22, color=CORES_GRAVIDADE[g],
                   alpha=0.75, edgecolor="white", linewidth=0.6, label=f"Prioridade {g.lower()} ({len(s)})", zorder=3)
    ax.scatter(bases["lng"], bases["lat"], marker="s", s=110, color=TEXTO, edgecolor="white",
               linewidth=1.5, zorder=5, label="Base")
    for _, b in bases.iterrows():
        ax.annotate(b["base"], (b["lng"], b["lat"]), xytext=(7, 7), textcoords="offset points",
                    fontsize=9, fontweight="bold", color=TEXTO, zorder=6)
    try:
        import contextily as cx
        cx.add_basemap(ax, crs="EPSG:4326", source=cx.providers.CartoDB.Positron, attribution_size=6)
    except Exception as e:  # sem acesso à internet: mapa sem fundo
        print("Mapa de fundo indisponível:", type(e).__name__)
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    ax.set_aspect(1 / np.cos(np.radians(-23.55)))
    h, l = ax.get_legend_handles_labels()
    n = len(ORDEM_GRAVIDADE)
    ordem = list(range(n))[::-1] + [n]  # prioridade alta primeiro, base por último
    ax.legend([h[i] for i in ordem], [l[i] for i in ordem], loc="lower left", fontsize=8,
              frameon=True, facecolor="white", framealpha=0.9)
    lo, hi = v["lng"].quantile([0.01, 0.99]), v["lat"].quantile([0.01, 0.99])
    ax.set_xlim(lo.iloc[0] - 0.01, lo.iloc[1] + 0.01)
    ax.set_ylim(hi.iloc[0] - 0.01, hi.iloc[1] + 0.01)
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_mapa_ocorrencias.png")
    plt.close(fig)


def main():
    estilo()
    df = ler_limpa()
    bases = estimar_bases(df)
    bases["endereco"] = bases["base"].map(lambda b: BASES_CONHECIDAS.get(b, {}).get("endereco", ""))
    bases.to_csv(TABELAS / "bases_estimadas.csv", index=False)
    print(bases.to_string(index=False))
    mapa(df, bases)


if __name__ == "__main__":
    main()
