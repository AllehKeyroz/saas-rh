import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingUp, CreditCard, PiggyBank, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

function SimuladorJurosCompostos() {
  const [capital, setCapital] = useState('');
  const [taxa, setTaxa] = useState('');
  const [meses, setMeses] = useState('');
  const [resultado, setResultado] = useState(null);

  const calcular = () => {
    const c = parseFloat(capital) || 0;
    const t = (parseFloat(taxa) || 0) / 100;
    const m = parseInt(meses) || 0;
    const montante = c * Math.pow(1 + t, m);
    setResultado({ montante, juros: montante - c });
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600" />Juros Compostos</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Capital (R$)</Label><Input type="number" value={capital} onChange={e => setCapital(e.target.value)} placeholder="1000" /></div>
          <div><Label className="text-xs">Taxa a.m. (%)</Label><Input type="number" value={taxa} onChange={e => setTaxa(e.target.value)} placeholder="1.0" /></div>
        </div>
        <div><Label className="text-xs">Período (meses)</Label><Input type="number" value={meses} onChange={e => setMeses(e.target.value)} placeholder="12" /></div>
        <Button size="sm" onClick={calcular} className="w-full">Calcular</Button>
        {resultado && (
          <div className="bg-green-50 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm"><span>Montante final:</span><span className="font-bold text-green-700">{formatCurrency(resultado.montante)}</span></div>
            <div className="flex justify-between text-sm"><span>Juros ganhos:</span><span className="font-bold text-green-600">+{formatCurrency(resultado.juros)}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimuladorReserva() {
  const [salario, setSalario] = useState('');
  const [meses, setMeses] = useState('6');
  const [resultado, setResultado] = useState(null);

  const calcular = () => {
    const s = parseFloat(salario) || 0;
    const m = parseInt(meses) || 6;
    const total = s * m;
    const por_mes_10 = total / 12;
    const por_mes_20 = total / 6;
    setResultado({ total, por_mes_10, por_mes_20 });
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PiggyBank className="w-4 h-4 text-blue-600" />Reserva de Emergência</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Salário líquido (R$)</Label><Input type="number" value={salario} onChange={e => setSalario(e.target.value)} /></div>
          <div>
            <Label className="text-xs">Meses de reserva</Label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={meses} onChange={e => setMeses(e.target.value)}>
              <option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option>
            </select>
          </div>
        </div>
        <Button size="sm" onClick={calcular} className="w-full">Calcular</Button>
        {resultado && (
          <div className="bg-blue-50 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm"><span>Meta de reserva:</span><span className="font-bold text-blue-700">{formatCurrency(resultado.total)}</span></div>
            <div className="flex justify-between text-sm"><span>Guardando 10%/mês:</span><span className="font-medium">{Math.ceil(resultado.total / (resultado.por_mes_10 > 0 ? 1 : 1))} meses</span></div>
            <div className="flex justify-between text-sm"><span>Poupar 10% ao mês:</span><span className="font-medium">{formatCurrency(parseFloat(salario) * 0.1)}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimuladorAVistaParcelado() {
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState('12');
  const [taxa, setTaxa] = useState('');
  const [resultado, setResultado] = useState(null);

  const calcular = () => {
    const v = parseFloat(valor) || 0;
    const n = parseInt(parcelas) || 12;
    const t = (parseFloat(taxa) || 0) / 100;
    const parcela = t > 0 ? v * (t * Math.pow(1 + t, n)) / (Math.pow(1 + t, n) - 1) : v / n;
    const totalPago = parcela * n;
    setResultado({ parcela, totalPago, juros: totalPago - v });
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-orange-600" />À Vista vs Parcelado</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Valor à vista (R$)</Label><Input type="number" value={valor} onChange={e => setValor(e.target.value)} /></div>
          <div><Label className="text-xs">Nº Parcelas</Label><Input type="number" value={parcelas} onChange={e => setParcelas(e.target.value)} /></div>
        </div>
        <div><Label className="text-xs">Taxa juros/mês (%)</Label><Input type="number" value={taxa} onChange={e => setTaxa(e.target.value)} placeholder="0 = sem juros" /></div>
        <Button size="sm" onClick={calcular} className="w-full">Calcular</Button>
        {resultado && (
          <div className="bg-orange-50 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm"><span>Parcela:</span><span className="font-bold text-orange-700">{formatCurrency(resultado.parcela)}</span></div>
            <div className="flex justify-between text-sm"><span>Total pago:</span><span className="font-bold">{formatCurrency(resultado.totalPago)}</span></div>
            <div className="flex justify-between text-sm text-red-600"><span>Juros totais:</span><span className="font-bold">+{formatCurrency(resultado.juros)}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimuladorDivida() {
  const [saldo, setSaldo] = useState('');
  const [taxa, setTaxa] = useState('');
  const [pagamento, setPagamento] = useState('');
  const [resultado, setResultado] = useState(null);

  const calcular = () => {
    const s = parseFloat(saldo) || 0;
    const t = (parseFloat(taxa) || 0) / 100;
    const p = parseFloat(pagamento) || 0;
    if (p <= s * t) { setResultado({ erro: 'O pagamento não cobre nem os juros! Aumente o valor.' }); return; }
    let meses = 0, total = s;
    while (total > 0 && meses < 600) { total = total * (1 + t) - p; meses++; }
    const totalPago = p * meses;
    setResultado({ meses, totalPago, juros: totalPago - s });
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-red-600" />Quitação de Dívida</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Saldo devedor (R$)</Label><Input type="number" value={saldo} onChange={e => setSaldo(e.target.value)} /></div>
          <div><Label className="text-xs">Juros/mês (%)</Label><Input type="number" value={taxa} onChange={e => setTaxa(e.target.value)} /></div>
        </div>
        <div><Label className="text-xs">Pagamento mensal (R$)</Label><Input type="number" value={pagamento} onChange={e => setPagamento(e.target.value)} /></div>
        <Button size="sm" onClick={calcular} className="w-full">Simular</Button>
        {resultado && (
          resultado.erro ? (
            <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700">{resultado.erro}</div>
          ) : (
            <div className="bg-red-50 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-sm"><span>Meses para quitar:</span><span className="font-bold text-red-700">{resultado.meses}</span></div>
              <div className="flex justify-between text-sm"><span>Total a pagar:</span><span className="font-bold">{formatCurrency(resultado.totalPago)}</span></div>
              <div className="flex justify-between text-sm text-red-600"><span>Juros totais:</span><span className="font-bold">+{formatCurrency(resultado.juros)}</span></div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

export default function SimuladoresFinanceiros() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-5 h-5 text-primary" />
        <p className="font-semibold text-sm">Simuladores Financeiros</p>
      </div>
      <SimuladorJurosCompostos />
      <SimuladorReserva />
      <SimuladorAVistaParcelado />
      <SimuladorDivida />
    </div>
  );
}