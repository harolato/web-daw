/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('simple_sampler', [])
.factory('simpleSampler', ['audioCtx','$rootScope', '$http' ,'midiHandlerService', 'devicesService','$timeout', function(audioCtx, $rootScope, $http, midiHandlerService, devicesService, $timeout){
    var SimpleSampler = (function () {
        var name = "Simple Sampler";
        var id = "simple_sampler";

        function Instrument () {

            var gainNode = audioCtx.createGain();
            var activeNotes = [];
            var name = "Simple Sampler";
            var id = "simple_sampler";
            var devname = "";
            var notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].sort();
            var notesList = [];
            var c = 0;
            var o = 0;
            var initialNote;
            for ( var i = 21 ; i < 109 ; i++ ) {
                if ( notes[c%12] == "C" ) {
                    o++;
                }
                if ( notes[c%12] == "A" && o == 4 ) {
                    initialNote = {
                        letter : notes[c%12],
                        octave : o,
                        number : i
                    };
                }
                notesList.push({
                    letter : notes[c%12],
                    octave : o,
                    number : i
                });
                c++;
            }
            var params = {
                notesList : notesList,
                gain : 0.5,
                output : gainNode,
                currentNote : initialNote,
                currentSample : null,
                assignedSamples : [],
                samples: [
                    {
                        name : "bop kick - snares on - 3",
                        filename : "jazz_funk_drums/bop kick - snares on - 3.wav"
                    },
                    {
                        name : "snare - snares on - 6",
                        filename : "jazz_funk_drums/snare - snares on - 6.wav"
                    },
                    {
                        name : "hihat - close - 2",
                        filename : "jazz_funk_drums/hihat - close - 2.wav"
                    },
                    {
                        name : "stickshot - snares on - 6",
                        filename : "jazz_funk_drums/stickshot - snares on - 6.wav"
                    },
                    {
                        name : "rimshot - snares on - 1",
                        filename : "jazz_funk_drums/rimshot - snares on - 1.wav"
                    },
                    {
                        name : "ride - 1",
                        filename : "jazz_funk_drums/ride - 1.wav"
                    },
                    {
                        name : "hihat - open - 1",
                        filename : "jazz_funk_drums/hihat - open - 1.wav"
                    },
                    {
                        name : "floor tom - snares on - 8",
                        filename : "jazz_funk_drums/floor tom - snares on - 8.wav"
                    }
                ]
            };
            var d;
            var m;
            $timeout(function(){
                d = devicesService.get(devname);
            },0);

            var noteFromFrequency = function (freq) {

                var noteNum = 12 * (Math.log( freq / 440 ) / Math.log(2) );
                return Math.round( noteNum ) + 69;
            };

            function dec2hex(d, padding) {
                var hex = Number(d).toString(16);
                padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

                while (hex.length < padding) {
                    hex = "0" + hex;
                }

                return hex;
            }

            var assignSample = function ( sample, note ) {
                $http({
                    method          : "GET",
                    url             : "assets/samples/" + sample.filename,
                    responseType    : "arraybuffer"
                }).then(function(response){
                    //console.log(note.number);
                    if (m){
                        var message = [
                            "0x"+dec2hex(144),"0x"+dec2hex(note.number),"0x"+dec2hex(127)
                        ]
                        m.midi.output.send(message);
                    }
                    audioCtx.decodeAudioData( response.data, function (buffer) {
                        params.assignedSamples["" + note.number + ""] = sample;
                        params.assignedSamples["" + note.number + ""].buffer = buffer;
                        params.assignedSamples["" + note.number + ""].panner = audioCtx.createStereoPanner();
                        params.assignedSamples["" + note.number + ""].gainNode = audioCtx.createGain();
                    });

                });

            };

            var initSample = function ( freq, schedule, velocity ) {
                var note = noteFromFrequency(freq);
                var sample = params.assignedSamples["" + note + ""];
                //console.log(sample, note);
                if ( !sample ) return;

                var source = audioCtx.createBufferSource();

                source.buffer = sample.buffer;
                source.connect(sample.panner);
                sample.panner.connect(sample.gainNode);
                sample.gainNode.connect(gainNode);

                source.start(0);
                return {
                    src : source,
                    freq : freq
                };
            };

            var play = function(freq, schedule, velocity) {
                initSample(freq, schedule, velocity);
                //activeNotes.push(sample);
            };


            var stop = function(frequency, stopAll) {
                var newNotes = [];
                for ( var i = 0 ; i < activeNotes.length ; i++ ) {
                    if ( (Math.round(activeNotes[i].freq) === Math.round(frequency)) || stopAll ) {
                        activeNotes[i].src.stop(0);
                        activeNotes[i].src.disconnect();
                    } else {
                        newNotes.push(activeNotes[i]);
                    }
                }
                activeNotes = newNotes;
            };
            return {
                set output(a) {
                    params.output.disconnect();
                    params.output.connect(a);
                },
                set devname(a) {
                    devname = a;
                    //console.log(a);
                    //console.log("set name: " + a + ", for :", idd  );
                },
                get devname () {
                    return devname;
                },
                get id (){
                    return id;
                },
                get currentNote() {
                    return params.currentNote;
                },
                get pan(){
                   return (params.currentSample) ? params.currentSample.params.pan : null;
                },
                set pan(a){
                    params.currentSample.params.pan = a;
                    params.currentSample.panner.pan.value = a;
                },
                get sampleGain(){
                  return (params.currentSample)?params.currentSample.params.gain:null;
                },
                set sampleGain(a){
                    if (m) {
                        var message = [
                            "0x" + dec2hex(144), "0x" + dec2hex(params.currentNote.number), "0x" + dec2hex(Math.round(127 * a))
                        ]
                        m.midi.output.send(message);
                    }
                    params.currentSample.params.gain = a;
                    params.currentSample.gainNode.gain.value = a;
                },
                set currentNote(a) {

                    params.currentNote = a;
                    params.currentSample = params.assignedSamples[a.number];
                    //console.log(params.currentSample);
                },
                get currentSample() {
                    return params.currentSample;
                },
                set currentSample(a){
                    if (!m)
                    m = midiHandlerService.getActive(d);
                    params.currentSample = a;
                    params.currentSample.params = {
                        pan : 0,
                        gain : 0.5,
                        duration : 1
                    };
                    assignSample(a, params.currentNote);
                },
                get notes () {
                    return notesList;
                },
                set volume (a) {
                    params.gain = a;
                    params.output.gain.value = params.gain;
                    //console.log(a);
                },
                get volume () {
                    return params.gain;
                },
                get params (){
                    return params;
                },
                play : play,
                stop : stop,
                detachSample : function(){
                    if (m){
                        var message = [
                            "0x"+dec2hex(144),"0x"+dec2hex(params.currentNote.number),"0x"+dec2hex(0)
                        ];
                        m.midi.output.send(message);
                    }
                    delete params.assignedSamples[params.currentNote.number];
                    params.currentSample = undefined;
                }
            }
        }
        return Instrument;
    })();
    return SimpleSampler;
}]);