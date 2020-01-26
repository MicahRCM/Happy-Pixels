const path = require("path")
const fs = require("fs")
const chalk = require("chalk")

// Amount of distance required for a newely created node to be absorbed/included into/as an older node
const MIN_NODE_GROUPING_THRESHOLD = 0.03

//object of all paths from PathMasterList.json
let allPaths = fs.readFileSync(path.resolve(__dirname, '../../../Database/lib/PathCoordinates/Path text files/PathMasterList.json'))
allPaths = JSON.parse(allPaths)

let nodeNames = fs.readFileSync(path.resolve(__dirname, '../../../Database/lib/PathCoordinates/nodeNames.json'))
nodeNames = JSON.parse(nodeNames)

let oldNodesMap = fs.readFileSync(path.resolve(__dirname, '../../../Database/lib/PathCoordinates/nodeMap.json'))
oldNodesMap = JSON.parse(oldNodesMap)

let allKeys = Object.keys(allPaths)

// Shorthand sugar for EZ algebraic interpretation
let x = 0
let y = 1

let previousPathInfo = {}

let nodesArray = []
let edgesArray = []
let labelsFound = 0

Array.prototype.equals = function(array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        } else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });

// Call this function in order to map all node intersections. Necessary after any new path is made.
function sortPathInit() {
    loadPreviousInfo()
    initNodesAndEdges()
    // selfIntersectingNodes()
    iteratePaths()
    breakDownEdges()
    let data = {
        "nodes": nodesArray,
        "edges": edgesArray
    }
    let err = recheckNodeNames()
    // if (err) {
    //     throw new Error("Losing node names !")
    // }
    // console.log("nodeArrays => ",nodesArray.slice(0,5))
    fs.writeFileSync(path.resolve(__dirname, '../../../Database/lib/PathCoordinates/nodeMap.json'), JSON.stringify(data))
    data = {
        "nodes": nodesArray,
        "edges": edgesArray.map((edge) => {
            edge["pathLength"] = edge["path"].length
            delete edge["path"]
            return edge
        })
    }
    fs.writeFileSync(path.resolve(__dirname, '../../../Database/lib/PathCoordinates/nodeNames.json'), JSON.stringify(data.nodes))
    fs.writeFileSync(path.resolve(__dirname, '../../../Database/lib/PathCoordinates/MetaData-nodeMap.json'), JSON.stringify(data))
    console.log(chalk.bgBlue("Number Of nodes "), chalk.blue(nodesArray.length))
    console.log(chalk.bgBlue("Number Of edges "), chalk.blue(edgesArray.length))
    console.log(chalk.bgBlue("Number of labels found : "), labelsFound, chalk.bgBlue("Number of items in nodeName found : "), nodeNames.length)
    console.log('Path sorting and naming complete.')
}

let loadPreviousInfo = () => {
    previousPathInfo["staticName"] = new Set(nodeNames.map((nodeNames) => nodeNames.name))
    previousPathInfo["NumberOfNodes"] = oldNodesMap.nodes.length
    previousPathInfo["NumberOfEdge"] = oldNodesMap.edges.length
}

/**
 * @description makes starting node and ending node for each path in PathMastlist.json File and creates an edge between them
 */
let initNodesAndEdges = () => {
    for (let pathName in allPaths) {
        let path = allPaths[pathName]
        // make start Node
        let node1 = makeNewNode(path[0][0], path[0][1], "StartPath_Node", path[0][3])
        // make End Node
        let node2 = makeNewNode(path[path.length - 1][0], path[path.length - 1][1], "EndPath_Node", path[path.length - 1][3])
        makeNewEdge(path, node1, node2, pathName, path[0][3])
    }
}


