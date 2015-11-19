var ws;
var editors = {};
var sjs;
var modes = [ "tidal", "javascript" ];
var password;
var assert = ((typeof console.assert) === "function") ? function () { console.assert.apply(console, arguments) } : function() {};
function Osc() {}
jQuery.extend(Osc.prototype,jQuery.eventEmitter);
var osc = new Osc();

function setup(nEditors) {
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    var url = 'ws://' + location.hostname + ':8002';
    console.log("attempting websocket connection to " + url);
    ws = new WebSocket(url);
    var socket = new BCSocket(null, { reconnect: true });
    sjs = new sharejs.Connection(socket);
    ws.onopen = function () {
	console.log("extramuros websocket connection opened");
    };
    ws.onerror = function () {
	console.log("ERROR opening extramuros websocket connection");
    };
    ws.onmessage = function (m) {
	var data = JSON.parse(m.data);
	if(data.type == 'osc') {
	    var address = data.address.substring(1);
	    // Tidal-specific double-mappings for incoming /play messages
	    if(address == "play") {
		data.args.name = data.args[1];
		data.args.begin = data.args[3];
		data.args.end = data.args[4];
		data.args.speed = data.args[5];
		data.args.pan = data.args[6];
		data.args.gain = data.args[14];
		// full list of parameters at bottom
	    }
	    $(osc).trigger(address);
	    eval( address + "(data.args)");
	    // ummm... we should check to make sure the function exists first!...
	}
	if(data.type == 'js') {
	    eval(data.code);
	}
	if(data.type == 'feedback') {
	    var fb = $('#feedback');
	    var oldText = fb.val();
	    if(oldText.length > 10000) oldText = ""; // short-term solution...
	    fb.val(oldText+data.text);
	    fb.scrollTop(fb[0].scrollHeight);
	}
    };
    for(var x=1;x<=nEditors;x++) openEditor('edit' + x.toString());
    setupKeyboardHandlers();
    setupVisuals();
    populateModeSelectors();
}


function getPassword() {
    return password;
}

function queryPassword() {
    var dialog = document.getElementById('password-dialog');

    dialog.className = "active"; // show
    dialog.querySelector("form").onsubmit = function(e) {
        var x = dialog.querySelector("#password").value;
        if(x == null || x == "") {
	    alert("You must enter a password to evaluate code.");
	    return null;
        }
        password = x
        dialog.className = ""; // hide
        document.getElementById("global").className = "active";
        var numEditors = document.querySelector("body").dataset.editors
        setup(numEditors);
        e.preventDefault();
    }
}

queryPassword();

function populateModeSelectors() {
    var sidebars = [].slice.call(document.querySelectorAll(".editor .sidebar"));

    var mkOption = function(name, value) {
        var key = name + "-mode";
        var input = document.createElement('input');
        var label = document.createElement('label');
        var text = document.createTextNode(value);
        input.type = "radio";
        input.name = key;
        input.value = value;
        input.dataset.editor = name;

        label.appendChild(input);
        label.appendChild(text);

        return label;
    };
    var mkLabel =
    sidebars.forEach(function(s) {
        var name = s.dataset.editor;
        assert(name.length, "editor name is empty");
        modes.forEach(function(m) {
            var opt = mkOption(name, m);

            s.appendChild(opt);
        });

        var radios = [].slice.call(s.querySelectorAll("[type=radio]"));
        radios.forEach(function(r) {
            r.addEventListener('change', changeMode);
        });
    });


}

function changeMode(event) {
    var name = this.dataset.editor;
    var mode = this.value;
    var cm = editors[name];

    assert(cm, cm);

    cm.setOption("mode", mode);
    assert(cm.getOption("mode") == mode, mode);
}

function evaluateBuffer(name) {
    var password = getPassword();
    if(password) {
        // editors[name].save();
	var msg = { request: "eval", bufferName: name, password: password };
        var content = editors[name].getValue();
        console.log("[buffer:content]", content);


	ws.send(JSON.stringify(msg));
    }
}

function evaluateJavaScriptGlobally(code) {
    var password = getPassword();
    if(password) {
	var msg = { request: "evalJS", code: code, password: password };
	ws.send(JSON.stringify(msg));
    }
}

