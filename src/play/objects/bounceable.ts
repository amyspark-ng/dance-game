import { bounceable } from "../components/bounceable";

export function createBounceable() {
	const bounceableObj = add([
		sprite("bean"),
		pos(),
		bounceable(),
	])

	return bounceableObj;
}