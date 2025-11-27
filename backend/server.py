from flask import Flask, request, jsonify, send_from_directory, Response
import json
import sqlite3
import os
import uuid
import hashlib
import mimetypes

# Intentar importar libsql_client para Turso
try:
    import libsql_client
    TURSO_AVAILABLE = True
except ImportError:
    TURSO_AVAILABLE = False

app = Flask(__name__, static_folder='../frontend')

# Configuración
DB_FILE = os.environ.get('DB_FILE', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'distribuciones.db'))
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')

# Configuración Turso
TURSO_URL = os.environ.get('TURSO_DATABASE_URL')
if TURSO_URL and TURSO_URL.startswith('libsql://'):
    TURSO_URL = TURSO_URL.replace('libsql://', 'https://')
TURSO_TOKEN = os.environ.get('TURSO_AUTH_TOKEN')

# Sesiones en memoria {token: user_id}
# NOTA: En Vercel (serverless), esto se reinicia. Para producción real se debería usar una DB o Redis.
# Para este caso de uso simple, aceptamos que el login se pierda al reiniciar la lambda.
SESSIONS = {}

# --- Database Abstraction ---

def get_db():
    """Retorna un objeto conexión unificado (Local o Turso)"""
    if 'db' not in g:
        if TURSO_AVAILABLE and TURSO_URL and TURSO_TOKEN:
            g.db = TursoDB()
        else:
            g.db = LocalDB()
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

class LocalDB:
    def close(self):
        pass # LocalDB abre y cierra por query

    def execute(self, query, params=()):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        try:
            c.execute(query, params)
            if query.strip().upper().startswith('SELECT'):
                return c.fetchall()
            conn.commit()
            return c.lastrowid
        finally:
            conn.close()

    def execute_many(self, query, params_list):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        try:
            c.executemany(query, params_list)
            conn.commit()
        finally:
            conn.close()

    def fetch_one(self, query, params=()):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        try:
            c.execute(query, params)
            return c.fetchone()
        finally:
            conn.close()

class TursoDB:
    def __init__(self):
        self.client = libsql_client.create_client_sync(url=TURSO_URL, auth_token=TURSO_TOKEN)

    def close(self):
        self.client.close()

    def execute(self, query, params=()):
        try:
            # Turso usa ? igual que sqlite
            rs = self.client.execute(query, params)
            if query.strip().upper().startswith('SELECT'):
                # Convertir filas a diccionarios para compatibilidad
                cols = list(rs.columns)
                results = []
                for row in rs.rows:
                    item = {}
                    for i, val in enumerate(row):
                        item[cols[i]] = val
                    results.append(item)
                return results
            return rs.last_insert_rowid
        except Exception as e:
            raise e

    def execute_many(self, query, params_list):
        # Turso client sync no tiene executemany nativo simple, iteramos
        try:
            for params in params_list:
                self.client.execute(query, params)
        except Exception as e:
            raise e

    def fetch_one(self, query, params=()):
        try:
            rs = self.client.execute(query, params)
            if not rs.rows:
                return None
            
            # Convertir a dict
            cols = list(rs.columns)
            row = rs.rows[0]
            item = {}
            for i, val in enumerate(row):
                item[cols[i]] = val
            return item
        except Exception as e:
            raise e