let recheckNodeNames = () => {
    let err = false
    let getNodewithNameXY = (x, y, name) => {
        if (!name) {
            return true
        }
        for (let j = 0; j < nodesArray.length; j++) {
            if (nodesArray[j].xInt == x && nodesArray[j].yInt == y && name == nodeNames[j].name) {
                return nodesArray[j]
            }
        }
        return false
    }
    let getNodewithTagXY = (x, y, tag) => {
        if (tag.length == 0) {
            return true
        }
        for (let j = 0; j < nodesArray.length; j++) {
            if (nodesArray[j].xInt == x && nodesArray[j].yInt == y && nodesArray[j].tags.equals(tag)) {
                return nodesArray[j]
            }
        }
        return false
    }
    // figureout names
    for (let i = 0; i < nodeNames.length; i++) {
        let node = getNodewithNameXY(nodeNames[i].xInt, nodeNames[i].yInt, nodeNames[i].name)
        if (!node) {
            err = true
            console.log(chalk.bgRed("Couldn't find nodeNames :=> name :"), chalk.bgCyan(nodeNames[i].name), nodeNames[i])
        }
    }
    for (let i = 0; i < nodeNames.length; i++) {
        let node = getNodewithTagXY(nodeNames[i].xInt, nodeNames[i].yInt, nodeNames[i].tags)
        if (!node) {
            err = true
            console.log(chalk.bgRed("Couldn't find tags :=>"), nodeNames[i])
        }
    }
    return err
    // console.log("completed")
}


/**
 * @description reads all the existing paths from the all and tries to divide the edge based on the current nodes that exist
 */
let breakDownEdges = () => {
    let getNodeBool = (xCoord, yCoord, zone) => {
        for (let i = 0; i < nodesArray.length; i++) {
            // Groups node into an old node if in range of the node by MIN_NODE_GROUPING THRESHOLD
            let xyDist = Math.sqrt(Math.pow(nodesArray[i].xInt - xCoord, 2) + Math.pow(nodesArray[i].yInt - yCoord, 2))
            // console.log("xCoord", xCoordCheck, "yCoord", yCoordCheck)
            if (xyDist < MIN_NODE_GROUPING_THRESHOLD && (zone == nodesArray.zone)) {
                return nodesArray[i].nodeName
            }
        }
        // If not within range, generates a new node and names the new node successively
        return false
    }
    let findNearestNode = (x, y, zone) => {
        let nearestNode = null
        let shortestDistance = Infinity
        nodesArray.forEach(Node => {
            if (Node.zone == zone) {
                let distance = Math.sqrt(Math.pow(Node.xInt - x, 2) + Math.pow(Node.yInt - y, 2))
                if (distance < shortestDistance) {
                    shortestDistance = distance
                    nearestNode = Node.nodeName
                }
            }
        })
        return nearestNode
    }

    let path1lastSlice = 0
    let needToDelete = false
    let lastNodeCreated
    for (let i = 0; i < edgesArray.length; i++) {
        needToDelete = false
        let path = edgesArray[i].path
        // start node
        lastNodeCreated = findNearestNode(path[0][0], path[0][1], path[0][3]) // replace with findNearestNode function to get node value
        if (lastNodeCreated===false) {
            console.log(nodesArray.filter((node) => node.nodeName == lastNodeCreated))
            console.log(chalk.bgRed("BOKEN(START POINT OF THE EDGE ISN'T A NODE) : Edge => "), edgesArray[i])
            process.exit(0)
        }
        let startNode = lastNodeCreated
        let endNode = edgesArray[i].endNode
        if(endNode===false){ 
            console.log(endNode)
            console.log(edgesArray[i])
            console.log("nearestNode ",findNearestNode(path[path.length - 1][0], path[path.length - 1][1],path[path.length - 1][3]))
            process.exit(0)
        }
        for (let j = 0; j < path.length; j++) {
            let point = path[j]
            let node = getNodeBool(point[0], point[1], point[3])
            if (node && node != startNode && node != endNode && node != lastNodeCreated) {
                // console.log("new Intermediate node found ", lastNodeCreated, node)

                needToDelete = true
                makeNewEdge(path.slice(path1lastSlice, j), lastNodeCreated, node, `breakDownEdge`, point[3])
                path1lastSlice = j
                lastNodeCreated = node
            }
        }
        if (needToDelete) {
            makeNewEdge(path.slice(path1lastSlice, path.length), lastNodeCreated, endNode, `breakDownEdgeEnding`, path[path1lastSlice][3])
            edgesArray.splice(i, 1) // remove that edge
        }
    }
}


