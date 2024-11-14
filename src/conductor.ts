import { triggerEvent } from "./core/events";
import { customAudioPlay } from "./core/plugins/features/sound";

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

	This is some basic knowledge about music theory and it's terminology
	Mostly used in fnf and rhythm games, but it's pretty helpful to code tons of stuff :)
*/

type conductorOpts = {
	audioPlay: customAudioPlay;
	bpm: number,
	bpmChanges: { time: number, bpm: number }[]
	timeSignature: [number, number],
	offset?: number,
}

/** Manages the stuff related to music and beats */
export class Conductor {
	/** The customAudioPlay object of the current song that is playing */
	audioPlay: customAudioPlay;

	/** this.audioPlay.time() */
	timeInSeconds: number = 0;

	/** Beats per measure */
	timeSignature: [number, number] = [4, 4]

	/** Interval between steps */
	stepInterval: number = 0;

	/** Interval between beats */
	beatInterval: number = 0;

	/** Is the top (0) number of the timeSignature */
	stepsPerBeat: number = 0; 

	/** Is the bottom (1) number of the timeSignature */
	beatsPerMeasure: number = 0;

	currentStep: number = 0;
	currentBeat: number = 0;
	currentMeasure: number = 0;

	/** The bpm of the song on the audioPlay */
	BPM: number = 100;

	/** The bpm changes of the song */
	bpmChanges: { time: number, bpm: number }[] = [];

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

	/** Get which time of a song is a certain step */
	timeToStep(timeInSeconds: number, lengthOfStep: number = this.stepInterval) {
		return Math.floor(timeInSeconds / lengthOfStep)
	}

	/** Get which step of a song is a certain time */
	stepToTime(step: number, lengthOfStep: number = this.stepInterval) {
		return step * lengthOfStep
	}

	/** Wheter the offset for the song has already passed */
	private started: boolean = false

	/** Changes the bpm */
	setBPM(newBpm = 100) {
		this.BPM = newBpm
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
			
			// sets the bpm
			this.bpmChanges.forEach((bpmChange, index) => {
				const previousBpmChange = this.bpmChanges[index - 1]
				
				if (previousBpmChange) {
					if (this.timeInSeconds >= bpmChange.time && this.timeInSeconds >= previousBpmChange.time) this.BPM = bpmChange.bpm
				}
				
				else {
					if (this.timeInSeconds >= bpmChange.time) this.BPM = bpmChange.bpm
				}
			})

			if (!this.started) {
				this.started = true
				getTreeRoot().trigger("conductorStart")
			}

			let oldBeat = this.currentBeat;
			let oldStep = this.currentStep;
			let oldMeasure = this.currentMeasure;
			
			this.beatInterval = 60 / this.BPM
			this.stepInterval = this.beatInterval / this.stepsPerBeat

			this.currentBeat = Math.floor(this.timeInSeconds / this.beatInterval);
			this.currentStep = Math.floor(this.timeInSeconds / this.stepInterval);
			this.currentMeasure = Math.floor(this.currentBeat / this.beatsPerMeasure);

			if (oldBeat != this.currentBeat) {
				triggerEvent("onBeatHit")
			}

			if (oldStep != this.currentStep) {
				triggerEvent("onStepHit")
			}
			
			if (oldMeasure != this.currentMeasure) {
				triggerEvent("onMeasureHit")
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
		this.bpmChanges = opts.bpmChanges;

		opts.offset = opts.offset ?? 0
		this.add(opts.offset)
		this.audioPlay?.stop();
	
		onUpdate(() => {
			this.update()
		})
	}
}