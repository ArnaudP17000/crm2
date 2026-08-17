"""Envoi d'emails via Mailjet — devis et factures."""
import os, base64
from mailjet_rest import Client

def _client():
    return Client(
        auth=(os.getenv('MAILJET_API_KEY'), os.getenv('MAILJET_SECRET_KEY')),
        version='v3.1'
    )

def _from():
    return {
        "Email": os.getenv('MAILJET_FROM_EMAIL', 'contact@surf-atlantique.fr'),
        "Name":  os.getenv('MAILJET_FROM_NAME', 'surf-atlantique.fr'),
    }

def send_quote(quote, contact, pdf_bytes: bytes) -> dict:
    """Envoie le devis par email avec le PDF en pièce jointe."""
    if not contact or not contact.email:
        raise ValueError("Ce contact n'a pas d'adresse email")

    subject = f"Devis {quote.number} — surf-atlantique.fr"
    body_html = f"""
    <p>Bonjour,</p>
    <p>Veuillez trouver ci-joint le devis <strong>{quote.number}</strong>
    d'un montant de <strong>{quote.total_ttc:,.2f} €</strong>.</p>
    {"<p>Validité : jusqu'au " + quote.validity_date.strftime('%d/%m/%Y') + "</p>" if quote.validity_date else ""}
    {"<p><em>" + quote.notes + "</em></p>" if quote.notes else ""}
    <p>Pour accepter ce devis, retournez-le signé avec la mention « Bon pour accord ».</p>
    <br/>
    <p>Cordialement,<br/>Arnaud Phéloup<br/>
    <a href="https://www.surf-atlantique.fr">surf-atlantique.fr</a></p>
    """

    data = {
        "Messages": [{
            "From": _from(),
            "To": [{"Email": contact.email, "Name": contact.nom}],
            "Subject": subject,
            "HTMLPart": body_html,
            "Attachments": [{
                "ContentType":   "application/pdf",
                "Filename":      f"{quote.number}.pdf",
                "Base64Content": base64.b64encode(pdf_bytes).decode(),
            }],
        }]
    }
    result = _client().send.create(data=data)
    if result.status_code not in (200, 201):
        raise RuntimeError(f"Mailjet erreur {result.status_code}: {result.json()}")
    return {"sent": True, "to": contact.email}


def send_invoice(invoice, contact, pdf_bytes: bytes) -> dict:
    """Envoie la facture Factur-X par email avec le PDF en pièce jointe."""
    if not contact or not contact.email:
        raise ValueError("Ce contact n'a pas d'adresse email")

    due_str = invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else "à réception"
    subject = f"Facture {invoice.number} — surf-atlantique.fr"
    body_html = f"""
    <p>Bonjour,</p>
    <p>Veuillez trouver ci-joint la facture <strong>{invoice.number}</strong>
    d'un montant de <strong>{invoice.total_ttc:,.2f} €</strong> TTC,
    à régler par {invoice.mode_paiement or 'virement'} avant le <strong>{due_str}</strong>.</p>
    {"<p><em>" + invoice.notes + "</em></p>" if invoice.notes else ""}
    <p>Ce document est au format <strong>Factur-X</strong> (PDF/A-3 avec données XML intégrées),
    conforme à la réglementation française de facturation électronique.</p>
    <br/>
    <p>Cordialement,<br/>Arnaud Phéloup<br/>
    <a href="https://www.surf-atlantique.fr">surf-atlantique.fr</a></p>
    """

    data = {
        "Messages": [{
            "From": _from(),
            "To": [{"Email": contact.email, "Name": contact.nom}],
            "Subject": subject,
            "HTMLPart": body_html,
            "Attachments": [{
                "ContentType":   "application/pdf",
                "Filename":      f"{invoice.number}.pdf",
                "Base64Content": base64.b64encode(pdf_bytes).decode(),
            }],
        }]
    }
    result = _client().send.create(data=data)
    if result.status_code not in (200, 201):
        raise RuntimeError(f"Mailjet erreur {result.status_code}: {result.json()}")
    return {"sent": True, "to": contact.email}
