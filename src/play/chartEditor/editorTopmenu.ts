import { GameSave } from "../../core/gamesave";
import { downloadChart, StateChart } from "./EditorState";

const SIZE_OF_TOPMENU = vec2(125, 25);
const STARTING_POS = vec2(25, 25);
const TEXT_SIZE = SIZE_OF_TOPMENU.y / 2;
const TEXT_WIDTH = formatText({ text: "A", size: TEXT_SIZE }).width;

export type TopMenuMinibutton = {
	text: string;
	action: (ChartState?: StateChart) => void;
	extraCode?: (minibuttonObj: ReturnType<typeof TopMenuButton.makeTopMenuMinibutton>) => void;
};

/** Class to handle the top menu buttons in the chart editor */
export class TopMenuButton {
	title: string;

	/** The minibuttons in a top menu button
	 * @example The top menu button would be file, the minibuttons array could hold something like (new, save, etc)
	 */
	minibuttons: TopMenuMinibutton[] = [];

	/** Is an static array that holds the current buttons */
	static buttons = [
		new TopMenuButton("File", [
			{
				text: "New (Ctrl + N)",
				action: (ChartState: StateChart) => {
					ChartState.createNewSong();
				},
			},
			{
				text: "Open (Ctrl + O)_",
				action: (ChartState: StateChart) => {
					debug.log("WIP");
				},
			},
			{
				text: "Save as... (Ctrl + Shift + S)_",
				action: (ChartState: StateChart) => {
					downloadChart(ChartState);
				},
			},
			{
				text: "Exit (Ctrl + Q)",
				action: () => {
					debug.log("WIP");
				},
			},
		]),
		new TopMenuButton("Edit", [
			{
				text: "Select all (Ctrl + A)",
				action: (ChartState: StateChart) => {
					ChartState.actions.selectall();
				},
			},
			{
				text: "Deselect (Ctrl + D)",
				action: (ChartState: StateChart) => {
					ChartState.actions.deselect();
				},
			},
			{
				text: "Invert selection (Ctrl + I)_",
				action: (ChartState: StateChart) => {
					ChartState.actions.invertselection();
				},
			},
			{
				text: "Delete (Backspace)",
				action: (ChartState: StateChart) => {
					ChartState.actions.delete();
				},
			},
			{
				text: "Copy (Ctrl + C)",
				action: (ChartState: StateChart) => {
					ChartState.actions.copy();
				},
			},
			{
				text: "Cut (Ctrl + X)",
				action: (ChartState: StateChart) => {
					ChartState.actions.cut();
				},
			},
			{
				text: "Paste (Ctrl + V)_",
				action: (ChartState: StateChart) => {
					ChartState.actions.paste();
				},
			},
			{
				text: "Undo (Ctrl + Z)",
				action: (ChartState: StateChart) => {
					ChartState.actions.undo();
				},
			},
			{
				text: "Redo (Ctrl + Y)",
				action: (ChartState: StateChart) => {
					ChartState.actions.redo();
				},
			},
		]),
		new TopMenuButton("View", [
			{
				text: "Info",
				action: () => {
					debug.log("hide info window");
				},
			},
		]),
	];

	static getShortcut(str: string) {
		if (!str.includes("(")) return null;
		return "(" + str.split("(")[1].split(")")[0] + ")";
	}

	static addTopMenuButton() {
		const topButton = add([
			rect(SIZE_OF_TOPMENU.x, SIZE_OF_TOPMENU.y),
			pos(),
			color(BLACK),
			area(),
			opacity(0.5),
			"topmenubutton",
			"hover",
		]);

		topButton.width = SIZE_OF_TOPMENU.x;
		topButton.height = SIZE_OF_TOPMENU.y;

		return topButton;
	}

	static makeTopMenuMinibutton() {
		const minibutton = make([
			rect(3, 3),
			pos(0, SIZE_OF_TOPMENU.y),
			area(),
			color(),
			"tabbutton",
			"hover",
		]);

		return minibutton;
	}

	constructor(title: string, minibuttons: TopMenuMinibutton[]) {
		this.title = title;
		this.minibuttons = minibuttons;
	}
}

