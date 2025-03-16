import { Client } from "../lib/archipelago.min.js";
import { $ColorBox } from "./$ColorBox.js";
import { resize_canvas_without_saving_dimensions } from "./functions.js";

// Create a new instance of the Client class.
const client = new Client();
var slotData = {}

// Set up an event listener for whenever a message arrives and print the plain-text content to the console.
client.messages.on("message", (content) => {
	console.log(content);
});

var $ap_options_window = $Window({ title: "Archipelago Connection Options", minimizeButton: false, maximizeButton: false, closeButton: false })
	.addClass("maximized").addClass("focused").css({ left: 0, top: 0, width: "100vw", height: "100vh" });
$ap_options_window.$content.append('<p><label>Host: <input name="aphost"></label></p><p><label>Port: <input name="apport"></label></p><p><label>Slot name: <input name="apslot"></label></p><p><label>Password: <input name="appass"></label></p>');
$("<button>Connect!</button>").on("click", function () {
	client.login($("[name=aphost]").val() + ":" + $("[name=apport]").val(), $("[name=apslot]").val(), "Paint", { "password": $("[name=appass]").val(), })
		.then(function (e) {
			console.log("Connected to the Archipelago server!", e);
			slotData = e;
			update();
			client.items.on("itemsReceived", function (x) { update() });
			$ap_options_window.hide();
		})
		.catch(console.error)
}).appendTo($ap_options_window.$content);

function send(similarity) {
	var locations = [];
	for (var i = 1; i <= similarity; i++) {
		locations.push(198500 + i);
	}
	client.check(...locations);
	if (similarity >= slotData.goal_percent) client.goal();
}

function received() {
	var items = [];
	for (var x of client.items.received) items.push(x.name);
	return items;
}

function update() {
	var c = 2;
	var w = 400;
	var h = 300;
	for (var x of client.items.received) {
		switch (x.name) {
			case "Additional Palette Color":
				c++;
				if (c > palette.length) palette.push("#FFFFFF");
				break;
			case "Free-Form Select":
			case "Select":
			case "Eraser/Color Eraser":
			case "Fill With Color":
			case "Pick Color":
			case "Magnifier":
			case "Pencil":
			case "Brush":
			case "Airbrush":
			case "Text":
			case "Line":
			case "Curve":
			case "Rectangle":
			case "Polygon":
			case "Ellipse":
			case "Rounded Rectangle":
				$('[title="' + x.name + '"]').removeClass("disabled");
				break;
			case "Progressive Canvas Width":
				w += 100;
				break;
			case "Progressive Canvas Height":
				h += 100;
				break;
		}
	}
	resize_canvas_without_saving_dimensions(w, h);
	$ColorBox.build_palette(palette);
}

export { received, send, slotData };