# --- Init DB ---
def init_db():
    db = get_db()
    print(f"Inicializando DB usando: {'TURSO' if isinstance(db, TursoDB) else 'LOCAL SQLITE'}")
    
    try:
        # Tablas
        db.execute('CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS distribuciones (id INTEGER PRIMARY KEY AUTOINCREMENT, mes INTEGER, anio INTEGER, data TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
        db.execute('CREATE TABLE IF NOT EXISTS establecimientos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL, boxes INTEGER DEFAULT 1, restriccion TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS profesionales (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, profesion TEXT NOT NULL, establecimientos TEXT, obs TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS rondas_minimas (id INTEGER PRIMARY KEY AUTOINCREMENT, profesion TEXT NOT NULL, establecimiento TEXT NOT NULL, cantidad INTEGER DEFAULT 0)')

        # Seed Admin
        res = db.fetch_one('SELECT count(*) as c FROM usuarios')
        count = res['c'] if isinstance(res, dict) else res[0]
        if count == 0:
            print("Seeding admin user...")
            pwd_hash = hashlib.sha256("cesfam2025".encode()).hexdigest()
            db.execute('INSERT INTO usuarios (username, password) VALUES (?, ?)', ('admin', pwd_hash))

        # Seed Establecimientos
        res = db.fetch_one('SELECT count(*) as c FROM establecimientos')
        count = res['c'] if isinstance(res, dict) else res[0]
        if count == 0:
            print("Seeding establecimientos...")
            establecimientos = [
                ('NONTUELA', 6, None), ('LLIFEN', 4, None), ('MAIHUE', 4, None),
                ('CURRIÑE', 4, None), ('CHABRANCO', 4, 'LUNES_A_JUEVES'),
                ('HUEINAHUE', 3, 'SOLO_MIERCOLES'), ('ARQUILHUE', 3, None),
                ('ISLA HUAPI', 3, 'MARTES_Y_JUEVES_1_3'), ('CECOSF', 5, None),
                ('LONCOPAN', 5, None), ('LAS QUEMAS', 2, None), ('CAUNAHUE', 2, None)
            ]
            db.execute_many('INSERT INTO establecimientos (nombre, boxes, restriccion) VALUES (?, ?, ?)', establecimientos)

        # Seed Profesionales
        res = db.fetch_one('SELECT count(*) as c FROM profesionales')
        count = res['c'] if isinstance(res, dict) else res[0]
        if count == 0:
            print("Seeding profesionales...")
            profesionales = [
                ('ROBERTO', 'MEDICO', '["CECOSF", "LONCOPAN"]', None),
                ('FABIAN', 'MEDICO', '["ISLA HUAPI"]', None),
                ('EMILIO', 'MEDICO', '["LLIFEN", "ARQUILHUE", "CAUNAHUE"]', None),
                ('CANELO', 'MEDICO', '["CURRIÑE", "MAIHUE", "CHABRANCO", "HUEINAHUE"]', None),
                ('DRA. CARO', 'MEDICO', '["NONTUELA", "LAS QUEMAS"]', None),
                ('DR. SEBA', 'MEDICO', '["NONTUELA"]', None),
                ('STEPHANIE', 'MATRON', '["CECOSF", "LONCOPAN", "ISLA HUAPI"]', None),
                ('MATRONA NONTUELA', 'MATRON', '["NONTUELA"]', None),
                ('VALERIA', 'ODONTOLOGO', '["LLIFEN"]', 'SOLO ASISTE LUNES MARTES Y MIERCOLES'),
                ('JUAN PABLO', 'ODONTOLOGO', '["LLIFEN", "CURRIÑE", "MAIHUE", "HUEINAHUE"]', 'SOLO ASISTE JUEVES Y VIERNES'),
                ('ODONT. NONTUELA', 'ODONTOLOGO', '["NONTUELA"]', None),
                ('ENF. NONTUELA', 'ENFERMERO', '["NONTUELA"]', None),
                ('A. SOCIAL NONTUELA', 'ASISTENTE_SOCIAL', '["NONTUELA"]', None),
                ('NUTRI NONTUELA', 'NUTRICIONISTA', '["NONTUELA"]', None),
                ('PSICO NONTUELA', 'PSICOLOGO', '["NONTUELA"]', None)
            ]
            db.execute_many('INSERT INTO profesionales (nombre, profesion, establecimientos, obs) VALUES (?, ?, ?, ?)', profesionales)

        # Seed Rondas
        res = db.fetch_one('SELECT count(*) as c FROM rondas_minimas')
        count = res['c'] if isinstance(res, dict) else res[0]
        if count == 0:
            print("Seeding rondas minimas...")
            rondas = [
                ('MEDICO', 'CECOSF', 15), ('MEDICO', 'LONCOPAN', 15), ('MEDICO', 'ISLA HUAPI', 4),
                ('MEDICO', 'HUEINAHUE', 4), ('MEDICO', 'LLIFEN', 10), ('MEDICO', 'CURRIÑE', 8),
                ('MEDICO', 'MAIHUE', 8), ('MEDICO', 'NONTUELA', 20), ('MEDICO', 'LAS QUEMAS', 4),
                ('MEDICO', 'ARQUILHUE', 4), ('MEDICO', 'CAUNAHUE', 4),
                ('MATRON', 'CECOSF', 10), ('MATRON', 'LONCOPAN', 10), ('MATRON', 'ISLA HUAPI', 4),
                ('MATRON', 'NONTUELA', 15),
                ('ODONTOLOGO', 'LLIFEN', 12), ('ODONTOLOGO', 'CURRIÑE', 6),
                ('ODONTOLOGO', 'MAIHUE', 6), ('ODONTOLOGO', 'NONTUELA', 15),
                ('ENFERMERO', 'NONTUELA', 20), ('NUTRICIONISTA', 'NONTUELA', 10),
                ('PSICOLOGO', 'NONTUELA', 10), ('ASISTENTE_SOCIAL', 'NONTUELA', 10)
            ]
            db.execute_many('INSERT INTO rondas_minimas (profesion, establecimiento, cantidad) VALUES (?, ?, ?)', rondas)

    except Exception as e:
        print(f"Error inicializando base de datos: {e}")

# Ejecutar init_db al inicio (en Vercel esto corre al arrancar la instancia)
init_db()

# --- Auth Helper ---
def check_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return False
    try:
        token = auth_header.split(' ')[1]
        return token in SESSIONS
    except:
        return False

# --- Routes ---

@app.route('/api/health', methods=['GET'])
def health():
    db = get_db()
    db_type = 'TURSO' if isinstance(db, TursoDB) else 'LOCAL SQLITE'
    
    try:
        # Usuarios
        res = db.fetch_one('SELECT count(*) as c FROM usuarios')
        user_count = res['c'] if isinstance(res, dict) else res[0]
        
        # Establecimientos
        res = db.fetch_one('SELECT count(*) as c FROM establecimientos')
        estab_count = res['c'] if isinstance(res, dict) else res[0]
        
        # Profesionales
        res = db.fetch_one('SELECT count(*) as c FROM profesionales')
        prof_count = res['c'] if isinstance(res, dict) else res[0]
        
        status = "OK"
    except Exception as e:
        user_count = -1
        estab_count = -1
        prof_count = -1
        status = str(e)

    return jsonify({
        "status": status,
        "db_type": db_type,
        "turso_available": TURSO_AVAILABLE,
        "counts": {
            "usuarios": user_count,
            "establecimientos": estab_count,
            "profesionales": prof_count
        }
    })

@app.route('/api/seed', methods=['GET'])
@app.route('/api/seed', methods=['GET'])
def seed():
    log = []
    try:
        db = get_db()
        log.append(f"DB Type: {'TURSO' if isinstance(db, TursoDB) else 'LOCAL'}")
        
        # 1. Usuarios (Solo creamos el admin si no existe)
        res = db.fetch_one('SELECT count(*) as c FROM usuarios')
        count = res['c'] if isinstance(res, dict) else res[0]
        if count == 0:
            pwd_hash = hashlib.sha256("cesfam2025".encode()).hexdigest()
            db.execute('INSERT INTO usuarios (username, password) VALUES (?, ?)', ('admin', pwd_hash))
            log.append("Admin user inserted")
        else:
            log.append(f"Usuarios exists ({count})")

        return jsonify({"status": "completed", "log": log})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e), "log": log}), 500



