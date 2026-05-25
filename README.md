<div align="center">
  <br/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind"/>
  <br/><br/>
  <h1 align="center">🏢 RHDTalia</h1>
  <p align="center"><strong>Sistema de Gestão de Recursos Humanos</strong></p>
  <p align="center">Multi-tenant · SaaS · Cloud Native</p>
  <br/>
</div>

---

## ✨ Visão Geral

**RHDTalia** é um sistema completo de RH que cobre desde o cadastro de funcionários até fechamento mensal, comissões, assinaturas digitais, portal do funcionário e vida financeira. Construído sobre **Firebase** (Auth + Firestore + Storage) com arquitetura **multi-tenant**, cada empresa tem seus dados isolados por `tenant_id`.

🔗 **Produção:** [rhdtalia.web.app](https://rhdtalia.web.app)

---

## 🧱 Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + Vite 6 |
| **UI** | shadcn/ui + Tailwind CSS + Radix UI |
| **Ícones** | Lucide React |
| **Estado & Cache** | TanStack React Query |
| **Roteamento** | React Router v6 |
| **Backend** | Firebase Auth · Firestore · Storage |
| **PDF** | jsPDF + jspdf-autotable |
| **Planilhas** | SheetJS (xlsx) |
| **ZIP** | JSZip |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│                  Firebase Auth                   │
│            (login · register · sessão)           │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              Firestore (db. rhdtalia)            │
│  32 coleções · tenant_id em cada documento      │
│  Regras: isAuthenticated() + isRH()/isAdmin()   │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              Client Proxy (client.js)            │
│  Injeta tenant_id automaticamente               │
│  Filtra listas por tenant_id                    │
│  Skip para: users, convites, tenants            │
└─────────────────────────────────────────────────┘
```

### 🔐 Roles de Acesso

| Role | Acesso |
|------|--------|
| **admin** | Total — usuários, auditoria, configurações, reprocessar |
| **user** (RH) | Operacional — funcionários, lançamentos, fechamento |
| **funcionario** | Apenas Portal do Funcionário (próprios dados) |
| **consulta** | 🔴 Leitura (atualmente sem interface) |
| **inativo** | 🔴 Bloqueado (rota livre, Firestore bloqueia escritas) |

> Matriz completa em [`MATRIZ_ACESSO.md`](./MATRIZ_ACESSO.md)

---

## 📦 Módulos

### 🖥️ Administrativo (admin + user)

| Módulo | Rotas | Descrição |
|--------|-------|-----------|
| **Dashboard RH** | `/` | KPIs: ativos, solicitações, férias vencidas, vales, comissões, gráficos |
| **Funcionários** | `/funcionarios` | Cadastro completo, foto, documentos, férias, banco de horas, permissões do portal |
| **Visão 360°** | `/funcionarios/:id/360` | Perfil completo com 17 abas |
| **Lançamentos** | `/lancamentos` | Vales, adiantamentos, convênios, comissões, parcelamento, limite 40% em tempo real |
| **Fechamento Mensal** | `/fechamento` | Processar, reprocessar, reabrir, exportar contracheques em PDF/ZIP |
| **Comissões** | `/comissoes` | Lançamento, divisão automática por setor, metas, histórico |
| **Relatórios** | `/relatorios` | Geral, individual, comparativo, limites, exportação PDF/Excel |
| **Solicitações** | `/solicitacoes` | Aprovação/recusa, resposta em lote, urgência, exportação |
| **Comunicação** | `/comunicacao` | Mensagens em massa, push notifications, relatório de visualização |
| **Advertências** | `/advertencias` | Registro e histórico |
| **Assinaturas** | `/assinaturas-digitais` | Envio, modelos, GovBR, auditoria |
| **Logs Financeiros** | `/logs-financeiros` | Erros do sistema, notificações |
| **Espelho do Portal** | `/espelho-portal` | Visualização read-only do que o funcionário vê |

### ⚙️ Administração (admin apenas)

| Módulo | Rotas | Descrição |
|--------|-------|-----------|
| **Usuários** | `/usuarios` | Criar/gerenciar contas admin e RH |
| **Auditoria** | `/auditoria` | Log de todas as ações com diff antes/depois |
| **Configurações** | `/configuracoes` | Setores, funções, tipos de lançamento, temas, notificações, GovBR, backups, limite de vales |
| **Centro de Controle** | `/centro-controle-rh` | Alertas, permissões, módulos on/off, vida financeira |
| **Modelos de Documentos** | `/modelos-documentos` | Templates HTML com variáveis |
| **Auditoria de Documentos** | `/auditoria-documentos` | Eventos de documentos e assinaturas |

### 👤 Portal do Funcionário

| Módulo | Descrição |
|--------|-----------|
| **Visão Geral** | Dashboard pessoal com saldo de vales e alertas |
| **Meus Dados** | Informações cadastrais |
| **Meu Salário** | Contracheques com limite de 40% e barra de utilização |
| **Meus Vales** | Extrato, limite disponível, progresso |
| **Extrato Mensal** | Lançamentos do período |
| **Minha Vida Financeira** | Gastos, dívidas, assinaturas, metas, simuladores |
| **Comissões** | Recebidos por período |
| **Metas** | Progresso de comissão |
| **Mensagens** | Caixa de entrada |
| **Solicitações** | Abertura e acompanhamento |
| **Assinaturas** | Documentos pendentes de assinatura |

---

## 🚀 Começando

### Pré-requisitos

- Node.js 18+
- Projeto Firebase com Auth, Firestore e Storage habilitados

### Variáveis de Ambiente

```bash
cp .env.example .env
```

Preencha com as credenciais do seu projeto Firebase:

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rhdtalia
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=1:xxx:web:xxx
VITE_FIREBASE_MEASUREMENT_ID=G-xxx
VITE_LOGIN_URL=/login
```

### Instalar e Rodar

```bash
npm install
npm run dev          # Desenvolvimento (localhost:5173)
npm run build        # Produção
npm run preview      # Preview do build
```

### Firestore

```bash
# Nome do banco: rhdtalia
# Região: southamerica-east1
# Aplicar regras: firebase deploy --only firestore:rules
```

---

## 🌐 Deploy

```bash
firebase deploy --only hosting
```

O projeto está hospedado em [rhdtalia.web.app](https://rhdtalia.web.app).

> Cloud Functions (sendEmail, calcularLimiteValeMensal) pendentes de deploy. Toda lógica executa client-side.

---

## 🤝 Contribuindo

1. Faça um fork
2. Crie uma branch: `git checkout -b feat/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feat/nova-funcionalidade`
5. Abra um Pull Request

---

## 📄 Licença

Proprietária — todos os direitos reservados.

---

<div align="center">
  <sub>Feito com ❤️ por <strong>AllehKeyroz</strong></sub>
</div>
