import subprocess
import time
import os

# Comando da eseguire
cmd = 'npm start'
workdir = r'C:\Users\Cannavale\Desktop\webapp\WebApp Ago per Giacomo'

# Avvia il processo nascosto
startupinfo = subprocess.STARTUPINFO()
startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

backend = subprocess.Popen(
    cmd,
    cwd=workdir,
    shell=True,
    startupinfo=startupinfo
)

time.sleep(5)  # Attendi che il backend parta

# Avvia il tuo Electron EXE
electron_exe = r"C:\Users\Cannavale\Desktop\webapp\WebApp Ago per Giacomo\dist\win-unpacked\articoli-prezzi-otalio.exe"
subprocess.Popen(electron_exe)