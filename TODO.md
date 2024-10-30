- Options: Add scroll speed multiplier
- Options: Fix weird stuttering on volumes
- Options: Add something to the noteskins to signify which one is currently selected

- Pause: Doesn't say the song that is currently playing (bad)
- Pause: Dancer doesn't move leave fast enough so there's 2 dancers at the same time
- Pause: Sometimes the buttons stay after pausing and unpausing too fast
	Should rehaul the pause ui system it's kinda sucky

- Results: Add combo and name of the song

<!-- - Add events for bpm changes, this can be done with having an array of ChartBPM which would have something like this
```ts
class ChartBPM {
	time: 20.6
	value: 160,
	tweenSpeed: 0,
}
```

And then a song will have an array of that and when time is reached a tween will get triggered which will be linear and will take 'tweenSpeed' seconds, and then do Conductor.changeBPM(p) -->