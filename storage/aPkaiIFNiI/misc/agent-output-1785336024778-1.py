from flask import Flask, request
from flask_cors import CORS
from flask_helmet import Helmet

app = Flask(__name__)
CORS(app)
Helmet(app)

# DDOS koruma
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Hata işleyici
@app.errorhandler(404)
def page_not_found(e):
    return "Sayfa bulunamadı", 404

@app.errorhandler(500)
def internal_server_error(e):
    return "İç sunucu hatası", 500

if __name__ == "__main__":
    app.run(debug=True)