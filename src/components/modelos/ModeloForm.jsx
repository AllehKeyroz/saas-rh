import React, { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileText, X, Plus, Code } from 'lucide-react';

const VARIAVEIS_DISPONIVEIS = [
  { chave: '{{nome}}', descricao: 'Nome do funcionário' },
  { chave: '{{cpf}}', descricao: 'CPF' },
  { chave: '{{cargo}}', descricao: 'Cargo/Função' },
  { chave: '{{setor}}', descricao: 'Setor' },
  { chave: '{{salario}}', descricao: 'Salário base' },
  { chave: '{{data_admissao}}', descricao: 'Data de admissão' },
  { chave: '{{data_atual}}', descricao: 'Data atual' },
  { chave: '{{periodo_experiencia}}', descricao: 'Período de experiência (90 dias)' },
  { chave: '{{email}}', descricao: 'E-mail do funcionário' },
  { chave: '{{telefone}}', descricao: 'Telefone do funcionário' },
];

export default function ModeloForm({ open, onClose, modelo, finalidades, onSaved }) {
  const [form, setForm] = useState({
    nome: '', descricao: '', finalidade: '', finalidade_nome: '',
    pasta_destino: '', exige_assinatura: true, conteudo_html: '', ativo: true, variaveis: []
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVars, setShowVars] = useState(false);

  useEffect(() => {
    if (modelo) {
      setForm({
        nome: modelo.nome || '',
        descricao: modelo.descricao || '',
        finalidade: modelo.finalidade || '',
        finalidade_nome: modelo.finalidade_nome || '',
        pasta_destino: modelo.pasta_destino || '',
        exige_assinatura: modelo.exige_assinatura !== false,
        conteudo_html: modelo.conteudo_html || '',
        ativo: modelo.ativo !== false,
        variaveis: modelo.variaveis || [],
      });
    } else {
      setForm({
        nome: '', descricao: '', finalidade: '', finalidade_nome: '',
        pasta_destino: '', exige_assinatura: true, conteudo_html: '', ativo: true, variaveis: []
      });
    }
    setPdfFile(null);
  }, [modelo, open]);

  const handleFinalidade = (id) => {
    const f = finalidades.find(f => f.id === id);
    setForm(p => ({
      ...p,
      finalidade: id,
      finalidade_nome: f?.nome || '',
      pasta_destino: p.pasta_destino || f?.pasta_padrao || '',
      exige_assinatura: f?.exige_assinatura !== undefined ? f.exige_assinatura : p.exige_assinatura,
    }));
  };

  const handlePdfFile = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') setPdfFile(file);
    else alert('Selecione um arquivo PDF.');
  };

  const toggleVariavel = (chave) => {
    setForm(p => ({
      ...p,
      variaveis: p.variaveis.includes(chave)
        ? p.variaveis.filter(v => v !== chave)
        : [...p.variaveis, chave]
    }));
  };

  const inserirVariavel = (chave) => {
    const ta = document.getElementById('conteudo-html-input');
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const novo = form.conteudo_html.slice(0, start) + chave + form.conteudo_html.slice(end);
      setForm(p => ({ ...p, conteudo_html: novo }));
      if (!form.variaveis.includes(chave)) {
        setForm(p => ({ ...p, conteudo_html: novo, variaveis: [...p.variaveis, chave] }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    let pdfUrl = modelo?.pdf_base_url || '';
    if (pdfFile) {
      setUploading(true);
      const { file_url } = await client.integrations.Core.UploadFile({ file: pdfFile });
      pdfUrl = file_url;
      setUploading(false);
    }

    const payload = { ...form, pdf_base_url: pdfUrl };
    if (modelo?.id) {
      await client.entities.ModeloDocumento.update(modelo.id, payload);
    } else {
      await client.entities.ModeloDocumento.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modelo?.id ? 'Editar Modelo' : 'Novo Modelo de Documento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nome do Modelo *</Label>
              <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Contrato CLT" required />
            </div>
            <div className="space-y-1">
              <Label>Finalidade</Label>
              <Select value={form.finalidade} onValueChange={handleFinalidade}>
                <SelectTrigger><SelectValue placeholder="Selecionar finalidade..." /></SelectTrigger>
                <SelectContent>
                  {finalidades.filter(f => f.ativo !== false).map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Pasta de Destino</Label>
              <Input value={form.pasta_destino} onChange={e => setForm(p => ({ ...p, pasta_destino: e.target.value }))} placeholder="Ex: Contratos" />
              <p className="text-xs text-muted-foreground">Onde o documento assinado será salvo no 360°</p>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição opcional" />
            </div>
          </div>

          {/* PDF Base */}
          <div className="space-y-2">
            <Label>PDF Base (opcional)</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
              onClick={() => document.getElementById('pdf-modelo-input').click()}
            >
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" /><span>{pdfFile.name}</span>
                </div>
              ) : modelo?.pdf_base_url ? (
                <div className="flex items-center justify-center gap-2 text-sm text-green-700">
                  <FileText className="w-4 h-4" />PDF base já enviado — clique para substituir
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  Clique para fazer upload do PDF base
                </div>
              )}
            </div>
            <input id="pdf-modelo-input" type="file" accept=".pdf" className="hidden" onChange={handlePdfFile} />
          </div>

          {/* Conteúdo HTML */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Conteúdo do Documento (HTML/Texto)</Label>
              <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowVars(!showVars)}>
                <Code className="w-3.5 h-3.5" />Variáveis
              </Button>
            </div>

            {showVars && (
              <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Clique para inserir no cursor do texto:</p>
                <div className="flex flex-wrap gap-2">
                  {VARIAVEIS_DISPONIVEIS.map(v => (
                    <button
                      key={v.chave}
                      type="button"
                      onClick={() => inserirVariavel(v.chave)}
                      className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono"
                      title={v.descricao}
                    >
                      {v.chave}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              id="conteudo-html-input"
              value={form.conteudo_html}
              onChange={e => setForm(p => ({ ...p, conteudo_html: e.target.value }))}
              placeholder="Digite o conteúdo do documento aqui. Use variáveis como {{nome}}, {{cargo}}, etc."
              className="w-full min-h-40 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Suporte a HTML básico e variáveis dinâmicas</p>
          </div>

          {/* Variáveis ativas */}
          {form.variaveis.length > 0 && (
            <div className="space-y-1">
              <Label>Variáveis utilizadas</Label>
              <div className="flex flex-wrap gap-1.5">
                {form.variaveis.map(v => (
                  <span key={v} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                    {v}
                    <button type="button" onClick={() => toggleVariavel(v)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium">Exige Assinatura GovBR</p>
              <p className="text-xs text-muted-foreground">Ao enviar, exige assinatura digital do colaborador</p>
            </div>
            <Switch checked={form.exige_assinatura} onCheckedChange={v => setForm(p => ({ ...p, exige_assinatura: v }))} />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Modelo ativo</p>
            <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? 'Enviando PDF...' : modelo?.id ? 'Salvar' : 'Criar Modelo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}