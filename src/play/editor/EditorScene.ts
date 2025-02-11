import { cam } from "../../core/camera.ts";
import { gameCursor } from "../../core/cursor.ts";
import { utils } from "../../utils.ts";
import { ChartNote } from "../objects/note.ts";
import { editorShortcuts } from "./backend/handlers.ts";
import { keyboardControls } from "./backend/keyboardControls.ts";
import { mouseControls } from "./backend/mouseControls.ts";
import { ChartSnapshot, EditorState } from "./EditorState.ts";
import { EditorLane, EventLane, NoteLane } from "./objects/lane.ts";
import { EditorMinimap } from "./objects/minimap.ts";
import { EditorSelectionBox } from "./objects/selectionbox.ts";
import { EditorStamp } from "./objects/stamp.ts";
import { MenuBar } from "./ui/menubar.ts";
import { EditorTab } from "./ui/tabs.ts";

export function EditorScene(state: EditorState) {
	state.snapshots = [new ChartSnapshot(state, "started")];
	cam.reset();

	// BE CAREFUL TO PUT IT BEFORE the drawing of other things like lane and minimap
	// have to do it here so it draws before everything else
	onDraw(() => {
		drawRect({
			width: width(),
			height: height(),
			color: state.bgColor,
		});
	});

	state.noteLane = new NoteLane("any");

	state.eventLane = new EventLane();
	state.eventLane.pos = state.noteLane.pos.add(EditorState.SQUARE_SIZE.x, 0);

	state.minimap = new EditorMinimap();
	state.minimap.pos = state.eventLane.pos.add(EditorState.SQUARE_SIZE.x, 0);

	state.selectionBox = new EditorSelectionBox();
	// the ol' switcheroo
	state.eventLane.darkColor = state.noteLane.lightColor;
	state.eventLane.lightColor = state.noteLane.darkColor;

	mouseControls();
	keyboardControls();

	onUpdate(() => {
		state.bgColor = rgb(92, 50, 172);
		state.conductor.paused = state.paused;

		// editor stamps update
		state.notes.forEach((note) => note.update());
		state.events.forEach((event) => event.update());

		// MOUSE COLOR
		const currentColor = ChartNote.moveToColor(state.currentMove);
		const mouseColor = utils.blendColors(WHITE, currentColor, 0.5);
		gameCursor.color = lerp(gameCursor.color, mouseColor, EditorState.LERP);

		// SCROLL STEP
		state.lerpScrollStep = lerp(state.lerpScrollStep, state.scrollStep, EditorState.LERP);
		if (state.paused) {
			const theTime = state.conductor.stepToTime(state.scrollStep + state.strumlineStep);
			state.conductor.time = theTime;
		}
		else {
			const stepOffsetTime = state.conductor.stepToTime(state.strumlineStep);
			const newStep = state.conductor.timeToStep(
				state.conductor.time - stepOffsetTime,
			);
			state.scrollStep = Math.round(newStep);
		}

		// HOVERED STEP
		state.hoveredStep = state.scrollStep + Math.floor(gameCursor.pos.y / EditorState.SQUARE_SIZE.y);
		state.conductor.currentBPM = state.song.manifest.initial_bpm;
		state.conductor.timeSignature = state.song.manifest.time_signature;

		// has notes selected or has selectionbox
		const canScrollWithCursor = EditorStamp.mix(state.notes, state.events).some((stamp) => stamp.selected && stamp.isHovering())
			|| state.selectionBox.isSelecting;
		if (canScrollWithCursor) {
			// scroll up
			const canScrollUp = state.scrollStep - 1 >= 0;
			const canScrollDown = state.scrollStep + 1 <= state.conductor.totalSteps;
			if (canScrollUp && mousePos().y < EditorState.SQUARE_SIZE.y) {
				// convert size to step
				const diff = 1 - (mousePos().y / EditorState.SQUARE_SIZE.y);
				state.scrollToStep(state.scrollStep - diff * 0.35, false);
				if (state.selectionBox.isSelecting) state.selectionBox.lastClickPos.y += diff * 0.35 * EditorState.SQUARE_SIZE.y;
			}
			// scroll down
			else if (canScrollDown && mousePos().y > height() - EditorState.SQUARE_SIZE.y) {
				const diff = 1 + (mousePos().y / EditorState.SQUARE_SIZE.y - EditorState.SQUARES_IN_SCREEN);
				state.scrollToStep(state.scrollStep + diff * 0.35, false);
				if (state.selectionBox.isSelecting) state.selectionBox.lastClickPos.y -= diff * 0.35 * EditorState.SQUARE_SIZE.y;
			}
		}

		editorShortcuts();
	});

	onDraw(() => {
		state.notes.forEach((note) => note.draw());
		state.events.forEach((event) => event.draw());
		EditorLane.drawCursor(); // i draw it here so it's above the note selected box

		// # strumlineline
		const strumlineYPos = EditorState.instance.strumlineStep * EditorState.SQUARE_SIZE.y;
		drawRect({
			pos: vec2(center().x, strumlineYPos),
			anchor: "center",
			height: 5,
			radius: 5,
			color: RED,
			scale: vec2(EditorState.instance.strumlineScale.x, 1),
			width: (EditorState.SQUARE_SIZE.x * 3),
		});
	});

	// The scroll event
	onScroll((delta) => {
		if (!state.paused) state.paused = true;
		const scrollPlus = delta.y > 0 ? 1 : -1;

		// strumline step
		if (isKeyDown("shift")) {
			state.strumlineStep += scrollPlus;
			state.strumlineStep = clamp(state.strumlineStep, 0, EditorState.SQUARES_IN_SCREEN);
		}
		else {
			// scroll step
			state.scrollToStep(state.scrollStep + scrollPlus);
		}
	});

	// makes the strumline BOP
	state.conductor.onBeatHit((curBeat) => {
		tween(vec2(1.2), vec2(1), 0.1, (p) => state.strumlineScale = p);
	});

	// Scrolls the checkerboard
	state.conductor.onStepHit((currentStep) => {
		if (state.paused) return;
		const allStamps = EditorStamp.mix(state.notes, state.events);
		allStamps.forEach((stamp) => {
			if (stamp.step == currentStep) {
				stamp.events.trigger("stampHit", stamp);
				state.editorEvents.trigger("stampHit", stamp);
			}
		});
	});

	onSceneLeave(() => {
		gameCursor.color = WHITE;
		cam.reset(); // just in case
	});

	MenuBar.setup();
	EditorTab.setup();
}
