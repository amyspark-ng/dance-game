import { KEventController, Vec2 } from "kaplay";
import { drag } from "../../core/drag";
import { Sound } from "../../core/sound";
import { utils } from "../../utils";
import { defineTabs } from "./defineEditorTabs";
import { MenuBar, MenuItem } from "./editorMenus";
import { StateChart } from "./EditorState";

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
		"Sync": new EditorTab("Sync", vec2(800, 300), true),
		"Notes": new EditorTab("Notes", vec2(180, 400), false),
		"Events": new EditorTab("All events", vec2(180, 200), false),
		"EditEvent": new EditorTab("Edit event\n", vec2(800, 300), false),
	};

	static HEADER_COLOR = rgb(30, 29, 36);
	static BODY_COLOR = rgb(43, 42, 51);

	static ui = {
		ACCENT: BLUE,
		BODY_OUTLINE: EditorTab.HEADER_COLOR.darken(20),
		BODY: EditorTab.HEADER_COLOR.darken(10),

		addTextbox: (
			editorTabObj: ReturnType<typeof EditorTab.addEditorTab>,
			defaultValue: string,
			textCondition?: (ch: string) => boolean,
		) => {
			if (!textCondition) {
				textCondition = (ch: string) => true;
			}

			const maxWidth = formatText({ text: "Hello world!!", size: 20 }).width + 5;
			const textbox = editorTabObj.add([
				rect(maxWidth, 30, { radius: 2 }),
				pos(),
				color(EditorTab.ui.BODY),
				outline(2, EditorTab.ui.BODY_OUTLINE),
				area(),
				"hover",
				"textbox",
				{
					focused: false,
					value: defaultValue,
				},
			]);

			let seeValue = defaultValue;
			let onCharInputEV: KEventController = null;
			let onBackspace: KEventController = null;

			textbox.onUpdate(() => {
				if (seeValue.length == 0) {
					seeValue = "";
					textbox.value = defaultValue;
				}
				else {
					textbox.value = seeValue;
					seeValue = textbox.value;
				}
				if (textbox.focused) textbox.outline.color = EditorTab.ui.ACCENT;
				else textbox.outline.color = EditorTab.ui.BODY_OUTLINE;
			});

			textbox.onMousePress(() => {
				if (textbox.isHovering()) {
					textbox.focused = true;
					onCharInputEV = textbox.onCharInput((ch) => {
						if (textCondition(ch)) {
							seeValue += ch;
						}
					});

					onBackspace = textbox.onKeyPressRepeat("backspace", () => {
						seeValue = textbox.value.toString().slice(0, -1);
					});

					const onEnter = textbox.onKeyPress("enter", () => {
						textbox.focused = false;
						onCharInputEV?.cancel();
						onBackspace?.cancel();
						onEnter.cancel();
					});
				}
				else {
					textbox.focused = false;
					onCharInputEV?.cancel();
					onBackspace?.cancel();
				}
			});

			textbox.onDraw(() => {
				// cursor
				if (textbox.focused) {
					drawRect({
						width: 1,
						height: 18,
						color: WHITE,
						opacity: Math.round(time()) % 2 == 0 ? 1 : 0,
						pos: vec2(formatText({ text: seeValue, size: 20 }).width + 7, 7),
					});
				}

				drawText({
					text: seeValue,
					align: "left",
					size: 20,
					pos: vec2(5, 5),
				});
			});

			return textbox;
		},

		addCheckbox: (editorTabObj: ReturnType<typeof EditorTab.addEditorTab>, defaultValue: boolean) => {
			const checkbox = editorTabObj.add([
				rect(28, 28, { radius: 3 }),
				area(),
				pos(),
				color(EditorTab.ui.BODY),
				outline(2, EditorTab.ui.BODY_OUTLINE),
				"hover",
				{
					focused: false,
					value: defaultValue,
				},
			]);

			checkbox.onMousePress(() => {
				if (checkbox.isHovering()) {
					checkbox.focused = true;
					checkbox.value = !checkbox.value;
				}
				else {
					checkbox.focused = false;
				}
			});

			checkbox.onUpdate(() => {
				if (checkbox.focused) checkbox.outline.color = EditorTab.ui.ACCENT;
				else checkbox.outline.color = EditorTab.ui.BODY_OUTLINE;
			});

			checkbox.onDraw(() => {
				if (checkbox.value == true) {
					drawRect({
						anchor: "center",
						pos: vec2(checkbox.width / 2, checkbox.height / 2),
						width: checkbox.width,
						height: checkbox.height,
						radius: 3,
						scale: vec2(0.65),
					});
				}
			});

			return checkbox;
		},

		addScrollable: (
			editorTabObj: ReturnType<typeof EditorTab.addEditorTab>,
			defaultValue: any,
			/** The options if it's a string scrollable */
			options?: string[],
			/** How much to increase or decrease on click */
			increaseValue?: number,
		) => {
			increaseValue = increaseValue ?? 1;

			let theWidth = formatText({ text: "AAAAA", size: 20 }).width;

			if (options) {
				const longestOption = options.reduce((a, b) => (a.length > b.length ? a : b));
				theWidth = formatText({ text: longestOption, size: 20 }).width;
			}

			if (typeof defaultValue != "number" && !options) {
				throw new Error(`No options for given '${typeof defaultValue}' scrollable`);
			}

			let index = 0;
			if (Array.isArray(defaultValue)) {
				index = options.indexOf(defaultValue[0]);
				if (index == -1) throw new Error("Default value is not found on options array");
			}

			const obj = editorTabObj.add([
				rect(0, 0),
				pos(),
				"textbox",
				{
					focused: false,
					value: defaultValue,
				},
			]);

			function addArrow(direction: "left" | "right") {
				const arrow = obj.add([
					rect(15, 30, { radius: 2 }),
					color(EditorTab.ui.BODY.lighten(30)),
					pos(),
					outline(2, EditorTab.ui.BODY_OUTLINE),
					area(),
					z(1),
					"hover",
				]);
				let counter = 0;

				const regularColor = EditorTab.ui.BODY.lighten(30);
				const brighterColor = EditorTab.ui.BODY.lighten(50);

				function updateValue() {
					counter = 0;
					if (typeof obj.value == "number") {
						if (direction == "left") obj.value -= increaseValue;
						else obj.value += increaseValue;
						// has decimal place
						if (Math.round(obj.value) != obj.value) obj.value = parseFloat(obj.value.toFixed(1));
					}
					else if (Array.isArray(obj.value)) {
						if (direction == "left") index = utils.scrollIndex(index, increaseValue, options.length);
						else index = utils.scrollIndex(index, -increaseValue, options.length);
						obj.value = [options[index].toString()];
					}
				}

				arrow.onUpdate(() => {
					if (isMouseDown("left") && arrow.isHovering()) {
						counter += dt();

						if (counter >= 0.1) {
							updateValue();
						}

						arrow.color = brighterColor;
					}
					else if (isMouseReleased("left") && counter > 0) {
						updateValue();
					}
					else {
						counter = 0;
						arrow.color = regularColor;
					}
				});

				arrow.onDraw(() => {
					drawSprite({
						sprite: "ui_arrow",
						pos: vec2(arrow.width / 4, arrow.height / 4),
						flipX: direction == "right" ? true : false,
					});
				});
				return arrow;
			}

			const leftArrow = addArrow("left");
			const textbox = obj.add([
				rect(theWidth, 30, { radius: 2 }),
				color(EditorTab.ui.BODY),
				outline(2, EditorTab.ui.BODY_OUTLINE),
				area(),
				pos(leftArrow.width, 0),
				z(0),
				"hover",
			]);
			const rightArrow = addArrow("right");
			rightArrow.pos.x = textbox.pos.x + textbox.width;

			textbox.onMousePress("left", () => {
				if (textbox.isHovering()) {
					obj.focused = true;
				}
				else {
					obj.focused = false;
				}
			});

			obj.onUpdate(() => {
				if (obj.focused) {
					leftArrow.outline.color = EditorTab.ui.ACCENT;
					textbox.outline.color = EditorTab.ui.ACCENT;
					rightArrow.outline.color = EditorTab.ui.ACCENT;
				}
				else {
					leftArrow.outline.color = EditorTab.ui.BODY_OUTLINE;
					textbox.outline.color = EditorTab.ui.BODY_OUTLINE;
					rightArrow.outline.color = EditorTab.ui.BODY_OUTLINE;
				}
			});

			textbox.onDraw(() => {
				drawText({
					text: Array.isArray(obj.value) ? obj.value[0] : obj.value.toString(),
					anchor: "center",
					align: "center",
					pos: vec2(textbox.width / 2, textbox.height / 2),
					size: 20,
				});
			});

			obj.width = leftArrow.width + textbox.width + rightArrow.width;

			return obj;
		},

		addButton: (editorTabObj: ReturnType<typeof EditorTab.addEditorTab>, text: string, action: () => void) => {
			const button = editorTabObj.add([
				rect(30, 30, { radius: 2 }),
				pos(),
				area(),
				color(EditorTab.BODY_COLOR.lighten(50)),
				outline(2, EditorTab.ui.BODY_OUTLINE),
				"hover",
				{
					value: text,
				},
			]);

			const regularColor = EditorTab.ui.BODY.lighten(30);
			const brighterColor = EditorTab.ui.BODY.lighten(50);

			button.width = formatText({
				text: text + "AA",
				size: 20,
			}).width;

			const drawEv = onDraw(() => {
				drawText({
					pos: vec2(button.screenPos().add(button.width / 2, button.height / 2)),
					text: button.value,
					size: 20,
					anchor: "center",
					align: "left",
				});
			});

			button.onDestroy(() => drawEv.cancel());

			button.onUpdate(() => {
				if (isMouseReleased("left") && button.isHovering()) {
					action();
				}

				if (isMouseDown("left") && button.isHovering()) button.color = brighterColor;
				else button.color = regularColor;
			});

			return button;
		},
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

		defineTabs();
	}

	constructor(title: string, pos: Vec2 = vec2(), visible: boolean = true) {
		this.title = title;
		this.pos = pos;
		this.visible = visible;
	}
}
