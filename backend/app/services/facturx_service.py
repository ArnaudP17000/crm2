"""
Génération de factures Factur-X (PDF/A-3 + XML CII embarqué)
Profil : EN 16931 (compatible B2B France 2027)
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, HRFlowable
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

# Infos émetteur (micro-entrepreneur Arnaud Phéloup)
EMETTEUR = {
    "nom":        "Arnaud Phéloup",
    "activite":   "surf-atlantique.fr",
    "adresse":    "Nieul sur Mer",
    "code_postal": "17137",
    "ville":      "Nieul sur Mer",
    "siren":      "452 731 714",
    "siret":      "452 731 714 00001",
    "email":      "contact@surf-atlantique.fr",
    "site":       "www.surf-atlantique.fr",
}

NATURE_LABELS = {
    "prestation_services": "Prestation de services",
    "livraison_biens":     "Livraison de biens",
    "mixte":               "Opération mixte",
}

MODE_PAIEMENT_LABELS = {
    "virement": "Virement bancaire",
    "cheque":   "Chèque",
    "carte":    "Carte bancaire",
    "especes":  "Espèces",
    "autre":    "Autre",
}


def _xml_facturx(invoice, contact) -> bytes:
    """Génère le XML CII Factur-X profil EN 16931."""
    date_str  = (invoice.date or datetime.utcnow()).strftime("%Y%m%d")
    due_str   = invoice.due_date.strftime("%Y%m%d") if invoice.due_date else date_str
    siren_client = getattr(contact, 'siren', '') or ''
    nature = invoice.nature_operation or 'prestation_services'
    franchise = getattr(invoice, 'franchise_tva', True)

    if franchise:
        tva_block = """
        <ram:ApplicableTradeTax>
            <ram:CalculatedAmount>0.00</ram:CalculatedAmount>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:ExemptionReasonCode>VATEX-FR-FRANCHISE</ram:ExemptionReasonCode>
            <ram:ExemptionReason>TVA non applicable, article 293 B du CGI</ram:ExemptionReason>
            <ram:BasisAmount>{ht:.2f}</ram:BasisAmount>
            <ram:CategoryCode>E</ram:CategoryCode>
            <ram:RateApplicablePercent>0</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>""".format(ht=invoice.total_ht or 0)
    else:
        tva_amount = round((invoice.total_ttc or 0) - (invoice.total_ht or 0), 2)
        tva_block = """
        <ram:ApplicableTradeTax>
            <ram:CalculatedAmount>{tva:.2f}</ram:CalculatedAmount>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:BasisAmount>{ht:.2f}</ram:BasisAmount>
            <ram:CategoryCode>S</ram:CategoryCode>
            <ram:RateApplicablePercent>20</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>""".format(tva=tva_amount, ht=invoice.total_ht or 0)

    lines_xml = ""
    for i, line in enumerate(invoice.lines or [], 1):
        lines_xml += f"""
        <ram:IncludedSupplyChainTradeLineItem>
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>{i}</ram:LineID>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>{_esc(line.description)}</ram:Name>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>{line.unit_price:.2f}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity unitCode="C62">{line.quantity:.2f}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>VAT</ram:TypeCode>
                    <ram:CategoryCode>{'E' if franchise else 'S'}</ram:CategoryCode>
                    <ram:RateApplicablePercent>{0 if franchise else line.vat_rate:.1f}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>{line.total:.2f}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>
        </ram:IncludedSupplyChainTradeLineItem>"""

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
    xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
    <rsm:ExchangedDocumentContext>
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    <rsm:ExchangedDocument>
        <ram:ID>{_esc(invoice.number)}</ram:ID>
        <ram:TypeCode>380</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">{date_str}</udt:DateTimeString>
        </ram:IssueDateTime>
    </rsm:ExchangedDocument>
    <rsm:SupplyChainTradeTransaction>
        {lines_xml}
        <ram:ApplicableHeaderTradeAgreement>
            <ram:SellerTradeParty>
                <ram:Name>{_esc(EMETTEUR['nom'])}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>{EMETTEUR['code_postal']}</ram:PostcodeCode>
                    <ram:CityName>{_esc(EMETTEUR['ville'])}</ram:CityName>
                    <ram:CountryID>FR</ram:CountryID>
                </ram:PostalTradeAddress>
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="FC">{EMETTEUR['siret'].replace(' ', '')}</ram:ID>
                </ram:SpecifiedTaxRegistration>
            </ram:SellerTradeParty>
            <ram:BuyerTradeParty>
                <ram:Name>{_esc(contact.nom if contact else '')}</ram:Name>
                {f'<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">{siren_client.replace(" ", "")}</ram:ID></ram:SpecifiedTaxRegistration>' if siren_client else ''}
                <ram:PostalTradeAddress>
                    <ram:CityName>{_esc(contact.ville if contact else '')}</ram:CityName>
                    <ram:CountryID>FR</ram:CountryID>
                </ram:PostalTradeAddress>
            </ram:BuyerTradeParty>
        </ram:ApplicableHeaderTradeAgreement>
        <ram:ApplicableHeaderTradeDelivery>
            <ram:ActualDeliverySupplyChainEvent>
                <ram:OccurrenceDateTime>
                    <udt:DateTimeString format="102">{date_str}</udt:DateTimeString>
                </ram:OccurrenceDateTime>
            </ram:ActualDeliverySupplyChainEvent>
        </ram:ApplicableHeaderTradeDelivery>
        <ram:ApplicableHeaderTradeSettlement>
            <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
            <ram:SpecifiedTradePaymentTerms>
                <ram:DueDateDateTime>
                    <udt:DateTimeString format="102">{due_str}</udt:DateTimeString>
                </ram:DueDateDateTime>
            </ram:SpecifiedTradePaymentTerms>
            {tva_block}
            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                <ram:LineTotalAmount>{invoice.total_ht:.2f}</ram:LineTotalAmount>
                <ram:TaxBasisTotalAmount>{invoice.total_ht:.2f}</ram:TaxBasisTotalAmount>
                <ram:TaxTotalAmount currencyID="EUR">{round((invoice.total_ttc or 0) - (invoice.total_ht or 0), 2):.2f}</ram:TaxTotalAmount>
                <ram:GrandTotalAmount>{invoice.total_ttc:.2f}</ram:GrandTotalAmount>
                <ram:DuePayableAmount>{invoice.total_ttc:.2f}</ram:DuePayableAmount>
            </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        </ram:ApplicableHeaderTradeSettlement>
    </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>"""
    return xml.encode("utf-8")


