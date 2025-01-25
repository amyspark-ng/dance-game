import { AudioPlay } from "kaplay";
import { gameCursor } from "../../../core/cursor";
import { GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { BlackBarsTransition } from "../../../core/scenes/transitions/blackbar";
import { CustomAudioPlay, Sound } from "../../../core/sound";
import { SongContent } from "../../../data/song";
import { FileManager } from "../../../FileManager";
import { Scoring } from "../../../play/objects/scoring";
import { StateGame } from "../../../play/PlayState";
import { SaveScore } from "../../../play/song";
import { utils } from "../../../utils";
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
			sprite(!isAddSong ? curSong.manifest.uuid_DONT_CHANGE + "-cover" : "importSong"),
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
		super("songselect");

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

KaplayState.scene("songselect", (SongSelectState: StateSongSelect) => {
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
		SongSelectState.songPreview = Sound.playMusic(
			allCapsules[SongSelectState.index].song.manifest.uuid_DONT_CHANGE + "-audio",
		);
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
				// TODO: Redo this :pensive:
				// const zipContent = await SongContent.getContentFromFile(gottenFile);
				// const ooldUUIDS = SongContent.loaded.map((song) => song.manifest.uuid_DONT_CHANGE);
				// const result = await SongContent.loadAssets(zipContent);
				// const newUUIDS = SongContent.loaded.map((song) => song.manifest.uuid_DONT_CHANGE);
				// const overwritesDefault = Content.defaultUUIDS.includes(result.manifest.uuid_DONT_CHANGE);

				// if (ooldUUIDS.includes(result.manifest.uuid_DONT_CHANGE)) {
				// 	if (!overwritesDefault) {
				// 		const index = ooldUUIDS.indexOf(result.manifest.uuid_DONT_CHANGE);
				// 		SongContent.loaded[index] = result;
				// 		allCapsules[index].song = result;
				// 		SongSelectState.index = index;
				// 	}
				// 	else {
				// 		const index = newUUIDS.indexOf(result.manifest.uuid_DONT_CHANGE);
				// 		SongSelectState.index = index;
				// 	}
				// }
				// // is trying to add a new song
				// else {
				// 	StateSongSelect.addSongCapsule(result);
				// 	SongSelectState.index = newUUIDS.indexOf(result.manifest.uuid_DONT_CHANGE);
				// }

				SongSelectState.updateState();
				loadingScreen.cancel();
			}
			else {
				console.error("Never received the mod zip");
				loadingScreen.cancel();
			}
		}
		else {
			SongSelectState.menuInputEnabled = false;
			SongSelectState.songPreview?.stop();
			const currentSongZip = hoveredCapsule.song;

			KaplayState.switchState(
				new StateGame({
					dancerName: GameSave.dancer,
					fromEditor: false,
					song: currentSongZip,
					playbackSpeed: 1,
				}),
				BlackBarsTransition,
			);
		}
	});

	function stopPreview() {
		SongSelectState.songPreview?.stop();
	}

	onKeyPress("tab", () => {
		if (!SongSelectState.menuInputEnabled) return;
		stopPreview();
		KaplayState.switchState(new StateDancerSelect());
	});

	onKeyPress("escape", () => {
		if (!SongSelectState.menuInputEnabled) return;
		stopPreview();
		KaplayState.switchState(new StateMenu("songs"));
	});

	onSceneLeave(() => {
		stopPreview();
	});

	SongSelectState.onAddSongCapsule(() => {
		const addSongCapsule = allCapsules.find((capsule) => capsule.song == null);
		// have to sort them so the add song capsule is at the end of the array
		allCapsules.sort((a, b) => a.song == null ? 1 : -1);
	});
});
