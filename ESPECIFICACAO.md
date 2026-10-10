# Lista de Compras — Especificação

Versão 3 · 10/10/2026 · revista depois da primeira compra a sério (talho e
padaria), com as decisões tomadas na conversa com o Claude Code.

## Objetivo

Uma aplicação de lista de compras para uso pessoal, que preencho no computador e
uso no telemóvel enquanto faço as compras, na loja ou online. Serve para facilitar
a vida e, sobretudo, **para poupar**: mostra-me o que estou a gastar, avisa-me
quando um preço sobe e faz-me a conta ao quilo ou ao litro, que é o que permite
comparar produtos de verdade.

## Como tem de funcionar

- Usa-se mais no telemóvel (iPhone, Chrome) do que no computador, com uma mão,
  dentro de um supermercado: botões grandes, pouco texto, nada de menus escondidos.
- Os dados ficam guardados no aparelho, por isso a aplicação abre e funciona sem
  rede dentro da loja; quando há ligação, sincroniza com o Supabase, para o
  computador e o telemóvel terem sempre a mesma lista.
- Entro uma única vez em cada aparelho com o meu email e uma palavra-passe. Não há
  registos, partilha nem outros utilizadores, é apenas uma fechadura.
- Instala-se no ecrã principal do telemóvel como se fosse uma aplicação.
- Euros com vírgula decimal. Tudo em português de Portugal.

## Construção por fases

- **Fase A:** catálogo, secções, listas, artigos com quantidade e preço, preço ao
  quilo/litro, totais no topo, fechar compra. **Para aqui e avisa-me.** Vou usar
  isto numa compra a sério antes de continuarmos.
- **Fase A, segunda volta (10/10/2026)**, depois da primeira compra: aparência com
  as cores da marca, separador Compras com o histórico, lista que esvazia ao fechar
  com "Repetir a lista", e o orçamento do mês. Estas duas últimas vinham da fase B
  e passaram para a A.
- **Fase B**, só depois de eu dizer que correu bem: lojas por secção, resumo de fim
  de compra por secção e por loja, evolução de preços e comparador.
- **Fase C**, só para ter em conta na estrutura: planeador de refeições.

---

## Fase A

### Catálogo de produtos

O centro da aplicação é o meu catálogo de produtos. Começa vazio: quando escrevo
um nome que ainda não existe, é acrescentado ao catálogo, e da próxima vez
escolho-o de uma lista com pesquisa em vez de o escrever outra vez. Posso editar e
apagar produtos.

Cada produto tem:

- **nome**;
- **secção** a que pertence;
- **unidade de compra**: un, dz, kg ou L (não há "g": 200 g escreve-se 0,2 kg; os
  ovos compram-se à dúzia: meia dúzia é 0,5 dz, com o preço da dúzia);
- **conteúdo da embalagem**, opcional e só para produtos comprados à unidade, por
  exemplo 75 ml para uma pasta de dentes ou 500 g para uma caixa de uvas;
- **último preço**, que se atualiza sozinho à medida que vou comprando.

### Preço ao quilo / ao litro

Sempre que a aplicação sabe quanto leva a embalagem, mostra o preço ao quilo ou ao
litro ao lado do preço, sem eu ter de fazer contas. Exemplos: uma pasta de dentes
de 75 ml a 4,00 € custa 53,33 €/L; uvas em caixa de 500 g a 5,00 € custam
10,00 €/kg. Nos produtos comprados ao kg ou ao L, o preço unitário já é esse valor.

Se o conteúdo da embalagem ainda não estiver preenchido, posso escrevê-lo na
própria loja, ao lado do preço, e fica guardado no produto.

### Secções

As zonas grandes do supermercado, nesta ordem inicial, que posso arrastar para
corresponder à loja onde ando: Mercearia, Laticínios e ovos, Congelados, Bebidas,
Talho, Charcutaria, Peixaria, Fruta e legumes, Padaria, Produtos de limpeza,
Higiene pessoal, Casa e diversos, Animais. Os artigos da lista aparecem agrupados
por secção, também nas compras online, porque a loja online está organizada da
mesma forma.

### Listas

Começo com duas listas: **Compras do mês** (a compra grande, muitas vezes entregue
em casa, mais o que falta a meio do mês) e **Frescos da semana** (talho, peixe,
fruta, pão, comprados em várias idas). Posso criar outras, mudar-lhes o nome e
apagá-las. As duas funcionam da mesma maneira; o nome é só para eu me organizar.

