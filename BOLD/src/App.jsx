import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useUserRole } from '@/lib/useUserRole';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Funcionarios from './pages/Funcionarios';
import Lancamentos from './pages/Lancamentos';
import Fechamento from './pages/Fechamento';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';
import Auditoria from './pages/Auditoria';
import Configuracoes from './pages/Configuracoes';
import PortalFuncionario from './pages/PortalFuncionario';
import Comissoes from './pages/Comissoes';
import Comunicacao from './pages/Comunicacao';
import Solicitacoes from './pages/Solicitacoes';
import LogsFinanceiros from './pages/LogsFinanceiros';
import Funcionarios360 from './pages/Funcionarios360';
import CentroControleRH from './pages/CentroControleRH';
import Advertencias from './pages/Advertencias';
import AppLayoutRH from './components/layout/AppLayoutRH';
import DashboardRH from './pages/DashboardRH';
import AssinaturasDigitais from './pages/AssinaturasDigitais';
import ModelosDocumentos from './pages/ModelosDocumentos';
import AuditoriaDocumentos from './pages/AuditoriaDocumentos';
import EspelhoPortal from './pages/EspelhoPortal';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { isFuncionario, loading: loadingRole } = useUserRole();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth || loadingRole) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Funcionários veem apenas o portal (vida financeira integrada)
  if (isFuncionario) {
    return (
      <Routes>
        <Route path="*" element={<PortalFuncionario />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayoutRH />}>
        <Route path="/" element={<DashboardRH />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/lancamentos" element={<Lancamentos />} />
        <Route path="/fechamento" element={<Fechamento />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/comissoes" element={<Comissoes />} />
        <Route path="/comunicacao" element={<Comunicacao />} />
        <Route path="/solicitacoes" element={<Solicitacoes />} />
        <Route path="/logs-financeiros" element={<LogsFinanceiros />} />
        <Route path="/funcionarios/:funcId/360" element={<Funcionarios360 />} />
        <Route path="/advertencias" element={<Advertencias />} />
        <Route path="/assinaturas-digitais" element={<AssinaturasDigitais />} />
        <Route path="/modelos-documentos" element={<ModelosDocumentos />} />
        <Route path="/auditoria-documentos" element={<AuditoriaDocumentos />} />
        <Route path="/centro-controle-rh" element={<CentroControleRH />} />
        <Route path="/espelho-portal" element={<EspelhoPortal />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App