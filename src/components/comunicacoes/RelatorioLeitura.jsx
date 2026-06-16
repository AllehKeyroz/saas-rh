import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Download, Search } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

const TIPO_COLORS = {
  motivacional: 'bg-green-100 text-green-900',
  aviso: 'bg-yellow-100 text-yellow-900',
  comunicado: 'bg-blue-100 text-blue-900',
  meta: 'bg-purple-100 text-purple-900',
  financeiro: 'bg-orange-100 text-orange-900',
  geral: 'bg-slate-100 text-slate-900',
};

export default function RelatorioLeitura() {
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [avisoselecionado, setAvisoSelecionado] = useState(null);

  const { data: mensagens = [], isLoading: loadingMensagens } = useQuery({
    queryKey: ['mensagens_rh_relatorio'],
    queryFn: () => client.entities.MensagensRH.list('-data_envio', 100),
  });

  const { data: funcionarios = [], isLoading: loadingFunc } = useQuery({
    queryKey: ['funcionarios_relatorio'],
    queryFn: () => client.entities.Funcionarios.list('nome'),
  });

  const mensagensFiltradas = mensagens.filter(m => {
    if (filtroTipo && m.tipo !== filtroTipo) return false;
    if (filtroTexto && !m.titulo.toLowerCase().includes(filtroTexto.toLowerCase())) return false;
    return true;
  });

  const getMapeamentoFuncionarios = (mensagem) => {
    const mapFunc = {};
    funcionarios.forEach(f => mapFunc[f.id] = f);
    return mapFunc;
  };

  const getLeitoresInfo = (mensagem) => {
    const mapFunc = getMapeamentoFuncionarios(mensagem);
    
    const leituras = (mensagem.leituras || []).map(l => ({
      ...l,
      nome: mapFunc[l.funcionario_id]?.nome || 'Funcionário desconhecido',
    }));

    // Compatibilidade com legado (lidas_por sem data/hora)
    const leidasLegado = (mensagem.lidas_por || [])
      .filter(id => !leituras.some(l => l.funcionario_id === id))
      .map(id => ({
        funcionario_id: id,
        nome: mapFunc[id]?.nome || 'Funcionário desconhecido',
        data_leitura: null,
      }));

    const todasLeituras = [...leituras, ...leidasLegado];
    
    // Contar público-alvo
    let totalPublicoAlvo = 0;
    if (mensagem.publico_alvo === 'todos') {
      totalPublicoAlvo = funcionarios.length;
    } else if (mensagem.publico_alvo === 'setor') {
      totalPublicoAlvo = funcionarios.filter(f => f.setor === mensagem.setor_alvo).length;
    } else if (mensagem.publico_alvo === 'funcionario') {
      totalPublicoAlvo = 1;
    }

    return {
      leituras: todasLeituras.sort((a, b) => 
        (b.data_leitura || '').localeCompare(a.data_leitura || '')
      ),
      totalLeitura: todasLeituras.length,
      totalPublicoAlvo,
      percentual: totalPublicoAlvo > 0 ? Math.round((todasLeituras.length / totalPublicoAlvo) * 100) : 0,
    };
  };

  if (loadingMensagens || loadingFunc) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar por título</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Título do aviso..."
                  value={filtroTexto}
                  onChange={e => setFiltroTexto(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  <SelectItem value="motivacional">Motivacional</SelectItem>
                  <SelectItem value="aviso">Aviso</SelectItem>
                  <SelectItem value="comunicado">Comunicado</SelectItem>
                  <SelectItem value="meta">Meta</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de avisos */}
      <div className="space-y-3">
        {mensagensFiltradas.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhum aviso encontrado
            </CardContent>
          </Card>
        ) : (
          mensagensFiltradas.map(mensagem => {
            const info = getLeitoresInfo(mensagem);
            const isAberta = avisoselecionado?.id === mensagem.id;

            return (
              <Card 
                key={mensagem.id} 
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => setAvisoSelecionado(isAberta ? null : mensagem)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TIPO_COLORS[mensagem.tipo]}`}>
                          {mensagem.tipo}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Enviado em {formatDate(mensagem.data_envio)}
                        </span>
                      </div>
                      <h3 className="font-semibold truncate">{mensagem.titulo}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por: {mensagem.enviado_por}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-bold ${
                        info.percentual === 100 ? 'text-green-600' : 
                        info.percentual >= 50 ? 'text-blue-600' : 
                        'text-orange-600'
                      }`}>
                        {info.percentual}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {info.totalLeitura} de {info.totalPublicoAlvo}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                {isAberta && (
                  <CardContent className="border-t pt-4 space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {mensagem.mensagem}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Visualizações ({info.totalLeitura})
                      </h4>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {info.leituras.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">Ninguém leu ainda</p>
                        ) : (
                          info.leituras.map((leitura, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between text-xs bg-card rounded border p-2.5"
                            >
                              <span className="font-medium">{leitura.nome}</span>
                              <span className={`${leitura.data_leitura ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {leitura.data_leitura ? formatDate(leitura.data_leitura) : 'Data desconhecida'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {info.totalLeitura < info.totalPublicoAlvo && (
                      <div className="space-y-2 border-t pt-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <EyeOff className="w-4 h-4" />
                          Não leram ({info.totalPublicoAlvo - info.totalLeitura})
                        </h4>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {funcionarios
                            .filter(f => {
                              if (mensagem.publico_alvo === 'todos') return true;
                              if (mensagem.publico_alvo === 'setor') return f.setor === mensagem.setor_alvo;
                              if (mensagem.publico_alvo === 'funcionario') return f.id === mensagem.funcionario_id_alvo;
                              return false;
                            })
                            .filter(f => !info.leituras.some(l => l.funcionario_id === f.id))
                            .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
                            .map(f => (
                              <div 
                                key={f.id}
                                className="flex items-center justify-between text-xs bg-red-50 rounded border border-red-200 p-2.5"
                              >
                                <span className="font-medium">{f.nome}</span>
                                <span className="text-red-600 text-xs">Pendente</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}