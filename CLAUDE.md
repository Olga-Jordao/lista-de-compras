# Lista de Compras — Contexto do Projeto

> Este ficheiro é lido no início de cada sessão de trabalho com IA neste projeto.
> É a memória do projeto: se uma decisão muda, muda-se aqui primeiro.

Última atualização: 09/10/2026

## O que é

Aplicação pessoal da **Olga Jordão** (não tem nada a ver com a BioPata nem com
nenhum cliente). Serve para preparar as compras no computador e usá-las no
telemóvel (iPhone, com Chrome) dentro do supermercado ou numa compra online,
e para **ajudar a poupar**, não só a lembrar o que falta.

O pedido completo, com as fases, está em `ESPECIFICACAO.md`. Ler antes de mexer.

## Regras de trabalho

1. **Construir por fases e parar no fim de cada uma.** A fase B só começa quando
   a Olga disser que a fase A correu bem numa compra a sério.
2. **Português de Portugal** em toda a interface e nas mensagens, tratando a Olga
   por tu. Euros com vírgula decimal (17,82 €).
3. **Pensada para o telemóvel, com uma mão:** botões grandes, pouco texto, nada de
   menus escondidos.
4. **Funciona sem rede.** Os dados ficam no aparelho e sincronizam com o Supabase
   quando houver ligação, para o computador e o telemóvel verem o mesmo.
5. **Nada de partilha, código de barras ou ligação a sites de supermercados.**
6. Ao explicar o trabalho à Olga, explicar também o método (ela está a aprender a
   trabalhar com IA) e escrever com frases ligadas, sem séries de frases curtas.

## Como está feita

- Vite + React + TypeScript, instalável no telemóvel (PWA, `vite-plugin-pwa`).
- Dados no aparelho com Dexie (IndexedDB), em `src/lib/db.ts`. Todas as escritas
  passam por `src/lib/acoes.ts`, que marca o registo como "sujo" para sincronizar.
- Sincronização em `src/lib/sync.ts`, contra uma única tabela `registos` no Supabase
  (JSON por registo, protegida por RLS; ganha a alteração mais recente). Nada se apaga
  de verdade: marca-se `apagado`.
- Comandos: `npm run dev` (pré-visualização), `npm test`, `npm run build`.
- Cada envio para o ramo `main` no GitHub testa, constrói e publica sozinho
  (`.github/workflows/publicar.yml`) em https://olga-jordao.github.io/lista-de-compras/

## Decisões tomadas (09/10/2026)

- Sincronização pelo **Supabase**, com entrada por **email e palavra-passe**
  (uma vez em cada aparelho). Não se usa link nem código por email: no iPhone um link
  abre o browser e não a aplicação instalada, e no plano gratuito o Supabase não deixa
  mudar o email para trazer um código (só com SMTP próprio).
- No Supabase (09/10/2026): "Confirm email" desligado e **registos novos desligados**
  ("Allow new users to sign up"), depois de criada a conta da Olga. Só ela entra.
  Se um dia for preciso outra conta, volta-se a ligar temporariamente.
- Orçamento mensal **único para todo o supermercado** (alimentação, higiene,
  limpeza, animais), não só alimentação.
- Ao fechar uma compra, os artigos **não comprados ficam** na lista assinalados, e
  os artigos **"só desta vez"** saem.
- **Preço ao quilo / ao litro** calculado sempre que se sabe o conteúdo da embalagem.
- No planeador de refeições (futuro), quantidades repetidas **somam-se**.

- **Supabase:** projeto próprio "Lista de Compras" (ref `hqriuqulxvqqwtapiqed`,
  região eu-west-1, plano gratuito), criado a 09/10/2026. Não usar os outros
  projetos da conta.
- **Publicação:** repositório público no GitHub (conta Olga-Jordao) com GitHub
  Pages. Pode passar mais tarde para o Vercel com repositório privado.
- **Construção:** no Claude Code, nesta pasta. Não usar o Lovable em paralelo no
  mesmo código.
