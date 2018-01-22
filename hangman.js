
// Initialize global constants/statics. Load word list, etc.
var GAME_STATE = Object.freeze({
    "ERROR": 0,
    "PENDING": 1,
    "PROGRESSING": 2,
    "IMPERILED": 3,
    "WON": 4,
    "LOST": 5
});

var HANGMAN_PART = Object.freeze({
    "FRAME": 1,
    "GALLOWS": 2,
    "ROPE": 3,
    "NOOSE": 4,
    "HEAD": 5,
    "NOSE": 6,
    "BODY": 7,
    "LEFT_ARM": 8,
    "RIGHT_ARM": 9,
    "LEFT_HAND": 10,
    "RIGHT_HAND": 11,
    "LEFT_LEG": 12,
    "RIGHT_LEG": 13,
    "LEFT_FOOT": 14,
    "RIGHT_FOOT": 15,
    "LEFT_EYE_HAPPY": 16,
    "LEFT_EYE_NORMAL": 17,
    "LEFT_EYE_WORRIED": 18,
    "LEFT_EYE_DEAD": 19,
    "RIGHT_EYE_HAPPY": 20,
    "RIGHT_EYE_NORMAL": 21,
    "RIGHT_EYE_WORRIED": 22,
    "RIGHT_EYE_DEAD": 23,
    "MOUTH_HAPPY": 24,
    "MOUTH_NORMAL": 25,
    "MOUTH_WORRIED": 26,
    "MOUTH_DEAD": 27
});

var dialogPreferences = document.getElementById('preferences');
var buttonPreferences = document.getElementById("btnPreferences");
var buttonClosePreferences = document.getElementById("btnClosePreferences");

var theCanvas = document.getElementById("hangmanCanvas");
var theContext = theCanvas.getContext("2d");
theCanvas.width = 400;
theCanvas.height = 500;

// document.getElementById('gameDifficulty').selectedIndex = 0;
// document.getElementById('wordLevel').selectedIndex = 0;
// document.getElementById('wordLength').selectedIndex = 0;

var gameState;
var theCanvas;
var theContext;
var windowHeight;   // Height and width to be stored in em.
var windowWidth;
var windowAspect;   // Is width/height ratio. Therefore, 1 indicates square. > 1 is wide. < 1 is tall.
var emPixels;
var letterDisplayColumns;
var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var alphabetGuesses;
var wordPool;
var wordPoolFiltered;
var word;
var hitCount;
var missCount;

var maxMisses = 10;

var vocabRequest = new XMLHttpRequest();
vocabRequest.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
        wordPool = JSON.parse(this.responseText);
    }
};
vocabRequest.open("GET", "hangmanVocab.json", false);
vocabRequest.send();


function updateMaxMisses() {
    maxMisses = parseInt(document.getElementById('gameDifficulty').value);
}

function initHangman() {
    hitCount = 0;
    missCount = 0;
    updateGameState();          // Will be "PENDING" if hitCount and missCount are 0.
    updateEnabledState();       // Controls will be enabled based on game state.

    alphabetGuesses = [];
    for (var i = 0; i < alphabet.length; i++) {     // Initialize guesses to <nothing guessed yet>
        alphabetGuesses.push(false);
    }

    updateWordPoolFiltered();   // Also selects word and redraws if at gameState PENDING (i.e As here).
    setTimeout(function () {
        updateWindowSize();
    }, 1000);
}


function updateGameState() {
    if (hitCount + missCount === 0 || word === undefined) {
        gameState = GAME_STATE.PENDING;
    } else if (missCount === maxMisses) {
        gameState = GAME_STATE.LOST;
    } else if (hitCount === word.length) {
        gameState = GAME_STATE.WON;
    } else if (hitCount < 0 || hitCount > word.length || missCount < 0 || missCount > maxMisses) {
        gameState = GAME_STATE.ERROR;
    } else if (missCount >= (maxMisses * .6)) {
        gameState = GAME_STATE.IMPERILED;
    } else {
        gameState = GAME_STATE.PROGRESSING;
    }
}

function updateEnabledState() {
    if (gameState === GAME_STATE.PROGRESSING || gameState === GAME_STATE.IMPERILED) {
        document.getElementById("gameDifficulty").disabled = true;
        document.getElementById("wordLength").disabled = true;
        document.getElementById("wordLevel").disabled = true;
    } else {
        document.getElementById("gameDifficulty").disabled = false;
        document.getElementById("wordLength").disabled = false;
        document.getElementById("wordLevel").disabled = false;
    }
}

