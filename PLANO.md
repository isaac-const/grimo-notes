# Grimo Notes · plano

Status: em desenvolvimento. Fases 1 a 3 (a v1) implementadas. Fase 4 e vitrine pendentes.
Data: 19/11/2026
Referências: `referencias/ref-1-notas-pastas.png` (pastas pastel, barra lateral) e `referencias/ref-2-bento-tres-paineis.png` (três painéis, cantos grandes, pílula preta).

## 1. O que é

Caderno de ideias local para desktop. Pastas por assunto (jogos, mods de Minecraft, sites e apps, pessoal, trabalho, freelance). Dentro de cada pasta ficam as ideias. Cada ideia tem tópicos, imagens posicionadas do jeito que o Isaac quiser, galeria de referências, categorias e datas. Visões: cartões, lista, kanban, calendário e galeria.

Uso real: o Isaac, todo dia. Papel no portfólio: produto desktop completo (Tauri, SQLite, editor rico, arrastar e soltar, temas).

Nome: Grimo, de grimório. O grimório entra só como ideia de "livro de coisas ainda por fazer". Sem pergaminho, runa ou fonte gótica.

## 2. Princípios

1. Local primeiro. Sem conta e sem nuvem na v1. Dados em SQLite e pasta de imagens. Exporta para Markdown, então nada fica preso.
2. Interface calma, funcionalidade rica. Uma tela mostra uma coisa principal e o resto fica a um atalho de distância.
3. Teclado em tudo: `Ctrl+K`, `Ctrl+N`, setas, `/` no editor.
4. Cor vem das categorias, não da interface.
5. Movimento explica mudança. Respeita `prefers-reduced-motion`.

## 3. Modelo de dados

| Entidade | Campos principais |
|---|---|
| Pasta | nome, matiz de cor, ícone, tipo, ordem |
| Ideia | título, pasta, documento (JSON do editor), status do kanban, prazo, lembrete, capa, fixada, criada, editada |
| Tópico | ideia, título, ordem, concluído |
| Categoria | nome, grupo (Gênero, Dimensão, Plataforma, o que o Isaac criar), matiz |
| Referência | ideia, imagem ou link, legenda, fonte, ordem |
| Anexo | arquivo em disco com nome por hash |
| Coluna | pasta, nome, ordem (padrão: Ideia, Explorando, Em progresso, Pronta, Arquivada) |

Grupos de categoria funcionam como filtros: "2D" e "Shooter" vivem em grupos diferentes e se combinam.

Modelos de pasta (só criam tópicos prontos, tudo editável):

- Jogo: Premissa, Mecânica central, Arte e clima, Referências, Escopo, Riscos.
- Mod de Minecraft: Conceito, Itens e blocos, Receitas, Mecânica, Texturas, Compatibilidade.
- Site ou app: Problema, Público, Telas, Stack, MVP.
- Freelance: Cliente, Escopo, Valor, Prazos, Entregas.
- Pessoal e livre: em branco.

## 4. Telas

1. **Início.** Bento: fixadas, recentes, vencendo na semana, kanban em resumo, captura rápida.
2. **Pasta.** Cartões coloridos como na referência, ou lista, kanban, calendário, galeria. Filtro por categoria e grupo.
3. **Ideia.** Três zonas: corpo (editor), margem (referências e imagens ancoradas ao parágrafo) e painel direito recolhível (categorias, prazo, status, índice de tópicos).
4. **Galeria global.** Mosaico de todas as referências, filtra por pasta e categoria.
5. **Paleta `Ctrl+K`.** Buscar, criar, ir para, trocar tema.
6. **Captura rápida.** Atalho global abre uma janela pequena: escreve, escolhe a pasta, Enter salva.
7. **Ajustes.** Tema (6), densidade, fonte do corpo, backup e exportação.

## 5. Editor

TipTap com nós customizados em React.

- Blocos: título, parágrafo, listas, checklist, citação, código, divisor, destaque.
- **Imagem.** Colar, arrastar do sistema ou do navegador. Posições: em linha, larga, metade (par ou trio lado a lado), flutuante à esquerda ou direita com o texto contornando, e margem. Alça de redimensionar, legenda opcional, clique para ampliar.
- **Galeria.** Agrupa imagens em grade, mosaico ou carrossel. Reordena arrastando.
- **Moodboard** (fase 4). Tela livre dentro do documento: imagens arrastadas, giradas e escaladas, com legenda.
- **Tópico.** Seção recolhível com checklist própria, aparece no índice lateral.
- Menu `/` e menu flutuante na seleção.
- Salvamento automático. Histórico de versões por ideia na fase 4.

