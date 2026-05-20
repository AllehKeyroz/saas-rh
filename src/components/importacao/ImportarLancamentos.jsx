import React, { useState } from 'react';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

const TIPOS_VALIDOS = ['vale', 'adiantamento', 'convenio', 'consumo', 'adicional', 'ajuste', 'comissao'];
const COLUNAS = ['funcionario_nome', 'tipo_lancamento', 'valor', 'data_lancamento', 'descricao'];

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.replace(/\r/g, ''));
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(';').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(line => {
    const cols = line.split(';');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i]?.trim() || ''; });
    return obj;
  });
  return { headers, rows };
}

function downloadModelo() {
  const header = COLUNAS.join(';');
  const tipos = TIPOS_VALIDOS.join(', ');
  const exemplo = `João da Silva;vale;150,00;2024-05-10;Adiantamento semana\nMaria Souza;comissao;300,00;2024-05-15;Comissão de vendas`;
  const nota = `# Tipos válidos: ${tipos}`;
  const blob = new Blob([header + '\n' + exemplo + '\n' + nota], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_lancamentos.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function validarRow(row, idx, funcionarios) {
  const erros = [];
  if (!row.funcionario_nome) erros.push(`Linha ${idx + 2}: campo "funcionario_nome" obrigatório`);
  if (!row.tipo_lancamento || !TIPOS_VALIDOS.includes(row.tipo_lancamento))
    erros.push(`Linha ${idx + 2}: tipo_lancamento inválido ("${row.tipo_lancamento}"). Use: ${TIPOS_VALIDOS.join(', ')}`);
  const valor = parseFloat((row.valor || '').replace(',', '.'));
  if (isNaN(valor) || valor <= 0) erros.push(`Linha ${idx + 2}: valor inválido ("${row.valor}")`);
  if (!row.data_lancamento) erros.push(`Linha ${idx + 2}: data_lancamento obrigatória (AAAA-MM-DD)`);
  return erros;
}

export default function ImportarLancamentos({ open, onClose, onSaved, funcionarios = [] }) {
  const [rows, setRows] = useState([]);
  const [erros, setErros] = useState([]);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed } = parseCSV(ev.target.result);
      const errosLocal = [];
      parsed.forEach((r, i) => {
        errosLocal.push(...validarRow(r, i, funcionarios));
      });
      setErros(errosLocal);
      setRows(parsed);
      setResultado(null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (!rows.length || erros.length) return;
    setImporting(true);
    let ok = 0, fail = 0;

    for (const row of rows) {
      const valor = parseFloat((row.valor || '').replace(',', '.'));
      // Tenta encontrar o funcionário pelo nome (case-insensitive)
      const func = funcionarios.find(f =>
        f.nome?.toLowerCase().trim() === row.funcionario_nome?.toLowerCase().trim()
      );
      if (!func) { fail++; continue; }

      await client.entities.FichaFinanceira.create({
        funcionario_id: func.id,
        funcionario_nome: func.nome,
        tipo_lancamento: row.tipo_lancamento,
        valor,
        data_lancamento: row.data_lancamento,
        descricao: row.descricao || '',
        consolidado: false,
      });
      ok++;
    }

    setImporting(false);
    setResultado({ ok, fail });
    if (ok > 0) onSaved();
  };

  const handleClose = () => {
    setRows([]);
    setErros([]);
    setResultado(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Lançamentos em Lote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Modelo */}
          <div className="rounded-lg border border-dashed p-4 bg-muted/30 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Planilha Modelo (CSV)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Colunas: {COLUNAS.join(', ')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadModelo}>
              <Download className="w-4 h-4 mr-2" />Baixar modelo
            </Button>
          </div>

          {/* Info tipos */}
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tipos válidos: </span>
              {TIPOS_VALIDOS.join(' • ')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              O nome do funcionário deve ser exato. Datas no formato <span className="font-mono">AAAA-MM-DD</span>.
            </p>
          </div>

          {/* Upload */}
          <div>
            <p className="text-sm font-medium mb-1.5">Selecionar arquivo CSV</p>
            <Input type="file" accept=".csv" onChange={handleFile} />
            <p className="text-xs text-muted-foreground mt-1">Use ponto-e-vírgula (;) como separador. Salve como CSV UTF-8.</p>
          </div>

          {/* Preview */}
          {rows.length > 0 && !resultado && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{rows.length} linha(s) encontrada(s)</Badge>
                {erros.length > 0 && <Badge variant="destructive">{erros.length} erro(s)</Badge>}
              </div>

              {erros.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 max-h-28 overflow-y-auto space-y-1">
                  {erros.map((e, i) => (
                    <p key={i} className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{e}
                    </p>
                  ))}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-sm">
                {rows.slice(0, 10).map((r, i) => {
                  const func = funcionarios.find(f =>
                    f.nome?.toLowerCase().trim() === r.funcionario_nome?.toLowerCase().trim()
                  );
                  const ok = r.funcionario_nome && TIPOS_VALIDOS.includes(r.tipo_lancamento) && r.valor && r.data_lancamento && func;
                  return (
                    <div key={i} className="px-3 py-2 flex items-center gap-2">
                      {ok ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="font-medium">{r.funcionario_nome || '(sem nome)'}</span>
                      <Badge variant="outline" className="text-xs">{r.tipo_lancamento || '?'}</Badge>
                      <span className="text-muted-foreground">{r.valor}</span>
                      {!func && r.funcionario_nome && <span className="text-xs text-destructive">• funcionário não encontrado</span>}
                    </div>
                  );
                })}
                {rows.length > 10 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">+ {rows.length - 10} linha(s) não exibidas...</p>
                )}
              </div>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className={`rounded-lg p-4 flex items-center gap-3 ${resultado.fail === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <CheckCircle2 className={`w-5 h-5 shrink-0 ${resultado.fail === 0 ? 'text-green-600' : 'text-amber-600'}`} />
              <div>
                <p className="text-sm font-medium">{resultado.ok} lançamento(s) importado(s) com sucesso!</p>
                {resultado.fail > 0 && <p className="text-xs text-muted-foreground">{resultado.fail} linha(s) ignorada(s) — funcionário não encontrado</p>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={handleClose}>
              {resultado ? 'Fechar' : 'Cancelar'}
            </Button>
            {!resultado && (
              <Button onClick={handleImport} disabled={!rows.length || erros.length > 0 || importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Importar {rows.length > 0 ? `(${rows.length})` : ''}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}