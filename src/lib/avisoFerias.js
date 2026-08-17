// Geração do Aviso de Férias (art. 135 CLT): comunicação escrita ao empregado
// com antecedência mínima de 30 dias. Reusa o fluxo de AssinaturaDigital
// (html2canvas → PDF → Storage → AssinaturaDigital 'aguardando').
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { client } from '@/api/client';
import { getDiaRetorno, parseDataLocal } from '@/lib/ferias';
import { formatCurrency } from '@/lib/formatters';
import { registrarAuditoria, ACOES } from '@/lib/auditoriaDocumentos';

function fmtISO(iso) {
  if (!iso) return '—';
  const d = parseDataLocal(iso);
  return isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy');
}

function fmtDate(d) {
  if (!d) return '—';
  return isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy');
}

/** Monta o HTML do Aviso de Férias com os dados do funcionário e do gozo. */
export function montarHtmlAviso(funcionario, ferias) {
  const nome = funcionario?.nome || '';
  const cpf = funcionario?.cpf || '';
  const cargo = funcionario?.funcao || '';
  const setor = funcionario?.setor || '';
  const admissao = fmtISO(funcionario?.data_admissao);
  const periodoAquisitivo = ferias?.periodo_aquisitivo || '—';
  const dataInicio = fmtISO(ferias?.data_inicio);
  const dataFim = fmtISO(ferias?.data_fim);
  const retorno = fmtDate(getDiaRetorno(ferias?.data_fim));
  const diasFerias = ferias?.dias_gozados || 0;
  const diasAbono = ferias?.dias_abono || 0;
  const remuneracao = (funcionario?.salario_base || 0) + (funcionario?.ajuda_custo || 0);
  const terco = remuneracao / 3;
  const dataAviso = fmtDate(new Date());

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#1a1a1a;max-width:720px;margin:0 auto;">
    <div style="text-align:center;border-bottom:2px solid #0f766e;padding-bottom:12px;margin-bottom:20px;">
      <div style="font-size:11px;letter-spacing:2px;color:#0f766e;font-weight:bold;">DEPARTAMENTO DE RECURSOS HUMANOS</div>
      <div style="font-size:20px;font-weight:bold;margin-top:6px;color:#111;">AVISO DE FÉRIAS</div>
      <div style="font-size:11px;color:#555;margin-top:4px;">Comunicação ao empregado nos termos do art. 135 da CLT</div>
    </div>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:4px 8px;width:38%;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Empregado(a)</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${nome}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">CPF</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${cpf || '—'}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Cargo</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${cargo || '—'}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Setor</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${setor || '—'}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Data de Admissão</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${admissao}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Período Aquisitivo</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${periodoAquisitivo}º</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#0f766e;color:#fff;font-weight:bold;border:1px solid #0f766e;">Período de Gozo</td>
        <td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">
          de ${dataInicio} a ${dataFim}
        </td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Data de Retorno</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${retorno}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Dias de Férias</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${diasFerias} dias</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Abono Pecuniário</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${diasAbono > 0 ? `${diasAbono} dias` : 'Não'}</td>
      </tr>
      <tr>
        <td style="padding:4px 8px;background:#f0fdfa;font-weight:bold;border:1px solid #ddd;">Remuneração (ref.)</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${formatCurrency(remuneracao)} + 1/3 constitucional (${formatCurrency(terco)})</td>
      </tr>
    </table>

    <div style="margin-top:16px;padding:10px 12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;font-size:11.5px;color:#713f12;">
      <b>Nota legal:</b> conforme o art. 135 da CLT, a remuneração das férias, acrescida do terço
      constitucional, será paga até 2 (dois) dias antes do início do período de gozo. O presente
      aviso é emitido em 2 (duas) vias, sendo uma destinada ao empregado e outra ao empregador.
    </div>

    <div style="margin-top:24px;display:flex;gap:40px;">
      <div style="flex:1;text-align:center;padding-top:8px;border-top:1px solid #999;">
        Empregador(a)<br/><span style="font-size:11px;color:#555;">Assinatura e carimbo</span>
      </div>
      <div style="flex:1;text-align:center;padding-top:8px;border-top:1px solid #999;">
        ${nome}<br/><span style="font-size:11px;color:#555;">Assinatura do(a) empregado(a)</span>
      </div>
    </div>

    <div style="margin-top:20px;text-align:center;font-size:11px;color:#555;">
      Emitido em ${dataAviso} · ${nome}
    </div>
  </div>`;
}

/**
 * Gera o Aviso de Férias: renderiza o HTML, converte em PDF, envia para assinatura
 * (AssinaturaDigital status 'aguardando') e grava aviso_id no registro de férias.
 * @returns {Promise<object|null>} o documento de assinatura criado (ou null se falhar)
 */
export async function gerarAvisoFerias(funcionario, ferias) {
  try {
    if (!funcionario || !ferias) throw new Error('Funcionário e registro de férias obrigatórios');
    const html = montarHtmlAviso(funcionario, ferias);
    const nomeDoc = `Aviso de Férias — ${funcionario.nome || ''}${ferias.periodo_aquisitivo ? ` (${ferias.periodo_aquisitivo}º período)` : ''}`;

    // Renderiza o HTML em container off-screen
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;padding:40px;background:#fff;';
    container.innerHTML = html;
    document.body.appendChild(container);
    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
    document.body.removeChild(container);

    const { jsPDF } = await import('jspdf');
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], `${nomeDoc}.pdf`, { type: 'application/pdf' });
    const { file_url } = await client.integrations.Core.UploadFile({ file: pdfFile });

    const govbrLink = `https://assinador.iti.br/assinatura/uuid-${Date.now()}`;
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 7);
    const user = await client.auth.me();

    const assinatura = await client.entities.AssinaturaDigital.create({
      funcionario_id: ferias.funcionario_id,
      funcionario_nome: funcionario.nome || '',
      nome_documento: nomeDoc,
      descricao: `Aviso de Férias — ${ferias.periodo_aquisitivo || '—'}º período aquisitivo (${fmtISO(ferias.data_inicio)} a ${fmtISO(ferias.data_fim)})`,
      documento_url: file_url,
      status: 'aguardando',
      link_assinatura: govbrLink,
      enviado_por: user?.email || '',
      enviado_por_nome: user?.full_name || '',
      data_envio: new Date().toISOString(),
      data_expiracao: dataExpiracao.toISOString(),
      notificado: true,
      finalidade_nome: 'Aviso de Férias',
      pasta_destino: 'ferias',
    });

    // Vincula o aviso ao registro de férias
    await client.entities.Ferias.update(ferias.id, { aviso_id: assinatura.id });

    // Auditoria de documentos
    await registrarAuditoria({
      acao: ACOES.ENVIAR_ASSINATURA,
      modulo: 'assinatura',
      descricao: `Aviso de Férias enviado para assinatura de ${funcionario.nome}.`,
      origem: 'rh',
      documento_id: assinatura.id,
      funcionario_id: ferias.funcionario_id,
      funcionario_nome: funcionario.nome,
      nome_documento: nomeDoc,
      dados_depois: { status: 'aguardando', link_assinatura: govbrLink, data_expiracao: dataExpiracao.toISOString() },
    });

    // Notifica o funcionário no portal
    await client.entities.MensagensRH.create({
      titulo: '📋 Aviso de Férias disponível para assinatura',
      mensagem: `${funcionario.nome}, suas férias (${ferias.periodo_aquisitivo || '—'}º período) foram programadas de ${fmtISO(ferias.data_inicio)} a ${fmtISO(ferias.data_fim)}. Acesse "Assinaturas Digitais" no portal para conferir e assinar o aviso.`,
      tipo: 'aviso',
      data_envio: new Date().toISOString(),
      enviado_por: user?.email || '',
      publico_alvo: 'funcionario',
      funcionario_id_alvo: ferias.funcionario_id,
      push_ativado: false,
      lidas_por: [],
    });

    return assinatura;
  } catch (e) {
    console.error('[Aviso de Férias] Erro ao gerar:', e?.message || e);
    return null;
  }
}
