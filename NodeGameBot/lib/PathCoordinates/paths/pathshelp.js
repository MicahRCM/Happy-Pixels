const path = require("path")
const data = require(path.resolve(__dirname, '../../../Engine/data.js'))
const roam = require(path.resolve(__dirname, '../../../Engine/roamer.js'))
const chalk = require("chalk")
const fs = require("fs")
const { worldGraph, getNavigatepath } = require("../../worldNavigation")

// Amount of distance required for a point to be considered close enough to walk to
const NEAREST_POINT_THRESHOLD = 1.5

let nodeNames = fs.readFileSync(path.resolve(__dirname, '../../../../Database/lib/PathCoordinates/nodeNames.json'))
nodeNames = JSON.parse(nodeNames)

let allPaths = fs.readFileSync(path.resolve(__dirname, '../../../../Database/lib/PathCoordinates/Path text files/PathMasterList.json'))
allPaths = JSON.parse(allPaths)

let pathName

//list of all hearthZones as listed in the DataToColor.lua
let hearthZones = ["CENARION HOLD", "VALLEY OF TRIALS", "THE CROSSROADS", "RAZOR HILL", "DUROTAR", "ORGRIMMAR", "CAMP TAURAJO", "FREEWIND POST", "GADGETZAN", "SHADOWPREY VILLAGE", "THUNDER BLUFF", "UNDERCITY", "CAMP MOJACHE", "DUN MOROGH", "COLDRIDGE VALLEY", "THUNDERBREW DISTILLERY", "IRONFORGE", "STOUTLAGER INN", "STORMWIND CITY", "SOUTHSHORE", "LAKESHIRE", "STONETALON PEAK", "GOLDSHIRE", "SENTINEL HILL", "DEEPWATER TAVERN", "THERAMORE ISLE", "DOLANAAR", "ASTRANAAR", "NIJEL'S POINT", "CRAFTSMEN'S TERRACE", "AUBERDINE", "FEATHERMOON STRONGHOLD", "BOOTY BAY", "WILDHAMMER KEEP", "DARKSHIRE", "EVERLOOK", "RATCHET", "LIGHT'S HOPE CHAPEL"]

/**
 * @description adds extra functionality to make
 * @param {string} pathName
 * @param {Boolean} reversePath
 * @param {Boolean} fullPath
 */

let assignPath = (pathname, reversePath, fullPath = false) => {
    pathName = pathname
    let indexStart = 1
    let recordedPath = allPaths[pathname]
    // Run path backwards if true
    if (reversePath) {
        recordedPath.reverse()
    }
    // Run the full path without computing the nearest point first if fullPath == true
    if (!fullPath) {
        indexStart = findNearestPoint(recordedPath)
    }
    roam.assignPath(recordedPath, indexStart)
}

// Used for finding nearest point in a path. Especially good for if it possible we might start in the middle of a path.
// Returns the index of the path passed in.
let findNearestPoint = (comparisonPath) => {
    // Sets our comparison distance to ∞
    let shortestDistance = Infinity
    // Default index is 0 because it is the start of the path.
    let index = 0
    let distance = Infinity
    // First checks the first half the path. This done for paths that are loops so that the player doesn't end up finding an end point of the path first.
    for (let i = 0; i < comparisonPath.length / 2; i++) {
        // Point-distance formula
        let xDistSq = Math.pow(data.info.xcoord - comparisonPath[i][0], 2)
        let yDistSq = Math.pow(data.info.ycoord - comparisonPath[i][1], 2)
        distance = Math.sqrt(xDistSq + yDistSq)
        if (distance < shortestDistance) {
            shortestDistance = distance
            index = i
        }
    }
    // If we don't find a close enough point in the first half of the path, compare the entire path
    if (shortestDistance > NEAREST_POINT_THRESHOLD) {
        console.log("Start Point too far : going to a point in the last half of path")
        shortestDistance = Infinity
        for (let i = 0; i < comparisonPath.length; i++) {
            let xDistSq = Math.pow(data.info.xcoord - comparisonPath[i][0], 2)
            let yDistSq = Math.pow(data.info.ycoord - comparisonPath[i][1], 2)
            distance = Math.sqrt(xDistSq + yDistSq) + distance
            if (distance < shortestDistance) {
                shortestDistance = distance
                index = i
            }
        }
    }
    // Returns the index of the point on the path to start on
    return index
}

let getXYcoordinates = (nodeName) => {
    let coord = []
    nodeNames.forEach((node) => {
        if (node.name == nodeName) {
            coord[0] = node.xInt
            coord[1] = node.yInt
        }
    })
    return coord
}

let getInnkeeperNode = (zoneNo) => {
    let Node = null
    let zoneString = hearthZones[zoneNo - 1]
    let vertices = worldGraph.getAllVertices()
    vertices.forEach((node) => {
        if (node.tags.includes(zoneString)) {
            Node = node
        }
    })
    //console.log("found Innkeeper : ",Node)
    return Node
}

let returnPreviousPathName = () => {
    return pathName
}

let returnClosestNode = (tag) => {
    let shortestDistance = 100
    let Node = null
    let pathFromCurrent
    let vertices = worldGraph.getAllVertices()
    vertices.filter(node => node.zone == data.info.zone && node.tags.includes(tag)).forEach((node)=>{
        pathFromCurrent = getNavigatepath(null, node);
        let pathDistance = roam.pathDistance(pathFromCurrent)
        // console.log("Path distance to ", node.label, " is ", pathDistance)
        if (pathDistance < shortestDistance) {
            shortestDistance = pathDistance
            Node = node.label
        }
    })
    return Node
}


module.exports = {
    assignPath: assignPath,
    findNearestPoint: findNearestPoint,
    getXYcoordinates: getXYcoordinates,
    getInnkeeperNode: getInnkeeperNode,
    returnPreviousPathName: returnPreviousPathName,
    returnClosestNode: returnClosestNode
}