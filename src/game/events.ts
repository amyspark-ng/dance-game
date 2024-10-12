/** The game's main event handler */
export let gameEventHandler:any = null;

export function setupEventHandler() {
	gameEventHandler = new KEventHandler();
}

/** Type that dictates possible events in the game */
export type possibleEvents = "transitionStart" | "transitionEnd"

/** Triggrs an event */
export function triggerEvent(possibleEvent: possibleEvents, ...args:any) {
	gameEventHandler.trigger(possibleEvent, args)
	gameEventHandler.clear()
}

/** Event that runs when a transition starts */
export function onTransitionStart(action: (nameOfTransition: string) => void) {
	return gameEventHandler.on("transitionStart" as possibleEvents, action)
}

/** Event that runs when a transition ends */
export function onTransitionEnd(action: (nameOfTransition: string) => void) {
	return gameEventHandler.on("transitionEnd" as possibleEvents, action)
}