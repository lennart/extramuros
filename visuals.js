var i = {};
var funct={};
var fadeRate = 100;

var w; // width of our drawing context
var h; // height of our drawing context
var c; // a canvas context to use in live coding of visuals
var draw = function() {}; // redefined in performance, called every animation frame
var play = function(e) {}; // redefined in performance, called with events from server (i.e. /play messages from Tidal)

function setupVisuals() {
    // add a new canvas adjusted to display dimensions and store context for later use
    $('<canvas>').attr({id: "gcanvas"}).css({zIndex: $('canvas').length + 3}).insertBefore('#global');
    $('#global').css({zIndex: $('canvas').length + 3});
    adjustCanvasDimensions();
    c = document.getElementById('gcanvas').getContext('2d');
    c.fillStyle = "white";
    c.strokeStyle = "white";
    // and activate our animation callback function 'tick'
    requestAnimationFrame(tick); // activate our animation callback function 'tick'
    console.log('visuals are set');
};

function adjustCanvasDimensions() {
    w = $("#global").outerWidth();
    h = $("#global").outerHeight();
    var canvas = document.getElementById("gcanvas");
    canvas.width = w;
    canvas.height = h;
}

function tick() {
    draw();
    $.each(funct, function(k,v) { eval(v); });
    requestAnimationFrame(tick);
}

function retick() { // useful if in livecoding an error crashes animation callback
    console.log("retick");
    requestAnimationFrame(tick);
}

function clear () {
    c.save();
    c.setTransform(1,0,0,1,0,0);
    c.clearRect(0,0,w,h)
    c.restore();
};
