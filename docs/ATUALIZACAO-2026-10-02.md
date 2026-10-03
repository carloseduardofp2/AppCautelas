# Atualização do App Cautelas — SecOp

Implementação baseada em https://github.com/carloseduardofp2/AppCautelas.git, commit `85a2e2a3837276249d9fb733506c7e227fc19e4a`. O HEAD remoto foi conferido em 02/10/2026 e permaneceu nesse commit.

## Revisão sem fotos

Esta revisão substitui o pacote anterior. Fotos foram retiradas para dispensar Storage e Blaze. Mantidos estoque, cautelas, assinaturas, previsão, PDF e ordenação. Se já aplicou o pacote anterior, pode remover os arquivos agora sem uso: `src/components/FotoMaterial.js`, `src/services/fotoService.js`, `tests/fotos.e2e.mjs` e `tests/storage.fixture.rules`. Execute `npm ci` para alinhar as dependências. Não exclua dados do Firebase.

## Preservação das cautelas existentes

Nenhum acesso ou alteração no Firebase real foi realizado. Publicação pelo GitHub autorizada pelo usuário em 02/10/2026; conferir o status do deploy na Vercel após o commit. O pacote contém somente código novo/alterado, testes e esta documentação; não contém banco, credenciais, arquivos `.env`, imagens reais ou cópia dos registros.

Não existe rotina que apague ou recrie as coleções. As cautelas antigas continuam nos mesmos IDs. As assinaturas existentes não são compactadas novamente nem sobrescritas. Na primeira correção, os dados anteriores ficam em `dadosOriginais`; no primeiro acréscimo, a lista anterior fica em `materiaisOriginais`. O histórico registra cada operação separadamente.

A exclusão solicitada pelo usuário passa a ser lógica: `excluida` nas cautelas e `arquivado` nos materiais. Os documentos continuam no banco. Excluir uma cautela ativa repõe somente a quantidade ainda pendente cuja retirada do estoque é comprovada; essa exclusão continua exigindo ação explícita na interface.

## Funcionalidades

- Livro: corrigir militar, OM, observação e previsão, com responsável, motivo e histórico; detalhes e PDF por cautela.
- Acrescentar materiais a cautela assinada ainda aberta. Uma assinatura compacta confirma todos os itens daquele acréscimo. Uma nova operação gera novo registro; não mistura os itens na lista original do PDF.
- Cautela totalmente devolvida não aceita acréscimos. Registros antigos marcados `estoqueDevolvido` também são protegidos contra nova retirada/devolução automática.
- Previsão opcional por data, na criação e edição, Livro e PDF. Ausência de previsão não impede salvar.
- Devolução parcial ou total por item, com assinatura. Uma devolução já registrada que esteja sem assinatura pode receber apenas essa assinatura, sem movimentar estoque novamente.
- Fotos de materiais retiradas a pedido do usuário. O aplicativo não inicializa nem utiliza Firebase Storage; esta atualização não exige habilitar Blaze. As assinaturas compactas continuam no Firestore, como parte das cautelas.
- Prateleiras e caminhos usam ordenação numérica natural: 1, 2, 3, 10.
- Mantidos o visual escuro/dourado, a navegação, a hierarquia de materiais e os fluxos existentes de cautela e exportação.
- Login nominal permanece adiado: a sessão anônima existente foi mantida. O responsável pelas movimentações de cautela é informado manualmente; o histórico também guarda o UID. Isso é identificação declarada, não autenticação da identidade militar.

Quantidades de cautelas assinadas não são reescritas pela edição de texto: novas retiradas usam o acréscimo; reposições usam devolução. Assim, a correção de observações não movimenta estoque.

## Correções de estoque

A lógica ficou centralizada em `cautelaService.js` e `estoque.mjs`, usando transações Firestore. Todos os materiais são lidos e validados antes das gravações. Cautela, saldos e evento são confirmados juntos; uma falha impede o conjunto inteiro.

