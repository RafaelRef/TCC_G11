"""Densidade de ocorrências de prioridade alta por zona de atendimento e faixa horária.

Zonas: região em que cada base é a mais próxima (Voronoi em linha reta, proxy do
Voronoi em tempo de rede que será feito com o OSRM no TF2), recortada pela área
atendida (envoltória convexa das ocorrências, sem os 2% mais afastados do centro).
Área calculada por rasterização em malha de 50 m.

Também verifica, para cada chamado de prioridade alta na zona de Higienópolis,
se a USB local (VTR 01) estava ocupada em outro chamado no momento da chegada.
Saídas: tabelas/densidade_zonas.csv, tabelas/densidade_malha_1km.csv, tabelas/densidade_zona_faixa.csv,
tabelas/reserva_local.csv, figuras/fig_densidade.png
"""
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.path import Path as MPath
from scipy.spatial import ConvexHull

from comum import AZUL, CINZA, FIGURAS, LARANJA, TABELAS, TEXTO, TEXTO_2, estilo, ler_limpa

FAIXAS = [(0, 8, "0 h-8 h"), (8, 14, "8 h-14 h"), (14, 20, "14 h-20 h"), (20, 24, "20 h-24 h")]
KM_LAT = 110.574
KM_LNG = 111.320 * np.cos(np.radians(-23.55))
S_HORAS = 73.0 / 60  # ocupação média das USB (Tabela 5)
W = 10  # peso de referência da formulação analítica (seção 4.7)


def zonas(c, bases):
    xy = np.c_[(c["lng"] - bases["lng"].mean()) * KM_LNG, (c["lat"] - bases["lat"].mean()) * KM_LAT]
    d = np.hypot(xy[:, 0] - xy[:, 0].mean(), xy[:, 1] - xy[:, 1].mean())
    pts = xy[d <= np.quantile(d, 0.98)]
    casco = MPath(pts[ConvexHull(pts).vertices])
    bx = np.c_[(bases["lng"] - bases["lng"].mean()) * KM_LNG, (bases["lat"] - bases["lat"].mean()) * KM_LAT]
    passo = 0.05
    gx, gy = np.meshgrid(np.arange(pts[:, 0].min(), pts[:, 0].max(), passo),
                         np.arange(pts[:, 1].min(), pts[:, 1].max(), passo))
    g = np.c_[gx.ravel(), gy.ravel()]
    g = g[casco.contains_points(g)]
    dono = np.argmin(((g[:, None, :] - bx[None, :, :]) ** 2).sum(-1), axis=1)
    area = {b: (dono == i).sum() * passo ** 2 for i, b in enumerate(bases["base"])}
    zona = bases["base"].values[np.argmin(((xy[:, None, :] - bx[None, :, :]) ** 2).sum(-1), axis=1)]
    dentro = casco.contains_points(xy) | (d <= np.quantile(d, 0.98))
    return zona, dentro, area, xy, bx, casco


