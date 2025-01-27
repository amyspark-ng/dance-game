import { EaseFunc } from "kaplay";

// {
//     "id": "cam-move",
//     "time": 0,
//     "value": {
//         "duration": 0.15,
//         "x": 0,
//         "y": 0,
//         "zoom": 1,
//         "angle": 0,
//         "bopStrength": 1.05,
//         "easing": [
//             "linear"
//         ]
//     }
// }

class EventSchema {
	id: string;
	name: string;
	defaultValue: any;
	constructor(id: string, name: string, defaultValue: any) {
		this.id = id;
		this.name = name;
		this.defaultValue = defaultValue;
	}
}

/** Stringed type for any of the ids in the event schema */
export type eventId = keyof typeof ChartEvent.eventSchema;

/** Class that holds the properties an event in a chart file would have
 *
 * Plus Some static properties related to events
 */
export class ChartEvent {
	/** The time of the song the event must be triggered at */
	time: number;
	/** The event id, string to know what is it */
	id: eventId;
	/** The value the event contains, might be an object or something else idk */
	value: any;

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
		return {
			"change-scroll": { duration: 0, speed: 1.0, easing: ["linear"] },
			"cam-move": { duration: 0, x: 0, y: 0, zoom: 1, angle: 0, easing: ["linear"], bopStrength: 1 },
			"play-anim": { anim: "", speed: 1, force: false, looped: false, ping_pong: false },
			"change-dancer": { dancer: "astri" },
		};
	}

	static handle: ChartEventHandler = {
		"cam-move": (curTime: number = 0, evs: ChartEvent[]) => {
			const currentEV = ChartEvent.getAtTime(
				"cam-move",
				evs,
				curTime,
			);

			const previousEV = ChartEvent.getAtTime(
				"cam-move",
				evs,
				currentEV.time - dt(),
			);

			let lerpV = map(
				curTime,
				currentEV.time,
				currentEV.time + currentEV.value.duration,
				0,
				1,
			);

			if (isNaN(lerpV)) {
				lerpV = 0;
			}

			const theEasing = easings[currentEV.value.easing[0]] as EaseFunc;
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
				previousEV.value.bopStrength,
				currentEV.value.bopStrength,
				easedLerpV,
			);

			const endData = {
				angle: newAngle,
				x: newPos.x,
				y: newPos.y,
				zoom: newZoom,
				bopStrength: newBopStrength,
				duration: currentEV.value.duration,
				easing: currentEV.value.easing,
			} as typeof ChartEvent.eventSchema["cam-move"];

			// console.log(endData);

			return endData;
		},
		"change-scroll": (curTime: number = 0, evs: ChartEvent[]) => {
			const currentEV = ChartEvent.getAtTime("change-scroll", evs, curTime);
			const previousEV = ChartEvent.getAtTime("change-scroll", evs, curTime);

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
			} as typeof ChartEvent.eventSchema["change-scroll"];
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
	static getAtTime(id: eventId | "any", events: ChartEvent[], time: number): ChartEvent {
		if (id != "any") events = events.filter((ev) => ev.id == id);

		// if no events or
		// if the time is below the first event return a default
		if (!events || !events[0] || time < events[0].time) {
			if (id == "any") return null;
			return { id: id, time: 0, value: ChartEvent.eventSchema[id] } as ChartEvent;
		}

		// otherwise do the thing to know
		let event = events[0];
		for (let i = 0; i < events.length; i++) {
			if (time >= events[i].time) event = events[i];
			if (time < events[i].time) break;
		}
		return event;
	}
}

/** The type of the handler object for the chart events */
type ChartEventHandler = Record<
	eventId,
	(curTime: number, evs: ChartEvent[]) => any
>;
