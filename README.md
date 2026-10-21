# 📦 CORE-ML | Sistema Web de Control de Inventario y Ventas

[![Live Demo](https://img.shields.io/badge/Demo%20en%20Vivo-Netlify-00C7B7?style=for-the-badge&logo=netlify)](https://control-inventario-ventas.netlify.app/)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](#-tecnologías-utilizadas)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#-tecnologías-utilizadas)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#-tecnologías-utilizadas)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#-tecnologías-utilizadas)

**CORE-ML** es una solución web integral para la gestión, control de inventario y registro de ventas. Desarrollada para optimizar procesos comerciales mediante administración de productos, generación de reportes operativos, control de acceso por roles de usuario y almacenamiento en tiempo real en la nube.

🌐 **Demo en vivo:** [control-inventario-ventas.netlify.app](https://control-inventario-ventas.netlify.app/)

---

## 🔑 Credenciales de Prueba (Demo)

Puedes ingresar y explorar las funcionalidades del sistema utilizando el siguiente usuario de prueba:

* **Correo / Usuario:** `prueba_1@gmail.com`
* **Contraseña:** `123456789`

---

## ✨ Características Principales

* **🔐 Módulo de Autenticación y Seguridad:** Control de acceso y protección de rutas para usuarios autorizados.
* **👥 Administración de Roles de Usuario:** Gestión diferenciada de permisos según el perfil del personal.
* **📊 Gestión de Productos e Inventarios:** Alta, edición, actualización y control de stock en tiempo real.
* **🧾 Registro de Ventas:** Interfaz ágil para la captura de transacciones y operaciones comerciales.
* **📈 Reportes Operativos:** Generación y visualización de reportes de movimientos y ventas.
* **☁️ Base de Datos en la Nube:** Sincronización y persistencia de datos mediante Firebase Firestore.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Base de Datos & Backend Serverless:** Firebase Firestore
* **Autenticación & Seguridad:** Firebase Auth / Módulo de gestión de roles
* **Hosting & Despliegue:** Netlify
* **Control de Versiones:** Git & GitHub

---

## 🚀 Estructura del Proyecto

```text
CORE ML/
├── .vscode/             # Configuración del entorno de desarrollo
├── seguridad/           # Módulo de autenticación, roles y acceso
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── logo.png
├── index.html           # Interfaz principal (Inventario, Ventas y Reportes)
├── script.js            # Lógica de negocio y conexión a Firebase
├── style.css            # Estilos responsivos de la aplicación
└── logo.png             # Identidad gráfica
