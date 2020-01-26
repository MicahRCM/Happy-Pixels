const robot = require("robotjs")
const { getRandom } = require('../Assorted/customCommands.js')

const data = require("../../Engine/data.js")
const fs = require("fs");
const path = require('path')

// Input the name of the path you are about to record here:
const PATH_FILE_NAME = "Demo"
// The minimum amount of time to be randomly added in addition to the base increment of recorded points. Default: 0
const PATH_RANDOMIZER_MIN_ADDITION = 0
// The maximum amount of time to be randomly added in addition to the base increment of recorded points. Default: 150.
const PATH_RANDOMIZER_MAX_ADDITION = 150
// // The base amount of time to be incrementally used between each recorded point
const PATH_BASE_MS_INCREMENT = 300
// Function to read text file of coordinates
let readCoordinates = ((filename) => {
    fs.readFile(filename, function(err, data) {
        if (err) throw err;
        var array = data.toString().split("\n");
        for (i in array) {
            if (array[i].length > 0) {
                console.log(JSON.parse(array[i]));
            }
        }
    });
});


// Function to record coordinates on to text file
let recordCoordinates = (filename) => {
    let temp = {}
    temp[filename] = []
    console.log('Path recording initialized.')
    setInterval(function() {
        setTimeout(() => {
            let x = data.info.xcoord
            let y = data.info.ycoord
            let d = data.info.direction
            let z = data.info.zone
            temp[filename].push([x, y, d, z])
            fs.writeFileSync(path.resolve(__basedir, "./Database/lib/PathCoordinates/Path text files/" + filename + ".json"), JSON.stringify(temp))
            console.log(temp[filename].length + " points have been recorded")
        }, getRandom(PATH_RANDOMIZER_MIN_ADDITION, PATH_RANDOMIZER_MAX_ADDITION))
        // This value should be randomized a bit so that we aren't turning every 2 seconds
        // How often the script records down a new coordinate
    }, PATH_BASE_MS_INCREMENT);
}

// Change this to the name of the file you would like to save the coordinates as, be specific
// Good formats:
// 1) From one city to another: [Origin City]to[Destination City] RazorHilltoOrgrimmar
// 2) From one NPC to another: [Origin City/Region][Origin NPC]to[Destination NPC] DurotarUkortoGadrin
// 3) For grinding areas: [Current Region][Name of primary enemy]Roam DurotarElderMottledBoarRoam
// These are just some examples but just try and be as clear as possible and most importantly start with the region/city name
setTimeout(() => {
    recordCoordinates(PATH_FILE_NAME)
}, 10)