"""Atualiza sumário e listas (campos de índice) do .docx via LibreOffice/UNO e exporta PDF.

Uso: python3 relatorio/atualizar_indices.py relatorio/TF1_Texto_Preliminar_G11.docx
Requer LibreOffice instalado. O Word também atualiza os campos ao abrir o arquivo.
"""
import subprocess
import sys
import time
from pathlib import Path

import uno
from com.sun.star.beans import PropertyValue


def prop(n, v):
    p = PropertyValue()
    p.Name, p.Value = n, v
    return p


def main(arq):
    arq = Path(arq).resolve()
    proc = subprocess.Popen(["soffice", "--headless", "--invisible", "--norestore",
                             "--accept=socket,host=localhost,port=2002;urp;"])
    try:
        ctx = None
        local = uno.getComponentContext()
        res = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
        for _ in range(60):
            try:
                ctx = res.resolve("uno:socket,host=localhost,port=2002;urp;StarOffice.ComponentContext")
                break
            except Exception:
                time.sleep(1)
        desk = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
        doc = desk.loadComponentFromURL(arq.as_uri(), "_blank", 0, (prop("Hidden", True),))
        idx = doc.getDocumentIndexes()
        for _ in range(2):  # duas passadas: os números de página se estabilizam
            for i in range(idx.getCount()):
                idx.getByIndex(i).update()
        doc.storeToURL(arq.as_uri(), (prop("FilterName", "MS Word 2007 XML"),))
        doc.storeToURL(arq.with_suffix(".pdf").as_uri(), (prop("FilterName", "writer_pdf_Export"),))
        n = idx.getCount()
        doc.close(True)
        print("índices atualizados:", n)
    finally:
        proc.terminate()


if __name__ == "__main__":
    main(sys.argv[1])
