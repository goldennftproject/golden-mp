# La cuenta por email — cómo activarla (2 minutos en el dashboard)

El juego ya tiene el panel listo (Configuración → Cuenta): guardar la granja atándola a un
email con enlace mágico, y entrar con ese email desde cualquier dispositivo. Sin contraseñas.
Para que los correos salgan, hay que activar el proveedor en Supabase:

## Paso 1 — Activar el proveedor de Email

1. Dashboard de Supabase → **Authentication** → **Sign In / Providers**.
2. En la lista, **Email** → activalo (ON).
3. Dejá activado "Enable email confirmations" como venga; el enlace mágico funciona igual.
4. Save.

## Paso 2 — Que el enlace vuelva al juego

1. **Authentication** → **URL Configuration**.
2. En **Site URL** poné la URL del juego: `https://golden-mp.onrender.com`
3. Save. (Sin esto, el enlace del correo abre localhost y confunde.)

## La prueba

1. Abrí el juego → Menú → **Configuración** → sección **Cuenta**.
2. Debe decir "cuenta anónima (vive solo en este navegador)".
3. Escribí tu email → **Guardar mi cuenta** → te llega un correo → tocá el enlace.
4. Volvés al juego; en Configuración ahora dice "cuenta guardada en tu@correo".
5. La prueba de fuego: abrí el juego en **otro navegador** (o incógnito), Configuración →
   escribí el mismo email → **Entrar con mi email** → tocá el enlace del correo → aparece
   TU granja, no una nueva.

## Detalles que ya están resueltos en el código

- "Entrar" usa `shouldCreateUser: false`: un email sin cuenta vinculada NO fabrica un
  "Granjero" nuevo — devuelve error y el panel lo dice.
- Antes de mandar el enlace de entrar, el juego avisa que la granja anónima del navegador
  actual queda aparte (no se borra: sigue atada a su cuenta anónima).
- El límite gratuito de Supabase son ~30 correos/hora con su SMTP de fábrica — de sobra
  para el testeo; para el lanzamiento conviene enchufar un SMTP propio (Resend/Postmark,
  gratis en volúmenes chicos) en Authentication → SMTP Settings.
