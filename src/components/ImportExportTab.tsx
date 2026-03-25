import { useState, useRef } from 'react';
import { Download, Upload, FileText, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { bulkImportExpenses, exportAllData, importBackup, getExpensesByMonth } from '../db';
import { parseGenericCSV, parseLegacySheetCSV } from '../utils/importers';
import { exportFilename, formatMonthKey } from '../utils/formatters';
import type { ImportResult } from '../types';

interface Props {
  monthKey: string;
  onRefresh: () => void;
}

type ImportMode = 'generic' | 'legacy';

export default function ImportExportTab({ monthKey, onRefresh }: Props) {
  const [importMode, setImportMode] = useState<ImportMode>('generic');
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importingCSV, setImportingCSV] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // ─── Exportar CSV del mes actual ──────────────────────────────────────────
  const handleExportCSV = async () => {
    setExportingCSV(true);
    const expenses = await getExpensesByMonth(monthKey);
    const header = [
      'fecha', 'descripcion', 'propietario', 'tarjeta',
      'cuota_actual', 'cuota_total', 'moneda', 'importe_original',
      'cotizacion', 'impuestos', 'total_ars', 'tipo', 'categoria', 'notas', 'referencia'
    ].join(',');

    const rows = expenses.map(e => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.owner,
      e.card,
      e.installmentCurrent,
      e.installmentTotal,
      e.currency,
      e.originalAmount,
      e.exchangeRate,
      e.taxes,
      e.amountARS,
      e.type,
      e.category,
      `"${e.notes.replace(/"/g, '""')}"`,
      `"${e.evidenceRef.replace(/"/g, '""')}"`,
    ].join(','));

    const csv = [header, ...rows].join('\n');
    downloadText(csv, `${exportFilename(monthKey)}.csv`, 'text/csv');
    setExportingCSV(false);
  };

  // ─── Exportar backup JSON completo ────────────────────────────────────────
  const handleExportBackup = async () => {
    const data = await exportAllData();
    downloadText(
      JSON.stringify(data, null, 2),
      `${exportFilename('backup')}.json`,
      'application/json'
    );
  };

  // ─── Importar CSV ─────────────────────────────────────────────────────────
  const handleImportCSV = async () => {
    if (!csvText.trim()) return;
    setImportingCSV(true);
    setResult(null);

    const parser = importMode === 'legacy' ? parseLegacySheetCSV : parseGenericCSV;
    const { expenses, result } = parser(csvText, monthKey);

    if (expenses.length > 0) {
      await bulkImportExpenses(expenses);
      onRefresh();
    }

    setResult(result);
    if (result.imported > 0) setCsvText('');
    setImportingCSV(false);
  };

  // ─── Importar archivo CSV ─────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText(ev.target?.result as string);
    reader.readAsText(file, 'UTF-8');
  };

  // ─── Importar backup JSON ─────────────────────────────────────────────────
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        await importBackup(data);
        onRefresh();
        alert(`Backup importado correctamente.\n${data.expenses?.length || 0} movimientos, ${data.months?.length || 0} meses.`);
      } catch {
        alert('Error al importar el backup. Verificá que sea un archivo JSON válido generado por esta app.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="grid gap-6 max-w-4xl">
      {/* ─── Exportar ─────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="text-blue-600" size={18} />
          <h3 className="font-semibold text-gray-800">Exportar</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              <span className="font-medium text-sm">CSV del mes actual</span>
            </div>
            <p className="text-xs text-gray-500">
              Exporta todos los movimientos de <strong>{formatMonthKey(monthKey)}</strong> en formato CSV.
              Compatible con Excel, Google Sheets y cualquier planilla.
            </p>
            <button className="btn-secondary w-full" onClick={handleExportCSV} disabled={exportingCSV}>
              <Download size={14} />
              Exportar {formatMonthKey(monthKey)}
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-gray-500" />
              <span className="font-medium text-sm">Backup completo (JSON)</span>
            </div>
            <p className="text-xs text-gray-500">
              Exporta todos los datos históricos en formato JSON.
              Usalo como backup o para migrar a otro dispositivo.
            </p>
            <button className="btn-secondary w-full" onClick={handleExportBackup}>
              <Download size={14} />
              Exportar backup completo
            </button>
          </div>
        </div>
      </div>

      {/* ─── Importar CSV ─────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="text-green-600" size={18} />
          <h3 className="font-semibold text-gray-800">Importar movimientos desde CSV</h3>
        </div>

        <p className="text-sm text-gray-500">
          Los movimientos se importan al mes <strong>{formatMonthKey(monthKey)}</strong>.
          Cambiá el mes en la barra superior si querés importar a otro mes.
        </p>

        {/* Modo de importación */}
        <div>
          <label className="label">Formato del CSV</label>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1.5 rounded border text-sm font-medium transition-colors ${importMode === 'generic' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setImportMode('generic')}
            >
              Formato estándar
            </button>
            <button
              className={`px-3 py-1.5 rounded border text-sm font-medium transition-colors ${importMode === 'legacy' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setImportMode('legacy')}
            >
              Planilla histórica (2014–2025)
            </button>
          </div>
        </div>

        {/* Descripción del formato */}
        <div className="bg-gray-50 rounded p-3 text-xs text-gray-600 font-mono">
          {importMode === 'generic' ? (
            <>
              <p className="font-semibold mb-1 font-sans">Columnas esperadas (con encabezado):</p>
              <p>fecha, descripcion, propietario, tarjeta, cuota_actual, cuota_total,</p>
              <p>moneda, importe_original, cotizacion, impuestos, tipo, categoria, notas, referencia</p>
              <p className="mt-2 font-sans text-gray-500">• Separador: coma o punto y coma</p>
              <p className="font-sans text-gray-500">• propietario: "fede" o "meli" | tipo: shared, personal_fede, personal_meli, family_meli, excluded</p>
              <p className="font-sans text-gray-500">• moneda: ARS, USD, EUR</p>
            </>
          ) : (
            <>
              <p className="font-semibold mb-1 font-sans">Formato de la planilla histórica (Google Sheets):</p>
              <p>Exportá cada pestaña anual como CSV desde Archivo → Descargar → CSV</p>
              <p className="mt-2 font-sans text-gray-500">• Los gastos se importan como "Compartido" por defecto — podés reclasificarlos después</p>
              <p className="font-sans text-gray-500">• Las filas de totales / resumen se omiten automáticamente</p>
            </>
          )}
        </div>

        {/* Input de archivo */}
        <div className="flex gap-2 items-center">
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Cargar archivo CSV
          </button>
          <span className="text-xs text-gray-400">o pegá el contenido abajo</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Área de texto */}
        <textarea
          className="input resize-none font-mono text-xs"
          rows={8}
          placeholder={`Pegá el contenido CSV acá...\n\nEjemplo:\nfecha,descripcion,propietario,tarjeta,cuota_actual,cuota_total,moneda,importe_original,cotizacion,impuestos,tipo,categoria,notas,referencia\n2026-03-10,Coto,fede,HSBC MC,0,0,ARS,15000,1,0,shared,supermercado,,`}
          value={csvText}
          onChange={e => { setCsvText(e.target.value); setResult(null); }}
        />

        <div className="flex gap-2 items-center">
          <button
            className="btn-primary"
            onClick={handleImportCSV}
            disabled={!csvText.trim() || importingCSV}
          >
            <Upload size={14} />
            {importingCSV ? 'Importando…' : 'Importar'}
          </button>
          {csvText && (
            <button className="btn-ghost text-xs" onClick={() => { setCsvText(''); setResult(null); }}>
              Limpiar
            </button>
          )}
        </div>

        {/* Resultado */}
        {result && (
          <div className={`rounded-lg p-4 space-y-2 ${result.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-2">
              {result.errors.length > 0
                ? <AlertTriangle size={16} className="text-amber-600" />
                : <CheckCircle size={16} className="text-green-600" />}
              <span className="font-medium text-sm">
                {result.imported} movimientos importados
                {result.skipped > 0 && `, ${result.skipped} omitidos`}
              </span>
            </div>
            {result.errors.map((err, i) => (
              <p key={i} className="text-xs text-amber-700">{err}</p>
            ))}
          </div>
        )}
      </div>

      {/* ─── Backup / Restaurar ───────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="text-purple-600" size={18} />
          <h3 className="font-semibold text-gray-800">Restaurar desde backup JSON</h3>
        </div>
        <p className="text-sm text-gray-500">
          Importa un archivo de backup JSON generado por esta misma app.
          Los datos existentes no se sobreescriben, solo se agregan los que falten.
        </p>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => backupInputRef.current?.click()}>
            <Upload size={14} />
            Cargar backup JSON
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportBackup}
          />
        </div>
      </div>

      {/* ─── Guía rápida ──────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Cómo migrar la planilla histórica</h3>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>Abrí la planilla en Google Sheets.</li>
          <li>Hacé clic en una pestaña anual (ej: "2025").</li>
          <li>Menú <strong>Archivo → Descargar → Valores separados por comas (.csv)</strong>.</li>
          <li>Volvé acá, elegí el mes que corresponde en la barra superior.</li>
          <li>Seleccioná el modo <strong>"Planilla histórica"</strong> y cargá el archivo.</li>
          <li>Los gastos se importan como "Compartido". Revisalos y reclasificá los personales o excluidos.</li>
          <li>Repetí para cada pestaña anual.</li>
        </ol>
        <div className="mt-4 bg-blue-50 rounded p-3 text-xs text-blue-700">
          <strong>Tip:</strong> La planilla histórica tiene datos desde 2014. Si solo querés partir desde el mes actual,
          no necesitás migrar nada — empezá a cargar directamente. El historial antiguo puede quedarse en Google Sheets como archivo.
        </div>
      </div>
    </div>
  );
}

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
