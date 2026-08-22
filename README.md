# Comercial García ERP 🛒📦

Sistema integral de gestión empresarial (ERP) para inventario, ventas, compras, clientes, proveedores y reportes.

---

## 🏗️ Estructura del Proyecto

El sistema está organizado en una arquitectura monorepo:

* **`backend/`**: Servidor de API REST desarrollado con **Node.js**, **Express**, **TypeScript** y **Prisma ORM** (SQLite).
* **`frontend/`**: Panel administrativo Web construido con **React 19**, **Vite**, **TypeScript** y **Tailwind CSS**.
* **`mobile/`**: Aplicación móvil para inventario y consultas desarrollada con **React Native** y **Expo**.

---

## 🚀 Requisitos Previos

* **Node.js** (versión 18 o superior recomendada)
* **npm** o gestor de paquetes de tu preferencia

---

## ⚙️ Instalación y Puesta en Marcha

### 1. Backend (API)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev  # o npx prisma db push
npm run dev
```
> La API se ejecutará por defecto en `http://localhost:3000` con documentación Swagger en `/api-docs`.

### 2. Frontend (Panel Web)
```bash
cd frontend
npm install
npm run dev
```
> La aplicación web se ejecutará en `http://localhost:5173`.

### 3. Mobile (App Móvil)
```bash
cd mobile
npm install
npx expo start
```

---

## 🛠️ Tecnologías Principales

* **Backend:** Express, TypeScript, Prisma ORM, SQLite, JWT, Bcrypt, Zod, Swagger, PDFMake, ExcelJS.
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Recharts, Lucide React, Axios.
* **Mobile:** React Native, Expo, React Navigation, AsyncStorage.