/**
 * @description finds intersecting nodes between 2 lines and makes nodes and edges between the same
 * @param {Number} path1
 * @param {Number} path2
 * @param {String} path1Name
 * @param {String} path2Name
 *
 * iterate and compare all "linesegments" in 2 lines:
 *      if ( No intersecting nodes have been created for the 2 lines):
 *          create an Edge between startNode of path1 and NEWnode
 *          create an Edge between startNode of path2 and NEWnode
 *      else
 *          create an Edge between lastIntersectingNode and NEWnode <= path for this is from path1
 *          create an Edge between lastIntersectingNode and NEWnode <= path for this is from path2
 * # once iteration completes one final check of whether intersecting nodes were created or not
 * # if nodes were created then we need to make 2 more new edges to complete the path and connect all the nodes
 * if( intersecting nodes have been created ):
 *      create an Edge between EndNode of path1 and lastIntersectingNode <= path for this is from path1
 *      create an Edge between EndNode of path2 and lastIntersectingNode <= path for this is from path2
 */
let comparePaths = (path1, path2, path1Name, path2Name) => {
    let path1lastSlice = 0
    let path2lastSlice = 0
    let lastNodeCreated = 0
    for (let i = 0; i < path1.length - 1; i++) {
        for (let j = 0; j < path2.length - 1; j++) {
            // check if same zone
            if (path1[i][3] === path2[j][3] && path1[i + 1] && path2[j + 1] && path1[i + 1][3] == path2[j + 1][3]) {
                // find intersection between line segments
                let intersectionObject = intersectionExists(path1[i][0], path1[i][1], path1[i + 1][0], path1[i + 1][1], path2[j][0], path2[j][1], path2[j + 1][0], path2[j + 1][1])
                if (intersectionObject) {
                    let newIntersectionNode = makeNewNode(intersectionObject.xInt, intersectionObject.yInt, "Intersection", path2[j][3])
                    if (path1lastSlice == 0 && path2lastSlice == 0) {
                        lastNodeCreated = newIntersectionNode
                        // create an Edge between startNode of path1 and NEWnode
                        let StartnodeNumber = getNode(path1[0][0], path1[0][1])
                        let newPath1 = path1.slice(0, i)
                        path1lastSlice = i
                        makeNewEdge(newPath1, StartnodeNumber, newIntersectionNode, path1Name, path1[0][3])
                        // create an Edge between startNode of path2 and NEWnode
                        StartnodeNumber = getNode(path2[0][0], path2[0][1])
                        let newPath2 = path2.slice(0, j)
                        path2lastSlice = j
                        makeNewEdge(newPath2, StartnodeNumber, newIntersectionNode, path2Name, path2[0][3])
                    } else {
                        // create an Edge between lastIntersectingNode and NEWnode <= path for this is from path1
                        let newPath1 = path1.slice(path1lastSlice, i)
                        makeNewEdge(newPath1, lastNodeCreated, newIntersectionNode, path1Name, path1[i][3])
                        // create an Edge between lastIntersectingNode and NEWnode <= path for this is from path2
                        let newPath2 = path2.slice(path2lastSlice, j)
                        makeNewEdge(newPath2, lastNodeCreated, newIntersectionNode, path2Name, path2[j][3])
                        lastNodeCreated = newIntersectionNode
                        path1lastSlice = i
                        path2lastSlice = j
                    }
                }

            }
        }
    }
    // intersection were found in the paths
    if (path1lastSlice != 0 && path2lastSlice != 0) {
        // create an Edge between EndNode of path1 and lastIntersectingNode <= path for this is from path1
        let newPath1 = path1.slice(path1lastSlice)
        let lastPoint = path1[path1.length - 1]
        makeNewEdge(newPath1, lastNodeCreated, getNode(lastPoint[0], lastPoint[1]), path1Name, lastPoint[3])
        // create an Edge between EndNode of path2 and lastIntersectingNode <= path for this is from path2
        let newPath2 = path2.slice(path2lastSlice)
        lastPoint = path2[path2.length - 1]
        makeNewEdge(newPath2, lastNodeCreated, getNode(lastPoint[0], lastPoint[1]), path1Name, lastPoint[3])
    }
}

