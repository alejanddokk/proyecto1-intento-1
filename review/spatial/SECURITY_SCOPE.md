# Strix: preparación local, no ejecutado

Se consultó el README oficial de https://github.com/usestrix/strix.
La documentación requiere Docker operativo y configuración de un proveedor LLM
o uno de sus mecanismos de autenticación admitidos. `docker` y `strix` no estaban
disponibles en PATH en este entorno. No se instaló ni se ejecutó el escáner.

Al retomar, limitar el análisis al código de este workspace y al servidor de
pruebas en loopback con LOCAL_MAIL=1 y datos sintéticos. Revisar la configuración
de red del contenedor: localhost dentro de Docker no es el host Windows.
No incluir dominio público, infraestructura de Sites, Resend, Rockstar ni otros
terceros como objetivos. No enviar correos reales, bases de usuarios, .env o
credenciales al proveedor de análisis. Revisar qué código/contexto transmite
el agente antes de darle acceso. Las pruebas activas requieren alcance local
efectivo, no basta con escribir una URL localhost en un contenedor.

Las pruebas API/E2E de esta entrega son verificaciones locales propias; no son
un informe de Strix ni una auditoría de seguridad independiente.
