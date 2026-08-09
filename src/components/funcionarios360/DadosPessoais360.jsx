import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency } from '@/lib/formatters';

function InfoLinha({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <p className="text-sm font-medium mt-1">{children || '-'}</p>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {children}
      </CardContent>
    </Card>
  );
}

export default function DadosPessoais360({ funcionario }) {
  const dependentes = funcionario.dependentes || [];
  const historicoContratos = funcionario.historico_contratos || [];

  return (
    <div className="space-y-6">
      {/* Dados Cadastrais */}
      <Secao titulo="Dados Cadastrais">
        <InfoLinha label="Nome">{funcionario.nome}</InfoLinha>
        <InfoLinha label="E-mail">{funcionario.email}</InfoLinha>
        <InfoLinha label="Telefone">{funcionario.telefone}</InfoLinha>
        <InfoLinha label="Data de Nascimento">{funcionario.data_nascimento ? formatDate(funcionario.data_nascimento) : null}</InfoLinha>
        <InfoLinha label="Nacionalidade">{funcionario.nacionalidade}</InfoLinha>
        <InfoLinha label="Naturalidade">{funcionario.naturalidade}</InfoLinha>
        <InfoLinha label="Estado Civil">{funcionario.estado_civil}</InfoLinha>
        <InfoLinha label="Nome da Mãe">{funcionario.nome_mae}</InfoLinha>
        <InfoLinha label="Gênero">{funcionario.genero}</InfoLinha>
        <InfoLinha label="PCD">
          {funcionario.pcd ? <Badge variant="default" className="text-xs">Sim</Badge> : 'Não'}
        </InfoLinha>
      </Secao>

      {/* Documentos */}
      <Secao titulo="Documentos">
        <InfoLinha label="CPF">{funcionario.cpf}</InfoLinha>
        <InfoLinha label="RG">{funcionario.rg}</InfoLinha>
        <InfoLinha label="RG Órgão Emissor">{funcionario.rg_orgao}</InfoLinha>
        <InfoLinha label="RG UF">{funcionario.rg_uf}</InfoLinha>
        <InfoLinha label="CTPS">{funcionario.ctps}</InfoLinha>
        <InfoLinha label="CTPS Série">{funcionario.ctps_serie}</InfoLinha>
        <InfoLinha label="PIS">{funcionario.pis}</InfoLinha>
        <InfoLinha label="Título de Eleitor">{funcionario.titulo_eleitor}</InfoLinha>
        <InfoLinha label="Reservista">{funcionario.reservista}</InfoLinha>
        <InfoLinha label="CNH">{funcionario.cnh}</InfoLinha>
      </Secao>

      {/* Endereço */}
      <Secao titulo="Endereço">
        <InfoLinha label="CEP">{funcionario.cep}</InfoLinha>
        <InfoLinha label="Logradouro">{funcionario.logradouro}</InfoLinha>
        <InfoLinha label="Número">{funcionario.numero}</InfoLinha>
        <InfoLinha label="Complemento">{funcionario.complemento}</InfoLinha>
        <InfoLinha label="Bairro">{funcionario.bairro}</InfoLinha>
        <InfoLinha label="Cidade">{funcionario.cidade}</InfoLinha>
        <InfoLinha label="UF">{funcionario.uf}</InfoLinha>
      </Secao>

      {/* Dados Bancários */}
      <Secao titulo="Dados Bancários">
        <InfoLinha label="Banco">{funcionario.banco}</InfoLinha>
        <InfoLinha label="Agência">
          {funcionario.agencia}{funcionario.agencia_dv ? `-${funcionario.agencia_dv}` : ''}
        </InfoLinha>
        <InfoLinha label="Conta">
          {funcionario.conta}{funcionario.conta_dv ? `-${funcionario.conta_dv}` : ''}
        </InfoLinha>
        <InfoLinha label="Tipo de Conta">{funcionario.tipo_conta}</InfoLinha>
        <InfoLinha label="Chave PIX">
          {funcionario.chave_pix ? `${funcionario.chave_pix} (${funcionario.chave_pix_tipo || 'cpf'})` : null}
        </InfoLinha>
      </Secao>

      {/* Escolaridade */}
      <Secao titulo="Escolaridade">
        <InfoLinha label="Nível de Instrução">{funcionario.nivel_instrucao}</InfoLinha>
      </Secao>

      {/* Dependentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dependentes ({dependentes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {dependentes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum dependente cadastrado</p>
          ) : (
            <div className="space-y-2">
              {dependentes.map((d, i) => (
                <div key={d.id || i} className="flex items-center gap-3 border rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.parentesco}{d.cpf ? ` · ${d.cpf}` : ''}{d.data_nascimento ? ` · ${formatDate(d.data_nascimento)}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefícios */}
      <Secao titulo="Benefícios">
        <InfoLinha label="Vale Transporte">
          {funcionario.vale_transporte ? (
            <span>{funcionario.vale_transporte_valor ? formatCurrency(Number(funcionario.vale_transporte_valor)) : 'Sim'}</span>
          ) : 'Não'}
        </InfoLinha>
        <InfoLinha label="Vale Refeição">
          {funcionario.vale_refeicao ? 'Sim' : 'Não'}
        </InfoLinha>
        <InfoLinha label="Plano de Saúde">{funcionario.plano_saude || 'Não'}</InfoLinha>
        <InfoLinha label="Plano Odontológico">
          {funcionario.plano_odontologico ? 'Sim' : 'Não'}
        </InfoLinha>
        <InfoLinha label="Seguro de Vida">
          {funcionario.seguro_vida ? 'Sim' : 'Não'}
        </InfoLinha>
      </Secao>

      {/* Dados Contratuais */}
      <Secao titulo="Dados Contratuais">
        <InfoLinha label="Função">{funcionario.funcao}</InfoLinha>
        <InfoLinha label="Setor">{funcionario.setor}</InfoLinha>
        <InfoLinha label="Data de Admissão">{funcionario.data_admissao ? formatDate(funcionario.data_admissao) : null}</InfoLinha>
        <InfoLinha label="Data de Demissão">{funcionario.data_demissao ? formatDate(funcionario.data_demissao) : null}</InfoLinha>
        <InfoLinha label="Motivo de Demissão">{funcionario.motivo_demissao}</InfoLinha>
        <InfoLinha label="Salário Base">{formatCurrency(funcionario.salario_base || 0)}</InfoLinha>
        <InfoLinha label="Ajuda de Custo">{formatCurrency(funcionario.ajuda_custo || 0)}</InfoLinha>
        <InfoLinha label="Limite de Vales">{formatCurrency(funcionario.limite_vales || 0)}</InfoLinha>
        <InfoLinha label="Apto a Comissão">
          {funcionario.apto_comissao ? 'Sim' : 'Não'}
        </InfoLinha>
        <InfoLinha label="Início Comissão">{funcionario.data_inicio_comissao ? formatDate(funcionario.data_inicio_comissao) : null}</InfoLinha>
        <InfoLinha label="Status">
          {funcionario.data_demissao ? (
            <Badge variant="destructive" className="text-xs">Desligado</Badge>
          ) : funcionario.ativo !== false ? (
            <Badge variant="default" className="text-xs">Ativo</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Inativo</Badge>
          )}
        </InfoLinha>
      </Secao>

      {/* Histórico de Contratos */}
      {historicoContratos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Contratos ({historicoContratos.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {historicoContratos.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {c.funcao}{c.setor ? ` — ${c.setor}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.data_admissao ? formatDate(c.data_admissao) : '?'} → {c.data_demissao ? formatDate(c.data_demissao) : 'atual'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{c.salario_base ? formatCurrency(c.salario_base) : '-'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
