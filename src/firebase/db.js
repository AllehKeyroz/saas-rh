import { db } from './config'
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, writeBatch, onSnapshot } from 'firebase/firestore'

class FirestoreEntity {
  constructor(collectionName) {
    this.collectionName = collectionName
    this.collectionRef = collection(db, collectionName)
  }

  async list(orderByField, limitCount) {
    let q = query(this.collectionRef)
    if (orderByField) {
      const dir = orderByField.startsWith('-') ? 'desc' : 'asc'
      const field = orderByField.replace(/^-/, '')
      q = query(q, orderBy(field, dir))
    }
    if (limitCount) {
      q = query(q, limit(limitCount))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  async get(id) {
    const d = await getDoc(doc(this.collectionRef, id))
    if (!d.exists()) return null
    return { id: d.id, ...d.data() }
  }

  async create(data) {
    const d = await addDoc(this.collectionRef, {
      ...data,
      created_date: new Date().toISOString(),
    })
    return { id: d.id, ...data }
  }

  async update(id, data) {
    await updateDoc(doc(this.collectionRef, id), {
      ...data,
      updated_date: new Date().toISOString(),
    })
    const d = await getDoc(doc(this.collectionRef, id))
    return { id: d.id, ...d.data() }
  }

  async delete(id) {
    await deleteDoc(doc(this.collectionRef, id))
    return true
  }

  async filter(filters, orderByField, limitCount) {
    const constraints = []
    for (const [field, value] of Object.entries(filters)) {
      constraints.push(where(field, '==', value))
    }
    if (orderByField) {
      const dir = orderByField.startsWith('-') ? 'desc' : 'asc'
      constraints.push(orderBy(orderByField.replace(/^-/, ''), dir))
    }
    if (limitCount) constraints.push(limit(limitCount))
    try {
      const q = query(this.collectionRef, ...constraints)
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (e) {
      // Fallback: se falhar (ex: índice composto faltando), busca sem orderBy e ordena client-side
      console.warn(`Firestore query failed for ${this.collectionName}, falling back to client-side:`, e.message)
      const whereConstraints = []
      for (const [field, value] of Object.entries(filters)) {
        whereConstraints.push(where(field, '==', value))
      }
      const fallbackQ = query(this.collectionRef, ...whereConstraints)
      const snapshot = await getDocs(fallbackQ)
      let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      if (orderByField) {
        const field = orderByField.replace(/^-/, '')
        const dir = orderByField.startsWith('-') ? 'desc' : 'asc'
        results.sort((a, b) => {
          const va = a[field] || '', vb = b[field] || ''
          return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
        })
      }
      if (limitCount) results = results.slice(0, limitCount)
      return results
    }
  }

  async bulkCreate(dataArray) {
    const batch = writeBatch(db)
    const results = []
    for (const data of dataArray) {
      const ref = doc(collection(db, this.collectionName))
      batch.set(ref, { ...data, created_date: new Date().toISOString() })
      results.push({ id: ref.id, ...data })
    }
    await batch.commit()
    return results
  }

  subscribe(callback) {
    const q = query(this.collectionRef, orderBy('created_date', 'desc'), limit(100))
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const changeType = change.type === 'added' ? 'create' : 'update'
        const data = { id: change.doc.id, ...change.doc.data() }
        callback({ data, type: changeType })
      })
    })
    return unsub
  }
}

export const entities = {}

export function registerEntity(name) {
  entities[name] = new FirestoreEntity(name)
  return entities[name]
}

export function getEntity(name) {
  if (!entities[name]) {
    registerEntity(name)
  }
  return entities[name]
}

const ENTITY_NAMES = [
  'Funcionarios', 'FichaFinanceira', 'FechamentoMensal',
  'ComissoesGorjetas', 'ComissaoPorFuncionario', 'SetoresComissao',
  'MetaComissao', 'HistoricoAlteracaoComissao', 'Setor',
  'Funcao', 'TipoLancamento', 'ConfiguracoesRH',
  'ConfiguracaoNotificacao', 'ConfiguracaoAparencia', 'BackupRegistro',
  'LogAuditoria', 'AuditoriaDocumentos', 'ApplicationError',
  'LogNotificacao', 'AssinaturaDigital', 'ModeloDocumento',
  'FinalidadeDocumento', 'ModeloAdvertencia', 'Advertencias',
  'DocumentoFuncionario', 'Ferias', 'SolicitacoesFuncionario', 'MensagensRH',
  'GastosPessoais', 'DividasPessoais', 'AssinaturasPessoais',
  'MetasObjetivos', 'MetaFinanceira', 'users', 'convites',
  'Consignado',
]

ENTITY_NAMES.forEach(registerEntity)

export default FirestoreEntity