function updateWordPoolFiltered() {
    wordPoolFiltered = [];
    for (var i = 0; i < wordPool.length; i++) {
        if (wordPool[i].vocabWord.length >= JSON.parse(document.getElementById("wordLength").value).low &&
            wordPool[i].vocabWord.length <= JSON.parse(document.getElementById("wordLength").value).high &&
            wordPool[i].wordGrade >= JSON.parse(document.getElementById("wordLevel").value).low &&
            wordPool[i].wordGrade <= JSON.parse(document.getElementById("wordLevel").value).high) {
            wordPoolFiltered.push({"vocabWord": wordPool[i].vocabWord, "wordGrade": wordPool[i].wordGrade})
        }
    }

    if (gameState === GAME_STATE.PENDING) {
        word = updateHangmanWord();
        drawHangmanWord();
    }
}

function updateHangmanWord() {
    return wordPoolFiltered[randIntBetween(0, wordPoolFiltered.length)].vocabWord.toUpperCase();
}

function randIntBetween(randMin, randMax) {
    return Math.floor(Math.random() * (randMax - randMin + 1) + randMin);
}

function updateWindowSize() {
    document.getElementById("emPixelTest").style.height = "1em";
    emPixels = document.getElementById("emPixelTest").offsetHeight;

    // Window dimensions available in pixels
    windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    // Convert to Ems.
    windowWidth = windowWidth / emPixels;
    windowHeight = windowHeight / emPixels;

    windowAspect = windowWidth / windowHeight;

    fullRecalcRedraw();
}

function fullRecalcRedraw() {
    // Default to title centered in remaining space to right of left float canvas.
    updateStylesheet("canvas", "float", "left");
    updateStylesheet("canvas", "width", "33.333%");

    if (windowAspect < .62) {       // Extreme tall (Galaxy S8, etc.)
        // Move title above canvas and center all.
        // document.getElementByID("titleAndCanvas").innerHTML = "<h1>Hangman</h1><canvas id=\"hangmanCanvas\"></canvas>";
        updateStylesheet("canvas", "display", "block");
        updateStylesheet("canvas", "margin", "0 auto");
        updateStylesheet("canvas", "float", "none");
        updateStylesheet("canvas", "width", "75%");
    }

    if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) > 1000) {
        letterDisplayColumns = 13;
    } else {
        letterDisplayColumns = 9;
    }

    drawHangmanWord();  // Probably not necessary. Included for simplicity.
    drawLetterTable();
    drawHangman();
}

function drawHangmanWord() {
    if (!word) return;
    var wordDisplay = '<p class="hangmanWord">';
    for (var i = 0; i < word.length; i++) {
        if (alphabetGuesses[alphabet.indexOf(word.charAt(i))] === true) {
            wordDisplay = wordDisplay + word.charAt(i);
        } else {
            if (gameState === GAME_STATE.LOST) {  // Unmask hidden letters on loss.
                wordDisplay = wordDisplay + '<buttonClosePreferences class = "missedLetter">' + word.charAt(i) + "</buttonClosePreferences>";
            } else {
                wordDisplay = wordDisplay + '_';
            }
        }
    }
    wordDisplay = wordDisplay + '</p>';
    document.getElementById("divWord").innerHTML = wordDisplay;
}


function drawLetterTable() {
    if (!alphabetGuesses) return;
    var guessHTML = '<table>';
    for (var i = 0; i < alphabet.length;) {    // Increment "i" only once per "j" number of letters. (So, not here.)
        guessHTML = guessHTML + '<tr>';
        for (var j = 0; j < letterDisplayColumns; j++) {
            if (i < alphabet.length) {
                if (alphabetGuesses[i] || gameState > GAME_STATE.IMPERILED) {
                    guessHTML = guessHTML + '<td><button class="letterBtn" disabled>' +
                        alphabet.charAt(i) + '</button></td>';
                } else {
                    guessHTML = guessHTML + '<td><button class="letterBtn" onClick="handleGuess(\'' + alphabet.charAt(i) +
                        '\')">' + alphabet.charAt(i) + '</button></td>';
                }
            } else {
                guessHTML = guessHTML + '<td></td>';
            }
            i++;
        }
        guessHTML = guessHTML + '</tr>';
    }
    guessHTML = guessHTML + '</table>';
    document.getElementById("divLetters").innerHTML = guessHTML;
}