def _esc(s):
    if not s:
        return ""
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def generate_pdf(invoice, contact) -> bytes:
    """Génère un PDF conforme avec toutes les mentions légales françaises."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)

    styles = getSampleStyleSheet()
    s_normal = ParagraphStyle("normal", fontName="Helvetica", fontSize=9, leading=13)
    s_small  = ParagraphStyle("small",  fontName="Helvetica", fontSize=7.5, leading=11, textColor=colors.HexColor("#555555"))
    s_bold   = ParagraphStyle("bold",   fontName="Helvetica-Bold", fontSize=9, leading=13)
    s_title  = ParagraphStyle("title",  fontName="Helvetica-Bold", fontSize=20, leading=26, textColor=colors.HexColor("#1a1a2e"))
    s_h2     = ParagraphStyle("h2",     fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=colors.HexColor("#1a1a2e"))
    s_right  = ParagraphStyle("right",  fontName="Helvetica", fontSize=9, leading=13, alignment=TA_RIGHT)
    s_center = ParagraphStyle("center", fontName="Helvetica", fontSize=8, leading=12, alignment=TA_CENTER, textColor=colors.HexColor("#777777"))
    s_legal  = ParagraphStyle("legal",  fontName="Helvetica-Oblique", fontSize=7.5, leading=11, textColor=colors.HexColor("#666666"))

    franchise = getattr(invoice, 'franchise_tva', True)
    nature    = invoice.nature_operation or 'prestation_services'
    date_fmt  = (invoice.date or datetime.utcnow()).strftime("%d/%m/%Y")
    due_fmt   = invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else "À réception"

    story = []

    # ── En-tête ──────────────────────────────────────────────────────────
    header_data = [[
        Paragraph(EMETTEUR["activite"].upper(), s_title),
        Paragraph(f"<b>FACTURE</b><br/>{invoice.number}", ParagraphStyle("inv_num",
            fontName="Helvetica-Bold", fontSize=14, leading=18, alignment=TA_RIGHT,
            textColor=colors.HexColor("#1a1a2e"))),
    ]]
    header_table = Table(header_data, colWidths=[95*mm, 85*mm])
    header_table.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(header_table)
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a1a2e")))
    story.append(Spacer(1, 5*mm))

    # ── Emetteur / Destinataire ──────────────────────────────────────────
    siren_client = (contact.siren if contact else '') or ''
    cp_ville_client = " ".join(filter(None, [
        getattr(contact, 'code_postal', '') or '',
        contact.ville if contact else ''
    ]))

    parties_data = [[
        Paragraph(
            f"<b>{EMETTEUR['nom']}</b><br/>"
            f"{EMETTEUR['activite']}<br/>"
            f"{EMETTEUR['adresse']}<br/>"
            f"SIREN : {EMETTEUR['siren']}<br/>"
            f"SIRET : {EMETTEUR['siret']}<br/>"
            f"{EMETTEUR['email']}", s_normal),
        Paragraph(
            f"<b>Facturé à</b><br/>"
            f"<b>{contact.nom if contact else '—'}</b><br/>"
            f"{contact.adresse or '' if contact else ''}<br/>"
            f"{cp_ville_client}<br/>"
            f"{'SIREN : ' + siren_client if siren_client else '<i>SIREN non renseigné</i>'}",
            s_normal),
    ]]
    parties_table = Table(parties_data, colWidths=[90*mm, 90*mm])
    parties_table.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BACKGROUND", (1,0), (1,0), colors.HexColor("#f8f9fa")),
        ("BOX", (1,0), (1,0), 0.5, colors.HexColor("#dee2e6")),
        ("LEFTPADDING", (1,0), (1,0), 8),
        ("RIGHTPADDING", (1,0), (1,0), 8),
        ("TOPPADDING", (1,0), (1,0), 6),
        ("BOTTOMPADDING", (1,0), (1,0), 6),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 6*mm))

    # ── Infos facture ────────────────────────────────────────────────────
    info_data = [
        ["Date d'émission", date_fmt, "Date d'échéance", due_fmt],
        ["Nature de l'opération", NATURE_LABELS.get(nature, nature), "Mode de paiement",
         MODE_PAIEMENT_LABELS.get(invoice.mode_paiement or 'virement', invoice.mode_paiement or '')],
    ]
    info_table = Table(info_data, colWidths=[45*mm, 50*mm, 45*mm, 40*mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME",  (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE",  (0,0), (-1,-1), 8.5),
        ("FONTNAME",  (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",  (2,0), (2,-1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#555555")),
        ("TEXTCOLOR", (2,0), (2,-1), colors.HexColor("#555555")),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LINEBELOW", (0,0), (-1,0), 0.3, colors.HexColor("#dee2e6")),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6*mm))

    # ── Lignes de facturation ────────────────────────────────────────────
    story.append(Paragraph("Détail de la prestation", s_h2))
    story.append(Spacer(1, 2*mm))

    lines_header = [["Description", "Qté", "P.U. HT", "TVA", "Total HT"]]
    lines_rows   = []
    for line in (invoice.lines or []):
        lines_rows.append([
            Paragraph(line.description or '', s_normal),
            str(line.quantity),
            f"{line.unit_price:,.2f} €".replace(",", " "),
            f"{line.vat_rate:.0f}%" if not franchise else "0%*",
            f"{(line.quantity * line.unit_price):,.2f} €".replace(",", " "),
        ])

    lines_data = lines_header + lines_rows
    col_w = [80*mm, 15*mm, 25*mm, 15*mm, 25*mm]
    lines_table = Table(lines_data, colWidths=col_w)
    lines_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("BACKGROUND",    (0,0), (-1,0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR",     (0,0), (-1,0), colors.white),
        ("ALIGN",         (1,0), (-1,-1), "RIGHT"),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING",   (0,0), (0,-1), 6),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, colors.HexColor("#f8f9fa")]),
        ("LINEBELOW",     (0,-1), (-1,-1), 0.5, colors.HexColor("#dee2e6")),
        ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#dee2e6")),
    ]))
    story.append(lines_table)
    story.append(Spacer(1, 4*mm))

    # ── Totaux ───────────────────────────────────────────────────────────
    tva_amount = round((invoice.total_ttc or 0) - (invoice.total_ht or 0), 2)
    totaux_data = [
        ["Total HT", f"{invoice.total_ht:,.2f} €".replace(",", " ")],
    ]
    if franchise:
        totaux_data.append(["TVA", "Non applicable (art. 293 B CGI)"])
    else:
        totaux_data.append(["TVA", f"{tva_amount:,.2f} €".replace(",", " ")])
    totaux_data.append(["TOTAL TTC", f"{invoice.total_ttc:,.2f} €".replace(",", " ")])

    totaux_table = Table(totaux_data, colWidths=[130*mm, 40*mm])
    totaux_table.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (-1,-2), "Helvetica"),
        ("FONTNAME",      (0,-1), (-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("ALIGN",         (1,0), (1,-1), "RIGHT"),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LINEABOVE",     (0,-1), (-1,-1), 1, colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR",     (0,-1), (-1,-1), colors.HexColor("#1a1a2e")),
        ("FONTSIZE",      (0,-1), (-1,-1), 10),
    ]))
    story.append(totaux_table)
    story.append(Spacer(1, 6*mm))

    # ── Notes ────────────────────────────────────────────────────────────
    if invoice.notes:
        story.append(Paragraph(f"<b>Notes :</b> {invoice.notes}", s_normal))
        story.append(Spacer(1, 4*mm))

    # ── Mentions légales ─────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 3*mm))

    legal_lines = [
        f"Micro-entrepreneur — SIREN {EMETTEUR['siren']} — SIRET {EMETTEUR['siret']}",
    ]
    if franchise:
        legal_lines.append("TVA non applicable, article 293 B du CGI.")
    legal_lines += [
        f"Paiement par {MODE_PAIEMENT_LABELS.get(invoice.mode_paiement or 'virement', '')} — Échéance : {due_fmt}",
        "En cas de retard de paiement, des pénalités de 3× le taux d'intérêt légal sont applicables (art. L441-10 C. com.).",
        "Pas d'escompte pour paiement anticipé. Indemnité forfaitaire de recouvrement : 40 €.",
        f"Document conforme Factur-X EN 16931 — Émis le {date_fmt}",
    ]
    for line in legal_lines:
        story.append(Paragraph(line, s_legal))

    doc.build(story)
    return buf.getvalue()


def generate_facturx(invoice, contact) -> bytes:
    """
    Génère un PDF Factur-X : PDF avec XML CII embarqué en pièce jointe.
    Utilise la librairie factur-x (Akretion).
    """
    pdf_bytes = generate_pdf(invoice, contact)
    xml_bytes = _xml_facturx(invoice, contact)

    try:
        from facturx import generate_from_binary
        result = generate_from_binary(
            pdf_bytes,
            xml_bytes,
            flavor="factur-x",
            level="EN 16931",
            check_xsd=False,
        )
        return result
    except Exception:
        # Fallback : PDF seul si l'embedding échoue
        return pdf_bytes
