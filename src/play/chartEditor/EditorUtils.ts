import { Key } from "kaplay";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playSound } from "../../core/plugins/features/sound";
import { transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { FileManager } from "../../fileManaging";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { ChartNote } from "../objects/note";
import { ChartEvent } from "../song";
import { ChartStamp, StateChart } from "./EditorState";

// Function overloading is pretty cool pretty powerful for this specific case :)
/** Interface that defins some functions in the stamps section for EditorUtils */
interface stampUtils {
	/** Gets the closest stamp at a certain step
	 *
	 * If it's note it will account for trails of note [length]
	 * @param step The step to find the note at
	 */
	find(stampType: "note", step: number): ChartNote;
	find(stampType: "event", step: number): ChartEvent;

	/** Get the hovered stamp */
	getHovered(stampType: "note"): ChartNote;
	getHovered(stampType: "event"): ChartEvent;

	/** Wheter the stamp is a note or not */
	isNote(stamp: ChartStamp): stamp is ChartNote;

	/** Wheter the stamp is an event or not */
	isEvent(stamp: ChartStamp): stamp is ChartEvent;

	/** Fix a stamp in a way that's good */
	fix(stamp: ChartStamp): void;

	/** Determines wheter there's a trail at a certain step
	 * @param step The step to find the trail at
	 */
	trailAtStep(step: number): boolean;

	/** Concats notes and events */
	concat(notes: ChartNote[], events: ChartEvent[]): ChartStamp[];
}

/** Class that stores the actions of all editor commands */
export class EditorCommands {
	static NewChart() {
		StateChart.instance.createNewSong();
	}

	static OpenChart() {
		debug.log("wip");
	}

	static SaveChart() {
		EditorUtils.downloadChart();
	}

	static Exit() {
		transitionToScene(fadeOut, "menu", { index: 0 });
	}

	static SelectAll() {
		StateChart.instance.takeSnapshot("select all");
		const notes = StateChart.instance.song.chart.notes;
		const events = StateChart.instance.song.chart.events;
		StateChart.instance.selectedStamps = EditorUtils.stamps.concat(notes, events);
	}

	static DeselectAll() {
		if (StateChart.instance.selectedStamps.length == 0) return;
		StateChart.instance.takeSnapshot("deselect all");
		StateChart.instance.selectedStamps = [];
		StateChart.instance.stepForDetune = 0;
	}

	static InvertSelection() {
		StateChart.instance.takeSnapshot("invert selection");
		const notes = StateChart.instance.song.chart.notes;
		const events = StateChart.instance.song.chart.events;
		const allStamps = EditorUtils.stamps.concat(notes, events);
		StateChart.instance.selectedStamps = allStamps.filter((stamp) =>
			!StateChart.instance.selectedStamps.includes(stamp)
		);
	}

	static Delete(stamps?: ChartStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? ChartState.selectedStamps;
		if (stamps.length == 0) return;
		ChartState.takeSnapshot(`delete ${stamps.length} stamps`);

		stamps.forEach((stamp) => {
			if (EditorUtils.stamps.isNote(stamp)) ChartState.deleteNote(stamp);
			else ChartState.deleteEvent(stamp);
		});

		playSound("noteRemove", { detune: rand(-50, 50) });
		// there was an event in there
		if (stamps.some((stamp) => !EditorUtils.stamps.isNote(stamp))) {
			playSound("eventCog", { detune: rand(-50, 50) });
		}

		ChartState.selectedStamps = [];
		ChartState.stepForDetune = 0;
	}

	static Copy(stamps?: ChartStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? ChartState.selectedStamps;
		if (stamps.length == 0) return;

		ChartState.clipboard = stamps;
		EditorUtils.addFloatyText(EditorUtils.clipboardMessage("copy", ChartState.clipboard));
		playSound("noteCopy", { detune: rand(25, 50) });

		stamps.forEach((stamp) => {
			if (EditorUtils.stamps.isNote(stamp)) {
				const indexInNotes = ChartState.song.chart.notes.indexOf(stamp);
				tween(
					choose([-1, 1]) * 20,
					0,
					0.5,
					(p) => ChartState.stampProps.notes[indexInNotes].angle = p,
					easings.easeOutExpo,
				);
				tween(
					vec2(1.2),
					vec2(1),
					0.5,
					(p) => ChartState.stampProps.notes[indexInNotes].scale = p,
					easings.easeOutExpo,
				);
			}
			else {
				const indexInEvents = ChartState.song.chart.events.indexOf(stamp);
				tween(
					choose([-1, 1]) * 20,
					0,
					0.5,
					(p) => ChartState.stampProps.events[indexInEvents].angle = p,
					easings.easeOutExpo,
				);
				tween(
					vec2(1.2),
					vec2(1),
					0.5,
					(p) => ChartState.stampProps.events[indexInEvents].scale = p,
					easings.easeOutExpo,
				);
			}
		});
	}

	static Cut(stamps?: ChartStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? ChartState.selectedStamps;
		if (stamps.length == 0) return;
		ChartState.takeSnapshot(`cut ${stamps.length} stamps`);

		// some code from the copy action
		ChartState.clipboard = stamps;
		EditorUtils.addFloatyText(EditorUtils.clipboardMessage("cut", ChartState.clipboard));
		playSound("noteCopy", { detune: rand(0, 25) });

		stamps.forEach((stamp) => {
			if (EditorUtils.stamps.isNote(stamp)) {
				ChartState.deleteNote(stamp);
			}
			else {
				ChartState.deleteEvent(stamp);
			}
		});
	}

	static Paste(stamps?: ChartStamp[]) {
		const ChartState = StateChart.instance;
		stamps = stamps ?? ChartState.clipboard;
		if (stamps.length == 0) return;

		// shickiiii
		ChartState.takeSnapshot(`paste ${stamps.length} stamps`);

		playSound("noteCopy", { detune: rand(-50, -25) });
		EditorUtils.addFloatyText(EditorUtils.clipboardMessage("paste", stamps));

		stamps.forEach((stamp) => {
			const newTime = stamp.time + ChartState.conductor.stepToTime(ChartState.hoveredStep);

			if (EditorUtils.stamps.isNote(stamp)) {
				const newNote = ChartState.placeNote(newTime, stamp.move);
				const indexInNotes = ChartState.song.chart.notes.indexOf(newNote);
				if (indexInNotes == -1) return;
				tween(
					choose([-1, 1]) * 20,
					0,
					0.5,
					(p) => ChartState.stampProps.notes[indexInNotes].angle = p,
					easings.easeOutExpo,
				);
			}
			else {
				const newEvent = ChartState.placeEvent(newTime, stamp.id);
				const indexInEvents = ChartState.song.chart.events.indexOf(newEvent);
				if (indexInEvents == -1) return;
				tween(
					choose([-1, 1]) * 20,
					0,
					0.5,
					(p) => ChartState.stampProps.events[indexInEvents].angle = p,
					easings.easeOutExpo,
				);
			}
		});
	}

	static Undo() {
		let oldSongState = StateChart.instance.song;
		StateChart.instance.undo();

		if (oldSongState != StateChart.instance.song) {
			playSound("noteUndo", { detune: rand(-50, -25) });
		}
	}

	static Redo() {
		let oldSongState = StateChart.instance.song;
		StateChart.instance.redo();

		if (oldSongState != StateChart.instance.song) {
			playSound("noteUndo", { detune: rand(25, 50) });
		}
	}
}

/** Class that manages some handlers for the editor class */
export class EditorUtils {
	/** Converts the move to a detune, sounds good i think */
	static moveToDetune(move: Move) {
		switch (move) {
			case "left":
				return -50;
			case "down":
				return -100;
			case "up":
				return 100;
			case "right":
				return 50;
		}
	}

	/** Get the message for the clipboard */
	static clipboardMessage(action: "copy" | "cut" | "paste", clipboard: ChartStamp[]) {
		let message = "";

		const notesLength = clipboard.filter((thing) => EditorUtils.stamps.isNote(thing)).length;
		const eventsLength = clipboard.filter((thing) => !EditorUtils.stamps.isNote(thing)).length;
		const moreThanOneNote = notesLength > 1;
		const moreThanOneEvent = eventsLength > 1;

		const stringForAction = action == "copy" ? "Copied" : action == "cut" ? "Cut" : "Pasted";

		if (notesLength > 0 && eventsLength == 0) {
			message = `${stringForAction} ${notesLength} ${moreThanOneNote ? "notes" : "note"}!`;
		}
		else if (notesLength == 0 && eventsLength > 0) {
			message = `${stringForAction} ${eventsLength} ${moreThanOneEvent ? "events" : "event"}!`;
		}
		else if (notesLength > 0 && eventsLength > 0) {
			message = `${stringForAction} ${notesLength} ${moreThanOneNote ? "notes" : "note"} and ${eventsLength} ${
				moreThanOneEvent ? "events" : "event"
			}!`;
		}
		else if (notesLength == 0 && eventsLength == 0) message = `${stringForAction} nothing!`;

		return message;
	}

	/** Adds a little floating text */
	static addFloatyText(texting: string) {
		const texty = add([
			text(texting, { align: "left", size: 20 }),
			pos(gameCursor.pos),
			anchor("left"),
			fixed(),
			color(3, 252, 73),
			opacity(),
			timer(),
		]);

		texty.tween(texty.pos.y, texty.pos.y - rand(25, 35), 0.5, (p) => texty.pos.y = p, easings.easeOutQuint)
			.onEnd(() => {
				texty.fadeOut(0.25).onEnd(() => texty.destroy());
			});

		return texty;
	}

	/** Returns an AudioPlay of any action related to notes */
	static noteSound(note: ChartNote, action: "Add" | "Remove") {
		const detune = this.moveToDetune(note.move)
			+ map(note.time, 0, StateChart.instance.conductor.audioPlay.duration(), 0, 50);
		return playSound(`note${action}`, { detune: detune });
	}

	/** Downloads the chart */
	static async downloadChart() {
		getTreeRoot().trigger("download");

		const SongFolder = await FileManager.writeSongFolder(StateChart.instance.song);

		// downloads the zip
		downloadBlob(`${StateChart.instance.song.manifest.name}.zip`, SongFolder);
		debug.log(`${StateChart.instance.song.manifest.name}.zip, DOWNLOADED! :)`);
	}

	/** Object with some functions related to stamp utils */
	static stamps: stampUtils = {
		find(stampType: "note" | "event", step: number) {
			if (stampType == "note") {
				const note = StateChart.instance.song.chart.notes.find((note) =>
					Math.round(StateChart.instance.conductor.timeToStep(note.time)) == step
				);
				if (note) return note as ChartNote;
				else {
					const longNotes = StateChart.instance.song.chart.notes.filter((note) => note.length != undefined);
					const noteWithTrailAtStep = longNotes.find((note) => {
						const noteStep = Math.round(StateChart.instance.conductor.timeToStep(note.time));
						if (utils.isInRange(step, noteStep, noteStep + note.length)) {
							return note;
						}
						else return undefined as ChartNote;
					});
					return noteWithTrailAtStep as ChartNote;
				}
			}
			else if (stampType == "event") {
				return StateChart.instance.song.chart.events.find((ev) => {
					const evStep = Math.round(StateChart.instance.conductor.timeToStep(ev.time));
					return evStep == step;
				}) as ChartEvent;
			}
			else return undefined as any;
		},

		getHovered(stampType: "note" | "event") {
			if (stampType == "note") return this.find("note", StateChart.instance.hoveredStep);
			else return this.find("event", StateChart.instance.hoveredStep);
		},

		isNote(stamp: ChartStamp): stamp is ChartNote {
			return (stamp as ChartNote).move != undefined;
		},

		isEvent(stamp: ChartStamp): stamp is ChartEvent {
			return (stamp as ChartNote).move == undefined;
		},

		fix(stamp: ChartStamp) {
			const isNote = EditorUtils.stamps.isNote(stamp);
			const songDuration = StateChart.instance.conductor.audioPlay.duration();
			// clamps from 0 to time
			stamp.time = clamp(stamp.time, 0, songDuration);

			function snapToClosestTime(t: number) {
				const stampStep = StateChart.instance.conductor.timeToStep(t);
				const closestStep = Math.round(stampStep);
				return parseFloat(StateChart.instance.conductor.stepToTime(closestStep).toFixed(2));
			}

			// clamps to closest step
			stamp.time = snapToClosestTime(stamp.time);

			if (isNote) {
				stamp.length = Math.round(stamp.length);
				if (isNaN(stamp.length)) stamp.length = undefined;
			}
		},

		trailAtStep(step: number): boolean {
			const note = EditorUtils.stamps.find("note", step) as ChartNote;
			if (note) {
				const noteStep = Math.round(StateChart.instance.conductor.timeToStep(note.time));
				if (note.length) {
					return utils.isInRange(step, noteStep + 1, noteStep + 1 + note.length);
				}
				else return false;
			}
			else return false;
		},

		concat(notes: ChartNote[], events: ChartEvent[]): ChartStamp[] {
			return [...notes, ...events];
		},
	};

	static handlers = {
		/** Determines some mouse anims */
		mouseAnim: () => {
			gameCursor.addAnimCondition(() => {
				// then the ones for the actual charting state
				// kinda hardcoded, this probably just means the player is loading something nothing  else
				if (!gameCursor.canMove && StateChart.instance.inputDisabled) gameCursor.do("load");
				else {
					if (!StateChart.instance.isCursorInGrid) {
						if (isMouseDown("left") && StateChart.instance.minimap.isMoving) gameCursor.do("down");
						else gameCursor.do("default");
					}
					else {
						if (!isMouseDown("left") && !isMouseDown("right")) gameCursor.do("up");
						else if (isMouseDown("left") && !isMouseDown("right")) gameCursor.do("down");
						else if (!isMouseDown("left") && isMouseDown("right")) gameCursor.do("x");
					}
				}
			});
		},
		/** Determines mouse grid conditions */
		grid: () => {
			const ChartState = StateChart.instance;
			const minLeft = center().x - ChartState.SQUARE_SIZE.x / 2;
			const maxRight = minLeft + ChartState.SQUARE_SIZE.x * 2;

			// if the distance between the cursor and the square is small enough then highlight it
			if (utils.isInRange(gameCursor.pos.x, minLeft, maxRight)) {
				// above the grid
				if (ChartState.scrollStep == 0 && gameCursor.pos.y < ChartState.INITIAL_POS.y) {
					ChartState.isInEventGrid = false;
					ChartState.isInNoteGrid = false;
				}
				// below the grid
				else if (
					ChartState.scrollStep == ChartState.conductor.totalSteps /* && gameCursor.pos.y >= strumlineYPos */
				) {
					ChartState.isInEventGrid = false;
					ChartState.isInNoteGrid = false;
				}
				// actually inside the grid
				else {
					// note grid
					if (gameCursor.pos.x >= minLeft && gameCursor.pos.x < maxRight - ChartState.SQUARE_SIZE.x) {
						ChartState.isInNoteGrid = true;
					}
					else ChartState.isInNoteGrid = false;

					// event grid
					if (gameCursor.pos.x >= minLeft + ChartState.SQUARE_SIZE.x && gameCursor.pos.x < maxRight) {
						ChartState.isInEventGrid = true;
					}
					else ChartState.isInEventGrid = false;
				}
			}
			else {
				ChartState.isInEventGrid = false;
				ChartState.isInNoteGrid = false;
			}

			// if it's on either of them then it's in the grid
			ChartState.isCursorInGrid = ChartState.isInNoteGrid || ChartState.isInEventGrid;
		},
		selectionBox: () => {
			const ChartState = StateChart.instance;

			if (isMousePressed("left")) {
				const canSelect = !get("hover", { recursive: true }).some((obj) => obj.isHovering())
					&& !ChartState.isCursorInGrid
					&& !get("editorTab").some((obj) => obj.isHovering)
					&& !ChartState.minimap.canMove;

				ChartState.selectionBox.canSelect = canSelect;
				if (ChartState.selectionBox.canSelect) {
					ChartState.selectionBox.clickPos = gameCursor.pos;
				}
			}

			if (isMouseDown("left") && ChartState.selectionBox.canSelect) {
				ChartState.selectionBox.width = Math.abs(gameCursor.pos.x - ChartState.selectionBox.clickPos.x);
				ChartState.selectionBox.height = Math.abs(gameCursor.pos.y - ChartState.selectionBox.clickPos.y);

				ChartState.selectionBox.pos.x = Math.min(ChartState.selectionBox.clickPos.x, gameCursor.pos.x);
				ChartState.selectionBox.pos.y = Math.min(ChartState.selectionBox.clickPos.y, gameCursor.pos.y);

				// # topleft
				// the pos will just be the pos of the selectionbox since it's anchor topleft
				ChartState.selectionBox.points[0] = ChartState.selectionBox.pos;

				// # topright
				// the x will be the same as topleft.x + width
				ChartState.selectionBox.points[1].x = ChartState.selectionBox.pos.x + ChartState.selectionBox.width;
				// y will be the same as topleft.y
				ChartState.selectionBox.points[1].y = ChartState.selectionBox.pos.y;

				// # bottomleft
				// the x will be the same as points[0].x
				ChartState.selectionBox.points[2].x = ChartState.selectionBox.pos.x;
				// the y will be pos.y + height
				ChartState.selectionBox.points[2].y = ChartState.selectionBox.pos.y + ChartState.selectionBox.height;

				// # bottomright
				// the x will be the same as topright x pos
				ChartState.selectionBox.points[3].x = ChartState.selectionBox.points[1].x;
				// the y will be the same as bottom left
				ChartState.selectionBox.points[3].y = ChartState.selectionBox.points[2].y;
			}

			if (isMouseReleased("left") && ChartState.selectionBox.canSelect) {
				const theRect = new Rect(
					ChartState.selectionBox.pos,
					ChartState.selectionBox.width,
					ChartState.selectionBox.height,
				);

				const oldSelectStamps = ChartState.selectedStamps;
				// ChartState.selectedStamps = [];

				const combined = EditorUtils.stamps.concat(ChartState.song.chart.notes, ChartState.song.chart.events);

				combined.forEach((stamp) => {
					let stampPos = ChartState.stepToPos(ChartState.conductor.timeToStep(stamp.time));
					stampPos.y -= ChartState.SQUARE_SIZE.y * ChartState.lerpScrollStep;
					if (!EditorUtils.stamps.isNote(stamp)) {
						stampPos.x = ChartState.INITIAL_POS.x + ChartState.SQUARE_SIZE.x;
					}

					// is the topleft of the position
					const posInScreen = vec2(
						stampPos.x - ChartState.SQUARE_SIZE.x / 2,
						stampPos.y - ChartState.SQUARE_SIZE.y / 2,
					);

					// this is for long notes
					let otherPossiblePos = posInScreen;

					if (EditorUtils.stamps.isNote(stamp) && stamp.length) {
						otherPossiblePos.y += ChartState.SQUARE_SIZE.y * stamp.length;
					}

					// these are the positions in all 4 corners
					const possiblePos = [
						posInScreen, // topleft
						vec2(posInScreen.x + ChartState.SQUARE_SIZE.x, posInScreen.y), // topright
						vec2(posInScreen.x, posInScreen.y + ChartState.SQUARE_SIZE.y), // bottomleft
						vec2(posInScreen.x + ChartState.SQUARE_SIZE.x, posInScreen.y + ChartState.SQUARE_SIZE.y), // bottomright
					];

					// goes through each one and seeis if they're in the selection box
					for (const posy in possiblePos) {
						if (theRect.contains(possiblePos[posy]) || theRect.contains(otherPossiblePos)) {
							ChartState.selectedStamps.push(stamp);
							break;
						}
					}
				});

				const newSelectStamps = ChartState.selectedStamps;

				if (oldSelectStamps != newSelectStamps) {
					ChartState.takeSnapshot(`select ${newSelectStamps.length} notes`);
				}

				ChartState.selectionBox.clickPos = vec2(0, 0);
				ChartState.selectionBox.points = [vec2(0, 0), vec2(0, 0), vec2(0, 0), vec2(0, 0)];
				ChartState.selectionBox.pos = vec2(0, 0);
				ChartState.selectionBox.width = 0;
				ChartState.selectionBox.height = 0;
			}
		},
		minimap: () => {
			const ChartState = StateChart.instance;

			const minLeft = ChartState.minimap.pos.x - ChartState.SQUARE_SIZE.x / 2;
			const maxRight = ChartState.minimap.pos.x + ChartState.SQUARE_SIZE.x / 2;

			/** How big a note is depending on the amount of total steps */
			const SIZE = vec2(ChartState.SQUARE_SIZE.x / 3, height() / ChartState.conductor.totalSteps);
			const heightOfMinimap = SIZE.y * 11;

			if (gameCursor.pos.x >= minLeft && gameCursor.pos.x <= maxRight) ChartState.minimap.canMove = true;
			else if (
				(gameCursor.pos.x < ChartState.minimap.pos.x || gameCursor.pos.x > ChartState.minimap.pos.x)
				&& !ChartState.minimap.isMoving
			) ChartState.minimap.canMove = false;

			if (!ChartState.minimap.isMoving) {
				ChartState.minimap.pos.y = mapc(
					ChartState.scrollStep,
					0,
					ChartState.conductor.totalSteps,
					0,
					height() - heightOfMinimap,
				);
			}

			if (ChartState.minimap.canMove) {
				if (isMousePressed("left")) {
					ChartState.minimap.isMoving = true;
					if (!ChartState.paused) ChartState.paused = true;
				}
				else if (isMouseReleased("left") && ChartState.minimap.isMoving) {
					ChartState.minimap.isMoving = false;
				}

				if (ChartState.minimap.isMoving) {
					ChartState.minimap.pos.y = gameCursor.pos.y;
					ChartState.minimap.pos.y = clamp(ChartState.minimap.pos.y, 0, height() - heightOfMinimap);

					const newStep = mapc(
						ChartState.minimap.pos.y,
						0,
						height() - heightOfMinimap,
						0,
						ChartState.conductor.totalSteps,
					);

					ChartState.scrollToStep(newStep);
				}
			}
		},
		shortcuts: () => {
			const ChartState = StateChart.instance;

			// #region SCROLLING
			let stepsToScroll = 0;

			// scroll up
			if (isKeyPressedRepeat("w")) {
				if (!ChartState.paused) ChartState.paused = true;
				if (isKeyDown("shift")) stepsToScroll = -5;
				else stepsToScroll = -1;
				ChartState.scrollToStep(ChartState.scrollStep + stepsToScroll);
			}
			// scroll down
			else if (isKeyPressedRepeat("s")) {
				if (!ChartState.paused) ChartState.paused = true;
				if (isKeyDown("shift")) stepsToScroll = 5;
				else stepsToScroll = 1;
				ChartState.scrollToStep(ChartState.scrollStep + stepsToScroll);
			}

			// scroll left nah just messing with you
			// floor to closest beat
			if (isKeyPressedRepeat("a") && !isKeyDown("control")) {
				if (!ChartState.paused) ChartState.paused = true;
				ChartState.scrollToStep(ChartState.scrollStep - ChartState.conductor.stepsPerBeat);
			}
			// ceil to closest beat
			else if (isKeyPressedRepeat("d") && !isKeyDown("control")) {
				if (!ChartState.paused) ChartState.paused = true;
				ChartState.scrollToStep(ChartState.scrollStep + ChartState.conductor.stepsPerBeat);
			}
			// #endregion SCROLLING

			// #region MOVES
			if (isKeyPressed("1")) ChartState.currentMove = "left";
			else if (isKeyPressed("2")) ChartState.currentMove = "down";
			else if (isKeyPressed("3")) ChartState.currentMove = "up";
			else if (isKeyPressed("4")) ChartState.currentMove = "right";
			// #endregion MOVES

			// #region COMMANDS
			if (isKeyPressed("backspace")) EditorCommands.Delete();

			// all the control commands
			if (!isKeyDown("control")) return;
			else if (isKeyDown("shift") && isKeyPressed("s")) EditorCommands.SaveChart();
			else if (isKeyPressed("n")) EditorCommands.NewChart();
			else if (isKeyPressed("o")) EditorCommands.OpenChart();
			else if (isKeyPressed("q")) EditorCommands.Exit();
			else if (isKeyPressed("a")) EditorCommands.SelectAll();
			else if (isKeyPressed("d")) EditorCommands.DeselectAll();
			else if (isKeyPressed("i")) EditorCommands.InvertSelection();
			else if (isKeyPressed("c")) EditorCommands.Copy();
			else if (isKeyPressed("x")) EditorCommands.Cut();
			else if (isKeyPressed("v")) EditorCommands.Paste();
			else if (isKeyPressedRepeat("z")) EditorCommands.Undo();
			else if (isKeyPressedRepeat("y")) EditorCommands.Redo();
			// #endregion COMMANDS
		},

		trackPressLeft: () => {
		},
	};
}
