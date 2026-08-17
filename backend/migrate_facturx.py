import sqlite3
conn = sqlite3.connect('crm.db')
cur = conn.cursor()

migrations = [
    ("contacts", "siren", "VARCHAR(14)"),
    ("contacts", "code_postal", "VARCHAR(10)"),
    ("invoices", "nature_operation", "VARCHAR(50) DEFAULT 'prestation_services'"),
    ("invoices", "adresse_livraison", "TEXT"),
    ("invoices", "franchise_tva", "BOOLEAN DEFAULT 1"),
    ("invoices", "mode_paiement", "VARCHAR(50) DEFAULT 'virement'"),
]

for table, col, typ in migrations:
    try:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {typ}")
        print(f"{table}.{col} OK")
    except Exception as e:
        print(f"{table}.{col}: {e}")

conn.commit()
conn.close()
print("Migration terminee")
