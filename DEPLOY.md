# Guía de Despliegue en Railway

Esta guía te permitirá subir tu aplicación a internet usando **Railway**, asegurando que tu base de datos no se borre.

## 1. Preparación (Ya realizada ✅)
El código ya está listo con los archivos necesarios:
- `Procfile`: Indica cómo iniciar el servidor.
- `runtime.txt`: Indica la versión de Python.
- `requirements.txt`: Lista de dependencias (vacía, usamos librería estándar).
- `server.py`: Configurado para leer variables de entorno.

## 2. Subir a GitHub
1. Crea un nuevo repositorio en [GitHub](https://github.com/new).
2. Sube todos los archivos de tu carpeta del proyecto a ese repositorio.
   ```bash
   git init
   git add .
   git commit -m "Versión final para despliegue"
   git branch -M main
   git remote add origin <URL_DE_TU_REPO>
   git push -u origin main
   ```

## 3. Crear Proyecto en Railway
1. Crea una cuenta en [railway.app](https://railway.app/).
2. Haz clic en el botón **"New Project"**.
3. Selecciona **"Deploy from GitHub repo"**.
4. Busca y selecciona tu repositorio.
5. Haz clic en **"Deploy Now"**.

## 4. Configurar Persistencia (¡CRÍTICO! 💾)
Por defecto, los servidores en la nube son "efímeros" (se borran al reiniciar). Para guardar tu base de datos `distribuciones.db` permanentemente:

1. En el panel de Railway, haz clic en tu servicio (la tarjeta del proyecto).
2. Ve a la pestaña **"Volumes"**.
3. Haz clic en **"Create Volume"** (o "Add Volume").
4. En el campo **Mount Path** (Ruta de montaje), escribe: `/data`
5. Haz clic en **Add**.

## 5. Configurar Variables de Entorno
Ahora debemos decirle a la aplicación que guarde la base de datos en ese volumen `/data`.

1. Ve a la pestaña **"Variables"**.
2. Haz clic en **"New Variable"**.
3. Agrega lo siguiente:
   - **VARIABLE_NAME:** `DB_FILE`
   - **VALUE:** `/data/distribuciones.db`
4. Haz clic en **Add**.

## 6. ¡Listo! 🚀
Railway detectará el cambio de variables y reiniciará el servidor automáticamente.
- Tu aplicación estará accesible en la URL pública que Railway te asigne (pestaña "Settings" > "Networking" > "Generate Domain").
- Tus datos se guardarán seguros en el volumen `/data`.
