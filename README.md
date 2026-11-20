# Grimo Notes

Caderno de ideias local para desktop (Linux e Windows). Pastas por assunto, ideias com tópicos, categorias e prazos, tudo guardado no seu computador, sem conta e sem nuvem.

**Versão 1.1.2.**

## Telas

**Início:** captura rápida, o que vence na semana (atrasadas primeiro), fixadas, pastas e recentes.

<img src="docs/prints/01-inicio.png" alt="Início do Grimo Notes" width="860">

**Pastas** em cartões, lista, kanban ou calendário, com a fita marcadora na cor da categoria principal.

<img src="docs/prints/02-pasta-cartoes.png" alt="Pasta Estudos em cartões" width="860">

**Ideia:** o texto ocupa o centro. Status, prazo, categorias e tópicos ficam num painel lateral que dá para esconder.

<img src="docs/prints/04-ideia-com-painel.png" alt="Ideia com o editor no centro e o painel de propriedades à direita" width="860">

### Editor

Digite `/` para inserir blocos (por nome ou apelido: `h1`, `todo`, `num`, `div`, `toggle`, `callout`, `tabela`, `desenho`), use atalhos de markdown (`#`, `##`, `[]`, `---`) e arraste blocos pela alça à esquerda.

**Tabelas e código**

<img src="docs/prints/05-tabela-e-codigo.png" alt="Tabela e bloco de código" width="860">

**Destaque e lista recolhível**

<img src="docs/prints/06-destaque-e-recolhivel.png" alt="Destaque, lista recolhível e link" width="860">

**Selecione um texto** para transformar o bloco, estilizar, trocar cor do texto e do fundo, tamanho, alinhamento e link.

<img src="docs/prints/08-selecao-cores.png" alt="Barra de seleção com a paleta de cores aberta" width="860">

**Alça do bloco:** o `+` insere um bloco abaixo, a grade arrasta e abre o menu (transformar, duplicar, apagar).

<img src="docs/prints/09-alca-do-bloco.png" alt="Menu da alça do bloco" width="860">

**Menu `/`** com grupos Básico, Mídia e Avançado.

<img src="docs/prints/10-menu-barra.png" alt="Menu de blocos aberto no editor" width="860">

**Desenho** para rascunhar a ideia: caneta, borracha, cores, espessuras, desfazer e tamanho da área.

<img src="docs/prints/11-desenho.png" alt="Bloco de desenho com um rascunho de rota" width="860">

### Organização

**Kanban:** arrastar o cartão muda o status.

<img src="docs/prints/13-kanban-arrastando.png" alt="Cartão sendo arrastado entre colunas do kanban" width="860">

**Calendário** de prazos, por pasta.

<img src="docs/prints/14-calendario.png" alt="Calendário de novembro com ideias nos dias de prazo" width="860">

**Galeria** com os desenhos e as imagens de todas as ideias, filtrável por pasta.

<img src="docs/prints/15-galeria-de-desenhos.png" alt="Galeria com os desenhos das ideias" width="860">

**Busca** por título, corpo, legenda, tópicos e pasta, ignorando acento.

<img src="docs/prints/16-busca.png" alt="Busca por banco" width="860">

**Modelos de pasta** que já criam os tópicos certos.

<img src="docs/prints/17-nova-pasta-modelos.png" alt="Diálogo de nova pasta com os modelos" width="860">

### Configurações

Tema, redução de animações, tamanho, largura e fonte do texto, visão padrão das pastas, categorias (criar, renomear, mudar a cor e apagar), backup em JSON, exportação em Markdown e importação.

<img src="docs/prints/18-configuracoes.png" alt="Tela de configurações" width="860">

<img src="docs/prints/19-configuracoes-categorias.png" alt="Gerenciamento de categorias" width="425"> <img src="docs/prints/20-configuracoes-dados.png" alt="Opções de dados: backup, Markdown e importação" width="425">

**Temas:** seis, em escuro e claro. Abaixo, claro, rosa e azul.

<img src="docs/prints/21-tema-claro.png" alt="Tema claro" width="285"> <img src="docs/prints/22-tema-rosa.png" alt="Tema rosa escuro" width="285"> <img src="docs/prints/23-tema-azul.png" alt="Tema azul escuro" width="285">

## Funcionalidades

- **Pastas** com modelo (Jogo, Mod de Minecraft, Site ou app, Freelance, livre). Cada modelo cria os tópicos de partida.
- **Ideias** com título, status, prazo, fixar, categorias em grupos e tópicos com checklist.
- **Editor** (TipTap): menu `/`, markdown, alça de bloco, seleção com cor e tamanho, títulos, listas, tarefas, lista recolhível, destaque, citação, código, tabela, divisor, vídeo e áudio por link, cartão de site, desenho e imagens (sete posições, redimensionáveis, com legenda). Salva sozinho.
- **Quatro visões** por pasta (cartões, lista, kanban e calendário), **galeria** global e **busca**.
- **Configurações:** aparência, editor, categorias, backup, exportar e importar.
- Início com captura rápida, o que vence na semana, fixadas, pastas e recentes.
- Seis temas, com revelação circular. Contraste conferido com axe nos seis. Respeita `prefers-reduced-motion`. Fonte Figtree (a mesma do meu app mobile, o Kita Finances) e Geist Mono só nos blocos de código.
- Sem atalhos de teclado globais: tudo acessível pelo mouse e pelo menu `/` dentro do editor.
- Dados em SQLite (migrações versionadas). No navegador, um armazenamento em memória cumpre o mesmo contrato, o que permite testar sem abrir o app.

## Rodar

```bash
npm install
npm run tauri dev      # app desktop
npm run dev            # só a interface, no navegador
npm test               # testes unitários (SQL real via node:sqlite)
npm run e2e            # testes de ponta a ponta no navegador
npm run tauri build    # gera os pacotes
```

Requisitos: Node 22+, Rust estável e, no Linux, WebKitGTK 4.1.

## Stack

Tauri 2, React 19, TypeScript, Vite, Tailwind v4, Motion, Zustand, TipTap (editor), dnd-kit (kanban), cmdk (busca), SQLite (`tauri-plugin-sql`), plugins de diálogo, arquivos e abertura de links do Tauri.

## Próximos passos

Moodboard livre, captura rápida em janela pequena, histórico de versões, instaladores (AppImage, deb e Windows) e galeria dentro do documento.
