/** Class that holds the properties an event in a chart file would have
 *
 * Plus Some static properties related to events
 */
export class ChartEvent {
	/** The time of the song the event must be triggered at */
	time: number;
	/** The event id, string to know what is it */
	id: string;
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
			"play-anim": { anim: "victory", speed: 1, force: false, looped: false, ping_pong: false },
			"change-dancer": { dancer: "astri" },
		};
	}

	/** Get the current event at a given time
	 * @param id The id of the event
	 * @param arr The array of events to comb through
	 * @param time The current time
	 */
	static getAtTime(id: keyof typeof ChartEvent.eventSchema | "any", arr: ChartEvent[], time: number): ChartEvent {
		let events = arr;
		if (id != "any") events = events.filter((ev) => ev.id == id);

		// if no events
		if (!events || !events[0]) return undefined;

		// if the time is below the first event return a default
		if (time < events[0].time) return { id: id, time: 0, value: ChartEvent.eventSchema[id] } as ChartEvent;

		// otherwise do the thing to know
		let event = events[0];
		for (let i = 0; i < events.length; i++) {
			if (time >= events[i].time) event = events[i];
			if (time < events[i].time) break;
		}
		return event;
	}
}
