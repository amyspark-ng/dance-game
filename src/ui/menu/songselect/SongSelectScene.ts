import { GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { CustomAudioPlay, Sound } from "../../../core/sound";
import { SongContent } from "../../../data/song";
import { FileManager } from "../../../FileManager";
import { Scoring } from "../../../play/objects/scoring";
import { StateGame } from "../../../play/PlayState";
import { SaveScore } from "../../../play/savescore";
import { utils } from "../../../utils";
import { addNotification } from "../../objects/notification";
import { StateMenu } from "../MenuScene";
import { StateDancerSelect } from "./dancerselect/DancerSelectScene";

/** State for selecting the song to play
 * @param startAt Can either be a number or a song
 */
export class StateSongSelect extends KaplayState {
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
			const tally = SaveScore.getHighscore(curSong.manifest.uuid_DONT_CHANGE).tally;
			let clear = Math.round(Scoring.tally(tally).cleared());
			if (isNaN(clear)) clear = 0;

			capsuleName.text = `${curSong.manifest.name} (${clear}%)\n${songDuration}`;
			capsuleName.pos.y = capsuleContainer.height / 2;

			albumCover.opacity = capsuleContainer.opacity;
			cdCase.opacity = capsuleContainer.opacity;
			capsuleName.opacity = capsuleContainer.opacity;
		});

		// if the song has a highscore then add the sticker with the ranking
		if (GameSave.songsPlayed.some((song) => song.uuid == curSong.manifest.uuid_DONT_CHANGE)) {
			const tally = SaveScore.getHighscore(curSong.manifest.uuid_DONT_CHANGE).tally;
			const ranking = Scoring.tally(tally).ranking();

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

	constructor(startAt: SongContent | number) {
		super();

		if (typeof startAt == "number") {
			utils.isInRange(startAt, 0, SongContent.loaded.length - 1);
			this.index = startAt;
		}
		else {
			if (SongContent.loaded.includes(startAt)) {
				const newIndex = SongContent.loaded.indexOf(startAt);
				if (newIndex && newIndex > 0) this.index = newIndex;
			}
		}
	}
}

/** Should add this to album cover, just because  */
const barWidth = 46;

type songCapsuleObj = ReturnType<typeof StateSongSelect.addSongCapsule>;

