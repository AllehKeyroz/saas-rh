import * as XLSX from 'xlsx';
import { formatDate, TIPO_LABELS, mergeTipos } from './formatters';

function fmtNum(val) {
  return val ?? 0;
}

function applyCurrencyFormat(ws, colIndex, startRow, endRow) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = startRow; r <= endRow; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: colIndex });
    if (ws[addr]) {
      ws[addr].z = '#,##0.00';
    }
  }
}

export async function exportFechamentoXLSX(funcionarios, lancamentos, fechamentos, calcular, mesRef, tiposLancamento) {
  const lancMes = lancamentos.filter(l => {
    if (!l.data_lancamento) return false;
    const [mm, yyyy] = mesRef.split('/');
    const d = new Date(l.data_lancamento);
    return d.getMonth() === parseInt(mm) - 1 && d.getFullYear() === parseInt(yyyy);
  });

  const descontosList = mergeTipos(tiposLancamento, 'desconto');
  const adicionaisList = mergeTipos(tiposLancamento, 'adicional');
  const ativos = funcionarios.filter(f => f.ativo !== false);

  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Resumo Geral ───────────────────────────────────────────────
  const resumoHeaders = ['Funcionário', 'Função', 'Setor', 'Admissão', 'Salário Base', 'Ajuda de Custo', 'Total Descontos', 'Total Adicionais', 'Comissão', 'Salário Líquido', 'Qtd. Lançamentos'];
  const resumoData = ativos.map(func => {
    const calc = calcular(func.id);
    const funcLanc = lancMes.filter(l => l.funcionario_id === func.id);
    return [
      func.nome,
      func.funcao || '—',
      func.setor || '—',
      formatDate(func.data_admissao) || '—',
      fmtNum(func.salario_base),
      fmtNum(func.ajuda_custo),
      fmtNum(calc.totalDescontos),
      fmtNum(calc.totalAdicionais),
      fmtNum(calc.comissaoGorjeta),
      fmtNum(calc.salarioLiquido),
      funcLanc.length,
    ];
  });

  const totals = [
    'TOTAIS', '', '', '',
    resumoData.reduce((s, r) => s + r[4], 0),
    resumoData.reduce((s, r) => s + r[5], 0),
    resumoData.reduce((s, r) => s + r[6], 0),
    resumoData.reduce((s, r) => s + r[7], 0),
    resumoData.reduce((s, r) => s + r[8], 0),
    resumoData.reduce((s, r) => s + r[9], 0),
    resumoData.reduce((s, r) => s + r[10], 0),
  ];

  const ws1Data = [resumoHeaders, ...resumoData, totals];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  ws1['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }];
  applyCurrencyFormat(ws1, 4, 2, ws1Data.length);
  applyCurrencyFormat(ws1, 5, 2, ws1Data.length);
  applyCurrencyFormat(ws1, 6, 2, ws1Data.length);
  applyCurrencyFormat(ws1, 7, 2, ws1Data.length);
  applyCurrencyFormat(ws1, 8, 2, ws1Data.length);
  applyCurrencyFormat(ws1, 9, 2, ws1Data.length);

  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');

  // ─── Sheet 2: Lançamentos Individuais ────────────────────────────────────
  const lancHeaders = ['Funcionário', 'Setor', 'Data', 'Tipo', 'Descrição', 'Categoria', 'Valor'];
  const lancData = lancMes.map(l => {
    const func = funcionarios.find(f => f.id === l.funcionario_id);
    const isDesc = descontosList.includes(l.tipo_lancamento);
    const isAdic = adicionaisList.includes(l.tipo_lancamento);
    return [
      func?.nome || '—',
      func?.setor || '—',
      l.data_lancamento ? formatDate(l.data_lancamento) : '—',
      TIPO_LABELS[l.tipo_lancamento] || l.tipo_lancamento,
      l.descricao || '—',
      isDesc ? 'Desconto' : isAdic ? 'Adicional' : 'Outro',
      fmtNum(l.valor),
    ];
  });

  const ws2Data = [lancHeaders, ...lancData];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 14 }];
  applyCurrencyFormat(ws2, 6, 2, ws2Data.length);

  XLSX.utils.book_append_sheet(wb, ws2, 'Lançamentos');

  // ─── Sheet 3: Detalhamento por Funcionário ───────────────────────────────
  const detHeaders = ['Funcionário', 'Tipo', 'Descrição', 'Valor'];
  const detData = [detHeaders];
  for (const func of ativos) {
    const funcLanc = lancMes.filter(l => l.funcionario_id === func.id);
    if (funcLanc.length === 0) continue;
    detData.push([func.nome, '', '', '']);
    const subDesconto = funcLanc.filter(l => descontosList.includes(l.tipo_lancamento)).reduce((s, l) => s + (l.valor || 0), 0);
    const subAdicional = funcLanc.filter(l => adicionaisList.includes(l.tipo_lancamento)).reduce((s, l) => s + (l.valor || 0), 0);
    detData.push(['', '▶ Descontos', '', subDesconto]);
    funcLanc.filter(l => descontosList.includes(l.tipo_lancamento)).forEach(l => {
      detData.push(['', TIPO_LABELS[l.tipo_lancamento] || l.tipo_lancamento, l.descricao || '—', fmtNum(l.valor)]);
    });
    detData.push(['', '▶ Adicionais', '', subAdicional]);
    funcLanc.filter(l => adicionaisList.includes(l.tipo_lancamento)).forEach(l => {
      detData.push(['', TIPO_LABELS[l.tipo_lancamento] || l.tipo_lancamento, l.descricao || '—', fmtNum(l.valor)]);
    });
    detData.push(['', '', '', '']);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(detData);
  ws3['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 30 }, { wch: 14 }];
  applyCurrencyFormat(ws3, 3, 2, detData.length);

  XLSX.utils.book_append_sheet(wb, ws3, 'Detalhamento');

  // ─── Download ────────────────────────────────────────────────────────────
  XLSX.writeFile(wb, `fechamento_${mesRef.replace('/', '-')}.xlsx`);
}
