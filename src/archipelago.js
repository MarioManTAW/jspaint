import { Client } from "../lib/archipelago.min.js";
import { calculate_similarity, clear, image_invert_colors, reset_canvas_and_history, resize_canvas_without_saving_dimensions, select_tool, set_magnification, undo } from "./functions.js";
import { show_help } from "./help.js";
import { flip_horizontal, flip_vertical } from "./image-manipulation.js";
import { tools } from "./tools.js";

// Create a new instance of the Client class.
const client = new Client();
var slotData = {};
var final_width = 800;
var final_height = 600;
var recent_traps = {};

// Set up an event listener for whenever a message arrives and print the plain-text content to the console.
client.messages.on("message", (content) => {
	console.log(content);
});

var $ap_options_window = $Window({ title: "Archipelago Connection Options", minimizeButton: false, maximizeButton: false, closeButton: false })
	.addClass("maximized").addClass("focused").css({ left: 0, top: 0, width: "100vw", height: "100vh" });
$ap_options_window.$content.append('<p><label>Host: <input name="aphost" value="archipelago.gg"></label></p><p><label>Port: <input name="apport" placeholder="38281"></label></p><p><label>Slot name: <input name="apslot"></label></p><p><label>Password: <input name="appass"></label></p>');
$("<button>Connect!</button>").on("click", function () {
	client.login($("[name=aphost]").val() + ":" + $("[name=apport]").val(), $("[name=apslot]").val(), "Paint", { "password": $("[name=appass]").val() })
		.then(function (e) {
			console.log("Connected to the Archipelago server!", e);
			slotData = e;
			if (slotData.version) $("#appaint-version").text("APWorld Version " + slotData.version);
			if (slotData.final_width) final_width = slotData.final_width;
			if (slotData.final_height) final_height = slotData.final_height;
			goal_canvas.width = final_width;
			goal_canvas.height = final_height;
			$goal.width(final_width)
			$goal.height(final_height)
			diff_canvas.width = final_width;
			diff_canvas.height = final_height;
			$diff.width(final_width)
			$diff.height(final_height)
			sim_canvas.width = final_width;
			sim_canvas.height = final_height;
			$sim.width(final_width)
			$sim.height(final_height)
			$goal_image.attr("src", $goal_image.attr("src") ?? ("images/archipelago/" + final_width + "x" + final_height + ".png"));
			$G.triggerHandler("save-connection-info");
			$G.triggerHandler("restore-colors");
			update();
			select_tool(default_tool);
			if (slotData.death_link) {
				client.deathLink.enableDeathLink();
				client.deathLink.on("deathReceived", function () {
					reset_canvas_and_history();
					update();
				});
			}
			if (slotData.trap_link) {
				client.updateTags(client.arguments.tags.concat(["TrapLink"]));
				client.socket.on("bounced", function (packet, data) {
					if (packet.tags.includes("TrapLink") && data.source != client.name) {
						handleTrap(data.trap_name, true, data);
					}
				});
			}
			client.messages.on("message", onMessage);
			client.items.on("itemsReceived", onReceive);
			client.socket.on("disconnected", function () {
				client.messages.off("message", onMessage);
				client.items.off("itemsReceived", onReceive);
				$ap_options_window.show();
			});
			$ap_options_window.hide();
		})
		.catch(function (e) {
			console.error(e);
			alert(e);
		});
}).appendTo($ap_options_window.$content);

