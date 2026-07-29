import sqlite3

# Veritabanı bağlantısı
conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# Tablo oluşturma
cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL
    )
""")

# Veri ekleme
def add_product(name, price):
    cursor.execute("INSERT INTO products (name, price) VALUES (?, ?)", (name, price))
    conn.commit()

# Veri getirme
def get_products():
    cursor.execute("SELECT * FROM products")
    return cursor.fetchall()

if __name__ == "__main__":
    add_product("Ürün 1", 10.99)
    print(get_products())