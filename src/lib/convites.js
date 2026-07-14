import { client } from '@/api/client';
import { getCurrentTenantId } from '@/firebase/auth';

export async function criarOuReenviarConvite(funcionario) {
  if (!funcionario?.email) {
    throw new Error('Funcionário não possui email cadastrado');
  }

  const existentes = await client.entities.convites.filter({
    funcionario_id: funcionario.id,
    status: 'pendente',
  });

  if (existentes.length > 0) return existentes[0];

  return await client.entities.convites.create({
    email: funcionario.email,
    funcionario_id: funcionario.id,
    funcionario_nome: funcionario.nome,
    status: 'pendente',
    tenant_id: getCurrentTenantId() || '',
    created_date: new Date().toISOString(),
  });
}
