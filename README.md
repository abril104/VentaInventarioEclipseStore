# 🏋️ ECLIPSE STORE — Sistema de Inventario, POS y Catálogo Web

Aplicación web completa para la administración y venta de ropa deportiva y fitness (hombre, mujer y unisex), diseñada para operar de forma ágil en un **stand físico comercial** y complementada con **catálogo web público** y **pedidos directos por WhatsApp**.

---

## 🚀 Características Principales

### 1. Catálogo Web Comercial
- **Identidad de Marca Oficial:** Logotipo oficial y diseño atlético de alto rendimiento.
- **Barra Lateral de Filtros (Estilo Gymshark):** Filtros dinámicos a la izquierda por Orden, Tipo de Producto (Ropa vs. Accesorios), Talla, Género, Color y Disponibilidad en stock.
- **Slider Promocional Administrable:** Banner interactivo de avisos, colecciones y ubicaciones con velocidad y diapositivas configurables desde el panel.
- **Galería de 1 a 5 Fotos:** Visualización de prendas con miniaturas clicables y carrusel interactivo.
- **Integración con WhatsApp:** Envío de carritos de compra estructurados con moneda nacional (Soles - PEN).
- **Control de Disponibilidad:** Prendas agotadas permanecen visibles con foto atenuada y etiqueta «Sin stock».

### 2. Punto de Venta (POS) & Stand Físico
- **Emisión de Boleta o Factura:**
  - **Boleta de Venta:** Registro con DNI, Nombre, Teléfono (*importante*) y Correo (*opcional*).
  - **Factura:** Validación estricta de RUC (11 dígitos), Razón Social, Teléfono, Correo y Dirección fiscal.
- **Autocompletado de Clientes:** Al ingresar DNI o RUC, el sistema localiza al cliente y rellena automáticamente sus datos.
- **Desglose del IGV (18%):** Cálculo automático de Operación Gravada (Valor Venta sin IGV), Monto IGV (18%) y Total en Soles.
- **Ticket Térmico con Logo:** Impresión de comprobante con logo oficial, RUC, dirección, teléfono y correo de la tienda, datos del cliente y frase de pie de ticket editable.
- **Medios de Pago Múltiples:** Efectivo (con cálculo de vuelto), Yape, Plin, Tarjeta y Transferencia bancaria (admite pagos mixtos).

### 3. Directorio de Clientes & Empresas
- Módulo comercial con listado de clientes, métricas de consumo acumulado y cantidad de compras.
- Historial detallado de compras por cliente con comprobantes y prendas adquiridas.
- Exportación del directorio de clientes a Microsoft Excel (`.xlsx`).

### 4. Inventario & Kardex Auditado
- Identificación por **SKU único** por cada combinación de producto, talla y color.
- Carga inmediata de todas las prendas con barra de filtros por estado de stock, tallas y colores.
- Kardex inmutable con registro cronológico de entradas, ventas, ajustes y devoluciones.
- Alerta visual de stock bajo cuando la disponibilidad es $\le 1$ unidad.
- Prevención estricta de stock negativo.

### 5. Control de Caja Principal Compartida
- Apertura obligatoria de turno antes de vender con registro de efectivo inicial.
- Arqueo físico ciego al cierre, cálculo de efectivo esperado y detección de diferencias (sobrante/faltante).
- Cuadre de medios digitales (Yape, Plin, Tarjeta, Transferencia).

### 6. Administración Autónoma (CRUD de Productos)
- Creación, edición y eliminación de prendas y variantes sin depender de hojas de cálculo externas.
- Exportación completa del catálogo e inventario a Excel (`.xlsx`).

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript (Strict Mode)
- **Estilos:** Tailwind CSS con componentes deportivos de alto contraste
- **Iconografía:** Lucide React
- **Base de Datos:** SQLite con soporte para WAL (desarrollo/stand) y preparado para Supabase PostgreSQL
- **Procesamiento de Archivos:** SheetJS (XLSX)
- **Pruebas:** Vitest (26 pruebas unitarias automatizadas superadas)

---

## 🔑 Credenciales de Acceso

| Rol | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@eclipsestore.pe` | `admin123` |
| **Vendedor 1** | `carlos@eclipsestore.pe` | `carlos123` |
| **Vendedor 2** | `andrea@eclipsestore.pe` | `andrea123` |

---

## 📦 Instalación y Ejecución Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/abril104/VentaInventarioEclipseStore.git
   cd VentaInventarioEclipseStore
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
   ```

4. Compilar y ejecutar en producción:
   ```bash
   npm run build
   npm start
   ```

5. Ejecutar la suite de pruebas:
   ```bash
   npm test
   ```

---

## 🌐 Despliegue en Vercel

Este proyecto está configurado para desplegarse fácilmente en **Vercel**:
1. Conecta tu cuenta de GitHub con Vercel.
2. Importa el repositorio `abril104/VentaInventarioEclipseStore`.
3. Vercel detectará automáticamente Next.js.
4. Presiona **Deploy**.

---

© 2026 Eclipse Store — Todos los derechos reservados.
