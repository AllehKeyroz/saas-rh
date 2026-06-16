import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cake, User } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function AniversariantesCard({ funcionarios }) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth(); // 0-indexed
  const diaAtual = hoje.getDate();

  const aniversariantes = funcionarios
    .filter(f => f.ativo !== false && !f.data_demissao && f.data_nascimento)
    .map(f => {
      const [y, m, d] = f.data_nascimento.split('-').map(Number);
      const nasc = new Date(y, m - 1, d);
      return { ...f, diaNasc: nasc.getDate(), mesNasc: nasc.getMonth() };
    })
    .filter(f => f.mesNasc === mesAtual)
    .sort((a, b) => a.diaNasc - b.diaNasc);

  const isHoje = (f) => f.diaNasc === diaAtual;
  const jaPassou = (f) => f.diaNasc < diaAtual;

  if (aniversariantes.length === 0) return null;

  return (
    <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cake className="w-5 h-5 text-pink-500" />
          Aniversariantes de {MESES[mesAtual]}
          <Badge className="bg-pink-100 text-pink-700 ml-1">{aniversariantes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {aniversariantes.map(func => (
            <div
              key={func.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                isHoje(func)
                  ? 'bg-pink-100 border-pink-300 shadow-sm'
                  : jaPassou(func)
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : 'bg-white border-pink-100'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {func.foto ? (
                  <img src={func.foto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{func.nome}</p>
                <p className="text-xs text-muted-foreground">{func.funcao || func.setor || '-'}</p>
              </div>
              <div className="text-right shrink-0">
                {isHoje(func) ? (
                  <div className="text-center">
                    <span className="text-lg">🎂</span>
                    <p className="text-xs font-bold text-pink-600">Hoje!</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-bold text-pink-700">dia {func.diaNasc}</p>
                    {!jaPassou(func) && (
                      <p className="text-xs text-muted-foreground">
                        {func.diaNasc - diaAtual}d
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}