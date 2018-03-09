// State of the simulator
var running = false;

// Tier of perks that modify skill properties
var perk_unnervingPresence = 0;
var perk_thisIsNotHappening = 0;
var perk_overcharge = 0;

// Info on the current skill check
var sc_running = false;
var sc_ready = false;
var sc_type = 'generator';
var sc_line_pos = 0;
var sc_zone_pos = 0;
var sc_zone = [ 0, 0 ];

// Skill check constant values
var sc_zone_end_padding = 3;
var sc_range_min = 120;
var sc_range_max = 330;

// Stats
var stat_miss = 0;
var stat_good = 0;
var stat_great = 0;

// Audio Elements
var snd_good_1 = new Audio('../res/mp3/sc_good.mp3');
var snd_good_2 = new Audio('../res/mp3/sc_good.mp3');
var snd_good_toggle = false;

var snd_great_1 = new Audio('../res/mp3/sc_great.mp3');
var snd_great_2 = new Audio('../res/mp3/sc_great.mp3');
var snd_great_toggle = false;

var snd_miss_1 = new Audio('../res/mp3/sc_miss.mp3');
var snd_miss_2 = new Audio('../res/mp3/sc_miss.mp3');
var snd_miss_toggle = false;

var snd_open_1 = new Audio('../res/mp3/sc_open.mp3');
var snd_open_2 = new Audio('../res/mp3/sc_open.mp3');
var snd_open_toggle = false;

// Various variables for functionality
var timeout;

// Key listening
// https://stackoverflow.com/questions/12273451/how-to-fix-delay-in-javascript-keydown
var keyState = {};
window.addEventListener('keydown',function(e){
    keyState[e.keyCode || e.which] = true;
    
    // If the user presss "P", toggle the running state
    if (keyState[80]) {
        onStart();
    }
},true);    
window.addEventListener('keyup',function(e){
    keyState[e.keyCode || e.which] = false;
},true);

function isValidTier(tier) {
    return tier > 0 && tier <= 3;
}

function getUnnervingPresenceModifier(tier) {
    // Return the provided size if the tier is out of range
    if (!isValidTier(tier)) {
        return 1.0;
    }
    
    // Calculates the skill check size modifier based on the tier of Unnerving Presence
    // https://deadbydaylight.gamepedia.com/Unnerving_Presence
    //  Tier 1 = 40% reduction
    //  Tier 2 = 50% reduction
    //  Tier 3 = 60% reduction
    return 1.0 - (0.3 + tier * 0.1);
}

function getThisIsNotHappeningModifier(tier) {
    if (!isValidTier(tier)) {
        return 1.0;
    }
    
    // Calculates the skill check size modifier based on the tier of This Is Not Happening
    // https://deadbydaylight.gamepedia.com/This_Is_Not_Happening
    //  Tier 1 = 10% increase
    //  Tier 2 = 20% increase
    //  Tier 3 = 30% increase
    return 1.0 + (tier * 0.1);
}

function getOverchargeSize(tier) {
    if (!isValidTier(tier)) {
        return 26;
    }
    
    // Calculates the skill check size based on the tier of This Is Not Happening
    // https://deadbydaylight.gamepedia.com/Overcharge
    //  Tier 1 = 26 deg
    //  Tier 2 = 23 deg
    //  Tier 3 = 20 deg
    switch (tier) {
        case 1:
            return 26;
        case 2:
            return 23;
        case 3:
            return 20;
    }
}

function getSkillCheckZone(type) {
    // The size of the good and great skill check areas in degrees
    var size = [ 0, 0 ],
        modifier = 1;
    
    switch (type) {
        case 'overcharge':
            size = [ 0, getOverchargeSize(perk_overcharge) ];
            break;
        case 'decisive':
            size = [ 0, 20 ];
            break;
        case 'heal':
        case 'sabotage':
        case 'generator':
            size = [ 35, 10 ];
            break;
    }
    
    // Apply perk modifiers
    modifier = getUnnervingPresenceModifier(perk_unnervingPresence);
    size[0] *= modifier;
    size[1] *= modifier;
    
    if (type !== 'decisive') {
        // Apply perk modifiers
        modifier = getThisIsNotHappeningModifier(perk_thisIsNotHappening);
        var change = (size[1] * modifier) - size[1];
        size[0] -= change;
        size[1] += change;
    }
    
    return size;
}

function getRandomNumber(start, end) {
    // If the start value is greater than the end value, then flip the values
    if (start > end) {
        var temp = start;
        start = end;
        end = temp;
    }
    
    return Math.random() * (start - end) + end;
}

function normalizeAngle(angle) {
    angle %= 360;
    while (angle < 0) {
        angle += 360;
    }
    return angle;
}

function toRadians(angle) {
    return normalizeAngle(angle) * (Math.PI / 180);
}

function updateText() {
    $('#miss').html(stat_miss);
    $('#good').html(stat_good );
    $('#great').html(stat_great);
    $('#start-btn').html(running ? 'Stop' : 'Start');
}

function handleAction(result) {
    sc_ready = false;
    sc_running = false;
    
    switch (result) {
        case 'miss':
            stat_miss++;
            (snd_miss_toggle = !snd_miss_toggle) ? snd_miss_1.play() : snd_miss_2.play();
            break;
        case 'great':
            stat_great++;
            (snd_great_toggle = !snd_great_toggle) ? snd_great_1.play() : snd_great_2.play();
            break;
        case 'good':
            stat_good++;
            (snd_good_toggle = !snd_good_toggle) ? snd_good_1.play() : snd_good_2.play();
            break;
    }
    
    updateText();
    
    // Wait 500ms before being ready to display a new skill check
    setTimeout(function() {
        sc_ready = true;
    }, 500);
}

