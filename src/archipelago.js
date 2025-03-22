import { Client } from "../lib/archipelago.min.js";
import { clear, image_invert_colors, reset_canvas_and_history, resize_canvas_without_saving_dimensions, select_tool, undo } from "./functions.js";
import { flip_horizontal, flip_vertical } from "./image-manipulation.js";

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
			$goal_image.src = "images/archipelago/" + slotData.goal_image + ".png";
			update();
			select_tool(default_tool);
			if (slotData.death_link) {
				client.deathLink.enableDeathLink();
				client.deathLink.on("deathReceived", function () {
					reset_canvas_and_history();
					update();
				})
			}
			client.messages.on("message", function (message) {
				$("#text-log").append("<br>" + message);
			})
			client.items.on("itemsReceived", function (items) {
				for (var item of items) {
					if (item.trap) {
						switch (item.name) {
							case "Undo Trap":
								undo();
								break;
							case "Clear Image Trap":
								clear();
								break;
							case "Invert Colors Trap":
								image_invert_colors();
								break;
							case "Flip Horizontal Trap":
								flip_horizontal();
								break;
							case "Flip Vertical Trap":
								flip_vertical();
								break;
						}
					}
				}
				update();
			});
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
	for (var item of client.items.received) items.push(item.name);
	if (version_below("0.2.0")) {
		items.push("Magnifier");
		items.push("Brush");
	}
	return items;
}

function update() {
	var c = 2;
	var w = 400;
	var h = 300;
	for (var item of received()) {
		switch (item) {
			case "Additional Palette Color":
				c++;
				if (c > palette.length) palette.push("#FFFFFF");
				break;
			case "Pencil":
			case "Brush":
				default_tool = get_tool_by_id("TOOL_" + item.toUpperCase());
			case "Free-Form Select":
			case "Select":
			case "Eraser/Color Eraser":
			case "Fill With Color":
			case "Pick Color":
			case "Magnifier":
			case "Airbrush":
			case "Text":
			case "Line":
			case "Curve":
			case "Rectangle":
			case "Polygon":
			case "Ellipse":
			case "Rounded Rectangle":
				$('[title="' + item + '"]').removeClass("disabled");
				break;
			case "Progressive Canvas Width":
				if (w < 800) w += 100;
				break;
			case "Progressive Canvas Height":
				if (h < 600) h += 100;
				break;
		}
	}
	resize_canvas_without_saving_dimensions(w, h);
	$colorbox.rebuild_palette(palette);
}

function deathlink(method) {
	if (slotData.death_link) {
		switch (method) {
			case "undo":
				client.deathLink.sendDeathLink(client.name, client.name + " made a minor mistake.");
				break;
			case "clear":
				client.deathLink.sendDeathLink(client.name, client.name + " decided to start over.");
				break;
			default:
				client.deathLink.sendDeathLink(client.name);
				break;
		}
	}
}

/** @type {OSGUI$Window} */
let $text_client_window;

function show_text_client() {
	if ($text_client_window) {
		$text_client_window.close();
		$("#ap-command").off("keyup");
	}
	$text_client_window = $Window({ title: localize("Archipelago Text Client"), resizable: true });
	$text_client_window.$content.append($("#text-client").css("display", "flex"));
	$text_client_window.center();
	$("#ap-command").on("keyup", function (e) {
		console.log(e);
		if (e.key == "Enter" && $("#ap-command").val().trim()) {
			client.messages.say($("#ap-command").val());
			$("#ap-command").val("");
		}
	});
}

function version_below(version) {
	if (!slotData.version) return true;
	var t = version.split(".");
	var v = slotData.version.split(".");
	if (parseInt(v[0]) > parseInt(t[0])) return false;
	if (parseInt(v[0]) < parseInt(t[0])) return true;
	if (parseInt(v[1]) > parseInt(t[1])) return false;
	if (parseInt(v[1]) < parseInt(t[1])) return true;
	if (parseInt(v[2]) > parseInt(t[2])) return false;
	if (parseInt(v[2]) < parseInt(t[2])) return true;
	return false;
}

export { deathlink, received, send, show_text_client, slotData, version_below };

