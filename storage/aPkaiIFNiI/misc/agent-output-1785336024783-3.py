from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# API endpoint
@app.route("/products", methods=["GET"])
def get_products():
    # Veritabanından ürünleri getir
    products = get_products()
    return jsonify(products)

if __name__ == "__main__":
    app.run(debug=True)