import http.server
import socketserver
import json
import sqlite3
import os
import mimetypes
import uuid
import hashlib
from urllib.parse import urlparse, parse_qs

# Configuración
PORT = int(os.environ.get('PORT', 8000))
DB_FILE = os.environ.get('DB_FILE', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'distribuciones.db'))
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')

# Sesiones en memoria {token: user_id}
SESSIONS = {}

# Inicializar Base de Datos
def init_db():
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Tabla Usuarios
        c.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL -- Hash SHA256
            )
        ''')

        # Tabla Distribuciones (Historial)
        c.execute('''
            CREATE TABLE IF NOT EXISTS distribuciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mes INTEGER,
                anio INTEGER,
                data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Tabla Establecimientos
        c.execute('''
            CREATE TABLE IF NOT EXISTS establecimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE NOT NULL,
                boxes INTEGER DEFAULT 1,
                restriccion TEXT
            )
        ''')

        # Tabla Profesionales
        c.execute('''
            CREATE TABLE IF NOT EXISTS profesionales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                profesion TEXT NOT NULL,
                establecimientos TEXT, -- JSON array de nombres
                obs TEXT
            )
        ''')

        # Tabla Rondas Mínimas
        c.execute('''
            CREATE TABLE IF NOT EXISTS rondas_minimas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profesion TEXT NOT NULL,
                establecimiento TEXT NOT NULL,
                cantidad INTEGER DEFAULT 0
            )
        ''')

        # Seed Admin User
        c.execute('SELECT count(*) FROM usuarios')
        if c.fetchone()[0] == 0:
            print("Seeding admin user...")
            # Password: 'admin' (SHA256)
            # echo -n "admin" | shasum -a 256
            # 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
            # Usaremos 'cesfam2025' como acordado en el plan
            # echo -n "cesfam2025" | shasum -a 256
            # 05152a303634374352735647596c5a303541
            # Wait, let's just use python hashlib here to be sure
            pwd_hash = hashlib.sha256("cesfam2025".encode()).hexdigest()
            c.execute('INSERT INTO usuarios (username, password) VALUES (?, ?)', ('admin', pwd_hash))

        # Seed Data (Datos Iniciales) si las tablas están vacías
        c.execute('SELECT count(*) FROM establecimientos')
        if c.fetchone()[0] == 0:
            print("Seeding establecimientos...")
            establecimientos = [
                ('NONTUELA', 6, None), ('LLIFEN', 4, None), ('MAIHUE', 4, None),
                ('CURRIÑE', 4, None), ('CHABRANCO', 4, 'LUNES_A_JUEVES'),
                ('HUEINAHUE', 3, 'SOLO_MIERCOLES'), ('ARQUILHUE', 3, None),
                ('ISLA HUAPI', 3, 'MARTES_Y_JUEVES_1_3'), ('CECOSF', 5, None),
                ('LONCOPAN', 5, None), ('LAS QUEMAS', 2, None), ('CAUNAHUE', 2, None)
            ]
            c.executemany('INSERT INTO establecimientos (nombre, boxes, restriccion) VALUES (?, ?, ?)', establecimientos)

        c.execute('SELECT count(*) FROM profesionales')
        if c.fetchone()[0] == 0:
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
            c.executemany('INSERT INTO profesionales (nombre, profesion, establecimientos, obs) VALUES (?, ?, ?, ?)', profesionales)

        c.execute('SELECT count(*) FROM rondas_minimas')
        if c.fetchone()[0] == 0:
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
            c.executemany('INSERT INTO rondas_minimas (profesion, establecimiento, cantidad) VALUES (?, ?, ?)', rondas)

        conn.commit()
        conn.close()
        print(f"Base de datos {DB_FILE} inicializada y poblada correctamente.")
    except Exception as e:
        print(f"Error inicializando base de datos: {e}")

