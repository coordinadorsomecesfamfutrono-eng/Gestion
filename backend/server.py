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

# --- Database Abstraction ---

def get_db():
    """Retorna un objeto conexión unificado (Local o Turso)"""
    if TURSO_AVAILABLE and TURSO_URL and TURSO_TOKEN:
        return TursoDB()
    return LocalDB()

class LocalDB:
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
        # SOLO crear tablas - SIN seeds para evitar timeouts
        db.execute('CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS distribuciones (id INTEGER PRIMARY KEY AUTOINCREMENT, mes INTEGER, anio INTEGER, data TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
        db.execute('CREATE TABLE IF NOT EXISTS establecimientos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL, boxes INTEGER DEFAULT 1, restriccion TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS profesionales (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, profesion TEXT NOT NULL, establecimientos TEXT, obs TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS rondas_minimas (id INTEGER PRIMARY KEY AUTOINCREMENT, profesion TEXT NOT NULL, establecimiento TEXT NOT NULL, cantidad INTEGER DEFAULT 0)')
        print("Tablas creadas exitosamente")
    except Exception as e:
        print(f"Error inicializando base de datos: {e}")

# DESACTIVADO TEMPORALMENTE - causando problemas de timeout
# init_db()

# --- Diagnostic & Setup Endpoints ---
@app.route('/api/ping', methods=['GET'])
def ping():
    """Endpoint minimo para verificar que el servidor esta vivo"""
    return jsonify({"status": "alive", "message": "Server is running"})

@app.route('/api/init-tables', methods=['GET'])
def init_tables():
    """Crear todas las tablas - llamar UNA VEZ"""
    try:
        db = get_db()
        # Crear tablas con campo role en usuarios
        db.execute('CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT \'user\')')
        db.execute('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
        db.execute('CREATE TABLE IF NOT EXISTS distribuciones (id INTEGER PRIMARY KEY AUTOINCREMENT, mes INTEGER, anio INTEGER, data TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
        db.execute('CREATE TABLE IF NOT EXISTS establecimientos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL, boxes INTEGER DEFAULT 1, restriccion TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS profesionales (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, profesion TEXT NOT NULL, establecimientos TEXT, obs TEXT)')
        db.execute('CREATE TABLE IF NOT EXISTS rondas_minimas (id INTEGER PRIMARY KEY AUTOINCREMENT, profesion TEXT NOT NULL, establecimiento TEXT NOT NULL, cantidad INTEGER DEFAULT 0)')
        
        # Migración: agregar campo role a usuarios existentes si falta
        try:
            db.execute('ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT \'user\'')
        except Exception as migration_error:
            # Columna ya existe, ignorar
            pass
        
        # Asegurar que admin tiene role='admin'
        db.execute('UPDATE usuarios SET role = \'admin\' WHERE username = \'admin\'')
        
        return jsonify({"status": "ok", "message": "All tables created successfully"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# --- Auth Helpers ---
def check_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return False
    
    try:
        token = auth_header.replace('Bearer ', '')
        # Buscar token en la base de datos
        db = get_db()
        session = db.fetch_one('SELECT user_id FROM sessions WHERE token = ?', (token,))
        return session is not None
    except:
        return False

def get_current_user_id():
    """Retorna el user_id del usuario autenticado actual, o None"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    try:
        token = auth_header.replace('Bearer ', '')
        db = get_db()
        session = db.fetch_one('SELECT user_id FROM sessions WHERE token = ?', (token,))
        if session:
            return session['user_id'] if isinstance(session, dict) else session[0]
        return None
    except:
        return None

def check_admin():
    """Verifica si el usuario autenticado actual es admin"""
    user_id = get_current_user_id()
    if not user_id:
        return False
    
    try:
        db = get_db()
        user = db.fetch_one('SELECT role FROM usuarios WHERE id = ?', (user_id,))
        if user:
            role = user['role'] if isinstance(user, dict) else user[0]
            return role == 'admin'
        return False
    except:
        return False


# --- Routes ---

@app.route('/api/health', methods=['GET'])
def health():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    
    db_type = "TURSO" if (TURSO_AVAILABLE and TURSO_URL and TURSO_TOKEN) else "LOCAL SQLITE"
    try:
        db = get_db()
        
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


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    pwd_hash = hashlib.sha256(password.encode()).hexdigest()
    
    db = get_db()
    user = db.fetch_one('SELECT id, username, role FROM usuarios WHERE username = ? AND password = ?', (username, pwd_hash))
    
    if user:
        token = str(uuid.uuid4())
        user_dict = dict(user) if not isinstance(user, dict) else user
        user_id = user_dict.get('id') or user[0]
        user_name = user_dict.get('username') or user[1]
        user_role = user_dict.get('role') or user[2] or 'user'
        
        # Guardar sesión en la base de datos
        db.execute('INSERT OR REPLACE INTO sessions (token, user_id) VALUES (?, ?)', (token, user_id))
        return jsonify({"token": token, "username": user_name, "role": user_role})
    else:
        return jsonify({"error": "Credenciales inválidas"}), 401

# --- User Management Endpoints ---

@app.route('/api/usuarios', methods=['GET'])
def list_usuarios():
    """Listar todos los usuarios (solo admin)"""
    if not check_admin(): 
        return jsonify({"error": "Unauthorized - Admin only"}), 403
    
    try:
        db = get_db()
        rows = db.execute('SELECT id, username, role FROM usuarios ORDER BY username')
        users = []
        for row in rows:
            user = dict(row) if not isinstance(row, dict) else row
            users.append({
                "id": user.get('id'),
                "username": user.get('username'),
                "role": user.get('role') or 'user'
            })
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/usuarios', methods=['POST'])
def create_usuario():
    """Crear nuevo usuario (solo admin)"""
    if not check_admin(): 
        return jsonify({"error": "Unauthorized - Admin only"}), 403
    
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'user')
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        if role not in ['admin', 'user']:
            return jsonify({"error": "Role must be 'admin' or 'user'"}), 400
        
        pwd_hash = hashlib.sha256(password.encode()).hexdigest()
        db = get_db()
        db.execute('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)', 
                   (username, pwd_hash, role))
        
        return jsonify({"status": "ok", "message": f"Usuario {username} creado exitosamente"})
    except Exception as e:
        error_msg = str(e)
        if "UNIQUE constraint" in error_msg:
            return jsonify({"error": "El usuario ya existe"}), 400
        return jsonify({"error": error_msg}), 500

@app.route('/api/usuarios', methods=['DELETE'])
def delete_usuario():
    """Eliminar usuario (solo admin)"""
    if not check_admin(): 
        return jsonify({"error": "Unauthorized - Admin only"}), 403
    
    try:
        user_id = request.args.get('id')
        if not user_id:
            return jsonify({"error": "User ID required"}), 400
        
        db = get_db()
        
        # Prevenir eliminación del último admin
        admin_count = db.fetch_one('SELECT count(*) as c FROM usuarios WHERE role = ?', ('admin',))
        count = admin_count['c'] if isinstance(admin_count, dict) else admin_count[0]
        
        user_to_delete = db.fetch_one('SELECT role FROM usuarios WHERE id = ?', (user_id,))
        if user_to_delete:
            role = user_to_delete['role'] if isinstance(user_to_delete, dict) else user_to_delete[0]
            if role == 'admin' and count <= 1:
                return jsonify({"error": "No puedes eliminar el último administrador"}), 400
        
        # Eliminar usuario y sus sesiones
        db.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
        db.execute('DELETE FROM usuarios WHERE id = ?', (user_id,))
        
        return jsonify({"status": "ok", "message": "Usuario eliminado"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cambiar-password', methods=['POST'])
def cambiar_password():
    """Cambiar contraseña del usuario autenticado"""
    if not check_auth(): 
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401
        
        data = request.json
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            return jsonify({"error": "Se requieren ambas contraseñas"}), 400
        
        # Verificar contraseña antigua
        old_pwd_hash = hashlib.sha256(old_password.encode()).hexdigest()
        db = get_db()
        user = db.fetch_one('SELECT id FROM usuarios WHERE id = ? AND password = ?', (user_id, old_pwd_hash))
        
        if not user:
            return jsonify({"error": "Contraseña antigua incorrecta"}), 400
        
        # Actualizar contraseña
        new_pwd_hash = hashlib.sha256(new_password.encode()).hexdigest()
        db.execute('UPDATE usuarios SET password = ? WHERE id = ?', (new_pwd_hash, user_id))
        
        return jsonify({"status": "ok", "message": "Contraseña cambiada exitosamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Quick user creation endpoint (temporary workaround)
@app.route('/api/crear-usuario-simple', methods=['GET'])
def crear_usuario_simple():
    """Crear usuario desde URL - solo para admin"""
    if not check_admin():
        return jsonify({"error": "Solo administradores pueden crear usuarios"}), 403
    
    usuario = request.args.get('usuario')
    password = request.args.get('password')
    role = request.args.get('role', 'user')
    
    if not usuario or not password:
        return jsonify({
            "error": "Faltan parámetros",
            "uso": "/api/crear-usuario-simple?usuario=nombre&password=pass&role=user"
        }), 400
    
    if role not in ['admin', 'user']:
        return jsonify({"error": "role debe ser 'admin' o 'user'"}), 400
    
    try:
        pwd_hash = hashlib.sha256(password.encode()).hexdigest()
        db = get_db()
        db.execute('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)', 
                   (usuario, pwd_hash, role))
        return jsonify({
            "status": "ok",
            "mensaje": f"✅ Usuario '{usuario}' creado exitosamente",
            "role": role,
            "password_original": password
        })
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            return jsonify({"error": f"El usuario '{usuario}' ya existe"}), 400
        return jsonify({"error": str(e)}), 500
        return jsonify({"error": str(e)}), 500


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
