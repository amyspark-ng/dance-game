import { openSync } from "fs";
import { AudioPlay, AudioPlayOpt, EaseFunc, Key, TweenController } from "kaplay";
import { utils } from "../utils";
import { GameSave } from "./save";

export interface CustomAudioPlay extends AudioPlay {
	/** Fade in an audio play handler
	 * @param newVolume The volume
	 * @param duration The volume
	 * @param easing The easing
	 */
	fadeIn: (newVolume?: number, duration?: number, easing?: EaseFunc) => TweenController;
	/** Fade out an audio play handler
	 * @param duration The volume
	 * @param easing The easing
	 */
	fadeOut: (duration?: number, easing?: EaseFunc) => TweenController;
}

/* Small class that handles some sound related stuff */
export class Sound {
	static soundVolume: number = GameSave.soundVolume * GameSave.volume;
	static musicVolume: number = GameSave.musicVolume * GameSave.volume;

	static currentSong: CustomAudioPlay = null;
	static sounds: Set<CustomAudioPlay> = new Set<CustomAudioPlay>();

	static onVolumeChange(action: (newVolume: number) => void) {
		return getTreeRoot().on("volume_change", action);
	}

	static playSound(soundName: string, opts?: AudioPlayOpt): CustomAudioPlay {
		opts = opts ?? {};
		Sound.soundVolume = GameSave.soundVolume * GameSave.volume;
		const audioPlayer = play(soundName, opts) as CustomAudioPlay;
		if (opts.volume) audioPlayer.volume = opts.volume;
		else audioPlayer.volume = Sound.soundVolume;
		Sound.sounds.add(audioPlayer);
		audioPlayer.onEnd(() => {
			Sound.sounds.delete(audioPlayer);
		});

		audioPlayer.fadeIn = (newVolume: number = audioPlayer.volume, duration: number = 0.15, easing: EaseFunc = easings.linear) => {
			return tween(0, newVolume, duration, (p) => audioPlayer.volume = p, easing);
		};

		audioPlayer.fadeOut = (duration: number = 0.15, easing: EaseFunc = easings.linear) => {
			return tween(audioPlayer.volume, 0, duration, (p) => audioPlayer.volume = p, easing);
		};

		return audioPlayer;
	}

	static playMusic(songName: string, opts?: AudioPlayOpt) {
		opts = opts ?? {};

		const audioPlayer = Sound.playSound(songName, opts);
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
}
