let robot = require("robotjs");
let fs = require('fs');
const screenshot = require('desktop-screenshot')
const jimp = require('jimp')
const cv = require('opencv4nodejs')
const { cropUI } = require('../ImageRecognition/crop')
const path = require("path");
const { selectGossipOption } = require("../TextRecon/gossipQuestOption")
const gossiper = require("../../Engine/gossip")
const data = require("../../Engine/data")
const roam = require("../../Engine/roamer")
const worldNavigation = require("../worldNavigation.js")

let areas = fs.readFileSync(path.resolve(__dirname, "../../../Database/lib/boxes.json"))
areas = JSON.parse(areas)

let xInset = 0
let yInset = 0
let xOffset = 0
let yOffset = 0
let text = ["I need a ride.", "Show me where I can fly"]

let dimensions = robot.getScreenSize()

const ASSIGN_DEVELOPER_MACROS = true

let click = async (coordinateObject, right) => {
    // return new Promise(async (res, rej) => {
    let resolutionObject = convertResolutions(areas[coordinateObject])
        await moveAndClickArea(resolutionObject.x1, resolutionObject.y1, resolutionObject.x2, resolutionObject.y2, right)
        // res()
    // })
}

let convertResolutions = (object) => {
    let newObject = {}
    newObject.x1 = object.x1 * (dimensions.width / 1920)
    newObject.y1 = object.y1 * (dimensions.height / 1080)
    newObject.x2 = object.x2 * (dimensions.width / 1920)
    newObject.y2 = object.y2 * (dimensions.height / 1080)
    return newObject
}

// Fly to a specific area defined in boxes.json
let flyTo = async (area) => {
    return new Promise(async (resolve, reject) => {
        setTimeout(async () => {
            if (data.info.gossipWindowOpen == false) {
                console.log("Error: Gossip Window must be open to select a flight path.")
                return
            }
            /* This section not need while LazyPig is enabled */
            let coordinates = await selectGossipOption(text)
            console.log("coordinates : ", coordinates)
            await moveAndClickArea(coordinates[0], coordinates[1], coordinates[2], coordinates[3])
            /* This section not need while LazyPig is enabled */
            await click(area)
            // Resolves after player is no longer on a taxi
            await flight()
            resolve()
        }, 1000)
    })
}

// Finds nearest flight master in zone, walks to them, talks to them, flys to specified area.
let flyWithNearestMasterTo = async (area) => {
    return new Promise(async (resolve, reject) => {
        // Finding nearest flight master node
        let node = worldNavigation.findNearestTag("Flight Master")
        // Walking to that node
        await roam.go(node.value)
        console.log(node)
        // Finding and clicking on the flight master to begin conversation
        // node.name
        await gossiper.startTalk(node.label, "Talk")
        // Flying to our desired area
        await flyTo(area)
        resolve()
    })
}

//
let sellToNearestVendor = async () => {
    return new Promise(async (resolve, reject) => {
        let node = worldNavigation.findNearestTag("Vendor")
        await roam.go(node.node)
        gossiper.startTalk(node.name, "Loot", async () => {
            items.action('sell', () => {
                resolve()
            })
        })
    })
}


