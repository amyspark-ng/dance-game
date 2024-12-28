import { ChartNote } from "../play/objects/note";

const possibleEvents = [
	"transitionStart",
	"transitionEnd",
	"onBeatHit",
	"onStepHit",
	"onMeasureHit",
	"onNoteHit",
	"onMiss",
	"onReset",
] as const;

/** Type that dictates possible events in the game */
export type possibleEvents = typeof possibleEvents[number];

/** Triggers an event */
export function triggerEvent(possibleEvent: possibleEvents, args?: any) {
	getTreeRoot().trigger(possibleEvent, args);
}

/** Event that runs when a transition starts */
export function onTransitionStart(action: (nameOfTransition: string) => void) {
	return getTreeRoot().on("transitionStart", action);
}

/** Event that runs when a transition ends */
export function onTransitionEnd(action: (nameOfTransition: string) => void) {
	return getTreeRoot().on("transitionEnd", action);
}

export function onBeatHit(action: () => void) {
	return getTreeRoot().on("onBeatHit", action);
}

export function onStepHit(action: () => void) {
	return getTreeRoot().on("onStepHit", action);
}

export function onMeasureHit(action: () => void) {
	return getTreeRoot().on("onMeasureHit", action);
}

/** Runs when player hit a note, you can grab the note in action */
export function onNoteHit(action: (note: ChartNote) => void) {
	return getTreeRoot().on("onNoteHit", action);
}

/** Runs when player misses */
export function onMiss(action: (harm: boolean) => void) {
	return getTreeRoot().on("onMiss", action);
}

/** Runs when the gamescene has been reset */
export function onReset(action: () => void) {
	return getTreeRoot().on("onReset", action);
}
