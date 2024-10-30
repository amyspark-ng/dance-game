
import { AudioPlay, AudioPlayOpt, Key, TweenController } from "kaplay";
import { GameSave } from "../../gamesave";

// ======= SOUND PLAYING ==========
export class volumeChannel {
	muted: boolean = false;
	volume: number = 1;
}

type scratchOpts = {
	newDetune?: number,
	newSpeed?: number,
	newVolume?: number,
	/** How long the changes will take */
	time?: number,
}

/**
 * Custom interface that extends {@link AudioPlay `AudioPlay`}
 */
export interface customAudioPlay extends AudioPlay {
	/**
	 * Randomized the pitch of the sound 
	 */
	randomizePitch: (minMax?: [number, number]) => void
	/**
	 * Scratches a sound (like a record), if the params are lesser than the current AudioPlay object then at the end of the tween it will be PAUSED
	 */
	scratch: (opts?:scratchOpts) => TweenController

	/** Winds down a song, like in FNF! */
	windDown: () => void
}

/**
 * Custom type that extends {@link AudioPlayOpt `AudioPlayOpt`}
 */
type customAudioPlayOpt = AudioPlayOpt & {
	channel?: volumeChannel
}

/** Set of all the sound handlers in the game */
export const allSoundHandlers = new Set<customAudioPlay>

/**
 * Custom function for playing sound
 */
export function playSound(soundName: string, opts?:customAudioPlayOpt) : customAudioPlay {
	// don't remove this
	if (!opts) {
		opts = {
			channel: GameSave.sound.sfx
		}
	}
	
	// cases where opts.channel might be undefined
	// the chhanel will be set to default (sfx)
	if ((opts && !opts.channel) || (!opts.channel)) {
		opts.channel = GameSave.sound.sfx
	}

	const audioPlayer = play(soundName, { 
		volume: opts.channel?.volume ?? 1,
		...opts
	}) as customAudioPlay

	audioPlayer.randomizePitch = (minMax?: [number, number]) => {
		minMax = minMax ?? [-100, 100]
		audioPlayer.detune = rand(minMax[0], minMax[1])
	}

	audioPlayer.scratch = (opts:scratchOpts) => {
		let direction:"backwards" | "forwards"
		
		if (opts.newSpeed < audioPlayer.speed || opts.newDetune < audioPlayer.detune) {
			direction = "backwards"
		}

		else {
			direction = "forwards"
		}
		
		opts.newDetune = opts.newDetune ?? audioPlayer.detune - 80
		opts.newSpeed = opts.newSpeed ?? audioPlayer.speed * 0.8
		opts.newVolume = opts.newVolume ?? 0
		opts.time = opts.time ?? 0.5

		if (direction == "forwards") {
			audioPlayer.paused = false
		}

		tween(audioPlayer.detune, opts.newDetune, opts.time, (p) => audioPlayer.detune = p)
		tween(audioPlayer.speed, opts.newSpeed, opts.time, (p) => audioPlayer.speed = p)
		const tweenVolume = tween(audioPlayer.volume, opts.newVolume, opts.time, (p) => audioPlayer.volume = p)
		tweenVolume.onEnd(() => {
			if (direction == "backwards") {
				audioPlayer.paused = true
			}
		})
		return tweenVolume;
	}

	audioPlayer.windDown = () => {
		const ogDetune = audioPlayer.detune
		tween(audioPlayer.detune, ogDetune + 300, 0.1, (p) => audioPlayer.detune = p).onEnd(() => {
			tween(audioPlayer.detune, ogDetune - 150, 0.4, (p) => audioPlayer.detune = p)
		})
		const tweenVolume = tween(audioPlayer.volume, 0, 0.8, (p) => audioPlayer.volume = p)
		tweenVolume.onEnd(() => audioPlayer.paused = true)
	}

	allSoundHandlers.add(audioPlayer)
	audioPlayer.onEnd(() => {
		allSoundHandlers.delete(audioPlayer)
	})

	return audioPlayer;
}

export function changeAllSoundsVolume(set: Set<customAudioPlay>, volume: number) {
	set.forEach((handler) => {
		handler.volume = volume;
	})
}