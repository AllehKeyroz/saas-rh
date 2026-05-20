import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, Trash2, User } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import AdvertenciaForm from '@/components/advertencias/AdvertenciaForm';

export default function Advertencias() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: funcionarios = [], isLoading: lf } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: advertencias = [], isLoading: la } = useQuery({
    queryKey: ['advertencias'],
    queryFn: () => client.entities.Advertencias?.list?.() || [],
  });

  const isLoading = lf || la;

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['advertencias'] });
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await client.entities.Advertencias.delete(id);
    queryClient.invalidateQueries({ queryKey: ['advertencias'] });
  };

  const filtered = advertencias.filter(a => {
    const func = funcionarios.find(f => f.id === a.funcionario_id);
    return !search || func?.nome?.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advertências</h1>
          <p className="text-muted-foreground mt-1">Controle de advertências e ocorrências de funcionários</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Nova Advertência
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por funcionário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Nenhuma advertência registrada</div>
        ) : (
          filtered.map(a => {
            const func = funcionarios.find(f => f.id === a.funcionario_id);
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <h3 className="font-semibold">{func?.nome || 'Funcionário removido'}</h3>
                        <Badge variant="outline" className="text-xs">{a.tipo || 'Advertência'}</Badge>
                      </div>
                      {a.descricao && <p className="text-sm text-muted-foreground mb-2">{a.descricao}</p>}
                      <p className="text-xs text-muted-foreground">
                        Data: {formatDate(a.data_advertencia || a.created_date)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {formOpen && (
        <AdvertenciaForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          funcionarios={funcionarios}
          advertencia={editing}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}