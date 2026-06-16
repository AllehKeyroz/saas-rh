import React, { useState } from 'react';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Calendar, Briefcase, Building2, Mail, Phone, Key, CheckCircle2, X, Loader2, Pencil } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { registrarAuditoria } from '@/lib/audit';
import { toast } from 'sonner';

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function MeusDados({ funcionario }) {
  const perm = funcionario?.permissoes_portal || {};
  const TIPOS_PIX = [
    { value: 'cpf', label: 'CPF' },
    { value: 'email', label: 'E-mail' },
    { value: 'telefone', label: 'Telefone' },
    { value: 'aleatoria', label: 'Chave Aleatória' },
    { value: 'cnpj', label: 'CNPJ' },
  ];

  const [editandoPix, setEditandoPix] = useState(false);
  const [pixValue, setPixValue] = useState(funcionario?.chave_pix || '');
  const [pixTipo, setPixTipo] = useState(funcionario?.chave_pix_tipo || 'cpf');
  const [salvando, setSalvando] = useState(false);

  const handleSalvarPix = async () => {
    if (!funcionario?.id) return;
    const valorAntigo = funcionario.chave_pix || '';
    const tipoAntigo = funcionario.chave_pix_tipo || '';
    if (pixValue.trim() === valorAntigo && pixTipo === tipoAntigo) { setEditandoPix(false); return; }
    setSalvando(true);
    try {
      await client.entities.Funcionarios.update(funcionario.id, {
        chave_pix: pixValue.trim() || '',
        chave_pix_tipo: pixTipo,
      });
      await registrarAuditoria({
        acao: 'editar',
        modulo: 'funcionario',
        entidade_id: funcionario.id,
        descricao: `Funcionário "${funcionario.nome}" atualizou a chave PIX`,
        dados_anteriores: { chave_pix: valorAntigo, chave_pix_tipo: tipoAntigo },
        dados_novos: { chave_pix: pixValue.trim() || '', chave_pix_tipo: pixTipo },
      });
      toast.success('Chave PIX atualizada com sucesso!');
      setEditandoPix(false);
    } catch (err) {
      toast.error('Erro ao atualizar chave PIX');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Foto + nome */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
              {funcionario?.foto ? (
                <img src={funcionario.foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{funcionario?.nome}</h2>
              {perm.ver_funcao && funcionario?.funcao && (
                <p className="text-sm text-muted-foreground">{funcionario.funcao}</p>
              )}
              {perm.ver_setor && funcionario?.setor && (
                <Badge variant="secondary" className="mt-1">{funcionario.setor}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações pessoais */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <InfoRow icon={User} label="Nome completo" value={funcionario?.nome} />
          <InfoRow icon={Calendar} label="Data de nascimento" value={formatDate(funcionario?.data_nascimento)} />
          <InfoRow icon={Mail} label="E-mail" value={funcionario?.email} />
          <InfoRow icon={Phone} label="Telefone" value={funcionario?.telefone} />
          {perm.ver_data_admissao && (
            <InfoRow icon={Calendar} label="Data de admissão" value={formatDate(funcionario?.data_admissao)} />
          )}
          {perm.ver_funcao && funcionario?.funcao && (
            <InfoRow icon={Briefcase} label="Função" value={funcionario.funcao} />
          )}
          {perm.ver_setor && funcionario?.setor && (
            <InfoRow icon={Building2} label="Setor" value={funcionario.setor} />
          )}
        </CardContent>
      </Card>

      {/* Chave PIX */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            Chave PIX
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editandoPix ? (
            <div className="space-y-3">
              <div>
                <Label>Tipo da chave</Label>
                <Select value={pixTipo} onValueChange={setPixTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_PIX.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chave PIX</Label>
                <Input
                  value={pixValue}
                  onChange={e => setPixValue(e.target.value)}
                  placeholder="Digite sua chave PIX"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditandoPix(false); setPixValue(funcionario?.chave_pix || ''); setPixTipo(funcionario?.chave_pix_tipo || 'cpf'); }} disabled={salvando}>
                  <X className="w-3.5 h-3.5 mr-1" />Cancelar
                </Button>
                <Button size="sm" onClick={handleSalvarPix} disabled={salvando}>
                  {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{funcionario?.chave_pix || 'Nenhuma chave cadastrada'}</p>
                <p className="text-xs text-muted-foreground">
                  {funcionario?.chave_pix ? (TIPOS_PIX.find(t => t.value === funcionario?.chave_pix_tipo)?.label || 'PIX') : 'Use para receber transferências'}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditandoPix(true); setPixValue(funcionario?.chave_pix || ''); setPixTipo(funcionario?.chave_pix_tipo || 'cpf'); }}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}