KaplayState.scene("StateSongSelect", (startAt: SongContent | number) => {
	const SongSelectState = new StateSongSelect(startAt);
	setBackground(BLUE.lighten(50));

	let songAmount = SongContent.loaded.length + 1;
	const LERP_AMOUNT = 0.25;

	SongContent.loaded.forEach((song, index) => {
		StateSongSelect.addSongCapsule(song);
	});

	// add the song capsule for the extra thing
	StateSongSelect.addSongCapsule(null);

	let allCapsules = get("songCapsule", { liveUpdate: true }) as songCapsuleObj[];
	onUpdate(() => {
		songAmount = SongContent.loaded.length + 1;
		allCapsules.forEach((songCapsule, index) => {
			let opacity = 1;

			const indexOfCapsule = allCapsules.indexOf(songCapsule);

			if (indexOfCapsule == SongSelectState.index) {
				opacity = 1;
				songCapsule.intendedXPos = center().x;
			}
			else {
				opacity = 0.5;
				songCapsule.intendedXPos = center().x + songCapsule.width * 1.5 * (index - SongSelectState.index);
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

	wait(0.01, () => SongSelectState.updateState());

	onKeyPress("left", () => {
		if (!SongSelectState.menuInputEnabled) return;
		SongSelectState.scroll(-1, songAmount);
		SongSelectState.updateState();
	});

	onKeyPress("right", () => {
		if (!SongSelectState.menuInputEnabled) return;
		SongSelectState.scroll(1, songAmount);
		SongSelectState.updateState();
	});

	onScroll((delta) => {
		if (!SongSelectState.menuInputEnabled) return;
		delta.y = clamp(delta.y, -1, 1);
		SongSelectState.scroll(delta.y, songAmount);
		SongSelectState.updateState();
	});

	SongSelectState.onUpdateState(() => {
		if (!allCapsules[SongSelectState.index]) return;
		if (!allCapsules[SongSelectState.index].song) {
			SongSelectState.songPreview?.stop();
			return;
		}

		const tallyScore = SaveScore.getHighscore(
			allCapsules[SongSelectState.index].song.manifest.uuid_DONT_CHANGE,
		);

		highscoreText.solidValue = Math.floor(tallyScore.tally.score);

		SongSelectState.songPreview?.stop();
		SongSelectState.songPreview = Sound.playMusic(allCapsules[SongSelectState.index].song.getAudioName());
		SongSelectState.songPreview.loop = true;
		SongSelectState.songPreview.fadeIn(Sound.musicVolume, 0.25);
	});

	onKeyPress("enter", async () => {
		if (!SongSelectState.menuInputEnabled) return;
		const hoveredCapsule = allCapsules[SongSelectState.index];
		if (!hoveredCapsule) return;

		if (hoveredCapsule.song == null) {
			const loadingScreen = FileManager.loadingScreen();
			const gottenFile = await FileManager.receiveFile("mod");

			if (gottenFile) {
				const assets = await SongContent.parseFromFile(gottenFile);
				const content = await SongContent.load(assets);

				// is trying to overwrite deafult, not!!
				if (SongContent.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE)) {
					addNotification("[error]ERROR:[/error] The song you were trying to load overwrites a default song", 5);
					loadingScreen.cancel();
					return;
				}

				/** Wheter the UUID is already on loaded but not on default */
				const overwritingExtra = SongContent.loaded.map((content) => content.manifest.uuid_DONT_CHANGE).includes(content.manifest.uuid_DONT_CHANGE)
					&& !SongContent.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE);

				const overwritingDefault = SongContent.defaultUUIDS.includes(content.manifest.uuid_DONT_CHANGE);

				if (overwritingDefault) {
					addNotification("[error]ERROR:[/error] The song you were trying to load overwrites a default song", 5);
					SongSelectState.index = allCapsules.indexOf(allCapsules.find((capsule) => capsule.song.manifest.uuid_DONT_CHANGE == content.manifest.uuid_DONT_CHANGE));
					SongSelectState.updateState();
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
					SongSelectState.index = allCapsules.indexOf(capsule);
					SongSelectState.updateState();

					loadingScreen.cancel();
					return;
				}
				else {
					// some weird case??
				}

				// if you got here it's because you're not overwriting a song, you're adding a totally new one
				SongContent.loaded.push(content);
				const capsule = StateSongSelect.addSongCapsule(content);
				let index = allCapsules.indexOf(capsule);
				if (index == -1) index = 0;
				SongSelectState.index = index;

				SongSelectState.updateState();
				loadingScreen.cancel();
			}
			else {
				loadingScreen.cancel();
			}
		}
		else {
			SongSelectState.menuInputEnabled = false;
			SongSelectState.songPreview?.stop();
			const currentSongZip = hoveredCapsule.song;
			KaplayState.switchState(StateGame, { song: currentSongZip });
		}
	});

	function stopPreview() {
		SongSelectState.songPreview?.stop();
	}

	onKeyPress("tab", () => {
		if (!SongSelectState.menuInputEnabled) return;
		stopPreview();
		KaplayState.switchState(StateDancerSelect, 0);
	});

	onKeyPress("escape", () => {
		if (!SongSelectState.menuInputEnabled) return;
		stopPreview();
		KaplayState.switchState(StateMenu, "songs");
	});

	onSceneLeave(() => {
		stopPreview();
	});

	onKeyPress("q", () => {
	});

	SongSelectState.onAddSongCapsule(() => {
		allCapsules.sort((a, b) => a.song == null ? 1 : -1);
	});
});
