import { useState, useRef } from 'react'
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth'
import { auth, db } from '@/firebase/config'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { createUserProfile, refreshCurrentUser } from '@/firebase/auth'
import { client } from '@/api/client'
import { useNavigate, Link } from 'react-router-dom'
import { Users, Loader2, Eye, EyeOff, AlertCircle, Building2, ArrowRight, Mail, MailCheck } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // email | form
  const [email, setEmail] = useState('')
  const [convite, setConvite] = useState(null)
  const [tenantNome, setTenantNome] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [form, setForm] = useState({ fullName: '', companyName: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  const checkConvite = (value) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    return new Promise((resolve) => {
      timerRef.current = setTimeout(async () => {
        if (!value || !value.includes('@')) { resolve(null); return }
        setCheckingEmail(true)
        try {
          const res = await client.entities.convites.filter({ email: value, status: 'pendente' })
          const c = res && res.length > 0 ? res[0] : null
          setConvite(c)
          if (c?.tenant_id) {
            try {
              // Tenta lookup direto pelo ID do documento (novo formato)
              const docSnap = await getDoc(doc(db, 'tenants', c.tenant_id))
              if (docSnap.exists()) {
                setTenantNome(docSnap.data().nome || '')
              } else {
                // Fallback: busca pelo campo 'id' (legado)
                const res = await client.entities.tenants.filter({ id: c.tenant_id })
                setTenantNome(res?.[0]?.nome || '')
              }
            } catch { setTenantNome('') }
          } else {
            setTenantNome('')
          }
          resolve(c)
        } catch { setConvite(null); setTenantNome(''); resolve(null) }
        setCheckingEmail(false)
      }, 400)
    })
  }

  const handleContinue = async () => {
    if (!email || !email.includes('@')) { setError('Informe um email válido'); return }
    setError('')
    setCheckingEmail(true)

    // 1. Verifica se já existe conta Firebase Auth com este email
    let authExists = false
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email)
      authExists = methods.length > 0
    } catch {}
    if (authExists) {
      setCheckingEmail(false)
      setError('Este email já possui cadastro.')
      return
    }

    // 2. Verifica se o convite já foi usado
    try {
      const usados = await client.entities.convites.filter({ email, status: 'aceito' })
      if (usados.length > 0) {
        setCheckingEmail(false)
        setError('Este convite já foi utilizado.')
        return
      }
    } catch {}

    // 3. Busca convite pendente
    const c = await checkConvite(email)
    setCheckingEmail(false)
    setStep('form')
  }

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleContinue()
    }
  }

  const generateTenantId = () => {
    return 'tenant_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (!convite && !form.companyName.trim()) { setError('Informe o nome da empresa'); return }
    if (!form.fullName.trim()) { setError('Informe seu nome completo'); return }
    if (form.password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return }
    if (form.password !== form.confirmPassword) { setError('As senhas não conferem'); return }

    setLoading(true)
    try {
      let tenantId
      if (convite) {
        tenantId = convite.tenant_id
        if (!tenantId) {
          setError('Convite inválido. Contate o RH.')
          setLoading(false)
          return
        }
      } else {
        tenantId = generateTenantId()
        await setDoc(doc(db, 'tenants', tenantId), {
          id: tenantId,
          nome: form.companyName.trim(),
          email,
          created_date: new Date().toISOString(),
          ativo: true,
        })
      }

      const cred = await createUserWithEmailAndPassword(auth, email, form.password)
      const uid = cred.user.uid

      await createUserProfile(uid, {
        full_name: form.fullName,
        email,
        role: convite ? 'funcionario' : 'admin',
        tenant_id: tenantId,
        created_date: new Date().toISOString(),
        ativo: true,
      })

      await refreshCurrentUser()
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Este email já está cadastrado. Faça login.')
      else if (err.code === 'auth/invalid-email') setError('Email inválido')
      else if (err.code === 'auth/weak-password') setError('Senha muito fraca')
      else setError(err.message || 'Erro ao criar conta')
      setLoading(false)
      return
    }

    try {
      if (convite) {
        await client.entities.convites.update(convite.id, { status: 'aceito' })
        if (convite.funcionario_id) {
          await client.entities.Funcionarios.update(convite.funcionario_id, { user_email_portal: email })
        }
      }
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
    } catch (err) {
      console.error('Erro no pós-registro (não crítico):', err?.code, err?.message)
    }

    setLoading(false)
    navigate('/', { replace: true })
  }

  const voltar = () => {
    setStep('email')
    setError('')
  }

  if (step === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                <Users className="w-7 h-7 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Criar Conta</h1>
              <p className="text-sm text-slate-500">Digite seu email para começar</p>
            </div>

            {error && (
              <div className="space-y-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
                {(error.includes('cadastro') || error.includes('utilizado')) && (
                  <Link to="/login" className="flex items-center gap-1.5 text-red-800 font-medium hover:underline ml-6">
                    Ir para o login →
                  </Link>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={handleEmailKeyDown}
                placeholder="seu@email.com"
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>

            {!error && (
              <button onClick={handleContinue} disabled={checkingEmail || !email}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {checkingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {checkingEmail ? 'Verificando...' : 'Continuar'}
              </button>
            )}

            <div className="text-center text-sm text-slate-500">
              Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Fazer login</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            {convite ? (
              <>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                  <MailCheck className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Você foi convidado</h1>
                <p className="text-sm text-slate-500">
                  para entrar na <strong className="text-slate-700">{tenantNome || 'empresa'}</strong>
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Criar Nova Empresa</h1>
                <p className="text-sm text-slate-500">Cadastre sua empresa no RH System</p>
              </>
            )}
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed">
                <Mail className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="flex-1 truncate">{email}</span>
              </div>
            </div>

            {/* Nome da Empresa (só se NÃO for convite) */}
            {!convite && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nome da Empresa *</label>
                <input type="text" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                  placeholder="Minha Empresa Ltda" autoFocus
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
            )}

            {/* Nome Completo */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nome Completo</label>
              <input type="text" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Seu nome" autoFocus={!!convite}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>

            {/* Senha */}
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

            {/* Confirmar Senha */}
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

            {/* Botões */}
            <div className="flex gap-3">
              <button type="button" onClick={voltar}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                Voltar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Criando...' : convite ? 'Criar Conta' : 'Criar Empresa'}
              </button>
            </div>
          </form>

          <div className="text-center text-sm text-slate-500">
            Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Fazer login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
