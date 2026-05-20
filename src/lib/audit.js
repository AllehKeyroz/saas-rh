import { client } from '@/api/client';

/**
 * Registra uma entrada no log de auditoria.
 * @param {object} params
 * @param {'criar'|'editar'|'excluir'} params.acao
 * @param {'funcionario'|'lancamento'} params.modulo
 * @param {string} params.descricao - Texto legível do que mudou
 * @param {string} [params.entidade_id]
 * @param {object} [params.dados_anteriores]
 * @param {object} [params.dados_novos]
 */
export async function registrarAuditoria({ acao, modulo, descricao, entidade_id, dados_anteriores, dados_novos }) {
  try {
    const me = await client.auth.me();
    await client.entities.LogAuditoria.create({
      usuario_email: me.email,
      usuario_nome: me.full_name || me.email,
      acao,
      modulo,
      descricao,
      entidade_id: entidade_id || null,
      dados_anteriores: dados_anteriores || null,
      dados_novos: dados_novos || null,
    });
  } catch (e) {
    // Falha silenciosa para não bloquear o fluxo principal
    console.error('Auditoria falhou:', e);
  }
}