import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Briefcase, Building2, Mail, Phone } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

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
    </div>
  );
}