let createMacros = async () => {
    return new Promise(async (resolve, reject) => {
        let coords = convertResolutions({ "x1": 550, "y1": 340, "x2": 60, "y2": 60 })
        let cast = "/cast "
        // List of all spells we want a macro of
        let spellMacro = ["Fireball", "Frostbolt", "Fire Blast", "Frost Nova", "Evocation", "Shoot", "Counterspell", "Conjure Food", "Conjure Water", "Frost Armor", "Arcane Intellect", "Ice Barrier", "Blink", "Reassign Macros", "Stop Process"]
        // Opens macro menu
        robot.typeString("/macro")
        robot.keyTap("enter")
        // Opens up page for player specific macros
        await click("PlayerSpecificMacros")
        for (let i = 0; i < spellMacro.length; i++) {
            await click("NewMacro")
            // Types Macro name
            robot.typeString(spellMacro[i])
            // Chooses Macro icon.
            leftClick(Math.floor(coords.x1) + (i % 5) * Math.floor(coords.x2), Math.floor(coords.y1) + Math.floor(i / 5) * Math.floor(coords.y2))
            // Confirms Icon and name of macro is OK
            await click("MacroOkay")
            // Types macro code
            if (spellMacro[i] === "Shoot" || spellMacro[i] === "Attack") {
                // String for any autorepeat actions
                robot.typeString('/run GGUseAction=GGUseAction or UseAction;UseAction=function(id,a,b)if not IsCurrentAction(id)and not IsAutoRepeatAction(id)then GGUseAction(id,a,b)end end ')
                // Creates an extra space for macro syntax so that the macro is valid
                robot.keyTap("enter")
                // Types cast and general auto-repeat spell type
                robot.typeString(cast + spellMacro[i])
            } else if (spellMacro[i] === "Reassign Macros") {
                robot.typeString("/script ASSIGN_MACROS_INITIALIZE = true")
            } else if (spellMacro[i] === "Stop Process") {
                robot.typeString("/script EXIT_PROCESS_STATUS = 1")
            } else {
                robot.typeString(cast + spellMacro[i])
            }

        }
        // Closes macro menu
        robot.keyTap("escape")
        // Closes Main Menu UI Frame
        robot.keyTap("escape")
        resolve()
    })
}

let moveAndClickArea = async (x1, y1, x2, y2, right) => {
    return new Promise(async (res, rej) => {
        let x = getRandom(x1 + xInset - xOffset, x2 + xInset - xOffset)
        let y = getRandom(y1 + yInset - yOffset, y2 + yInset - yOffset)
        await robotBanHandling(() => {
            robot.moveMouseCurve(x, y)
            if (right) {
                robot.mouseClick("right")
            } else {
                robot.mouseClick()
            }
            res()
        })
    })
}
// 55, 322, 420, 340
// setTimeout(() => {
//     // let image1 = cv.imread(path.resolve(__dirname, '../StaticImages/casting.png'))
//     // // cv.imshowWait("casting", image1)
//     // image = cropUI("innnerSpellCasting", image1)
//     // cv.imwrite("../StaticImages/casting.png", image1)
//     // // robot.moveMouse(500, 500)
//     // // robot.mouseClick()
//     // // robot.keyTap("2")
//     // // setTimeout(() => {
//     // //     createImageOKAYButton().then(() => {
//     // //         console.log("wrote Image")
//     // //     })
//     // // }, 15)
// }, 500)
//creates an image of the Okay button when an unavailable random name is used
let createImageOKAYButton = () => {
    return new Promise(async (res, rej) => {
        screenshot("../../StaticImages/casting.png", async (error, complete) => {
            if (error)
                console.log("Screenshot failed", error);
            let image = await jimp.read('../../StaticImages/casting.png');
            image.crop(818, 914, 1101 - 818, 941 - 914).write('../../StaticImages/casting.png')
            res();
        })
    })
}

let benchmarkAsyncFunciton = (Bfunction) => {
    return new Promise((done, dead) => {
        let start = process.hrtime();
        Bfunction().then(() => {
            let ExecutionTime = process.hrtime(start);
            console.log(Bfunction.name + " Executed in : ", ExecutionTime)
            done(ExecutionTime)
        })
    })
}
let benchmarkFunciton = (Bfunction, callback) => {
    let start = process.hrtime();
    if (callback) {
        let messure = () => {
            let ExecutionTime = process.hrtime(start);
            console.log(Bfunction.name + " Executed in : ", ExecutionTime)
        }
        Bfunction(messure)
    } else {
        Bfunction()
        let ExecutionTime = process.hrtime(start);
        console.log(Bfunction.name + " Executed in : ", ExecutionTime)
    }

}