def main():
    estilo()
    df = ler_limpa()
    df = df[~df["fora_area"]]
    bases = pd.read_csv(TABELAS / "bases_estimadas.csv")
    c = df.sort_values("t_acionada").groupby("chamado").first().reset_index()
    c["zona"], c["dentro"], area, xy, bx, casco = zonas(c, bases)
    horas = (df["dt_chamado"].max() - df["dt_chamado"].min()).total_seconds() / 3600
    dias = horas / 24

    # densidade por zona (todas as horas)
    lin = []
    for b in bases["base"]:
        z = c[c["zona"] == b]
        na = int((z["gravidade"] == "Alta").sum())
        lam = na / horas
        lin.append({"zona": b, "area_km2": round(area[b], 2), "chamados": len(z), "alta": na,
                    "alta_por_h": round(lam, 4), "dens_alta_km2_h": round(lam / area[b], 4),
                    "dens_alta_km2_dia": round(24 * lam / area[b], 3),
                    "p_grave_na_ocupacao_pct": round(100 * (1 - np.exp(-lam * S_HORAS)), 1)})
    tz = pd.DataFrame(lin)
    lam_lim = -np.log(1 - 1 / W) / S_HORAS
    tz["razao_limiar_w10"] = (tz["alta_por_h"] / lam_lim).round(2)
    tz.to_csv(TABELAS / "densidade_zonas.csv", index=False)
    print(tz.to_string(index=False), f"\nperíodo {horas:.0f} h; taxa-limiar (w={W}) {lam_lim:.4f}/h")

    # malha regular de 1 km²: células mais densas em chamados de prioridade alta;
    # malha ancorada na base de Higienópolis (centro de uma célula), independente das demais bases
    a = (c["gravidade"] == "Alta").values
    hig = bx[list(bases["base"]).index("Higienópolis")]
    cel = np.floor(xy - hig + 0.5).astype(int)
    m = pd.DataFrame({"cx": cel[:, 0], "cy": cel[:, 1], "alta": a, "todos": 1}).groupby(["cx", "cy"]).sum()
    m = m.sort_values(["alta", "todos"], ascending=False).head(5).reset_index()
    m["dens_alta_km2_dia"] = (m["alta"] / dias).round(3)
    m["razao_limiar_w10"] = (m["alta"] / horas / lam_lim).round(2)
    m.to_csv(TABELAS / "densidade_malha_1km.csv", index=False)
    print(m.to_string(index=False), f"\ncélulas de 1 km² com chamados: {len(np.unique(cel, axis=0))}")

    # por faixa horária
    lin = []
    for b in bases["base"]:
        for h0, h1, nome in FAIXAS:
            z = c[(c["zona"] == b) & (c["hora"] >= h0) & (c["hora"] < h1)]
            th = dias * (h1 - h0)
            lam = (z["gravidade"] == "Alta").sum() / th
            lin.append({"zona": b, "faixa": nome, "alta": int((z["gravidade"] == "Alta").sum()),
                        "alta_por_h": round(lam, 4), "dens_alta_km2_h": round(lam / area[b], 4),
                        "p_grave_na_ocupacao_pct": round(100 * (1 - np.exp(-lam * S_HORAS)), 1),
                        "razao_limiar_w10": round(lam / lam_lim, 2)})
    tf = pd.DataFrame(lin)
    tf.to_csv(TABELAS / "densidade_zona_faixa.csv", index=False)
    print(tf.to_string(index=False))

    # viatura local de Higienópolis ocupada quando chega chamado de prioridade alta na zona
    u = df[df["vtr"] == "VTR 01"].copy()
    med = u.loc[u["ok_ocupacao"], "min_ocupacao"].median()
    u["fim"] = u["t_acionada"] + pd.to_timedelta(np.where(u["ok_ocupacao"], u["min_ocupacao"], med), unit="min")
    grav = c.set_index("chamado")["gravidade"]
    u["grav_ocup"] = u["chamado"].map(grav)
    alvo = c[(c["zona"] == "Higienópolis") & (c["gravidade"] == "Alta")]
    k = []
    for _, r in alvo.iterrows():
        o = u[(u["t_acionada"] <= r["dt_chamado"]) & (u["fim"] > r["dt_chamado"]) & (u["chamado"] != r["chamado"])]
        k.append(o["grav_ocup"].iloc[0] if len(o) else None)
    k = pd.Series(k, dtype=object)
    res = pd.DataFrame([
        ("Chamados de prioridade alta na zona de Higienópolis", len(alvo)),
        ("com a VTR 01 ocupada em outro chamado", int(k.notna().sum())),
        ("  ocupada em chamado de prioridade alta", int((k == "Alta").sum())),
        ("  ocupada em chamado de prioridade média", int((k == "Média").sum())),
        ("  ocupada em chamado de prioridade baixa", int((k == "Baixa").sum())),
        ("Acionamentos da VTR 01 com ocupação imputada (mediana)", int((~u["ok_ocupacao"]).sum())),
        ("Ocupação mediana usada na imputação (min)", round(med, 1)),
    ], columns=["indicador", "valor"])
    res.to_csv(TABELAS / "reserva_local.csv", index=False)
    print(res.to_string(index=False))

    # figura: zonas + densidade por faixa
    fig, (ax, ax2) = plt.subplots(1, 2, figsize=(10, 4.4), gridspec_kw={"width_ratios": [1, 1.1]})
    cores = {"Higienópolis": LARANJA, "Jardins": AZUL, "Itaim": "#1baf7a"}
    gx, gy = np.meshgrid(np.linspace(*ax_lim(xy[:, 0]), 300), np.linspace(*ax_lim(xy[:, 1]), 300))
    g = np.c_[gx.ravel(), gy.ravel()]
    dono = np.argmin(((g[:, None, :] - bx[None, :, :]) ** 2).sum(-1), axis=1)
    dentro = casco.contains_points(g)
    for i, b in enumerate(bases["base"]):
        m = (dono == i) & dentro
        ax.scatter(g[m, 0], g[m, 1], s=1, color=cores[b], alpha=0.12, linewidths=0)
    a = c["gravidade"] == "Alta"
    ax.scatter(xy[~a, 0], xy[~a, 1], s=6, color=CINZA, alpha=0.6, label="Prioridade média e baixa")
    ax.scatter(xy[a, 0], xy[a, 1], s=14, color=TEXTO, label="Prioridade alta")
    for i, b in enumerate(bases["base"]):
        ax.scatter(*bx[i], marker="s", s=90, color=cores[b], edgecolor="white", zorder=5)
        ax.annotate(f"{b}\n{area[b]:.1f} km²", bx[i], xytext=(6, 6), textcoords="offset points",
                    fontsize=8.5, fontweight="bold", color=TEXTO)
    ax.set_aspect(1)
    ax.set_xlabel("x (km)")
    ax.set_ylabel("y (km)")
    ax.set_title("Zonas de atendimento (proxy em linha reta)")
    ax.legend(loc="lower left", fontsize=7.5)
    nomes = [f[2] for f in FAIXAS]
    xb = np.arange(len(nomes))
    larg = 0.27
    for j, b in enumerate(bases["base"]):
        v = tf[tf["zona"] == b]["dens_alta_km2_h"].values * 24
        ax2.bar(xb + (j - 1) * larg, v, larg, color=cores[b], label=b)
    ax2.set_xticks(xb, nomes)
    ax2.set_ylabel("Chamados de prioridade alta / km² / dia")
    ax2.set_title("Densidade de prioridade alta por faixa horária")
    ax2.grid(axis="x", visible=False)
    ax2.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_densidade.png")
    plt.close(fig)


def ax_lim(v):
    return v.min() - 0.3, v.max() + 0.3


if __name__ == "__main__":
    main()
