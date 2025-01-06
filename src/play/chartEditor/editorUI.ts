import { Vec2 } from "kaplay";
import { GameSave } from "../../core/gamesave";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { downloadChart, StateChart } from "./EditorState";

const SIZE_OF_TOPMENU = vec2(125, 25);
const STARTING_POS = vec2(25, 25);
const TEXT_SIZE = SIZE_OF_TOPMENU.y / 2;
const TEXT_WIDTH = formatText({ text: "A", size: TEXT_SIZE }).width;

type TopMenuMinibutton = {
	text: string;
	action: (ChartState?: StateChart) => void;
	extraCode?: (minibuttonObj: ReturnType<typeof TopMenuButton.makeTopMenuMinibutton>) => void;
};

class TopMenuButton {
	title: string;
	buttons: TopMenuMinibutton[] = [];
	constructor(title: string, buttons: TopMenuMinibutton[]) {
		this.title = title;
		this.buttons = buttons;
	}
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
}

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

		topButton.onClick(() => {
			if (topButton.children.length > 0) {
				topButton.removeAll();
			}
			else {
				button.buttons.forEach((minibutton, index) => {
					const addLine = minibutton.text.includes("_");

					const longest = button.buttons.reduce((prev, curr) => {
						if (curr.text.length > prev.length) {
							return curr.text;
						}
						return prev;
					}, "");

					const topMinibutton = TopMenuButton.makeTopMenuMinibutton();
					topButton.add(topMinibutton);

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

type EditorTabElementsAction = (editorTabObj: ReturnType<typeof EditorTab.addEditorTab>) => void;

export class EditorTab {
	title: string;
	visible: boolean = true;
	pos: Vec2 = vec2(center());
	private elementsAction: EditorTabElementsAction = () => {};
	static tabs = {
		"Notes": new EditorTab("Notes"),
		// "Events": new EditorTab("Events"),
	};

	static HEADER_COLOR = rgb(30, 29, 36);

	static BODY_COLOR = rgb(43, 42, 51);

	/** Find a tab game object by its instance */
	static findTabByInstance(instance: EditorTab) {
		return get("editorTab").find((editorTabObj: ReturnType<typeof EditorTab.addEditorTab>) =>
			editorTabObj.tab == instance
		);
	}

	addElements(action: EditorTabElementsAction) {
		this.elementsAction = action;
	}

	static addEditorTab(tab: EditorTab) {
		const tabObj = add([
			rect(100, 100, { radius: [0, 0, 10, 10] }),
			pos(),
			anchor("center"),
			color(this.BODY_COLOR),
			"editorTab",
			{
				tab: tab,
			},
		]);

		tabObj.pos = tab.pos;

		tabObj.onDraw(() => {
			drawRect({
				width: tabObj.width,
				height: 30,
				anchor: "botleft",
				color: this.HEADER_COLOR,
				pos: vec2(-tabObj.width / 2, -tabObj.height / 2),
				radius: [10, 10, 0, 0],
			});

			drawText({
				text: tab.title,
				size: 20,
				anchor: "botleft",
				pos: vec2(-tabObj.width / 2 + 10, -tabObj.height / 2 - 2.5),
			});
		});

		tab.elementsAction(tabObj);

		return tabObj;
	}

	constructor(title: string) {
		this.title = title;
	}
}

export function addEditorTabs(ChartState: StateChart) {
	// this goes through each tab and adds a minibutton for it in the view top menu
	const arrayOfMinibuttonsAccordingToTab: TopMenuMinibutton[] = [];
	Object.values(EditorTab.tabs).forEach((tab) => {
		arrayOfMinibuttonsAccordingToTab.push({
			text: tab.title,
			action: () => {
				tab.visible = !tab.visible;
			},
			// this runs some extra code which is an ondraw that serves as a checkbox
			extraCode(minibuttonObj) {
				const posOfSquare = vec2(minibuttonObj.width - 5, 12.5);
				minibuttonObj.onDraw(() => {
					if (tab.visible) {
						drawRect({
							width: 20,
							height: 20,
							color: BLACK,
							pos: posOfSquare,
							anchor: "right",
						});
					}
					else {
						drawRect({
							width: 20,
							height: 20,
							fill: false,
							pos: posOfSquare,
							anchor: "right",
							outline: {
								color: BLACK,
								width: 2,
							},
						});
					}
				});
			},
		});
	});

	// then this sets up the top menu button
	TopMenuButton.buttons[2].buttons = arrayOfMinibuttonsAccordingToTab;

	// and this goes each frame and checks if a tab should be or should not be
	onUpdate(() => {
		Object.values(EditorTab.tabs).forEach((tabInstance) => {
			const tabObjWithTab = EditorTab.findTabByInstance(tabInstance);

			if (tabInstance.visible == true && !tabObjWithTab) EditorTab.addEditorTab(tabInstance);
			else if (tabInstance.visible == false && tabObjWithTab) tabObjWithTab.destroy();
		});
	});

	EditorTab.tabs.Notes.pos = vec2(180, 500);
	EditorTab.tabs.Notes.addElements((editorTabObj) => {
		editorTabObj.width = 240;
		editorTabObj.height = 65;

		const moves: Move[] = ["left", "down", "up", "right"];
		moves.forEach((move, index) => {
			const noteObj = editorTabObj.add([
				sprite(GameSave.noteskin + "_" + move),
				pos(),
				area(),
				opacity(),
				scale(),
				anchor("center"),
				"hover",
			]);

			noteObj.width = 60;
			noteObj.height = 60;
			noteObj.pos.x = (-editorTabObj.width / 2 + index * 60) + noteObj.width / 2;
			noteObj.pos.y = (-editorTabObj.height / 2) + noteObj.height / 2;

			noteObj.onClick(() => {
				ChartState.currentMove = move;
			});

			noteObj.onUpdate(() => {
				noteObj.scale = lerp(noteObj.scale, ChartState.currentMove == move ? vec2(1.2) : vec2(1), 0.8);
				noteObj.opacity = lerp(noteObj.opacity, noteObj.isHovering() ? 0.8 : 0.5, 0.5);
			});
		});
	});

	// EditorTab.tabs.Events.pos = vec2(180, 200);
	// EditorTab.tabs.Events.addElements((editorTabObj) => {
	// 	Object.keys(ChartState.events).forEach((eventKey) => {
	// 		eventKey
	// 	});
	// });
}