const getRandom = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
// Minor antiban to cause delays between inputs
let robotBanHandling = (robotCommand) => {
    return new Promise((res, rej) => {
        setTimeout(() => {
            robotCommand()
            res()
        }, getRandom(5, 1000))
    })
}
// let rightShift
let rightClick = () => {
    robot.keyToggle("shift", "down")
    robot.mouseClick("right", false)
    robot.keyToggle("shift", "up")
}

let leftClick = (x, y) => {
    robot.moveMouseCurve(x, y)
    robot.mouseClick()
}

//function to move front(for gossip)
exports.moveFront = async () => {
    return new Promise((res, rej) => {
        robot.keyToggle("w", "down")
        robot.keyToggle("a", "down")

        setTimeout(async () => {
            robot.keyToggle("w", "up")
            robot.keyToggle("a", "up")

            res()
        }, 300)
    })
}

//function to move back(for gossip)
exports.moveBack = async () => {
    return new Promise((res, rej) => {
        robot.keyToggle("s", "down")
        robot.keyToggle("a", "down")

        setTimeout(async () => {
            robot.keyToggle("s", "up")
            robot.keyToggle("a", "up")

            res()
        }, 400)
    })
}

// To be invoked after a flight path has been selected
// Resolves after played has landed
let flight = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Ensures we are flying
            console.log("Flying initialized:", data.info.flying)
            if (data.info.flying) {
                // Checks every interval to see if we have landed
                let checkFlying = setInterval(() => {
                    // Resolves when we have landed
                    if (!data.info.flying) {
                        resolve()
                        clearInterval(checkFlying)
                    }
                }, 800)
            } else {
                console.log("Error: Flying never began.")
                reject()
            }
        }, 3000)
    })
}

module.exports = {
    robotBanHandling: robotBanHandling,
    getRandom: getRandom,
    click: click,
    rightClick: rightClick,
    leftClick: leftClick,
    benchmarkFunciton: benchmarkFunciton,
    benchmarkAsyncFunciton: benchmarkAsyncFunciton,
    flight: flight,
    flyTo: flyTo,
    createMacros: createMacros,
    flyWithNearestMasterTo: flyWithNearestMasterTo
}

// Checking whether or not two objects are the same
Object.prototype.isDuplicate = function(object2) {
    //For the first loop, we only check for types
    for (propName in this) {
        //Check for inherited methods and properties - like .equals itself
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
        //Return false if the return value is different
        if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
            return false;
        }
        //Check instance type
        else if (typeof this[propName] != typeof object2[propName]) {
            //Different types => not equal
            return false;
        }
    }
    //Now a deeper check using other objects property names
    for (propName in object2) {
        //We must check instances anyway, there may be a property that only exists in object2
        //I wonder, if remembering the checked values from the first loop would be faster or not
        if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
            return false;
        } else if (typeof this[propName] != typeof object2[propName]) {
            return false;
        }
        //If the property is inherited, do not check any more (it must be equa if both objects inherit it)
        if (!this.hasOwnProperty(propName))
            continue;
        //Now the detail check and recursion

        //This returns the script back to the array comparing
        /**REQUIRES Array.equals**/
        if (this[propName] instanceof Array && object2[propName] instanceof Array) {
            // recurse into the nested arrays
            if (!this[propName].isDuplicate(object2[propName]))
                return false;
        } else if (this[propName] instanceof Object && object2[propName] instanceof Object) {
            // recurse into another objects
            //console.log("Recursing to compare ", this[propName],"with",object2[propName], " both named \""+propName+"\"");
            if (!this[propName].isDuplicate(object2[propName]))
                return false;
        }
        //Normal value comparison for strings and numbers
        else if (this[propName] != object2[propName]) {
            return false;
        }
    }
    //If everything passed, let's say YES
    return true;
}