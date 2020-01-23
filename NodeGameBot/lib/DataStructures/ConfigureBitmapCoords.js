const robot = require("robotjs")
const path = require("path")
const fs = require("fs")
// const data = require("../../Engine/data.js")
global.__basedir = path.resolve(__dirname, "../../")

const AUTO_TOGGLE_DATATOCOLOR = false

exports.configureDataCoords = (metaData, override) => {
    if (override) {
        metaData = parseInt(robot.getPixelColor(1, 1), 16)
    }
    // console.log(data.info)
    return new Promise((resolve, reject) => {
        // Number of data frames we are going to be reading from. Works if N frames are < 100
        let dataFrames = parseInt(metaData.toString().slice(-2))
        // Number of frame rows
        let frameRows = parseInt(metaData.toString().slice(-5, -3))
        // Size of data frames. Only needs a rough estimation for the bitmap. Resolution and rounding alters dimensions, so there is a multiplier of 2 to correct for potentially missed pixels.
        let frameSize = parseInt(metaData.toString().slice(-7, -5)) * 2
        // Numbers of frame columns
        let frameCols = Math.ceil(dataFrames / frameRows)
        // Starting point X of bitmap
        let bitMapX1 = 0
        // Starting point Y of bitmap
        let bitMapY1 = 0
        // Width of bitmap / Ending point
        let bitMapX2 = frameCols * frameSize
        // Height of bitmap / Ending point
        let bitMapY2 = frameRows * frameSize
        // Array to be filled with objects containing coordinates of data points
        let dataPointCoordinateArray = []
        // Assigns proper meta data square coordinates
        dataPointCoordinateArray[0] = {
            x: bitMapX1 + 1,
            y: bitMapY1 + 1
        }
        // Saving bitmap
        let dataBitmap = robot.screen.capture(bitMapX1, bitMapY1, bitMapX2, bitMapY2)
        // Loops through total number of data frames excluding the meta data frame
        for (let i = 1; i < dataFrames + 1; i++) {
            // Loops through every pixel of bitmap horizontally
            for (let k = 0; k < bitMapX2; k++) {
                // Loops through every pixel of bitmap vertically
                for (let j = 0; j < bitMapY2; j++) {
                    // Converts data index from hex into a decimal integer
                    if (parseInt(dataBitmap.colorAt(k, j), 16) === i) {
                        // Assigning object
                        let temp = {}
                        temp["x"] = k
                        temp["y"] = j
                        // Pushing object to an array which will be saved in a .json file
                        dataPointCoordinateArray.push(temp)
                        // Breaks out of 2nd and 3rd loop
                        j = Infinity
                        k = Infinity
                    }
                    // If bitmap meta data is ridicuously large, cancel process
                    if (bitMapY2 > 1000 || bitMapX2 > 1000) {
                        reject()
                    }
                }

            }

        }
        // Writing array of frame coordinate objects to a .json file. There must be a minimum of 10 data points found, otherwise no new file will be written.
        if (dataPointCoordinateArray.length > 10) {
            fs.writeFileSync(path.join(__basedir, './Database/lib/frameCoordinates.json'), JSON.stringify(dataPointCoordinateArray))
            console.log('New frame coordinates saved.')
            // If AUTO_TOGGLE_DATATOCOLOR is on, changes back to regular DataToColor display when complete.
            if (AUTO_TOGGLE_DATATOCOLOR) {
                robot.setKeyboardDelay(100)
                robot.keyTap("enter")
                robot.typeStringDelayed("/dc", 400)
                robot.keyTap("enter")
                robot.setKeyboardDelay(0)
                console.log('DataToColor display initialized.')
            }
            resolve()
        } else {
            console.error("ERROR: Game Client is not open, left window is not primary monitor, and/or Game Client is on incorrect window.")
            console.log("Type: /dc [enter] to enter bitmap configuration mode.")
        }

    })
    console.error("ERROR: Game Client is not open, left window is not primary monitor, and/or Game Client is on incorrect window.")
}