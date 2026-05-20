import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Trash2, Bell } from 'lucide-react';
import { getFinancialLogs, clearFinancialLogs, getErrorSummary } from '@/lib/financialErrorHandler';

export default function LogsFinanceiros() {
  const [localLogs, setLocalLogs] = useState([]);
  const [summary, setSummary] = useState({});
  const qc = useQueryClient();

  // Carregar erros persistidos
  const { data: persistedErrors = [] } = useQuery({
    queryKey: ['application_errors'],
    queryFn: () => base44.entities.ApplicationError.list('-created_date', 100),
  });

  useEffect(() => {
    const logs = getFinancialLogs();
    const summary = getErrorSummary();
    setLocalLogs(logs);
    setSummary(summary);
  }, []);

  const handleClear = () => {
    if (confirm('Limpar todos os logs?')) {
      clearFinancialLogs();
      setLocalLogs([]);
      setSummary({});
    }
  };

  const handleNotifyAdmin = async (errorId) => {
    try {
      await base44.functions.invoke('notifyAdminOfError', { errorId });
      qc.invalidateQueries({ queryKey: ['application_errors'] });
    } catch (error) {
      console.error('Erro ao notificar admin:', error);
    }
  };

  if (persistedErrors.length === 0 && localLogs.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum erro registrado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Resumo de erros */}
      {Object.entries(summary).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(summary).map(([component, errors]) => (
            <Card key={component} className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  {component}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-red-600 font-semibold">{errors.length} erro(s)</p>
                <ul className="mt-2 space-y-1">
                  {errors.slice(0, 3).map((e, i) => (
                    <li key={i} className="text-xs text-red-700 truncate">• {e.context}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Erros Persistidos */}
      {persistedErrors.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Erros do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {persistedErrors.map((error) => (
                <div key={error.id} className={`border rounded-lg p-3 ${error.notificado ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${error.notificado ? 'text-blue-700' : 'text-red-700'}`}>
                          {error.component}
                        </p>
                        <Badge variant="outline" className={error.severity === 'critical' ? 'bg-destructive/10 text-destructive' : ''}>
                          {error.severity}
                        </Badge>
                        {error.notificado && <Badge className="bg-blue-600">Notificado</Badge>}
                      </div>
                      <p className={`text-xs mt-1 ${error.notificado ? 'text-blue-600' : 'text-red-600'}`}>{error.context}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{error.error_message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(error.created_date).toLocaleString('pt-BR')}</p>
                    </div>
                    {!error.notificado && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNotifyAdmin(error.id)}
                        className="shrink-0"
                      >
                        <Bell className="w-3 h-3 mr-1" />
                        Notificar
                      </Button>
                    )}
                  </div>
                  {error.stack_trace && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Stack trace</summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                        {error.stack_trace}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs locais */}
      {localLogs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Histórico da Sessão</CardTitle>
            <Button variant="destructive" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {localLogs.map((log, i) => (
                <div key={i} className="border rounded-lg p-3 bg-amber-50 border-amber-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-700">{log.component}</p>
                      <p className="text-xs text-amber-600 mt-1">{log.context}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{log.error}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  {log.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Stack trace</summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border text-amber-700 overflow-auto max-h-32">
                        {log.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}