function resetStats() {
    stat_miss = stat_great = stat_good = 0;
}

function testZone() {
    var currentPos = sc_line_pos,
        zoneStart = sc_zone_pos,
        zoneGreatEnd = zoneStart + sc_zone[1],
        zoneGoodEnd = zoneGreatEnd + sc_zone[0] + sc_zone_end_padding,
        result;
    
    // Find the hit result
    if (currentPos < zoneStart || currentPos > zoneGoodEnd) {
        result = 'miss';
    } else if (currentPos >= zoneStart && currentPos <= zoneGreatEnd) {
        result = 'great';
    } else if (currentPos > zoneGreatEnd && currentPos <= zoneGoodEnd) {
        result = 'good';
    }
    
    handleAction(result);
}

function setupNewZone() {
    // Assuming 0 degrees is the topmost position on the circle and we are rotating clockwise
    //  0 deg = bar start
    //  120  deg = min skill check start
    //  330 deg = max skill check end
    // So the range of a skill check's start position can be determined by [120, (330 - (goodSize + greatSize)]
    
    // Reset the line pos to 0deg (top-most position)
    sc_line_pos = 0;
    
    // Get the new skill check zone sizing
    sc_zone = getSkillCheckZone(sc_type);
    
    // Create a random position where the check will spawn
    sc_zone_pos = getRandomNumber(sc_range_min, sc_range_max - (sc_zone[0] + sc_zone[1]));
}

function drawNewZone() {
    var zoneStart = sc_zone_pos,
            zoneGreatEnd = zoneStart + sc_zone[1],
            zoneGoodEnd = zoneGreatEnd + sc_zone[0];
    
    // Retrieve the zone canvas context
    var canvas = document.getElementById('sc_zone');
    var ctx = canvas.getContext('2d');
    
    // Zone sizing
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;
    var radius = 65;
    var width = 3;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the circle
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, toRadians(zoneStart - 90), toRadians(zoneGoodEnd - 90), true);
    ctx.stroke();
    
    // Draw the great zone
    ctx.lineWidth = (width * 2) + 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, toRadians(zoneStart - 90), toRadians(zoneGreatEnd - 90));
    ctx.stroke();
    
    // Draw the good zone
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + width, toRadians(zoneGreatEnd - 90), toRadians(zoneGoodEnd - 90));
    ctx.arc(centerX, centerY, radius - width, toRadians(zoneGoodEnd - 90), toRadians(zoneGreatEnd - 90), true);
    ctx.stroke();
}

function newSkillCheck() {
    sc_running = true;
    
    // Setup a new random zone
    setupNewZone();
    
    // Draw the new zone
    drawNewZone();
    
    // Skill checks take about 1 second to go around completely,
    // so we can make 100 passes every 10ms and each pass if we
    // increment the rotation by 3.6 degrees, we'll have the equivalent
    // of 360 degrees per second.
    var updateLoop = setInterval(function() {    
        // If the user is pressing space, then handle the zone
        if (sc_running && keyState[32]) {
            testZone();
            return;
        }
        
        // If the running state is no longer active, 
        if (!sc_running) {
            clearInterval(updateLoop);
            return;
        }
        
        // Increment the progress
        sc_line_pos = normalizeAngle(sc_line_pos + 3.6);
        
        // Check if the line pos has exceeded the max zone area
        if (sc_line_pos > sc_zone_pos + sc_zone[0] + sc_zone[1] + sc_zone_end_padding) {
            handleAction('miss');
            clearInterval(updateLoop);
            return;
        }
        
        // Transform the red indicator line
        $('#sc_tick').css({ 'transform': 'rotate(' + sc_line_pos + 'deg)' })
    }, 10);
}

function runSkillChecks() {
    setInterval(function() {
        if (sc_ready) {
            // When a new skillcheck is ready, then make the current one fade out.
            $('#skillcheck').css({ 'opacity': 0 });
            
            if (sc_running || !running)
                return;
            
            timeout = setTimeout(function() {
                if (sc_running || !running)
                    return;
                
                // There are 2 instances of the opening sound to prevent
                // sound overlap issues, using the other one every skill
                // check will prevent this issue.
                (snd_open_toggle = !snd_open_toggle) ? snd_open_1.play() : snd_open_2.play();
            
                // Wait an additional 500ms to show the check
                timeout = setTimeout(function() {
                    if (sc_running || !running)
                        return;
                    
                    // Reset the tick position and reveal the circle
                    $('#sc_tick').css({ 'transform': 'rotate(0deg)' })
                    $('#skillcheck').css({ 'opacity': 1 });
                    
                    // Create a new skill check
                    newSkillCheck();
                }, 500);
            }, getRandomNumber(1500, 2500));
            
            // Set the ready state to false so that this is only ran once until set back to true
            sc_ready = false;
        }
    }, 10);
}

function onStart() {
    if (!running) {
        sc_ready = true;
        running = !running;
        updateText();
    } else {
        var stopTimer = setInterval(function() {
            // Only set the running state to false once the current skill check has been completed.
            if (!sc_running) {
                clearTimeout(stopTimer);
                clearTimeout(timeout);
                running = false;
                updateText();
            }
        }, 10);
    }
}

runSkillChecks();
updateText();
