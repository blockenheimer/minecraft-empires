MINECRAFT EMPIRES — v1.6.81 (Etapa 2: retomada de campanhas)

v1.6.74 – Bandeiras reais: Republic of Bananas, Vulpéria, Cankultaän e Vanilicia. A imagem de Fundoshi foi incluída em public/flags/fundoshi.png, mas Fundoshi não existe na lista atual de nações do jogo e, por isso, não foi conectado ao seletor sem alterar a lógica de gameplay.

# MINECRAFT EMPIRES v1.6.72 — bandeiras reais

Mantém o motor original do singleplayer e adiciona lobby, 2–8 lados, seleção visual das 16 nações do jogo original; as bandeiras já enviadas foram substituídas pelos arquivos reais em `public/flags/`, múltiplos países por lado, alianças, Fog of War, reconhecimento sincronizado, ordens temporizadas e campanhas persistentes.

## Configuração pré-guerra de territórios

Depois de criar a sala e conectar os jogadores, o anfitrião pode usar **CONFIGURAR TERRITÓRIOS** no lobby. Os territórios já vêm pré-selecionados/classificados a partir das cores originais do mapa. No modo de preparação, clique em um território no mapa e escolha o país no painel **Dono do território**. A alteração é sincronizada e salva imediatamente. É possível voltar ao lobby e alterar novamente enquanto a partida ainda não começou.

Depois que a batalha começa, a configuração inicial fica bloqueada; a conquista normal continua usando o motor original.

## Campanhas

Autosave periódico e após alterações importantes. Campanhas ficam em `data/campaigns/`, podem ser exportadas como `.krieg.json` e importadas novamente. Em Render, aponte `CAMPAIGN_DIR` para um Persistent Disk, por exemplo `/var/data/campaigns`.

## Rodar

Node.js 20+

```bash
npm install
npm start
```

## Fluxo da partida

1. **Criar sala:** escolha os países pelos cartões com bandeira; cada lado pode controlar um ou vários países.
2. **Lobby:** os jogadores entram no lado escolhido com a senha.
3. **Pré-guerra:** o anfitrião configura os territórios iniciais diretamente no mapa; a classificação inicial usa as cores existentes no mapa original.
4. **Batalha:** o overlay de multiplayer desaparece e o mapa, painel de tropas, ordens, combate, fog e regras continuam usando o motor visual/offline original.

A seleção de países é feita por caixas de seleção, não por `<select multiple>`, para funcionar normalmente com mouse/touch sem depender de Ctrl/Cmd.


## Sincronização automática de rodadas (v1.6.11)

O término de uma janela de ordens é processado automaticamente. Os clientes entram em **RESOLVENDO** por 2 segundos, o host executa o motor de combate, o servidor recebe o snapshot final e envia a confirmação do resultado para todos os lados. Após mais 2 segundos de exibição do resultado, o servidor abre automaticamente a próxima rodada. Não há botão de atualização manual.


## Regra do anfitrião

O anfitrião ocupa obrigatoriamente o **Lado 1 (S1)**. O servidor rejeita qualquer tentativa de conexão do host em outro lado.


### Posicionamento inicial
Após o início do posicionamento, cada lado pode criar, editar e mover suas próprias tropas localmente. Cada lado pressiona **ESTOU PRONTO**. O servidor só abre a primeira janela de ordens quando os dois lados estiverem prontos e o anfitrião tiver confirmado o snapshot final do posicionamento.


## v1.6.22
- Posicionamento inicial confirmado por cada lado com snapshot próprio.
- Posicionamento de novas tropas por botão esquerdo somente enquanto não confirmado.
- HP inicial normalizado como quantidade × HP individual.
- Resolução de rodada protegida por token e contra snapshots atrasados.
- Resultado da rodada confirmado antes da abertura do turno seguinte.

## v1.6.47 — Tratados diplomáticos
- Ao final de cada rodada, a aba **TRATADOS** fica disponível junto da confirmação da próxima rodada.
- **Telegrama:** comunicação entre os dois lados com formatação de documento e `DATA: A DEFINIR`.
- **Trégua:** proposta com aceite dos dois lados; encerra a rodada atual, salva a campanha e coloca a guerra em suspensão. O conflito pode ser retomado quando os dois lados confirmarem o retorno.
- **Tratado de paz:** proposta com aceite dos dois lados; encerra a guerra definitivamente e gera um relatório final persistente da campanha.



## v1.6.72 — Bandeiras reais
- Substituídas pelas imagens reais as bandeiras de Finllandë, Yelusia, USRR, RDPG, Latinus, DSPA, Leasath, Yukiguni, Lythuria, Orenbirsk, Azilus e Afrem.
- As demais bandeiras continuam iguais até que suas imagens sejam enviadas.
- Os arquivos usados ficam em `public/flags/`.

## v1.6.68 — Correção de vida/quantidade
- Correção do vínculo entre quantidade e vida atual: aumentar a quantidade de uma unidade não reduz mais a vida para o valor de 1 unidade.
- Sincronizações anteriores à resolução não sobrescrevem a vida atual com HP máximo.
- Vida sofrida em combate é preservada entre snapshots e estados remotos.

## v1.6.76
- Logs multiplayer agora censuram a localização de destino de movimentos inimigos para cada lado.
- A censura também cobre movimentos que terminam em ponto de encontro/combate.
- Tropas próprias e aliadas continuam exibindo a localização normalmente.


## v1.6.76
Logo oficial "MINECRAFT EMPIRES — SIMULADOR DE GUERRA" adicionada ao cabeçalho do simulador e ao menu principal multiplayer.

## v1.6.80 — Persistência Fase 1
- Autosave do servidor mantido durante a rodada.
- Botão de salvamento manual disponível somente na pausa de confirmação da próxima rodada.
- Carregamento de campanhas normaliza e preserva tropas, territórios, log, tratados e estatísticas.


## v1.6.92
- Retomada de campanha agora usa modal interno do jogo para lado e senha; sem prompt do navegador.
- Reconexão do Lado 1/host em campanhas permite substituir conexão WebSocket antiga do próprio S1 e reconectar durante partida ativa.


## v1.6.92
- Corrige ordens do Lado 2 sem depender de validação alterada por registros de proprietário.
- Host snapshots preservam unidades do lado oposto ocultas pelo Fog of War.
- Baseada integralmente na v1.6.83 para evitar regressões visuais e de inicialização.


## v1.6.93
- Reconexão de campanhas usa autenticação WebSocket dedicada (`campaign_join`) para evitar o loop de conexão do Lado 1.
- Erros de autenticação de campanha agora aparecem na própria interface.
- O lobby da campanha mantém sincronização automática após a entrada.
- Sessões normais resetam a autenticação específica de campanha.

## v1.6.95
- Removed manual save button from the battle UI; campaign persistence is autosave-only.


### v1.6.99
- Relatórios de batalha mostram os tipos de tropas engajados por lado, além do dano.
- Indicador ⚔ no mapa para pares inimigos mutuamente dentro do alcance de combate e capazes de causar dano naquele momento.
