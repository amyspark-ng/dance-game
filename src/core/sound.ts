import { openSync } from "fs";
import { AudioPlay, AudioPlayOpt, EaseFunc, Key, TweenController } from "kaplay";
import { utils } from "../utils";
import { GameSave } from "./save";

/* Small class that handles some sound related stuff */
export class Sound {
	static soundVolume: number = GameSave.soundVolume * GameSave.volume;
	static musicVolume: number = GameSave.musicVolume * GameSave.volume;

	static currentSong: AudioPlay = null;
	static sounds: Set<AudioPlay> = new Set<AudioPlay>();

	static onVolumeChange(action: (newVolume: number) => void) {
		return getTreeRoot().on("volume_change", action);
	}

	static playSound(soundName: string, opts?: AudioPlayOpt): AudioPlay {
		opts = opts ?? {};
		Sound.soundVolume = GameSave.soundVolume * GameSave.volume;
		const audioPlayer = play(soundName, opts);
		if (opts.volume) audioPlayer.volume = opts.volume;
		else audioPlayer.volume = Sound.soundVolume;
		Sound.sounds.add(audioPlayer);
		audioPlayer.onEnd(() => {
			Sound.sounds.delete(audioPlayer);
		});

		return audioPlayer;
	}

	static playMusic(songName: string, opts?: AudioPlayOpt) {
		opts = opts ?? {};

		const audioPlayer = play(songName, opts);
		if (opts.volume) audioPlayer.volume = opts.volume;
		else audioPlayer.volume = Sound.musicVolume;
		audioPlayer.onEnd(() => {
			Sound.currentSong = null;
		});

		Sound.currentSong = audioPlayer;
		return audioPlayer;
	}

	static changeVolume(newVolume: number) {
		getTreeRoot().trigger("volume_change", newVolume);
		newVolume = utils.fixDecimal(newVolume);
		newVolume = clamp(newVolume, 0, 1);
		GameSave.volume = newVolume;

		Sound.soundVolume = GameSave.soundVolume * GameSave.volume;
		Sound.musicVolume = GameSave.musicVolume * GameSave.volume;

		Sound.sounds.forEach((handler) => {
			handler.volume = Sound.soundVolume;
		});

		if (Sound.currentSong) {
			Sound.currentSong.volume = Sound.musicVolume;
		}
	}

	/** Fade in an audio play handler
	 * @param handler The handler
	 * @param volume The volume
	 * @param duration The volume
	 * @param easing The easing
	 */
	static fadeIn(
		handler: AudioPlay,
		volume: number = Sound.musicVolume,
		duration: number = 0.15,
		easing: EaseFunc = easings.linear,
	) {
		return tween(0, volume, duration, (p) => handler.volume = p, easing);
	}

	/** Fade out an audio play handler
	 * @param handler The handler
	 * @param volume The volume
	 * @param duration The volume
	 * @param easing The easing
	 */
	static fadeOut(
		handler: AudioPlay,
		volume: number = Sound.musicVolume,
		duration: number = 0.15,
		easing: EaseFunc = easings.linear,
	) {
		return tween(volume, 0, duration, (p) => handler.volume = p, easing);
	}

	static pauseScratch(handler: AudioPlay, duration: number = 0.15) {
		tween(handler.detune, -150, duration / 2, (p) => handler.detune = p);
		tween(handler.volume, 0, duration, (p) => handler.volume = p);
	}
}