`quantidade` continua significando disponível, `quantidadeCautelada` é o saldo emprestado e `quantidadeTotal` é sua soma. Cada item da cautela tem `pendente`. Devolver reduz apenas esse saldo, sem usar novamente a quantidade original completa. Materiais repetidos na operação são agrupados pelo ID. Retiradas simultâneas disputando o último item não produzem valores negativos.

Cada operação de cautela usa um ID estável durante a tentativa, evitando desconto duplicado em reenvio. Edições de texto verificam a revisão anterior. Edições do cadastro de material verificam se saldo, nome ou localização mudaram durante a edição. Mudar a quantidade disponível no cadastro preserva a cautelada e registra antes/depois; mudar apenas o nome não reconcilia silenciosamente um total antigo divergente.

O código antigo misturava cálculos visuais com o saldo armazenado e devolvia quantidades originais, incluindo limites artificiais em zero. A nova lógica rejeita divergências e faz reposição pelo pendente. A referência ResMat foi utilizada especialmente para leitura prévia dos documentos, transação única e rastreamento dos itens.

## Estrutura compatível

| Caminho | Campos relevantes |
|---|---|
| `materiais/{id}` | Campos anteriores mantidos; `quantidade`, `quantidadeCautelada`, `quantidadeTotal`; datas/UID de criação; `arquivado` quando removido |
| `materiais/{id}/historico/{id}` | Edição de cadastro com UID, horário do servidor, saldos, localização antes/depois |
| `cautelas/{id}` | Campos anteriores mantidos; `schemaVersion: 2`, `revisao`, `previsaoDevolucao`, `totalAcrescimos`, `materiais[].linhaId/pendente/estoqueControlado`; snapshots originais; datas/UID; `excluida` |
| `cautelas/{id}/historico/{operacaoId}` | Tipo, responsável declarado, UID, horário do servidor, revisão, itens/quantidades e assinatura quando aplicável; antes/depois e motivo em correções |

Assinaturas novas são imagens compactas com limite de 60.000 caracteres em data URL (aproximadamente 45 KB de imagem). Acréscimos são documentos separados, evitando um array de assinaturas cada vez maior na cautela. A assinatura de devolução final fica no campo tradicional, sem duplicação no evento. Há limites de segurança de 100 itens por operação e 150 linhas distintas numa cautela; acréscimos sucessivos dos mesmos itens não consomem novas linhas distintas. Não há limite fixo de eventos no histórico. Um documento que alcance a margem de tamanho exige abrir outra cautela.

## Dados antigos e divergências

Não há migração destrutiva obrigatória. Campos opcionais ausentes são aceitos, e os campos de controle são acrescentados ao movimentar/editar o documento. Registros sem vínculo de material nunca são associados por semelhança de nome.

Sem `estoqueBaixado: true` ou prova explícita no formato novo, uma devolução antiga não repõe estoque automaticamente. Repor por suposição poderia aumentar o saldo indevidamente. A interface sinaliza o caso. Um saldo cautelado persistido diferente da soma dos registros ativos também aparece como divergência.

Saldos antigos já incorretos não foram reconciliados, pois o banco real não foi disponibilizado para auditoria. Para cada divergência, conferir documentos, empréstimos ainda abertos e contagem física antes de ajustar os três saldos em conjunto. Não zerar a quantidade cautelada nem apagar cautelas para esconder a diferença. Um total divergente deve ser corrigido explicitamente após conferência; editar apenas o nome não faz essa correção.

## Aplicação e Firebase

