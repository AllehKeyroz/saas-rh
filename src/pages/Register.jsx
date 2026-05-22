import { useState, useRef } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/config'
import { createUserProfile, refreshCurrentUser } from '@/firebase/auth'
import { client } from '@/api/client'
import { useNavigate, Link } from 'react-router-dom'
import { Users, Loader2, Eye, EyeOff, AlertCircle, MailCheck, Building2 } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ companyName: '', fullName: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [convite, setConvite] = useState(null)
  const [checkingConvite, setCheckingConvite] = useState(false)
  const timerRef = useRef(null)

  const checkConvite = (email) => {
    if (!email || !email.includes('@')) { setConvite(null); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setCheckingConvite(true)
      try {
        const res = await client.entities.convites.filter({ email, status: 'pendente' })
        setConvite(res && res.length > 0 ? res[0] : null)
      } catch { setConvite(null) }
      setCheckingConvite(false)
    }, 500)
  }

  const generateTenantId = () => {
    return 'tenant_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    // Se tem convite, não precisa de companyName
    if (!convite && !form.companyName.trim()) { setError('Informe o nome da empresa'); return }
    if (!form.fullName.trim()) { setError('Informe seu nome completo'); return }
    if (!form.email.trim()) { setError('Informe seu email'); return }
    if (form.password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return }
    if (form.password !== form.confirmPassword) { setError('As senhas não conferem'); return }

    setLoading(true)
    try {
      // Define o tenant_id
      let tenantId
      if (convite) {
        // Funcionário com convite: usa o tenant do convite
        tenantId = convite.tenant_id
        if (!tenantId) {
          setError('Convite inválido. Contate o RH.')
          setLoading(false)
          return
        }
      } else {
        // Novo cadastro: cria um tenant
        tenantId = generateTenantId()
        await client.entities.tenants.create({
          id: tenantId,
          nome: form.companyName.trim(),
          email: form.email,
          created_date: new Date().toISOString(),
          ativo: true,
        })
      }

      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const uid = cred.user.uid

      await createUserProfile(uid, {
        full_name: form.fullName,
        email: form.email,
        role: convite ? 'funcionario' : 'admin',
        tenant_id: tenantId,
        created_date: new Date().toISOString(),
        ativo: true,
      })

      // Atualiza o currentUser com o tenant_id (evita race condition do onAuthStateChanged)
      await refreshCurrentUser()

      // Se for funcionário com convite, vincula
      if (convite) {
        await client.entities.convites.update(convite.id, { status: 'aceito' })
        if (convite.funcionario_id) {
          await client.entities.Funcionarios.update(convite.funcionario_id, { user_email_portal: form.email })
        }
      }

      // Se não é funcionário com convite, cria as configurações padrão do tenant
      if (!convite) {
        const defaultFeatures = [
          'comissoes_por_periodo', 'divisao_automatica_setor', 'exclusao_faltas_atestados',
          'setores_configuráveis', 'percentuais_configuráveis', 'metas_comissao',
          'integracao_vida_financeira', 'alertas_motivacionais', 'exibir_calculo_comissao_detalhado',
          'relatorios_comissao', 'dashboard_comissao', 'vida_financeira',
          'exibir_comissao_vida_financeira', 'renda_base_inicial', 'atualizacao_automatica_fechamento',
          'receitas_extras_vida_financeira', 'receitas_extras_mini_dre', 'receitas_extras_graficos',
          'modulo_mensagens', 'push_notifications', 'mensagens_motivacionais', 'comunicados_gerais',
          'modulo_solicitacoes', 'solicitacoes_botoes_rapidos', 'push_solicitacoes',
          'solicitacoes_ferias', 'solicitacoes_vale', 'solicitacoes_banco_horas',
          'solicitacoes_atestado', 'solicitacoes_documentos', 'solicitacoes_outros',
        ]
        for (const chave of defaultFeatures) {
          await client.entities.ConfiguracoesRH.create({
            chave,
            descricao: chave,
            ativa: true,
            tenant_id: tenantId,
            data_ativacao: new Date().toISOString(),
          })
        }
      }

      navigate('/', { replace: true })
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Este email já está cadastrado. Faça login.')
      else if (err.code === 'auth/invalid-email') setError('Email inválido')
      else if (err.code === 'auth/weak-password') setError('Senha muito fraca')
      else setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              {convite ? <MailCheck className="w-7 h-7 text-primary-foreground" /> : <Building2 className="w-7 h-7 text-primary-foreground" />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{convite ? 'Criar Conta' : 'Criar Nova Empresa'}</h1>
            <p className="text-sm text-slate-500">
              {convite ? 'Você foi convidado! Cadastre-se no Portal do Funcionário.' : 'Cadastre sua empresa no RH System'}
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {!convite && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nome da Empresa *</label>
                <input type="text" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                  placeholder="Minha Empresa Ltda" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
            )}

            {convite && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                <MailCheck className="w-3.5 h-3.5 shrink-0" />
                Convite encontrado! Seu acesso será limitado ao Portal do Funcionário.
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nome Completo</label>
              <input type="text" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Seu nome" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input type="email" value={form.email}
                onChange={e => { setForm(p => ({ ...p, email: e.target.value })); checkConvite(e.target.value) }}
                placeholder="seu@email.com" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              {checkingConvite && <p className="text-xs text-muted-foreground mt-1">Verificando convite...</p>}
              {convite && !checkingConvite && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                  <MailCheck className="w-3.5 h-3.5 shrink-0" />
                  Convite encontrado! Seu cadastro será como funcionário.
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Confirmar Senha</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Repita a senha" className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Criando...' : convite ? 'Criar Conta' : 'Criar Empresa'}
            </button>
          </form>

          <div className="text-center text-sm text-slate-500">
            Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Fazer login</Link>
          </div>
          <p className="text-xs text-center text-slate-400">Sistema de Gestão de RH</p>
        </div>
      </div>
    </div>
  )
}
