"""Custo empírico de não ter a viatura local: estimativas de Δg e Δn (seção 4.7).

Zona de Higienópolis (zonas definidas em 07_densidade.py). Para cada chamado,
verifica se a USB local (VTR 01) e a unidade de intervenção rápida (VIR) estavam
ocupadas em outro chamado no momento da chegada (acionamentos sem horário de
liberação recebem a ocupação mediana da viatura; acionamentos cancelados,
recusados ou sem resposta não contam como ocupação).

Tempo de resposta medido a partir do horário do chamado (chamado -> acionamento
-> chegada à cena), só com registros válidos (R2 a R4) e atraso de acionamento
de até 30 min.

  Δg  chamados de prioridade alta: primeira chegada de qualquer viatura e
      primeira chegada de uma USB (a VIR não transporta), com a VTR 01 livre
      e com a VTR 01 ocupada.
  Δn  chamados de prioridade média e baixa: tempo de resposta da USB quando
      ela é a VTR 01 e quando vem de outra base.
  Referência geométrica: diferença de distância em linha reta entre a base
      de Higienópolis e a base vizinha mais próxima, convertida em tempo pela
      velocidade mediana observada das USB.

Saídas: tabelas/custo_reserva.csv, figuras/fig_custo_reserva.png
        dados/processados/conflitos_vtr01.csv (caso a caso; não versionado)
"""
import importlib

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from comum import (AZUL, FIGURAS, LARANJA, PROCESSADOS, TABELAS, TEXTO_2,
                   estilo, ler_limpa)

dens = importlib.import_module("07_densidade")

SEM_EMPENHO = ["Cancelada", "Recusou", "Desistiu", "Recebida (sem resposta)"]
ZONA = "Higienópolis"


def ocupacao(df, vtr):
    u = df[(df["vtr"] == vtr) & ~df["situacao_vtr"].isin(SEM_EMPENHO)].copy()
    med = df.loc[(df["vtr"] == vtr) & df["ok_ocupacao"], "min_ocupacao"].median()
    u["fim"] = u["t_acionada"] + pd.to_timedelta(np.where(u["ok_ocupacao"], u["min_ocupacao"], med), unit="min")
    return u


def ocupada(u, chamado, t):
    return bool(((u["t_acionada"] <= t) & (u["fim"] > t) & (u["chamado"] != chamado)).any())


def resumo(s):
    s = s.dropna()
    if s.empty:
        return len(s), np.nan, np.nan, np.nan
    return len(s), round(s.median(), 1), round(s.quantile(0.25), 1), round(s.quantile(0.75), 1)


