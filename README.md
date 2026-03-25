# Gastos Casa 🏠

Herramienta de conciliación y liquidación mensual de gastos familiares para Meli y Fede.

## Qué hace

- Registra movimientos de tarjetas de crédito y débito de ambas personas
- Clasifica cada gasto: compartido, personal Fede, personal Meli, familia Meli, extraordinario, IVA, excluido
- Maneja gastos en ARS, USD y EUR con cotización e impuestos
- Rastrea cuotas (01/12, 02/12, etc.)
- Calcula la liquidación mensual automáticamente: quién le debe cuánto a quién
- Permite arrastrar deuda del mes anterior
- Cierra el mes y bloquea la edición
- Importa desde CSV (formato estándar o desde la planilla histórica de Google Sheets)
- Exporta a CSV (compatible con Excel/Sheets) y JSON (backup completo)
- Historial de todos los meses con totales acumulados
- **Cero costo, cero backend** — los datos viven en el navegador (IndexedDB)

## Instalación

```bash
cd gastos-casa
npm install
npm run dev
```

Abrí http://localhost:5173 en el navegador.

## Uso mensual típico

1. **Inicio de mes**: Abrís el mes actual (ya está seleccionado por defecto).
2. **Cargar movimientos**: Vas a la pestaña "Movimientos" → "Agregar". Completás fecha, descripción, tarjeta, importe y tipo.
3. **Clasificar**: Para cada gasto elegís el tipo correcto:
   - **Compartido** → se divide 50/50 entre los dos
   - **Personal Fede / Personal Meli** → es de esa persona, no se reparte
   - **Familia Meli** → familia o mamá de Meli, NO entra en la liquidación familiar
   - **Gasto Depto** → extraordinario del departamento
   - **IVA** → registrado por separado
   - **Excluido** → no entra en ningún cálculo
4. **Gastos en USD**: Elegís moneda USD, ingresás el importe en dólares y la cotización del día. El total en ARS se calcula solo.
5. **Revisar**: El panel inferior muestra el resumen rápido del mes en todo momento.
6. **Deuda anterior**: En la pestaña "Liquidación" podés ingresar el importe que quedó pendiente del mes anterior.
7. **Cerrar el mes**: Cuando está todo cargado, cerrás el mes desde "Liquidación". Queda registrado quién le transfiere cuánto a quién.

## Lógica de liquidación

```
Gastos compartidos:
  Fede pagó con sus tarjetas: $X
  Meli pagó con sus tarjetas: $Y
  Total compartido: $X + $Y
  Cada uno debería aportar: ($X + $Y) / 2

  Si Fede pagó más → Meli le transfiere la diferencia
  Si Meli pagó más → Fede le transfiere la diferencia

Transferencia del mes = (X - Y) / 2
+ Deuda del mes anterior
= Total a transferir
```

Los gastos personales, de familia Meli y excluidos **no entran** en este cálculo.

## Migrar la planilla histórica (2014–2025)

1. Abrí la planilla en Google Sheets.
2. Hacé clic en la pestaña del año que querés importar (ej: "2025").
3. Menú **Archivo → Descargar → Valores separados por comas (.csv)**.
4. En la app, seleccioná el mes correcto en la barra superior.
5. Ir a **Importar / Exportar** → elegí **"Planilla histórica (2014–2025)"**.
6. Cargá el archivo CSV.
7. Los gastos se importan como "Compartido" por defecto — reclasificá los que corresponda.

> **Tip**: No es obligatorio migrar todo el historial. Podés arrancar desde el mes actual y dejar la planilla histórica en Google Sheets como archivo de referencia.

## Backup y restauración

- **Exportar backup completo**: Importar/Exportar → "Exportar backup completo". Genera un `.json` con todos los datos.
- **Restaurar**: Importar/Exportar → "Restaurar desde backup JSON". Cargá el archivo generado anteriormente.

Hacé backup periódicamente (ej: una vez al mes al cerrar el mes) para no perder datos si limpiás el caché del navegador.

## Datos y privacidad

Los datos se guardan **únicamente en el navegador** (IndexedDB). No se envían a ningún servidor. Para acceder desde otro dispositivo usá el export/import JSON.

## Tecnología

- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS (estilos)
- Dexie.js (IndexedDB)
- Lucide React (íconos)
- Sin backend, sin nube, sin servicios pagos
