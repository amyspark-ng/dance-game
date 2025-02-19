import { SongManifest } from "../../../data/song";
import { cam } from "../../camera";
import { Sound } from "../../sound";

export async function SongTrans(middleAction: () => void, songManifest: SongManifest) {
	const screenshotURL = screenshot();
	await loadSprite("screenshot", screenshotURL);

	Sound.playSound("transitionScratch", { detune: rand(-25, 25) }).fadeOut(2);

	const screenshotObj = add([
		sprite("screenshot"),
		// color(RED),
		// stay(),
		opacity(),
	]);

	screenshotObj.fadeIn(0.1);

	const black = add([
		pos(width(), center().y),
		rect(width(), height()),
		color(BLACK),
		anchor("right"),
		stay(),
		z(0),
		opacity(),
	]);

	black.onUpdate(() => {
		black.width = width() - vynil.pos.x;
		// if (black.width >= width())
	});

	// screenshotObj.destroy();
	const vynil = add([
		sprite("vynil"),
		rotate(0),
		pos(width(), center().y),
		stay(),
		timer(),
		anchor("center"),
		animate(),
		z(100),
		scale(1.25),
	]);

	vynil.add([
		text(`${songManifest.name}`),
		anchor("center"),
	]);

	black.z = vynil.z - 1;

	const timings = [0, 0.25, 0.8, 1];
	const duration = 1.5;

	vynil.animate("angle", [
		180,
		90,
		0,
		-180,
	], {
		duration,
		loops: 1,
		timing: timings,
	});

	vynil.animate("pos", [
		vec2(width() + vynil.width, center().y),
		vec2(center().x + vynil.width / 4, center().y),
		vec2(center().x, center().y),
		vec2(-vynil.width, center().y),
	], {
		duration,
		loops: 1,
		timing: timings,
	});

	vynil.wait(1.5, () => {
		cam.zoom = vec2(1.15);
		middleAction();
		vynil.tween(black.opacity, 0, 0.25, (p) => black.opacity = p, easings.easeOutQuint);
		vynil.tween(cam.zoom, vec2(1), 0.25, (p) => cam.zoom = p, easings.easeOutCubic);
	});
}
