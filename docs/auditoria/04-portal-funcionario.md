# Auditoria — Portal do Funcionário

## Arquivos: PortalFuncionario.jsx, EspelhoPortal.jsx, PortalSidebar.jsx, VisaoGeral.jsx, MeusDados.jsx, MeuSalario.jsx, MeusVales.jsx, ExtratoMensal.jsx, MiniDRE.jsx, PortalVidaFinanceira.jsx, MinhasComissoes.jsx, PortalMetas.jsx, MensagensPortal.jsx, MinhasSolicitacoes.jsx, MeusDocumentos.jsx, AssinaturasPortal.jsx, AvisosPendentes.jsx, AvisosCloudMobile.jsx, VidaFinanceiraPessoal.jsx

---

## 🔴 Críticos

### 01. ExtratoMensal — dupla contagem visual de `ajuda_custo`
- **Arquivo:** ExtratoMensal.jsx:80-97
- **Caminho:** Portal > Extrato Mensal
- **Ação:** `saldoBase` já inclui `ajuda_custo` (linha 47: `funcionario.salario_base + funcionario.ajuda_custo`). Depois `ajuda_custo` é exibido como linha SEPARADA
- **Impacto:** Usuário vê "Salário Base = R$1.700" (já com ajuda) + "Ajuda de Custo = R$200" → total aparente R$1.900, real R$1.700
- **Solução:** Exibir `salario_base` sem `ajuda_custo` OU remover linha separada

### 02. MinhasSolicitacoes — fallback inverte lógica de permissão
- **Arquivo:** MinhasSolicitacoes.jsx:262-264
- **Caminho:** Portal > Minhas Solicitações
- **Ação:** Se `isAtiva()` retorna `false` para todos os tipos, o fallback mostra TODOS os botões
- **Impacto:** Desabilitar todos os módulos no RH faz TODOS aparecerem (lógica invertida)
- **Solução:** Fallback só deve ocorrer se `isAtiva` retornar undefined, não false

### 03. MiniDRE — exportação PDF/Excel usa propriedade `nome` inexistente
- **Arquivo:** MiniDRE.jsx:160,164,212,216
- **Caminho:** Portal > Vida Financeira > DRE > Exportar
- **Ação:** `inv.nome` mas os objetos têm `categoria_nome`
- **Impacto:** Exportações mostram `undefined`
- **Solução:** Usar `inv.categoria_nome || inv.nome`

### 04. AssinaturasPortal — `<a>` contendo `<button>` (HTML inválido)
- **Arquivo:** AssinaturasPortal.jsx:82-88
- **Ação:** `<a href="..."><Button>Assinar</Button></a>` — elementos interativos aninhados
- **Solução:** Usar `Button` com `asChild` + wrapper `<a>`

---

## 🟠 Altos

### 05. PortalFuncionario vs EspelhoPortal — diferenças críticas
- **Arquivo:** EspelhoPortal.jsx:286-291 vs PortalFuncionario.jsx:339-344
- **Diferença 1:** Espelho NÃO passa `fechamentosFuncionario` para `MeuSalario` — salário congelado não funciona no espelho
- **Diferença 2:** Espelho passa `receitasExtras={[]}` (vazio fixo) — receitas extras nunca aparecem
- **Diferença 3:** Espelho não carrega `FechamentoMensal`

### 06. `client.auth.me()` sem `.catch()` — erro silencioso
- **Arquivo:** PortalFuncionario.jsx:49,62
- **Ação:** Se `me()` falhar, `meUser` fica null e usuário vê "Cadastro não encontrado"

### 07. `AvisosPendentes.jsx` — `m.mensagem.substring(0, 60)` sem guard contra null
- **Arquivo:** AvisosPendentes.jsx:94
- **Ação:** Se `mensagem` for null/undefined, crash
- **Solução:** `(m.mensagem || '').substring(0, 60)`
- **Mesmo problema:** AvisosCloudMobile.jsx:80 (substring de título)

### 08. `isFirst.current` com 2s perde eventos reais
- **Arquivo:** PortalFuncionario.jsx:148-171, MensagensPortal.jsx:38-64
- **Ação:** Qualquer evento nos primeiros 2s após montagem é ignorado

### 09. Toast inconsistente: 2 sistemas concorrentes
- `sonner` (MeusDados.jsx)
- `shadcn useToast` (PortalFuncionario.jsx, MiniDRE.jsx)
- APIs diferentes, comportamento visual diferente

---

## 🟡 Médios

### 10. `MeuSalario.jsx` — variável `mesPosterior` na verdade contém mês anterior
- **Arquivo:** MeuSalario.jsx:91
- **Ação:** `meses[indiceAtual - 1]` → mês ANTERIOR, chamado de "posterior"
- **Confusão:** `comissaoMesAnterior` usa `mesPosterior` — funciona mas código enganoso

### 11. `ExtratoMensal` — se novo tipo de débito for criado, vai parar nos créditos
- **Arquivo:** ExtratoMensal.jsx:44-45
- **Ação:** Créditos = tudo que NÃO está em `TIPOS_LIMITE`. Novos débitos viram créditos

### 12. `PortalMetas` — `salarioBase` não inclui `ajudaCusto`
- **Arquivo:** PortalMetas.jsx:46
- **Inconsistência:** `MeuSalario` inclui `ajuda_custo` no salário base, PortalMetas não

### 13. `AvisosPendentes` + `AvisosCloudMobile` — ~90% de código duplicado
### 14. `MeusDados` envia `chave_pix_atual: ''` e `chave_pix_tipo_atual: ''` desnecessários (linha 63)
### 15. `MensagensPortal` — concorrência: sobrescrita de `lidas_por` se 2 usuários lerem simultaneamente (linha 89-97)

---

## 🔵 Baixos

### 16. `VisaoGeral.jsx:81` — prop `'••••••'` inalcançável (já protegido por `perm.ver_salario`)
### 17. `Typography` `messagemSelecionada` (falta 'n') em AvisosPendentes.jsx:18 e AvisosCloudMobile.jsx:18
### 18. `MinhasComissoes.jsx:84` — fuzzy match com `.includes()` em setores (casamento impreciso)
### 19. `MinhasSolicitacoes.jsx:338` — `s.valor_solicitado &&` esconde valor R$0,00 (válido)
### 20. `PortalVidaFinanceira.jsx:70` — "R$" hardcoded em vez de `formatCurrency`
### 21. `VidaFinanceiraPessoal.jsx` — provavelmente componente morto (não usado por PortalFuncionario)
