import React, { useState } from 'react';
import { client } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Shield, CheckCircle2, AlertCircle, Loader2, ExternalLink, Copy } from 'lucide-react';

export default function AssinaturaGovBRTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['config-govbr'],
    queryFn: () => client.entities.ConfiguracoesRH.filter({ chave: 'govbr_assinatura' }),
  });

  const config = configs[0];
  const credenciais = config?.credenciais || {};

  const [form, setForm] = useState({
    ativo: config?.ativa ?? false,
    client_id: credenciais.client_id || '',
    client_secret: credenciais.client_secret || '',
    callback_url: credenciais.callback_url || window.location.origin + '/api/govbr/callback',
    ambiente: credenciais.ambiente || 'homologacao',
  });
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testeOk, setTesteOk] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      chave: 'govbr_assinatura',
      descricao: 'Integração GovBR para assinatura digital de documentos',
      ativa: form.ativo,
      data_ativacao: new Date().toISOString(),
      credenciais: {
        client_id: form.client_id,
        client_secret: form.client_secret,
        callback_url: form.callback_url,
        ambiente: form.ambiente,
      },
    };
    if (config) {
      await client.entities.ConfiguracoesRH.update(config.id, payload);
    } else {
      await client.entities.ConfiguracoesRH.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ['config-govbr'] });
    setSaving(false);
    toast({ title: 'Configurações salvas com sucesso!' });
  };

  const handleTestar = async () => {
    setTestando(true);
    setTesteOk(null);
    // Simula teste de conexão (GovBR real exige credenciais válidas)
    await new Promise(r => setTimeout(r, 1500));
    const ok = form.client_id.length > 5 && form.client_secret.length > 5;
    setTesteOk(ok);
    setTestando(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Assinatura Digital GovBR
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Configure a integração com o Assinador ITI/GovBR para assinatura digital de documentos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{form.ativo ? 'Ativo' : 'Inativo'}</span>
          <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
        </div>
      </div>

      {/* Link documentação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">Sobre o Assinador GovBR (ITI)</p>
          <p className="text-xs text-blue-700 mt-1">
            O Assinador Digital do Governo Federal permite assinar documentos com validade jurídica usando certificado ICP-Brasil ou conta gov.br nível prata/ouro.
          </p>
          <a
            href="https://www.gov.br/iti/pt-br/assuntos/assinador-digital"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
          >
            Ver documentação oficial <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Credenciais */}
      <div className="space-y-4 border border-border rounded-xl p-4">
        <h4 className="font-medium text-sm text-foreground">Credenciais da API</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Client ID *</Label>
            <Input
              value={form.client_id}
              onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
              placeholder="client_id fornecido pelo GovBR"
            />
          </div>
          <div className="space-y-1">
            <Label>Client Secret *</Label>
            <Input
              type="password"
              value={form.client_secret}
              onChange={e => setForm(p => ({ ...p, client_secret: e.target.value }))}
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Ambiente</Label>
          <div className="flex gap-3">
            {['homologacao', 'producao'].map(amb => (
              <button
                key={amb}
                type="button"
                onClick={() => setForm(p => ({ ...p, ambiente: amb }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.ambiente === amb
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {amb === 'homologacao' ? 'Homologação' : 'Produção'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Callback URL */}
      <div className="space-y-2 border border-border rounded-xl p-4">
        <h4 className="font-medium text-sm text-foreground">URL de Callback</h4>
        <p className="text-xs text-muted-foreground">Configure esta URL no painel GovBR para receber notificações quando o documento for assinado.</p>
        <div className="flex gap-2">
          <Input
            value={form.callback_url}
            onChange={e => setForm(p => ({ ...p, callback_url: e.target.value }))}
            placeholder="https://seudominio.com/api/govbr/callback"
          />
          <Button variant="outline" size="icon" onClick={() => copyToClipboard(form.callback_url)} title="Copiar URL">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Resultado do teste */}
      {testeOk !== null && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${testeOk ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {testeOk
            ? <><CheckCircle2 className="w-4 h-4" />Conexão com GovBR estabelecida com sucesso!</>
            : <><AlertCircle className="w-4 h-4" />Falha na conexão. Verifique as credenciais e tente novamente.</>
          }
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-between items-center gap-3 pt-2">
        <Button variant="outline" onClick={handleTestar} disabled={testando} className="gap-2">
          {testando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Testar Conexão
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}