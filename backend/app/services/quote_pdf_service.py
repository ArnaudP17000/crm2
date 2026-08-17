"""Génération PDF devis — même charte graphique que les factures."""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, HRFlowable
from reportlab.lib.enums import TA_RIGHT

from .facturx_service import EMETTEUR

def generate_quote_pdf(quote, contact) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)

    s_normal = ParagraphStyle("n", fontName="Helvetica", fontSize=9, leading=13)
    s_legal  = ParagraphStyle("l", fontName="Helvetica-Oblique", fontSize=7.5, leading=11,
                               textColor=colors.HexColor("#666666"))
    s_h2     = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10, leading=14,
                               textColor=colors.HexColor("#1a1a2e"))
    s_title  = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=20, leading=26,
                               textColor=colors.HexColor("#1a1a2e"))

    date_fmt     = (quote.date or datetime.utcnow()).strftime("%d/%m/%Y")
    validity_fmt = quote.validity_date.strftime("%d/%m/%Y") if quote.validity_date else "—"

    story = []

    # En-tête
    header = Table([[
        Paragraph(EMETTEUR["activite"].upper(), s_title),
        Paragraph(f"<b>DEVIS</b><br/>{quote.number}",
                  ParagraphStyle("num", fontName="Helvetica-Bold", fontSize=14, leading=18,
                                 alignment=TA_RIGHT, textColor=colors.HexColor("#1a1a2e"))),
    ]], colWidths=[95*mm, 85*mm])
    header.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story += [header, Spacer(1, 4*mm),
              HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a1a2e")),
              Spacer(1, 5*mm)]

    # Emetteur / Destinataire
    cp_ville = " ".join(filter(None, [getattr(contact, 'code_postal', '') or '',
                                       contact.ville if contact else '']))
    siren_client = (contact.siren if contact else '') or ''
    parties = Table([[
        Paragraph(
            f"<b>{EMETTEUR['nom']}</b><br/>{EMETTEUR['activite']}<br/>"
            f"{EMETTEUR['adresse']}<br/>SIREN : {EMETTEUR['siren']}<br/>"
            f"SIRET : {EMETTEUR['siret']}<br/>{EMETTEUR['email']}", s_normal),
        Paragraph(
            f"<b>Devis établi pour</b><br/><b>{contact.nom if contact else '—'}</b><br/>"
            f"{contact.adresse or '' if contact else ''}<br/>{cp_ville}<br/>"
            f"{'SIREN : ' + siren_client if siren_client else ''}", s_normal),
    ]], colWidths=[90*mm, 90*mm])
    parties.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BACKGROUND", (1,0), (1,0), colors.HexColor("#f8f9fa")),
        ("BOX", (1,0), (1,0), 0.5, colors.HexColor("#dee2e6")),
        ("LEFTPADDING", (1,0), (1,0), 8), ("RIGHTPADDING", (1,0), (1,0), 8),
        ("TOPPADDING", (1,0), (1,0), 6), ("BOTTOMPADDING", (1,0), (1,0), 6),
    ]))
    story += [parties, Spacer(1, 6*mm)]

    # Infos devis
    info = Table([["Date d'émission", date_fmt, "Valable jusqu'au", validity_fmt]],
                 colWidths=[45*mm, 50*mm, 45*mm, 40*mm])
    info.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#555555")),
        ("TEXTCOLOR", (2,0), (2,-1), colors.HexColor("#555555")),
        ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    story += [info, Spacer(1, 6*mm)]

    # Lignes
    story.append(Paragraph("Détail de la prestation", s_h2))
    story.append(Spacer(1, 2*mm))
    rows = [["Description", "Qté", "P.U. HT", "TVA", "Total HT"]]
    for line in (quote.lines or []):
        rows.append([
            Paragraph(line.description or '', s_normal),
            str(line.quantity),
            f"{line.unit_price:,.2f} €".replace(",", " "),
            f"{line.vat_rate:.0f}%",
            f"{(line.quantity * line.unit_price):,.2f} €".replace(",", " "),
        ])
    lines_tbl = Table(rows, colWidths=[80*mm, 15*mm, 25*mm, 15*mm, 25*mm])
    lines_tbl.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("ALIGN", (1,0), (-1,-1), "RIGHT"),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (0,-1), 6),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f8f9fa")]),
        ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#dee2e6")),
    ]))
    story += [lines_tbl, Spacer(1, 4*mm)]

    # Totaux
    tva_amount = round((quote.total_ttc or 0) - (quote.total_ht or 0), 2)
    totaux = Table([
        ["Total HT", f"{quote.total_ht:,.2f} €".replace(",", " ")],
        ["TVA", f"{tva_amount:,.2f} €" if tva_amount else "Non applicable (art. 293 B CGI)"],
        ["TOTAL TTC", f"{quote.total_ttc:,.2f} €".replace(",", " ")],
    ], colWidths=[130*mm, 40*mm])
    totaux.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,-2), "Helvetica"),
        ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("FONTSIZE", (0,-1), (-1,-1), 10),
        ("ALIGN", (1,0), (1,-1), "RIGHT"),
        ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LINEABOVE", (0,-1), (-1,-1), 1, colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0,-1), (-1,-1), colors.HexColor("#1a1a2e")),
    ]))
    story += [totaux, Spacer(1, 6*mm)]

    if quote.notes:
        story.append(Paragraph(f"<b>Notes :</b> {quote.notes}", s_normal))
        story.append(Spacer(1, 4*mm))

    # Signature / acceptation
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 4*mm))
    accept = Table([[
        Paragraph("Bon pour accord :<br/><br/><br/>Signature et cachet :", s_normal),
        Paragraph(f"Date et lieu :<br/><br/><br/>À _____________ le {date_fmt}", s_normal),
    ]], colWidths=[90*mm, 90*mm])
    accept.setStyle(TableStyle([
        ("BOX", (0,0), (0,0), 0.5, colors.HexColor("#dee2e6")),
        ("BOX", (1,0), (1,0), 0.5, colors.HexColor("#dee2e6")),
        ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 24),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
    ]))
    story += [accept, Spacer(1, 4*mm)]

    # Mentions légales
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 3*mm))
    for line in [
        f"Micro-entrepreneur — SIREN {EMETTEUR['siren']} — SIRET {EMETTEUR['siret']}",
        "TVA non applicable, article 293 B du CGI.",
        f"Ce devis est valable jusqu'au {validity_fmt}. Au-delà, un nouveau devis sera établi.",
        "En cas d'acceptation, retourner ce devis signé avec la mention « Bon pour accord ».",
    ]:
        story.append(Paragraph(line, s_legal))

    doc.build(story)
    return buf.getvalue()
