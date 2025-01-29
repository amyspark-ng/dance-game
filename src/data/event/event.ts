import EventSchema from "./schema";

/** Stringed type for any of the ids in the event schema */
export type eventId = keyof typeof EventSchema;

/** A type schema for all the event defaults */
export type EventDataDefaults = {
	[K in keyof typeof EventSchema]: {
		[V in keyof typeof EventSchema[K]]: typeof EventSchema[K][V] extends { default: infer D; } ? D : never;
	};
};

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

	/** Gets the default values of an event's data */
	static getDefault<T extends eventId = eventId>(id: eventId): EventDataDefaults[T] {
		const obj = {} as EventDataDefaults[T];
		Object.keys(EventSchema[id]).forEach((key) => {
			obj[key] = EventSchema[id][key].default;
		});

		return obj;
	}

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
	/** The data the event contains */
	data: EventDataDefaults[T];

	constructor(id?: T, data?: EventDataDefaults[T]) {
		this.id = id;
		this.data = data ?? ChartEvent.getDefault(this.id);
	}
}
