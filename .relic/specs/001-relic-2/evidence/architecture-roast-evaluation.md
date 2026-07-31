# Architecture Roast Evaluation

> Evidence produced after more than three days of using the project-local
> `architecture-roast` skill in Nest Template. Preserved as input for the Relic 2.0
> redesign; it is an evaluation, not a normative product contract.

## Veredito

  Meu veredito é bastante positivo: a skill de roast foi uma das peças mais importantes para a qualidade arquitetural alcançada neste projeto.

  Eu daria duas notas diferentes:

  - 9/10 para o processo que construímos usando a skill.
  - 7,5/10 para o contrato atualmente escrito na própria skill.

  Essa diferença é importante. O processo funcionou excepcionalmente bem, mas parte dessa qualidade veio das regras que fomos descobrindo durante a conversa —
  especialmente das suas intervenções — e ainda não está formalizada em .codex/skills/architecture-roast/SKILL.md.

  Hoje a skill é um excelente ponto de partida, mas ainda depende de um agente com bom julgamento para não transformar toda questão arquitetural em uma sequência
  interminável de perguntas. Ela precisa evoluir de “roteiro para fazer perguntas críticas” para um verdadeiro protocolo de decisão arquitetural.

  ## O que a skill realmente fez neste projeto

  Na prática, ela deixou de ser apenas uma ferramenta de crítica. Ela cumpriu cinco funções diferentes:

  1. Descobrir decisões arquiteturais ainda implícitas.
  2. Separar decisões reais de detalhes de implementação.
  3. Encontrar contradições entre intenção, documentação e código.
  4. Transformar discussões abertas em specs e epics implementáveis.
  5. Verificar se a implementação final continuava fiel às decisões originais.

  Isso foi particularmente valioso durante o desenvolvimento do Mimir.

  Começamos com uma ideia relativamente ampla: schemas públicos em YAML, geração de schema Drizzle e controle de migrations. O roast ajudou a revelar que, por trás disso,
  existiam diversas decisões independentes:

  - Qual é a fonte de verdade?
  - O schema Drizzle é entrada ou artefato?
  - Quem cria a migration?
  - Quem controla a migration?
  - Como renames são representados?
  - Como custom SQL participa da identidade de uma alteração?
  - Como migrations antigas permanecem imutáveis?
  - O que acontece quando um contrato desaparece?
  - O adapter pertence ao módulo da aplicação ou a um package?
  - O Mimir é uma biblioteca, um compilador, um orquestrador ou uma CLI?
  - Quais responsabilidades continuam pertencendo ao Drizzle?
  - Qual configuração pertence ao Mimir e qual pertence ao adapter?

  Sem esse processo, seria muito fácil implementar uma solução funcional, mas conceitualmente instável. Provavelmente teríamos acabado com scripts de raiz, lógica
  específica de Drizzle espalhada, múltiplas fontes de verdade e uma CLI apenas decorativa.

  O roast também foi importante na arquitetura cross-app. Ele ajudou a perceber que aquela discussão não representava uma única decisão. Havia pelo menos quatro
  superfícies distintas:

  - composição de aplicações;
  - contrato público entre apps;
  - transporte HTTP local ou remoto;
  - seleção de apps por deployment.

  Isso evitou a criação de uma “spec monolítica” que misturaria bootstrap, contratos, HTTP, configuração e deployment.

  ## Os pontos mais fortes

  ### 1. A documentação existente entra como restrição, não como sugestão

  O melhor aspecto da skill é começar pela leitura das fontes de verdade.

  Isso muda completamente a natureza da análise. O roast não começa perguntando “qual arquitetura parece melhor?”, mas sim:

  > Dadas as decisões que já foram aceitas, onde este novo modelo entra em conflito, deixa lacunas ou cria ambiguidades?

  Isso evita que cada nova sessão redesenhe o sistema de acordo com as preferências do modelo. Também torna o processo cumulativo: decisões anteriores restringem as
  próximas, em vez de serem esquecidas.

  Esse comportamento é especialmente importante em projetos arquiteturais longos. Sem isso, o modelo tende a propor uma arquitetura localmente elegante que contradiz
  decisões feitas duas semanas antes.

  ### 2. Ela procura decisões que alteram o resultado

  A instrução de preferir “poucas perguntas que mudam decisões” é excelente.

  O roast funcionou melhor quando perguntou sobre:

  - fonte de verdade;
  - ownership;
  - atomicidade;
  - identidade;
  - lifecycle;
  - comportamento de falha;
  - fronteiras públicas;
  - compatibilidade futura.

  Essas perguntas realmente mudam a arquitetura.

  Por exemplo, perguntar se o Mimir deveria gerar SQL diretamente ou controlar o gerador nativo do Drizzle não era um detalhe. A resposta determinou que o Mimir seria uma
  thin layer de tradução e controle de integridade, não um novo migration engine.

  Da mesma forma, perguntar se uma remoção de contrato deveria ser apenas ignorada ou representar a remoção real de uma tabela definiu o significado do schema.yaml como
  fonte de verdade.

  ### 3. Ela exige que cada decisão tenha um failure mode concreto

  A skill orienta a explicar o problema por trás da pergunta quando ele não é óbvio. Isso é muito bom porque evita perguntas arquiteturais abstratas.

  Uma pergunta útil não é:

  > Devemos guardar o path anterior?

  Uma pergunta útil é:

  > Se o path for tratado como identidade, mover um SQL sem alterar seu conteúdo produzirá uma migration falsa. Queremos que a identidade seja o path ou o conteúdo?

  O segundo formato mostra a consequência operacional da decisão.

  Isso melhorou muito a qualidade das respostas porque permitiu que você decidisse com base no comportamento desejado, e não em preferência estética.

  ### 4. Ela preserva decisões confirmadas

  A regra de não reabrir escolhas sem apresentar uma contradição concreta é fundamental.

  Em conversas arquiteturais longas, um modelo pode entrar num ciclo de revisão permanente:

  1. propõe A;
  2. o usuário escolhe A;
  3. mais tarde o modelo volta a sugerir B;
  4. outra revisão reabre A versus B;
  5. nada se consolida.

  A skill reduz esse risco. Depois que uma decisão foi confirmada, ela passa a ser uma restrição. Só pode ser reaberta se uma nova evidência mostrar conflito,
  impossibilidade ou um custo não conhecido anteriormente.

  Isso deu continuidade ao Mimir. Decisões como “PostgreSQL primeiro”, “schema.yaml como fonte de verdade”, “migrations imutáveis” e “Drizzle continua gerando migrations”
  deixaram de ser assuntos em aberto.

  ### 5. Ela separa decisão arquitetural de implementação

  O roast foi muito bom para impedir que detalhes prematuros dominassem a discussão.

  Quando ainda estávamos decidindo o modelo de custom SQL, não fazia sentido discutir nomes exatos de funções internas. Antes disso era necessário definir:

  - quem referencia o SQL;
  - qual é sua identidade;
  - como alterações são detectadas;
  - quando ele entra na migration;
  - quem garante que a migration anterior não seja alterada.

  Só depois dessas respostas a estrutura do código ficou previsível.

  Essa ordenação reduz retrabalho. Uma implementação pode mudar sem afetar a arquitetura, mas uma mudança de fonte de verdade geralmente invalida boa parte da
  implementação.

  ### 6. Ela trata deferrals como decisões legítimas

  Outro ponto forte é não forçar uma falsa completude.

  O projeto pôde declarar conscientemente que alguns pontos ficariam para depois:

  - suporte a outros bancos;
  - foreign keys entre contratos;
  - readiness completo baseado na lineage;
  - maior cobertura direta de determinados caminhos;
  - seleção mais sofisticada de adapters;
  - casos avançados de custom SQL.

  Isso é melhor do que inventar soluções superficiais apenas para declarar uma spec “completa”.

  Uma decisão adiada, quando possui motivo e fronteira claros, é parte válida da arquitetura. Não é uma falha do processo.

  ### 7. Ela funcionou como ponte entre discussão, spec, epic e implementação

  O processo criado foi mais ou menos:

  ideia
    → roast da ideia
    → decisões confirmadas
    → spec
    → roast da spec
    → epic
    → roast da epic
    → implementação
    → roast da implementação contra a epic
    → encerramento

  Esse fluxo foi excelente.

  Cada etapa responde a uma pergunta diferente:

  - A ideia é coerente?
  - A spec é completa?
  - A epic é implementável?
  - O código cumpre a epic?
  - A feature cumpre a spec?

  Essa rastreabilidade foi uma das principais razões pelas quais o Mimir chegou ao primeiro checkpoint sem parecer um conjunto acidental de scripts.

  ### 8. O roast é particularmente bom para detectar ownership incorreto

  Muitas das melhores conclusões do projeto vieram de perguntas sobre quem sabe o quê.

  Alguns exemplos:

  - O domínio conhece Drizzle ou apenas o contrato público do database module?
  - O module define o token concreto ou o core da aplicação?
  - O Mimir conhece a configuração da migration ou delega isso ao adapter?
  - O app consumidor conhece a localização do outro app ou apenas seu contrato público?
  - O schema YAML controla o banco ou apenas gera TypeScript?
  - O controller é contrato cross-app ou apenas interface HTTP?

  Essas perguntas identificam acoplamento estrutural antes que ele apareça como duplicação de código.

  ### 9. Ela é reutilizável fora deste projeto

  A skill não está presa ao NestJS, Drizzle ou Mimir. Seus checks fundamentais são gerais:

  - autoridade;
  - ownership;
  - identidade;
  - lifecycle;
  - ordering;
  - atomicidade;
  - failure handling;
  - source of truth;
  - fronteiras;
  - escala.

  Ela pode ser usada para revisar:

  - um sistema distribuído;
  - um workflow assíncrono;
  - um modelo de domínio;
  - um pacote;
  - uma API;
  - uma máquina de estados;
  - uma estratégia de persistência;
  - uma arquitetura de plugins;
  - uma feature de produto com estado complexo.

  Essa generalidade é um grande mérito.

  ## Onde a skill ainda é fraca

  ### 1. Ela ainda trata dúvidas demais como perguntas

  Essa foi a deficiência mais evidente durante nosso uso.

  Você estabeleceu uma regra melhor do que a presente na skill:

  > Se uma dúvida possui apenas uma solução razoável, então não temos uma dúvida; temos uma solução.

  Isso precisa entrar formalmente no workflow.

  Hoje a skill manda identificar decisões não resolvidas e fazer perguntas. Mas não diferencia:

  - uma bifurcação arquitetural legítima;
  - uma contradição objetiva;
  - uma consequência lógica de decisões anteriores;
  - um detalhe que pode receber o default mais simples;
  - uma questão fora do escopo.

  Isso pode fazer o agente perguntar ao usuário coisas como:

  > O arquivo inexistente deve gerar erro?

  Quando o contrato já afirma que o arquivo é uma dependência explícita, existe praticamente uma única resposta coerente: sim, deve falhar.

  Perguntar nesse caso transfere trabalho desnecessário ao usuário.

  ### 2. O contrato escrito não reconhece os diferentes tipos de roast

  Nós usamos a mesma skill para tarefas muito diferentes, mas ela não declara esses modos.

  Pelo menos quatro modos surgiram na prática.

  #### Roast de descoberta

  Usado quando existe uma ideia ou discussão ainda aberta.

  Objetivo: revelar decisões fundamentais e contradições.

  #### Roast de readiness de uma spec ou epic

  Usado antes da implementação.

  Objetivo: descobrir se o documento possui informação suficiente para implementação determinística.

  #### Roast de compliance

  Usado depois da implementação.

  Objetivo: comparar cada requisito com código e testes e apontar o que não foi cumprido.

  #### Roast operacional

  Usado para analisar falhas, concorrência, atomicidade, recovery, deployment e observabilidade.

  Objetivo: verificar se o modelo continua correto fora do happy path.

  Esses modos exigem perguntas, evidências e critérios de conclusão diferentes. A skill atual trata todos como uma única atividade genérica.

  ### 3. Falta uma taxonomia explícita para os findings

  Todo finding deveria ser classificado. Minha sugestão:

  - Contradição: duas regras não podem ser verdade ao mesmo tempo.
  - Lacuna bloqueante: a implementação depende de uma decisão entre alternativas válidas.
  - Solução derivável: decisões anteriores deixam apenas uma solução coerente.
  - Risco aceito: existe um problema conhecido, mas ele está conscientemente fora do recorte.
  - Detalhe de implementação: pode ser decidido durante o código sem alterar o contrato.
  - Melhoria futura: válida, mas desnecessária para o objetivo atual.
  - Não problema: preocupação que não produz failure mode relevante dentro do escopo.

  Sem essa classificação, uma lista de roast pode misturar um problema de atomicidade com uma preferência de nome. Ambos aparecem como “pontos em aberto”, embora tenham
  pesos completamente diferentes.

  ### 4. Falta priorização por severidade

  A skill deveria ordenar os findings por impacto.

  Uma escala simples seria suficiente:

  - P0 — incoerência fundamental: fonte de verdade, perda de dados, autoridade ou segurança.
  - P1 — bloqueia implementação correta: lifecycle, atomicidade, identidade, contrato público.
  - P2 — bloqueia operação confiável: recovery, diagnóstico, deployment, idempotência.
  - P3 — ergonomia ou evolução futura: naming, extensibilidade, conveniência.
  - P4 — preferência: alternativas equivalentes sem impacto material.

  Isso permitiria encerrar uma epic mesmo com P3 ou P4 deliberadamente adiados, desde que P0 e P1 estivessem resolvidos.

  ### 5. A proibição de escrever enquanto existem decisões abertas é rígida demais

  A regra atual diz para não produzir o documento enquanto decisões materiais permanecem abertas, salvo pedido explícito.

  A intenção é boa: não cristalizar suposições como normas. Mas nossa experiência mostrou que documentos também podem ser ferramentas de raciocínio.

  Em vários momentos foi útil criar uma spec ou discussion em estado de draft contendo:

  - decisões confirmadas;
  - perguntas abertas;
  - non-goals;
  - pontos adiados;
  - hipóteses ainda não normativas.

  A regra mais precisa seria:

  > Não promover um documento a normativo ou completo enquanto decisões materiais permanecem abertas. Um draft pode ser criado como instrumento de raciocínio, desde que
  > seu status e suas lacunas estejam explícitos.

  Essa diferença entre “escrever” e “aceitar” é importante.

  ### 6. Falta uma definição objetiva de conclusão

  A skill explica como começar e conduzir o roast, mas não define claramente quando parar.

  Isso cria o risco de roasts sucessivos continuarem encontrando refinamentos indefinidamente.

  Um roast deveria ser considerado concluído quando:

  - não existem contradições fundamentais conhecidas;
  - toda fonte de verdade possui owner;
  - os principais estados têm lifecycle definido;
  - os failure modes relevantes têm comportamento determinado;
  - o contrato público está explícito;
  - as decisões ainda abertas não bloqueiam o recorte;
  - os deferrals possuem fronteira clara;
  - os critérios de aceite permitem verificar a implementação.

  “Não consigo pensar em mais perguntas” não é uma boa condição de encerramento. “Nenhuma pergunta restante muda a implementação ou o contrato atual” é muito melhor.

  ### 7. Falta exigir evidência no roast de compliance

  Quando o roast compara uma epic com o código, cada finding deveria apontar:

  - o requisito;
  - a implementação correspondente;
  - o teste correspondente;
  - a divergência concreta;
  - a consequência.

  Por exemplo:

  Requisito: migrations finalizadas são imutáveis.
  Código: packages/mimir/src/...
  Teste: packages/mimir/tests/...
  Finding: o comando reabre a última migration e pode alterá-la.
  Consequência: a lineage deixa de ser imutável.

  A skill atual é ótima para raciocínio, mas ainda não exige rastreabilidade suficiente para auditoria de implementação.

  ### 8. Falta uma regra explícita de “recomendação primeiro”

  Quando existe uma pergunta legítima, o agente deveria apresentar primeiro sua recomendação.

  Em vez de:

  > O manifest deve guardar o path anterior?

  Seria melhor:

  > Recomendo não guardar o path anterior. O YAML atual é a fonte de verdade, enquanto o hash identifica o conteúdo e a última migration fornece a referência histórica.
  > Guardar o path criaria uma segunda identidade para o mesmo recurso. Existe algum requisito de auditoria de movimentação de arquivos que torne o path histórico
  > necessário?

  Isso reduz o esforço cognitivo do usuário e deixa claro que o agente já fez a análise.

  O usuário continua tomando a decisão, mas não precisa construir todas as alternativas sozinho.

  ### 9. Falta um mecanismo formal de decision ledger

  Ao longo de uma sessão longa, deveríamos manter uma lista explícita com:

  - decisões confirmadas;
  - defaults adotados;
  - perguntas abertas;
  - deferrals;
  - decisões substituídas;
  - documentos afetados.

  Hoje isso ocorre informalmente por meio da conversa e dos documentos.

  Um ledger evitaria:

  - reabrir decisões;
  - esquecer o motivo de uma escolha;
  - confundir uma recomendação com uma decisão aprovada;
  - declarar uma epic completa enquanto uma questão bloqueante permanece aberta.

  Ele não precisa necessariamente ser um arquivo permanente. Pode ser um bloco temporário mantido durante o roast e incorporado à spec no final.

  ### 10. Falta controlar melhor a quantidade e o formato das perguntas

  A skill diz para não sobrecarregar o usuário, mas não define um mecanismo.

  Na prática, eu recomendaria:

  - no máximo três a cinco decisões por rodada;
  - agrupar por tema;
  - ordenar por dependência;
  - resolver primeiro o que elimina perguntas posteriores;
  - nunca perguntar detalhes de implementação antes de ownership e fonte de verdade.

  Uma boa rodada seria:

  1. Quem é a fonte de verdade?
  2. Qual é a identidade persistente?
  3. Quem controla o lifecycle?

  Depois dessas respostas, várias perguntas menores deixam de existir.

  ### 11. Falta uma lente explícita de MVP

  Em um template ou package inicial, é fácil o roast descobrir problemas legítimos que só importam em produção avançada.

  A skill diz para não substituir regras de domínio por otimização prematura, mas poderia ir além:

  > Diferencie o que é necessário para fechar o ciclo atual do que apenas melhora generalidade, escala ou ergonomia futura.

  Isso foi essencial no Mimir. Poderíamos ter tentado resolver:

  - múltiplos bancos;
  - múltiplos adapters simultâneos;
  - cross-contract foreign keys;
  - migrations distribuídas;
  - rollback automático;
  - discovery;
  - publicação independente;
  - compatibility matrix.

  Todos são assuntos válidos. Nenhum era necessário para provar o primeiro ciclo funcional.

  ### 12. Falta um formato de handoff entre sessões

  Como você quer levar essa avaliação para outra sessão, esta é uma necessidade especialmente clara.

  Ao final de um roast, a skill deveria produzir um resumo transferível:

  Objetivo
  Escopo atual
  Decisões confirmadas
  Restrições herdadas
  Findings resolvidos
  Perguntas bloqueantes
  Deferrals
  Próximo artefato
  Critério de conclusão

  Isso permitiria que outra sessão continuasse o trabalho sem reler toda a conversa nem reinterpretar decisões já encerradas.

  ## O maior aprendizado desta sessão

  O maior aprendizado é que o roast não deve ser uma máquina de produzir dúvidas.

  Ele deve ser uma máquina de reduzir o espaço de decisões.

  Um roast bem executado deve terminar com menos possibilidades do que começou. A cada rodada ele deve fazer uma destas coisas:

  - eliminar uma alternativa incoerente;
  - confirmar uma decisão;
  - derivar uma solução de decisões anteriores;
  - isolar um problema em outra spec;
  - registrar conscientemente um risco;
  - provar que algo não pertence ao escopo.

  Se, depois de várias rodadas, o sistema parece mais aberto do que antes, o roast falhou.

  ## Como eu reestruturaria a skill

  Eu manteria a essência atual, mas transformaria o workflow em algo assim.

  ### 1. Escolher o modo

  Antes da análise, declarar:

  - discovery;
  - spec readiness;
  - implementation compliance;
  - operational resilience;
  - architecture decomposition.

  ### 2. Definir o alvo e a fronteira

  Exemplo:

  > Alvo: verificar se a Epic 003 é implementável sem decisões arquiteturais adicionais. Não estamos revisando performance de produção nem suporte a adapters futuros.

  Isso evita expansão silenciosa.

  ### 3. Extrair restrições confirmadas

  Separar claramente:

  - fontes normativas;
  - decisões já confirmadas;
  - requisitos do usuário;
  - non-goals;
  - deferrals existentes.

  ### 4. Modelar as superfícies críticas

  Analisar apenas o que for relevante:

  - ownership;
  - source of truth;
  - identidade;
  - lifecycle;
  - estados e transições;
  - atomicidade;
  - erros;
  - contrato público;
  - configuração;
  - observabilidade;
  - escala.

  ### 5. Classificar cada finding

  Cada finding recebe:

  - categoria;
  - severidade;
  - evidência;
  - failure mode;
  - recomendação;
  - necessidade ou não de decisão do usuário.

  ### 6. Resolver automaticamente o que for derivável

  Se existe apenas uma solução coerente com as restrições, o agente deve adotá-la como recomendação e seguir.

  Ele só deve parar quando:

  - existem múltiplas soluções válidas;
  - a escolha muda contrato, ownership ou comportamento;
  - não há evidência para inferir a intenção;
  - a escolha pertence legitimamente ao produto.

  ### 7. Perguntar em batches pequenos

  Cada pergunta deve conter:

  - a decisão;
  - por que ela importa;
  - a recomendação;
  - alternativas razoáveis;
  - consequência de cada alternativa.

  ### 8. Produzir um decision ledger

  Ao final de cada rodada:

  - confirmadas;
  - derivadas;
  - abertas;
  - adiadas;
  - substituídas.

  ### 9. Atualizar o artefato adequado

  A saída pode ser:

  - discussion;
  - ADR;
  - spec;
  - epic;
  - matriz de implementação;
  - relatório de compliance.

  O roast não deve tratar todos esses documentos como equivalentes.

  ### 10. Aplicar a definição de conclusão

  O roast termina quando nenhuma questão restante altera o contrato ou impede a implementação do escopo atual.

  ## Formato ideal de saída

  Eu usaria este contrato:

  Modo do roast
  Alvo
  Veredito

  Restrições estabelecidas
  - ...

  Findings
  1. [P1 — lacuna bloqueante]
     Evidência:
     Failure mode:
     Recomendação:
     Decisão necessária:

  2. [P2 — solução derivável]
     Evidência:
     Solução:
     Impacto:

  Decisões confirmadas
  - ...

  Decisões derivadas
  - ...

  Perguntas bloqueantes
  - ...

  Deferrals
  - ...

  Critério de conclusão
  - ...

  Próximo passo
  - ...

  Esse formato torna o resultado auditável, implementável e fácil de transportar para outra sessão.

  ## Minha avaliação do uso no Mimir

  O roast foi excepcionalmente eficiente no Mimir porque o problema tinha muitas fronteiras de autoridade:

  schema.yaml
      ↓
  parser
      ↓
  modelo PostgreSQL
      ↓
  adapter Drizzle
      ↓
  schema TypeScript
      ↓
  Drizzle Kit
      ↓
  migration
      ↓
  manifest/lineage
      ↓
  banco aplicado

  Sem uma análise cuidadosa, seria fácil atribuir a mesma responsabilidade a duas camadas.

  O roast ajudou a estabelecer que:

  - o YAML define intenção persistente;
  - o parser valida o contrato;
  - o adapter traduz para o ORM;
  - o Drizzle gera a migration;
  - o Mimir controla o processo e protege a lineage;
  - o banco é o estado materializado;
  - migrations antigas são história imutável.

  Essa clareza é exatamente o tipo de resultado que justifica a existência da skill.

  Ao mesmo tempo, o processo mostrou as limitações do contrato atual:

  - foi necessário você dizer que respostas óbvias deveriam ser assumidas;
  - tivemos que descobrir informalmente a diferença entre roast de spec e roast de código;
  - o critério de “epic complete” surgiu da conversa, não da skill;
  - a divisão em batches foi orientada manualmente;
  - o decision ledger ficou distribuído entre chat, specs e commits.

  Portanto, o sucesso foi real, mas parte dele ainda não é reproduzível apenas lendo a skill.

  ## Minha avaliação do uso na arquitetura cross-app

  Aqui o roast teve outro mérito: evitou confundir uma arquitetura atraente com uma arquitetura especificada.

  A ideia de tratar chamadas internas como HTTP local possui uma narrativa forte:

  - mesmo contrato local e remoto;
  - mesmos middlewares;
  - mesma serialização;
  - menor custo de extração para microserviço;
  - apps desabilitados podem apontar para deployments remotos.

  Mas uma narrativa coerente ainda deixa perguntas práticas:

  - quem registra os apps;
  - como são selecionados por deployment;
  - como dependências são declaradas;
  - como URLs remotas são configuradas;
  - o que significa readiness parcial;
  - como ciclos são detectados;
  - qual contrato é público;
  - o que acontece com chamadas para o próprio processo;
  - quais recursos são inicializados para apps desabilitados.

  O roast foi correto ao quebrar esse modelo em mais de um documento. Porém, ele também mostrou que a skill precisa distinguir melhor:

  - uma discussion usada para explorar;
  - uma ADR usada para escolher;
  - uma spec usada para definir;
  - uma epic usada para implementar.

  ## O risco de mau uso

  A skill pode ser usada mal de três formas.

  ### Roast performático

  O agente tenta parecer crítico produzindo uma lista enorme de edge cases, mas nenhum deles muda a decisão atual.

  Isso gera ruído, não rigor.

  ### Roast paralisante

  O agente recusa-se a produzir qualquer artefato até que todos os detalhes imagináveis sejam resolvidos.

  Isso impede o uso de drafts como instrumentos de pensamento.

  ### Roast revisionista

  O agente reabre decisões confirmadas porque conhece outra arquitetura que considera mais elegante.

  Isso destrói continuidade e transforma cada sessão numa nova origem do projeto.

  A skill já combate parcialmente esses problemas, mas deveria nomeá-los explicitamente.

  ## Recomendação final

  Eu manteria a skill e a trataria como uma capacidade central do workflow. Ela não precisa ser substituída; precisa ser amadurecida.

  A principal mudança deveria ser esta:

  > O roast não existe para perguntar tudo. Ele existe para classificar incertezas, resolver automaticamente o que é derivável, pedir decisão somente diante de forks
  > materiais e concluir quando o escopo atual estiver determinístico e verificável.

  Em ordem de prioridade, eu melhoraria:

  1. adicionar modos explícitos de roast;
  2. criar a taxonomia de findings;
  3. incorporar a regra “uma única solução razoável não é uma pergunta”;
  4. exigir recomendação antes de pergunta;
  5. criar uma definição de conclusão;
  6. distinguir draft de documento normativo;
  7. adicionar decision ledger;
  8. exigir evidência no compliance roast;
  9. limitar e ordenar perguntas por batch;
  10. produzir um handoff reutilizável entre sessões.

  ## Descrição curta para levar a outra sessão

  Você pode usar este resumo:

  > A skill architecture-roast provou ser muito eficaz como protocolo docs-first para transformar ideias em decisões arquiteturais, specs, epics e verificações de
  > compliance. Seus maiores méritos são preservar decisões anteriores, procurar ownership e source of truth, expor failure modes e separar decisões fundamentais de
  > detalhes de implementação. Sua principal limitação é tratar incertezas de forma genérica: ela ainda não diferencia forks reais, contradições, soluções deriváveis,
  > detalhes de implementação e deferrals. Isso pode gerar perguntas desnecessárias e roasts sem critério claro de encerramento. A próxima versão deveria possuir modos
  > explícitos — discovery, spec readiness, implementation compliance e operational resilience —, uma taxonomia de findings com severidade, recomendação antes de cada
  > pergunta, um decision ledger e uma definição de conclusão. A regra central deve ser: se existe somente uma solução coerente com as decisões já confirmadas, o agente
  > deve apresentá-la e seguir; deve perguntar apenas quando múltiplas alternativas válidas alterarem materialmente o contrato, ownership ou comportamento do sistema.

  Em uma frase: a skill já é excelente para produzir boa arquitetura, mas precisa codificar melhor o julgamento que hoje ainda depende da conversa entre agente e usuário.
