import { triggerEvent } from "./core/events";
import { customAudioPlay } from "./core/plugins/features/sound";
import { utils } from "./utils";

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

/** Dummy class for the bpm change event */
export class BpmChangeEV {
	time: number;
	value: number;
}

// what
class cumulativeTime {
	step: number; cumulativeTime: number; bpm: number;
}

/** Options to create a conductor */
type conductorOpts = {
	audioPlay: customAudioPlay;
	initialBPM: number,
	bpmChanges: BpmChangeEV[]
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

	/** The BPM the song starts at */
	initialBPM: number = 100;

	/** The bpm of the song on the audioPlay */
	BPM: number = 100;

	/** The bpm changes of the song */
	bpmChanges: BpmChangeEV[] = [];

	/** Wheter the conductor is playing */
	paused: boolean = false;

	/** Wheter the offset for the song has already passed */
	private started: boolean = false

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

	/** Converts a given time to a beat */
	timeToBeat(time: number) {
		return this.timeToStep(time) / this.stepsPerBeat 
	}

	// /**
	//  * Given a time in beats and fractional beats, return a time in milliseconds.
	//  * @param beatTime The time in beats.
	//  * @return The time in milliseconds.
	//  */
	// beatToTime(beat:number) : number {
	// 	if (this.bpmChanges.length == 0) {
	// 		return beat * this.stepInterval * this.stepsPerBeat;
	// 	}

	// 	else {
	// 		let resultMs = 0

	// 		let lastTimeChange:BpmChangeEV = this.bpmChanges[0]
	// 		for (const ev of this.bpmChanges) {
	// 			// if (beat >= this.s)
	// 		}
	// 	}
		
	// 	if (timeChanges.length == 0)
	// 	{
	// 	// Assume a constant BPM equal to the forced value.
	// 	return beatTime * stepLengthMs * Constants.STEPS_PER_BEAT;
	// 	}
	// 	else
	// 	{
	// 	var resultMs:Float = 0;

	// 	var lastTimeChange:SongTimeChange = timeChanges[0];
	// 	for (timeChange in timeChanges)
	// 	{
	// 		if (beatTime >= timeChange.beatTime)
	// 		{
	// 		lastTimeChange = timeChange;
	// 		resultMs = lastTimeChange.timeStamp;
	// 		}
	// 		else
	// 		{
	// 		// This time change is after the requested time.
	// 		break;
	// 		}
	// 	}

	// 	var lastStepLengthMs:Float = ((Constants.SECS_PER_MIN / lastTimeChange.bpm) * Constants.MS_PER_SEC) / timeSignatureNumerator;
	// 	resultMs += (beatTime - lastTimeChange.beatTime) * lastStepLengthMs * Constants.STEPS_PER_BEAT;

	// 	return resultMs;
	// 	}
	// }

	/** Get which time of a song is a certain step */
	timeToStep(timeInSeconds: number, lengthOfStep: number = this.stepInterval) {
		return Math.floor(timeInSeconds / lengthOfStep);
	}
	
	/** Get which step of a song is a certain time */
	stepToTime(step: number, lengthOfStep: number = this.stepInterval) {
		if (this.bpmChanges.length == 0) {
			return step * lengthOfStep
		}

		else {
			var resultMs = 0;

			var lastTimeChange:BpmChangeEV = this.bpmChanges[0];
			
			for (const ev of this.bpmChanges) {
				if (step >= this.timeToBeat(ev.time) * this.stepsPerBeat) {
					lastTimeChange = ev
					resultMs = ev.time
				}
	
				else {
					break;
				}
			}

			let lastStepLengthMs = ((60 / lastTimeChange.value) * 1000) / this.stepsPerBeat;
			resultMs += (step - (this.timeToBeat(lastTimeChange.time)) * this.stepsPerBeat) * lastStepLengthMs;
	
			// is in miliseconds due to being copied from funkin
			return resultMs / 1000;
		}
	}

	/** Updates some intervals */
	private updateIntervals() {
		this.beatInterval = 60 / this.BPM
		this.stepInterval = this.beatInterval / this.stepsPerBeat

		const timeInSteps = this.timeInSeconds / this.stepInterval
		const timeInBeats = timeInSteps / this.stepsPerBeat

		this.currentStep = Math.floor(timeInSteps);
		this.currentBeat = Math.floor(timeInBeats);
		this.currentMeasure = Math.floor(this.currentBeat / this.beatsPerMeasure);
	}

	/** Get the BPM at a certain time */
	getCurrentBPMchange(time: number = this.timeInSeconds) : BpmChangeEV {
		const lastEvent = [...this.bpmChanges].reverse().find(ev => ev.time <= time);
		return lastEvent ?? { time: 0, value: this.initialBPM };
	}

	/** Update function that should run onUpdate so the conductor gets updated */
	private update() {
		if (this.timeInSeconds >= 0) this.audioPlay.paused = this.paused;
		
		this.timeSignature[0] = this.stepsPerBeat;
		this.timeSignature[1] = this.beatsPerMeasure;
		
		if (this.timeInSeconds < 0) {
			if (this.paused) return;
			this.timeInSeconds += dt()
			this.audioPlay.paused = true
			this.started = false
		}

		// if it has to start playing and hasn't started playing, play!!
		else if (this.timeInSeconds >= 0) {
			this.BPM = this.getCurrentBPMchange(this.timeInSeconds).value
			
			if (!this.paused) {
				this.timeInSeconds = this.audioPlay.time()
			};
			
			if (!this.started) {
				this.started = true
				getTreeRoot().trigger("conductorStart")
			}

			let oldBeat = this.currentBeat;
			let oldStep = this.currentStep;
			let oldMeasure = this.currentMeasure;
			
			this.updateIntervals()

			if (this.paused) return;
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
		this.initialBPM = opts.initialBPM;
		this.BPM = this.initialBPM;
		this.audioPlay = opts.audioPlay;
		this.timeSignature = opts.timeSignature
		this.bpmChanges = opts.bpmChanges;

		opts.offset = opts.offset ?? 0
		
		this.stepsPerBeat = this.timeSignature[0];
		this.beatsPerMeasure = this.timeSignature[1];
	
		this.currentBeat = 0
		this.currentStep = 0
		if (opts.offset > 0) this.timeInSeconds = -opts.offset
		else this.timeInSeconds = 0
		this.audioPlay?.stop();
	
		// i almost krilled myself because of this
		this.updateIntervals()

		onUpdate(() => {
			this.update()
		})
	}
}