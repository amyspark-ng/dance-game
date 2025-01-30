// File that contains all the info for the events
// The data of an event is the object that holds its properties
// Every property in that data is called value

type baseDataValue = { label: string; description: string; };
type numberDataValue = { type: "number"; range: [number, number]; default: number; };
type booleanDataValue = { type: "boolean"; default: boolean; };
type stringDataValue = { type: "string"; default: string; };
type enumDataValue = { type: "enum"; options: string[]; default: string; };
type actionDataValue = { type: "action"; default: string; };

/** The type for any of the values in an event's data */
export type eventValue = baseDataValue & (numberDataValue | booleanDataValue | stringDataValue | enumDataValue | actionDataValue);

const allEasingKeys = Object.keys(easings);

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

	"bpm-change": {
		"bpm": { label: "BPM", description: "What bpm to change to", type: "number", default: 100, range: [-Infinity, Infinity] },
	},

	"cam-move": {
		"x": { label: "X", description: "How fart to the right", type: "number", default: 0, range: [-Infinity, Infinity] },
		"y": { label: "Y", description: "How far to the bottom", type: "number", default: 0, range: [-Infinity, Infinity] },
		"angle": { label: "Angle", description: "How much to spin it", type: "number", default: 0, range: [-Infinity, Infinity] },
		"zoom": { label: "Zoom", description: "How much zoom", type: "number", default: 1, range: [-Infinity, Infinity] },
		"bop_strength": { label: "Bop strength", description: "How strong will the beat zoom be", type: "number", default: 1, range: [-Infinity, Infinity] },
		"bop_rate": { label: "Bops per beat", description: "Zooms per beat", type: "number", default: 1, range: [-Infinity, Infinity] },
		"duration": { label: "Duration", description: "How long will it take", type: "number", default: 0, range: [-Infinity, Infinity] },
		"easing": { label: "Easing", description: "What easing function to use", type: "enum", default: "linear", options: allEasingKeys },
	},

	"play-anim": {
		"anim": { label: "Animation", description: "What animation to play", type: "string", default: "idle" },
		"speed": { label: "Speed", description: "How fast will it be", type: "number", default: 1, range: [-Infinity, Infinity] },
		"force": { label: "Forced", description: "Wheter to override any other", type: "boolean", default: false },
		"pingpong": { label: "Ping-Pong", description: "Wheter it should go back to the start after finishing", type: "boolean", default: false },
	},

	"change-dancer": {
		"dancer": { label: "Dancer", description: "What dancer to change to", type: "enum", options: ["Astri"], default: "astri" },
	},
};

export default EventSchema;