def main():
    estilo()
    df = ler_limpa()
    df = df[~df["fora_area"]].copy()
    bases = pd.read_csv(TABELAS / "bases_estimadas.csv")
    c = df.sort_values("t_acionada").groupby("chamado").first().reset_index()
    c["zona"], *_ = dens.zonas(c, bases)
    df["zona"] = df["chamado"].map(c.set_index("chamado")["zona"])

    df["atraso_acion"] = (df["t_acionada"] - df["dt_chamado"]).dt.total_seconds() / 60
    df["resp"] = (df["atraso_acion"] + df["min_resposta"]).where(df["ok_resposta"] & (df["atraso_acion"] <= 30))

    u01, uvir = ocupacao(df, "VTR 01"), ocupacao(df, "VIR")
    h = c[c["zona"] == ZONA].copy()
    h["vtr01_ocupada"] = [ocupada(u01, ch, t) for ch, t in zip(h["chamado"], h["dt_chamado"])]
    h["vir_ocupada"] = [ocupada(uvir, ch, t) for ch, t in zip(h["chamado"], h["dt_chamado"])]

    a = df[df["zona"] == ZONA]
    usb = a[a["tipo_vtr"] == "USB"]
    h = h.set_index("chamado")
    h["primeira"] = a.groupby("chamado")["resp"].min()
    h["primeira_usb"] = usb.groupby("chamado")["resp"].min()
    h["vir_acionada"] = a[a["vtr"] == "VIR"].groupby("chamado").size().reindex(h.index).notna()
    h["vir_chegou"] = a[(a["vtr"] == "VIR") & a["t_cena"].notna()].groupby("chamado").size().reindex(h.index).notna()
    h["vtr01_atendeu"] = a[(a["vtr"] == "VTR 01") & ~a["situacao_vtr"].isin(SEM_EMPENHO)] \
        .groupby("chamado").size().reindex(h.index).notna()
    # quem chegou primeiro (entre os registros válidos)
    prim = a.dropna(subset=["resp"]).sort_values("resp").groupby("chamado")["vtr"].first()
    h["primeira_vtr"] = prim

    lin = []
    alta = h[h["gravidade"] == "Alta"]
    for nome, g in [("VTR 01 livre", alta[~alta["vtr01_ocupada"]]), ("VTR 01 ocupada", alta[alta["vtr01_ocupada"]])]:
        for med, col in [("primeira chegada (qualquer viatura)", "primeira"), ("primeira chegada de USB", "primeira_usb")]:
            n, md, q1, q3 = resumo(g[col])
            lin.append({"grupo": "Prioridade alta", "situacao": nome, "medida": med, "chamados": len(g),
                        "n_validos": n, "mediana_min": md, "p25_min": q1, "p75_min": q3})
    # Δn: USB que atendeu chamados não graves da zona, local x outra base
    ng = h[h["gravidade"] != "Alta"].index
    r = usb[usb["chamado"].isin(ng) & usb["resp"].notna()].sort_values("resp").groupby("chamado").first()
    for nome, g in [("USB local (VTR 01)", r[r["vtr"] == "VTR 01"]), ("USB de outra base", r[r["vtr"] != "VTR 01"])]:
        n, md, q1, q3 = resumo(g["resp"])
        lin.append({"grupo": "Prioridade média e baixa", "situacao": nome, "medida": "resposta da USB",
                    "chamados": len(g), "n_validos": n, "mediana_min": md, "p25_min": q1, "p75_min": q3})
    t = pd.DataFrame(lin)

    # referência geométrica: distância da ocorrência à base local e à vizinha mais próxima
    b = bases.set_index("base")
    xy = lambda lat, lng: np.c_[np.atleast_1d(lng) * dens.KM_LNG, np.atleast_1d(lat) * dens.KM_LAT]
    p = xy(h["lat"].values, h["lng"].values)
    d = {k: np.hypot(*(p - xy(b.loc[k, "lat"], b.loc[k, "lng"])).T) for k in b.index}
    dif_km = np.minimum(d["Jardins"], d["Itaim"]) - d[ZONA]
    v = usb[usb["ok_deslocamento"]]
    vel = (v["km_base_ocorr"] / (v["min_deslocamento"] / 60)).median()
    dif_min = dif_km / vel * 60

    dg_prim = t.query("medida == 'primeira chegada (qualquer viatura)'")["mediana_min"].diff().iloc[-1]
    dg_usb = t.query("medida == 'primeira chegada de USB'")["mediana_min"].diff().iloc[-1]
    dn = t.query("grupo == 'Prioridade média e baixa'")["mediana_min"].diff().iloc[-1]
    conf = alta[alta["vtr01_ocupada"]]
    extra = pd.DataFrame([
        {"grupo": "Estimativas", "situacao": "Δg pela primeira viatura", "medida": "diferença das medianas",
         "mediana_min": round(dg_prim, 1)},
        {"grupo": "Estimativas", "situacao": "Δg pela primeira USB", "medida": "diferença das medianas",
         "mediana_min": round(dg_usb, 1)},
        {"grupo": "Estimativas", "situacao": "Δn", "medida": "diferença das medianas", "mediana_min": round(dn, 1)},
        {"grupo": "Estimativas", "situacao": "Diferença geométrica (base vizinha - local)",
         "medida": f"linha reta a {vel:.0f} km/h", "n_validos": len(dif_min),
         "mediana_min": round(np.median(dif_min), 1), "p25_min": round(np.quantile(dif_min, 0.25), 1),
         "p75_min": round(np.quantile(dif_min, 0.75), 1)},
        {"grupo": "Conflitos (prioridade alta, VTR 01 ocupada)", "situacao": "VIR livre",
         "medida": "chamados", "chamados": int((~conf["vir_ocupada"]).sum())},
        {"grupo": "Conflitos (prioridade alta, VTR 01 ocupada)", "situacao": "VIR acionada",
         "medida": "chamados", "chamados": int(conf["vir_acionada"].sum())},
        {"grupo": "Conflitos (prioridade alta, VTR 01 ocupada)", "situacao": "VIR chegou à cena",
         "medida": "chamados", "chamados": int(conf["vir_chegou"].sum())},
        {"grupo": "Conflitos (prioridade alta, VTR 01 ocupada)", "situacao": "VIR foi a primeira a chegar",
         "medida": "chamados", "chamados": int((conf["primeira_vtr"] == "VIR").sum())},
        {"grupo": "Conflitos (prioridade alta, VTR 01 ocupada)", "situacao": "VTR 01 ainda assim atendeu",
         "medida": "chamados", "chamados": int(conf["vtr01_atendeu"].sum())},
    ])
    t = pd.concat([t, extra], ignore_index=True)
    t.to_csv(TABELAS / "custo_reserva.csv", index=False)
    print(t.to_string(index=False))

    cols = ["gravidade", "hora", "vtr01_ocupada", "vir_ocupada", "vir_acionada", "vir_chegou",
            "vtr01_atendeu", "primeira_vtr", "primeira", "primeira_usb"]
    conf[cols].round(1).to_csv(PROCESSADOS / "conflitos_vtr01.csv")

    # figura
    fig, axs = plt.subplots(1, 2, figsize=(10, 3.8), sharex=True)
    rng = np.random.default_rng(1)
    grupos = [
        (axs[0], "Prioridade alta: primeira chegada de USB",
         [("VTR 01 livre", alta.loc[~alta["vtr01_ocupada"], "primeira_usb"], AZUL),
          ("VTR 01 ocupada", alta.loc[alta["vtr01_ocupada"], "primeira_usb"], LARANJA)]),
        (axs[1], "Prioridade média e baixa: resposta da USB",
         [("USB local (VTR 01)", r.loc[r["vtr"] == "VTR 01", "resp"], AZUL),
          ("USB de outra base", r.loc[r["vtr"] != "VTR 01", "resp"], LARANJA)]),
    ]
    for ax, tit, gs in grupos:
        for i, (nome, s, cor) in enumerate(gs):
            s = s.dropna()
            ax.scatter(s, i + rng.uniform(-0.15, 0.15, len(s)), s=12, color=cor, alpha=0.55, linewidths=0)
            ax.plot([s.median()] * 2, [i - 0.3, i + 0.3], color=cor, lw=2.5)
            ax.annotate(f"mediana {s.median():.1f} min (n = {len(s)})", (s.median(), i + 0.32),
                        fontsize=8, color=TEXTO_2, ha="left")
        ax.set_yticks(range(len(gs)), [g[0] for g in gs])
        ax.set_ylim(-0.6, len(gs) - 0.2)
        ax.set_title(tit)
        ax.set_xlabel("Minutos desde o chamado")
        ax.grid(axis="y", visible=False)
    axs[0].set_xlim(0, 40)
    fig.tight_layout()
    fig.savefig(FIGURAS / "fig_custo_reserva.png")
    plt.close(fig)


if __name__ == "__main__":
    main()
