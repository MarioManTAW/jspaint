// @ts-check
/* global $bottom, $left, $right, button, get_direction, localize, palette, selected_colors */
import { $Component } from "./$Component.js";
import { received } from "./archipelago.js";
// import { get_direction, localize } from "./app-localization.js";
import { show_edit_colors_window } from "./edit-colors.js";
import { $G, E, get_rgba_from_color, make_canvas } from "./helpers.js";

/**
 * Used by the Colors Box and by the Edit Colors dialog.
 * @param {string | CanvasPattern} color
 * @returns {JQuery<HTMLDivElement>}
 **/
function $Swatch(color) {
	const $swatch = $(E("div")).addClass("swatch");
	const swatch_canvas = make_canvas();
	$(swatch_canvas).css({ pointerEvents: "none" }).appendTo($swatch);

	// @TODO: clean up event listener
	$G.on("theme-load", () => { update_$swatch($swatch); });
	$swatch.data("swatch", color);
	update_$swatch($swatch, color);

	return $swatch;
}

function nearest(value, received) {
	var x = 128;
	var a = [0, 255];
	for (var i = 1; i <= received; i++) {
		for (var y of a) {
			if (y + x < 256 && !a.includes(y + x)) a.push(y + x);
			if (y - x >= 0 && !a.includes(y - x)) a.push(y - x);
		}
		x /= 2;
	}
	var c = 0;
	for (var y of a) {
		if (Math.abs(value - y) < Math.abs(value - c)) c = y;
	}
	return c;
}

function legalizeColor(color) {
	var items = received();
	var r = Math.min(items.filter(x => x == "Progressive Color Depth (Red)").length, 7);
	var g = Math.min(items.filter(x => x == "Progressive Color Depth (Green)").length, 7);
	var b = Math.min(items.filter(x => x == "Progressive Color Depth (Blue)").length, 7);
	var rgb = get_rgba_from_color(color);
	return "rgb(" + nearest(rgb[0], r) + "," + nearest(rgb[1], g) + "," + nearest(rgb[2], b) + ")";
}

/**
 * @param {JQuery<HTMLDivElement>} $swatch
 * @param {string | CanvasPattern | undefined=} new_color
 */
function update_$swatch($swatch, new_color) {
	if (new_color instanceof CanvasPattern) {
		$swatch.addClass("pattern");
		$swatch[0].dataset.color = "";
	} else if (typeof new_color === "string") {
		$swatch.removeClass("pattern");
		$swatch[0].dataset.color = new_color;
	} else if (new_color !== undefined) {
		throw new TypeError(`argument to update_$swatch must be CanvasPattern or string (or undefined); got type ${typeof new_color}`);
	}
	new_color = new_color || $swatch.data("swatch");
	new_color = legalizeColor(new_color);
	$swatch.data("swatch", new_color);
	const swatch_canvas = /** @type {PixelCanvas} */ (
		$swatch.find("canvas")[0]
	);
	requestAnimationFrame(() => {
		swatch_canvas.width = $swatch.innerWidth();
		swatch_canvas.height = $swatch.innerHeight();
		if (new_color) {
			swatch_canvas.ctx.fillStyle = new_color;
			swatch_canvas.ctx.fillRect(0, 0, swatch_canvas.width, swatch_canvas.height);
		}
	});
}

/**
 * @param {boolean} vertical
 * @returns {JQuery<HTMLDivElement> & I$Component & I$ColorBox}
 */
function $ColorBox(vertical) {
	const $cb = $(E("div")).addClass("color-box");

	const $current_colors = $Swatch(selected_colors.ternary).addClass("current-colors");
	const $palette = $(E("div")).addClass("palette");

	$cb.append($current_colors, $palette);

	const $foreground_color = $Swatch(selected_colors.foreground).addClass("color-selection foreground-color");
	const $background_color = $Swatch(selected_colors.background).addClass("color-selection background-color");
	$current_colors.append($background_color, $foreground_color);

	$G.on("option-changed", () => {
		update_$swatch($foreground_color, selected_colors.foreground);
		update_$swatch($background_color, selected_colors.background);
		update_$swatch($current_colors, selected_colors.ternary);
	});

	$current_colors.on("pointerdown", () => {
		const new_bg = selected_colors.foreground;
		selected_colors.foreground = selected_colors.background;
		selected_colors.background = new_bg;
		$G.triggerHandler("option-changed");
	});

	const make_color_button = (color) => {

		const $b = $Swatch(color).addClass("color-button");
		$b.appendTo($palette);

		const double_click_period_ms = 400;
		let within_double_click_period = false;
		let double_click_button = null;
		let double_click_tid;
		// @TODO: handle left+right click at same time
		// can do this with mousedown instead of pointerdown, but may need to improve eye gaze mode click simulation
		$b.on("pointerdown", (e) => {
			// @TODO: allow metaKey for ternary color, and selection cropping, on macOS?

			if (button === 0) {
				$c.data("$last_fg_color_button", $b);
			}

			const color_selection_slot = e.ctrlKey ? "ternary" : e.button === 0 ? "foreground" : e.button === 2 ? "background" : null;
			if (color_selection_slot) {
				if (within_double_click_period && e.button === double_click_button) {
					show_edit_colors_window($b, color_selection_slot);
				} else {
					selected_colors[color_selection_slot] = $b.data("swatch");
					$G.trigger("option-changed");
				}

				clearTimeout(double_click_tid);
				double_click_tid = setTimeout(() => {
					within_double_click_period = false;
					double_click_button = null;
				}, double_click_period_ms);
				within_double_click_period = true;
				double_click_button = e.button;
			}
		});
	};

	const build_palette = (palette) => {
		$palette.empty();
		if (!palette) palette = window.default_palette;

		palette.forEach(make_color_button);

		// Note: this doesn't work until the colors box is in the DOM
		const $some_button = $palette.find(".color-button");
		if (vertical) {
			const height_per_button =
				$some_button.outerHeight() +
				parseFloat(getComputedStyle($some_button[0]).getPropertyValue("margin-top")) +
				parseFloat(getComputedStyle($some_button[0]).getPropertyValue("margin-bottom"));
			$palette.height(Math.ceil(palette.length / 2) * height_per_button);
		} else {
			const width_per_button =
				$some_button.outerWidth() +
				parseFloat(getComputedStyle($some_button[0]).getPropertyValue("margin-left")) +
				parseFloat(getComputedStyle($some_button[0]).getPropertyValue("margin-right"));
			$palette.width(Math.ceil(palette.length / 2) * width_per_button);
		}

		// the "last foreground color button" starts out as the first in the palette
		$c.data("$last_fg_color_button", $palette.find(".color-button:first-child"));
	};

	let $c;
	if (vertical) {
		$c = $Component(localize("Colors"), "colors-component", "tall", $cb);
		$c.appendTo(get_direction() === "rtl" ? $left : $right); // opposite ToolBox by default
	} else {
		$c = $Component(localize("Colors"), "colors-component", "wide", $cb);
		$c.appendTo($bottom);
	}

	build_palette();
	$(window).on("theme-change", build_palette);

	// I'm gonna do things messy, got a long road to go!
	// eslint-disable-next-line no-self-assign
	$c = /** @type {JQuery<HTMLDivElement> & I$Component & I$ColorBox} */ ($c);

	$c.rebuild_palette = build_palette;

	return $c;
}

export {
	$ColorBox,
	$Swatch,
	update_$swatch
};