function handleGuess(theGuess) {
    // Ignore guesses when game over, etc.
    if (gameState === GAME_STATE.WON ||
        gameState === GAME_STATE.LOST ||
        gameState === GAME_STATE.ERROR) {
        return;
    }

    if (alphabetGuesses[alphabet.indexOf(theGuess)] !== true) {  // If we haven't already marked this one
        alphabetGuesses[alphabet.indexOf(theGuess)] = true;      // Mark letter as guessed, regardless of hit.

        if (word.indexOf(theGuess) > -1) {                      // If this guess has at least one hit
            var hitIndex = 0;
            while (word.indexOf(theGuess, hitIndex) > -1) {     // Add all (multiple letter) hits to hitCount.
                hitIndex = word.indexOf(theGuess, hitIndex) + 1;
                hitCount++;
            }
        } else {
            missCount++;
        }
    }
    updateGameState(); // Each guess can change the game state.

    // Change of game state can impact hangman, preferences state, guessed letters, and word display. So
    //   let each of these refresh itself.
    drawHangman();
    updateEnabledState();
    drawLetterTable();
    drawHangmanWord();
}

function drawHangman() {
    theContext.clearRect(0, 0, theCanvas.width, theCanvas.height);
    theContext.lineWidth = "3";
    theContext.lineCap = "round";

    var hangmanParts = getHangmanParts();
    for (var i = 0; i < hangmanParts.length; i++) {
        drawHangmanPart(hangmanParts[i]);
    }
}

function getHangmanParts() {
    var hangmanParts = [];
    var step = getHangmanDrawStep();

    hangmanParts.push(HANGMAN_PART.FRAME);
    if (gameState !== GAME_STATE.WON) {
        hangmanParts.push(HANGMAN_PART.ROPE);
    }

    if (gameState === GAME_STATE.PROGRESSING && step > 0) {
        hangmanParts.push(HANGMAN_PART.LEFT_EYE_NORMAL);
        hangmanParts.push(HANGMAN_PART.RIGHT_EYE_NORMAL);
        hangmanParts.push(HANGMAN_PART.MOUTH_NORMAL);
    }

    if (gameState === GAME_STATE.IMPERILED) {
        hangmanParts.push(HANGMAN_PART.LEFT_EYE_WORRIED);
        hangmanParts.push(HANGMAN_PART.RIGHT_EYE_WORRIED);
        hangmanParts.push(HANGMAN_PART.MOUTH_WORRIED);
    }

    if (gameState === GAME_STATE.WON) {
        hangmanParts.push(HANGMAN_PART.LEFT_EYE_HAPPY);
        hangmanParts.push(HANGMAN_PART.RIGHT_EYE_HAPPY);
        hangmanParts.push(HANGMAN_PART.MOUTH_HAPPY);
    }

    if (gameState === GAME_STATE.LOST) {
        hangmanParts.push(HANGMAN_PART.LEFT_EYE_DEAD);
        hangmanParts.push(HANGMAN_PART.RIGHT_EYE_DEAD);
        hangmanParts.push(HANGMAN_PART.MOUTH_DEAD);
    }

    if (step >= 1) {
        hangmanParts.push(HANGMAN_PART.HEAD);
        hangmanParts.push(HANGMAN_PART.NOSE);
    }
    if (step >= 2) hangmanParts.push(HANGMAN_PART.BODY);
    if (step >= 3) hangmanParts.push(HANGMAN_PART.LEFT_ARM);
    if (step >= 4) hangmanParts.push(HANGMAN_PART.RIGHT_ARM);
    if (step >= 5) hangmanParts.push(HANGMAN_PART.LEFT_HAND);
    if (step >= 6) hangmanParts.push(HANGMAN_PART.RIGHT_HAND);
    if (step >= 7) hangmanParts.push(HANGMAN_PART.LEFT_LEG);
    if (step >= 8) hangmanParts.push(HANGMAN_PART.RIGHT_LEG);
    if (step >= 9) hangmanParts.push(HANGMAN_PART.LEFT_FOOT);
    if (step >= 10) hangmanParts.push(HANGMAN_PART.RIGHT_FOOT);

    return hangmanParts;
}

