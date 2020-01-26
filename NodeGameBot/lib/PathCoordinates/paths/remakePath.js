const path = require('path')
const paths = require('./pathshelp')
const chalk = require('chalk')
const fs = require('fs')
const roam = require('../../../Engine/roamer.js')

// IDEAL DISTANCE PLACEHOLDER: 0.00683241748363937
const IDEAL_DISTANCE_2POINTS = 0.00683241748363937


let allPaths = fs.readFileSync(path.resolve(__dirname, '../../../../Database/lib/PathCoordinates/Path text files/PathMasterList.json'))
allPaths = JSON.parse(allPaths)

/**
 * @description calculates displacement
 * @param {number} x
 * @param {number} y
 * @param {number} x1
 * @param {number} y1
 * @returns distance
 */
Math.pointDistance = (x1, y1, x2, y2) => {
    let xDistSq = Math.pow(x2 - x1, 2)
    let yDistSq = Math.pow(y2 - y1, 2)
    return Math.sqrt(xDistSq + yDistSq)
}

/**
 * @description finds average path
 * @param {string} pathName
 * @returns a average
 */
let findDistance = (pathName) => {
    let path = allPaths[pathName]
    let averageDistance = []
    let Average = 0;
    for (let i = 0; i < path.length - 1; i++) {
        let pd = Math.pointDistance(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])
        if (pd != 0) {
            averageDistance.push(pd)
            Average = findMean(averageDistance)
        }
        console.log(chalk.bgCyan.blue("pointDistance"), chalk.bgCyan(pd), chalk.bgCyan.blue("Average: "), chalk.bgCyan(Average))
    }
    return Average
}

/**
 * @description finds average distance in the path for each point
 * @param {string} pathName
 * @returns [ x , y , slope ]
 */
let testPath = (pathName) => {
    let distanceOfCurrentPath = findDistance(pathName)
    let difference = distanceOfCurrentPath - IDEAL_DISTANCE_2POINTS
    console.log(chalk.bgCyan("Difference between ideal and average of current path :"), difference, (difference / IDEAL_DISTANCE_2POINTS) * 100, "% more then distance then ideal walking path") // difference between Ideal and current
}

/**
 * @description return x,y and slope for 2 points
 * @param {number} x
 * @param {number} y
 * @param {number} x1
 * @param {number} y1
 * @returns [ x , y , slope ]
 */
let calculateFurtherPoint = (x, y, x1, y1) => {
    let angle = Math.atan2(y1 - y, x1 - x)
    return [x + IDEAL_DISTANCE_2POINTS * Math.cos(angle), y + IDEAL_DISTANCE_2POINTS * Math.sin(angle), angle]
}

/**
 * @description write the new Path to pathmasterList
 * @param {string} pathName
 */
let remakePathTest = (pathName) => {
    let path121 = allPaths[pathName]
    let previousLenth = path121.length
    // process.exit(0)
    path121 = remakePath(path121)
    allPaths[pathName] = path121
    console.log("current length of path : ", allPaths[pathName].length, " previous", previousLenth)
    fs.writeFileSync(path.resolve(__dirname, '../../../../Database/lib/PathCoordinates/Path text files/PathMasterList.json'), JSON.stringify(allPaths, null, 4))
}

/**
 * @description remakes the path
 * makes this by either adding a new point or moveing the current point back
 * @param {Array<number>} arr
 * @returns {Array<point>}
 */
let remakePath = (path) => {
    for (let i = 0; i < path.length - 1; i++) {
        if (path[i][3] == path[i + 1][3]) {
            let nextPointDistnace = Math.pointDistance(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])
            if (nextPointDistnace > 2 * IDEAL_DISTANCE_2POINTS) {
                let direction = findMean([path[i][2], path[i + 1][2]])
                let toMoveCoordinates = calculateFurtherPoint(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])
                let newPoint = [toMoveCoordinates[0], toMoveCoordinates[1], toMoveCoordinates[2], path[i + 1][3]]
                path.splice(i + 1, 0, newPoint)
                console.log("new point => " + i, chalk.bgCyan(newPoint), nextPointDistnace)
                console.log(nextPointDistnace)
                console.log(path[i])
                console.log(path[i + 1])
                console.log(path[i + 2])
                // if (i > 4) {
                //     process.exit(0)
                // }
            } else if (nextPointDistnace > IDEAL_DISTANCE_2POINTS) {
                console.log("editting point", nextPointDistnace)
                let toMoveCoordinates = calculateFurtherPoint(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])
                path[i + 1][0] = toMoveCoordinates[0]
                path[i + 1][1] = toMoveCoordinates[1]
                path[i + 1][2] = toMoveCoordinates[2]
                console.log(path[i])
                console.log(path[i + 1])
                console.log(path[i + 2])
            }
        }
    }
    return path
}

/**
 * @description finds average for a given function
 * @param {Array<number>} arr
 * @returns {number} average
 */
let findMean = (arr) => { let sum = arr.reduce((previous, current) => current += previous); return sum / arr.length; }

// findDistance("Trials-Path-Gornek-Mottled Boars") // find distance between 2 points
// testPath("Silithus-Grind-North East Grind")
remakePathTest("Loch Modan-NPC-Aldren Corden")

// run to test
// setTimeout(() => {
//     paths.assignPath("Un'Goro-Crater-SpiritHealer")
//     roam.walkPath(() => {
//     })
// }, 1001)


module.exports = {
    remakePath: remakePath
}