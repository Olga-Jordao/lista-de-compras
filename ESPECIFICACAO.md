# Lista de Compras — Especificação

Versão 2 · 09/10/2026 · revista a partir do primeiro pedido, com as decisões
tomadas na conversa com o Claude Code.

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
- **Fase B**, só depois de eu dizer que correu bem: lojas por secção, resumo de fim
  de compra, histórico, evolução de preços, comparador e orçamento do mês.
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

Tenho listas permanentes que reutilizo, não listas que se apagam. Começo com duas:
**Mensal** (a compra grande, muitas vezes entregue em casa) e **Semanal de
frescos**. Posso criar outras, mudar-lhes o nome e apagá-las.

### Cada artigo da lista

- produto, escolhido do catálogo ou escrito de novo;
- quantidade com decimais (1,2 kg) e unidade;
- **preço por unidade e total pago, lado a lado**: escrevo o que tiver à mão e a
  aplicação calcula o outro (bebida de aveia, 18 L a 0,99 € dá 17,82 €; carne,
  1,8 kg por 18,45 € dá 10,25 €/kg). Na loja, nos produtos ao peso, o que tenho é
  o peso e o total da etiqueta, e é a aplicação que me dá o preço ao quilo;
- **peso nos produtos à unidade**, de duas formas: "cada um pesa" (o que vem na
  embalagem, fica guardado no produto) ou "pesou tudo junto" (o peso da balança
  só para esta compra, como o pão: 2 bolas, 166 g, 0,88 € dá 5,30 €/kg);
- **fixo ou só desta vez**: os fixos ficam sempre na lista, os "só desta vez" saem
  quando fecho a compra;
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
- o total da lista toda, em pequeno, por baixo.

### Fechar a compra

Quando acabo, fecho a compra e indico se foi **na loja ou online**. Posso escrever
também **quanto paguei na caixa**: se for menos do que o total do carrinho, a
diferença fica registada como poupança (pontos, cupão, promoção), com o motivo se o
quiser indicar. A compra fica guardada com a data, os artigos comprados, os preços e
o valor pago. Depois disso:

- os artigos fixos desmarcam-se e ficam prontos para a vez seguinte, com o preço
  que paguei como sugestão;
- os artigos "só desta vez" que comprei saem da lista;
- os artigos que **não comprei** ficam na lista, assinalados como "ficou por
  comprar", para não me esquecer deles na próxima.

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

### Vista do mês e orçamento

Uma vista do mês até agora, com os subtotais por secção já somados, para lançar na
folha de orçamento de uma vez em vez de compra a compra. Escrevo quanto reservei
para o supermercado no mês (por exemplo 300 €, para tudo: alimentação, higiene,
limpeza, animais) e a aplicação mostra quanto já gastei e quanto falta. O gasto
conta pelo valor pago na caixa, e a vista do mês mostra também quanto poupei em
pontos, cupões e promoções.

---

## Fase C — planeador de refeições (não construir, só preparar a estrutura)

Uma lista das minhas refeições, cada uma apontando para produtos do catálogo com
as quantidades em que os compro, e com etiqueta de tempo de preparação. Escolho as
refeições da semana e os produtos vão para a lista de compras, agrupados por
secção, com as **quantidades somadas** quando duas refeições pedem o mesmo produto
(2 cebolas numa e 2 noutra dão 4 cebolas). Esses artigos ficam com a origem
"refeição".

## Ideias para mais tarde (não construir)

- **Fotografar o talão** no fim da compra e a aplicação preencher os preços
  sozinha, lendo o talão com IA. Substitui com vantagem a ligação aos sites dos
  supermercados.

## O que não quero

Partilha com outras pessoas, leitura de código de barras ou ligação a sites de
supermercados (não têm acesso aberto para isto: obrigaria a copiar dados dos sites
às escondidas, o que é frágil, avaria sempre que o site muda e vai contra as
condições de utilização).
