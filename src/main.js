import * as d3 from "d3";

document.body.style.margin = "0";
document.body.style.overflow = "hidden";

const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;

const worldWidth = Math.max(viewportWidth * 2.5, 2200);
const worldHeight = Math.max(viewportHeight * 2.5, 1600);

const beeSize = 96;
const flowerSize = 140;
const beeHitRadius = beeSize * 0.36;
const flowerHitRadius = flowerSize * 0.36;

const camera = { x: 0, y: 0 };
const beePosition = { x: worldWidth * 0.3, y: worldHeight * 0.3 };
const flowerPosition = { x: worldWidth * 0.6, y: worldHeight * 0.55 };

let hasWon = false;
let currentBeeTransition = null;
let isBrushSyncing = false;

const svg = d3
  .select("body")
  .append("svg")
  .attr("width", viewportWidth)
  .attr("height", viewportHeight)
  .style("position", "fixed")
  .style("top", 0)
  .style("left", 0)
  .style("touch-action", "none")
  .style("background", "#e9f7ff");

const root = svg.append("g");

root
  .append("rect")
  .attr("width", worldWidth)
  .attr("height", worldHeight)
  .attr("fill", "#f5fff0");

root
  .append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", worldWidth)
  .attr("height", worldHeight)
  .attr("fill", "none")
  .attr("stroke", "#b8ccb8")
  .attr("stroke-width", 4);

const gridLayer = root.append("g").attr("opacity", 0.3);
const gridStep = 180;

for (let x = 0; x <= worldWidth; x += gridStep) {
  gridLayer
    .append("line")
    .attr("x1", x)
    .attr("y1", 0)
    .attr("x2", x)
    .attr("y2", worldHeight)
    .attr("stroke", "#9cc29c")
    .attr("stroke-width", 1);
}

for (let y = 0; y <= worldHeight; y += gridStep) {
  gridLayer
    .append("line")
    .attr("x1", 0)
    .attr("y1", y)
    .attr("x2", worldWidth)
    .attr("y2", y)
    .attr("stroke", "#9cc29c")
    .attr("stroke-width", 1);
}

const bee = root
  .append("image")
  .attr("href", "bee.svg")
  .attr("width", beeSize)
  .attr("height", beeSize);

const flower = root
  .append("g")
  .attr("cursor", "grab")
  .call(
    d3
      .drag()
      .on("start", function () {
        if (hasWon) return;
        d3.select(this).attr("cursor", "grabbing");
      })
      .on("drag", function (event) {
        if (hasWon) return;
        flowerPosition.x = clamp(event.x, flowerSize / 2, worldWidth - flowerSize / 2);
        flowerPosition.y = clamp(
          event.y,
          flowerSize / 2,
          worldHeight - flowerSize / 2,
        );
        renderFlower();
        checkWin();
      })
      .on("end", function () {
        if (hasWon) return;
        d3.select(this).attr("cursor", "grab");
      }),
  );

flower
  .append("image")
  .attr("href", "flor.svg")
  .attr("x", -flowerSize / 2)
  .attr("y", -flowerSize / 2)
  .attr("width", flowerSize)
  .attr("height", flowerSize);

const hud = svg.append("g").attr("pointer-events", "none");

const helperText = hud
  .append("text")
  .attr("x", 20)
  .attr("y", 34)
  .attr("fill", "#1a4d1a")
  .attr("font-size", 20)
  .attr("font-family", "sans-serif")
  .text("Arraste a flor até encostar na abelha. Arraste o cenário para pan.");

const winMessage = hud
  .append("text")
  .attr("x", viewportWidth / 2)
  .attr("y", viewportHeight / 2)
  .attr("text-anchor", "middle")
  .attr("fill", "#0f8d2d")
  .attr("font-size", 58)
  .attr("font-weight", "700")
  .attr("font-family", "sans-serif")
  .style("opacity", 0)
  .text("Você ganhou o jogo!");

const minimapWidth = 220;
const minimapHeight = 150;
const minimapMargin = 16;
const minimapScale = Math.min(minimapWidth / worldWidth, minimapHeight / worldHeight);
const minimapWorldWidth = worldWidth * minimapScale;
const minimapWorldHeight = worldHeight * minimapScale;

const minimap = svg
  .append("g")
  .attr(
    "transform",
    `translate(${viewportWidth - minimapWorldWidth - minimapMargin}, ${
      viewportHeight - minimapWorldHeight - minimapMargin
    })`,
  );

