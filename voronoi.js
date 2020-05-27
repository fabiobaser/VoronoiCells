const canvasSketch = require("canvas-sketch")
const {
  renderPaths,
  createPath,
  pathsToPolylines,
} = require("canvas-sketch-util/penplot")
const { clipPolylinesToBox, getBounds } = require("canvas-sketch-util/geometry")
const random = require("canvas-sketch-util/random")
const _ = require("lodash")

import Voronoi from "./rhill-voronoi-core.min.js"

// You can force a specific seed by replacing this with a string value
const defaultSeed = ""

// Set a random seed so we can reproduce this print later
random.setSeed(defaultSeed || random.getRandomSeed())

// Print to console so we can see which seed is being used and copy it if desired
console.log("Random Seed:", random.getSeed())

const settings = {
  suffix: random.getSeed(),
  dimensions: "A4",
  orientation: "portrait",
  pixelsPerInch: 300,
  scaleToView: true,
  units: "cm",
}

const sketch = ({ width, height, units }) => {
  const DRAW_POINTS = false
  const DRAW_EDGES = true
  const DRAW_RANDOMCELLS = true
  const DRAW_BOUNDS = false
  const DRAW_BOUNDSCENTER = false

  const centerX = width / 2
  const centerY = height / 2

  const everyNCell = random.rangeFloor(2, 6)
  const scaleCount = 4

  const paths = []
  const points = genPoints(100, { minX: 0, maxX: width, minY: 0, maxY: height })

  DRAW_POINTS &&
    points.forEach((point) => {
      paths.push(
        createPath((context) => {
          context.arc(point.x, point.y, 0.01, 0, Math.PI * 2)
        })
      )
    })

  const vor = new Voronoi()
  var bbox = { xl: 0, xr: width, yt: 0, yb: height } // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
  var sites = [
    { x: 200, y: 200 },
    { x: 50, y: 250 },
    { x: 400, y: 100 },
  ]

  var diagram = vor.compute(points, bbox)

  diagram.cells.forEach((cell, cellIndex) => {
    const { halfedges } = cell

    console.groupCollapsed("Cell")

    const verts = getCellVertices(halfedges)
    console.log(verts)

    const cellBounds = getBounds(verts)

    const [tl, br] = cellBounds
    const cellBoundsWidth = br[0] - tl[0]
    const cellBoundsHeight = br[1] - tl[1]

    console.log("Bounds-Width: ", cellBoundsWidth)
    console.log("Bounds-Height: ", cellBoundsHeight)

    const center = {
      x: cellBoundsWidth / 2,
      y: cellBoundsHeight / 2,
    }

    console.log("Bounds-Center: ", center)

    DRAW_BOUNDS &&
      paths.push(
        createPath((context) => {
          context.moveTo(...tl)
          context.lineTo(br[0], tl[1])
          context.lineTo(...br)
          context.lineTo(tl[0], br[1])
          context.lineTo(...tl)
        })
      )

    DRAW_BOUNDSCENTER &&
      paths.push(
        createPath((context) => {
          context.arc(tl[0] + center.x, tl[1] + center.y, 0.01, 0, Math.PI * 2)
        })
      )

    if (cellIndex % everyNCell === 0) {
      const scaleMult = 1 / scaleCount
      for (let i = 0; i < scaleCount; i++) {
        paths.push(
          createPath((context) => {
            halfedges.forEach((edge, edgeIndex) => {
              const { va, vb } = edge.edge

              const dX = tl[0] + cellBoundsWidth / 2
              const dY = br[1] - cellBoundsHeight / 2

              const a = {
                x: (va.x - dX) * (scaleMult * i),
                y: (va.y - dY) * (scaleMult * i),
              }

              const b = {
                x: (vb.x - dX) * (scaleMult * i),
                y: (vb.y - dY) * (scaleMult * i),
              }

              context.moveTo(_.round(a.x + dX, 3), _.round(a.y + dY, 3))
              context.lineTo(_.round(b.x + dX, 3), _.round(b.y + dY, 3))
            })
          })
        )
      }
    }

    paths.push(
      createPath((context) => {
        halfedges.forEach((edge, edgeIndex) => {
          const { va, vb } = edge.edge

          const a = {
            x: _.round(va.x, 3),
            y: _.round(va.y, 3),
          }

          const b = {
            x: _.round(vb.x, 3),
            y: _.round(vb.y, 3),
          }

          context.moveTo(a.x, a.y)
          context.lineTo(b.x, b.y)
        })
      })
    )

    console.groupEnd()
  })

  DRAW_EDGES &&
    diagram.edges.forEach((edge) => {
      const { va, vb } = edge

      const edgePath = createPath((context) => {
        context.moveTo(va.x, va.y)
        context.lineTo(vb.x, vb.y)
      })
    })

  let lines = pathsToPolylines(paths, { units })

  const margin = 1 // in working 'units' based on settings
  const box = [margin, margin, width - margin, height - margin]
  lines = clipPolylinesToBox(lines, box)

  return (props) =>
    renderPaths(lines, {
      ...props,
      lineJoin: "round",
      lineCap: "round",
      lineWidth: 0.03,
      optimize: true,
    })
}

function getCellVertices(edges) {
  const vertices = []
  edges.forEach((edge, edgeIndex) => {
    const { va, vb } = edge.edge

    const a = [_.round(va.x, 3), _.round(va.y, 3)]
    const b = [_.round(vb.x, 3), _.round(vb.y, 3)]

    vertices.push(a)
    vertices.push(b)
  })
  return vertices
}

function genPoints(count, options) {
  const { minX, maxX, minY, maxY } = options
  const points = []

  for (let i = 0; i < count; i++) {
    const randX = random.range(minX, maxX)
    const randY = random.range(minY, maxY)

    points.push({ x: randX, y: randY })
  }

  return points
}

canvasSketch(sketch, settings)
