// File that contains all the info for the events
// The data of an event is the object that holds its properties
// Every property in that data is called value

type baseDataValue = { label: string; description: string; };
type numberDataValue = { type: "number"; range: [number, number]; default: number; };
type booleanDataValue = { type: "boolean"; default: boolean; };
type stringDataValue = { type: "string"; default: string; };
type enumDataValue = { type: "enum"; options: string[]; default: string; };

/** The type for any of the values in an event's data */
export type eventValue = baseDataValue & (numberDataValue | booleanDataValue | stringDataValue | enumDataValue);

const allEasingKeys = Object.keys(easings);
// TODO: Finish the rest of the descriptions

/** The object that contains the information for all of the game's events */
const EventSchema = {
	// this is an event's schema
	"change-speed": {
		// each of these is a value
		"scroll_speed": { label: "Scroll", description: "How fast will the new scroll speed be", type: "number", default: 0, range: [-Infinity, Infinity] },
		"playback_speed": { label: "Playback", description: "How fast will the song be", type: "number", default: 0, range: [-Infinity, Infinity] },
		"duration": { label: "Duration", description: "How long will it take", type: "number", default: 0, range: [-Infinity, Infinity] },
		"easing": { label: "Easing", description: "What easing function to use", type: "enum", default: "linear", options: allEasingKeys },
	},

	"cam-move": {
		"x": { label: "X", description: "How fart to the right", type: "number", default: 0, range: [-Infinity, Infinity] },
		"y": { label: "Y", description: "How far to the bottom", type: "number", default: 0, range: [-Infinity, Infinity] },
		"duration": { label: "Duration", description: "How long will it take", type: "number", default: 0, range: [-Infinity, Infinity] },
		"easing": { label: "Easing", description: "What easing function to use", type: "enum", default: "linear", options: allEasingKeys },
	},

	"play-anim": {
		"anim": { label: "Animation", type: "string", default: "idle" },
		"speed": { label: "Speed", type: "number", default: 1, range: [-Infinity, Infinity] },
		"force": { label: "Forced", type: "boolean", default: false },
		"pingpong": { label: "Ping-Pong", type: "boolean", default: false },
	},

	"change-dancer": {
		"dancer": { label: "Dancer", type: "enum", options: ["astri"], default: "astri" },
	},
};

export default EventSchema;