1. Fazer backup/exportação do Firestore real, incluindo subcoleções, antes da atualização. O PDF do Livro ajuda na conferência, mas não substitui o backup do banco. Nenhum backup real foi feito nesta implementação.
2. Aplicar os arquivos sobre uma cópia do repositório no commit-base indicado. Não substituir o repositório inteiro nem remover arquivos não incluídos. Preservar as variáveis Firebase e a configuração de hospedagem existentes.
3. Rodar `npm ci`, configurar o mesmo projeto Firebase e executar `npm run build`. Publicar `dist`, nunca `dist-test`. Em produção, `EXPO_PUBLIC_USE_EMULATORS` deve estar ausente ou `false`.
4. Manter o provedor anônimo no Firebase Authentication enquanto o login nominal não for implementado. O app agora aguarda a autenticação antes de abrir as consultas.
5. Não é necessário configurar Storage ou ativar Blaze para esta versão. Não foi contratado outro serviço para hospedar imagens.
6. Revisar as regras reais antes de publicar: operações precisam ler/escrever cautelas e materiais, ler/criar seus históricos. Históricos devem ser somente de acréscimo para os usuários, com UID e campos validados conforme a política já adotada. Regras atuais não constam no repositório e não foram acessadas; não seria seguro substituí-las às cegas.
7. **Nunca publicar `tests/firestore.fixture.rules`.** São configurações isoladas dos testes funcionais; não validam a segurança do ambiente real. O arquivo `firebase.test.json` não é configuração de produção.
8. Validar a atualização em ambiente de homologação com cópia controlada dos dados. Conferir cautelas antigas assinadas, pendentes, devolvidas, avulsas e materiais com divergências antes de liberar.
9. Fechar abas/instalações antigas e atualizar todos os aparelhos antes de novas movimentações. A versão antiga não entende devoluções parciais e pode repor quantidade incorreta. Depois de usar o formato novo, não voltar somente o frontend antigo sobre o banco atualizado; qualquer reversão exige análise conjunta do código e dados.

A revisão das regras reais permanece pendente; a publicação do código não modifica essas regras. A retirada da função de fotos não apaga campos nem arquivos existentes no banco ou em qualquer serviço; apenas remove o recurso do aplicativo.

## Testes realizados

- Revisão sem fotos: exportação web refeita; testes unitários, integrados e de navegador reexecutados sem emulador Storage, incluindo salvar a edição de material sem alterar o saldo.
- 8 testes unitários: sequência 10→7/3→5/5→6/4→4/6→10/0, limites, devolução parcial, legado, data opcional/inválida, PDF/escape e ordenação natural.
- 8 testes integrados nos emuladores oficiais de Auth/Firestore: criação, segunda cautela, acréscimo, reenvio sem duplicação, edição, devoluções, estoque insuficiente, concorrência de retiradas e devoluções, falha atômica com múltiplos itens, avulsos, exclusão lógica, legado, assinatura obrigatória, preservação da assinatura original e assinatura final sem nova movimentação e rejeição de acesso sem sessão.
- Navegador Chromium: criação assinada com previsão, seleção de estoque, acréscimo assinado, correção, devolução parcial/final, bloqueio de acréscimo após encerramento, histórico e PDF. Verificação em larguras 360, 768 e 1280, sem rolagem horizontal indevida ou erros JavaScript.
- PDF gerado pelo app renderizado e inspecionado: dados originais, previsão, acréscimo com uma assinatura, correção e devoluções separados.
- Build/exportação web e bundle Android concluídos. Não foi gerado APK/IPA assinado, nem testado aparelho Android/iOS físico. Compartilhamento nativo exigem homologação no aparelho.

Comandos reproduzíveis: Node compatível com Expo 54/Firebase CLI, Java 21, Python 3 e Chromium do Playwright.

```sh
npm ci
npx playwright install chromium
npm test
npm run test:integration
npm run test:e2e
npm run build
npx expo export --platform android
```

Rodar cada suíte de emulador separadamente: suas bases são descartáveis e possuem cenários diferentes. Todos os testes usam exclusivamente `demo-cautelas`, sem credenciais reais. Se utilizar um Chromium instalado fora do caminho padrão do Playwright, informar `CHROMIUM_PATH`.

## Arquivos

A lista exata de arquivos novos e alterados está em `docs/ARQUIVOS-ALTERADOS.txt`, incluída no pacote. Principais grupos: serviço transacional e regras de estoque; hooks de cautelas/materiais; Livro/Pendentes/Materiais; formulários, assinatura e data; PDF; dependências e testes. Nenhum arquivo original foi removido.
