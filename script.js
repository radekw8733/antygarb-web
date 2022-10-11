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
    isCalibrated: false,
    leftShoulder: {x: 0, y: 0},
    rightShoulder: {x: 0, y: 0},
    shoulderLevel: 0
}
var wrongPoseCounter = 0

function calibratePose() {
    if (leftShoulder != undefined && rightShoulder != undefined) {
        shoulderCalibrated.isCalibrated = true

        shoulderCalibrated.leftShoulder.x = leftShoulder["x"]
        shoulderCalibrated.leftShoulder.y = leftShoulder["y"]

        shoulderCalibrated.rightShoulder.x = rightShoulder["x"]
        shoulderCalibrated.rightShoulder.y = rightShoulder["y"]

        shoulderCalibrated.shoulderLevel = Math.abs(leftShoulder["y"] - rightShoulder["y"])
    }
}

// send info about pose whether it is good or bad every 30 seconds
// validPose should be boolean
function sendInfo(validPose) {
    if (shoulderCalibrated.isCalibrated) {
        if (wrongPoseCounter >= (15 / (screenshotDelay * 0.001))) {
            sendNotification()

            wrongPoseCounter = 0
        }
        else {
            if (validPose == true) {
                console.log("counter: " + wrongPoseCounter)
                wrongPoseCounter = 0
            }
            else if (validPose == false) {
                console.log("counter: " + wrongPoseCounter)
                wrongPoseCounter++
            }
        }
    
        if (validPose == true) {
            infoText.style.visibility = "hidden"
        }
        else if (validPose == false) {
            infoText.innerText = "Popraw swoją postawę!"
            infoText.style.color = "red"
            infoText.style.visibility = "visible"
        }
    }
    else {
        infoText.style.visibility = "visible"
        infoText.innerText = "Skalibruj swoją pozycję"
    }
}

function checkForValidPose() {
    // check if shoulders are on the same height
    if (Math.abs(leftShoulder["y"] - rightShoulder["y"]) - shoulderCalibrated.shoulderLevel > 30) {
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
    ctx.drawImage(video, 0, 0, video.width, video.height) // embed webcam stream into canvas
    ctx.fillStyle = "#00FF00" // green keypoints

    if (pose.length != 0) {
        if (pose[0]["score"] > 0.4) {
            pose[0]["keypoints"].forEach(point => {
                switch (point["name"]) {
                    case "right_shoulder":
                        rightShoulder = point
                        break
                    case "left_shoulder":
                        leftShoulder = point
                        break
                    default:
                        break
                }
                if (point["score"] > 0.4) {
                    ctx.fillRect(Math.round(point["x"]), Math.round(point["y"]), 5, 5) // draw keypoints
                }
            })
            checkForValidPose(leftShoulder, rightShoulder)
        }
        else {
            wrongPoseCounter = 0 // reset counters for timer to restart
        }
    }
}

function estimatePose(detector) {
    // setCanvasSize()

    setTimeout(async () => {
        pose = await detector.estimatePoses(cameraFeed)
        console.log(pose)
        drawKeypoints(pose)
        estimatePose(detector) // recurse
    }, screenshotDelay)
}

function setCanvasSize(stream) {
    video.width = stream.getVideoTracks()[0].getSettings().width
    video.height = stream.getVideoTracks()[0].getSettings().height
    ctx.canvas.width = stream.getVideoTracks()[0].getSettings().width
    ctx.canvas.height = stream.getVideoTracks()[0].getSettings().height
    // ctx.scale(0.5, 0.5)
}

function sendNotification() {
    document.getElementById("notificationSound").play()
    new Notification("Antygarb", {
        body: "Twoja postawa jest niepoprawna. Wyprostuj się",
        image: window.location.href + "/antihump_icon.svg",
        renotify: true,
        requireInteraction: true,
        silent: true
    })
}

async function setupDetector() {
    const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet)
    video.addEventListener("loadeddata", estimatePose(detector))
}

function alertForDeniedPermission() { alert("Aby ta aplikacje poprawnie działała potrzeba przydzielić uprawnienia dla kamery oraz otrzymywania powiadomień") }

function startMonitoring() {
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: {
            width: {min: 640, max: 1280},
            height: {min: 480, max: 720}
        }}).then((stream) => { // ask for webcam access
            setCanvasSize(stream)
            video.srcObject = stream
            Notification.requestPermission().then((permission) => { // ask for notifications access
                if (permission === "granted") {
                    permissionButton.style.display = "none"
                    previewContainer.style.display = "initial"
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