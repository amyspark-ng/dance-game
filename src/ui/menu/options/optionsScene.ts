import { appWindow } from "@tauri-apps/api/window";
import { GameObj, KEventController, Key, Vec2 } from "kaplay";
import { juice } from "../../../core/juiceComp";
import { noteskins } from "../../../core/loading/loader";
import { _GameSave, GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { Sound } from "../../../core/sound";
import { Move } from "../../../play/objects/dancer";
import { StateGame } from "../../../play/PlayState";
import { utils } from "../../../utils";
import { StateMenu } from "../MenuScene";
import { addCheckbox, addNumberItem, addVolumeSlider, tagForCheckbox, tagForNumItem, tagForSlider } from "./optionsUI";

function uiMoveSound(change: 1 | -1) {
	Sound.playSound("uiMove", { detune: 50 * change * -1 });
}

function uiSelectSound() {
	Sound.playSound("uiSelect");
}

// draws a key "sprite"
function drawKey(opts: { key: Key; position: Vec2; opacity: number; }) {
	drawRect({
		width: 60,
		height: 60,
		pos: opts.position,
		color: BLACK.lighten(40),
		anchor: "center",
		opacity: opts.opacity,
	});

	if (opts.key == "left") opts.key = "←";
	else if (opts.key == "down") opts.key = "↓";
	else if (opts.key == "up") opts.key = "↑";
	else if (opts.key == "right") opts.key = "→";
	else opts.key = opts.key.toUpperCase();

	drawText({
		text: opts.key,
		size: 30,
		anchor: "center",
		pos: opts.position,
		opacity: opts.opacity,
	});
}

export class StateOptions extends KaplayState {
	/** The current ui element in the current page */
	optionIndex: number = 0;

	/** The current "page" will either be 0, 1 or 2 referring to controls, noteskins and etc */
	leftIndex: number = 0;

	/** Will be false when the player is choosing their new keys to play */
	inputEnabled: boolean = true;

	/** Wheter the player is on the left side, like changing the page of the options */
	inLeft: boolean = true;

	/** Some properties of the cursor */
	cursorProps = {
		obj: null,
		angle: 0,
		opacity: 1,
		pos: vec2(0),
		scale: vec2(1),
		lerpValue: 0.5,
	};

	/** Runs when pressing escape */
	exitAction() {
		// is in page so i think they're done setting stuff
		if (!this.inputEnabled) return;

		if (this.inLeft) {
			KaplayState.switchState(new StateMenu("options"));
			GameSave.save();
		}
		else {
			this.cursorProps.angle = 0;
			this.cursorProps.scale.x = 1;
			this.cursorProps.scale.y = 1;

			this.inLeft = true;
			manageOptionsState(this.leftIndex, this, false);
		}
	}

	constructor() {
		super("options");
	}
}

/**
 * Manages the UI for the pages
 * @param page What page
 * @param OptionsState The current state of the scene
 * @param workThem If work them is true then they should start working and not only be shown
 */
function manageOptionsState(page: number, OptionsState: StateOptions, workThem: boolean = false) {
	// NOTE: KEY INPUT EVENTS NEEDED FOR SPECIFIC OPTIONS SHOULD BE ATTACHED TO AN OBJECT IN THAT PAGE

	// tags for some elements
	const tagForUI = "optionsUIEl";
	const tagForControls = "optionsUIEl_Controls";
	const tagForNoteskins = "optionsUIEl_Noteskins";
	const tagForEtc = "optionsUIEl_Etc";

	function clearElements() {
		get(tagForUI).forEach((obj) => {
			obj.paused = true;
			// tween(obj.pos.x, obj.pos.x - width(), 0.1, (p) => obj.pos.x = p).onEnd(() => {
			obj.destroy();
			// })
		});
	}

	clearElements();

	// game keys
	if (page == 0) {
		OptionsState.inputEnabled = true;
		let moves: Move[] = Object.keys(GameSave.gameControls) as Move[];

		// this is done so the isKeyPressed("enter") doesn't run the second this is triggered
		let canChangeKeys = false;
		wait(0.1, () => canChangeKeys = true);

		const inputManager = add([tagForUI, tagForControls]);
		inputManager.onUpdate(() => {
			if (!workThem) return;

			const hoveredKey = get("noteForKey").find(obj => obj.index == OptionsState.optionIndex);

			if (OptionsState.inputEnabled) {
				if (isKeyPressed("right")) {
					OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, 1, moves.length);
					uiMoveSound(1);
				}
				else if (isKeyPressed("left")) {
					OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, -1, moves.length);
					uiMoveSound(-1);
				}
				else if (isKeyPressed("enter") && canChangeKeys) {
					OptionsState.inputEnabled = false;
					let newKey: string = undefined;

					let arrowKeyPressEvents: KEventController[] = [];
					let charInputEv: KEventController = null;
					let escapeEvent: KEventController = null;

					/** Runs when the user is done picking a key */
					function doneIt() {
						// if the chosen key is new || good
						if (newKey != undefined && newKey != GameSave.gameControls[hoveredKey.curMove]) {
							// does little anim
							uiSelectSound();
							tween(
								hoveredKey.pos.y - 10,
								hoveredKey.pos.y,
								0.1,
								(p) => hoveredKey.pos.y = p,
								easings.easeOutQuad,
							);
						}

						charInputEv.cancel();
						escapeEvent.cancel();
						arrowKeyPressEvents.forEach((ev) => ev.cancel());

						const defaultKeys = _GameSave.defaultControls;

						// checks if any key is the same as the new key
						if (Object.values(GameSave.gameControls).some((key) => key == newKey)) {
							// if that key is in another gameControl then set that game control to the default else don't do anything

							// runs through each gameControl
							for (const key in GameSave.gameControls) {
								if (newKey == key) continue;

								// set to default if the key is repeated
								if (GameSave.gameControls[key] == newKey) {
									GameSave.gameControls[key] = defaultKeys[
										Object.values(GameSave.gameControls).indexOf(GameSave.gameControls[key])
									];
								}
							}
						}

						if (newKey != undefined) {
							GameSave.gameControls[hoveredKey.curMove] = newKey;
						}

						// so iskeypressed left and right can't run inmediately after choosing an arrow key
						wait(0.05, () => {
							OptionsState.inputEnabled = true;
						});
					}

					const arrowKeys = ["left", "down", "up", "right"];
					arrowKeys.forEach((dumbKey) => {
						let keyPressEvent = onKeyPress(dumbKey, () => {
							newKey = dumbKey;
							// doneIt() takes care of cancelling them
							doneIt();
						});
						arrowKeyPressEvents.push(keyPressEvent);
					});

					charInputEv = onCharInput((ch) => {
						if (ch == " " || ch == "+" || ch == "-" || ch == "") shake(1);
						else {
							newKey = ch;
						}

						doneIt();
					});

					escapeEvent = onKeyPress("escape", () => {
						doneIt();
					});
				}

				OptionsState.cursorProps.opacity = 1;
			}
			// input is disabled, thus, is changing a key
			else {
				OptionsState.cursorProps.opacity = wave(0.25, 0.5, time() * 10);
			}

			if (hoveredKey != undefined) {
				OptionsState.cursorProps.pos.x = hoveredKey.pos.x;
				OptionsState.cursorProps.pos.y = hoveredKey.pos.y - hoveredKey.height * 0.75;
				OptionsState.cursorProps.angle = 90;
			}
		});

		inputManager.onDraw(() => {
			if (!OptionsState.inputEnabled) {
				drawText({
					text: "Choosing a key",
					size: 30,
					pos: vec2(width() / 2 + 90, height() / 2 + 180),
					opacity: wave(0.5, 5, time() / 5),
				});
			}
		});

		moves.forEach((curMove, index) => {
			const initialX = (width() / 2) + 50;
			const initialY = height() / 2;
			const spacing = 90;

			const noteForKey = add([
				sprite(GameSave.noteskin + "_" + curMove),
				pos(initialX + spacing * index, initialY),
				anchor("center"),
				opacity(1),
				"noteForKey",
				tagForUI,
				tagForControls,
				{
					index: index,
					curMove: curMove,
				},
			]);

			noteForKey.onDraw(() => {
				drawKey({
					key: GameSave.gameControls[curMove],
					position: vec2(0, noteForKey.height),
					opacity: noteForKey.opacity,
				});
			});
		});
	}
	// noteskins
	else if (page == 1) {
		const moves = ["left", "up", "down", "right"];

		OptionsState.optionIndex = noteskins.indexOf(GameSave.noteskin);
		if (OptionsState.optionIndex < 0) OptionsState.optionIndex = 0;

		let canPressEnter = false;
		wait(0.1, () => canPressEnter = true);

		const inputManager = add([tagForUI, tagForNoteskins]);
		inputManager.onUpdate(() => {
			if (isKeyPressed("up")) {
				uiMoveSound(-1);
				OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, -1, noteskins.length);
			}
			else if (isKeyPressed("down")) {
				uiMoveSound(1);
				OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, 1, noteskins.length);
			}
			else if (isKeyPressed("enter") && canPressEnter) {
				uiSelectSound();
				OptionsState.inLeft = true;
				GameSave.noteskin = noteskins[OptionsState.optionIndex];
				GameSave.save();
				manageOptionsState(OptionsState.leftIndex, OptionsState, false);

				get("noteskinMov").forEach((obj) => {
					if (obj.noteskinIndex == OptionsState.optionIndex) {
						obj.bop({
							startScale: vec2(1.2),
							endScale: vec2(1),
						});
					}
				});
			}

			const noteskinMov = get("noteskinMov").find((obj) =>
				obj.noteskinIndex == OptionsState.optionIndex && obj.movIndex == 3
			);
			if (noteskinMov != undefined) {
				OptionsState.cursorProps.pos.y = noteskinMov.pos.y;
				OptionsState.cursorProps.pos.x = noteskinMov.pos.x + 90;
				OptionsState.cursorProps.angle = 180;
			}
		});

		const initialPos = vec2(width() / 2, height() / 2);
		noteskins.forEach((curNoteskin, noteskinIndex) => {
			moves.forEach((curMove, movIndex) => {
				const thePos = utils.getPosInGrid(initialPos, noteskinIndex, movIndex, vec2(90));

				const movenoteskin = add([
					sprite(curNoteskin + "_" + curMove),
					pos(thePos),
					anchor("center"),
					opacity(),
					scale(),
					juice(),
					"noteskinMov",
					tagForUI,
					tagForNoteskins,
					{
						movIndex: movIndex,
						noteskinIndex: noteskinIndex,
					},
				]);

				movenoteskin.onUpdate(() => {
					if (!OptionsState.inLeft) {
						if (OptionsState.optionIndex == noteskinIndex) movenoteskin.opacity = 1;
						else movenoteskin.opacity = 0.5;
					}
				});
			});
		});
	}
	// etc
	else if (page == 2) {
		OptionsState.optionIndex = 0;
		let inDesktop = false;
		utils.runInDesktop(() => inDesktop = true);

		let canPressEnter = false;
		wait(0.1, () => canPressEnter = true);

		const initialY = center().y - 100;
		const initialX = center().x + 100;

		function setupItem(obj: GameObj<any>, index: number) {
			obj.use(tagForUI);
			obj.use(tagForEtc);
			obj.index = index;

			obj.pos.x = initialX;
			if (obj.is(tagForSlider)) obj.pos.x -= 25;
			obj.pos.y = initialY + ((obj.height * 1.15) * index);
		}

		const testCheckbox = addCheckbox("Grooving");
		testCheckbox.onCheck((selected) => {
			debug.log(selected);
		});

		const masterVolume = addVolumeSlider("Master");
		masterVolume.value = GameSave.volume;
		const musicVolume = addVolumeSlider("Music");
		musicVolume.value = GameSave.musicVolume;
		const sfxVolume = addVolumeSlider("Sfx");
		sfxVolume.value = GameSave.soundVolume;

		masterVolume.onUpdate(() => {
			let blendValue = 0;
			blendValue = map(GameSave.volume, 0, 1, 0, 1);
			masterVolume.color = utils.blendColors(GREEN, RED, blendValue);
		});

		const scrollSpeedItem = addNumberItem("Scroll speed");
		scrollSpeedItem.value = GameSave.scrollSpeed;

		const allElements = [
			masterVolume,
			musicVolume,
			sfxVolume,
			testCheckbox,
			scrollSpeedItem,
		];

		utils.runInDesktop(() => {
			const fullscreenBox = addCheckbox("Fullscreen");
			fullscreenBox.onCheck((selected) => {
				appWindow.setFullscreen(selected);
			});

			allElements.push(fullscreenBox);
		});

		allElements.forEach((element, index) => {
			setupItem(element, index);
		});

		const inputHandler = add([tagForUI, tagForEtc]);
		inputHandler.onUpdate(() => {
			if (isKeyPressed("down")) {
				uiMoveSound(1);
				OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, 1, allElements.length);
			}
			else if (isKeyPressed("up")) {
				uiMoveSound(-1);
				OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, -1, allElements.length);
			}

			const hoveredObj = get(tagForEtc).find((obj) => obj.index == OptionsState.optionIndex);
			if (hoveredObj == undefined) return;

			if (hoveredObj.is(tagForSlider)) {
				function updateVolumeSave() {
					if (hoveredObj.is("Master")) {
						Sound.changeVolume(hoveredObj.value);
					}
					else if (hoveredObj.is("Music")) {
						// GameSave.soundVolume = hoveredObj.value;
						// Sound.soundVolume = GameSave.soundVolume * GameSave.volume;
					}
					else if (hoveredObj.is("Sfx")) {
						// GameSave.musicVolume = hoveredObj.value;
						// Sound.musicVolume = GameSave.musicVolume * GameSave.volume;
					}
				}

				if (hoveredObj.is("Master")) hoveredObj.value = GameSave.volume;
				else if (hoveredObj.is("Music")) hoveredObj.value = GameSave.musicVolume;
				else if (hoveredObj.is("Sfx")) hoveredObj.value = GameSave.soundVolume;

				const cursorObj = OptionsState.cursorProps.obj;
				const cursorObjWidth = cursorObj.width * OptionsState.cursorProps.scale.x;
				const cursorObjHeight = cursorObj.height * OptionsState.cursorProps.scale.y;

				OptionsState.cursorProps.pos.y = hoveredObj.pos.y - cursorObjHeight;
				let cursorPosX = map(
					hoveredObj.value,
					0,
					1,
					hoveredObj.pos.x - cursorObjWidth / 2,
					hoveredObj.pos.x + hoveredObj.width,
				);
				OptionsState.cursorProps.pos.x = cursorPosX;
				OptionsState.cursorProps.lerpValue = 0.7;

				OptionsState.cursorProps.angle = 90;
				OptionsState.cursorProps.scale.x = 0.5;
				OptionsState.cursorProps.scale.y = 0.5;

				if (isKeyPressedRepeat("left")) {
					if (!(hoveredObj.value - 0.1 >= 0)) return;
					hoveredObj.value = utils.fixDecimal(hoveredObj.value - 0.1);
					hoveredObj.value = clamp(hoveredObj.value, 0, 1);
					uiMoveSound(1);
					updateVolumeSave();
				}
				else if (isKeyPressedRepeat("right")) {
					if (!(hoveredObj.value + 0.1 <= 1)) return;
					hoveredObj.value = utils.fixDecimal(hoveredObj.value + 0.1);
					hoveredObj.value = clamp(hoveredObj.value, 0, 1);
					uiMoveSound(-1);
					updateVolumeSave();
				}
			}
			else if (hoveredObj.is(tagForCheckbox)) {
				OptionsState.cursorProps.pos.x = hoveredObj.pos.x - hoveredObj.width * 1.25;
				OptionsState.cursorProps.pos.y = hoveredObj.pos.y;

				if (isKeyPressed("enter") && canPressEnter) {
					hoveredObj.check();
					uiSelectSound();
				}
			}
			else if (hoveredObj.is(tagForNumItem)) {
				OptionsState.cursorProps.pos.x = hoveredObj.pos.x - hoveredObj.width * 1.25;
				OptionsState.cursorProps.pos.y = hoveredObj.pos.y;

				if (isKeyPressedRepeat("right")) hoveredObj.value = utils.fixDecimal(hoveredObj.value + 0.1);
				else if (isKeyPressedRepeat("left")) hoveredObj.value = utils.fixDecimal(hoveredObj.value - 0.1);
				hoveredObj.value = clamp(hoveredObj.value, 0.1, 10);
				GameSave.scrollSpeed = hoveredObj.value;
			}

			if (!hoveredObj.is(tagForSlider)) {
				OptionsState.cursorProps.scale.x = 1;
				OptionsState.cursorProps.scale.y = 1;
				OptionsState.cursorProps.angle = 0;
				OptionsState.cursorProps.lerpValue = 0.5;
			}
		});
	}

	if (!workThem) {
		get(tagForUI).forEach((obj) => {
			obj.opacity = 0.5;
		});
	}
	else {
		get(tagForUI).forEach((obj) => {
			obj.opacity = 1;
		});
	}

	get(tagForEtc).forEach((obj) => {
		obj.onUpdate(() => {
			if (!OptionsState.inLeft) {
				if (obj.index == OptionsState.optionIndex) {
					obj.opacity = 1;
				}
				else {
					obj.opacity = 0.5;
				}
			}
		});
	});
}

