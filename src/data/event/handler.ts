import { EaseFunc } from "kaplay";
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
		const currentEv = ChartEvent.getAtTime("cam-move", time, events);
		const previousEV = ChartEvent.getAtTime("cam-move", currentEv.time - 0.05, events);

		// console.log(currentEv);

		let lerpValue = mapc(time, currentEv.time, currentEv.time + currentEv.data.duration, 0, 1);
		if (isNaN(lerpValue)) lerpValue = 0;
		const easeFunc = easings[currentEv.data.easing] as EaseFunc;
		const easedLerpValue = easeFunc(lerpValue);

		const data = ChartEvent.getDefault("cam-move") as EventDataDefaults["cam-move"];
		data.duration = currentEv.data.duration;
		data.easing = currentEv.data.easing;
		data.x = lerp(previousEV.data.x, currentEv.data.x, easedLerpValue);
		data.y = lerp(previousEV.data.y, currentEv.data.y, easedLerpValue);
		data.angle = lerp(previousEV.data.angle, currentEv.data.angle, easedLerpValue);

		return data;
	},
} as handlerType;

export default EventHandler;
