import { GameObj, KEventController, Vec2 } from "kaplay";
import { drag } from "../../../core/drag";
import { Sound } from "../../../core/sound";
import { utils } from "../../../utils";
import { StateChart } from "../EditorState";
import { MenuBar, MenuItem } from "./menubar";
import { defineEventTab } from "./tabs/events";
import { defineNotesTab } from "./tabs/notes";
import { defineSongMetadataTab } from "./tabs/songmetadata";
import { defineSyncTab } from "./tabs/sync";

/** The type for the {@link EditorTab.addElements `addElements()`} function in {@link EditorTab} */
type EditorTabElementsAction = (editorTabObj: ReturnType<typeof EditorTab.addEditorTab>) => void;

/** Class to handle the tabs found in the {@link MenuBar.bars `TopMenuButton.buttons`} TopMenu (for the chart editor) */
export class EditorTab {
	/** The title of the tab */
	title: string;

	/** Wheter the tab should be or not */
	visible: boolean = true;

	/** The center position of the tab */
	pos: Vec2 = vec2(center());

	/** Holds the actual function to run to add the elements in the tab */
	private elementsAction: EditorTabElementsAction = () => {};

	/** Is a static object that holds all of the tabs in the view {@link MenuBar `TopMenuButton`} */
	static tabs = {
		"SongInfo": new EditorTab("Song info", vec2(800, 300), false),
		"Sync": new EditorTab("Sync", vec2(800, 300), false),
		"Notes": new EditorTab("Notes", vec2(180, 400), false),
		"Events": new EditorTab("Events\n", vec2(800, 300), true),
	};

	static HEADER_COLOR = rgb(30, 29, 36);
	static BODY_COLOR = rgb(43, 42, 51);

	static ui = {
		ACCENT: BLUE,
		BODY_OUTLINE: EditorTab.HEADER_COLOR.darken(20),
		BODY: EditorTab.HEADER_COLOR.darken(10),
	};

	/** Find a tab game object by its instance */
	static findTabByInstance(instance: EditorTab) {
		return get("editorTab").find((editorTabObj: ReturnType<typeof EditorTab.addEditorTab>) => editorTabObj.tab == instance);
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
			drag(),
			opacity(0),
			scale(0.95),
			"editorTab",
			{
				isHovering: false,
				tab: tab,
				/** Gets the topleft position of the tab obj (not including the header) */
				getTopLeft() {
					return vec2(-this.width / 2, -this.height / 2);
				},
			},
		]);

		tabObj.pos = tab.pos;

		tabObj.onUpdate(() => {
			const topLeft = vec2(tabObj.pos.x - tabObj.width / 2, tabObj.pos.y - tabObj.height / 2 - 30);

			const canDrag = new Rect(topLeft, tabObj.width, 30).contains(mousePos());
			const isHovering = new Rect(topLeft, tabObj.width, tabObj.height).contains(mousePos()) || tabObj.dragging;

			tabObj.isHovering = isHovering;
			if (isMousePressed("left") && canDrag && !tabObj.dragging) tabObj.pick();
			else if (isMouseReleased("left") && tabObj.dragging) tabObj.drop();

			if (tabObj.dragging) tab.pos = tabObj.pos;

			tabObj.scale = lerp(tabObj.scale, vec2(1), 0.45);
			tabObj.opacity = lerp(tabObj.opacity, 1, 0.45);
		});

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
				text: tab.title.replace("\n", ""),
				size: 20,
				anchor: "botleft",
				pos: vec2(-tabObj.width / 2 + 10, -tabObj.height / 2 - 2.5),
			});
		});

		const xButton = tabObj.add([
			text("x", { size: 20 }),
			pos(),
			area(),
			anchor("center"),
			"hover",
		]);

		xButton.onUpdate(() => {
			xButton.pos = vec2(tabObj.width / 2 - xButton.width, -tabObj.height / 2 - xButton.height / 1.5);
		});

		xButton.onClick(() => {
			tab.visible = false;
		});

		tab.elementsAction(tabObj);

		return tabObj;
	}

	/** Function that handles the addition for all the editor tabs in the chart editor */
	static setup() {
		// this goes through each tab and adds an item for it in the view menubar
		const arrayOfItems: MenuItem[] = [];
		Object.values(EditorTab.tabs).forEach((tab) => {
			arrayOfItems.push({
				text: tab.title,
				action: () => {
					tab.visible = !tab.visible;
					if (tab.visible == true) {
						const index = Object.values(EditorTab.tabs).indexOf(tab);
						Sound.playSound("dialogOpen", { detune: rand(-25, 25) * (index + 1) * 2 });
					}
				},
				// this runs some extra code which is an ondraw that serves as a checkbox
				extraCode(itemObj) {
					const posOfSquare = vec2(itemObj.width - 5, 12.5);
					itemObj.onDraw(() => {
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

						if (tab.visible) {
							drawRect({
								width: 16,
								height: 16,
								color: BLACK,
								pos: vec2(posOfSquare.x - 2, posOfSquare.y),
								anchor: "right",
							});
						}
					});
				},
			});
		});

		// then this sets up the top menu button
		MenuBar.bars.View.items = arrayOfItems;
		// adds the slider (parsing is on that file)
		MenuBar.bars.View.items.push({ text: "hueslider", action: () => true });

		// and this goes each frame and checks if a tab should be or should not be
		onUpdate(() => {
			Object.values(EditorTab.tabs).forEach((tabInstance) => {
				const tabObjWithTab = EditorTab.findTabByInstance(tabInstance);

				if (tabInstance.visible == true && !tabObjWithTab) EditorTab.addEditorTab(tabInstance);
				else if (tabInstance.visible == false && tabObjWithTab) tabObjWithTab.destroy();
			});
		});

		defineSongMetadataTab();
		defineSyncTab();
		defineEventTab();
		defineNotesTab();
	}

	constructor(title: string, pos: Vec2 = vec2(), visible: boolean = true) {
		this.title = title;
		this.pos = pos;
		this.visible = visible;
	}
}