function openEditor(name) {
    var elem = document.getElementById(name);
    if( elem != null) {
        var doc = sjs.get('extramuros', name, function(err, data) {
            if (err) {
                console.error("[open:editor]", err);
            }
            else {
                console.log("[open:editor]", data);
            }
        });

       doc.subscribe();
       doc.whenReady(function() {
            if (!doc.type) { doc.create('text'); }

            if (doc.type && doc.type.name === 'text') {
		elem.disabled = false;

                editors[name] = CodeMirror.fromTextArea(elem, {
                    mode: modes[0],
                    theme: 'rubyblue',
                    inputStyle: 'contenteditable',
                    viewportMargin: Infinity,
                    extraKeys: {
                        'Shift-Enter': function(cm) {
                            console.log("[kbd:eval]", name);
                            evaluateBuffer(name);
                        },
                        'Ctrl-Enter': function(cm) {
                            var code = cm.getValue();
                            eval(code);
                            console.log("[kbd:js:eval]", code);
                        },
                        'Tab': function(cm) {
                            var indentUnit = cm.getOption("indentUnit");
                            console.log("[tab]", indentUnit);
                            var spaces = Array(indentUnit + 1).join(" ");
                            cm.replaceSelection(spaces);
                        }
                    }
                });
		doc.attachCodeMirror(editors[name]);
            }
       });
    }
}

function setupKeyboardHandlers() {
    $('textarea').keydown(function (event) {
	if(event.which == 13 && event.shiftKey && event.ctrlKey) {
	    // ctrl+shift+enter: evaluate buffer as Javascript through server
	    event.preventDefault();
	    var code = $(this).val();
	    evaluateJavaScriptGlobally(code);
	}
	// else if(event.which == 13 && event.ctrlKey) {
	//     // ctrl+Enter: evaluate text as JavaScript in local browser
	//     event.preventDefault();
	//     var code = $(this).val();
	//     eval(code);
        //     console.log("js eval");
	// }
	// else if(event.which == 13 && event.shiftKey) {
	//     // shift+Enter: evaluate buffer globally through the server
	//     event.preventDefault();
	//     evaluateBuffer(event.target.id);
	// }
	else if(event.which == 67 && event.ctrlKey && event.shiftKey) {
	    // ctrl+shift+c: global clear() on visuals
	    event.preventDefault();
	    evaluateJavaScriptGlobally("clear();");
	}
	else if(event.which == 82 && event.ctrlKey && event.shiftKey) {
	    // ctrl+shift+r: global retick() on visuals
	    event.preventDefault();
	    evaluateJavaScriptGlobally("retick();");
	}
	else if(event.which == 67 && event.altKey) {
	    // alt+c: global clear() on visuals
	    event.preventDefault();
	    evaluateJavaScriptGlobally("clear();");
	}
	else if(event.which == 82 && event.altKey) {
	    // alt+r: global retick() on visuals
	    event.preventDefault();
	    evaluateJavaScriptGlobally("retick();");
	}
    });
}

// path = "/play",
// params = [
//1// S "sound" Nothing,
//2// F "offset" (Just 0),
//3// F "begin" (Just 0),
//4// F "end" (Just 1),
//5// F "speed" (Just 1),
//6// F "pan" (Just 0.5),
//7// F "velocity" (Just 0),
//8// S "vowel" (Just ""),
//9// F "cutoff" (Just 0),
//10// F "resonance" (Just 0),
//11// F "accelerate" (Just 0),
//12// F "shape" (Just 0),
//13// I "kriole" (Just 0),
//14// F "gain" (Just 1),
//15// I "cut" (Just (0)),
//16// F "delay" (Just (0)),
//17// F "delaytime" (Just (-1)),
//18// F "delayfeedback" (Just (-1)),
//19// F "crush" (Just 0),
//20// I "coarse" (Just 0),
//21// F "hcutoff" (Just 0),
//22// F "hresonance" (Just 0),
//23// F "bandf" (Just 0),
//24// F "bandq" (Just 0),
//25// S "unit" (Just "rate"),
//26// I "loop" (Just 1)
// ]
