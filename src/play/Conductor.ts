import { triggerEvent } from "../game/events";
import { customAudioPlay } from "../plugins/features/sound";
import { TIME_FOR_STRUM } from "./objects/note";

/*  
	=== Some explanations about conducting and music ===
	I had to learn music theory from start, props to flagBearer for teaching some of the code related stuff.
	measure = bar, btw.

	A time signature, is how we dictate the steps, a 4/4 time signature means every 4th beat will be accentuated
	4/4 = 1, 2, 3, 4!!, 1, 2, 3, 4!!
	3/4 = 1, 2, 3!!, 1, 2, 3!!

	This 4th beat being the numerator (the number on the left)

	- 4/4 = 4 beats per measure = 16 steps per measure
	- 3/4 = 3 beats per measure = 12 steps per measure 

	The numerator in a time signature is the number of beats in a measure.
	It dictates how many times we count before going back to 1.

	The denominator is the 'type of beat'

	# For charting
	* A measure is every 'chunk' of the track, holds 16 steps
	* onBeatHit (aka a Beat) are the 4 bigger lines on each measure. 4 beats per measure
	* onStepHit (aka a Step) are the 16 spaces you can place notes in each measure (by default).
	4 steps per beat, so 16 steps per measure
*/

type conductorOpts = {
	audioPlay: customAudioPlay;
	bpm: number,
	timeSignature: [number, number],
	offset: number,
}

/** Manages the stuff related to music and beats */
export class Conductor {
	/** The customAudioPlay object of the current song that is playing */
	audioPlay: customAudioPlay;

	/** this.audioPlay.time() */
	timeInSeconds: number = 0;

	/** Beats per measure */
	timeSignature: [number, number]

	/** Interval between steps */
	stepInterval: number;

	/** Interval between beats */
	beatInterval: number;

	/** Is the top (0) number of the timeSignature */
	stepsPerBeat: number; 

	/** Is the bottom (1) number of the timeSignature */
	beatsPerMeasure: number;

	currentStep: number;
	currentBeat: number;

	/** The bpm of the song on the audioPlay */
	BPM: number = 100;

	/** Wheter the conductor is playing */
	paused: boolean = false;

	/** Gets how many beats are in the song */
	get totalBeats() {
		// Converts the the duration to minutes, BPM is how many beats there are in a minute
		// Multiplied by minutes in a song, total beats lol!
		return this.BPM * (this.audioPlay.duration() / 60)
	}

	/** Gets how many steps are in the song */
	get totalSteps() {
		return this.stepsPerBeat * this.totalBeats
	}

	/** Wheter the offset for the song has already passed */
	private started: boolean = false

	/** Changes the bpm */
	changeBpm(newBpm = 100) {
		this.BPM = newBpm
		this.beatInterval = 60 / this.BPM
		this.stepInterval = this.beatInterval / this.stepsPerBeat
	}

	/** Function that runs at the start of the conductor */
	add(offset?:number) {
		this.beatInterval = 60 / this.BPM;
	
		this.stepsPerBeat = this.timeSignature[0];
		this.beatsPerMeasure = this.timeSignature[1];
	
		this.stepInterval = this.beatInterval / this.stepsPerBeat;
	
		this.currentBeat = 0
		this.currentStep = 0
		this.timeInSeconds = -offset
	}

	/** Update function that should run onUpdate so the conductor gets updated */
	update() {
		if (this.timeInSeconds >= 0) this.audioPlay.paused = this.paused;
		if (this.paused) return;

		this.timeSignature[0] = this.stepsPerBeat;
		this.timeSignature[1] = this.beatsPerMeasure;

		if (this.timeInSeconds < 0) {
			this.timeInSeconds += dt()
			this.audioPlay.paused = true
			this.started = false
		}

		// if it has to start playing and hasn't started playing, play!!
		else if (this.timeInSeconds >= 0) {
			this.timeInSeconds = this.audioPlay.time()
			
			if (!this.started) {
				this.started = true
				getTreeRoot().trigger("conductorStart")
			}

			let oldBeat = this.currentBeat;
			let oldStep = this.currentStep;
			
			this.currentBeat = Math.floor(this.timeInSeconds / this.beatInterval);
			this.currentStep = Math.floor(this.timeInSeconds / this.stepInterval);

			if (oldBeat != this.currentBeat) {
				triggerEvent("onBeatHit")
			}

			if (oldStep != this.currentStep) {
				triggerEvent("onStepHit")
			}
		}
	}

	onStart(action: () => void) {
		return getTreeRoot().on("conductorStart", action)
	}

	constructor(opts: conductorOpts) {
		this.audioPlay = opts.audioPlay;
		this.BPM = opts.bpm;
		this.timeSignature = opts.timeSignature

		opts.offset = opts.offset ?? 0
		this.add(opts.offset)
		this.audioPlay?.stop();
	
		onUpdate(() => {
			this.update()
		})
	}
}

/** Extra conductor functions for converting units */
export class conductorUtils {
	/** Get which time of a song is a certain step */
	static timeToStep(timeInSeconds: number, lengthOfStep: number) {
		return Math.floor(timeInSeconds / lengthOfStep)
	}

	/** Get which step of a song is a certain time */
	static stepToTime(step: number, lengthOfStep: number) {
		return step * lengthOfStep
	}
}