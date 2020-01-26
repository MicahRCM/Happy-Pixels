const path = require("path")
const { PriorityQueue } = require(path.resolve(__dirname, '../DataStructures/PriorityQueue.js'))

/**
 * @param {Graph} graph
 * @param {GraphVertex} startVertex
 */
let dijkstra = (graph, startVertex) => {
    const distances = {};
    const visitedVertices = {};
    const previousVertices = {};
    const queue = new PriorityQueue();

    // Init all distances with infinity assuming that currently we can't reach
    // any of the vertices except start one.
    // console.log(graph.getAllVertices().length)
    graph.getAllVertices().forEach((vertex) => {
        distances[vertex.getKey()] = Infinity;
        previousVertices[vertex.getKey()] = null;
    });
    distances[startVertex.getKey()] = 0;
    // Init vertices queue.
    queue.add(startVertex, distances[startVertex.getKey()]);
    let i = 0
    while (!queue.isEmpty()) {
        i++
        const currentVertex = queue.poll();
        // console.log(graph.getNeighbors(currentVertex).length == 0)
        //console.log("using node " + currentVertex.getKey() + " neighooring nodes are :", graph.getNeighbors(currentVertex).map(a => { return a.value }))
        graph.getNeighbors(currentVertex).forEach((neighbor) => {
            // Don't visit already visited vertices.
            //*******  the second condition shoule be removed onces paths.js is fixed ********/
            if (!visitedVertices[neighbor.getKey()] && (neighbor.getKey() != currentVertex.getKey())) {
                // Update distances to every neighbor from current vertex.
                const edge = graph.findEdge(currentVertex, neighbor);
                const existingDistanceToNeighbor = distances[neighbor.getKey()];
                const distanceToNeighborFromCurrent = distances[currentVertex.getKey()] + edge.weight;
                //console.log("Distance using Direct || intermediateNode ", existingDistanceToNeighbor, " || ", distanceToNeighborFromCurrent)
                if (distanceToNeighborFromCurrent < existingDistanceToNeighbor) {
                    //console.log("dij found shortest distance between", startVertex.getKey(), "and", neighbor.getKey(), " using the intermediate node as ", currentVertex.getKey())
                    // Change priority.
                    if (queue.hasValue(neighbor)) {
                        queue.changePriority(neighbor, distances[neighbor.getKey()]);
                    }
                    // console.log(Object.keys(distances).length, Object.keys(previousVertices).length)
                    // Remember previous vertex.
                    distances[neighbor.getKey()] = distanceToNeighborFromCurrent;
                    previousVertices[neighbor.getKey()] = currentVertex;
                }

                // Add neighbor to the queue for further visiting.
                if (!queue.hasValue(neighbor)) {
                    queue.add(neighbor, distances[neighbor.getKey()]);
                }
            }
        });

        // Add current vertex to visited ones.
        visitedVertices[currentVertex.getKey()] = currentVertex;
    }
    // console.log("que runs for ", i)
    return [
        distances,
        previousVertices
    ]
}

module.exports = {
    dijkstra: dijkstra
}