## 6. Direção visual

Assunto: um caderno que guarda coisas que ainda não existem. Público: quem cria jogos, mods e apps e tem muita ideia solta.

**Elemento assinatura: a fita marcadora.** Toda ideia pendura uma fita fina na cor da categoria principal, como a fita de um livro. Aparece no cartão, na linha da lista, no cartão do kanban e na borda da página aberta. Funciona como código de cor sem pintar a interface inteira. No hover a fita desce 6 px.

**Margem de manuscrito.** A coluna lateral do documento guarda as referências, presas ao parágrafo a que pertencem.

| Papel | Escolha inicial (validar em demo) |
|---|---|
| Títulos | serifa editorial, Newsreader |
| Interface | grotesca neutra, Hanken Grotesk |
| Datas e metadados | mono, Geist Mono |
| Cantos | cartões 20 a 24 px, botões em pílula |
| Sombra | curta e suave, sem blur pesado de fundo |
| Cor | interface neutra; pastas e categorias trazem a cor |

Cores de categoria são guardadas só como matiz e desenhadas em OKLCH, com luminosidade e croma definidos por tema. O mesmo "verde" funciona nos seis temas sem retoque.

Fora do projeto: gradiente roxo, vidro fosco em tudo, emoji decorativo, foguete, "Welcome back", grade de cartões idênticos sem hierarquia.

Texto: verbos diretos ("Nova ideia", "Anexar imagem"). Estado vazio ensina a próxima ação.

## 7. Temas

Troca por `data-theme` no `html`, com tokens semânticos: `--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-muted`, `--line`, `--accent`, `--accent-ink`. Valores iniciais, serão ajustados no demo.

| Tema | bg | surface | ink | muted | line | accent |
|---|---|---|---|---|---|---|
| dark | #121211 | #1B1B19 | #ECE9E1 | #8E8A80 | #2A2926 | #ECE9E1 |
| white | #F5F3EE | #FFFFFF | #1B1A17 | #77736A | #E4E0D6 | #1B1A17 |
| rose black | #130C0E | #1E1316 | #F6E8EA | #A58489 | #33212A | #FF6B8E |
| rose white | #FBF3F3 | #FFFFFF | #2A1518 | #8C6B6F | #F0DDDE | #D6456B |
| blue dark | #0A1018 | #111B29 | #E6EEFA | #7F93AE | #1F2E44 | #5B9BFF |
| blue white | #F1F5FB | #FFFFFF | #0E1A2B | #5F7189 | #DCE5F2 | #2F6BFF |

Contraste AA conferido em cada par antes de fechar. A troca revela o novo tema em círculo a partir do botão (View Transitions), com fallback de fade.

## 8. Movimento

Tempos base: rápido 120 ms, padrão 220 ms, enfático 380 ms. Mola padrão: rigidez 380, amortecimento 30.

| Momento | Efeito |
|---|---|
| Abrir ideia | o cartão se expande até virar o documento (mesmo elemento, sem corte) |
| Hover no cartão | spotlight segue o mouse, sobe 2 px, fita desce 6 px |
| Kanban: pegar | cartão levanta, escala 1.03, sombra cresce, coluna alvo acende |
| Kanban: soltar | assenta com leve passada da mola |
| Concluir | carimbo "feito" bate no cartão, que desliza para a última coluna |
| Imagem solta | pousa do ponto onde foi largada |
| Galeria | reordena com animação de layout |
| `Ctrl+K` | entra de 0.98 para 1, fundo escurece em 120 ms |
| Troca de tema | revelação circular, 500 ms |
| Barra lateral | recolhe com mola, ícones ficam |
| Movimento reduzido | tudo vira fade de 120 ms |

## 9. ReactBits aproveitados

Roda direto, porque o Tauri usa webview.

- Spotlight Card: cartões de pasta.
- Border Glow: cartão em foco e janela de captura rápida.
- Magic Bento: tela Início.
- Cursor Grid: só em estados vazios e na primeira abertura.
- Fora: Lanyard (sem sentido aqui), Dither Veil (WebGL pesado no webview), Logo Loop, Pixel Card (esconde conteúdo).

Antes de copiar qualquer componente, conferir a licença no repositório do ReactBits. Não confirmei.

## 10. Stack