/**
 * @description start function to iterate throught all the paths and find intersections
 */
let iteratePaths = () => {
    // compare every item of array to every other item in that array ONLY ONCE
    for (let i = 0; i < allKeys.length; i++) {
        let path1 = allPaths[allKeys[i]]
        for (let j = i + 1; j < allKeys.length; j++) {
            let path2 = allPaths[allKeys[j]]
            // Checks that zone is the same of two paths before computing
            if (path1[0][3] === path2[0][3]) {
                comparePaths(path1, path2, allKeys[i], allKeys[j])    
            }
        }
    }
}

/**
 * @description iterates through all the points and finds the distance between the start and end point
 * @param {[ [x,y,direct,zone] , [x,y,direct,zone] ,[x,y,direct,zone] ...... ]} line
 */
let getDistance = (path) => {
    let distance = 0
    for (let i = 0; i < path.length - 1; i++) {
        // Finds distance in one individual line segment using point-distance formula
        let xyDistSum = Math.sqrt(Math.pow(path[i + 1][0] - path[i][0], 2) + Math.pow(path[i + 1][1] - path[i][1], 2))
        // If a line segment starts and ends in different zones, sets that segment value to zero in order to reduce error due to different node coordinates
        if (path[i + 1][3] !== path[i][3]) {
            xyDistSum = 0
        }
        distance = xyDistSum + distance
    }
    return distance
}

/**
 * @description creates a new node if it doesnt exist
 * @param {Number} xCoord
 * @param {Number} yCoord
 * @param {String} createdReason
 * @param {String} zone
 */
let makeNewNode = (xCoord, yCoord, createdReason, zone) => {
    let nodeNumber = getNode(xCoord, yCoord)
    if (!checkIfNodeExists(nodeNumber)) {
        let nameInfo = findLabel_Tag(xCoord, yCoord, zone)
        let nodeInfo = {
            "xInt": xCoord,
            "yInt": yCoord,
            "nodeName": nodeNumber,
            "createdReason": createdReason,
            "zone": zone,
        }
        Object.keys(nameInfo).forEach(key => {
            nodeInfo[key] = nameInfo[key]
        })
        nodesArray.push(nodeInfo)
    }
    return nodeNumber
}

/**
 * @description find the name of node if  xcoord and ycoord in nodeNames
 * @param {Number} xCoord
 * @param {Number} yCoord
 * @param {String} yCoord
 */
let findLabel_Tag = (xCoord, yCoord, zone) => {
    let temp = {}
    temp["tags"] = []
    temp["name"] = ""
    let i
    for (i = 0; i < nodeNames.length; i++) {
        NameMetaData = nodeNames[i]
        if (NameMetaData.zone == zone && NameMetaData.xInt == xCoord && NameMetaData.yInt == yCoord) {
            labelsFound++
            let temp = {}
            temp["tags"] = NameMetaData.tags.length != 0 ? NameMetaData.tags : []
            temp["name"] = NameMetaData.name ? NameMetaData.name : ""
            return temp
        }
    }
    if (i == nodeNames.length) {
        console.log(chalk.bgRed("COULD NOT ASSIGN NODE NAME TO NODE WITH COORDINATES EITHER NEW NODE OR LOSING DATA"), xCoord, yCoord)
    }
    return temp
}

/**
 * @description creates a new Edge
 * @param {[ [x,y,direct,zone] , [x,y,direct,zone] ,[x,y,direct,zone] ..........]} path
 * @param {Number} startNode starting node number of the Edge
 * @param {String} endNode ending node number of the edge
 * @param {String} pathName path name
 * @param {String} zone zone of that edge
 */
