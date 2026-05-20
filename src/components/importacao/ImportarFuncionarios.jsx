import React, { useState } from 'react';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

const COLUNAS = ['nome', 'email', 'telefone', 'funcao', 'setor', 'data_admissao', 'data_nascimento', 'salario_base', 'limite_vales'];

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

function rowToFuncionario(row) {
  return {
    nome: row.nome || '',
    email: row.email || '',
    telefone: row.telefone || '',
    funcao: row.funcao || '',
    setor: row.setor || '',
    data_admissao: row.data_admissao || '',
    data_nascimento: row.data_nascimento || '',
    salario_base: row.salario_base ? Number(row.salario_base.replace(',', '.')) : null,
    limite_vales: row.limite_vales ? Number(row.limite_vales.replace(',', '.')) : null,
    ativo: true,
  };
}

function downloadModelo() {
  const header = COLUNAS.join(';');
  const exemplo = 'João da Silva;joao@empresa.com;11999998888;Operador;Produção;2024-01-15;1990-05-20;3500;500';
  const blob = new Blob([header + '\n' + exemplo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_funcionarios.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportarFuncionarios({ open, onClose, onSaved }) {
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
        if (!r.nome) errosLocal.push(`Linha ${i + 2}: campo "nome" é obrigatório`);
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
      const func = rowToFuncionario(row);
      if (!func.nome) { fail++; continue; }
      await client.entities.Funcionarios.create(func);
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
          <DialogTitle>Importar Funcionários em Lote</DialogTitle>
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
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  {erros.map((e, i) => (
                    <p key={i} className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{e}
                    </p>
                  ))}
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-sm">
                {rows.slice(0, 10).map((r, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-2">
                    {r.nome ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <span className="font-medium">{r.nome || '(sem nome)'}</span>
                    {r.funcao && <span className="text-muted-foreground">• {r.funcao}</span>}
                    {r.setor && <span className="text-muted-foreground">• {r.setor}</span>}
                  </div>
                ))}
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
                <p className="text-sm font-medium">{resultado.ok} funcionário(s) importado(s) com sucesso!</p>
                {resultado.fail > 0 && <p className="text-xs text-muted-foreground">{resultado.fail} linha(s) ignorada(s) por erro</p>}
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