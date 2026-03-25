# Bee Game (desenhando-com-codigo)

Projeto desenvolvido com **Vite** + **D3.js**.

## Sobre o jogo
Neste projeto, o app evoluiu para um **jogo**: o objetivo é **levar a flora (a flor)** até a **abelha**. Quando a **flor encosta na abelha**, o jogo é **finalizado** (condição de vitória).

## Como jogar
- Arraste a flor pela cena e tente encostá-la na abelha.
- Ao ocorrer a colisão/contato entre os elementos, o jogo termina.

## D3.js no funcionamento
Utilizamos recursos do **D3.js** para dar vida à interação:
- **`transition`**: animações e mudanças suaves de posição/estado.
- **`drag`**: permite arrastar a flor com o mouse/touch.
- **pan**: movimentação da “câmera”/visão do cenário para explorar a área do jogo.

## Rodando localmente
```bash
npm install
npm run dev
```

## Build e preview
```bash
npm run build
npm run preview
```