As listas não guardam o que já comprei: **ao fechar uma compra, o que estava no
carrinho sai da lista** e fica guardado em Compras. Para voltar a comprar, a lista
vazia mostra **"Iniciar nova lista"** com o botão **"Repetir a lista de 10/10"**, que
junta tudo o que comprei nessa lista nas últimas idas (31 dias na Compras do mês,
14 nos Frescos da semana), sem repetidos e com a última quantidade. Escolho todos ou
só alguns, acerto as quantidades e ponho na lista. Também posso repetir a partir de
qualquer compra antiga, no separador Compras.

### Cada artigo da lista

- produto, escolhido do catálogo ou escrito de novo;
- quantidade com decimais (1,2 kg) e unidade;
- **o que pedi** (6 un, 2 kg) e, na loja, **o que diz a etiqueta ou a prateleira**:
  peso, preço/kg, preço por unidade e total. Escrevo o que tiver (normalmente dois)
  e a aplicação calcula o resto. Não há nada a escolher no produto: no talho, na
  frutaria e na padaria peço à unidade ou ao peso e pago sempre ao quilo.
  Exemplos: 6 espetadas, balança 1,730 kg a 10,99 €/kg → 19,01 € (cada uma ≈ 288 g);
  2 kg de fígado, balança 2,050 kg a 2,00 €/kg → 4,10 €; 8 kiwis a 5,76 €/kg por
  11,52 € → 2 kg; atum, 6 latas a 1,79 € com 120 g cada → 14,92 €/kg;
- **aviso de valores que não batem certo**: se escrevo peso, preço/kg e total e
  peso × preço/kg não dá o total, a aplicação avisa (engano meu ou da balança);
- **estimativa em casa**: com o preço ao quilo e o peso médio de cada unidade da
  última compra, "6 espetadas" já mostra ≈ 1,73 kg e ≈ 19 €, e "1 kg" ≈ 10,99 €;
- no painel do artigo, em destaque: **Quantidade pedida** e, numa caixa "Na
  compra", **Peso** e **Total pago**; o preço/kg e o preço por unidade ficam por
  baixo, mais pequenos (servem para o preço da prateleira no supermercado);
- na lista, cada artigo mostra a quantidade, o peso, o preço por unidade e o preço
  ao quilo sempre que se saibam;
- **origem**: escrito à mão ou vindo de uma refeição. Por agora é sempre à mão, mas
  o campo existe desde já para a fase C.

Posso acrescentar, apagar e reordenar artigos a qualquer momento.

**Preenchimento em dois tempos:** em casa escrevo o produto e a quantidade, na loja
escrevo o preço. O último preço do produto aparece já preenchido como sugestão e
só corrijo se mudou.

**Aviso de subida:** se o preço que escrevo for mais alto do que o anterior, aparece
um aviso discreto a dizer que subiu e quanto. Quando se sabe o conteúdo da
embalagem, a comparação faz-se ao quilo ou ao litro, para apanhar também a
embalagem que encolheu e manteve o preço.

### Enquanto compro

No telemóvel, toco nos artigos à medida que os meto no carrinho (o físico ou o da
loja online) e ficam riscados. No topo, sempre à vista:

- **o total do que já está no carrinho**, em destaque;
- por baixo, em pequeno, "9 de 19 artigos · lista toda ≈ 85,53 €".

Um filtro **Tudo · Falta · No carrinho** deixa ver só o que falta ou só o que já
está no carrinho.

### Fechar a compra

Quando acabo, fecho a compra e indico se foi **na loja ou online**. Posso escrever
também **quanto paguei na caixa**: se for menos do que o total do carrinho, a
diferença fica registada como poupança (pontos, cupão, promoção), com o motivo se o
quiser indicar. A compra fica guardada com a data, os artigos comprados, os preços e
o valor pago. Depois disso:

- o que estava no carrinho **sai da lista** (fica guardado na compra);
- o que **não comprei fica na lista, sem etiqueta**, porque posso ir a outra loja
  amanhã. Só ganha a etiqueta **"Não comprado desde 10/10"** quando passar uma
  semana ou quando eu fechar outra compra sem o comprar.

### Compras (histórico)

Um separador **Compras** mostra as compras fechadas, da mais recente para a mais
antiga, com a data, a lista, o total pago e o número de artigos. Ao tocar, abre o
detalhe por secção, com **"Repetir esta lista"** e **"Apagar"** (para uma compra
registada por engano, que deixa de contar para o orçamento). No topo, o resumo do
mês: orçamento, gasto, poupado em descontos e quanto falta.

