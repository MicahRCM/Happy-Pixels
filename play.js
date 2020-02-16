const robot = require("robotjs")
const roam = require("./NodeGameBot/Engine/roamer")

robot.moveMouse(500, 500)
robot.mouseClick()

let walk = () => {
    // Give path accepts the name of the path as well as a 2nd parameter allowing the user to reverse the path.
    // The default behavior will not reverse the path:
    // roam.givePath("NameOfPath")
    // But adding any 2nd variable which evaluates to [true] will reverse the path:
    // roam.givePath("NameOfPath", true)
    roam.givePath("RazorHillToOrgrimmar")
    // Uses a callback function to begin walking.
    roam.walkPath(() => {
        console.log("Finished Walking.")
    })
}

setTimeout(() => {
    walk()
}, 500)