minimap
  .append("rect")
  .attr("width", minimapWorldWidth)
  .attr("height", minimapWorldHeight)
  .attr("fill", "rgba(255,255,255,0.75)")
  .attr("stroke", "#4f5f4f")
  .attr("stroke-width", 1.5);

const minimapViewport = minimap
  .append("rect")
  .attr("fill", "rgba(120, 170, 255, 0.30)")
  .attr("stroke", "#4f7ee6")
  .attr("stroke-width", 1.3);

const minimapBrushLayer = minimap.append("g");

const brush = d3
  .brush()
  .extent([
    [0, 0],
    [minimapWorldWidth, minimapWorldHeight],
  ])
  .on("brush end", brushed);

minimapBrushLayer.call(brush);

const zoom = d3
  .zoom()
  .scaleExtent([1, 1])
  .translateExtent([
    [0, 0],
    [worldWidth, worldHeight],
  ])
  .on("zoom", ({ transform }) => {
    camera.x = clamp(-transform.x, 0, worldWidth - viewportWidth);
    camera.y = clamp(-transform.y, 0, worldHeight - viewportHeight);
    applyCamera();
    syncMinimapFromCamera();
  });

svg.call(zoom);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyCamera() {
  root.attr("transform", `translate(${-camera.x}, ${-camera.y})`);
}

function renderBee(angleDeg) {
  bee.attr(
    "transform",
    `translate(${beePosition.x - beeSize / 2}, ${beePosition.y - beeSize / 2}) rotate(${angleDeg}, ${beeSize / 2}, ${beeSize / 2})`,
  );
}

function renderFlower() {
  flower.attr("transform", `translate(${flowerPosition.x}, ${flowerPosition.y})`);
}

function syncMinimapFromCamera() {
  const selection = [
    [camera.x * minimapScale, camera.y * minimapScale],
    [
      (camera.x + viewportWidth) * minimapScale,
      (camera.y + viewportHeight) * minimapScale,
    ],
  ];
  minimapViewport
    .attr("x", selection[0][0])
    .attr("y", selection[0][1])
    .attr("width", selection[1][0] - selection[0][0])
    .attr("height", selection[1][1] - selection[0][1]);

  isBrushSyncing = true;
  minimapBrushLayer.call(brush.move, selection);
  isBrushSyncing = false;
}

function brushed(event) {
  if (isBrushSyncing || !event.selection || hasWon) return;
  const [[x0, y0]] = event.selection;
  const nextX = clamp(x0 / minimapScale, 0, worldWidth - viewportWidth);
  const nextY = clamp(y0 / minimapScale, 0, worldHeight - viewportHeight);
  const transform = d3.zoomIdentity.translate(-nextX, -nextY);
  svg.call(zoom.transform, transform);
}

function checkWin() {
  if (hasWon) return;
  const dx = beePosition.x - flowerPosition.x;
  const dy = beePosition.y - flowerPosition.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= beeHitRadius + flowerHitRadius) {
    hasWon = true;
    if (currentBeeTransition) {
      currentBeeTransition.on("end", null);
    }
    bee.interrupt();
    helperText.text("Parabéns! Você venceu.");
    winMessage
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .style("opacity", 1);
  }
}

function moveBeeRandomly() {
  if (hasWon) return;

  const margin = beeSize;
  const targetX = margin + Math.random() * (worldWidth - margin * 2);
  const targetY = margin + Math.random() * (worldHeight - margin * 2);

  const dx = targetX - beePosition.x;
  const dy = targetY - beePosition.y;
  const distance = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  const duration = clamp(distance * 3, 900, 2800);
  const startX = beePosition.x;
  const startY = beePosition.y;

  currentBeeTransition = bee
    .transition()
    .duration(duration)
    .ease(d3.easeLinear)
    .tween("move-bee", () => {
      return (t) => {
        beePosition.x = startX + (targetX - startX) * t;
        beePosition.y = startY + (targetY - startY) * t;
        renderBee(angleDeg);
        checkWin();
      };
    })
    .on("end", moveBeeRandomly);
}

function initialize() {
  const startX = clamp((worldWidth - viewportWidth) / 2, 0, worldWidth - viewportWidth);
  const startY = clamp(
    (worldHeight - viewportHeight) / 2,
    0,
    worldHeight - viewportHeight,
  );

  renderBee(0);
  renderFlower();
  applyCamera();

  svg.call(zoom.transform, d3.zoomIdentity.translate(-startX, -startY));
  syncMinimapFromCamera();
  moveBeeRandomly();
}

initialize();
