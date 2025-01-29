import { ChartEvent, EventDataDefaults, eventId } from "./event";

type handlerType = {
	[T in eventId]: (
		time: number,
		events: ChartEvent[],
	) => EventDataDefaults[T];
};

/** Object that handles and returns the value of an event at a given time */
const EventHandler = {
	"cam-move": (time, events) => {
		return {
			x: 0,
			y: 0,
			duration: 0,
			easing: "linear",
		};
	},
} as handlerType;

export default EventHandler;
