import React, { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Upload, FileText, Shield, LayoutTemplate, FileCode } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { registrarAuditoria, ACOES } from '@/lib/auditoriaDocumentos';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

function preencherVariaveis(template, funcionario) {
  if (!template || !funcionario) return template || '';
  const hoje = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
  const admissao = funcionario.data_admissao
    ? format(new Date(funcionario.data_admissao), 'dd/MM/yyyy', { locale: ptBR })
    : '';
  const expAdmissao = funcionario.data_admissao
    ? format(new Date(new Date(funcionario.data_admissao).getTime() + 90 * 86400000), 'dd/MM/yyyy', { locale: ptBR })
    : '';

  return template
    .replace(/\{\{nome\}\}/g, funcionario.nome || '')
    .replace(/\{\{cpf\}\}/g, funcionario.cpf || '')
    .replace(/\{\{cargo\}\}/g, funcionario.funcao || '')
    .replace(/\{\{setor\}\}/g, funcionario.setor || '')
    .replace(/\{\{salario\}\}/g, funcionario.salario_base ? `R$ ${Number(funcionario.salario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '')
    .replace(/\{\{data_admissao\}\}/g, admissao)
    .replace(/\{\{data_atual\}\}/g, hoje)
    .replace(/\{\{periodo_experiencia\}\}/g, expAdmissao)
    .replace(/\{\{email\}\}/g, funcionario.email || '')
    .replace(/\{\{telefone\}\}/g, funcionario.telefone || '');
}

export default function EnviarDocumentoDialog({ open, onClose, funcionarios, onSucesso }) {
  const [form, setForm] = useState({ funcionario_id: '', modelo_id: '', nome_documento: '', descricao: '' });
  const [arquivo, setArquivo] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conteudoPreview, setConteudoPreview] = useState('');

  const funcionarioSelecionado = funcionarios.find(f => f.id === form.funcionario_id);

  const { data: modelos = [] } = useQuery({
    queryKey: ['modelos-documentos-ativos'],
    queryFn: () => client.entities.ModeloDocumento.filter({ ativo: true }),
    enabled: open,
  });

  const modeloSelecionado = modelos.find(m => m.id === form.modelo_id);

  // Preenche nome e preview automaticamente ao selecionar modelo + funcionário
  useEffect(() => {
    if (modeloSelecionado) {
      setForm(p => ({
        ...p,
        nome_documento: p.nome_documento || modeloSelecionado.nome,
        descricao: p.descricao || modeloSelecionado.descricao || '',
      }));
    }
  }, [form.modelo_id]);

  useEffect(() => {
    if (modeloSelecionado?.conteudo_html && funcionarioSelecionado) {
      setConteudoPreview(preencherVariaveis(modeloSelecionado.conteudo_html, funcionarioSelecionado));
    } else {
      setConteudoPreview('');
    }
  }, [form.modelo_id, form.funcionario_id, modelos, funcionarios]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 10MB).');
      e.target.value = '';
      return;
    }
    setArquivo(file);
    if (!form.nome_documento) setForm(p => ({ ...p, nome_documento: file.name.replace('.pdf', '') }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.funcionario_id) {
      toast.error('Selecione um funcionário.');
      return;
    }
    if (!arquivo && !modeloSelecionado?.pdf_base_url && !modeloSelecionado?.conteudo_html) {
      toast.error('Selecione um modelo com conteúdo ou faça upload de um PDF.');
      return;
    }
    if (!form.nome_documento || !form.nome_documento.trim()) {
      toast.error('Informe o nome do documento.');
      return;
    }

    setSending(true);
    try {
      let file_url = modeloSelecionado?.pdf_base_url || '';

      if (arquivo) {
        setUploading(true);
        const result = await client.integrations.Core.UploadFile({ file: arquivo });
        file_url = result.file_url;
        setUploading(false);
      }

      // Se não tem PDF uploadado nem pdf_base_url, mas tem conteúdo HTML → gera PDF do HTML
      if (!file_url && modeloSelecionado?.conteudo_html && conteudoPreview) {
        setUploading(true);

        // Cria um container off-screen para renderizar o HTML
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;padding:40px;background:white;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#000;';
        container.innerHTML = conteudoPreview;
        document.body.appendChild(container);

        // Aguarda renderização
        await new Promise(r => setTimeout(r, 300));

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        document.body.removeChild(container);

        // Gera PDF a partir do canvas
        const { jsPDF } = await import('jspdf');
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = pdfHeight;
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `${form.nome_documento}.pdf`, { type: 'application/pdf' });
        const result = await client.integrations.Core.UploadFile({ file: pdfFile });
        file_url = result.file_url;
        setUploading(false);
      }

      const govbrLink = `https://assinador.iti.br/assinatura/uuid-${Date.now()}`;
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + 7);
      const user = await client.auth.me();

      const novaAssinatura = await client.entities.AssinaturaDigital.create({
      funcionario_id: form.funcionario_id,
      funcionario_nome: funcionarioSelecionado?.nome || '',
      nome_documento: form.nome_documento,
      descricao: form.descricao,
      documento_url: file_url,
      status: 'aguardando',
      link_assinatura: govbrLink,
      enviado_por: user?.email || '',
      enviado_por_nome: user?.full_name || '',
      data_envio: new Date().toISOString(),
      data_expiracao: dataExpiracao.toISOString(),
      notificado: true,
      ...(modeloSelecionado ? {
        finalidade_nome: modeloSelecionado.finalidade_nome || '',
        pasta_destino: modeloSelecionado.pasta_destino || '',
      } : {}),
    });

    await registrarAuditoria({
      acao: ACOES.ENVIAR_ASSINATURA,
      modulo: 'assinatura',
      descricao: `Documento "${form.nome_documento}" enviado para assinatura de ${funcionarioSelecionado?.nome}.`,
      origem: 'rh',
      documento_id: novaAssinatura?.id,
      funcionario_id: form.funcionario_id,
      funcionario_nome: funcionarioSelecionado?.nome,
      nome_documento: form.nome_documento,
      dados_depois: { status: 'aguardando', link_assinatura: govbrLink, data_expiracao: dataExpiracao.toISOString() },
    });

    await registrarAuditoria({
      acao: ACOES.GOVBR_LINK_GERADO,
      modulo: 'assinatura',
      descricao: `Link GovBR gerado para "${form.nome_documento}" — funcionário ${funcionarioSelecionado?.nome}.`,
      origem: 'sistema',
      documento_id: novaAssinatura?.id,
      funcionario_id: form.funcionario_id,
      funcionario_nome: funcionarioSelecionado?.nome,
      nome_documento: form.nome_documento,
      dados_depois: { link: govbrLink },
    });

    if (funcionarioSelecionado?.email) {
      await client.integrations.Core.SendEmail({
        to: funcionarioSelecionado.email,
        subject: `📝 Documento para assinar: ${form.nome_documento}`,
        body: `Olá ${funcionarioSelecionado.nome},\n\nVocê tem um documento aguardando sua assinatura digital.\n\n📄 Documento: ${form.nome_documento}\n${form.descricao ? `📋 Descrição: ${form.descricao}\n` : ''}\n✍️ Para assinar, acesse seu Portal do Funcionário e clique em "Assinaturas Digitais".\n\nLink direto GovBR: ${govbrLink}\n\nEste link expira em 7 dias.\n\nEquipe RH`,
      });
    }

    setSending(false);
    setForm({ funcionario_id: '', modelo_id: '', nome_documento: '', descricao: '' });
    setArquivo(null);
    setConteudoPreview('');
    onSucesso();
    } catch (e) {
    setSending(false);
    console.error('[EnviarDocumento] Erro:', e);
    toast.error(`Erro ao enviar documento: ${e.message}`);
    }
    };

  const reset = () => {
    setForm({ funcionario_id: '', modelo_id: '', nome_documento: '', descricao: '' });
    setArquivo(null);
    setConteudoPreview('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Enviar Documento para Assinatura
          </DialogTitle>
        </DialogHeader>
        {uploading && !arquivo && modeloSelecionado?.conteudo_html && !modeloSelecionado?.pdf_base_url && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Gerando PDF a partir do conteúdo HTML...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Funcionário */}
          <div className="space-y-1">
            <Label>Funcionário *</Label>
            <Select value={form.funcionario_id} onValueChange={v => setForm(p => ({ ...p, funcionario_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o funcionário..." /></SelectTrigger>
              <SelectContent>
                {funcionarios.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modelo */}
          {modelos.length > 0 && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5"><LayoutTemplate className="w-3.5 h-3.5" />Usar Modelo (opcional)</Label>
              <Select value={form.modelo_id || 'none'} onValueChange={v => setForm(p => ({ ...p, modelo_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar modelo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem modelo (upload manual)</SelectItem>
                  {modelos.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}{m.finalidade_nome ? ` — ${m.finalidade_nome}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview de variáveis preenchidas */}
          {conteudoPreview && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-green-800">Preview — variáveis preenchidas automaticamente:</p>
              <pre className="text-xs text-green-700 whitespace-pre-wrap max-h-32 overflow-y-auto">{conteudoPreview}</pre>
            </div>
          )}

          {/* Arquivo PDF */}
          <div className="space-y-1">
            <Label>Arquivo PDF {!modeloSelecionado?.pdf_base_url && !modeloSelecionado?.conteudo_html ? '*' : '(substituir)'}</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
              onClick={() => document.getElementById('pdf-input-env').click()}
            >
              {arquivo ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" /><span className="font-medium">{arquivo.name}</span>
                </div>
              ) : modeloSelecionado?.pdf_base_url ? (
                <p className="text-xs text-green-700">PDF do modelo será usado — clique para substituir</p>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="w-7 h-7 mx-auto mb-1 opacity-40" />
                  <p className="text-sm">Clique para selecionar o PDF</p>
                </div>
              )}
            </div>
            <input id="pdf-input-env" type="file" accept=".pdf" className="hidden" onChange={handleFile} />
          </div>

          {/* Nome */}
          <div className="space-y-1">
            <Label>Nome do Documento *</Label>
            <Input value={form.nome_documento} onChange={e => setForm(p => ({ ...p, nome_documento: e.target.value }))} placeholder="Ex: Termo de Férias" required />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label>Descrição (opcional)</Label>
            <Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Período de 01/06 a 30/06/2025" />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              O colaborador receberá uma notificação com o link para assinar via GovBR. O documento assinado será salvo automaticamente na pasta configurada.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={reset} disabled={sending}>Cancelar</Button>
            <Button type="submit" disabled={sending} className="gap-2">
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" />{uploading ? 'Enviando PDF...' : 'Processando...'}</>
                : <><Send className="w-4 h-4" />Enviar para Assinatura</>
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}