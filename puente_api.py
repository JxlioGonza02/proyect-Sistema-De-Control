import serial
import requests
import json
import time
import os

# ==============================================
# ✅ YA CONFIGURADO CON TUS DATOS
# ==============================================

# Puerto USB de tu ESP32 - CAMBIA ESTO según Arduino IDE
PUERTO_ESP = 'COM3'  # ← Cámbialo por lo que veas en Arduino IDE

# Tu URL de Render
URL_API = 'https://proyect-sistema-de-control.onrender.com'

# ==============================================
# NO CAMBIES NADA DEBAJO (ya está listo)
# ==============================================

print("=" * 50)
print("🚀 PUENTE ESP32 → API RENDER")
print("=" * 50)

print(f"\n🔌 Puerto ESP32: {PUERTO_ESP}")
print(f"🌐 API URL: {URL_API}")
print(f"📁 Archivo PHP: {URL_API}/api.php")

# Probar si la API responde primero
try:
    print("\n🔄 Probando conexión con Render...")
    test_response = requests.get(URL_API, timeout=5)
    print(f"✅ Render responde! Código: {test_response.status_code}")
except Exception as e:
    print(f"⚠️ No se pudo conectar a Render: {e}")
    print("   Pero igual intentaremos enviar datos...")

# Conectar al ESP32
try:
    ser = serial.Serial(PUERTO_ESP, 115200, timeout=1)
    time.sleep(2)
    print(f"\n✅ Conectado a ESP32 en {PUERTO_ESP}")
except Exception as e:
    print(f"\n❌ ERROR: No se pudo abrir {PUERTO_ESP}")
    print(f"   {e}")
    print("\n   🔧 Soluciones:")
    print("   1. ¿El ESP32 está conectado por USB?")
    print("   2. Revisa Arduino IDE → Herramientas → Puerto")
    print("   3. Prueba con: COM4, COM5, COM6, etc.")
    print("\n   Presiona Enter para salir...")
    input()
    exit()

print("\n🟢 ESCUCHANDO al ESP32...")
print("   Los datos se enviarán a: " + URL_API)
print("   Presiona Ctrl+C para detener\n")

contador = 0
errores_api = 0

while True:
    try:
        linea = ser.readline().decode('utf-8', errors='ignore').strip()
        
        if linea:
            contador += 1
            print(f"\n📊 [{contador}] Dato recibido: {linea}")
            
            try:
                # Intentar parsear como JSON
                datos = json.loads(linea)
                print(f"   ✅ Parseado: ax={datos.get('ax', '?')}, ay={datos.get('ay', '?')}, az={datos.get('az', '?')}")
                
                # Probar diferentes rutas de la API
                rutas_a_probar = [
                    URL_API + '/api.php',
                    URL_API + '/api/vibraciones',
                    URL_API + '/vibraciones',
                    URL_API
                ]
                
                enviado = False
                for ruta in rutas_a_probar:
                    try:
                        respuesta = requests.post(
                            ruta, 
                            json=datos,
                            headers={'Content-Type': 'application/json'},
                            timeout=3
                        )
                        if respuesta.status_code in [200, 201, 202]:
                            print(f"   ✅ ENVIADO a {ruta}")
                            print(f"   📡 Código: {respuesta.status_code}")
                            enviado = True
                            break
                    except:
                        continue
                
                if not enviado:
                    print(f"   ⚠️ No se pudo enviar a ninguna ruta")
                    errores_api += 1
                    
            except json.JSONDecodeError:
                print(f"   ⚠️ No es JSON, se envía como texto")
                try:
                    respuesta = requests.post(URL_API + '/api.php', data=linea, timeout=3)
                    print(f"   ✅ Enviado como texto")
                except:
                    print(f"   ❌ Falló el envío")
                    
    except KeyboardInterrupt:
        print("\n\n🛑 Deteniendo...")
        print(f"📊 Resumen: {contador} datos recibidos, {errores_api} errores")
        ser.close()
        print("✅ ¡Programa terminado!")
        break
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        time.sleep(1)