import { triggerEvent } from "../game/events";
import { GameState } from "../game/gamestate";
import { customAudioPlay } from "../plugins/features/sound";
import { timeForStrum } from "./objects/note";

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
	* A measure is every 'block' of the track
	* onBeatHit (aka a Beat) are the 4 bigger lines on each measure. 4 beats per measure
	* onStepHit (aka a Step) are the 16 spaces you can place notes in each measure (by default).
	4 steps per beat, so 16 steps per measure
*/

type conductorOpts = {
	audioPlay: customAudioPlay;
	bpm: number,
	timeSignature: [number, number],
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
	lengthOfStep: number;

	/** Interval between beats */
	lengthOfBeat: number;

	/** Is the bottom (1) number of the timeSignature */
	beatsPerMeasure: number;
	
	/** Is the top (0) number of the timeSignature */
	stepsPerBeat: number; 

	currentBeat: number;

	/** The bpm of the song on the audioPlay */
	BPM: number = 100;

	/** Function that should run at the start of the conductor */
	add() {
		this.lengthOfBeat = 60 / this.BPM;
		this.beatsPerMeasure = this.timeSignature[1];
		this.stepsPerBeat = this.timeSignature[0];
		this.lengthOfStep = this.lengthOfBeat / this.stepsPerBeat;
	
		this.currentBeat = 0
		this.timeInSeconds = -timeForStrum()
		this.audioPlay.stop();
	}

	/** Update function that should run onUpdate so the conductor gets updated */
	update() {
		if (GameState.paused == false) {
			if (this.timeInSeconds < 0) {
				this.timeInSeconds += dt()
				this.audioPlay.paused = true
			}

			else {
				this.timeInSeconds = this.audioPlay.time()
				this.audioPlay.paused = GameState.paused;
				let oldBeat = this.currentBeat;
				this.currentBeat = Math.floor(this.timeInSeconds / this.lengthOfBeat);
		
				if (oldBeat != this.currentBeat) {
					triggerEvent("onBeatHit")
				}
			}
		}
	}

	constructor(opts: conductorOpts) {
		this.audioPlay = opts.audioPlay;
		this.BPM = opts.bpm;
		this.timeSignature = opts.timeSignature
		this.add()
	}
}

/** Sets up the functions related to conducting the loop of the song, runs once */
export function setupConductor(conductor: Conductor) {
	GameState.conductor = conductor;
	
	onUpdate(() => {
		GameState.conductor.update()
	})
}