let makeNewEdge = (path, startNode, endNode, pathName, zone) => {
    let weight = getDistance(path);
    // check if weight is not 0 , and its not a self edge example: startNode and
    if (weight != 0 && startNode != endNode) {
        let index
        // get all the edges that exist with the same specification as the one we need to create
        let listofsameEdges = edgesArray.filter((edge, i) => {
            let keyEdge1 = `${edge.startNode}_${edge.endNode}`;
            let keyEdge2 = `${edge.endNode}_${edge.startNode}`;
            let check = `${startNode}_${endNode}` == keyEdge1 || `${startNode}_${endNode}` == keyEdge2;
            check ? index = i : false
            return check
        })

        let pushtoEdgeArray = () => {
            edgesArray.push({
                "PartOfpath": pathName,
                "path": path,
                "startNode": startNode,
                "endNode": endNode,
                "zone": zone,
                "weight": weight
            })
        }
        // if there is more then 1 edge it would mean that there is already redundant edges remove (remove later)
        if (listofsameEdges.length > 1) {
            console.error("make edge found 2 edge of the same type")
        }
        // if there no other edge then directly create one
        if (listofsameEdges.length == 0) {
            pushtoEdgeArray()
        } else {
            // check if the existing edge's wieght is greater then the current edges weigh helps us pick the shortest path between 2 edges
            if (listofsameEdges[0].weight > weight) {
                // remove that particular value
                edgesArray.splice(index, 1)
                pushtoEdgeArray()
            }
        }
    }
}

/**
 * @description return either a new Node name or a node name of a node that has a node at (xCoord,yCoord)
 * @param {Number} xCoord
 * @param {Number} yCoord
 * @returns {Number} name of the NEW/OLD existing node
 */
let getNode = (xCoord, yCoord) => {
    for (let i = 0; i < nodesArray.length; i++) {
        // Groups node into an old node if in range of the node by MIN_NODE_GROUPING THRESHOLD
        let xyDist = Math.sqrt(Math.pow(nodesArray[i].xInt - xCoord, 2) + Math.pow(nodesArray[i].yInt - yCoord, 2))
        // console.log("xCoord", xCoordCheck, "yCoord", yCoordCheck)
        if (xyDist < MIN_NODE_GROUPING_THRESHOLD) {
            return nodesArray[i].nodeName
        }
    }
    // If not within range, generates a new node and names the new node successively
    return nodesArray.length
}

let checkIfNodeExists = (nodeNumber) => nodesArray.map(node => node.nodeName).includes(nodeNumber)

// Use to find the angles (theta) of two intersecting lines.
let intersectingAngleCalculator = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    // Formats both lines into slope intercept form
    let m1 = (y2 - y1) / (x2 - x1)
    let b1 = -(m1 * x1) + y1
    let m2 = (y4 - y3) / (x4 - x3)
    let b2 = -(m2 * x3) + y3
    // The value we will plug into each y = mx + b equation to find the angle
    let xA = (180 - (b2 + b1)) / (m2 + m1)
    // Calculates the two congruent angles by plugging xA into x.
    let thetaA = ((m1 * xA) + b1)
    let thetaB = ((m2 * xA) + b2)
    // Converts angles into degrees ranging from 0 to 180.
    thetaA = thetaA - (Math.floor(thetaA / 180) * 180)
    thetaB = thetaB - (Math.floor(thetaB / 180) * 180)
    // if (Math.abs(thetaA - thetaB) <= 150 && Math.abs(thetaA - thetaB) >= 30) {
    // console.log(Math.abs(thetaA - thetaB))
    return true
    // } else {
    // return false
    // }
}

