import { GameSave } from "../../../core/save";
import { coolRedo, coolUndo } from "../backend/commands";
import { EditorState } from "../EditorState";

const SIZE_OF_MENUBAR = vec2(125, 25);
const STARTING_POS = vec2(25, 25);
const TEXT_SIZE = SIZE_OF_MENUBAR.y / 2;
const TEXT_WIDTH = formatText({ text: "A", size: TEXT_SIZE }).width;

/** Type for the menu item class */
export type MenuItem = {
	text: string;
	action: () => void;
	extraCode?: (itemObj: ReturnType<typeof MenuBar.makeMenuItem>) => void;
} & {
	checked?: boolean;
};

/** Class to handle the menu bars in the chart editor (File, Edit, View) */
export class MenuBar {
	title: string;

	/** The items in a menubar
	 *
	 * The menubar would be file, the items array could hold something like (new, save, etc)
	 */
	items: MenuItem[] = [];

	/** Is an static object that holds the current menubars */
	static bars = {
		"File": new MenuBar("File", [
			{
				text: "New (Ctrl + N)",
				action: () => EditorState.instance.NewSong(),
			},
			{
				text: "Open (Ctrl + O)\n",
				action: () => EditorState.instance.OpenSong(),
			},
			{
				text: "Save (Ctrl + S)",
				action: () => EditorState.instance.SaveSong(),
			},
			{
				text: "Save as... (Ctrl + Shift + S)\n",
				action: () => EditorState.instance.DownloadSong(),
			},
			{
				text: "Exit (Ctrl + Q)",
				action: () => EditorState.instance.RequestExit(),
			},
		]),
		"Edit": new MenuBar("Edit", [
			{
				text: "Select all (Ctrl + A)",
				action: () => EditorState.instance.performCommand("SelectStamps"),
			},
			{
				text: "Deselect (Ctrl + D)",
				action: () => EditorState.instance.performCommand("DeselectStamps"),
			},
			{
				text: "Invert selection (Ctrl + I)\n",
				action: () => EditorState.instance.performCommand("InvertSelection"),
			},
			{
				text: "Invert moves (Ctrl + F)\n",
				action: () => EditorState.instance.performCommand("FlipMoves"),
			},
			{
				text: "Delete (Backspace)",
				action: () => EditorState.instance.performCommand("DeleteStamps"),
			},
			{
				text: "Copy (Ctrl + C)",
				action: () => EditorState.instance.performCommand("Copy"),
			},
			{
				text: "Cut (Ctrl + X)",
				action: () => EditorState.instance.performCommand("Cut"),
			},
			{
				text: "Paste (Ctrl + V)\n",
				action: () => EditorState.instance.performCommand("Paste"),
			},
			{
				text: "Undo (Ctrl + Z)",
				action: () => coolUndo(),
				extraCode(itemObj) {
					const state = EditorState.instance;
					// TODO: Figure out why the text isn't updating properly onupdate
					itemObj.onUpdate(() => {
						if (state.snapshotIndex == 0) {
							itemObj.item.text = "Undo (Ctrl + Z)";
							itemObj.off = true;
						}
						else {
							itemObj.off = false;
							itemObj.item.text = `Undo ${state.snapshots[state.snapshotIndex].command} (Ctrl + Z)`;
						}
					});
				},
			},
			{
				text: "Redo (Ctrl + Y)",
				action: () => coolRedo(),
				extraCode(itemObj) {
					itemObj.onUpdate(() => {
						const state = EditorState.instance;
						itemObj.onUpdate(() => {
							if (!state.snapshots[state.snapshotIndex + 1]) {
								itemObj.off = true;
								itemObj.item.text = `Redo (Ctrl + Y)`;
							}
							else {
								itemObj.off = false;
								itemObj.item.text = `Redo ${state.snapshots[state.snapshotIndex + 1].command} (Ctrl + Y)`;
							}
						});
					});
				},
			},
		]),
		"View": new MenuBar("View", []),
	};

	/** Gets the shortcut from a string */
	static getShortcut(str: string) {
		if (!str.includes("(")) return null;
		return "(" + str.split("(")[1].split(")")[0] + ")";
	}

	/** Adds a menubar */
	static addMenuBar() {
		const button = add([
			rect(SIZE_OF_MENUBAR.x, SIZE_OF_MENUBAR.y),
			pos(),
			color(BLACK),
			area(),
			opacity(0.5),
			"menubar",
			"hover",
		]);

		button.width = SIZE_OF_MENUBAR.x;
		button.height = SIZE_OF_MENUBAR.y;

		return button;
	}

