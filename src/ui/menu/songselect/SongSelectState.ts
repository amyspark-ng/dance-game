import fs from "@zenfs/core";
import { Color } from "kaplay";
import { cloneDeep, isEqual } from "lodash";
import { GameSave } from "../../../core/save";
import { IScene, switchScene } from "../../../core/scenes/KaplayState";
import { CustomAudioPlay, Sound } from "../../../core/sound";
import { SongContent } from "../../../data/song";
import { FileManager } from "../../../FileManager";
import { GameState } from "../../../play/GameState";
import { Tally } from "../../../play/objects/scoring";
import { SongScore } from "../../../play/savescore";
import { utils } from "../../../utils";
import { addNotification } from "../../objects/notification";
import { MenuState } from "../MenuState";
import { DancerSelectState } from "./dancerselect/DancerSelectState";

/** Should add this to album cover, just because  */
const barWidth = 46;

type songCapsuleObj = ReturnType<typeof SongSelectState.addSongCapsule>;

// TODO: Fix it so you can update capsules based on a song array

/** State for selecting the song to play
 * @param startAt Can either be a number or a song
 */
export class SongSelectState implements IScene {
	index: number = 0;

	menuInputEnabled: boolean = true;

	songPreview: CustomAudioPlay = null;

	/** Scrolls the index, so scrolling the songs */
	scroll(change: number, songAmount: number) {
		this.index = utils.scrollIndex(this.index, change, songAmount);
	}

	updateState() {
		return getTreeRoot().trigger("updateState");
	}

	/** Runs when the {@link updateState} function is called */
	onUpdateState(action: () => void) {
		return getTreeRoot().on("updateState", action);
	}

	/** Runs when a capsule is added */
	onAddSongCapsule(action: () => void) {
		return getTreeRoot().on("addedCapsule", action);
	}

	/** Adds a song capsule to the song select scene */
	static addSongCapsule(curSong: SongContent) {
		const isAddSong = curSong == null;

		const capsuleContainer = add([
			opacity(),
			pos(center().x, center().y),
			"songCapsule",
			{
				width: 0,
				height: 0,
				song: curSong,
				intendedXPos: 0,
			},
		]);

		const albumCover = capsuleContainer.add([
			sprite(!isAddSong ? curSong.getCoverName() : "importSong"),
			pos(),
			anchor("center"),
			opacity(),
			z(0),
		]);
		albumCover.pos.x += (barWidth / 2) - 5;
		albumCover.width = 396;
		albumCover.height = 396;
		capsuleContainer.width = albumCover.width;
		capsuleContainer.height = albumCover.height;

		if (isAddSong) return;

		albumCover.onUpdate(() => {
			albumCover.sprite = capsuleContainer.song.getCoverName();
		});

		const cdCase = capsuleContainer.add([
			sprite("cdCase"),
			pos(),
			color(),
			anchor("center"),
			opacity(),
			scale(),
			z(1),
		]);

		const capsuleName = capsuleContainer.add([
			text(curSong.manifest.name, { align: "center" }),
			pos(),
			anchor("top"),
			opacity(),
		]);

		// TODO: make it so it thinks on the law that if there's no note at the end it just ends
		let songDuration = "0";
		getSound(`${curSong.manifest.uuid_DONT_CHANGE}-audio`).onLoad((data) => {
			songDuration = utils.formatTime(data.buf.duration);
		});

		capsuleContainer.onUpdate(() => {
			const tally = SongScore.getHighscore(curSong.manifest.uuid_DONT_CHANGE).tally;
			const clear = Tally.cleared(tally);

			capsuleName.text = `${curSong.manifest.name} (${clear}%)\n${songDuration}`;
			capsuleName.pos.y = capsuleContainer.height / 2;

			albumCover.opacity = capsuleContainer.opacity;
			cdCase.opacity = capsuleContainer.opacity;
			capsuleName.opacity = capsuleContainer.opacity;
		});

		// if the song has a highscore then add the sticker with the ranking
		if (GameSave.scores.some((song) => song.uuid == curSong.manifest.uuid_DONT_CHANGE)) {
			const tally = SongScore.getHighscore(curSong.manifest.uuid_DONT_CHANGE).tally;
			const ranking = Tally.ranking(tally);

			const maxOffset = 50;
			const offset = vec2(rand(-maxOffset, maxOffset), rand(-maxOffset, maxOffset));
			const randAngle = rand(-20, 20);
			const rankingSticker = capsuleContainer.add([
				sprite("rank_" + ranking),
				pos(),
				rotate(randAngle),
				anchor("center"),
				z(3),
			]);

			rankingSticker.pos = offset;
		}

		// if song isn't on default songs then it means it's imported from elsewhere
		if (!SongContent.defaultUUIDS.includes(curSong.manifest.uuid_DONT_CHANGE)) {
			const importedSticker = capsuleContainer.add([
				sprite("imported"),
				pos(),
				anchor("center"),
				rotate(rand(-2, 2)),
				z(3),
			]);
		}

		getTreeRoot().trigger("addedCapsule");

		return capsuleContainer;
	}

