import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, MessageSquare, AlertCircle, MoreVertical } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function ProfileHeader360({ funcionario }) {
  if (!funcionario) return null;

  const initials = funcionario.nome
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'FC';

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-none">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
          {/* Foto e Info */}
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={funcionario.foto} alt={funcionario.nome} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-1">{funcionario.nome}</h1>
              <p className="text-lg text-muted-foreground mb-3">{funcionario.funcao}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {funcionario.setor}
                </span>
                <span className={`px-3 py-1 rounded-full font-medium ${
                  funcionario.ativo
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {funcionario.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" className="flex-1 md:flex-none">
              <Download className="w-4 h-4 mr-2" />
              Backup
            </Button>
            <Button variant="outline" size="sm" className="flex-1 md:flex-none">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensagem
            </Button>
            <Button variant="outline" size="sm" className="flex-1 md:flex-none">
              <AlertCircle className="w-4 h-4 mr-2" />
              Advertência
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Info Cards Mini */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="text-sm font-semibold text-foreground truncate">{funcionario.email}</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Admissão</p>
            <p className="text-sm font-semibold text-foreground">
              {funcionario.data_admissao ? (() => { const [y,m,d] = funcionario.data_admissao.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('pt-BR'); })() : '-'}
            </p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Telefone</p>
            <p className="text-sm font-semibold text-foreground">{funcionario.telefone || 'N/A'}</p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Salário Base</p>
            <p className="text-sm font-semibold text-foreground">
              R$ {funcionario.salario_base?.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }) || 'N/A'}
            </p>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Ajuda de Custo</p>
            <p className="text-sm font-semibold text-foreground">
              R$ {(funcionario.ajuda_custo || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}