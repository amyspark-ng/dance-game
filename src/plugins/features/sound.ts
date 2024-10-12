
import { AudioPlay, AudioPlayOpt, Key } from "kaplay";

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
	scratch: (opts?:scratchOpts) => void

	/** Winds down a song, like in FNF! */
	windDown: () => void
}

/**
 * Custom type that extends {@link AudioPlayOpt `AudioPlayOpt`}
 */
type customAudioPlayOpt = AudioPlayOpt & {
	channel?: volumeChannel
}

/**
 * Custom function for playing sound
 */
export function playSound(soundName: string, opts?:customAudioPlayOpt) : customAudioPlay {
	opts = opts ?? {} as customAudioPlayOpt
	opts.channel = opts.channel ?? { volume: 1, muted: false } as volumeChannel
	
	const audioPlayer = play(soundName, { 
		...opts,
		volume: opts.channel.muted ? 0 : opts.channel.volume,
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
		tween(audioPlayer.volume, opts.newVolume, opts.time, (p) => audioPlayer.volume = p).onEnd(() => {
			if (direction == "backwards") {
				audioPlayer.paused = true
			}
		})
	}

	audioPlayer.windDown = () => {
		const ogDetune = audioPlayer.detune
		tween(audioPlayer.volume, 0, 0.8, (p) => audioPlayer.volume = p).onEnd(() => audioPlayer.paused = true)
		tween(audioPlayer.detune, ogDetune + 300, 0.1, (p) => audioPlayer.detune = p).onEnd(() => {
			tween(audioPlayer.detune, ogDetune - 150, 0.4, (p) => audioPlayer.detune = p)
		})
	}

	return audioPlayer
}
