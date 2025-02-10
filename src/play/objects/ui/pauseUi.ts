import { GameSave } from "../../../core/save";
import { CustomAudioPlay, Sound } from "../../../core/sound";
import { getDancer } from "../../../data/dancer";
import { utils } from "../../../utils";
import { GameState } from "../../GameState";
import { DANCER_POS } from "../dancer";

function pauseScratch(audio: CustomAudioPlay, duration: number = 0.15) {
	tween(audio.detune, -150, duration / 2, (p) => audio.detune = p);
	tween(audio.volume, 0, duration, (p) => audio.volume = p);
}

/** Runs when the game is paused */
export function addPauseUI() {
	const state = GameState.instance;

	const baseZ = 100;
	const baseLerp = 0.5;
	let scrollindex = 0;

	function addPauseButton(buttonName: string, buttonIndex: number, buttonAction: () => void) {
		const startingY = 200;
		const buttonSpacing = 80;

		const buttonObj = add([
			text(buttonName, { size: 60 }),
			pos(-100, startingY + buttonSpacing * buttonIndex),
			anchor("left"),
			opacity(0.5),
			z(baseZ + 2),
			fixed(),
			"pauseButton",
			{
				index: buttonIndex,
				action: buttonAction,
			},
		]);

		const baseXpos = 50;
		buttonObj.onUpdate(() => {
			const buttonLerp = (baseLerp / 2) * (buttonIndex + 1);
			if (state.paused) {
				const buttonXPos = baseXpos - (scrollindex == buttonIndex ? 30 : 0);
				buttonObj.pos.x = lerp(buttonObj.pos.x, buttonXPos, buttonLerp);
				buttonObj.opacity = lerp(buttonObj.opacity, 1, baseLerp);
			}
			else {
				buttonObj.pos.x = lerp(buttonObj.pos.x, -700, buttonLerp);
				buttonObj.opacity = lerp(buttonObj.opacity, 0, baseLerp);
			}

			buttonObj.opacity = lerp(buttonObj.opacity, scrollindex == buttonIndex ? 1 : 0.5, baseLerp);
		});

		return buttonObj;
	}

	// black screen
	const blackScreen = add([
		rect(width(), height()),
		pos(center()),
		anchor("center"),
		color(BLACK),
		opacity(),
		fixed(),
		z(baseZ),
		"blackScreen",
	]);

	blackScreen.onUpdate(() => {
		blackScreen.opacity = lerp(blackScreen.opacity, state.paused ? 0.5 : 0, baseLerp);
	});

	// title stuff
	const title = add([
		text(state.song.manifest.name, { size: 60, align: "center" }),
		pos(),
		anchor("center"),
		fixed(),
		opacity(),
		z(baseZ),
	]);

	const pausedText = add([
		text("(paused)", { size: title.textSize - 10, align: "center" }),
		pos(),
		anchor("center"),
		fixed(),
		opacity(),
		z(baseZ),
	]);

	title.onUpdate(() => {
		pausedText.pos = lerp(pausedText.pos, title.pos.add(vec2(0, title.height)), baseLerp * 0.9);

		if (state.paused) {
			title.pos = lerp(title.pos, vec2(center().x, 70), baseLerp);
			title.opacity = lerp(title.opacity, 1, baseLerp);
		}
		else {
			title.pos = lerp(title.pos, vec2(center().x, -100), baseLerp);
			title.opacity = lerp(title.opacity, 0, baseLerp);
		}
		pausedText.opacity = lerp(pausedText.opacity, title.opacity, baseLerp * 0.9);
	});

	// buttons
	const inputManager = add([]);
	inputManager.onUpdate(() => {
		if (!state.paused) return;
		if (isKeyPressed("down")) scrollindex = utils.scrollIndex(scrollindex, 1, 3);
		else if (isKeyPressed("up")) scrollindex = utils.scrollIndex(scrollindex, -1, 3);
		else if (isKeyPressed("enter")) {
			const selectedButton = get("pauseButton").find((obj) => obj.index == scrollindex);
			if (selectedButton) selectedButton.action();
		}
	});

	const buttons = [
		addPauseButton("Resume", 0, () => {
			state.paused = false;
		}),
		addPauseButton("Restart", 1, () => {
			state.restart();
		}),
		addPauseButton("Exit to menu", 2, () => {
			state.exitMenu();
		}),
	];

	if (state.params.fromEditor) {
		buttons[2].destroy();
		buttons[2] = addPauseButton("Exit to editor", 2, () => {
			state.exitEditor();
		});
	}

	// dancer
	const fakeDancer = add([
		sprite(getDancer().spriteName, { anim: "idle" }),
		pos(center()),
		z(baseZ),
		fixed(),
		anchor("center"),
		"pauseDancer",
	]);

	const fakeDancerPos = vec2(center().x + fakeDancer.width, center().y);
	fakeDancer.onUpdate(() => {
		if (state.paused) {
			fakeDancer.pos = lerp(fakeDancer.pos, fakeDancerPos, baseLerp);
		}
		else {
			fakeDancer.pos = lerp(fakeDancer.pos, vec2(fakeDancerPos.x, height() + fakeDancer.height), baseLerp);
		}
	});

	state.dancer.onUpdate(() => {
		if (state.paused) {
			state.dancer.pos = lerp(state.dancer.pos, center().scale(1, 2), 0.9);
			state.dancer.scale.x = lerp(state.dancer.scale.x, 0, 0.8);
		}
		else {
			state.dancer.pos = lerp(state.dancer.pos, DANCER_POS, 0.9);
			state.dancer.scale.x = lerp(state.dancer.scale.x, 1, 0.8);
		}
	});

	// EVERYTHING THAT IS ABOVE WILL RUN ONLY ONCE
	// Everything below will run everytime the pause state changes
	state.onPauseChange(() => {
		// get all the objects and filter the ones that have any tag that is included in tagsToPause
		get("game").forEach((obj) => {
			obj.paused = state.paused;
		});

		if (state.conductor.time < 0) return;
		Sound.playSound("pauseScratch", {
			detune: state.paused == true ? -150 : 150,
			speed: 1,
		});

		// pause scratch sound!
		// these tweens somehow are spam-proof! good :)
		// unpaused
		if (state.paused == false) {
			tween(-150, 0, 0.15, (p) => state.conductor.audioPlay.detune = p, easings.easeOutQuint);
			state.conductor.audioPlay.fadeIn(Sound.musicVolume, 0.15);
		}
		// paused
		else {
			const audioName = state.song.manifest.uuid_DONT_CHANGE + "-audio";
			const songToScratch = Sound.playMusic(audioName);
			if (state.conductor.time > 0) songToScratch.seek(state.conductor.time);
			pauseScratch(songToScratch);
		}
	});

	return { blackScreen, title, pausedText, buttons, fakeDancer };
}
