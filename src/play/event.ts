import { EaseFunc } from "kaplay";

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

/** Class that holds the properties an event in a chart file would have
 *
 * Plus Some static properties related to events
 */
export class ChartEvent {
	/** The time of the song the event must be triggered at */
	time: number;
	/** The event id, string to know what is it */
	id: keyof typeof ChartEvent.eventSchema;
	/** The value the event contains, might be an object or something else idk */
	value: any;

	/** All the ids for the events
	 *
	 * Is a getter so it can't be accidentally changed
	 */
	static get eventSchema() {
		return {
			"change-scroll": { duration: 0, speed: 1.0, easing: ["linear"] },
			"cam-move": { duration: 0, x: 0, y: 0, zoom: 1, angle: 0, easing: ["linear"] },
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
				currentEV.time - 1 / 100,
			);

			// let lerpV = mapc(
			// 	curTime,
			// 	0, // min range value
			// 	5, // max range value
			// 	100, // min result value
			// 	300, // max result value
			// );

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

			const newPos = lerp(
				vec2(center().x + previousEV.value.x, center().y + previousEV.value.y),
				vec2(center().x + currentEV.value.x, center().y + currentEV.value.y),
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

			return {
				angle: newAngle,
				x: newPos.x,
				y: newPos.y,
				zoom: newZoom,
				bopStrength: newBopStrength,
				duration: currentEV.value.duration,
				easing: currentEV.value.easing,
			} as typeof ChartEvent.eventSchema["cam-move"];
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
		},
		"play-anim": (curTime: number = 0, evs: ChartEvent[]) => {
		},
	};

	/** Get the current event at a given time
	 * @param id The id of the event
	 * @param arr The array of events to comb through
	 * @param time The current time
	 */
	static getAtTime(id: keyof typeof ChartEvent.eventSchema | "any", arr: ChartEvent[], time: number): ChartEvent {
		let events = arr;
		if (id != "any") events = events.filter((ev) => ev.id == id);

		// if no events or
		// if the time is below the first event return a default
		if (!events || !events[0] || time < events[0].time) {
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
	keyof typeof ChartEvent.eventSchema,
	(curTime: number, evs: ChartEvent[]) => any
>;