KaplayState.scene("options", (OptionsState: StateOptions) => {
	setBackground(BLUE.lighten(30));

	add([
		text("OPTIONS", { size: 80 }),
		anchor("center"),
		pos(center().x, 70),
	]);

	const optionsCursor = add([
		sprite("optionsCursor"),
		pos(),
		anchor("center"),
		opacity(),
		scale(),
		rotate(0),
		z(10),
		{
			update() {
				OptionsState.cursorProps.obj = this;
			},
		},
	]);

	optionsCursor.onUpdate(() => {
		if (OptionsState.inLeft) {
			const hoveredPage = get("pageText").find(page => page.index == OptionsState.leftIndex);

			if (hoveredPage != undefined) {
				OptionsState.cursorProps.pos.x = hoveredPage.pos.x - 25;
				OptionsState.cursorProps.pos.y = hoveredPage.pos.y;
			}

			OptionsState.cursorProps.angle = 0;
			OptionsState.cursorProps.scale.x = 1;
			OptionsState.cursorProps.scale.y = 1;
		}

		// lerp stuff
		optionsCursor.pos = lerp(
			optionsCursor.pos,
			OptionsState.cursorProps.pos,
			OptionsState.cursorProps.lerpValue,
		);
		optionsCursor.angle = lerp(
			optionsCursor.angle,
			OptionsState.cursorProps.angle,
			OptionsState.cursorProps.lerpValue,
		);
		optionsCursor.opacity = lerp(
			optionsCursor.opacity,
			OptionsState.cursorProps.opacity,
			OptionsState.cursorProps.lerpValue,
		);
		optionsCursor.scale.x = lerp(
			optionsCursor.scale.x,
			OptionsState.cursorProps.scale.x,
			OptionsState.cursorProps.lerpValue,
		);
		optionsCursor.scale.y = lerp(
			optionsCursor.scale.y,
			OptionsState.cursorProps.scale.y,
			OptionsState.cursorProps.lerpValue,
		);
	});

	const pages = ["Controls", "Noteskins", "Etc"];
	pages.forEach((option, index) => {
		const initialY = 190;
		const pageTextSize = 70;
		const curPage = add([
			text(option, { size: pageTextSize, align: "left" }),
			pos(pageTextSize - 10, initialY + (pageTextSize * 1.25) * index),
			opacity(),
			anchor("left"),
			"pageText",
			{
				index: index,
			},
		]);

		let targetOpacity = 1;
		curPage.onUpdate(() => {
			if (OptionsState.inLeft) {
				if (OptionsState.leftIndex == index) targetOpacity = 1;
				else targetOpacity = 0.5;
			}
			else {
				if (OptionsState.leftIndex == index) targetOpacity = 0.5;
				else targetOpacity = 0.25;
			}

			curPage.opacity = lerp(curPage.opacity, targetOpacity, 0.5);
		});
	});

	manageOptionsState(OptionsState.leftIndex, OptionsState, false);

	onKeyPress("down", () => {
		if (!OptionsState.inputEnabled) return;

		if (OptionsState.inLeft) {
			OptionsState.leftIndex = utils.scrollIndex(OptionsState.leftIndex, 1, pages.length);
			uiMoveSound(1);
			manageOptionsState(OptionsState.leftIndex, OptionsState, false);
		}
	});

	onKeyPress("up", () => {
		if (!OptionsState.inputEnabled) return;

		if (OptionsState.inLeft) {
			OptionsState.leftIndex = utils.scrollIndex(OptionsState.leftIndex, -1, pages.length);
			uiMoveSound(-1);
			manageOptionsState(OptionsState.leftIndex, OptionsState, false);
		}
	});

	onKeyPress("escape", () => {
		OptionsState.exitAction();
	});

	onKeyPress("enter", () => {
		if (!OptionsState.inputEnabled) return;

		if (OptionsState.inLeft == true) {
			OptionsState.inLeft = false;
			// this will set the inPage value
			manageOptionsState(OptionsState.leftIndex, OptionsState, true);
			uiSelectSound();
		}
	});

	onSceneLeave(() => {
		// just in case
		GameSave.save();
	});
});
