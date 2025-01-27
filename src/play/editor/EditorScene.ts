import { Conductor } from "../../Conductor.ts";
import { gameCursor } from "../../core/cursor.ts";
import { KaplayState } from "../../core/scenes/KaplayState.ts";
import { Sound } from "../../core/sound.ts";
import { utils } from "../../utils.ts";
import { ChartEvent } from "../event.ts";
import { ChartNote } from "../objects/note.ts";
import { editorShortcuts } from "./backend/handlers.ts";
import { keyboardControls } from "./backend/keyboardControls.ts";
import { mouseControls } from "./backend/mouseControls.ts";
import { StateChart } from "./EditorState.ts";
import { EditorLane, EventLane, NoteLane } from "./objects/lane.ts";
import { EditorMinimap } from "./objects/minimap.ts";
import { EditorSelectionBox } from "./objects/selectionbox.ts";
import { EditorStamp } from "./objects/stamp.ts";
import { EditorTab } from "./ui/editorTab.ts";
import { MenuBar } from "./ui/menubar.ts";

KaplayState.scene("editor", (ChartState: StateChart) => {
	ChartState.add();

	// BE CAREFUL TO PUT IT BEFORE the drawing of other things like lane and minimap
	// have to do it here so it draws before everything else
	onDraw(() => {
		drawRect({
			width: width(),
			height: height(),
			color: ChartState.bgColor,
		});
	});

	ChartState.noteLane = new NoteLane("any");

	ChartState.eventLane = new EventLane();
	ChartState.eventLane.pos = ChartState.noteLane.pos.add(StateChart.SQUARE_SIZE.x, 0);

	ChartState.minimap = new EditorMinimap();
	ChartState.minimap.pos = ChartState.eventLane.pos.add(StateChart.SQUARE_SIZE.x, 0);

	ChartState.selectionBox = new EditorSelectionBox();
	// the ol' switcheroo
	ChartState.eventLane.darkColor = ChartState.noteLane.lightColor;
	ChartState.eventLane.lightColor = ChartState.noteLane.darkColor;

	mouseControls();
	keyboardControls();

	onUpdate(() => {
		ChartState.bgColor = rgb(92, 50, 172);
		ChartState.conductor.paused = ChartState.paused;

		// editor stamps update
		ChartState.notes.forEach((note) => note.update());
		ChartState.events.forEach((event) => event.update());

		// MOUSE COLOR
		const currentColor = ChartNote.moveToColor(ChartState.currentMove);
		const mouseColor = utils.blendColors(WHITE, currentColor, 0.5);
		gameCursor.color = lerp(gameCursor.color, mouseColor, StateChart.LERP);

		// SCROLL STEP
		ChartState.lerpScrollStep = lerp(ChartState.lerpScrollStep, ChartState.scrollStep, StateChart.LERP);
		if (ChartState.paused) {
			const theTime = ChartState.conductor.stepToTime(ChartState.scrollStep + ChartState.strumlineStep);
			ChartState.conductor.timeInSeconds = theTime;
		}
		else {
			const stepOffsetTime = ChartState.conductor.stepToTime(ChartState.strumlineStep);
			const newStep = ChartState.conductor.timeToStep(
				ChartState.conductor.timeInSeconds - stepOffsetTime,
			);
			ChartState.scrollStep = Math.round(newStep);
		}

		// HOVERED STEP
		ChartState.hoveredStep = ChartState.scrollStep + Math.floor(gameCursor.pos.y / StateChart.SQUARE_SIZE.y);
		ChartState.conductor.BPM = ChartState.song.manifest.initial_bpm;
		ChartState.conductor.timeSignature = ChartState.song.manifest.time_signature;

		editorShortcuts();
	});

	onDraw(() => {
		ChartState.notes.forEach((note) => note.draw());
		ChartState.events.forEach((event) => event.draw());
		EditorLane.drawCursor(); // i draw it here so it's above the note selected box

		// # strumlineline
		const strumlineYPos = StateChart.instance.strumlineStep * StateChart.SQUARE_SIZE.y;
		drawRect({
			pos: vec2(center().x, strumlineYPos),
			anchor: "center",
			height: 5,
			radius: 5,
			color: RED,
			scale: vec2(StateChart.instance.strumlineScale.x, 1),
			width: (StateChart.SQUARE_SIZE.x * 3),
		});
	});

	// The scroll event
	onScroll((delta) => {
		let scrollPlus = 0;
		if (!ChartState.paused) ChartState.paused = true;

		if (delta.y >= 1) scrollPlus = 1;
		else scrollPlus = -1;

		// strumline step
		if (isKeyDown("shift")) {
			if (ChartState.strumlineStep >= 0 && ChartState.strumlineStep < ChartState.conductor.totalSteps) {
				ChartState.strumlineStep += scrollPlus;
				ChartState.strumlineStep = clamp(
					ChartState.strumlineStep,
					0,
					ChartState.conductor.totalSteps - ChartState.scrollStep,
				);
			}
		}
		else {
			// scroll step
			ChartState.scrollToStep(ChartState.scrollStep + scrollPlus);
		}
	});

	// makes the strumline BOP
	ChartState.conductor.onBeatHit((curBeat) => {
		tween(vec2(1.2), vec2(1), 0.1, (p) => ChartState.strumlineScale = p);
	});

	// Scrolls the checkerboard
	ChartState.conductor.onStepHit((currentStep) => {
		const allStamps = EditorStamp.mix(ChartState.notes, ChartState.events);
		allStamps.forEach((stamp) => {
			if (stamp.step == currentStep) {
				stamp.events.trigger("stampHit", stamp);
				ChartState.editorEvents.trigger("stampHit", stamp);
			}
		});
	});

	onSceneLeave(() => {
		gameCursor.color = WHITE;
	});

	MenuBar.setup();
	EditorTab.setup();
});
