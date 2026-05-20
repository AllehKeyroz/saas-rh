/**
 * Utilitário centralizado de auditoria de documentos.
 * Registra eventos imutáveis para rastreabilidade completa.
 */
import { client } from '@/api/client';

/**
 * Registra um evento de auditoria de documentos.
 * @param {object} params
 */
export async function registrarAuditoria({
  acao,
  modulo,
  descricao,
  origem = 'sistema',
  documento_id = null,
  funcionario_id = null,
  funcionario_nome = null,
  nome_documento = null,
  dados_antes = null,
  dados_depois = null,
  govbr_payload = null,
  hash_documento = null,
  certificado_url = null,
}) {
  let usuario_email = '';
  let usuario_nome = '';
  try {
    const user = await client.auth.me();
    usuario_email = user?.email || '';
    usuario_nome = user?.full_name || '';
  } catch (_) {
    // ação do sistema sem usuário logado
  }

  const payload = {
    acao,
    modulo,
    descricao,
    origem,
    usuario_email,
    usuario_nome,
  };

  if (documento_id)    payload.documento_id    = documento_id;
  if (funcionario_id)  payload.funcionario_id  = funcionario_id;
  if (funcionario_nome) payload.funcionario_nome = funcionario_nome;
  if (nome_documento)  payload.nome_documento  = nome_documento;
  if (dados_antes)     payload.dados_antes     = dados_antes;
  if (dados_depois)    payload.dados_depois    = dados_depois;
  if (govbr_payload)   payload.govbr_payload   = govbr_payload;
  if (hash_documento)  payload.hash_documento  = hash_documento;
  if (certificado_url) payload.certificado_url = certificado_url;

  await client.entities.AuditoriaDocumentos.create(payload);
}

// ── Ações pré-definidas ───────────────────────────────────────────────────────

export const ACOES = {
  // Modelos
  MODELO_CRIADO:          'MODELO_CRIADO',
  MODELO_EDITADO:         'MODELO_EDITADO',
  MODELO_EXCLUIDO:        'MODELO_EXCLUIDO',
  MODELO_ATIVADO:         'MODELO_ATIVADO',
  MODELO_DESATIVADO:      'MODELO_DESATIVADO',
  // Finalidades
  FINALIDADE_CRIADA:      'FINALIDADE_CRIADA',
  FINALIDADE_EDITADA:     'FINALIDADE_EDITADA',
  FINALIDADE_EXCLUIDA:    'FINALIDADE_EXCLUIDA',
  // Assinatura
  ENVIAR_ASSINATURA:      'ENVIAR_ASSINATURA',
  CANCELAR_ASSINATURA:    'CANCELAR_ASSINATURA',
  REENVIAR_LINK:          'REENVIAR_LINK',
  BAIXAR_DOCUMENTO:       'BAIXAR_DOCUMENTO',
  BAIXAR_ASSINADO:        'BAIXAR_ASSINADO',
  ALTERAR_STATUS:         'ALTERAR_STATUS',
  // GovBR / Sistema
  GOVBR_LINK_GERADO:      'GOVBR_LINK_GERADO',
  GOVBR_CALLBACK:         'GOVBR_CALLBACK',
  GOVBR_ASSINADO:         'GOVBR_ASSINADO',
  GOVBR_RECUSADO:         'GOVBR_RECUSADO',
  GOVBR_FALHA:            'GOVBR_FALHA',
  DOCUMENTO_EXPIRADO:     'DOCUMENTO_EXPIRADO',
  DOCUMENTO_ARMAZENADO:   'DOCUMENTO_ARMAZENADO',
  HASH_SALVO:             'HASH_SALVO',
  CERTIFICADO_SALVO:      'CERTIFICADO_SALVO',
  // Colaborador
  VISUALIZAR_DOCUMENTO:   'VISUALIZAR_DOCUMENTO',
  CLICAR_ASSINAR:         'CLICAR_ASSINAR',
  DOCUMENTO_CARREGADO:    'DOCUMENTO_CARREGADO',
};