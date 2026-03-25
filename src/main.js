import * as d3 from "d3";

// Remove margins to allow the SVG to fill the whole screen cleanly
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

const width = window.innerWidth;
const height = window.innerHeight;

// Create the main SVG container
const svg = d3
  .select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("position", "absolute")
  .style("top", 0)
  .style("left", 0);

// Define a more natural, wavy flight path for the bee
// using a Catmull-Rom spline through multiple points
const beeSize = 100;

const points = [
  [-beeSize, height * 0.6], // start off-screen
  [width * 0.1, height * 0.2], // swoop up
  [width * 0.25, height * 0.8], // swoop down
  [width * 0.2, height * 0.4], // little loop backing up
  [width * 0.35, height * 0.3], // up and right
  [width * 0.5, height * 0.5], // CENTER (pause here)
  [width * 0.65, height * 0.7], // down and right
  [width * 0.8, height * 0.4], // another backward loop
  [width * 0.75, height * 0.8], // down
  [width * 0.9, height * 0.2], // up
  [width + beeSize, height * 0.5], // end off-screen
];

const pathGenerator = d3.line().curve(d3.curveCatmullRom.alpha(0.5));

const pathString = pathGenerator(points);

// Render the path so the user can see it
const path = svg
  .append("path")
  .attr("d", pathString)
  .attr("fill", "none")
  .attr("stroke", "#ccc")
  .attr("stroke-width", 3)
  .attr("stroke-dasharray", "5,10");

const pathNode = path.node();
const totalLength = pathNode.getTotalLength();
const halfwayLength = totalLength / 2;

// Position the flower where the bee pauses
const landingPoint = pathNode.getPointAtLength(halfwayLength);
const flowerSize = 160;

const flowerGroup = svg
  .append("g")
  .attr("transform", `translate(${landingPoint.x}, ${landingPoint.y})`);

flowerGroup
  .append("image")
  .attr("href", "flor.svg")
  .attr("width", flowerSize)
  .attr("height", flowerSize)
  .attr("x", -flowerSize / 2)
  .attr("y", -flowerSize / 2);

const flowerCenterTransform = (angle = 0) =>
  `translate(${landingPoint.x}, ${landingPoint.y}) rotate(${angle})`;
flowerGroup.attr("transform", flowerCenterTransform());

let flowerAngle = 0;

const approachDuration = 2000;
const departDuration = 2000;
const pauseDuration = 1500;
const loopDelay = 500;
const rotationAngle = 720;

function rotateFlower(deltaAngle, duration, easeFn = d3.easeCubicInOut) {
  const startAngle = flowerAngle;
  const endAngle = startAngle + deltaAngle;

  return flowerGroup
    .transition()
    .duration(duration)
    .ease(easeFn)
    .attrTween("transform", function () {
      return function (t) {
        const angle = startAngle + (endAngle - startAngle) * t;
        return flowerCenterTransform(angle);
      };
    })
    .on("end", () => {
      flowerAngle = endAngle % 360;
      flowerGroup.attr("transform", flowerCenterTransform(flowerAngle));
    });
}

// Add the bee image
const bee = svg
  .append("image")
  .attr("href", "bee.svg")
  .attr("width", beeSize)
  .attr("height", beeSize);

function getHeading(length) {
  const p0 = pathNode.getPointAtLength(Math.max(0, length - 1));
  const p1 = pathNode.getPointAtLength(Math.min(totalLength, length + 1));
  return Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
}

function applyBeeTransform(length) {
  const point = pathNode.getPointAtLength(length);
  const angle = getHeading(length);
  return `translate(${point.x - beeSize / 2}, ${point.y - beeSize / 2}) rotate(${angle}, ${beeSize / 2}, ${beeSize / 2})`;
}

const createTransformTween = (startLength, endLength) =>
  function () {
    return function (t) {
      const currentLength = startLength + (endLength - startLength) * t;
      return applyBeeTransform(currentLength);
    };
  };

function runCycle() {
  const beeSelection = bee.interrupt();
  beeSelection.attr("transform", applyBeeTransform(0));

  rotateFlower(rotationAngle, approachDuration);

  beeSelection
    .transition()
    .duration(approachDuration)
    .ease(d3.easeCubicInOut)
    .attrTween("transform", createTransformTween(0, halfwayLength))
    .on("end", function () {
      d3.timeout(() => {
        rotateFlower(rotationAngle, departDuration);
        d3.select(this)
          .transition()
          .duration(departDuration)
          .ease(d3.easeCubicInOut)
          .attrTween(
            "transform",
            createTransformTween(halfwayLength, totalLength),
          )
          .on("end", () => {
            d3.timeout(runCycle, loopDelay);
          });
      }, pauseDuration);
    });
}

runCycle();
