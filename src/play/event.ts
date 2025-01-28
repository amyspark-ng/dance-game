import { EaseFunc } from "kaplay";
import { cloneDeep } from "lodash";
import { utils } from "../utils";

const defaultEventSchema = {
	"change-scroll": { duration: 0, speed: 1.0, easing: 0 },
	"cam-move": { duration: 0, x: 0, y: 0, zoom: 1, angle: 0, easing: 0, bop_strength: 1 },
	"play-anim": { anim: "", speed: 1, force: false, looped: false, ping_pong: false },
	"change-dancer": { dancer: "astri" },
};

/** Stringed type for any of the ids in the event schema */
export type eventId = keyof typeof defaultEventSchema;

/** Class that holds the properties an event in a chart file would have
 *
 * Plus Some static properties related to events
 */
export class ChartEvent<T extends eventId = eventId> {
	/** Trigger a kaplay event with the id of one of the game events */
	static trigger(eventId: eventId) {
		return getTreeRoot().trigger(eventId);
	}

	/** Runs when an event with the id of one of the game events is triggered */
	static onEvent(eventId: eventId, action: (event: ChartEvent) => void) {
		return getTreeRoot().on(eventId, action);
	}

	/** All the ids for the events
	 *
	 * Is a getter so it can't be accidentally changed
	 */
	static get eventSchema() {
		return cloneDeep(defaultEventSchema);
	}

	static handle = {
		"cam-move": (curTime: number = 0, evs: ChartEvent[]) => {
			const currentEV = ChartEvent.getAtTime(
				"cam-move",
				curTime,
				evs,
			);

			if (!currentEV) return defaultEventSchema["cam-move"];

			const previousEV = ChartEvent.getAtTime(
				"cam-move",
				currentEV.time - dt(),
				evs,
			) ?? new ChartEvent("cam-move");

			let lerpV = mapc(
				curTime,
				currentEV.time,
				currentEV.time + currentEV.value.duration,
				0,
				1,
			);

			const theEasing = utils.getEasingByIndex(currentEV.value.easing) as EaseFunc;
			const easedLerpV = theEasing(lerpV);

			const newPos = lerp(
				vec2(previousEV.value.x, previousEV.value.y),
				vec2(currentEV.value.x, currentEV.value.y),
				easedLerpV,
			);

			const newAngle = lerp(
				previousEV.value.angle,
				currentEV.value.angle,
				easedLerpV,
			);

			const newZoom = lerp(
				previousEV.value.zoom,
				currentEV.value.zoom,
				easedLerpV,
			);

			const newBopStrength = lerp(
				previousEV.value.bop_strength,
				currentEV.value.bop_strength,
				easedLerpV,
			);

			return {
				angle: newAngle,
				x: newPos.x,
				y: newPos.y,
				zoom: newZoom,
				bop_strength: newBopStrength,
				duration: currentEV.value.duration,
				easing: currentEV.value.easing,
			};
		},
		"change-scroll": (curTime: number = 0, evs: ChartEvent[]) => {
			const currentEV = ChartEvent.getAtTime("change-scroll", curTime, evs);
			const previousEV = ChartEvent.getAtTime("change-scroll", curTime, evs);

			let lerpV = mapc(
				curTime,
				currentEV.time,
				currentEV.time + currentEV.value.duration,
				0,
				1,
			);

			const theEasing = easings[currentEV.value.easing[0]] as EaseFunc;
			// debug.log(Object.values(easings).includes(theEasing) ? "the function does exists!" : "you messed up");
			const easedLerpV = theEasing(lerpV);

			const newSpeed = lerp(
				previousEV.value.speed,
				currentEV.value.speed,
				easedLerpV,
			);

			return {
				duration: currentEV.value.duration,
				easing: currentEV.value.easing,
				speed: newSpeed,
			} as typeof defaultEventSchema["change-scroll"];
		},
		"change-dancer": (curTime: number = 0, evs: ChartEvent[]) => {
			return {
				dancer: "astri",
			} as typeof ChartEvent.eventSchema["change-dancer"];
		},
		"play-anim": (curTime: number = 0, evs: ChartEvent[]) => {
		},
	};

	/** Get the current event at a given time
	 * @param id The id of the event
	 * @param events The array of events to comb through
	 * @param time The current time
	 */
	static getAtTime<T extends eventId>(id: T, time: number, events: ChartEvent[]): ChartEvent<T> {
		// if the time is below the first event return a default
		if (!events[0] || time < events[0].time) {
			return new ChartEvent(id);
		}

		// otherwise do the thing to know
		let event = events[0];
		for (let i = 0; i < events.length; i++) {
			if (time >= events[i].time) event = events[i];
			if (time < events[i].time) break;
		}

		return event as ChartEvent<T>;
	}

	/** The time of the song the event must be triggered at */
	time: number = 0;
	/** The event id, string to know what is it */
	id: T;
	/** The value the event contains, might be an object or something else idk */
	value: typeof defaultEventSchema[T];

	constructor(id: T, value?: typeof defaultEventSchema[T]) {
		this.id = id;
		this.value = value ?? defaultEventSchema[this.id];
	}
}
