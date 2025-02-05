import { CustomAudioPlay } from "./core/sound";

/** Options to create a conductor */
type conductorOpts = {
	audioPlay: CustomAudioPlay;
	BPM: number;
	timeSignature: [number, number];
	offset?: number;
};

// Will only happen if lajbel decides to make it happen
class BPMChange {
	bpm: number = 100;
	time: number = 0;
}

// TODO: make it work with this.events

/*
	=== Some explanations about conducting and music ===
	I had to learn music theory from start, props to flagBearer for teaching some of the code related stuff
	And webadazzz <3 for teaching me some other music theory

	'Time signature' is the way we dictate the beat/rhythm of a song will go
		4/4 = 1, 2, 3, 4!!, 1, 2, 3, 4!!
		3/4 = 1, 2, 3!!, 1, 2, 3!!

		It's presented in the format of a fraction
		eg: 4/4, 3/4, 4/2, etc

		The numerator (0, first number) will mean the number of steps in a beat
		The denominator (1, second number) will mean the number of beats in a measure

		eg:
		- 4/4 = 4 beats per measure = 16 steps per measure
		- 3/4 = 3 beats per measure = 12 steps per measure

	'Step' is every little square we can place a note in, the numerator of the time signature.
		Dictates how many steps there will be in a beat

	'Beat' will be every (numerator) steps in a song.
		Is pretty crucial y'know makes everything look cool and boppy

	'Measure' is simply a chunk of the song that changes every (denominator) beats.
		A measure is also known as a 'Bar'

	'Crochet' is found in the code of some engines i've seen.
		It means step of, usually is beat, so Crochet would be length of beat
		And stepCrochet length of step
		I've usually  since this in miliseconds but i don't know if it exclusively means miliseconds

	This is some basic knowledge about music theory and it's terminology
	Mostly used in fnf and rhythm games, but it's pretty helpful to code tons of stuff :)
*/

/** Manages the stuff related to music and beats */
export class Conductor {
	/** The bpm of the song on the audioPlay */
	currentBPM: number = 100;

	/** The AudioPlay object of the current song that is playing */
	audioPlay: CustomAudioPlay;

	/** Is the current time in the song, the same as this.audioPlay.time() i think */
	time: number = 0;

	/** The time signature, array of 2 numbers */
	timeSignature: [number, number] = [4, 4];

	/** Is the top (0) number of the timeSignature, how many steps are in a beat */
	get stepsPerBeat() {
		return this.timeSignature[0];
	}

	/** Is the bottom (1) number of the timeSignature, how many beats are in a measure */
	get beatsPerMeasure() {
		return this.timeSignature[1];
	}

	/** Interval between steps */
	get stepInterval() {
		return this.beatInterval / this.stepsPerBeat;
	}

	/** Interval between beats */
	get beatInterval() {
		return 60 / this.currentBPM;
	}

	/** The time in steps */
	get stepTime() {
		return this.timeToStep(this.time);
	}

	/** The time in beats */
	get beatTime() {
		return this.timeToBeat(this.time);
	}

	/** The current step at the current time */
	currentStep = Math.floor(this.stepTime);

	/** The current beat at the current time */
	currentBeat = Math.floor(this.beatTime);

	/** Wheter the conductor is paused or nah */
	paused: boolean = false;

	/** Wheter the offset for the song has already passed */
	private started: boolean = false;

	/** Coverts a given time to a beat
	 * @returns The time in beats (can be fractional)
	 */
	timeToBeat(time: number = this.time, lengthOfBeat: number = this.beatInterval) {
		return time / lengthOfBeat;
	}

	/** Converts a given beat to a time */
	beatToTime(beat: number = this.currentBeat, lengthOfBeat: number = this.beatInterval) {
		return beat * lengthOfBeat;
	}

	/** Given a time in seconds returns time in steps
	 * @returns The time in steps (can be fractional)
	 */
	timeToStep(time: number, lengthOfStep: number = this.stepInterval) {
		return time / lengthOfStep;
	}

	/** Get which step of a song is a certain time
	 * @returns The time (can be fractional)
	 */
	stepToTime(step: number, lengthOfStep: number = this.stepInterval) {
		return step * lengthOfStep;
	}

	/** Gets how many beats are in the song */
	get totalBeats() {
		return Math.floor(this.timeToBeat(this.audioPlay.duration()));
	}

	/** Gets how many steps are in the song */
	get totalSteps() {
		return Math.floor(this.timeToStep(this.audioPlay.duration()));
	}

	events = new KEventHandler();

	destroy() {
		this.audioPlay.stop();
		this.events.clear();
	}

	/** Update function that should run onUpdate so the conductor gets updated */
	private update() {
		if (this.time >= 0) this.audioPlay.paused = this.paused;

		if (this.time < 0) {
			if (this.paused) return;
			this.time += dt();
			this.audioPlay.paused = true;
			this.started = false;
		}
		// if it has to start playing and hasn't started playing, play!!
		else if (this.time >= 0) {
			if (!this.started) {
				this.started = true;
				this.events.trigger("start");
			}

			if (!this.paused) {
				this.time = this.audioPlay.time();
			}

			const oldStep = this.currentStep;
			const oldBeat = this.currentBeat;

			// Can't make these getters because of the code below
			this.currentStep = Math.floor(this.stepTime);
			this.currentBeat = Math.floor(this.beatTime);

			// // if (this.paused) return;
			if (oldStep != this.currentStep) this.events.trigger("step", this.currentStep);
			if (oldBeat != this.currentBeat) this.events.trigger("beat", this.currentBeat);
		}
	}

	/** Runs when the conductor starts playing (time in seconds is greater than 0) */
	onStart(action: () => void) {
		return this.events.on("start", action);
	}

	/** Runs when the conductor's beat changes */
	onBeatHit(action: (curBeat: number) => void) {
		return this.events.on("beat", action);
	}

	/** Runs when the conductor's step changes */
	onStepHit(action: (curStep: number) => void) {
		return this.events.on("step", action);
	}

	constructor(opts: conductorOpts) {
		opts.offset = opts.offset ?? 0;

		this.currentBPM = opts.BPM;
		this.audioPlay = opts.audioPlay;
		this.timeSignature = opts.timeSignature;
		this.events = new KEventHandler();

		if (opts.offset > 0) this.time = -opts.offset;
		else this.time = 0;

		onUpdate(() => {
			this.update();
		});
	}
}
