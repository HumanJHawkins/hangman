// Initialize global constants/statics. Load word list, etc.
let GAME_STATE = Object.freeze({
    "ERROR": 0,
    "PENDING": 1,
    "PROGRESSING": 2,   // Game in progress.
    "IMPERILED": 3,     // Game in progress. Player in danger of losing. Triggers "worried" hangman graphic.
    "WON": 4,
    "LOST": 5
});

let HANGMAN_PART = Object.freeze({
    "FRAME": 1,
    "GALLOWS": 2,   // TO DO: Implement draw of gallows.
    "ROPE": 3,
    "NOOSE": 4,     // TO DO: Implement draw of noose. Could be done on loss without changes to current drawing.
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

let theCanvas;
let theContext;
let gameState;
let windowHeight;
let windowWidth;
let dialogPreferences;
let buttonPreferences;
let buttonClosePreferences;
let dialogHelp;
let buttonHelp;
let buttonCloseHelp;
let dialogAbout;
let buttonAbout;
let buttonCloseAbout;
let letterDisplayColumns;
let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let alphabetGuesses;                // Letters guessed so far, inclusive of correct and incorrect.
let wordPool;                       // Full word pool (Read in on first page load.)
let wordPoolFiltered;               // Portion of word pool allowed by preference controls.
let word;
let hitCount;                       // Count of letters exposed. Not necessarily count of correct guesses.
let missCount;
let maxMisses;

// Load the full word list.
let vocabRequest = new XMLHttpRequest();
vocabRequest.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
        wordPool = JSON.parse(this.responseText);
    }
};
vocabRequest.open("GET", "hangmanVocab.json", false);
vocabRequest.send();

// Function declarations
function newGame() {
    hitCount = 0;
    missCount = 0;

    // Initialize guesses to <nothing guessed yet>
    alphabetGuesses = [];
    for (let i = 0; i < alphabet.length; i++) {
        alphabetGuesses.push(false);
    }

    updateGameState();          // Will be "PENDING" if hitCount and missCount are 0.
    handleDisplaySize();        // Requires defined alphabetGuesses, hitCount, misscount. Handles full screen draw.
    updateMaxMisses();          // Pulls from game difficulty preference, built in handleDisplaySize().
    updateEnabledState();       // Requires preference controls created in handleDisplaySize().
    updateWordPoolFiltered();   // Requires div created in handleDisplaySize(). Also selects word and redraws if gameState pending.
}

function handleDisplaySize() {
    // Window dimensions in pixels. Although we use view width for almost everything, most decisions about layout are
    //   best made based on actual pixel count, or aspect ratio.
    windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    handleDisplayRefresh();
}

