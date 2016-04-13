/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('simpleSynth', [])
.factory('simpleSynth', ['audioCtx','$rootScope', function(audioCtx, $rootScope){

    var SimpleSynth = (function () {
        var name = "Simple synthesizer";
        var id = "simple_synth";

        function Instrument () {
            var gainNode = audioCtx.createGain();
            var stereoPanner1 = audioCtx.createStereoPanner();
            var stereoPanner2 = audioCtx.createStereoPanner();
            var activeNotes = [];
            var devname = "";

            var params = {
                gain : 0.5,
                output : gainNode,
                synthTypes : ['square', 'sine', 'triangle','sawtooth'],
                osc1 : {
                    enabled : true,
                    synthType : 'square',
                    octave : 0,
                    // [-1 (left),0(center) , 1(right)]
                    pan     : 0,
                },
                osc2 : {
                    enabled : true,
                    synthType : 'sine',
                    octave : -2,
                    // [-1 (left),0(center) , 1(right)]
                    pan     : 0,
                }
            };

            var initOscillators = function (freq) {
                var oscillators = {
                    freq : freq,
                    osc : []
                };
                if ( params.osc1.enabled ) {
                    var osc1 = audioCtx.createOscillator();
                    osc1.name = devname;
                    osc1.connect(stereoPanner1);
                    stereoPanner1.connect(params.output);
                    for ( var i = 0 ; i < Math.abs(params.osc1.octave) ; i++ ) {
                        if ( params.osc1.octave < 0 ) {
                            freq -= freq/2;
                        } else if ( params.osc1.octave > 0) {
                            freq += freq*2;
                        }
                    }
                    osc1.frequency.value = freq;
                    osc1.type = params.osc1.synthType;
                    //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
                    osc1.start(0);
                    oscillators.osc.push(osc1);
                }
                if ( params.osc2.enabled ) {
                    osc2 = audioCtx.createOscillator();
                    osc2.name = devname;
                    osc2.connect(stereoPanner2);
                    stereoPanner2.connect(params.output);
                    for ( var i = 0 ; i < Math.abs(params.osc2.octave) ; i++ ) {
                        if ( params.osc2.octave < 0 ) {
                            freq -= freq/2;
                        } else if ( params.osc2.octave > 0) {
                            freq += freq*2;
                        }
                    }
                    osc2.frequency.value = freq ;

                    osc2.type = params.osc2.synthType;
                    //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
                    osc2.start(0);
                    oscillators.osc.push(osc2);
                }
                return oscillators;
            };
            var play = function(freq,name) {
                var osc = initOscillators(freq);
                activeNotes.push(osc);
                //console.log(freq,name, osc);
            };

            var stopAll = function () {
                for ( var i = 0 ; i < activeNotes.length ; i++ ) {
                    activeNotes[i].stop(0);
                }
            };

            var stop = function(frequency) {
                var newNotes = [];
                for ( var i = 0 ; i < activeNotes.length ; i++ ) {
                    if ( Math.round(activeNotes[i].freq) === Math.round(frequency) ) {
                        activeNotes[i].osc.forEach(function(o){
                            o.stop(0);
                            //console.log(o.name);
                            o.disconnect();
                        });
                    } else {
                        newNotes.push(activeNotes[i]);
                    }
                }
                activeNotes = newNotes;
            };

            gainNode.name = "instrument: " + devname;
            return {
                set output(a) {
                    params.output.disconnect();
                    params.output.connect(a);
                },
                set devname(a) {
                    devname = a;
                    //console.log("set name: " + a + ", for :", idd  );
                },
                set osc1Pan (a) {
                    stereoPanner1.pan.value = a;
                    params.osc1.pan = a;
                },
                set osc2Pan (a) {
                    stereoPanner2.pan.value = a;
                    params.osc2.pan = a;
                },
                get osc1Pan () {
                    return params.osc1.pan;
                },
                get osc2Pan () {
                    return params.osc2.pan;
                },
                get devname () {
                    return devname;
                },
                get id (){
                    return id;
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
            }
        }
        return Instrument;
    })();
    return SimpleSynth;
}]);








//var name = "Simple Synth";
//var id = "simple_synth";
//var gainNode = audioCtx.createGain();
//var devname = "";
//var params = {
//    gain : 0.5,
//    output : gainNode,
//    synthTypes : ['square', 'sine', 'triangle','sawtooth'],
//    osc1 : {
//        enabled : true,
//        synthType : 'square',
//        octave : 0
//    },
//    osc2 : {
//        enabled : true,
//        synthType : 'sine',
//        octave : -2
//    }
//};
//gainNode.name = "instrument: " + name;
//var activeNotes = [];
//
//var initOscillators = function (freq) {
//    var oscillators = {
//        freq : freq,
//        osc : []
//    };
//    if ( params.osc1.enabled ) {
//        osc1 = audioCtx.createOscillator();
//
//        osc1.connect(params.output);
//        for ( var i = 0 ; i < Math.abs(params.osc1.octave) ; i++ ) {
//            if ( params.osc1.octave < 0 ) {
//                freq -= freq/2;
//            } else if ( params.osc1.octave > 0) {
//                freq += freq*2;
//            }
//        }
//        osc1.frequency.value = freq;
//        osc1.type = params.osc1.synthType;
//        //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
//        osc1.start(0);
//        oscillators.osc.push(osc1);
//    }
//    if ( params.osc2.enabled ) {
//        osc2 = audioCtx.createOscillator();
//
//        osc2.connect(params.output);
//        for ( var i = 0 ; i < Math.abs(params.osc2.octave) ; i++ ) {
//            if ( params.osc2.octave < 0 ) {
//                freq -= freq/2;
//            } else if ( params.osc2.octave > 0) {
//                freq += freq*2;
//            }
//        }
//        osc2.frequency.value = freq ;
//        osc2.type = params.osc2.synthType;
//        //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
//        osc2.start(0);
//        oscillators.osc.push(osc2);
//    }
//    return oscillators;
//};
//
//
//var play = function(freq,name) {
//    var osc = initOscillators(freq);
//    activeNotes.push(osc);
//    console.log(freq,name);
//};
//
//var stopAll = function () {
//    for ( var i = 0 ; i < activeNotes.length ; i++ ) {
//        activeNotes[i].stop(0);
//    }
//};
//
//var stop = function(frequency) {
//    var newNotes = [];
//    for ( var i = 0 ; i < activeNotes.length ; i++ ) {
//        if ( Math.round(activeNotes[i].freq) === Math.round(frequency) ) {
//            activeNotes[i].osc.forEach(function(o){
//                o.stop(0);
//                o.disconnect();
//            });
//        } else {
//            newNotes.push(activeNotes[i]);
//        }
//    }
//    activeNotes = newNotes;
//};
//return {
//    set devnamez (a) {
//        devname = a;
//    },
//    get devnamez () {
//      return devname;
//    },
//    get id(){
//      return id;
//    },
//    set volume(a) {
//        params.gain = a;
//        params.output.gain.value = params.gain;
//        console.log(a);
//    },
//    get volume() {
//        return params.gain;
//    },
//    get params(){
//      return params;
//    },
//    play : play,
//    stop : stop,