function send(similarity) {
	var locations = [];
	if (version_below("0.4.0")) {
		for (var i = 1; i <= similarity; i++) {
			locations.push(198500 + i);
		}
	}
	else {
		for (var i = 1; i <= similarity * 4; i++) {
			locations.push(198600 + i);
		}
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

function handleTrap(name, isLinked, packet) {
	if (isLinked) {
		if (recent_traps[packet.source] && recent_traps[packet.source].trap_name == name && packet.time - recent_traps[packet.source].time < 1000) {
			return;
		}
		recent_traps[packet.source] = packet;
	}
	switch (name) {
		case "Undo Trap":
		case "Damage Trap":
		case "Fear Trap":
		case "Reversal Trap":
		case "Reverse Trap":
		case "Whoops! Trap":
			if (!slotData.death_link && (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Undo Trap"))) {
				undo();
			}
			break;
		case "Clear Image Trap":
		case "Blue Balls Curse":
		case "Home Trap":
		case "Instant Death Trap":
		case "One Hit KO":
			if (!slotData.death_link && (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Clear Image Trap"))) {
				clear();
			}
			break;
		case "Invert Colors Trap":
		case "Chaos Trap":
		case "Spooky Time":
			if (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Invert Colors Trap")) {
				image_invert_colors();
			}
			break;
		case "Flip Horizontal Trap":
		case "Flip Trap":
		case "Mirror Trap":
			if (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Flip Horizontal Trap")) {
				flip_horizontal();
			}
			break;
		case "Flip Vertical Trap":
		case "Camera Rotate Trap":
		case "Screen Flip Trap":
			if (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Flip Vertical Trap")) {
				flip_vertical();
			}
			break;
		case "Help Trap":
		case "Cutscene Trap":
		case "Exposition Trap":
		case "Hey! Trap":
		case "Literature Trap":
		case "Phone Trap":
		case "Spam Trap":
		case "Text Trap":
		case "Tip Trap":
		case "Tutorial Trap":
			if (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Help Trap")) {
				show_help();
			}
			break;
		case "Zoom In Trap":
		case "Pixelate Trap":
		case "Pixellation Trap":
		case "Spotlight Trap":
		case "Zoom Trap":
			if (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Zoom In Trap")) {
				set_magnification(8);
			}
			break;
		case "Zoom Out Trap":
		case "144p Trap":
		case "Deisometric Trap":
		case "Tiny Trap":
			if (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Zoom Out Trap")) {
				set_magnification(0.25);
			}
			break;
		case "Tool Swap Trap":
		case "Animal Trap":
		case "Eject Ability":
		case "Gadget Shuffle Trap":
		case "Swap Trap":
			if (!slotData.trap_blacklist || !slotData.trap_blacklist.includes("Tool Swap Trap")) {
				var t = tools.filter((a) => a != selected_tool && !a.$button.hasClass("disabled"));
				select_tool(t[Math.floor(Math.random() * t.length)]);
			}
			break;
	}
	if (!isLinked && slotData.trap_link) {
		client.bounce({ tags: ["TrapLink"] }, { time: new Date().getTime(), source: client.name, trap_name: name });
	}
}

function onReceive(items) {
	for (var item of items) {
		if (item.name.endsWith("Trap")) {
			handleTrap(item.name, false, null);
		}
	}
	update();
}

function onMessage(message) {
	$("#text-log").append("<br>" + $("<p>").text(message).html());
}

function update() {
	var c = 2;
	var w = final_width / 2;
	var h = final_height / 2;
	for (var item of received()) {
		switch (item) {
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
				$("#TOOL_" + item.split("/")[0].split(" With")[0].replace(" ", "_").replace("-", "_").toUpperCase() + "").removeClass("disabled");
				break;
			case "Progressive Canvas Width":
				w = Math.min(w + (slotData.canvas_width_increment ?? slotData.canvas_size_increment ?? 100), final_width);
				break;
			case "Progressive Canvas Height":
				h = Math.min(h + (slotData.canvas_height_increment ?? slotData.canvas_size_increment ?? 100), final_height);
				break;
		}
	}
	default_tool = get_tool_by_id("TOOL_" +
		["Brush", "Pencil", "Eraser/Color Eraser", "Airbrush", "Line", "Rectangle", "Ellipse", "Rounded Rectangle"]
			.filter((a) => received().includes(a))[0].split("/")[0].replace(" ", "_").toUpperCase());
	resize_canvas_without_saving_dimensions(w, h);
	$colorbox.rebuild_palette(palette);
	calculate_similarity();
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
	$text_client_window = $Window({ title: localize("Archipelago Text Client"), resizable: true, innerHeight: 300, innerWidth: 600 });
	$text_client_window.onClosed(function () { $("body").append($("#text-client").css("display", "none")); });
	$text_client_window.$content.append($("#text-client").css("display", "flex"));
	$text_client_window.center();
	$("#ap-command").on("keyup", function (e) {
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

export { deathlink, final_height, final_width, received, send, show_text_client, slotData, version_below };