	/** Makes a menu item */
	static makeMenuItem() {
		const item = make([
			rect(3, 3),
			pos(0, SIZE_OF_MENUBAR.y),
			area(),
			color(),
			"tabbutton",
			"hover",
			{
				/** This means it can't be clicked */
				off: false,
				item: null as MenuItem,
			},
		]);

		return item;
	}

	/** Manages and adds all of the menubar items for the chart editor */
	static setup() {
		const state = EditorState.instance;

		Object.values(MenuBar.bars).forEach((button, index) => {
			const bar = MenuBar.addMenuBar();
			bar.pos.x = STARTING_POS.x + index * SIZE_OF_MENUBAR.x;
			bar.pos.y = STARTING_POS.y;

			bar.onUpdate(() => {
				bar.opacity = lerp(bar.opacity, bar.children.length > 0 ? 1 : 0.5, 0.5);
				bar.color = lerp(
					bar.color,
					bar.isHovering() || bar.children.length > 0 ? WHITE : BLACK,
					0.5,
				);
			});
			GameSave.editorHue = 0.267;

			bar.onClick(() => {
				if (bar.children.length > 0) {
					bar.removeAll();
				}
				else {
					button.items.forEach((item, index) => {
						const longest = button.items.reduce((prev, curr) => {
							if (curr.text.length > prev.length) {
								return curr.text;
							}
							return prev;
						}, "");

						let menuitem = MenuBar.makeMenuItem();
						menuitem = bar.add(menuitem);
						menuitem.item = item;

						const intendedY = SIZE_OF_MENUBAR.y + index * SIZE_OF_MENUBAR.y;

						const theWidth = TEXT_WIDTH * longest.length;
						menuitem.width = bar.width;
						menuitem.height = bar.height;

						if (theWidth < bar.width) {
							menuitem.width = bar.width;
						}
						else menuitem.width = theWidth;

						menuitem.onUpdate(() => {
							if (menuitem.off == false) {
								const intendedColor = menuitem.isHovering()
									? WHITE
									: state.bgColor.lerp(WHITE, 0.5);
								menuitem.color = lerp(menuitem.color, intendedColor, 0.5);
							}
							else {
								menuitem.color = lerp(menuitem.color, state.bgColor.lerp(WHITE, 0.25), 0.5);
							}

							menuitem.pos.y = lerp(
								menuitem.pos.y,
								intendedY,
								0.8,
							);
						});

						menuitem.onClick(() => {
							if (menuitem.off) return;
							bar.removeAll();
							item.action();
						});

						const hasLine = item.text.includes("\n");
						let itemtext = item.text.replace("\n", "");
						const hasShortcut = item.text.includes("(");
						const shortcut = MenuBar.getShortcut(itemtext);
						if (hasShortcut) {
							itemtext = itemtext.replace(shortcut, "");
						}

						menuitem.onDraw(() => {
							drawText({
								text: itemtext,
								size: TEXT_SIZE,
								pos: vec2(5, 5),
								color: BLACK,
							});

							if (hasLine) {
								drawRect({
									width: menuitem.width,
									height: 1,
									color: BLACK,
									pos: vec2(0, menuitem.height - 1),
								});
							}

							if (item.text.includes("(")) {
								drawText({
									text: shortcut,
									align: "right",
									anchor: "topright",
									pos: vec2(menuitem.width - 5, 5),
									color: BLACK,
									size: TEXT_SIZE,
								});
							}

							// checkbox stuff
							if (menuitem.item.checked != undefined) {
								const posOfSquare = vec2(menuitem.width - 5, 12.5);
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

								if (menuitem.item.checked == true) {
									drawRect({
										width: 16,
										height: 16,
										color: BLACK,
										pos: vec2(posOfSquare.x - 2, posOfSquare.y),
										anchor: "right",
									});
								}
							}
						});

						if (item.extraCode) {
							item.extraCode(menuitem);
						}
					});
				}
			});

			bar.onDraw(() => {
				drawText({
					text: button.title,
					size: TEXT_SIZE,
					anchor: "center",
					align: "center",
					color: bar.color.invert(),
					pos: vec2(bar.width / 2, bar.height / 2),
				});
			});
		});

		onClick(() => {
			get("menubar").filter((obj) => !obj.isHovering() && obj.children.length > 0 && !obj.children.some((child) => child.isHovering())).forEach((obj) => {
				obj.removeAll();
			});
		});
	}

	constructor(title: string, items: MenuItem[]) {
		this.title = title;
		this.items = items;
	}
}