	scene(state: SongSelectState): void {
		setBackground(BLUE.lighten(50));

		let songAmount = SongContent.loaded.length + 1;
		const LERP_AMOUNT = 0.25;

		SongContent.loaded.forEach((song, index) => {
			SongSelectState.addSongCapsule(song);
		});

		// add the song capsule for the extra thing
		SongSelectState.addSongCapsule(null);

		const allCapsules = get("songCapsule", { liveUpdate: true }) as songCapsuleObj[];
		onUpdate(() => {
			songAmount = SongContent.loaded.length + 1;
			allCapsules.forEach((songCapsule, index) => {
				let opacity = 1;

				const indexOfCapsule = allCapsules.indexOf(songCapsule);

				if (indexOfCapsule == state.index) {
					opacity = 1;
					songCapsule.intendedXPos = center().x;
				}
				else {
					opacity = 0.5;
					songCapsule.intendedXPos = center().x + songCapsule.width * 1.5 * (index - state.index);
				}

				songCapsule.opacity = lerp(songCapsule.opacity, opacity, LERP_AMOUNT);
				songCapsule.pos.x = lerp(songCapsule.pos.x, songCapsule.intendedXPos, LERP_AMOUNT);
			});
		});

		const highscoreText = add([
			text("0", { align: "right" }),
			pos(width(), 0),
			anchor("topright"),
			fixed(),
			{
				value: 0,
				solidValue: 0,
			},
		]);

		highscoreText.onUpdate(() => {
			highscoreText.value = Math.floor(lerp(highscoreText.value, highscoreText.solidValue, 0.5));
			highscoreText.text = utils.formatNumber(highscoreText.value, { type: "simple" }) + utils.star;
		});

		wait(0.01, () => state.updateState());

		onKeyPress("left", () => {
			if (!state.menuInputEnabled) return;
			state.scroll(-1, songAmount);
			state.updateState();
		});

		onKeyPress("right", () => {
			if (!state.menuInputEnabled) return;
			state.scroll(1, songAmount);
			state.updateState();
		});

		onScroll((delta) => {
			if (!state.menuInputEnabled) return;
			delta.y = clamp(delta.y, -1, 1);
			state.scroll(delta.y, songAmount);
			state.updateState();
		});

		state.onUpdateState(async () => {
			const capsule = allCapsules[state.index];
			songAmount = SongContent.loaded.length + 1;
			if (!capsule) return;
			if (!capsule.song) {
				state.songPreview?.stop();
				return;
			}

			const tallyScore = SongScore.getHighscore(
				capsule.song.manifest.uuid_DONT_CHANGE,
			);

			highscoreText.solidValue = Math.floor(tallyScore.tally.score);

			state.songPreview?.stop();
			state.songPreview = Sound.playMusic(capsule.song.getAudioName());
			state.songPreview.loop = true;
			state.songPreview.fadeIn(Sound.musicVolume, 0.25);
		});

		onKeyPress("enter", async () => {
			if (!state.menuInputEnabled) return;
			const hoveredCapsule = allCapsules[state.index];
			if (!hoveredCapsule) return;

			if (hoveredCapsule.song == null) {
				const loadingScreen = FileManager.loadingScreen();
				const gottenFile = await FileManager.receiveFile("mod");

				if (gottenFile) {
					const oldLoadedList = cloneDeep(SongContent.loaded);
					const assets = await SongContent.parseFromFile(gottenFile);
					const content = await SongContent.load(assets, true, false);

					// is trying to overwrite deafult, not!!
					if (SongContent.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE)) {
						addNotification("[error]ERROR:[/error] The song you were trying to load overwrites a default song", 5);
						loadingScreen.cancel();
						return;
					}

					/** Wheter the UUID is already on loaded but not on default */
					const overwritingExtra = oldLoadedList.map((content) => content.manifest.uuid_DONT_CHANGE).includes(content.manifest.uuid_DONT_CHANGE)
						&& !SongContent.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE);

					const overwritingDefault = SongContent.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE);

					if (overwritingDefault) {
						addNotification("[error]ERROR:[/error] The song you were trying to load overwrites a default song", 5);
						state.index = allCapsules.indexOf(allCapsules.find((capsule) => capsule.song.manifest.uuid_DONT_CHANGE == content.manifest.uuid_DONT_CHANGE));
						state.updateState();
						loadingScreen.cancel();
						return;
					}
					else if (overwritingExtra) {
						const capsule = allCapsules.find((capsule) => capsule.song.manifest.uuid_DONT_CHANGE == content.manifest.uuid_DONT_CHANGE);
						if (!capsule) {
							addNotification("[warning]Warning:[/warning] Tried to overwrite an extra song but failed", 5);
							loadingScreen.cancel();
							return;
						}

						const indexOfSong = SongContent.loaded.indexOf(SongContent.loaded.find((song) => song.manifest.uuid_DONT_CHANGE == content.manifest.uuid_DONT_CHANGE));
						SongContent.loaded[indexOfSong] = capsule.song;

						addNotification(`[warning]Warning:[/warning] Overwrote "${capsule.song.manifest.name}" by "${content.manifest.name}" since they have the same UUID`, 5);
						allCapsules[allCapsules.indexOf(capsule)].song = content;
						state.index = allCapsules.indexOf(capsule);
						state.updateState();

						loadingScreen.cancel();
						return;
					}
					else {
						// some weird case??
					}

					// if you got here it's because you're not overwriting a song, you're adding a totally new one
					const capsule = SongSelectState.addSongCapsule(content);
					let index = allCapsules.indexOf(capsule);
					if (index == -1) index = 0;
					state.index = index;

					state.updateState();
					loadingScreen.cancel();
				}
				else {
					loadingScreen.cancel();
				}
			}
			else {
				state.menuInputEnabled = false;
				state.songPreview?.stop();
				const currentSongZip = hoveredCapsule.song;
				switchScene(GameState, { song: currentSongZip });
			}
		});

		function stopPreview() {
			state.songPreview?.stop();
		}

		onKeyPress("tab", () => {
			if (!state.menuInputEnabled) return;
			stopPreview();
			switchScene(DancerSelectState, state.index);
		});

		onKeyPress("escape", () => {
			if (!state.menuInputEnabled) return;
			stopPreview();
			switchScene(MenuState, "songs");
		});

		onKeyPress("backspace", () => {
			if (!state.menuInputEnabled) return;
			const hoveredCapsule = allCapsules[state.index];
			if (hoveredCapsule.song.isDefault) return;
			hoveredCapsule.destroy();
			SongContent.removeFromExistence(hoveredCapsule.song);
			state.updateState();
			// state.index -= 1;
			switchScene(SongSelectState, state.index - 1);
		});

		onSceneLeave(() => {
			stopPreview();
		});

		onKeyPress("q", () => {
		});

		state.onAddSongCapsule(() => {
			allCapsules.sort((a, b) => a.song == null ? 1 : -1);
		});
	}

	constructor(startAt: SongContent | number) {
		if (typeof startAt == "number") {
			if (utils.isInRange(startAt, 0, SongContent.loaded.length - 1)) this.index = startAt;
			else this.index = 0;
		}
		else {
			const newIndex = SongContent.loaded.findIndex((otherSong) => isEqual(otherSong, startAt));
			if (!newIndex) this.index = 0;
			else this.index = newIndex;
		}
	}
}
