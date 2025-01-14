// File that draws all the chart editor stuff
import { DrawRectOpt, Vec2 } from "kaplay";
import { GameSave } from "../../core/gamesave";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { utils } from "../../utils";
import { ChartNote } from "../objects/note";
import { ChartStamp, concatStamps, findStampAtStep, isStampNote, StateChart, trailAtStep } from "./EditorState";

/** Returns if a certain Y position mets the conditions to be drawn on the screen */
function conditionsForDrawing(YPos: number, square_size: Vec2 = vec2(52)) {
	return utils.isInRange(YPos, -square_size.y, height() + square_size.y);
}

/** How lerped the scroll value is */
export const SCROLL_LERP_VALUE = 0.5;

/** How big will a prop be when big */
export const PROP_BIG_SCALE = vec2(1.4);

/** Draws as many steps for the song checkerboard */
export function checkerboardRenderer(ChartState: StateChart) {
	for (let i = 0; i < ChartState.conductor.totalSteps; i++) {
		const newPos = ChartState.stepToPos(i);
		newPos.y -= ChartState.SQUARE_SIZE.y * ChartState.lerpScrollStep;
		newPos.x = width() / 2;

		const baseColor = WHITE.darken(100);
		const lighter = baseColor.darken(10);
		const darker = baseColor.darken(50);
		const col = i % 2 == 0 ? lighter : darker;
		const oppositeCol = col == lighter ? darker : lighter;

		// draws the background chess board squares etc
		if (conditionsForDrawing(newPos.y, ChartState.SQUARE_SIZE)) {
			// note square
			drawRect({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				color: col,
				pos: vec2(newPos.x, newPos.y),
				anchor: "center",
			});

			// event square
			drawRect({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				color: oppositeCol,
				pos: vec2(newPos.x + ChartState.SQUARE_SIZE.x, newPos.y),
				anchor: "center",
			});
		}

		// draws a line on every beat
		if (i % ChartState.conductor.stepsPerBeat == 0) {
			if (conditionsForDrawing(newPos.y, ChartState.SQUARE_SIZE)) {
				// the beat text
				drawText({
					text: `${i / ChartState.conductor.stepsPerBeat}`,
					color: WHITE,
					size: ChartState.SQUARE_SIZE.x / 2,
					anchor: "center",
					pos: vec2(newPos.x - ChartState.SQUARE_SIZE.x, newPos.y),
				});

				// line beat
				drawRect({
					width: ChartState.SQUARE_SIZE.x * 2,
					height: 5,
					color: darker.darken(70),
					anchor: "left",
					pos: vec2(newPos.x - ChartState.SQUARE_SIZE.x / 2, newPos.y - ChartState.SQUARE_SIZE.y / 2 - 2.5),
				});
			}
		}
	}
}

/** Is in charge of drawing all the stamps (notes and events in the {@link checkerboardRenderer `drawCheckerboard()`} ) */
export function stampRenderer(ChartState: StateChart) {
	function drawStamp(stamp: ChartStamp, index: number) {
		const isNote = isStampNote(stamp);

		let stampPos = ChartState.stepToPos(ChartState.conductor.timeToStep(stamp.time));
		stampPos.y -= ChartState.SQUARE_SIZE.y * ChartState.lerpScrollStep;
		if (!isNote) stampPos.x = ChartState.INITIAL_POS.x + ChartState.SQUARE_SIZE.x;

		const notePosLerped = lerp(stampPos, stampPos, ChartState.LERP);

		if (!ChartState.stampProps[isNote ? "notes" : "events"][index]) return;

		const stepOfStamp = ChartState.conductor.timeToStep(stamp.time);
		const lengthOfStamp = isNote ? stamp.length : 0;
		const stampLengthIsInRange = isNote && trailAtStep(ChartState.scrollStep, ChartState);

		const canDraw = conditionsForDrawing(stampPos.y) || stampLengthIsInRange;

		if (canDraw) {
			// i do this before so it's below the note in case it is
			if (isNote) {
				if (stamp.length) {
					// this draws the thing below the note
					drawSprite({
						width: ChartState.SQUARE_SIZE.x / 2,
						height: ChartState.SQUARE_SIZE.y,
						scale: ChartState.stampProps.notes[index].scale,
						angle: 90 + ChartState.stampProps.notes[index].angle,
						sprite: GameSave.noteskin + "_" + "trail",
						pos: vec2(notePosLerped.x, notePosLerped.y + ChartState.SQUARE_SIZE.y / 4),
						anchor: "center",
						shader: "replacecolor",
						uniform: {
							"u_targetcolor": ChartNote.moveToColor(stamp.move),
							"u_alpha": ChartState.conductor.timeInSeconds >= stamp.time ? 1 : 0.5,
						},
					});

					// this runs note.length + 1 because the first one is the one below the actual note
					for (let i = 0; i < stamp.length; i++) {
						// this draws the trail || tail
						drawSprite({
							width: ChartState.SQUARE_SIZE.x,
							height: ChartState.SQUARE_SIZE.y,
							scale: ChartState.stampProps.notes[index].scale,
							angle: 90,
							sprite: GameSave.noteskin + "_" + (i == stamp.length - 1 ? "tail" : "trail"),
							pos: vec2(notePosLerped.x, notePosLerped.y + ((i + 1) * ChartState.SQUARE_SIZE.y)),
							opacity: ChartState.conductor.timeInSeconds >= stamp.time ? 1 : 0.5,
							anchor: "center",
							shader: "replacecolor",
							uniform: {
								"u_targetcolor": ChartNote.moveToColor(stamp.move),
								"u_alpha": ChartState.conductor.timeInSeconds >= stamp.time ? 1 : 0.5,
							},
						});
					}
				}
			}

			// this draws the actual stamp (event or note)
			drawSprite({
				width: ChartState.SQUARE_SIZE.x,
				height: ChartState.SQUARE_SIZE.y,
				scale: ChartState.stampProps[isNote ? "notes" : "events"][index].scale,
				angle: ChartState.stampProps[isNote ? "notes" : "events"][index].angle,
				sprite: isNote ? GameSave.noteskin + "_" + stamp.move : stamp.id,
				pos: notePosLerped,
				opacity: ChartState.conductor.timeInSeconds >= stamp.time ? 1 : 0.5,
				anchor: "center",
			});
		}
	}

	ChartState.song.chart.notes.forEach((note, index) => drawStamp(note, index));
	ChartState.song.chart.events.forEach((ev, index) => drawStamp(ev, index));
}