### Orçamento do mês

Um só orçamento para tudo o que é compras da casa (alimentação, higiene, limpeza,
animais), com nome (por omissão "Alimentação e casa"), valor e **dia em que o mês
começa**: o meu começa a 8, por isso outubro vai de 8 de outubro a 7 de novembro.
Conta tudo o que fecho, em todas as listas, pelo valor pago na caixa.

- Enquanto não está definido, o topo da lista mostra o convite **"Define o teu
  orçamento mensal para as compras da casa e alimentação"**, com **Definir** (abre o
  painel ali mesmo) e **Agora não** (esconde; fica nas Definições).
- Depois de definido, o topo da lista mostra sempre quanto falta, uma barra (o
  gasto e, a laranja, o carrinho) e "Depois deste carrinho ficam X €" (ou, em casa,
  "Com esta lista ficam ≈ X €"). Se passar, diz "Passaste X €".

### Aparência e navegação

- Cores da marca: azul #072a5e, laranja acinzentado #B67623, amarelo claro #fffefa.
  **Fundo escuro por omissão**, com um botão de **sol e lua** no topo de cada ecrã
  para passar a claro e voltar; em Definições também há "Automático" (segue o
  telemóvel). A escolha fica em cada aparelho.
- O topo da lista tem o nome **"Lista de Compras"**.
- A barra de baixo tem **Lista, Catálogo, Compras e Definições**. As Definições
  juntam a aparência, o orçamento, a ordem das secções e a sincronização.

---

## Fase B — só depois de eu confirmar

### Lojas

A loja define-se por secção, não por artigo nem por compra, porque divido as
compras: o talho é no Sr. António, a fruta na frutaria, o resto no Lidl ou no
Continente. Em cada secção escolho a loja numa lista que posso editar, que começa
com Continente, Continente Online, Lidl, Pingo Doce, Talho do Sr. António e
Frutaria. O Continente Online é uma loja à parte porque os preços online nem
sempre são os da loja física.

Com as lojas, o último preço passa a ser guardado **por loja**, para que o aviso de
subida não dispare só porque mudei do Lidl para o Continente.

### Resumo de fim de compra

Ao fechar uma compra, aparece um resumo com o **subtotal por secção** (que passo
para a minha folha de orçamento) e o **total por loja** (para conferir com os
talões).

### Histórico e evolução de preços

Todas as compras fechadas ficam guardadas com data, loja e valores. Para cada
produto, vejo a evolução do preço (e do preço ao quilo/litro) ao longo do tempo e
em que loja estava mais barato.

### Comparador rápido

Na prateleira, escrevo o preço e o conteúdo de duas ou três embalagens (por
exemplo 75 ml a 4,00 € e 100 ml a 4,90 €) e a aplicação diz-me qual sai mais
barata ao quilo ou ao litro.

### Vista do mês por secção

O orçamento e o resumo do mês já existem (fase A). Falta, no separador Compras, a
vista do mês com os **subtotais por secção já somados**, para lançar na folha de
orçamento de uma vez em vez de compra a compra.

---

## Fase C — planeador de refeições (não construir, só preparar a estrutura)

Uma lista das minhas refeições, cada uma apontando para produtos do catálogo com
as quantidades em que os compro, e com etiqueta de tempo de preparação. Escolho as
refeições da semana e os produtos vão para a lista de compras, agrupados por
secção, com as **quantidades somadas** quando duas refeições pedem o mesmo produto
(2 cebolas numa e 2 noutra dão 4 cebolas). Esses artigos ficam com a origem
"refeição".

## Ideias para mais tarde (não construir)

- **Transformar num produto para outras pessoas.** Obrigaria a contas de
  utilizador abertas, a separar os dados de cada pessoa (a base de dados já está
  preparada para isso) e a rever textos e ajuda. Decidir só depois de a fase B
  estar a uso.
- **Fotografar o talão** no fim da compra e a aplicação preencher os preços
  sozinha, lendo o talão com IA. Substitui com vantagem a ligação aos sites dos
  supermercados.

## O que não quero

Partilha com outras pessoas, leitura de código de barras ou ligação a sites de
supermercados (não têm acesso aberto para isto: obrigaria a copiar dados dos sites
às escondidas, o que é frágil, avaria sempre que o site muda e vai contra as
condições de utilização).