function getHangmanDrawStep() {
    if (gameState === GAME_STATE.WON || gameState === GAME_STATE.LOST) {
        return 10;
    } else if (maxMisses === 10) {
        return missCount;
    } else if (maxMisses === 7) {
        if (missCount === 1) {
            return 2;
        }
        else if (missCount === 2) {
            return 4;
        }
        else if (missCount === 3) {
            return 5;
        }
        else if (missCount === 4) {
            return 6;
        }
        else if (missCount === 5) {
            return 7;
        }
        else if (missCount === 6) {
            return 8;
        }
    } else if (maxMisses === 5) {
        if (missCount === 1) {
            return 2;
        }
        else if (missCount === 2) {
            return 4;
        }
        else if (missCount === 3) {
            return 6;
        }
        else if (missCount === 4) {
            return 8;
        }
    } else if (maxMisses === 3) {
        if (missCount === 1) {
            return 4;
        }
        else if (missCount === 2) {
            return 8;
        }
    }
}

function drawHangmanPart(thePart) {
    var winOffset;  // On win, we'll draw the same figure lower (on the ground). So, add offset to move it.
    if (gameState === GAME_STATE.WON) {
        winOffset = 76;
    } else {
        winOffset = 0;
    }

    var left = 10;
    var right = theCanvas.width - left;
    var top = 0;
    var bottom = theCanvas.height - top;
    var middle = theCanvas.width / 2;
    var widthFactor = theCanvas.width / 200;
    var heightFactor = theCanvas.height / 250;

    theContext.strokeStyle = "green";   // Most are green, so default to this.

    switch (thePart) {
        case HANGMAN_PART.FRAME:
            theContext.strokeStyle = "black";
            drawLine(left, top, right, top);
            drawLine(right, top, right, bottom);
            drawLine(right, bottom, left, bottom);
            drawLine(left, bottom, left, top);
            break;
        case HANGMAN_PART.GALLOWS:

            break;
        case HANGMAN_PART.ROPE:
            theContext.strokeStyle = "orange";
            drawLine(middle, 1, middle, Math.floor(20 * heightFactor));
            break;
        case HANGMAN_PART.NOOSE:

            break;
        case HANGMAN_PART.HEAD:
            theContext.beginPath();
            theContext.arc(middle, (40 * heightFactor) + winOffset, (20 * heightFactor), 0, 2 * Math.PI);
            theContext.stroke();
            break;
        case HANGMAN_PART.NOSE:
            drawLine(middle, (38 * heightFactor) + winOffset, middle, (43 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.BODY:
            drawLine(middle, (60 * heightFactor) + winOffset, middle, (160 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.LEFT_ARM:
            drawLine(middle, (65 * heightFactor) + winOffset, (50 * widthFactor), (115 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.RIGHT_ARM:
            drawLine(middle, (65 * heightFactor) + winOffset, (150 * widthFactor), (115 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.LEFT_HAND:
            drawLine((50 * widthFactor), (115 * heightFactor) + winOffset, (40 * widthFactor), (115 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.RIGHT_HAND:
            drawLine((150 * widthFactor), (115 * heightFactor) + winOffset, (160 * widthFactor), (115 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.LEFT_LEG:
            drawLine(middle, (160 * heightFactor) + winOffset, (50 * widthFactor), (210 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.RIGHT_LEG:
            drawLine(middle, (160 * heightFactor) + winOffset, (150 * widthFactor), (210 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.LEFT_FOOT:
            drawLine((50 * widthFactor), (210 * heightFactor) + winOffset, (40 * widthFactor), (210 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.RIGHT_FOOT:
            drawLine((150 * widthFactor), (210 * heightFactor) + winOffset, (160 * widthFactor), (210 * heightFactor) + winOffset);
            break;
        case HANGMAN_PART.LEFT_EYE_HAPPY:
            drawEllipseByCenter(middle - (9 * widthFactor), (34 * heightFactor) + winOffset, 4, 6);
            break;
        case HANGMAN_PART.LEFT_EYE_NORMAL:
            drawLine(middle - (13 * widthFactor), (34 * heightFactor), middle - (6 * widthFactor), (34 * heightFactor));
            break;
        case HANGMAN_PART.LEFT_EYE_WORRIED:
            drawEllipseByCenter(middle - (9 * widthFactor), (34 * heightFactor), 5, 5);
            break;
        case HANGMAN_PART.LEFT_EYE_DEAD:
            drawLine(middle - (13 * widthFactor), (38 * heightFactor), middle - (6 * widthFactor), (30 * heightFactor));
            drawLine(middle - (13 * widthFactor), (30 * heightFactor), middle - (6 * widthFactor), (38 * heightFactor));
            break;
        case HANGMAN_PART.RIGHT_EYE_HAPPY:
            drawEllipseByCenter(middle + (9 * widthFactor), (34 * heightFactor) + winOffset, 4, 6);
            break;
        case HANGMAN_PART.RIGHT_EYE_NORMAL:
            drawLine(middle + (13 * widthFactor), (34 * heightFactor), middle + (6 * widthFactor), (34 * heightFactor));
            break;
        case HANGMAN_PART.RIGHT_EYE_WORRIED:
            drawEllipseByCenter(middle + (9 * widthFactor), (34 * heightFactor), 5, 5);
            break;
        case HANGMAN_PART.RIGHT_EYE_DEAD:
            drawLine(middle + (6 * widthFactor), (38 * heightFactor), middle + (13 * widthFactor), (30 * heightFactor));
            drawLine(middle + (6 * widthFactor), (30 * heightFactor), middle + (13 * widthFactor), (38 * heightFactor));
            break;
        case HANGMAN_PART.MOUTH_HAPPY:
            theContext.beginPath();
            theContext.arc(middle, (48 * heightFactor) + winOffset, 6, 0, Math.PI, false);
            theContext.stroke();
            break;
        case HANGMAN_PART.MOUTH_NORMAL:
            drawLine(middle - (8 * widthFactor), (50 * heightFactor), middle + (8 * widthFactor), (50 * heightFactor));
            break;
        case HANGMAN_PART.MOUTH_WORRIED:
            drawEllipseByCenter(middle, (50 * heightFactor), 9, 6);
            break;
        case HANGMAN_PART.MOUTH_DEAD:
            theContext.beginPath();
            theContext.arc(middle, (52 * heightFactor), 6, 0, Math.PI, true);
            theContext.stroke();
            break;
    }
}

function drawLine(x1, y1, x2, y2) {
    theContext.beginPath();
    theContext.moveTo(x1, y1);
    theContext.lineTo(x2, y2);
    theContext.stroke();

}

function drawEllipse(x, y, w, h) {
    // From  Steve Tranby via:
    //   https://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
    var kappa = .5522848,
        ox = (w / 2) * kappa, // control point offset horizontal
        oy = (h / 2) * kappa, // control point offset vertical
        xe = x + w,           // x-end
        ye = y + h,           // y-end
        xm = x + w / 2,       // x-middle
        ym = y + h / 2;       // y-middle

    theContext.beginPath();
    theContext.moveTo(x, ym);
    theContext.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    theContext.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    theContext.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    theContext.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    theContext.stroke();
}

function drawEllipseByCenter(cx, cy, w, h) {
    // From  Steve Tranby via:
    //   https://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
    drawEllipse(cx - w / 2.0, cy - h / 2.0, w, h);
}

function resetGame() {
    // If game is in progress, confirm reset.
    var reset = true;
    if (gameState === GAME_STATE.PROGRESSING || gameState === GAME_STATE.IMPERILED) {
        if (!confirm("This will reset your game in progress. Click 'OK' to confirm.")) {
            reset = false;
        }
    }

    if (reset) {
        // Don't reload the page. That would wipe preferences.
        gameState = GAME_STATE.PENDING;
        initHangman();
    }
}

function updateStylesheet(selector, property, value) {
    // Adds or changes style in highest index of stylesheet.
    var theStylesheet = document.styleSheets[(document.styleSheets.length - 1)];
    for (var i = 0; i < theStylesheet.cssRules.length; i++) {
        var rule = theStylesheet.cssRules[i];
        if (rule.selectorText === selector) {
            rule.style[property] = value;
            return;
        }
    }

    theStylesheet.insertRule(selector + " { " + property + ": " + value + "; }", 0);
}



// Add support for keyboard-based control/input.
addEventListener('keydown', function (event) {
    if (event.code.substring(0, 3) === "Key") {
        handleGuess(event.code.substring(3));
    } else if (event.keyCode === 13 && event.shiftKey && event.ctrlKey) {
        resetGame();
    }
});

addEventListener('resize', function () {
    updateWindowSize();
});

buttonPreferences.onclick = function () {
    dialogPreferences.style.display = "block";
};

buttonClosePreferences.onclick = function () {
    dialogPreferences.style.display = "none";
};

// When the user clicks anywhere outside of the dialogPreferences, close it
window.onclick = function (event) {
    if (event.target == dialogPreferences) {
        dialogPreferences.style.display = "none";
    }
};


updateMaxMisses();