function handleDisplayRefresh() {
    // The letter table and word minimally occupies about 60% of width in horizontal layout and 50% of height in
    // vertical layout. Therefore, optimal layout depends on the ratio of 50% height / 60% width.
    //
    // Once basic layout is determined, we can tweak it based on actual screen size, within the scope of the overall
    // layout. See also:
    //   https://docs.microsoft.com/en-us/windows/uwp/design/layout/screen-sizes-and-breakpoints-for-responsive-design
    let useTallLayout = (windowHeight * 0.5) / (windowWidth * .6) > 1;

    if (useTallLayout) {
        // Tall Layout
        updateStylesheet("canvas", "float", "none");
        updateStylesheet("canvas", "margin-right", "0vw");
        document.getElementById("entirePage").innerHTML =
            "<h1>Hangman" +
            "<img src=\"hangmanImage/blank.png\" alt=\"\" class=\"iconButtonSpacer\"/>" +
            "<img src=\"hangmanImage/blank.png\" alt=\"\" class=\"iconButtonSpacer\"/>" +
            "<img src=\"hangmanImage/blank.png\" alt=\"\" class=\"iconButtonSpacer\"/>" +
            "<img src=\"hangmanImage/preferences.png\" alt=\"Preferences\" onClick=\"showPreferences()\" class=\"iconButtonImage\"/>" +
            "<img src=\"hangmanImage/help.png\" alt=\"Help\" onClick=\"showHelp()\" class=\"iconButtonImage\"/>" +
            "<img src=\"hangmanImage/about.png\" alt=\"About\" onClick=\"showAbout()\" class=\"iconButtonImage\"/>" +
            "<img src=\"hangmanImage/blank.png\" alt=\"\" class=\"iconButtonSpacer\"/>" +
            "<img src=\"hangmanImage/newGame.png\" alt=\"New Game\" onClick=\"resetGame()\" class=\"iconButtonImage\"/>" +
            "</h1>" +
            "<div id=\"divCanvas\"><canvas id=\"hangmanCanvas\"></canvas></div>" +
            "<div id=\"divLetters\"></div>" +
            "<div id=\"divWord\"></div>";
    } else {
        // Wide Layout
        updateStylesheet("canvas", "float", "left");
        updateStylesheet("canvas", "margin-right", "2vw");
        document.getElementById("entirePage").innerHTML =
            "<div id=\"divCanvas\"><canvas id=\"hangmanCanvas\"></canvas></div>" +
            "<div id=\"divNonCanvas\">" +
            "<h1>Hangman" +
            "<img src=\"hangmanImage/blank.png\" alt=\"\" class=\"iconButtonSpacer\"/>" +
            "<img src=\"hangmanImage/blank.png\" alt=\"\" class=\"iconButtonSpacer\"/>" +
            "<img src=\"hangmanImage/blank.png\" alt=\"\" class=\"iconButtonSpacer\"/>" +
            "<img src=\"hangmanImage/preferences.png\" alt=\"Preferences\" onClick=\"showPreferences()\" class=\"iconButtonImage\"/>" +
            "<img src=\"hangmanImage/help.png\" alt=\"Help\" onClick=\"showHelp()\" class=\"iconButtonImage\"/>" +
            "<img src=\"hangmanImage/about.png\" alt=\"About\" onClick=\"showAbout()\" class=\"iconButtonImage\"/>" +
            "<img src=\"hangmanImage/blank.png\" alt=\"\" class=\"iconButtonSpacer\"/>" +
            "<img src=\"hangmanImage/newGame.png\" alt=\"New Game\" onClick=\"resetGame()\" class=\"iconButtonImage\"/>" +
            "</h1>" +
            "<div id=\"divLetters\"></div>" +
            "</div>" +
            "<div id=\"divWord\"></div>";
    }

    // Create canvas in new divs before continuing
    theCanvas = document.getElementById("hangmanCanvas");
    theContext = theCanvas.getContext("2d");
    theCanvas.width = 400;
    theCanvas.height = 500;
    let canvasWidthHeightRatio = theCanvas.width / theCanvas.height;
    let canvasHeightWidthRatio = theCanvas.height / theCanvas.width;

    if (useTallLayout) {
        // If tall, set height up to 50%, as long as width fits the visible page.
        let idealHeight = windowHeight * 0.5;
        let maxHeight = windowWidth * canvasHeightWidthRatio;
        let height = (idealHeight <= maxHeight) ? idealHeight : maxHeight;
        updateStylesheet("canvas", "width", "inherit");
        updateStylesheet("canvas", "height", height + "px");
    } else {
        // If wide, set width up to 32%, as long as height fits the visible page.
        let idealWidth = windowWidth * 0.32;
        let maxWidth = (windowHeight * .92) * canvasWidthHeightRatio; // *.92 to accomodate margins
        let width = (idealWidth <= maxWidth) ? idealWidth : maxWidth;
        updateStylesheet("canvas", "width", width + "px");
        updateStylesheet("canvas", "height", "inherit");
    }

    dialogPreferences = document.getElementById('preferences');
    buttonPreferences = document.getElementById("btnPreferences");
    buttonClosePreferences = document.getElementById("btnClosePreferences");
    dialogHelp = document.getElementById('help');
    buttonHelp = document.getElementById("btnHelp");
    buttonCloseHelp = document.getElementById("btnCloseHelp");
    dialogAbout = document.getElementById('about');
    buttonAbout = document.getElementById("btnAbout");
    buttonCloseAbout = document.getElementById("btnCloseAbout");

    if (Math.max(document.documentElement.clientWidth, window.innerWidth || 0) > 1000) {
        letterDisplayColumns = 13;
    } else {
        letterDisplayColumns = 9;
    }

    drawHangmanWord();
    drawLetterTable();
    drawHangman();
}

function showPreferences() {
    dialogPreferences.style.display = 'block';
}

function showHelp() {
    dialogHelp.style.display = 'block';
}

function showAbout() {
    dialogAbout.style.display = 'block';
}

function updateMaxMisses() {
    if (gameState === GAME_STATE.PROGRESSING || gameState === GAME_STATE.IMPERILED) {
        if (confirm("Apply this difficulty change to the current game?\n\nClick 'Cancel' to finish this game " +
            "first. Your changes will apply to the next game.")) {
            // Dismiss the preferences dialog.
            dialogPreferences.style.display = "none";
            maxMisses = parseInt(document.getElementById('gameDifficulty').value);
            updateGameState();
            handleDisplayRefresh();
            return;
        } else {
            return;
        }
    }

    maxMisses = parseInt(document.getElementById('gameDifficulty').value);
    drawHangman();
}