- Tauri 2, React 19, TypeScript, Vite.
- Tailwind v4 com variáveis CSS para os temas.
- Motion para animação de layout e molas.
- TipTap para o editor.
- dnd-kit para kanban, galeria e reordenar tópicos.
- cmdk para a paleta.
- Zustand para estado de interface.
- SQLite com FTS5 via plugin SQL do Tauri. Busca no título, corpo e legendas.
- Imagens em pasta do app com nome por hash. Miniatura gerada no Rust.
- Plugin de atalho global do Tauri para a captura rápida.
- Testes: Vitest na camada de dados e no editor. Teste manual guiado para animação.

## 11. Fases (ordem, sem datas)

0. **Spikes.** Imagem flutuante e margem no TipTap. dnd-kit com Motion no kanban. Revelação de tema e transição de cartão no webview do Linux. Só segue o que funcionar.
1. **Base.** Janela, tokens e 6 temas, barra lateral, SQLite, pastas e ideias, cartões e lista.
2. **Editor.** Blocos, imagens com todas as posições, tópicos, categorias e grupos.
3. **Organização.** Kanban, datas e calendário, galeria, busca, `Ctrl+K`.
4. **Acabamento.** Moodboard, captura rápida, histórico, exportação e backup, polimento de animação.
5. **Vitrine.** AppImage e deb para Linux, instalador para Windows (build em CI), README, vídeo com HyperFrames, dados de exemplo rotulados.

A v1 é as fases 1 a 3. O resto é bônus.

## 12. Riscos

- **Dois webviews diferentes.** WebKitGTK no Linux e WebView2 no Windows se comportam diferente em blur, View Transitions e fontes. A fase 0 testa nos dois antes de prometer. Tudo tem fallback.
- **Atalho global e janela de captura** têm particularidades em cada sistema. Testar nos dois.
- **Editor com imagem flutuante e margem** é a parte mais difícil. Spike antes de escrever o resto.
- **dnd-kit com animação de layout do Motion** pode brigar. Spike no kanban.
- **Escopo grande.** Congelar a v1 nas fases 1 a 3.
- **Licença do ReactBits** ainda não conferida.

## 13. Decidido e perguntas abertas

Decidido: o Grimo roda em **Linux e Windows**. macOS fica fora, então a janela usa controles de janela de Linux e Windows, não os três botões coloridos da referência. O Linux usa WebKitGTK e o Windows usa WebView2 (base Chromium). Os dois precisam passar na fase 0.

1. Repositório `grimo-notes` criado e público.
2. Sincronizar entre máquinas fica para depois da v1? Como você usa Linux e Windows, vale decidir cedo: a pasta de dados pode ficar em um diretório sincronizável (Syncthing, por exemplo) sem mudar o app.

## 14. Nome e disponibilidade (sinais, não prova)

- `grimo.app` e `grimo.dev` já estão registrados. `grimonotes.com` e `grimonotes.app` não responderam DNS, mas isso não prova que estejam livres.
- Usuário `grimo-notes` livre no GitHub. Pacote `grimo-notes` livre no npm.


## 15. Revisões de 19/11/2026 (tarde)

- **Fontes** passam a ser as do KaniBox: Familjen Grotesk nos títulos, Hanken Grotesk no texto e Geist Mono nos metadados. A serifa Newsreader saiu.
- **Sem atalhos de teclado globais.** A busca abre pelo botão da barra lateral. Dentro do editor continuam o menu `/`, os atalhos de markdown e os de formatação.
- **Página da ideia:** o texto ocupa o centro; status, prazo, categorias e tópicos ficam num painel lateral recolhível.
- **Editor no estilo Notion:** menu `/` com grupos e apelidos, barra de seleção (transformar bloco, estilo, cor, tamanho, alinhamento, link), alça de bloco com menu, lista recolhível, destaque, tabela, vídeo e áudio por link, cartão de site e um **bloco de desenho** simples para rascunhar.
- **Kanban** com sombras leves e cinco colunas que cabem na tela.
- Adaptado do Notion, e não copiado: menções (`@`), subpáginas (`[[`), equações e banco de dados ficaram de fora por não combinarem com um caderno local simples.
- **Configurações:** tema, redução de animações, tamanho, largura e fonte do texto, visão padrão das pastas, propriedades abertas por padrão, confirmação ao apagar, gerenciar categorias, backup em JSON, exportar em Markdown, importar e dados de exemplo. As categorias de partida entram só na primeira vez.
- **Exemplos** viraram anotações diversas, sem imagens: os desenhos são traços feitos no próprio bloco de desenho, e a galeria também mostra os desenhos.