/** Manages and adds all of the top menu minibuttons for the chart editor */
export function addTopMenuButtons(ChartState: StateChart) {
	TopMenuButton.buttons.forEach((button, index) => {
		const topButton = TopMenuButton.addTopMenuButton();
		topButton.pos.x = STARTING_POS.x + index * SIZE_OF_TOPMENU.x;
		topButton.pos.y = STARTING_POS.y;

		topButton.onUpdate(() => {
			topButton.opacity = lerp(topButton.opacity, topButton.children.length > 0 ? 1 : 0.5, 0.5);
			topButton.color = lerp(
				topButton.color,
				topButton.isHovering() || topButton.children.length > 0 ? WHITE : BLACK,
				0.5,
			);
		});
		GameSave.editorHue = 0.267;

		topButton.onClick(() => {
			if (topButton.children.length > 0) {
				topButton.removeAll();
			}
			else {
				button.minibuttons.forEach((minibutton, index) => {
					const longest = button.minibuttons.reduce((prev, curr) => {
						if (curr.text.length > prev.length) {
							return curr.text;
						}
						return prev;
					}, "");

					let topMinibutton = TopMenuButton.makeTopMenuMinibutton();
					topMinibutton = topButton.add(topMinibutton);

					const intendedY = SIZE_OF_TOPMENU.y + index * SIZE_OF_TOPMENU.y;

					const theWidth = TEXT_WIDTH * longest.length;
					topMinibutton.width = topButton.width;
					topMinibutton.height = topButton.height;

					if (theWidth < topButton.width) {
						topMinibutton.width = topButton.width;
					}
					else topMinibutton.width = theWidth;

					topMinibutton.onUpdate(() => {
						const intendedColor = topMinibutton.isHovering()
							? WHITE
							: ChartState.bgColor.lerp(WHITE, 0.5);
						topMinibutton.color = lerp(topMinibutton.color, intendedColor, 0.5);

						topMinibutton.pos.y = lerp(
							topMinibutton.pos.y,
							intendedY,
							0.8,
						);
					});

					if (minibutton.text == "hueslider") {
						topMinibutton.onDraw(() => {
							drawSprite({
								sprite: "editorhue",
							});
						});

						let hue = GameSave.editorHue;

						topMinibutton.onUpdate(() => {
							GameSave.editorHue = lerp(GameSave.editorHue, hue, 0.8);
						});

						topMinibutton.onClick(() => {
							hue = mapc(
								mousePos().x,
								topMinibutton.screenPos().x,
								topMinibutton.screenPos().x + topMinibutton.width,
								0,
								1,
							);
							GameSave.save();
						});

						topMinibutton.onDraw(() => {
							drawLine({
								p1: vec2(map(GameSave.editorHue, 0, 1, 0, topMinibutton.width), 0),
								p2: vec2(map(GameSave.editorHue, 0, 1, 0, topMinibutton.width), topMinibutton.height),
								width: 2,
								color: BLACK,
							});
						});
						return;
					}

					topMinibutton.onClick(() => {
						topButton.removeAll();
						minibutton.action(ChartState);
					});

					const hasLine = minibutton.text.includes("_");
					let minibuttonText = minibutton.text.replace("_", "");
					const hasShortcut = minibutton.text.includes("(");
					const shortcut = TopMenuButton.getShortcut(minibuttonText);
					if (hasShortcut) {
						minibuttonText = minibuttonText.replace(shortcut, "");
					}
					topMinibutton.onDraw(() => {
						drawText({
							text: minibuttonText,
							size: TEXT_SIZE,
							pos: vec2(5, 5),
							color: BLACK,
						});

						if (hasLine) {
							drawRect({
								width: topMinibutton.width,
								height: 1,
								color: BLACK,
								pos: vec2(0, topMinibutton.height - 1),
							});
						}

						if (minibutton.text.includes("(")) {
							drawText({
								text: shortcut,
								align: "right",
								anchor: "topright",
								pos: vec2(topMinibutton.width - 5, 5),
								color: BLACK,
								size: TEXT_SIZE,
							});
						}
					});

					if (minibutton.extraCode) {
						minibutton.extraCode(topMinibutton);
					}
				});
			}
		});

		topButton.onDraw(() => {
			drawText({
				text: button.title,
				size: TEXT_SIZE,
				anchor: "center",
				align: "center",
				color: topButton.color.invert(),
				pos: vec2(topButton.width / 2, topButton.height / 2),
			});
		});
	});

	onClick(() => {
		get("topmenubutton").filter((obj) =>
			!obj.isHovering() && obj.children.length > 0 && !obj.children.some((child) => child.isHovering())
		).forEach((obj) => {
			obj.removeAll();
		});
	});
}