@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    pwd_hash = hashlib.sha256(password.encode()).hexdigest()
    
    db = get_db()
    user = db.fetch_one('SELECT id FROM usuarios WHERE username = ? AND password = ?', (username, pwd_hash))
    
    if user:
        token = str(uuid.uuid4())
        user_id = user['id'] if isinstance(user, dict) else user[0]
        SESSIONS[token] = user_id
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Credenciales inválidas"}), 401

@app.route('/api/distribuciones', methods=['GET', 'POST', 'DELETE'])
def distribuciones():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    db = get_db()

    if request.method == 'GET':
        rows = db.execute('SELECT * FROM distribuciones ORDER BY anio DESC, mes DESC')
        results = []
        for row in rows:
            item = dict(row) if not isinstance(row, dict) else row
            if 'data' in item:
                json_data = json.loads(item['data'])
                json_data['db_id'] = item['id']
                results.append(json_data)
        return jsonify(results)

    if request.method == 'POST':
        data = request.json
        mes = data.get('mes')
        anio = data.get('anio')
        existing = db.fetch_one('SELECT id FROM distribuciones WHERE mes = ? AND anio = ?', (mes, anio))
        
        if existing:
            id_val = existing['id'] if isinstance(existing, dict) else existing[0]
            db.execute('UPDATE distribuciones SET data = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', (json.dumps(data), id_val))
        else:
            db.execute('INSERT INTO distribuciones (mes, anio, data) VALUES (?, ?, ?)', (mes, anio, json.dumps(data)))
        return jsonify({"status": "ok"})

    if request.method == 'DELETE':
        mes = request.args.get('mes')
        anio = request.args.get('anio')
        db.execute('DELETE FROM distribuciones WHERE mes = ? AND anio = ?', (mes, anio))
        return jsonify({"status": "ok"})

