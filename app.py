"""
Palasa Cashew Delivery — Flask Application
Author: Syamala
"""
import sqlite3
import os
import random
import string
from datetime import datetime
from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for, session, g
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "cashew-secret-2024-syamala")

# ── Config ──────────────────────────────────────────────────────────────────
# On Render the filesystem is ephemeral; /tmp persists for the lifetime of the
# running instance and is writable. For local dev we use the project directory.
if os.environ.get("RENDER"):
    DATABASE = "/tmp/database.db"
else:
    DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "cashew@admin123")

PRODUCTS = {
    "1kg":  {"name": "1 KG Pack",        "price": 750},
    "2kg":  {"name": "2 KG Family Pack",  "price": 1400},
    "3kg":  {"name": "3 KG Value Pack",   "price": 2000},
    "5kg":  {"name": "5 KG Bulk Pack",    "price": 3200},
}

# ── Database helpers ─────────────────────────────────────────────────────────

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_db(exc):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    with app.app_context():
        db = get_db()
        db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id    TEXT UNIQUE NOT NULL,
                name        TEXT NOT NULL,
                phone       TEXT NOT NULL,
                address     TEXT NOT NULL,
                pack        TEXT NOT NULL,
                price       INTEGER NOT NULL,
                notes       TEXT DEFAULT '',
                status      TEXT DEFAULT 'Pending',
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.commit()


def generate_order_id():
    today = datetime.now().strftime("%Y%m%d")
    suffix = "".join(random.choices(string.digits, k=4))
    return f"PCW-{today}-{suffix}"


# ── Public routes ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html", products=PRODUCTS)


@app.route("/api/order", methods=["POST"])
def place_order():
    data = request.get_json(silent=True) or {}

    name    = (data.get("name") or "").strip()
    phone   = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    pack    = (data.get("pack") or "").strip()
    notes   = (data.get("notes") or "").strip()

    if not all([name, phone, address, pack]):
        return jsonify({"error": "All required fields must be filled."}), 400

    if pack not in PRODUCTS:
        return jsonify({"error": "Invalid pack selected."}), 400

    price    = PRODUCTS[pack]["price"]
    order_id = generate_order_id()

    db = get_db()
    db.execute(
        """INSERT INTO orders (order_id, name, phone, address, pack, price, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (order_id, name, phone, address, pack, price, notes)
    )
    db.commit()

    return jsonify({
        "success": True,
        "order_id": order_id,
        "pack": PRODUCTS[pack]["name"],
        "price": price
    }), 201


# ── Admin routes ──────────────────────────────────────────────────────────────

@app.route("/admin", methods=["GET", "POST"])
def admin():
    if request.method == "POST":
        password = request.form.get("password", "")
        if password == ADMIN_PASSWORD:
            session["admin"] = True
            return redirect(url_for("admin"))
        return render_template("admin.html", error="Incorrect password", logged_in=False)

    if not session.get("admin"):
        return render_template("admin.html", logged_in=False)

    return render_template("admin.html", logged_in=True)


@app.route("/admin/logout")
def admin_logout():
    session.pop("admin", None)
    return redirect(url_for("admin"))


@app.route("/api/orders")
def get_orders():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    q      = request.args.get("q", "").strip()
    status = request.args.get("status", "").strip()

    db = get_db()
    query  = "SELECT * FROM orders"
    params = []
    clauses = []

    if q:
        clauses.append("(name LIKE ? OR phone LIKE ? OR order_id LIKE ?)")
        params += [f"%{q}%", f"%{q}%", f"%{q}%"]
    if status:
        clauses.append("status = ?")
        params.append(status)

    if clauses:
        query += " WHERE " + " AND ".join(clauses)

    query += " ORDER BY created_at DESC"
    rows = db.execute(query, params).fetchall()
    orders = [dict(r) for r in rows]

    # Stats
    stats_rows = db.execute(
        "SELECT status, COUNT(*) as cnt FROM orders GROUP BY status"
    ).fetchall()
    stats = {"Total": len(db.execute("SELECT id FROM orders").fetchall()),
             "Pending": 0, "Packed": 0, "Delivered": 0}
    for r in stats_rows:
        stats[r["status"]] = r["cnt"]

    return jsonify({"orders": orders, "stats": stats})


@app.route("/api/orders/<int:order_id>/status", methods=["PATCH"])
def update_status(order_id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    data   = request.get_json(silent=True) or {}
    status = data.get("status", "").strip()
    valid  = ["Pending", "Packed", "Delivered"]

    if status not in valid:
        return jsonify({"error": "Invalid status"}), 400

    db = get_db()
    db.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    db.commit()
    return jsonify({"success": True})


# ── Database initialisation ──────────────────────────────────────────────────
# This block runs at module import time, so it is executed by both:
#   • Gunicorn / Render:  gunicorn app:app
#   • Local development:  python app.py
# The "with app.app_context()" ensures Flask's application context is active
# before we touch the database.
with app.app_context():
    init_db()

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