/** Draw the strumline line */
export function drawStrumline(ChartState: StateChart) {
	// # strumlineline
	const strumlineYPos = ChartState.strumlineStep * ChartState.SQUARE_SIZE.y;
	drawRect({
		pos: vec2(center().x, strumlineYPos),
		anchor: "center",
		height: 5,
		radius: 5,
		color: RED,
		scale: vec2(ChartState.strumlineScale.x, 1),
		width: (ChartState.SQUARE_SIZE.x * 3),
	});
}

let cursorPos = vec2();
let lerpCursorPos = vec2();
/** Draw the cursor to highlight notes */
export function drawNoteCursor(ChartState: StateChart) {
	const strumlineYPos = ChartState.SQUARE_SIZE.y * ChartState.strumlineStep;

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
		else if (ChartState.scrollStep == ChartState.conductor.totalSteps /* && gameCursor.pos.y >= strumlineYPos */) {
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

	if (!ChartState.isCursorInGrid) return;

	// cursor = the square you're hovering over
	// draws the cursor
	let theSprite = "";
	if (ChartState.isInNoteGrid) theSprite = GameSave.noteskin + "_" + ChartState.currentMove;
	else theSprite = ChartState.currentEvent;

	const curColor = ChartState.isInNoteGrid ? ChartNote.moveToColor(ChartState.currentMove) : WHITE;

	cursorPos = ChartState.stepToPos(ChartState.hoveredStep - ChartState.scrollStep);
	if (ChartState.isInEventGrid) cursorPos = vec2(cursorPos.x + ChartState.SQUARE_SIZE.x, cursorPos.y);
	lerpCursorPos = lerp(lerpCursorPos, cursorPos, ChartState.LERP);

	drawRect({
		width: ChartState.SQUARE_SIZE.x - 5,
		height: ChartState.SQUARE_SIZE.y - 5,
		fill: false,
		outline: {
			width: 5,
			color: curColor,
			opacity: 1,
			cap: "round",
			join: "round",
		},
		radius: 3,
		pos: lerpCursorPos,
		anchor: "center",
		fixed: true,
	});

	// if there's already a note or trail or event in that space don't draw the sprite
	const noteAtStep = ChartState.isInNoteGrid
		&& (findStampAtStep(ChartState.hoveredStep, ChartState).note() != undefined
			|| trailAtStep(ChartState.hoveredStep, ChartState));
	const eventAtStep = ChartState.isInEventGrid
		&& ChartState.song.chart.events.some((ev) =>
			Math.round(ChartState.conductor.timeToStep(ev.time)) == ChartState.hoveredStep
		);
	if (noteAtStep || eventAtStep) return;

	drawSprite({
		sprite: theSprite,
		width: ChartState.SQUARE_SIZE.x - 5,
		height: ChartState.SQUARE_SIZE.y - 5,
		color: WHITE,
		opacity: wave(0.25, 0.75, time() * 6),
		scale: vec2(0.9),
		pos: lerpCursorPos,
		anchor: "center",
		fixed: true,
	});
}

/** Draw the minimap and the tiny notes */
export function drawMinimap(ChartState: StateChart) {
	// draws the minimap background
	drawRect({
		width: ChartState.SQUARE_SIZE.x,
		height: height(),
		color: BLACK.lerp(WHITE, 0.5),
		pos: vec2(ChartState.minimap.pos.x, 0),
		anchor: "top",
	});

	let minimapOp = 0;

	/** How big a note is depending on the amount of total steps */
	const SIZE = vec2(ChartState.SQUARE_SIZE.x / 2, height() / ChartState.conductor.totalSteps);

	if (ChartState.minimap.isMoving) minimapOp = 0.5;
	else if (ChartState.minimap.canMove) minimapOp = 0.25;
	else minimapOp = 0.1;

	const selectColor = BLUE.lighten(30);

	concatStamps(ChartState.song.chart.notes, ChartState.song.chart.events).forEach((stamp) => {
		const isNote = isStampNote(stamp);

		const noteStep = ChartState.conductor.timeToStep(stamp.time);
		let xPos = ChartState.minimap.pos.x;
		if (isNote) xPos -= SIZE.x;
		const yPos = map(noteStep, 0, ChartState.conductor.totalSteps, 0, height() - SIZE.y);

		const isSelected = ChartState.selectedStamps.includes(stamp);

		let theColor = isNote ? ChartNote.moveToColor(stamp.move) : BLACK.lerp(WHITE, 0.25);
		if (isSelected) theColor = theColor.lerp(selectColor, 0.25);

		const drawOpts = {
			width: SIZE.x,
			height: SIZE.y,
			color: theColor,
			anchor: "topleft",
			pos: vec2(xPos, yPos),
			opacity: 0.5,
		} as DrawRectOpt;

		if (isSelected) {
			drawOpts.outline = {
				color: selectColor,
				width: 2,
			};
		}

		drawRect(drawOpts);
		if (!isNote) return;
		if (!stamp.length) return;

		drawRect({
			width: drawOpts.width / 2,
			height: drawOpts.height * stamp.length,
			color: theColor,
			anchor: "top",
			pos: vec2(xPos + SIZE.x / 2, yPos),
			opacity: drawOpts.opacity,
			outline: drawOpts.outline,
		});
	});

	// draw the strumline
	drawRect({
		width: ChartState.SQUARE_SIZE.x,
		height: SIZE.y,
		opacity: 0.5,
		color: RED,
		anchor: "top",
		pos: vec2(ChartState.minimap.pos.x, ChartState.minimap.pos.y + (SIZE.y * ChartState.strumlineStep)),
	});

	// draws the minimap controller
	drawRect({
		width: ChartState.SQUARE_SIZE.x,
		height: SIZE.y * 11, // 11 is the amount of steps you can see
		anchor: "top",
		pos: ChartState.minimap.pos,
		opacity: minimapOp,
		color: YELLOW,
		outline: {
			width: 5,
			color: utils.blendColors(RED, YELLOW, 0.5),
		},
	});
}

/** Draw the thing for the selected note */
export function drawSelectSquares(ChartState: StateChart) {
	// unify this
	ChartState.selectedStamps.forEach((stamp) => {
		if (!isStampNote(stamp)) return;
		const stepOfSelectedNote = ChartState.conductor.timeToStep(stamp.time) - ChartState.scrollStep;
		const gizmoPos = ChartState.stepToPos(stepOfSelectedNote);
		const celesteColor = BLUE.lighten(150);
		const isNote = isStampNote(stamp);
		let height = ChartState.SQUARE_SIZE.y;
		if (isNote) height = ChartState.SQUARE_SIZE.y * (stamp.length ? stamp.length + 1 : 1);

		drawRect({
			width: ChartState.SQUARE_SIZE.x,
			height: height,
			anchor: "top",
			pos: vec2(gizmoPos.x, gizmoPos.y - ChartState.SQUARE_SIZE.y / 2),
			opacity: 0.5,
			color: celesteColor,
			outline: {
				width: 5,
				opacity: 1,
				color: celesteColor,
			},
		});
	});

	ChartState.selectedStamps.forEach((ev) => {
		if (isStampNote(ev)) return;
		const stepOfSelectedNote = ChartState.conductor.timeToStep(ev.time) - ChartState.scrollStep;
		const gizmoPos = ChartState.stepToPos(stepOfSelectedNote);
		gizmoPos.x += ChartState.SQUARE_SIZE.x;
		const celesteColor = BLUE.lighten(150);

		drawRect({
			width: ChartState.SQUARE_SIZE.x,
			height: ChartState.SQUARE_SIZE.y,
			anchor: "center",
			pos: vec2(gizmoPos.x, gizmoPos.y),
			opacity: 0.5,
			color: celesteColor,
			outline: {
				width: 5,
				opacity: 1,
				color: celesteColor,
			},
		});
	});
}

export function drawSelectionBox(ChartState: StateChart) {
	if (ChartState.selectionBox.width > 0 && ChartState.selectionBox.height > 0) {
		drawRect({
			width: ChartState.selectionBox.width,
			height: ChartState.selectionBox.height,
			pos: vec2(ChartState.selectionBox.pos.x, ChartState.selectionBox.pos.y),
			color: BLUE,
			opacity: 0.1,
			outline: {
				color: BLUE,
				width: 5,
			},
		});
	}
}