// Checks if there is an intersection between two line segments
let intersectionExists = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    let a1, a2, b1, b2, c1, c2
    let r1, r2, r3, r4
    let denom, offset, num
    // Compute a1, b1, c1, where line joining points 1 and 2
    // is "a1 x + b1 y + c1 = 0".
    a1 = y2 - y1
    b1 = x1 - x2
    c1 = (x2 * y1) - (x1 * y2)
    // Compute r3 and r4.
    r3 = ((a1 * x3) + (b1 * y3) + c1)
    r4 = ((a1 * x4) + (b1 * y4) + c1)
    // Check signs of r3 and r4. If both point 3 and point 4 lie on
    // same side of line 1, the line segments do not intersect.
    if ((r3 !== 0) && (r4 !== 0) && sameSign(r3, r4)) {
        return false // return that they do not intersect
    }
    // Compute a2, b2, c2
    a2 = y4 - y3
    b2 = x3 - x4
    c2 = (x4 * y3) - (x3 * y4)
    // Compute r1 and r2
    r1 = (a2 * x1) + (b2 * y1) + c2
    r2 = (a2 * x2) + (b2 * y2) + c2
    // Check signs of r1 and r2. If both point 1 and point 2 lie
    // on same side of second line segment, the line segments do
    // not intersect.
    if ((r1 !== 0) && (r2 !== 0) && (sameSign(r1, r2))) {
        return false // return that they do not intersect
    }
    // Line segments intersect: compute intersection point.
    denom = (a1 * b2) - (a2 * b1)
    // co-linear! ... include?
    if (denom === 0) {
        return findIntersection(x1, y1, x2, y2, x3, y3, x4, y4)
    }
    // lines intersect
    return findIntersection(x1, y1, x2, y2, x3, y3, x4, y4)
}

/**
 * @description creates nodes when s intersect themself , threshold for creating a node is based on the angle
 */
let selfIntersectingNodes = () => {
    for (let pathName in allPaths) {
        let path = allPaths[pathName]
        let lastSliced = 0
        let lastNodeCreated = 0
        for (let i = 0; i < path.length - 1; i++) {
            // start iterating from i+2 as we dont dont want to catch multiple instances of the same intersection
            for (let j = i + 2; j < path.length - 1; j++) {
                // first check is intersection exists
                let intersectionObject = intersectionExists(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], path[j][0], path[j][1], path[j + 1][0], path[j + 1][1])
                if (intersectionObject) {
                    // then check angle threshold
                    if (intersectingAngleCalculator(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], path[j][0], path[j][1], path[j + 1][0], path[j + 1][1])) {
                        // make a new Node
                        let newIntersectionNode = makeNewNode(intersectionObject.xInt, intersectionObject.yInt, "Intersection_Self", path[j][3])
                        // if this node is the first node found then slice from (0,i) and make an edge from the start of path to the intesecting node
                        // else create an edge from the last node created in this path to the newIntersection found
                        if (lastSliced == 0) {
                            let StartnodeNumber = getNode(path[0][0], path[0][1])
                            let newPath1 = path.slice(0, i)
                            makeNewEdge(newPath1, StartnodeNumber, newIntersectionNode, pathName, path[0][3])
                            lastNodeCreated = newIntersectionNode
                            lastSliced = i
                        } else {
                            let newPath1 = path.slice(lastSliced, i)
                            makeNewEdge(newPath1, lastNodeCreated, newIntersectionNode, pathName, path[i][3])
                            lastNodeCreated = newIntersectionNode
                            lastSliced = i
                        }
                    }
                }
            }
        }
        // if an intersection was found then there has to be another ending edge that needs to be created
        if (lastSliced != 0) {
            let newPath1 = path.slice(lastSliced)
            let lastPoint = path[path.length - 1]
            makeNewEdge(newPath1, lastNodeCreated, getNode(lastPoint[0], lastPoint[1]), pathName, lastPoint[3])
        }
    }
}

// Calculates slope-intercept form
let findIntersection = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    let m1 = (y2 - y1) / (x2 - x1)
    let b1 = -(m1 * x1) + y1
    let m2 = (y4 - y3) / (x4 - x3)
    let b2 = -(m2 * x3) + y3
    return calculateIntersection(m1, b1, m2, b2)
}

// Finds the intersection by plugging slopes and y-intercept into y = mx + b
let calculateIntersection = (m1, b1, m2, b2) => {
    let xInt = (b2 - b1) / (m1 - m2)
    let yInt = (m1 * xInt) + b1
    // +_+
    // !xInt || !yInt ? console.log("null Values ComingUp", m1, b1, m2, b2 , "values", xInt,yInt) : false
    if (!xInt || !yInt) {
        return false
    } else {
        return { "xInt": xInt, "yInt": yInt }
    }
}

const sameSign = (a, b) => (a * b) > 0

//Run this function to initialize and sort all the paths from pathMasterList.json and create new nodes and edges
sortPathInit()