function updateGameState() {
    if (hitCount + missCount === 0 || word === undefined) {
        gameState = GAME_STATE.PENDING;
    } else if (missCount >= maxMisses) {    // Greater than can happen if difficulty changed mid-game.
        gameState = GAME_STATE.LOST;
    } else if (hitCount === word.length) {
        gameState = GAME_STATE.WON;
    } else if (hitCount < 0 || hitCount > word.length || missCount < 0) {
        gameState = GAME_STATE.ERROR;
    } else if (missCount >= (maxMisses * .6)) {
        gameState = GAME_STATE.IMPERILED;
    } else {
        gameState = GAME_STATE.PROGRESSING;
    }
}

function updateEnabledState() {
    // Relying on the preferences button handling to prevent getting here without warning. So default all to enabled.
    document.getElementById("gameDifficulty").disabled = false;
    document.getElementById("wordLength").disabled = false;
    document.getElementById("wordLevel").disabled = false;

    // disable all that would produce a zero-length word list.
    // TO DO: Create one-time (on startup) function to govern this on loading the word list.
}

function updateWordPoolFiltered() {
    wordPoolFiltered = [];
    for (let i = 0; i < wordPool.length; i++) {
        if (wordPool[i].vocabWord.length >= JSON.parse(document.getElementById("wordLength").value).low &&
            wordPool[i].vocabWord.length <= JSON.parse(document.getElementById("wordLength").value).high &&
            wordPool[i].wordGrade >= JSON.parse(document.getElementById("wordLevel").value).low &&
            wordPool[i].wordGrade <= JSON.parse(document.getElementById("wordLevel").value).high) {
            wordPoolFiltered.push({"vocabWord": wordPool[i].vocabWord, "wordGrade": wordPool[i].wordGrade})
        }
    }

    document.getElementById("divWordCount").innerHTML = "<p>There are " + wordPoolFiltered.length +
        " words available for these selections.</p>";

    if (gameState === GAME_STATE.PENDING) {
        word = updateHangmanWord();
        drawHangmanWord();
    } else {
        if (confirm("Reset the game with a new word based on these options?\n\nClick 'Cancel' to finish this game " +
            "first, having your changes apply to the next game.")) {
            newGame();
            dialogPreferences.style.display = "none";

        }
    }
}

function updateHangmanWord() {
    return wordPoolFiltered[randIntBetween(0, wordPoolFiltered.length)].vocabWord.toUpperCase();
}

function randIntBetween(randMin, randMax) {
    return Math.floor(Math.random() * (randMax - randMin + 1) + randMin);
}

