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

import { AudioPlay } from "kaplay";

/** Options to create a conductor */
type conductorOpts = {
	audioPlay: AudioPlay;
	BPM: number;
	timeSignature: [number, number];
	offset?: number;
};

/** Manages the stuff related to music and beats */
export class Conductor {
	/** The AudioPlay object of the current song that is playing */
	audioPlay: AudioPlay;

	/** Is the current time in the song, the same as this.audioPlay.time() i think */
	timeInSeconds: number = 0;

	/** The time signature, array of 2 numbers */
	timeSignature: [number, number] = [4, 4];

	/** Interval between steps */
	stepInterval: number = 0;

	/** Interval between beats */
	beatInterval: number = 0;

	/** Is the top (0) number of the timeSignature, how many steps are in a beat */
	stepsPerBeat: number = 0;

	/** Is the bottom (1) number of the timeSignature, how many beats are in a measure */
	beatsPerMeasure: number = 0;

	/** The time in steps */
	stepTime: number = 0;

	/** The time in beats */
	beatTime: number = 0;

	/** The current step at the current time */
	currentStep: number = 0;

	/** The current beat at the current time */
	currentBeat: number = 0;

	/** The bpm of the song on the audioPlay */
	BPM: number = 100;

	/** Wheter the conductor is paused or nah */
	paused: boolean = false;

	/** Wheter the offset for the song has already passed */
	private started: boolean = false;

	/** Sets the intervals */
	private updateIntervals() {
		this.beatInterval = 60 / this.BPM;
		this.stepInterval = this.beatInterval / this.stepsPerBeat;
	}

	/** Coverts a given time to a beat
	 * @returns The time in beats (can be fractional)
	 */
	timeToBeat(time: number = this.timeInSeconds, lengthOfBeat: number = this.beatInterval) {
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

	/** Changes the time signature */
	changeTimeSignature(newTm: [number, number]) {
		this.timeSignature = newTm;
		this.stepsPerBeat = newTm[0];
		this.beatsPerMeasure = newTm[1];
	}

	/** Update function that should run onUpdate so the conductor gets updated */
	private update() {
		if (this.timeInSeconds >= 0) this.audioPlay.paused = this.paused;

		if (this.timeInSeconds < 0) {
			if (this.paused) return;
			this.timeInSeconds += dt();
			this.audioPlay.paused = true;
			this.started = false;
		}
		// if it has to start playing and hasn't started playing, play!!
		else if (this.timeInSeconds >= 0) {
			if (!this.paused) {
				this.timeInSeconds = this.audioPlay.time();
			}

			if (!this.started) {
				this.started = true;
				this.trigger("start");
			}

			this.updateIntervals();

			const oldStep = this.currentStep;
			const oldBeat = this.currentBeat;

			this.currentStep = Math.floor(this.timeToStep(this.timeInSeconds));
			this.currentBeat = Math.floor(this.timeToBeat(this.timeInSeconds));

			// if (this.paused) return;
			if (oldStep != this.currentStep) {
				this.trigger("step", this.currentStep);
			}

			if (oldBeat != this.currentBeat) {
				this.trigger("beat", this.currentStep);
			}
		}
	}

	/** Trigger an event */
	private trigger(event: "start" | "beat" | "step" | "measure", ...args: any) {
		return getTreeRoot().trigger(event, args);
	}

	/** Runs when the conductor starts playing (time in seconds is greater than 0) */
	onStart(action: () => void) {
		return getTreeRoot().on("start", action);
	}

	/** Runs when the conductor's beat changes */
	onBeatHit(action: (curBeat: number) => void) {
		return getTreeRoot().on("beat", action);
	}

	/** Runs when the conductor's step changes */
	onStepHit(action: (curStep: number) => void) {
		return getTreeRoot().on("step", action);
	}

	/** Runs when the conductor's measure changes */
	onMeasureHit(action: (curMeasure: number) => void) {
		return getTreeRoot().on("measure", action);
	}

	constructor(opts: conductorOpts) {
		opts.offset = opts.offset ?? 0;

		this.BPM = opts.BPM;
		this.audioPlay = opts.audioPlay;
		this.changeTimeSignature(opts.timeSignature);
		this.updateIntervals();

		this.currentBeat = 0;
		this.currentStep = 0;
		if (opts.offset > 0) this.timeInSeconds = -opts.offset;
		else this.timeInSeconds = 0;
		this.audioPlay?.stop();

		onUpdate(() => {
			this.update();
		});
	}
}
