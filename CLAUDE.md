# Lista de Compras — Contexto do Projeto

> Este ficheiro é lido no início de cada sessão de trabalho com IA neste projeto.
> É a memória do projeto: se uma decisão muda, muda-se aqui primeiro.

Última atualização: 12/10/2026

## Onde estamos (12/10/2026)

- **Fase A feita e em uso diário** pela Olga, no iPhone e no computador, em
  https://listadecompras.olgajordao.pt. Inclui, além do pedido original: listas que
  esvaziam ao fechar com "Repetir a lista", separador Compras com histórico e
  correção de compras fechadas, orçamento do mês (8 a 7), promoções, grátis com
  pontos, peso "de tudo / de cada", cores da marca com sol/lua.
- **Próximo, quando a Olga pedir:**
  1. Fase B (`ESPECIFICACAO.md`): lojas por secção, resumo de fim de compra por
     secção e loja, evolução de preços, comparador, vista do mês por secção.
  2. **"Fase das amigas" — proposta feita a 12/10/2026, à espera da decisão da Olga**
     (ela quer dar o link a 2 ou 3 amigas para testarem e darem opinião). Custo 0 €.
     - Abrir "criar conta" no Supabase durante o teste e fechar no fim (com o sim dela).
     - Ecrã de boas-vindas na primeira vez: para que serve, **Criar conta / Entrar /
       Experimentar sem conta**, e uma linha honesta sobre os dados (servidor na UE,
       não partilhados; não dizer "ninguém vê", porque a Olga, como dona do Supabase,
       tem acesso técnico). **Mostrar maqueta antes de construir.**
     - Mesmo aparelho, outra pessoa: ao entrar com outra conta (ou ao terminar sessão),
       apagar do aparelho os dados da sessão anterior antes de sincronizar.
     - Botão "Dar opinião" em Definições (WhatsApp ou email para a Olga, com mensagem
       começada).
     - **Decisões pendentes da Olga:** (a) "Esqueci-me da palavra-passe": à mão para já
       (recomendado; repõe-se a conta da amiga) ou automático com Resend + DNS no
       Cloudflare (~20 min de passos dela); (b) quanto tempo fica aberta a criação de
       contas (sugestão: duas semanas).
  3. Produto ou lead magnet: Supabase Pro, alojamento que aceite uso comercial,
     RGPD. Só depois de testar com amigas.
- **Pendentes da Olga** (não de código): estão na memória local deste projeto.
- Antes de mudar ecrãs ou regras, **mostrar uma maqueta e esperar o sim da Olga**.

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
7. Quando é ela a fazer um passo (Supabase, GitHub, Cloudflare, telemóvel), dar
   passos numerados, com os nomes exatos dos botões e links diretos. Ela usa o
   **Chrome** no Windows e no iPhone.
8. **Nunca pedir nem repetir palavras-passe.** Ações na conta dela (definições do
   Supabase, apagar coisas) só com um "sim" explícito.
9. Testar com os casos reais dela (café, pão, espetadas…) e confirmar no ecrã de
   telemóvel antes de publicar; os dados reais só se mexem quando ela pede.

## Como está feita

- Vite + React + TypeScript, instalável no telemóvel (PWA, `vite-plugin-pwa`).
- Dados no aparelho com Dexie (IndexedDB), em `src/lib/db.ts`. Todas as escritas
  passam por `src/lib/acoes.ts`, que marca o registo como "sujo" para sincronizar.
- Sincronização em `src/lib/sync.ts`, contra uma única tabela `registos` no Supabase
  (JSON por registo, protegida por RLS; ganha a alteração mais recente). Nada se apaga
  de verdade: marca-se `apagado`.
- Comandos: `npm run dev` (pré-visualização), `npm test`, `npm run build`.
- Cada envio para o ramo `main` no GitHub testa, constrói e publica sozinho
  (`.github/workflows/publicar.yml`) em https://listadecompras.olgajordao.pt (domínio próprio; DNS no Cloudflare: CNAME `listadecompras` → `olga-jordao.github.io`, "DNS only")

## Decisões tomadas (09/10/2026)

- Sincronização pelo **Supabase**, com entrada por **email e palavra-passe**
  (uma vez em cada aparelho). Não se usa link nem código por email: no iPhone um link
  abre o browser e não a aplicação instalada, e no plano gratuito o Supabase não deixa
  mudar o email para trazer um código (só com SMTP próprio).
- No Supabase (09/10/2026): "Confirm email" desligado e **registos novos desligados**
  ("Allow new users to sign up"), depois de criada a conta da Olga. Só ela entra.
  Se um dia for preciso outra conta, volta-se a ligar temporariamente.
- Orçamento mensal **único para todo o supermercado** (alimentação, higiene,
  limpeza, animais), não só alimentação. O mês da Olga começa no **dia 8** (8 a 7).
- (10/10/2026) **Ao fechar uma compra, o que se comprou sai da lista**; o que não
  se comprou fica sem etiqueta e só ganha "Não comprado" ao fim de uma semana ou de
  outro fecho. Para voltar a comprar: "Repetir a lista" (junta as últimas idas).
  Deixou de haver "fixo / só desta vez".
- (10/10/2026) **Aparência:** cores da marca da Olga (azul #072a5e, laranja
  #B67623, amarelo claro #fffefa), escuro por omissão, sol/lua para mudar.
- (10/10/2026) A Olga pensa em transformar isto num produto ou lead magnet: os
  textos têm de se perceber sem explicações, e cada mudança de ecrã discute-se
  primeiro com uma maqueta, antes de mexer no código.
- **Preço ao quilo / ao litro** calculado sempre que se sabe o conteúdo da embalagem.
- No planeador de refeições (futuro), quantidades repetidas **somam-se**.

- **Supabase:** projeto próprio "Lista de Compras" (ref `hqriuqulxvqqwtapiqed`,
  região eu-west-1, plano gratuito), criado a 09/10/2026. Não usar os outros
  projetos da conta.
- **Cópias de segurança:** repositório privado `Olga-Jordao/copias-supabase`, com uma
  tarefa noturna que copia esta base de dados (e a da Calculadora). A estrutura da
  base de dados está em `supabase/migrations/`. Nunca pôr dados reais neste
  repositório, que é público.
- **Publicação:** repositório público no GitHub (conta Olga-Jordao) com GitHub
  Pages e domínio próprio (12/10/2026). O domínio próprio não exige o Lovable nem o
  Vercel; outras aplicações podem ter subdomínios de olgajordao.pt da mesma forma.
- **Construção:** no Claude Code, nesta pasta. Não usar o Lovable em paralelo no
  mesmo código.
