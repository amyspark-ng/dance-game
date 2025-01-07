import { GameObj, KEventController, PosComp, Vec2 } from "kaplay";
import { onBeatHit, onNoteHit } from "../../core/events";
import { GameSave } from "../../core/gamesave";
import { drag } from "../../core/plugins/features/drag";
import { playSound } from "../../core/plugins/features/sound";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { ChartEvent } from "../song";
import { downloadChart, isStampNote, StateChart } from "./EditorState";

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
		"Sync": new EditorTab("Sync", vec2(800, 300), false),
		"Notes": new EditorTab("Notes", vec2(180, 400), false),
		"Events": new EditorTab("All events", vec2(180, 200), true),
		"Edit Event": new EditorTab("Edit event", vec2(800, 300), true),
	};

	static HEADER_COLOR = rgb(30, 29, 36);
	static BODY_COLOR = rgb(43, 42, 51);

	static ui = {
		ACCENT: BLUE,
		BODY_OUTLINE: EditorTab.HEADER_COLOR.darken(20),
		BODY: EditorTab.HEADER_COLOR.darken(10),

		addTextbox: (editorTabObj: ReturnType<typeof EditorTab.addEditorTab>, defaultValue: string) => {
			const maxWidth = formatText({ text: "Hello world!!", size: 20 }).width + 5;
			const textbox = editorTabObj.add([
				rect(maxWidth, 30, { radius: 2 }),
				color(EditorTab.ui.BODY),
				outline(2, EditorTab.ui.BODY_OUTLINE),
				area(),
				"hover",
				"textbox",
				{
					focused: false,
					value: "",
				},
			]);

			let onCharInputEV: KEventController = null;
			let onBackspace: KEventController = null;

			textbox.onUpdate(() => {
				if (textbox.value.length == 0) {
					textbox.value = defaultValue;
				}
				if (textbox.focused) textbox.outline.color = EditorTab.ui.ACCENT;
				else textbox.outline.color = EditorTab.ui.BODY_OUTLINE;
			});

			textbox.onMousePress(() => {
				if (textbox.isHovering()) {
					textbox.focused = true;
					onCharInputEV = textbox.onCharInput((ch) => {
						textbox.value += ch;
					});

					onBackspace = textbox.onKeyPressRepeat("backspace", () => {
						textbox.value = textbox.value.slice(0, -1);
					});

					const onEnter = textbox.onKeyPress("enter", () => {
						textbox.focused = false;
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
						pos: vec2(formatText({ text: textbox.value, size: 20 }).width + 7, 7),
					});
				}

				drawText({
					text: textbox.value,
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
	};

	/** Find a tab game object by its instance */
	static findTabByInstance(instance: EditorTab) {
		return get("editorTab").find((editorTabObj: ReturnType<typeof EditorTab.addEditorTab>) =>
			editorTabObj.tab == instance
		);
	}

	addElements(action: EditorTabElementsAction) {
		this.elementsAction = action;
	}

	static addEditorTab(tab: EditorTab, ChartState: StateChart) {
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
			},
		]);

		tabObj.onUpdate(() => {
			const topLeft = vec2(tabObj.pos.x - tabObj.width / 2, tabObj.pos.y - tabObj.height / 2 - 30);
			const isHovered = new Rect(topLeft, tabObj.width, 30).contains(mousePos())
				|| tabObj.dragging;
			tabObj.isHovering = isHovered;
			if (isMousePressed("left") && isHovered && !tabObj.dragging) tabObj.pick();
			else if (isMouseReleased("left") && tabObj.dragging) tabObj.drop();

			if (tabObj.dragging) tab.pos = tabObj.pos;

			tabObj.scale = lerp(tabObj.scale, vec2(1), 0.45);
			tabObj.opacity = lerp(tabObj.opacity, 1, 0.45);
		});

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

	constructor(title: string, pos: Vec2 = vec2(), visible: boolean = true) {
		this.title = title;
		this.pos = pos;
		this.visible = visible;
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
				if (tab.visible == true) {
					const index = Object.values(EditorTab.tabs).indexOf(tab);
					playSound("dialogOpen", { detune: rand(-25, 25) * (index + 1) * 2 });
				}
			},
			// this runs some extra code which is an ondraw that serves as a checkbox
			extraCode(minibuttonObj) {
				const posOfSquare = vec2(minibuttonObj.width - 5, 12.5);
				minibuttonObj.onDraw(() => {
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
	TopMenuButton.buttons[2].buttons = arrayOfMinibuttonsAccordingToTab;

	// and this goes each frame and checks if a tab should be or should not be
	onUpdate(() => {
		Object.values(EditorTab.tabs).forEach((tabInstance) => {
			const tabObjWithTab = EditorTab.findTabByInstance(tabInstance);

			if (tabInstance.visible == true && !tabObjWithTab) EditorTab.addEditorTab(tabInstance, ChartState);
			else if (tabInstance.visible == false && tabObjWithTab) tabObjWithTab.destroy();
		});
	});

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
				noteObj.scale = vec2(1.6);
			});

			noteObj.onUpdate(() => {
				noteObj.scale = lerp(noteObj.scale, ChartState.currentMove == move ? vec2(1.2) : vec2(1), 0.6);
				noteObj.opacity = lerp(noteObj.opacity, noteObj.isHovering() ? 0.8 : 0.5, 0.5);
			});
		});
	});

	EditorTab.tabs.Events.addElements((editorTabObj) => {
		const allEvents = Object.keys(ChartState.events) as (keyof typeof ChartState.events)[];
		editorTabObj.width = 240;
		editorTabObj.height = 65 + 65 * allEvents.length % 4;

		allEvents.forEach((eventKey, index) => {
			const eventObj = editorTabObj.add([
				sprite(eventKey),
				pos(),
				area(),
				opacity(),
				scale(),
				anchor("center"),
				"hover",
			]);

			eventObj.width = 60;
			eventObj.height = 60;
			eventObj.pos.x = (-editorTabObj.width / 2 + index * 60) + eventObj.width / 2;
			eventObj.pos.y = (-editorTabObj.height / 2) + eventObj.height / 2;

			eventObj.onClick(() => {
				ChartState.currentEvent = eventKey;
			});
		});
	});

	EditorTab.tabs.Sync.addElements((editorTabObj) => {
		editorTabObj.width = 240;
		editorTabObj.height = 300;

		function makeDummyDancer() {
			let waitEvent = wait(0);
			const DANCER_SCALE = vec2(0.5);

			function fakeDancerComp() {
				return {
					moveBop() {
						return this.stretch({
							XorY: "y",
							startScale: DANCER_SCALE.y * 0.9,
							endScale: DANCER_SCALE.y,
							theTime: 0.25,
						});
					},

					doMove(move: Move) {
						this.moveBop();
						this.play(move);

						if (waitEvent) {
							waitEvent.cancel();
							waitEvent = null;
						}
						waitEvent = wait(1, () => {
							// can't do doMove because then it'll turn into a loop
							this.play("idle");
						});
					},

					get currentMove() {
						return this.getCurAnim().name;
					},
				};
			}

			const dancer = make([
				sprite("dancer_" + GameSave.dancer),
				anchor("bot"),
				pos(),
				area(),
				scale(DANCER_SCALE),
				juice(),
				opacity(),
				fakeDancerComp(),
				"dummyDancer",
				{
					forcedAnim: false,
				},
			]);

			dancer.onClick(() => {
				dancer.moveBop();
			});

			dancer.doMove("idle");

			return dancer;
		}

		function addCounterObj(index: number) {
			const counter = editorTabObj.add([
				text((index + 1).toString(), { align: "left", size: 25 }),
				pos(),
				anchor("center"),
				scale(),
				color(),
				"beatcounter",
				{
					beat: index + 1,
				},
			]);

			counter.pos.x = -30 + index * 20;
			counter.pos.y = 100;

			return counter;
		}

		const dummyDancer = editorTabObj.add(makeDummyDancer());
		dummyDancer.pos = vec2(0, editorTabObj.height - dummyDancer.height / 2 - 30);

		dummyDancer.onUpdate(() => {
			dummyDancer.sprite = "dancer_" + ChartState.getDancerAtTime();
		});

		const playAnimEV = ChartState.onEvent("play-anim", (ev) => {
			if (!dummyDancer) return;
			if (dummyDancer.getAnim(ev.value.anim) == null) {
				console.warn("Animation not found for dancer: " + ev.value.anim);
				return;
			}

			dummyDancer.forcedAnim = ev.value.force;

			// @ts-ignore
			const animSpeed = dummyDancer.getAnim(ev.value.anim)?.speed;
			dummyDancer.play(ev.value.anim, {
				speed: animSpeed * ev.value.speed,
				loop: true,
				pingpong: ev.value.ping_pong,
			});
			dummyDancer.onAnimEnd((animEnded) => {
				if (animEnded != ev.value.anim) return;
				dummyDancer.forcedAnim = false;
				dummyDancer.doMove("idle");
			});
		});

		for (let i = 0; i < ChartState.conductor.stepsPerBeat; i++) {
			addCounterObj(i);
		}

		const onBeatHitEv = onBeatHit(() => {
			const currentBeatObj = (editorTabObj.get("beatcounter") as ReturnType<typeof addCounterObj>[]).find((obj) =>
				obj.beat == (ChartState.conductor.currentBeat % ChartState.conductor.stepsPerBeat) + 1
			);

			tween(vec2(1.3), vec2(1), 0.15, (p) => currentBeatObj.scale = p);
			if (currentBeatObj.beat == ChartState.conductor.stepsPerBeat) {
				tween(YELLOW, WHITE, 0.15, (p) => currentBeatObj.color = p);
			}

			if (dummyDancer.currentMove == "idle") dummyDancer.moveBop();
		});

		const onNoteHitEv = onNoteHit((note) => {
			dummyDancer.doMove(note.move);
		});

		editorTabObj.onDraw(() => {
			drawText({
				text: "Current step: " + ChartState.scrollStep,
				pos: vec2(-editorTabObj.width / 2 + 5, -editorTabObj.height / 2 + 5),
				size: 20,
				align: "left",
			});

			drawText({
				text: "Current beat: " + ChartState.conductor.currentBeat,
				pos: vec2(-editorTabObj.width / 2 + 5, -editorTabObj.height / 2 + 25),
				size: 20,
				align: "left",
			});

			// #region playbar
			const barWidth = map(
				ChartState.scrollTime,
				0,
				ChartState.conductor.audioPlay.duration(),
				0,
				editorTabObj.width,
			);
			let lerpedWidth = 0;
			lerpedWidth = lerp(barWidth, barWidth, 0.5);

			drawRect({
				width: editorTabObj.width,
				height: 10,
				radius: [0, 0, 50, 50],
				anchor: "center",
				pos: vec2(0, editorTabObj.height / 2 - 5),
				color: ChartState.bgColor.darken(50),
			});

			drawRect({
				width: lerpedWidth,
				height: 10,
				radius: [0, 0, 50, 50],
				anchor: "left",
				pos: vec2(-editorTabObj.width / 2, editorTabObj.height / 2 - 5),
				color: ChartState.bgColor.lighten(50),
			});

			drawText({
				text: utils.formatTime(ChartState.scrollTime, true),
				align: "left",
				size: 20,
				pos: vec2(-editorTabObj.width / 2 + 5, editorTabObj.height / 2 - 30),
			});

			drawCircle({
				radius: 6,
				pos: vec2(-editorTabObj.width / 2 + lerpedWidth, editorTabObj.height / 2 - 5),
				color: ChartState.bgColor.lighten(40),
				anchor: "center",
				outline: {
					color: ChartState.bgColor.lighten(70),
					width: 2,
				},
			});
			// #endregion playbar
		});

		editorTabObj.onDestroy(() => {
			playAnimEV.cancel();
			onBeatHitEv.cancel();
			onNoteHitEv.cancel();
		});
	});

	EditorTab.tabs["Edit Event"].addElements((editorTabObj) => {
		let currentEvent: ChartEvent = null;

		function positionObject(obj: GameObj<PosComp | any>, index: number) {
			const initialPos = vec2(-editorTabObj.width / 2, -editorTabObj.height / 2);
			obj.pos = vec2(initialPos.x + 15, initialPos.y + 15 + index * 30);
		}

		function objAfterwork(obj: GameObj<PosComp | any>, event: ChartEvent, evKey: string, index: number) {
			obj.use("eventobj");
			obj.value = event.value[evKey];
			obj.onUpdate(() => {
				positionObject(obj, index);
				event.value[evKey] = obj.value;
			});

			obj.onDraw(() => {
				drawText({
					text: utils.unIdText(evKey),
					size: 20,
					pos: vec2(obj.width + 10, 10),
				});
			});
		}

		function refreshEventObjs(event: ChartEvent) {
			editorTabObj.get("eventobj").forEach((obj) => obj.destroy());
			if (!event) return;

			Object.keys(event.value).forEach((evKey: string, index: number) => {
				const typeOfValue = typeof event.value[evKey];
				const defaultValue = ChartState.events[event.id][evKey];

				if (typeOfValue == "string") {
					const textbox = EditorTab.ui.addTextbox(editorTabObj, defaultValue);
					objAfterwork(textbox, event, evKey, index);
				}
				else if (typeOfValue == "boolean") {
					const checkbox = EditorTab.ui.addCheckbox(editorTabObj, defaultValue);
					objAfterwork(checkbox, event, evKey, index);
				}
			});
		}

		editorTabObj.onUpdate(() => {
			const oldEvent = currentEvent;
			currentEvent = ChartState.selectedStamps.find((stamp) => !isStampNote(stamp)) as ChartEvent;
			const newEvent = currentEvent;

			if (oldEvent != newEvent) {
				refreshEventObjs(currentEvent);
			}

			editorTabObj.width = 300;
			if (currentEvent) {
				editorTabObj.height = (Object.keys(currentEvent.value).length + 1) * 30;
			}
		});

		editorTabObj.onDraw(() => {
			if (!currentEvent) {
				drawText({
					text: "No valid event",
					size: 25,
				});
			}
		});
	});
}