class Handler(http.server.SimpleHTTPRequestHandler):
    def check_auth(self):
        auth_header = self.headers.get('Authorization')
        if not auth_header:
            return False
        
        try:
            # Bearer <token>
            token = auth_header.split(' ')[1]
            return token in SESSIONS
        except:
            return False

    def do_GET(self):
        # API: Obtener historial
        if self.path.startswith('/api/distribuciones'):
            if not self.check_auth():
                self.send_error(401, "Unauthorized")
                return
            self.handle_get_query('SELECT * FROM distribuciones ORDER BY anio DESC, mes DESC')
            return

        # API: Obtener Establecimientos
        if self.path.startswith('/api/establecimientos'):
            if not self.check_auth():
                self.send_error(401, "Unauthorized")
                return
            self.handle_get_query('SELECT * FROM establecimientos ORDER BY nombre')
            return

        # API: Obtener Profesionales
        if self.path.startswith('/api/profesionales'):
            if not self.check_auth():
                self.send_error(401, "Unauthorized")
                return
            self.handle_get_query('SELECT * FROM profesionales ORDER BY nombre')
            return

        # API: Obtener Rondas Mínimas
        if self.path.startswith('/api/rondas'):
            if not self.check_auth():
                self.send_error(401, "Unauthorized")
                return
            self.handle_get_query('SELECT * FROM rondas_minimas')
            return

        # Servir archivos estáticos
        # Parsear URL para quitar query params (?v=2, etc)
        parsed_path = urlparse(self.path)
        clean_path = parsed_path.path

        if clean_path == '/':
            clean_path = '/index.html'
            
        file_path = os.path.join(FRONTEND_DIR, clean_path.lstrip('/'))
        
        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            mimetype, _ = mimetypes.guess_type(file_path)
            if mimetype:
                self.send_header('Content-type', mimetype)
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, "Archivo no encontrado")

    def handle_get_query(self, query):
        try:
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute(query)
            rows = c.fetchall()
            
            results = []
            for row in rows:
                item = dict(row)
                
                # Caso especial: Distribuciones (todo en 'data')
                if 'data' in item:
                    json_data = json.loads(item['data'])
                    json_data['db_id'] = row['id']
                    results.append(json_data)
                    continue

                # Caso normal: Tablas estructuradas
                # Usar el ID del dict ya convertido
                if 'id' in item:
                    item['db_id'] = item['id']
                
                # Parsear JSON fields si existen (ej: establecimientos en profesionales)
                if 'establecimientos' in item and isinstance(item['establecimientos'], str):
                    try:
                        item['establecimientos'] = json.loads(item['establecimientos'])
                    except:
                        pass 
                
                results.append(item)
            
            conn.close()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(results).encode())
        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        # API: Login (Pública)
        if self.path == '/api/login':
            username = data.get('username')
            password = data.get('password')
            
            # Hash password
            pwd_hash = hashlib.sha256(password.encode()).hexdigest()
            
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('SELECT id FROM usuarios WHERE username = ? AND password = ?', (username, pwd_hash))
            user = c.fetchone()
            conn.close()
            
            if user:
                token = str(uuid.uuid4())
                SESSIONS[token] = user[0]
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"token": token}).encode())
            else:
                self.send_error(401, "Credenciales inválidas")
            return

        # Proteger resto de rutas POST
        if not self.check_auth():
            self.send_error(401, "Unauthorized")
            return

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()

        try:
            # API: Guardar distribución
            if self.path == '/api/distribuciones':
                # Fail-safe table creation
                c.execute('CREATE TABLE IF NOT EXISTS distribuciones (id INTEGER PRIMARY KEY AUTOINCREMENT, mes INTEGER, anio INTEGER, data TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
                
                mes = data.get('mes')
                anio = data.get('anio')
                c.execute('SELECT id FROM distribuciones WHERE mes = ? AND anio = ?', (mes, anio))
                existing = c.fetchone()
                
                if existing:
                    c.execute('UPDATE distribuciones SET data = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', (json.dumps(data), existing[0]))
                else:
                    c.execute('INSERT INTO distribuciones (mes, anio, data) VALUES (?, ?, ?)', (mes, anio, json.dumps(data)))

            # API: Guardar Establecimiento (Nuevo/Editar)
            elif self.path == '/api/establecimientos':
                if 'id' in data: # Update
                    c.execute('UPDATE establecimientos SET nombre=?, boxes=?, restriccion=? WHERE id=?', 
                              (data['nombre'], data['boxes'], data['restriccion'], data['id']))
                else: # Insert
                    c.execute('INSERT INTO establecimientos (nombre, boxes, restriccion) VALUES (?, ?, ?)', 
                              (data['nombre'], data['boxes'], data['restriccion']))

            # API: Guardar Profesional
            elif self.path == '/api/profesionales':
                estabs_json = json.dumps(data['establecimientos'])
                if 'id' in data:
                    c.execute('UPDATE profesionales SET nombre=?, profesion=?, establecimientos=?, obs=? WHERE id=?', 
                              (data['nombre'], data['profesion'], estabs_json, data['obs'], data['id']))
                else:
                    c.execute('INSERT INTO profesionales (nombre, profesion, establecimientos, obs) VALUES (?, ?, ?, ?)', 
                              (data['nombre'], data['profesion'], estabs_json, data['obs']))

            # API: Guardar Ronda Mínima
            elif self.path == '/api/rondas':
                if 'id' in data:
                    c.execute('UPDATE rondas_minimas SET profesion=?, establecimiento=?, cantidad=? WHERE id=?', 
                              (data['profesion'], data['establecimiento'], data['cantidad'], data['id']))
                else:
                    c.execute('INSERT INTO rondas_minimas (profesion, establecimiento, cantidad) VALUES (?, ?, ?)', 
                              (data['profesion'], data['establecimiento'], data['cantidad']))

            conn.commit()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())

        except Exception as e:
            self.send_error(500, str(e))
        finally:
            conn.close()

    def do_DELETE(self):
        if not self.check_auth():
            self.send_error(401, "Unauthorized")
            return

        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()

            if self.path.startswith('/api/distribuciones'):
                mes = int(params['mes'][0])
                anio = int(params['anio'][0])
                c.execute('DELETE FROM distribuciones WHERE mes = ? AND anio = ?', (mes, anio))

            elif self.path.startswith('/api/establecimientos'):
                id = int(params['id'][0])
                c.execute('DELETE FROM establecimientos WHERE id = ?', (id,))

            elif self.path.startswith('/api/profesionales'):
                id = int(params['id'][0])
                c.execute('DELETE FROM profesionales WHERE id = ?', (id,))

            elif self.path.startswith('/api/rondas'):
                id = int(params['id'][0])
                c.execute('DELETE FROM rondas_minimas WHERE id = ?', (id,))

            conn.commit()
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        except ValueError as ve:
            print(f"Error de valor en DELETE: {ve}")
            self.send_error(400, f"ID inválido: {ve}")
        except Exception as e:
            print(f"Error en DELETE: {e}")
            self.send_error(500, str(e))

# Iniciar
if __name__ == '__main__':
    init_db()
    os.chdir(os.path.dirname(os.path.abspath(__file__))) # Cambiar al directorio del script
    
    # Permitir reutilizar puerto
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Servidor Python corriendo en http://localhost:{PORT}")
        print(f"Sirviendo archivos desde: {FRONTEND_DIR}")
        print(f"Base de datos: {os.path.abspath(DB_FILE)}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor...")
            httpd.server_close()
