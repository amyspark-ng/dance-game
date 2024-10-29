- Figure out why playsound runs twice in options scene
- Figure out why does the song preview keep playing when exiting fromm song select
- Fix camera moving on song chart
- Figure out what the hell is wrong with the note move sound that makes it sound like crap when you change the tab and it has moved a lot of detune (maybe just change the sound what the hell)

- Add events for bpm changes, this can be done with having an array of ChartBPM which would have something like this
```ts
class ChartBPM {
	time: 20.6
	value: 160,
	tweenSpeed: 0,
}
```

And then a song will have an array of that and when time is reached a tween will get triggered which will be linear and will take 'tweenSpeed' seconds, and then do Conductor.changeBPM(p)