import { triggerEvent } from "../game/events";
import { GameState } from "../game/gamestate";
import { customAudioPlay } from "../plugins/features/sound";

/** Manages the stuff related to music and beats */
export class Conductor {
	/** The customAudioPlay object of the current song that is playing */
	audioPlay: customAudioPlay;

	/** this.audioPlay.time() */
	currentTimeInSong: number;

	/** How long since last beat */
	howLongSinceLastBeat: number;

	/** Time between beats */
	beatInterval: number;

	/** Current beat */
	currentBeat: number;

	/** The bpm of the song on the audioPlay */
	BPM: number;

	constructor(audioPlay: customAudioPlay, bpm: number) {
		this.audioPlay = audioPlay;
		this.BPM = bpm;
	}
}

export function debugConductor() {
	let stuff = {}

	function createKeys() {
		let text = Object.keys(stuff).map((key) => `${key} ${stuff[key]}`).join("\n")
		return text
	}
	
	const textin = add([
		text(""),
		pos(),
		color(BLACK),
	]);

	onUpdate(() => {
		stuff["currentBeat"] = GameState.conductor.currentBeat;
		stuff["howLongSinceLastBeat"] = GameState.conductor.howLongSinceLastBeat.toFixed(2);
		stuff["beatInterval"] = GameState.conductor.beatInterval;
		textin.text = createKeys()
	})
}

/** Sets up the functions related to conducting the loop of the song, runs once */
export function setupConductor(conductor: Conductor) {
	GameState.conductor = conductor;
	GameState.conductor.currentBeat = 0;
	GameState.conductor.beatInterval = 60 / GameState.conductor.BPM;
	GameState.conductor.howLongSinceLastBeat = 0;

	onUpdate(() => {
		if (GameState.conductor.audioPlay.paused) return;

		GameState.conductor.currentTimeInSong = GameState.conductor.audioPlay.time();
		GameState.conductor.howLongSinceLastBeat += dt();

		if (GameState.conductor.howLongSinceLastBeat >= GameState.conductor.beatInterval) {
			GameState.conductor.howLongSinceLastBeat = 0;
			GameState.conductor.currentBeat++;
			
			if (GameState.conductor.currentBeat % 2 == 0) triggerEvent("twiceBeat");
			else triggerEvent("onBeatHit");
		}
	})

	debugConductor();
}