function drawHangmanWord() {
    if (!word) return;
    let wordDisplay = '<p class="hangmanWord">';
    for (let i = 0; i < word.length; i++) {
        if (alphabetGuesses[alphabet.indexOf(word.charAt(i))] === true) {
            wordDisplay = wordDisplay + word.charAt(i);
        } else {
            if (gameState === GAME_STATE.LOST) {  // Unmask hidden letters on loss.
                wordDisplay = wordDisplay + '<span class = "missedLetter">' + word.charAt(i) + "</span>";
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
    let guessHTML = '<table>';
    for (let i = 0; i < alphabet.length;) {    // Increment "i" only once per "j" number of letters (so, not here).
        guessHTML = guessHTML + '<tr>';
        for (let j = 0; j < letterDisplayColumns; j++) {
            if (i < alphabet.length) {
                if (alphabetGuesses[i]) {
                    if (word.indexOf(alphabet.charAt(i)) > -1) {
                        guessHTML = guessHTML + '<td><button class="letterBtn letterBtnHit" disabled>' +
                            alphabet.charAt(i) + '</button></td>';
                    } else {
                        guessHTML = guessHTML + '<td><button class="letterBtn letterBtnMiss" disabled>' +
                            alphabet.charAt(i) + '</button></td>';
                    }
                } else {
                    if (gameState === GAME_STATE.LOST) {
                        if (word.indexOf(alphabet.charAt(i)) > -1) {
                            guessHTML = guessHTML + '<td><button class="letterBtn letterBtnActive" disabled>' +
                                alphabet.charAt(i) + '</button></td>';
                        } else {
                            guessHTML = guessHTML + '<td><button class="letterBtn" disabled>' +
                                alphabet.charAt(i) + '</button></td>';
                        }
                    } else {
                        guessHTML = guessHTML + '<td><button class="letterBtn" onClick="handleGuess(\'' + alphabet.charAt(i) +
                            '\')">' + alphabet.charAt(i) + '</button></td>';
                    }
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
            let hitIndex = 0;
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
    handleDisplayRefresh();
}

function drawHangman() {
    theContext.clearRect(0, 0, theCanvas.width, theCanvas.height);
    theContext.lineWidth = "3";
    theContext.lineCap = "round";

    let hangmanParts = getHangmanParts();
    for (let i = 0; i < hangmanParts.length; i++) {
        drawHangmanPart(hangmanParts[i]);
    }
}

function getHangmanParts() {
    let hangmanParts = [];
    let step = getHangmanDrawStep();

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
        // TO DO: Add Noose here.
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
    // Identifies which multiple parts to draw when game difficulty is more difficult than default.
    if (gameState === GAME_STATE.WON || gameState === GAME_STATE.LOST) {
        return 10;
    } else if (maxMisses === 10) {
        return missCount;
    } else if (maxMisses === 7) {
        if (missCount === 1) {
            return 2;
        } else if (missCount === 2) {  // For example, when max misses is 7 and the user has missed two, we draw 4 body parts.
            return 4;
        } else if (missCount === 3) {
            return 5;
        } else if (missCount === 4) {
            return 6;
        } else if (missCount === 5) {
            return 7;
        } else if (missCount === 6) {
            return 8;
        }
    } else if (maxMisses === 5) {
        if (missCount === 1) {
            return 2;
        } else if (missCount === 2) {
            return 4;
        } else if (missCount === 3) {
            return 6;
        } else if (missCount === 4) {
            return 8;
        }
    } else if (maxMisses === 3) {
        if (missCount === 1) {
            return 4;
        } else if (missCount === 2) {
            return 8;
        }
    }
}

function drawHangmanPart(thePart) {
    let winOffset;  // On win, we'll draw the same figure lower (on the ground). So, add offset to move it.
    if (gameState === GAME_STATE.WON) {
        winOffset = 76;
    } else {
        winOffset = 0;
    }

    let left = 0;
    let right = theCanvas.width - left;
    let top = 0;
    let bottom = theCanvas.height - top;
    let middle = theCanvas.width / 2;
    let widthFactor = theCanvas.width / 200;
    let heightFactor = theCanvas.height / 250;

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
    // From and copyright Steve Tranby via:
    //   https://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
    let kappa = .5522848,
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
    // From and copyright Steve Tranby via:
    //   https://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
    drawEllipse(cx - w / 2.0, cy - h / 2.0, w, h);
}

function resetGame() {
    // If game is in progress, confirm reset.
    let reset = true;
    if (gameState === GAME_STATE.PROGRESSING || gameState === GAME_STATE.IMPERILED) {
        if (!confirm("This will reset your game in progress. Click 'OK' to confirm.")) {
            reset = false;
        }
    }

    if (reset) {
        // Don't reload the page. That would wipe preferences.
        gameState = GAME_STATE.PENDING;
        newGame();
    }
}

function updateStylesheet(selector, property, value) {
    // Adds or changes style in highest index of stylesheet.
    let theStylesheet = document.styleSheets[(document.styleSheets.length - 1)];
    for (let i = 0; i < theStylesheet.cssRules.length; i++) {
        let rule = theStylesheet.cssRules[i];
        if (rule.selectorText === selector) {
            rule.style[property] = value;
            return;
        }
    }
    theStylesheet.insertRule(selector + " { " + property + ": " + value + "; }", 0);
}

// Based on https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
window.addEventListener("keydown", function (event) {
    if (event.defaultPrevented) {
        return; // Should do nothing if the default action has been cancelled
    }

    let handled = false;
    let theKey;

    if (event.key !== undefined) {
        // Use "key' if available as this is most standard.
        theKey = event.key.toUpperCase();
    } else if (event.keyCode !== undefined) {
        // Where 'key' is unsupported, the deprecated 'keyCode' will usually work.
        alert('Key Code: ' + event.keyCode);
        if (event.keyCode === 13) {
            theKey = 'ENTER';
        } else {
            theKey = String.fromCharCode(event.keyCode);
        }
    } else {
        // In theory, implementing handling by event.keyIdentifier could be required in some
        //  environments. But there is no evidence that this is needed, and no environment
        //  to test it has been identified.
    }

    if (theKey.length === 1) {
        if (theKey >= "A" && theKey <= "Z") {
            handleGuess(theKey);
            handled = true;
        }
    } else if (theKey === 'ENTER' && event.shiftKey && event.ctrlKey) {
        resetGame();
    }

    if (handled) {
        // Suppress "double action" if event handled
        event.preventDefault();
    }
}, true);


addEventListener('resize', function () {
    handleDisplaySize();
});

window.onclick = function (event) {
    // When the user clicks anywhere outside of the dialogPreferences, close it
    if (event.target === dialogPreferences) {
        dialogPreferences.style.display = "none";
    }
    // Or help window
    if (event.target === dialogHelp) {
        dialogHelp.style.display = "none";
    }
    // Or about window
    if (event.target === dialogAbout) {
        dialogAbout.style.display = "none";
    }
};
