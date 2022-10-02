// Radosław Wolański 2022

var canvas = document.getElementById("canvas")
var video = document.getElementById("cameraFeed")
var ctx = canvas.getContext("2d")
var infoText = document.getElementById("infoText")
var permissionButton = document.getElementById("startButton")
var previewContainer = document.getElementById("preview")
var screenshotDelay = 500 // how often should algorithm take webcam image capture

var leftShoulder
var rightShoulder
var shoulderCalibrated = {
    leftShoulder: {x: 0, y: 0},
    rightShoulder: {x: 0, y: 0},
}
var wrongPoseCounter = 0
var validPoseCounter = 0

function calibratePose() {
    if (leftShoulder != undefined && rightShoulder != undefined) {
        shoulderCalibrated.leftShoulder.x = leftShoulder["x"]
        shoulderCalibrated.leftShoulder.y = leftShoulder["y"]

        shoulderCalibrated.rightShoulder.x = rightShoulder["x"]
        shoulderCalibrated.rightShoulder.y = rightShoulder["y"]
    }
}

// send info about pose whether it is good or bad
// validPose should be boolean
function sendInfo(validPose) {
    if (wrongPoseCounter + validPoseCounter >= (60 / (screenshotDelay * 0.001))) {
        new Notification("Antygarb")

        wrongPoseCounter = 0
        validPoseCounter = 0
    }
    else {
        if (validPose == true) {
            console.log("counters: " + wrongPoseCounter + " " + validPoseCounter)
            validPoseCounter++
        }
        else if (validPose == false) {
            console.log("counters: " + wrongPoseCounter + " " + validPoseCounter)
            wrongPoseCounter++
        }
    }

    if (validPose == true) {
        infoText.style.visibility = "hidden";
    }
    else if (validPose == false) {
        infoText.style.visibility = "visible";
    }
}

function checkForValidPose() {
    // check if shoulders are on the same height
    if (Math.abs(leftShoulder["y"] - rightShoulder["y"]) > 30) {
        console.log("=== Wrong pose detected! Shoulders not on the same height ===")
        sendInfo(false)
        return
    }

    // distance formula
    // left shoulder
    var leftX = leftShoulder["x"] - shoulderCalibrated.leftShoulder.x
    var leftY = leftShoulder["y"] - shoulderCalibrated.leftShoulder.y
    var leftDistance = Math.sqrt((leftX * leftX) + (leftY * leftY))

    // right shoulder
    var rightX = rightShoulder["x"] - shoulderCalibrated.rightShoulder.x
    var rightY = rightShoulder["y"] - shoulderCalibrated.rightShoulder.y
    var rightDistance = Math.sqrt((rightX * rightX) + (rightY * rightY))

    // check if shoulder aren't too big
    // and check if the user is lying back 
    if (leftDistance + rightDistance > 30) { 
        console.log("=== Wrong pose detected! Distance between shoulders: " + (leftDistance + rightDistance) + " ===")
        sendInfo(false)
        return
    }
    sendInfo(true) // otherwise your pose is good, notify user
}

function drawKeypoints(pose) {
    ctx.drawImage(video, 0, 0, video.width, video.height); // embed webcam stream into canvas
    ctx.fillStyle = "#00FF00" // green keypoints

    if (pose.length != 0) {
        if (pose[0]["score"] > 0.4) {
            pose[0]["keypoints"].forEach(point => {
                switch (point["name"]) {
                    case "right_shoulder":
                        rightShoulder = point
                        break
                    case "left_shoulder":
                        leftShoulder = point;
                        break
                    default:
                        break
                }
                if (point["score"] > 0.4) {
                    ctx.fillRect(Math.round(point["x"]), Math.round(point["y"]), 5, 5); // draw keypoints
                }
            });
            checkForValidPose(leftShoulder, rightShoulder);
        }
        else {
            validPoseCounter = 0 // reset counters for timer to restart
            wrongPoseCounter = 0
        }
    }
}

function estimatePose(detector) {
    setTimeout(async () => {
        pose = await detector.estimatePoses(cameraFeed)
        console.log(pose)
        drawKeypoints(pose)
        estimatePose(detector) // recurse
    }, screenshotDelay)
}

async function setupDetector() {
    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet)
    video.addEventListener("loadeddata", estimatePose(detector))
}

function alertForDeniedPermission() { alert("You need to grant permission both for webcam access and receiving notifications for this application to work!") }

function startMonitoring() {
    permissionButton.style.display = "none"
    previewContainer.style.display = "initial"

    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: true}).then((stream) => { // ask for webcam access
            video.srcObject = stream
            Notification.requestPermission().then((permission) => { // ask for notifications access
                if (permission === "granted") {
                    setupDetector()
                }
                else {
                    alertForDeniedPermission()
                }
            })
        }).catch((err) => {
            alertForDeniedPermission()
        })
    }
}