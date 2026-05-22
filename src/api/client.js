import { getEntity } from '@/firebase/db'
import * as auth from '@/firebase/auth'
import { uploadFile } from '@/firebase/storage'
import { sendEmail } from '@/firebase/email'

// Coleções que NÃO recebem tenant_id (sistema global)
const SKIP_TENANT = new Set([
  'users', 'convites', 'tenants',
  'ApplicationError', 'LogNotificacao',
])

function wrapEntity(entityName) {
  const base = getEntity(entityName)
  const skipTenant = SKIP_TENANT.has(entityName)

  return {
    list: async (orderByField, limitCount) => {
      if (skipTenant) return base.list(orderByField, limitCount)
      const tid = auth.getCurrentTenantId()
      if (!tid) return []
      return base.filter({ tenant_id: tid }, orderByField, limitCount)
    },
    get: (id) => base.get(id),
    create: async (data) => {
      if (skipTenant) return base.create(data)
      // Se o dado já tem tenant_id explícito, respeita; senão usa do contexto
      if (data.tenant_id) return base.create(data)
      const tid = auth.getCurrentTenantId()
      if (!tid) throw new Error('Usuário sem tenant vinculado')
      return base.create({ ...data, tenant_id: tid })
    },
    update: (id, data) => base.update(id, data),
    delete: (id) => base.delete(id),
    filter: async (filters, orderByField, limitCount) => {
      if (skipTenant) return base.filter(filters, orderByField, limitCount)
      const tid = auth.getCurrentTenantId()
      if (!tid) return []
      return base.filter({ ...filters, tenant_id: tid }, orderByField, limitCount)
    },
    bulkCreate: async (dataArray) => {
      if (skipTenant) return base.bulkCreate(dataArray)
      const tid = auth.getCurrentTenantId()
      if (!tid) throw new Error('Usuário sem tenant vinculado')
      return base.bulkCreate(dataArray.map(d => ({ ...d, tenant_id: d.tenant_id || tid })))
    },
    subscribe: (callback) => base.subscribe(callback),
  }
}

const entityProxy = new Proxy({}, {
  get(_, entityName) {
    return wrapEntity(entityName)
  }
})

async function invokeFunction(name, params) {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  const region = 'us-central1'
  const url = `https://${region}-${projectId}.cloudfunctions.net/${name}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`Function ${name} failed:`, text)
      return null
    }
    return res.json()
  } catch (e) {
    console.error(`Function ${name} error:`, e.message)
    return null
  }
}

export const client = {
  entities: entityProxy,
  auth: {
    me: auth.me,
    logout: auth.logout,
    redirectToLogin: auth.navigateToLogin,
  },
  functions: {
    invoke: invokeFunction,
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        return uploadFile({ file })
      },
      SendEmail: async ({ to, subject, body }) => {
        return sendEmail({ to, subject, body })
      },
    },
  },
}
