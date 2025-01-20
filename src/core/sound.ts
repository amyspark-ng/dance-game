import { openSync } from "fs";
import { AudioPlay, AudioPlayOpt, Key, TweenController } from "kaplay";
import { utils } from "../utils";
import { GameSave } from "./save";

const defaultOpts: AudioPlayOpt = {
	volume: 1,
	speed: 1,
	detune: 0,
	loop: false,
};

export class Sound {
	static soundVolume: number = 1;
	static musicVolume: number = 1;

	static currentSong: AudioPlay = null;
	static sounds: Set<AudioPlay> = new Set<AudioPlay>();

	static playSound(soundName: string, opts: AudioPlayOpt = defaultOpts): AudioPlay {
		const audioPlayer = play(soundName, {
			volume: opts.volume ?? this.soundVolume,
			...opts,
		});
		Sound.sounds.add(audioPlayer);
		audioPlayer.onEnd(() => {
			Sound.sounds.delete(audioPlayer);
		});

		return audioPlayer;
	}

	static playMusic(songName: string, opts: AudioPlayOpt = defaultOpts) {
		const audioPlayer = Sound.playSound(songName, {
			volume: opts.volume ?? this.musicVolume,
			...opts,
		});
		audioPlayer.onEnd(() => {
			Sound.currentSong = null;
		});
		this.currentSong = audioPlayer;
		return audioPlayer;
	}

	static changeVolume(newVolume: number) {
		newVolume = utils.fixDecimal(newVolume);
		newVolume = clamp(newVolume, 0, 1);
		GameSave.volume = newVolume;

		this.soundVolume = GameSave.sfxVolume * GameSave.volume;
		this.musicVolume = GameSave.musicVolume * GameSave.volume;

		this.sounds.forEach((handler) => {
			handler.volume = this.soundVolume;
		});
		this.currentSong.volume = this.musicVolume;
	}
}