@app.route('/api/establecimientos', methods=['GET', 'POST', 'DELETE'])
def establecimientos():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    db = get_db()

    if request.method == 'GET':
        rows = db.execute('SELECT * FROM establecimientos ORDER BY nombre')
        results = []
        for row in rows:
            item = dict(row) if not isinstance(row, dict) else row
            if 'id' in item: item['db_id'] = item['id']
            results.append(item)
        return jsonify(results)

    if request.method == 'POST':
        data = request.json
        if 'id' in data:
            db.execute('UPDATE establecimientos SET nombre=?, boxes=?, restriccion=? WHERE id=?', 
                      (data['nombre'], data['boxes'], data['restriccion'], data['id']))
        else:
            db.execute('INSERT INTO establecimientos (nombre, boxes, restriccion) VALUES (?, ?, ?)', 
                      (data['nombre'], data['boxes'], data['restriccion']))
        return jsonify({"status": "ok"})

@app.route('/api/establecimientos', methods=['GET', 'POST', 'DELETE'])
def establecimientos():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    try:
        db = get_db()

        if request.method == 'GET':
            rows = db.execute('SELECT * FROM establecimientos ORDER BY nombre')
            results = []
            for row in rows:
                item = dict(row) if not isinstance(row, dict) else row
                if 'id' in item: item['db_id'] = item['id']
                results.append(item)
            return jsonify(results)

        if request.method == 'POST':
            data = request.json
            if 'id' in data:
                db.execute('UPDATE establecimientos SET nombre=?, boxes=?, restriccion=? WHERE id=?', 
                          (data['nombre'], data['boxes'], data['restriccion'], data['id']))
            else:
                db.execute('INSERT INTO establecimientos (nombre, boxes, restriccion) VALUES (?, ?, ?)', 
                          (data['nombre'], data['boxes'], data['restriccion']))
            return jsonify({"status": "ok"})

        if request.method == 'DELETE':
            id = request.args.get('id')
            db.execute('DELETE FROM establecimientos WHERE id = ?', (id,))
            return jsonify({"status": "ok"})
    except Exception as e:
        print(f"Error in establecimientos: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/profesionales', methods=['GET', 'POST', 'DELETE'])
def profesionales():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    try:
        db = get_db()

        if request.method == 'GET':
            rows = db.execute('SELECT * FROM profesionales ORDER BY nombre')
            results = []
            for row in rows:
                item = dict(row) if not isinstance(row, dict) else row
                if 'id' in item: item['db_id'] = item['id']
                if 'establecimientos' in item and isinstance(item['establecimientos'], str):
                    try: item['establecimientos'] = json.loads(item['establecimientos'])
                    except: pass
                results.append(item)
            return jsonify(results)

        if request.method == 'POST':
            data = request.json
            estabs_json = json.dumps(data['establecimientos'])
            if 'id' in data:
                db.execute('UPDATE profesionales SET nombre=?, profesion=?, establecimientos=?, obs=? WHERE id=?', 
                          (data['nombre'], data['profesion'], estabs_json, data['obs'], data['id']))
            else:
                db.execute('INSERT INTO profesionales (nombre, profesion, establecimientos, obs) VALUES (?, ?, ?, ?)', 
                          (data['nombre'], data['profesion'], estabs_json, data['obs']))
            return jsonify({"status": "ok"})

        if request.method == 'DELETE':
            id = request.args.get('id')
            db.execute('DELETE FROM profesionales WHERE id = ?', (id,))
            return jsonify({"status": "ok"})
    except Exception as e:
        print(f"Error in profesionales: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/reset', methods=['POST'])
def reset_db():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    try:
        db = get_db()
        # Delete all data but keep admin user
        db.execute('DELETE FROM establecimientos')
        db.execute('DELETE FROM profesionales')
        db.execute('DELETE FROM rondas_minimas')
        db.execute('DELETE FROM distribuciones')
        return jsonify({"status": "cleared"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/rondas', methods=['GET', 'POST', 'DELETE'])
def rondas():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    db = get_db()

    if request.method == 'GET':
        rows = db.execute('SELECT * FROM rondas_minimas')
        results = []
        for row in rows:
            item = dict(row) if not isinstance(row, dict) else row
            if 'id' in item: item['db_id'] = item['id']
            results.append(item)
        return jsonify(results)

    if request.method == 'POST':
        data = request.json
        if 'id' in data:
            db.execute('UPDATE rondas_minimas SET profesion=?, establecimiento=?, cantidad=? WHERE id=?', 
                      (data['profesion'], data['establecimiento'], data['cantidad'], data['id']))
        else:
            db.execute('INSERT INTO rondas_minimas (profesion, establecimiento, cantidad) VALUES (?, ?, ?)', 
                      (data['profesion'], data['establecimiento'], data['cantidad']))
        return jsonify({"status": "ok"})

    if request.method == 'DELETE':
        id = request.args.get('id')
        db.execute('DELETE FROM rondas_minimas WHERE id = ?', (id,))
        return jsonify({"status": "ok"})

# --- Static Files (Fallback para desarrollo local) ---
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
